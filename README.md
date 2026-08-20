# BlackBox Coding Event Platform

A production-ready **BlackBox Coding Challenge Platform** built for college coding events.

## Architectural Overview

```
React Client (Vite + Tailwind CSS + React Router)
       │
     HTTPS
       ▼
Node.js + Express Backend
       ├── Security Baseline (Helmet, Rate Limit, CORS)
       ├── Authentication Architecture (JWT, bcrypt hash)
       ├── Event & Challenge Schemas
       ├── Controlled JS Executor Boundary (Future Phase)
       ▼
 MongoDB Atlas (Mongoose)
```

### Core Concept & Participant Constraints
- **Phase 5**: `executor` worker threads securely evaluating JavaScript user logic.
- **Phase 6**: MongoDB storage of attempts enforcing strict participant boundaries (no cross-participant viewing).
- **Phase 7**: Dedicated Admin Operational Dashboard tracking live event performance, tracking executions while preserving strict separation of Execution vs. Correctness (per PDF rule since there is no internal judge for expected output logic).
- **Participant view**: Reverse-engineers hidden logic by feeding input into a terminal/CMD-style black box interface and observing outputs.
- **Participant hidden fields**: Challenge title, description, question statement, expected algorithm, hidden JavaScript code, solutions, scores, leaderboard, rank, and other participants' stats are **strictly omitted** from participant API responses and UI.
- **Participant Auth**: No public registration or sign-up. Participants are added by the Admin and log in using their college email and a system-level master password (stored as a secure bcrypt hash).

---

## Repository Structure

```
blackbox-coding-event/
├── frontend/             # React (Vite) + Tailwind CSS + Axios
│   ├── src/
│   │   ├── components/   # UI components (HealthChecker)
│   │   ├── context/      # AuthContext shell
│   │   ├── pages/        # Dev verification page
│   │   ├── routes/       # React Router setup
│   │   ├── services/     # Centralized apiClient.js
│   │   └── index.css     # Design tokens & Tailwind CSS
│   └── package.json
├── backend/              # Node.js + Express + Mongoose
│   ├── src/
│   │   ├── config/       # Env & Database configuration
│   │   ├── constants/    # User roles & entity statuses
│   │   ├── controllers/  # API controllers
│   │   ├── middleware/   # Security, 404 & Centralized Error Handler
│   │   ├── models/       # Mongoose schemas (Admin, Participant, Event, Challenge, Attempt)
│   │   ├── routes/       # API routers
│   │   ├── services/     # Reserved service boundaries (Auth, Executor shell)
│   │   └── utils/        # ApiFormatters, AppError, Safe Logger
│   └── package.json
├── .gitignore
├── package.json
└── README.md
```

---

## Local Setup & Development

### 1. Prerequisites
- Node.js (v18 or higher)
- npm
- MongoDB Atlas cluster URL (optional for Phase 0 baseline verification)

### 2. Environment Setup

Copy `.env.example` to `.env` in the `backend/` directory:
```bash
cp backend/.env.example backend/.env
```

Environment variables configured in `backend/.env`:
- `PORT`: Express server port (default: `5000`)
- `NODE_ENV`: Application environment (`development` | `production`)
- `MONGODB_URI`: MongoDB Atlas connection string
- `JWT_SECRET`: Secret key for JWT signing
- `MASTER_PASSWORD_HASH`: Bcrypt hash for participant master password
- `ADMIN_EMAIL`: Admin email reference
- `FRONTEND_URL`: Allowed CORS origin (default: `http://localhost:5173`)

Copy `frontend/.env.example` to `frontend/.env`:
```bash
cp frontend/.env.example frontend/.env
```
- `VITE_API_BASE_URL`: Base API endpoint (default: `http://localhost:5000/api`)

### 3. Installing Dependencies

Run setup from the root directory:
```bash
npm run setup
```
Or install individually:
```bash
cd backend && npm install
cd ../frontend && npm install
```

### 4. Running Development Servers

Start backend server:
```bash
npm run dev:backend
```
Backend will start on `http://localhost:5000` with hot-reloading.

Start frontend client:
```bash
npm run dev:frontend
Frontend will start on `http://localhost:5173`.

---

## Environment Variables & Security Notes

> [!IMPORTANT]
> **Security Baseline Rules**:
> 1. Secrets (JWT secrets, DB credentials, password hashes) must **never** be committed to version control.
> 2. The master password must **never** be stored as plaintext; it must be bcrypt-hashed.
> 3. Participant API endpoints must **never** return `hiddenCode`, `internalName`, `score`, `title`, or `description`.
> 4. MongoDB credentials must **never** be exposed in public logs or API error responses.

---

## API Baseline & Verification

### Health Check Endpoint
- **URL**: `GET /api/health`
- **Response Format**:
```json
{
  "success": true,
  "message": "BlackBox API is running",
  "data": {
    "status": "UP",
    "timestamp": "2026-08-20T16:41:26.000Z",
    "environment": "development",
    "database": "connected"
  }
}
```

### 404 Route Handling
- **URL**: `GET /api/unknown-path`
- **Response Format**:
```json
{
  "success": false,
  "message": "API route not found: GET /api/unknown-path",
  "errorCode": "ROUTE_NOT_FOUND"
}
```

---

## Phase 0 Status Report

- [x] Project repository initialized with clean `frontend` and `backend` structure.
- [x] Node.js + Express backend created with layered architecture (`config`, `controllers`, `models`, `routes`, `middleware`, `services`, `utils`).
- [x] MongoDB connection module with connection error handling and Mongoose models created (`Admin`, `Participant`, `Event`, `Challenge`, `Attempt`).
- [x] Baseline security middleware configured (Helmet, CORS validation, rate limiting, body size limits).
- [x] Centralized API error handling and 404 handler implemented.
- [x] Environment validation module implemented to check essential variables on startup.
- [x] React + Vite frontend configured with Tailwind CSS, React Router, and centralized Axios `apiClient.js`.
- [x] Verification interface implemented displaying backend connection and health status.
- [x] Production build check passed for frontend (`npm run build`).
- [x] Phase 5: Execution Service (Sandboxed JS)
- [x] Phase 6: Attempt Persistence & Evaluation (Phase 6 Complete)
- [x] Phase 7: Admin Attempt Monitoring & Event Operations (Phase 7 Complete)
- [ ] Phase 8: ...

---

## Phase 1 — Authentication & Authorization

### Authentication Architecture

#### Admin Authentication
- **Endpoint**: `POST /api/auth/admin/login`
- **Credentials**: Admin email + Admin password (bcrypt-hashed in MongoDB)
- **JWT issued**: Contains `{ sub: adminId, role: "ADMIN" }`
- **Bootstrap**: On first startup, initial Admin is auto-created from `ADMIN_EMAIL` + `ADMIN_PASSWORD` env vars. Idempotent — never creates duplicates.

#### Participant Authentication
- **Endpoint**: `POST /api/auth/login`
- **Credentials**: College email + common event Master Password
- **Validation sequence**: Email exists → status is `ACTIVE` → bcrypt compare against `MASTER_PASSWORD_HASH`
- **No registration**: Participants are created by Admin only. No sign-up, forgot password, or self-registration.

### JWT Strategy
- **Library**: `jsonwebtoken`
- **Payload**: Minimum `{ sub: userId, role }` — no passwords or secrets
- **Expiry**: Configurable via `JWT_EXPIRES_IN` (default: `8h`)
- **Storage**: `localStorage` with key `blackbox_token`, automatically attached via Axios interceptor

### Password Security
- Admin password: bcrypt-hashed with 10 salt rounds, stored as `passwordHash` in `admins` collection
- Master password: bcrypt-hashed, stored only as `MASTER_PASSWORD_HASH` env var — **never in MongoDB**
- Participant schema: No password field whatsoever

### Role Authorization
- Two roles: `ADMIN` and `PARTICIPANT`
- `authenticate.js` middleware: Validates JWT Bearer token, attaches `req.user`
- `authorize.js` middleware: Checks `req.user.role` against allowed roles
- 401 = Not authenticated (missing/invalid/expired token)
- 403 = Authenticated but wrong role

### Authentication Endpoints

| Method | Path | Auth Required | Role | Purpose |
|--------|------|---------------|------|---------|
| POST | `/api/auth/login` | No | — | Participant login with master password |
| POST | `/api/auth/admin/login` | No | — | Admin login with admin password |
| GET | `/api/auth/me` | Yes | Any | Restore session / get current user profile |
| POST | `/api/auth/logout` | Yes | Any | Logout (client-side token removal) |
| GET | `/api/auth/test-admin` | Yes | ADMIN | Dev verification endpoint |
| GET | `/api/auth/test-participant` | Yes | PARTICIPANT | Dev verification endpoint |

### Protected Routes (Frontend)
- `/admin/dashboard` — requires `ADMIN` role
- `/participant/dashboard` — requires `PARTICIPANT` role
- `/admin/login` — Admin login page
- `/login` — Participant login page (default)

### Logout Behavior
Logout calls `POST /api/auth/logout` (server-side notification), then clears `localStorage` and resets React `AuthContext`. JWT is stateless — logout relies on client token removal. Expired tokens result in automatic redirect to `/login`.

### Initial Admin Setup
```bash
# Configure in backend/.env:
ADMIN_EMAIL=admin@college.edu
ADMIN_PASSWORD=YourSecureAdminPassword
```
On first server start, the admin is bootstrapped automatically.

### Required Additional Environment Variables (Phase 1)
- `JWT_SECRET`: Secret key for JWT signing
- `JWT_EXPIRES_IN`: Token expiry duration (e.g. `8h`)
- `MASTER_PASSWORD_HASH`: bcrypt hash of event master password
- `ADMIN_PASSWORD`: Plaintext password for initial admin bootstrap

---

## Phase 2 — Participant Management & Master Password Management

### Participant Model & Data Rules
- **Schema Fields**: `_id`, `name`, `email`, `status`, `createdAt`, `updatedAt`
- **Zero individual passwords**: No `password`, `passwordHash`, or `masterPassword` field in participant records
- **Status values**: strictly `ACTIVE` or `DISABLED`
- **Email normalization**: Lowercase and trimmed; duplicate emails return `409 Conflict`

### Participant Management APIs (ADMIN ONLY)

| Method | Path | Auth Required | Role | Purpose |
|--------|------|---------------|------|---------|
| GET | `/api/admin/participants` | Yes | ADMIN | List participants (search, status filter, pagination) |
| GET | `/api/admin/participants/:id` | Yes | ADMIN | Get single participant details by ID |
| POST | `/api/admin/participants` | Yes | ADMIN | Add new participant (`name`, `email`, `status`) |
| PATCH | `/api/admin/participants/:id` | Yes | ADMIN | Update participant details |
| PATCH | `/api/admin/participants/:id/status` | Yes | ADMIN | Toggle status (`ACTIVE` / `DISABLED`) |
| DELETE | `/api/admin/participants/:id` | Yes | ADMIN | Delete participant record |

### Query Capabilities
- **Search**: `?search=term` — case-insensitive match on `name` or `email`
- **Status Filter**: `?status=ACTIVE` or `?status=DISABLED`
- **Pagination**: `?page=1&limit=25` (capped at max 100 per page) with metadata `{ page, limit, total, totalPages }`

### Master Password Management
- **Endpoint**: `PATCH /api/admin/settings/master-password`
- **Permissions**: `ADMIN` only (`403 Forbidden` for participants, `401 Unauthorized` without token)
- **Validation**: Requires correct `currentPassword` before updating; `newPassword` must be $\ge$ 8 characters
- **Storage**: Persisted as a 10-round bcrypt hash in the `SystemSetting` MongoDB collection (`key='masterPasswordHash'`). Plaintext is never stored.
- **Migration**: On startup, if no DB setting exists, the system automatically migrates `MASTER_PASSWORD_HASH` from `.env` to MongoDB.
- **Session Effect**: Existing participant sessions remain valid until their JWT expires. All subsequent login attempts require the new master password. Existing participant accounts are preserved.

### Admin Frontend Routes & Components
- `/admin/participants` — Participant management table, search, filter, pagination, Add/Edit modals, delete confirmation
- `/admin/settings` — Master password update interface
- `AdminLayout` — Responsive console sidebar navigation, admin profile summary, logout trigger
- `ConfirmDialog` — Confirmation modal for destructive actions (delete, disable)
- `ParticipantFormModal` — Create/edit modal strictly omitting password fields

---

## Phase 3 — Event Management, Scheduling & Participant Access

### Event Model & Data Rules
- **Schema Fields**: `_id`, `name` (required, max 150), `description` (optional, max 1000), `startTime` (Date, required), `endTime` (Date, required, must be > `startTime`), `status` (Enum: `UPCOMING`, `LIVE`, `COMPLETED`, default `UPCOMING`), `createdAt`, `updatedAt`
- **Indexes**: Compound index on `{ status: 1, startTime: 1, endTime: 1 }` and single index on `{ name: 1 }`
- **Time Storage**: ISO 8601 timestamps in UTC — client display formatting only

### Event Lifecycle & Transition Policy
- `UPCOMING` &rarr; `LIVE`: Allowed (admin-activated when event window is approaching/active)
- `LIVE` &rarr; `COMPLETED`: Allowed (admin concludes event)
- `LIVE` &rarr; `UPCOMING`: Allowed (administrative correction)
- `COMPLETED` &rarr; `UPCOMING` / `LIVE`: **Rejected** (`400 Bad Request`) to preserve event history integrity

### Event APIs (ADMIN ONLY)

| Method | Path | Auth Required | Role | Purpose |
|--------|------|---------------|------|---------|
| GET | `/api/admin/events` | Yes | ADMIN | List events (search, status filter, pagination) |
| GET | `/api/admin/events/:id` | Yes | ADMIN | Get single event details |
| POST | `/api/admin/events` | Yes | ADMIN | Create new event (`name`, `description`, `startTime`, `endTime`, `status`) |
| PATCH | `/api/admin/events/:id` | Yes | ADMIN | Update event details & scheduling |
| PATCH | `/api/admin/events/:id/status` | Yes | ADMIN | Lifecycle transition (`UPCOMING`, `LIVE`, `COMPLETED`) |
| DELETE | `/api/admin/events/:id` | Yes | ADMIN | Delete event record |

### Participant Event APIs (PARTICIPANT ONLY)

| Method | Path | Auth Required | Role | Purpose |
|--------|------|---------------|------|---------|
| GET | `/api/events/live` | Yes | PARTICIPANT | Get active LIVE events (sanitized response + `serverTime`) |
| GET | `/api/events/upcoming` | Yes | PARTICIPANT | Get scheduled UPCOMING events |
| POST | `/api/events/:eventId/start` | Yes | PARTICIPANT | Authoritatively validate and start event session |

### Server-Authoritative Timing & Start Access Rules
When a participant requests `POST /api/events/:eventId/start`, the server authoritatively validates:
1. Participant JWT is valid and role is `PARTICIPANT`.
2. Participant is re-queried from MongoDB to guarantee status is `ACTIVE` (`401`/`403 ACCOUNT_DISABLED` if disabled).
3. Event exists (`404 EVENT_NOT_FOUND` if missing, `400 INVALID_ID_FORMAT` if malformed ID).
4. Event status must be `LIVE` (`403 EVENT_NOT_LIVE` if `UPCOMING`, `403 EVENT_COMPLETED` if `COMPLETED`).
5. Current server time $\ge$ `event.startTime` (`403 EVENT_NOT_STARTED` with scheduled start timestamp).
6. Current server time $\le$ `event.endTime` (`403 EVENT_ENDED` if past end time).
7. Client clocks and client-provided timestamps are completely ignored.

### Frontend Routes & Capabilities
- `/admin/events` — Admin event management table, search, filter, pagination, modal create/edit, status transition triggers with safety confirmations.
- `/participant/dashboard` — Live events list with dynamic status & "Start Event" action, upcoming scheduled events list with countdown timers, auto-refresh and error handling.

---

## Phase 4 — Challenge Management, Lifecycle & Secure Hidden JavaScript Storage

### Challenge Model & Data Rules
- **Schema Fields**:
  - `_id`: Unique challenge identifier.
  - `eventId`: ObjectId reference to `Event` (required, indexed).
  - `title`: Challenge title (required, max 150 chars, trimmed).
  - `description`: Problem description (required, max 2000 chars, trimmed).
  - `hiddenCode`: Secret JavaScript algorithm logic (required, string, max 50 KB).
  - `inputFormat`: Input format explanation (optional string, max 1000 chars).
  - `outputFormat`: Output format explanation (optional string, max 1000 chars).
  - `constraints`: Constraints explanation (optional string, max 1000 chars).
  - `score`: Numeric point value (required, positive number $> 0$, default 100).
  - `hackerRankUrl`: External HackerRank URL (valid URL format if provided).
  - `status`: Challenge availability state (`ENABLED` / `DISABLED`, default `ENABLED`).
  - `createdAt`, `updatedAt`: ISO timestamps.
- **Indexes**: Compound index on `{ eventId: 1, status: 1 }` and `{ eventId: 1, createdAt: -1 }`.

### Critical Security Boundaries for Hidden JavaScript
1. **Zero Exposure to Participants**: `hiddenCode` is **NEVER** returned in any participant endpoint, JWT token, error message, log file, frontend React state, or build bundle.
2. **Key Absence Rule**: Participant serializers strictly omit the `hiddenCode` property entirely. It is not returned as `null`, `""`, or `"[REDACTED]"`.
3. **Admin-Only Access**: `hiddenCode` is only returned on authenticated administrative endpoints (`GET /api/admin/challenges/:id`, `GET /api/admin/events/:eventId/challenges`) to enable problem configuration and editing.
4. **No Code Execution in Phase 4**: Hidden JavaScript is stored, managed, and validated as pure text data. No `eval()`, `new Function()`, VM, or execution runner is invoked. Execution is reserved for Phase 5.

### Challenge Management APIs (ADMIN ONLY)

| Method | Path | Auth Required | Role | Returns `hiddenCode` | Purpose |
|--------|------|---------------|------|----------------------|---------|
| GET | `/api/admin/events/:eventId/challenges` | Yes | ADMIN | Yes | List challenges for an event (search, status filter, pagination) |
| GET | `/api/admin/challenges/:id` | Yes | ADMIN | Yes | Fetch complete administrative challenge details |
| POST | `/api/admin/events/:eventId/challenges` | Yes | ADMIN | Yes | Create new challenge assigned to an event |
| PATCH | `/api/admin/challenges/:id` | Yes | ADMIN | Yes | Update challenge details & hidden code |
| PATCH | `/api/admin/challenges/:id/status` | Yes | ADMIN | Yes | Toggle status (`ENABLED` / `DISABLED`) |
| DELETE | `/api/admin/challenges/:id` | Yes | ADMIN | No | Delete challenge |

### Participant-Safe Challenge API (PARTICIPANT)

| Method | Path | Auth Required | Role | Returns `hiddenCode` | Purpose |
|--------|------|---------------|------|----------------------|---------|
| GET | `/api/events/:eventId/challenges` | Yes | PARTICIPANT | **NEVER** | Fetch participant-visible challenges for an event |

### Participant-Safe Data Serialization
- **Included Fields**: `id`, `eventId`, `title`, `description`, `inputFormat`, `outputFormat`, `constraints`, `score`, `hackerRankUrl`, `status`.
- **Explicitly Excluded Fields**: `hiddenCode`, internal admin metadata, database system keys.

### Frontend Routes & Components
- `/admin/events/:eventId/challenges` — Administrative challenge management console for a specific event with breadcrumbs, challenges table, search, status filter, pagination, Add/Edit modal with monospace code editor, enable/disable triggers, and delete confirmations.
- `ChallengeFormModal` — Create/edit modal featuring title, description, multiline hidden JavaScript code editor with formatting/indentation preservation, input/output formats, constraints, score, and HackerRank URL.
