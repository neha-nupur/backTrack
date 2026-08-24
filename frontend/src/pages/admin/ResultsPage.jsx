import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../../layouts/AdminLayout";
import adminResultsService from "../../services/adminResultsService";
import eventService from "../../services/eventService";

const ResultsPage = () => {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");

  const [overview, setOverview] = useState(null);
  const [eventStats, setEventStats] = useState(null);
  const [participantResults, setParticipantResults] = useState([]);
  const [challengeStats, setChallengeStats] = useState([]);
  const [recentAttempts, setRecentAttempts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [eventDataLoading, setEventDataLoading] = useState(false);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [selectedAttempt, setSelectedAttempt] = useState(null);

  const pollInterval = useRef(null);

  // Initial load
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const [overviewData, eventsData] = await Promise.all([
          adminResultsService.getOverallStatistics(),
          eventService.getAllEvents({ limit: 100 }),
        ]);

        // adminResultsService returns the inner `data` directly
        setOverview(overviewData);
        // eventService returns the wrapper, so we need `.data.events`
        setEvents(eventsData.data.events || []);
      } catch (err) {
        setError(
          err.message || "Unable to load events. Please refresh and try again.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  const fetchEventData = useCallback(
    async (isPolling = false) => {
      if (!selectedEventId) return;

      try {
        if (!isPolling) setEventDataLoading(true);
        const [statsRes, partsRes, chalRes, recentRes] = await Promise.all([
          adminResultsService.getEventStatistics(selectedEventId),
          adminResultsService.getParticipantResults({
            eventId: selectedEventId,
            page,
            search: searchTerm,
          }),
          adminResultsService.getChallengeStatistics(selectedEventId),
          adminResultsService.getRecentAttempts(selectedEventId, 50),
        ]);

        setEventStats(statsRes);
        // getParticipantResults returns an object with { results, pagination } directly
        setParticipantResults(partsRes.results || []);
        setTotalPages(partsRes.pagination?.pages || 1);
        setChallengeStats(chalRes);
        setRecentAttempts(recentRes);
      } catch (err) {
        if (!isPolling) {
          setError(err.message || "Failed to load event statistics");
        }
      } finally {
        if (!isPolling) setEventDataLoading(false);
      }
    },
    [selectedEventId, page, searchTerm],
  );

  // Fetch event specific data when event changes
  useEffect(() => {
    if (!selectedEventId) {
      setEventStats(null);
      setParticipantResults([]);
      setChallengeStats([]);
      setRecentAttempts([]);
      return;
    }

    fetchEventData();
  }, [selectedEventId, page, searchTerm, fetchEventData]);

  // Live polling
  useEffect(() => {
    // Clear existing interval
    if (pollInterval.current) {
      clearInterval(pollInterval.current);
      pollInterval.current = null;
    }

    if (selectedEventId && eventStats?.event?.status === "LIVE") {
      pollInterval.current = setInterval(() => {
        fetchEventData(true);
      }, 5000);
    }

    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
    };
  }, [selectedEventId, eventStats?.event?.status, fetchEventData]);

  const handleExport = async () => {
    try {
      await adminResultsService.downloadExport(selectedEventId);
    } catch (err) {
      alert("Failed to export data: " + err.message);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1); // reset to page 1 on search
  };

  const handleManualRefresh = () => {
    fetchEventData(true); // Treat as polling to avoid loading spinner flash
  };

  if (loading) {
    return (
      <AdminLayout title="Results & Statistics">
        <div className="text-slate-400 p-8 font-mono">
          Loading Results &amp; Statistics...
        </div>
      </AdminLayout>
    );
  }

  const selectedEventInfo = events.find(
    (e) => (e?.id ?? e?._id) === selectedEventId,
  );

  return (
    <AdminLayout title="Results & Statistics">
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 font-mono tracking-tight">
              RESULTS &amp; STATISTICS
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Operational view of event activity and attempts
            </p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
              value={selectedEventId}
              onChange={(e) => {
                setSelectedEventId(e.target.value);
                setPage(1);
                setSearchTerm("");
              }}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2.5 outline-none font-mono"
            >
              <option value="">-- All Events (Overview) --</option>
              {events.length === 0 ? (
                <option value="" disabled>
                  NO EVENTS AVAILABLE
                </option>
              ) : (
                events.map((event) => {
                  const eventId = event?.id ?? event?._id;
                  return (
                    <option key={eventId} value={eventId}>
                      {event.name}
                    </option>
                  );
                })
              )}
            </select>
            {selectedEventId && (
              <button
                onClick={handleManualRefresh}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-sm font-mono transition-colors whitespace-nowrap"
              >
                Refresh
              </button>
            )}
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-emerald-600/20 text-emerald-400 border border-emerald-700/50 hover:bg-emerald-600/40 rounded-lg text-sm font-mono transition-colors whitespace-nowrap"
            >
              Export CSV
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-900/30 border border-rose-800 rounded-lg text-rose-400 text-sm font-mono">
            {error}
          </div>
        )}

        {/* EVENT STATUS BANNER */}
        {selectedEventId && selectedEventInfo && (
          <div
            className={`p-4 border rounded-xl font-mono text-sm flex items-center justify-center gap-3 ${
              selectedEventInfo.status === "LIVE"
                ? "bg-emerald-900/20 border-emerald-800 text-emerald-400"
                : selectedEventInfo.status === "UPCOMING"
                  ? "bg-amber-900/20 border-amber-800 text-amber-400"
                  : "bg-slate-900/50 border-slate-800 text-slate-400"
            }`}
          >
            {selectedEventInfo.status === "LIVE" && (
              <>
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                LIVE MONITORING
              </>
            )}
            {selectedEventInfo.status === "UPCOMING" &&
              "Event has not started yet."}
            {selectedEventInfo.status === "COMPLETED" &&
              "Event completed. Showing final recorded execution data."}
          </div>
        )}

        {/* OVERVIEW STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="text-xs text-slate-400 font-mono mb-1">
              PARTICIPANTS
            </div>
            <div className="text-2xl font-bold text-white mb-2">
              {selectedEventId
                ? eventStats?.execution?.uniqueParticipants || 0
                : overview?.participants?.total || 0}
            </div>
            {!selectedEventId && (
              <div className="flex gap-2 text-xs">
                <span className="text-emerald-400">
                  {overview?.participants?.active || 0} Active
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-rose-400">
                  {overview?.participants?.disabled || 0} Disabled
                </span>
              </div>
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="text-xs text-slate-400 font-mono mb-1">
              CHALLENGES
            </div>
            <div className="text-2xl font-bold text-white mb-2">
              {selectedEventId
                ? eventStats?.challengeCount || 0
                : overview?.challenges?.total || 0}
            </div>
            {!selectedEventId && (
              <div className="flex gap-2 text-xs">
                <span className="text-emerald-400">
                  {overview?.challenges?.enabled || 0} Enabled
                </span>
              </div>
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="text-xs text-slate-400 font-mono mb-1">
              ATTEMPTS
            </div>
            <div className="text-2xl font-bold text-white mb-2">
              {selectedEventId
                ? eventStats?.execution?.totalAttempts || 0
                : overview?.attempts?.total || 0}
            </div>
            <div className="text-xs text-slate-400">Total Code Executions</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="text-xs text-slate-400 font-mono mb-1">
              EXECUTIONS
            </div>
            <div className="flex gap-4 text-sm mt-2">
              <div>
                <div className="text-emerald-400 font-bold">
                  {selectedEventId
                    ? eventStats?.execution?.successfulExecutions || 0
                    : overview?.attempts?.successful || 0}
                </div>
                <div className="text-xs text-slate-500">Success</div>
              </div>
              <div>
                <div className="text-rose-400 font-bold">
                  {selectedEventId
                    ? eventStats?.execution?.failedExecutions || 0
                    : overview?.attempts?.failed || 0}
                </div>
                <div className="text-xs text-slate-500">Failed</div>
              </div>
            </div>
          </div>
        </div>

        {!selectedEventId ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400 font-mono">
            {events.length === 0
              ? "NO EVENTS AVAILABLE"
              : "Select an event from the dropdown above to view participant results and statistics."}
          </div>
        ) : (
          <>
            {eventDataLoading ? (
              <div className="p-8 text-center text-slate-500 font-mono">
                Loading event data...
              </div>
            ) : eventStats?.execution?.totalAttempts === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
                <div className="text-slate-400 font-mono mb-2 font-bold text-lg">
                  NO ACTIVITY YET
                </div>
                <div className="text-slate-500">
                  Participants have not executed any challenges for this event.
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {/* RECENT ACTIVITY */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                  <div className="p-5 border-b border-slate-800">
                    <h2 className="text-lg font-bold text-slate-200 font-mono">
                      Recent Activity
                    </h2>
                  </div>
                  <div className="overflow-x-auto max-h-96">
                    <table className="w-full text-left text-sm text-slate-300">
                      <thead className="text-xs text-slate-400 uppercase bg-slate-950/50 border-b border-slate-800 font-mono sticky top-0">
                        <tr>
                          <th className="px-4 py-3">Time</th>
                          <th className="px-4 py-3">Participant</th>
                          <th className="px-4 py-3">Challenge</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3 text-right">Details</th>
                        </tr>
                      </thead>
                      <tbody className="font-mono divide-y divide-slate-800/50">
                        {recentAttempts.length === 0 ? (
                          <tr>
                            <td
                              colSpan="5"
                              className="px-4 py-8 text-center text-slate-500"
                            >
                              No recent attempts.
                            </td>
                          </tr>
                        ) : (
                          recentAttempts.map((attempt) => (
                            <tr
                              key={attempt._id}
                              className="hover:bg-slate-800/30"
                            >
                              <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-400">
                                {new Date(
                                  attempt.createdAt,
                                ).toLocaleTimeString()}
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-medium text-slate-200">
                                  {attempt.participant?.name || "Unknown"}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-cyan-400">
                                {attempt.challenge?.title ||
                                  `Challenge ${attempt.challenge?.challengeNumber || "Unknown"}`}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    attempt.status === "SUCCESS"
                                      ? "bg-emerald-900/50 text-emerald-400"
                                      : "bg-rose-900/50 text-rose-400"
                                  }`}
                                >
                                  {attempt.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  onClick={() => setSelectedAttempt(attempt)}
                                  className="text-xs text-cyan-500 hover:text-cyan-400 hover:underline"
                                >
                                  Inspect &rarr;
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* PARTICIPANT RESULTS */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                  <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h2 className="text-lg font-bold text-slate-200 font-mono">
                      Participant Performance
                    </h2>
                    <form
                      onSubmit={handleSearch}
                      className="w-full sm:w-auto flex"
                    >
                      <input
                        type="text"
                        placeholder="Search name/email..."
                        className="bg-slate-950 border border-slate-700 rounded-l-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 w-full sm:w-64"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      <button
                        type="submit"
                        className="bg-cyan-900/40 text-cyan-400 border border-cyan-800 border-l-0 rounded-r-lg px-3 py-1.5 hover:bg-cyan-800/60 transition"
                      >
                        Search
                      </button>
                    </form>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-300">
                      <thead className="text-xs text-slate-400 uppercase bg-slate-950/50 border-b border-slate-800 font-mono">
                        <tr>
                          <th className="px-4 py-3">Participant</th>
                          <th className="px-4 py-3 text-center">Attempts</th>
                          <th className="px-4 py-3 text-center">Successful</th>
                          <th className="px-4 py-3 text-center">Failed</th>
                          <th className="px-4 py-3 text-right">
                            Last Activity
                          </th>
                        </tr>
                      </thead>
                      <tbody className="font-mono divide-y divide-slate-800/50">
                        {participantResults.length === 0 ? (
                          <tr>
                            <td
                              colSpan="5"
                              className="px-4 py-8 text-center text-slate-500"
                            >
                              No participants found for this event.
                            </td>
                          </tr>
                        ) : (
                          participantResults.map((p) => (
                            <tr key={p._id} className="hover:bg-slate-800/30">
                              <td className="px-4 py-3">
                                <div className="font-medium text-slate-200">
                                  {p.name}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {p.email}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center">
                                {p.totalAttempts}
                              </td>
                              <td className="px-4 py-3 text-center font-bold text-emerald-400">
                                {p.successfulExecutions}
                              </td>
                              <td className="px-4 py-3 text-center font-bold text-rose-400">
                                {p.failedExecutions}
                              </td>
                              <td className="px-4 py-3 text-right text-xs text-slate-400">
                                {p.lastActivity
                                  ? new Date(
                                      p.lastActivity,
                                    ).toLocaleTimeString()
                                  : "N/A"}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="p-4 border-t border-slate-800 flex justify-between items-center bg-slate-950/30">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-3 py-1 text-xs bg-slate-800 text-slate-300 rounded hover:bg-slate-700 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <span className="text-xs text-slate-500 font-mono">
                        Page {page} of {totalPages}
                      </span>
                      <button
                        onClick={() =>
                          setPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={page === totalPages}
                        className="px-3 py-1 text-xs bg-slate-800 text-slate-300 rounded hover:bg-slate-700 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>

                {/* CHALLENGE STATISTICS */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                  <div className="p-5 border-b border-slate-800">
                    <h2 className="text-lg font-bold text-slate-200 font-mono">
                      Challenge Statistics
                    </h2>
                  </div>
                  <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {challengeStats.length === 0 ? (
                      <div className="col-span-full py-8 text-center text-slate-500 font-mono">
                        No challenges found for this event.
                      </div>
                    ) : (
                      challengeStats.map((c) => (
                        <div
                          key={c._id}
                          className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono"
                        >
                          <h3
                            className="font-bold text-slate-200 mb-3 truncate"
                            title={c.title}
                          >
                            {c.title}
                          </h3>
                          {c.attemptsCount === 0 ? (
                            <div className="text-slate-500 text-sm">
                              No attempts yet
                            </div>
                          ) : (
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-slate-400">
                                  Attempts:
                                </span>
                                <span className="text-slate-200">
                                  {c.attemptsCount}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Success:</span>
                                <span className="text-emerald-400 font-bold">
                                  {c.successfulExecutions}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Failed:</span>
                                <span className="text-rose-400 font-bold">
                                  {c.failedExecutions}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ATTEMPT DETAIL MODAL */}
      {selectedAttempt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50 shrink-0">
              <h3 className="text-lg font-bold text-slate-100 font-mono">
                Execution Detail
              </h3>
              <button
                onClick={() => setSelectedAttempt(null)}
                className="text-slate-400 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                    Participant
                  </span>
                  <span className="text-sm font-semibold text-slate-200">
                    {selectedAttempt.participant?.name || "Unknown"}
                  </span>
                  <div className="text-xs text-slate-500">
                    {selectedAttempt.participant?.email}
                  </div>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                    Challenge
                  </span>
                  <span className="text-sm font-semibold text-slate-200">
                    {selectedAttempt.challenge?.title || "Unknown"}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                    Status
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold inline-block ${
                      selectedAttempt.status === "SUCCESS"
                        ? "bg-emerald-900/50 text-emerald-400"
                        : "bg-rose-900/50 text-rose-400"
                    }`}
                  >
                    {selectedAttempt.status}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                    Execution Time &amp; Stamp
                  </span>
                  <span className="text-sm text-slate-300 font-mono">
                    {selectedAttempt.executionTime}ms
                  </span>
                  <div className="text-xs text-slate-500">
                    {new Date(selectedAttempt.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>

              <div>
                <span className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                  Input
                </span>
                <pre className="bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs font-mono text-slate-300 whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {selectedAttempt.input || "(No input provided)"}
                </pre>
              </div>

              <div>
                <span className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                  Output / Error
                </span>
                <pre
                  className={`bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs font-mono whitespace-pre-wrap max-h-40 overflow-y-auto ${
                    selectedAttempt.status === "SUCCESS"
                      ? "text-emerald-400"
                      : "text-rose-400"
                  }`}
                >
                  {selectedAttempt.output ||
                    selectedAttempt.error ||
                    "(No output recorded)"}
                </pre>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/50 flex justify-end shrink-0">
              <button
                onClick={() => setSelectedAttempt(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition text-sm font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default ResultsPage;
