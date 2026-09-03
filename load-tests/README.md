# backTrack k6 Load Tests

This suite tests the participant-facing API journey implemented by the application:

1. Verify the participant JWT with `GET /api/auth/me`.
2. Load the dashboard's LIVE and UPCOMING events.
3. Start a LIVE event.
4. Load its participant-safe challenges.
5. Read attempt history for the selected challenge.
6. Optionally execute the challenge, creating an `Attempt` record.
7. Read the participant result summary.

It does not test admin CRUD routes: those mutate users, events, and challenges and are not a normal concurrent participant flow.

## Safety prerequisites

Use a dedicated staging/test deployment, MongoDB database, participants, a LIVE event, and an enabled low-cost test challenge. The event must be within its configured start/end time.

`POST /api/events/:eventId/challenges/:challengeId/execute` launches the backend executor and writes an `Attempt`. It is disabled by default. Set `WRITE_ENABLED=true` only for the dedicated test environment, and supply an input known to be valid for the test challenge with `EXECUTION_INPUT`.

The backend applies an authentication limit of 30 logins per source IP per 15 minutes. For baseline, load, stress, and spike tests, use a short-lived per-participant token dataset. Login mode is intended only for a one-VU smoke test or when the load generator has distinct source IPs.

Never commit real credentials or JWTs. Copy the example data files to the ignored names `tokens.json` and `credentials.json`.

## Install k6

Windows (winget):

```powershell
winget install k6 --source winget
```

Or follow the official k6 installation instructions for the test runner host.

## Authentication configuration

Use one of these approaches:

```powershell
# Preferred for concurrent runs: a JSON array of short-lived JWTs.
k6 run -e BASE_URL=http://localhost:5000/api -e TOKEN_FILE=load-tests/data/tokens.json load-tests/load.js

# One-user smoke/auth verification. This is subject to the auth rate limit.
k6 run -e BASE_URL=http://localhost:5000/api -e USER_EMAIL=loadtest-001@example.test -e USER_PASSWORD=... load-tests/smoke.js

# A single already-issued test JWT.
k6 run -e BASE_URL=http://localhost:5000/api -e PARTICIPANT_TOKEN=... load-tests/smoke.js
```

Provide at least as many tokens as the largest VU count. The script cycles the dataset if it is smaller, which is technically valid but causes multiple VUs to write attempts for the same participant and is less realistic.

Optional environment variables:

| Variable | Purpose |
| --- | --- |
| `EVENT_ID` | Force a particular LIVE event; otherwise the first LIVE event is selected. |
| `EVENT_PASSWORD` | Password for a protected event. |
| `WRITE_ENABLED=true` | Allow execution requests and attempt writes. |
| `EXECUTION_INPUT` | Required non-empty input for the dedicated test challenge when writes are enabled. |
| `EXECUTION_EVERY_N` | Execute once every N iterations per VU; defaults to `4` (25% of journeys). |
| `THINK_TIME_SECONDS` | Delay at the end of a journey; defaults to `1`. |
| `*_STAGES` | Override stages as `VUS:DURATION,...`; for example `LOAD_STAGES=10:30s,50:1m,0:30s`. |
| `SPIKE_VUS`, `SPIKE_DURATION` | Override spike defaults of 500 VUs for 2 minutes. |

## Profiles

```powershell
k6 run -e BASE_URL=http://localhost:5000/api -e TOKEN_FILE=load-tests/data/tokens.json load-tests/smoke.js
k6 run -e BASE_URL=http://localhost:5000/api -e TOKEN_FILE=load-tests/data/tokens.json load-tests/baseline.js
k6 run -e BASE_URL=http://localhost:5000/api -e TOKEN_FILE=load-tests/data/tokens.json load-tests/load.js
k6 run -e BASE_URL=http://localhost:5000/api -e TOKEN_FILE=load-tests/data/tokens.json load-tests/stress.js
k6 run -e BASE_URL=http://localhost:5000/api -e TOKEN_FILE=load-tests/data/tokens.json load-tests/spike.js
```

`load.js` ramps through approximately 10, 50, 100, 250, 500, and 1,000 VUs. `spike.js` immediately applies the configured spike. Start with smoke, then baseline, and only enable writes after verifying the test event and data retention plan.

To include controlled execution traffic:

```powershell
k6 run -e BASE_URL=http://localhost:5000/api -e TOKEN_FILE=load-tests/data/tokens.json -e EVENT_ID=YOUR_TEST_EVENT_ID -e WRITE_ENABLED=true -e EXECUTION_INPUT='known-good-test-input' -e EXECUTION_EVERY_N=4 load-tests/baseline.js
```

## Thresholds and interpretation

The suite enforces fewer than 1% failed HTTP requests, at least 99% successful checks, overall HTTP p95 under 1 second, and execution p95 under 6 seconds. The execution target reflects the backend's default 5-second executor timeout plus transport/persistence overhead; use a stricter target only after measuring the selected test challenge in staging.

A healthy run satisfies all thresholds without sustained growth in p95/p99 latency. `429` responses mean the authentication or execution rate limits, rather than general capacity, were reached. `5xx`, increasing timeouts, executor p95 near 5 seconds, and stable high CPU usually point to worker/sandbox saturation. Slow read endpoints with low CPU point more directly to MongoDB queries or connection contention.

Save a machine-readable result for diagnosis:

```powershell
k6 run --summary-export=load-tests/results/load-summary.json -e BASE_URL=http://localhost:5000/api -e TOKEN_FILE=load-tests/data/tokens.json load-tests/load.js
```

Share the k6 console summary plus this JSON, the target profile, enabled write rate, and server/database metrics.

## Monitor during a run

Watch k6 request rate, failures, status codes, and p50/p90/p95/p99 by the `endpoint` tag. On the backend, watch CPU, RAM, Node event-loop delay, process/worker count, open connections, and network saturation. In MongoDB/Atlas, watch CPU, memory, connections, operations per second, slow queries, query execution time, disk IOPS, and connection-pool wait/usage. The repository has no platform configuration for Vercel, Render, Railway, or AWS, so use the metrics dashboard of the actual hosting provider as well as MongoDB's monitoring.

The current Mongoose connection configuration does not specify pool sizing, so record MongoDB connection counts and pool waits carefully: those may reveal a default-pool bottleneck before the API itself is saturated.
