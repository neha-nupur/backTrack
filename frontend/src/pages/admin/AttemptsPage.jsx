import React, { useState, useEffect, useCallback } from "react";
import AdminLayout from "../../layouts/AdminLayout";
import { getAdminAttempts } from "../../services/adminMonitoringService";

const AttemptsPage = () => {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Filters
  const [statusFilter, setStatusFilter] = useState("");

  // Selected attempt for modal view
  const [selectedAttempt, setSelectedAttempt] = useState(null);

  const fetchAttempts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getAdminAttempts({
        page,
        limit: 15,
        status: statusFilter,
      });
      if (res.success) {
        setAttempts(res.data.attempts);
        setTotalPages(res.data.totalPages);
        setTotalRecords(res.data.total);
      } else {
        setError(res.error || "Failed to fetch attempts");
      }
    } catch (err) {
      setError("An error occurred while fetching attempts.");
      console.error("Failed to fetch attempts", err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchAttempts();
  }, [fetchAttempts]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchAttempts();
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchAttempts]);

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  return (
    <AdminLayout title="Operational Monitoring: Attempts">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header & Filters */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#071324]/85 border border-slate-800/90 p-5 rounded-2xl shadow-xl">
          <div>
            <h2 className="text-lg font-bold text-white font-mono">
              Attempt History
            </h2>
            <p className="text-xs text-slate-400 mt-1 font-sans">
              Total Records: <span className="text-cyan-400 font-mono font-bold">{totalRecords}</span>
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3.5 py-2 bg-[#030914] border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-cyan-500 w-full sm:w-auto font-mono"
            >
              <option value="">All Statuses</option>
              <option value="SUCCESS">Success</option>
              <option value="EXECUTION_ERROR">Error</option>
              <option value="EXECUTION_TIMEOUT">Timeout</option>
            </select>
            <button
              onClick={fetchAttempts}
              className="px-4 py-2 bg-[#091a32] hover:bg-[#0e274c] text-cyan-300 border border-slate-700/60 rounded-xl text-xs font-mono font-semibold transition cursor-pointer whitespace-nowrap"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-900/20 border border-red-900/50 rounded-xl">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Table */}
        <div className="bg-[#071324]/85 border border-slate-800/90 rounded-2xl shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-[#030914]/80 text-xs uppercase text-slate-400 border-b border-slate-800 font-mono">
                <tr>
                  <th className="px-5 py-3.5">Time</th>
                  <th className="px-5 py-3.5">Participant</th>
                  <th className="px-5 py-3.5">Event / Challenge</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {loading ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="px-4 py-12 text-center text-slate-500 font-mono text-xs"
                    >
                      Loading attempts...
                    </td>
                  </tr>
                ) : attempts.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="px-4 py-12 text-center text-slate-500 font-mono text-xs"
                    >
                      No attempts recorded yet.
                    </td>
                  </tr>
                ) : (
                  attempts.map((attempt) => (
                    <tr
                      key={attempt.id}
                      className="hover:bg-[#0a1c35]/50 transition"
                    >
                      <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-400">
                        {new Date(attempt.createdAt).toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="text-sm font-semibold text-slate-100">
                          {attempt.participant?.name || "Unknown"}
                        </div>
                        <div className="text-[10px] text-slate-400 font-sans">
                          {attempt.participant?.email}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div
                          className="text-sm text-slate-200 truncate max-w-[200px]"
                          title={attempt.event?.name}
                        >
                          {attempt.event?.name || "Unknown Event"}
                        </div>
                        <div className="text-[10px] text-cyan-400">
                          {attempt.challenge
                            ? `Challenge ${attempt.challenge.challengeNumber}`
                            : "N/A"}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                            attempt.status === "SUCCESS"
                              ? "bg-cyan-950 text-cyan-300 border border-cyan-700/60"
                              : "bg-red-950 text-red-400 border border-red-800/60"
                          }`}
                        >
                          {attempt.status}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-1">
                          ⏱ {attempt.executionTimeMs}ms
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => setSelectedAttempt(attempt)}
                          className="px-3.5 py-1.5 bg-[#091a32] hover:bg-[#0e274c] text-cyan-300 border border-slate-700/60 rounded-xl transition text-xs font-semibold cursor-pointer"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="px-4 py-3 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                  className="px-3 py-1 rounded bg-slate-800 text-slate-300 disabled:opacity-50 hover:bg-slate-700 transition text-xs"
                >
                  Prev
                </button>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages}
                  className="px-3 py-1 rounded bg-slate-800 text-slate-300 disabled:opacity-50 hover:bg-slate-700 transition text-xs"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal for Attempt Details */}
        {selectedAttempt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50 shrink-0">
                <h3 className="text-lg font-bold text-slate-100">
                  Attempt Detail
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
                      {selectedAttempt.participant?.name} (
                      {selectedAttempt.participant?.email})
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                      Event / Challenge
                    </span>
                    <span className="text-sm font-semibold text-slate-200">
                      {selectedAttempt.event?.name} / Ch #
                      {selectedAttempt.challenge?.challengeNumber}
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
                          : "bg-red-900/50 text-red-400"
                      }`}
                    >
                      {selectedAttempt.status}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                      Evaluation
                    </span>
                    <span className="text-sm text-slate-400 font-mono">
                      {selectedAttempt.isCorrect === null
                        ? "Not evaluated"
                        : selectedAttempt.isCorrect
                          ? "Correct"
                          : "Incorrect"}{" "}
                      (Score: {selectedAttempt.score || 0})
                    </span>
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
                        : "text-red-400"
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
      </div>
    </AdminLayout>
  );
};

export default AttemptsPage;
