import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import adminResultsService from '../../services/adminResultsService';
import eventService from '../../services/eventService';

const ResultsPage = () => {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  
  const [overview, setOverview] = useState(null);
  const [eventStats, setEventStats] = useState(null);
  const [participantResults, setParticipantResults] = useState([]);
  const [challengeStats, setChallengeStats] = useState([]);
  const [leaderboard, setLeaderboard] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [eventDataLoading, setEventDataLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Initial load
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const [overviewData, eventsData] = await Promise.all([
          adminResultsService.getOverallStatistics(),
          eventService.getAllEvents({ limit: 100 }) // get a bunch of events for dropdown
        ]);
        
        setOverview(overviewData.data);
        setEvents(eventsData.data.events || []);
      } catch (err) {
        setError(err.message || 'Failed to load overall statistics');
      } finally {
        setLoading(false);
      }
    };
    
    fetchInitialData();
  }, []);

  // Fetch event specific data when event changes
  useEffect(() => {
    if (!selectedEventId) {
      setEventStats(null);
      setParticipantResults([]);
      setChallengeStats([]);
      setLeaderboard(null);
      return;
    }
    
    const fetchEventData = async () => {
      try {
        setEventDataLoading(true);
        const [statsRes, partsRes, chalRes, leadRes] = await Promise.all([
          adminResultsService.getEventStatistics(selectedEventId),
          adminResultsService.getParticipantResults({ eventId: selectedEventId, page, search: searchTerm }),
          adminResultsService.getChallengeStatistics(selectedEventId),
          adminResultsService.getLeaderboard(selectedEventId)
        ]);
        
        setEventStats(statsRes.data);
        setParticipantResults(partsRes.data.results);
        setTotalPages(partsRes.data.pagination.pages);
        setChallengeStats(chalRes.data);
        setLeaderboard(leadRes.data);
      } catch (err) {
        setError(err.message || 'Failed to load event statistics');
      } finally {
        setEventDataLoading(false);
      }
    };
    
    fetchEventData();
  }, [selectedEventId, page, searchTerm]);

  const handleExport = async () => {
    try {
      await adminResultsService.downloadExport(selectedEventId);
    } catch (err) {
      alert('Failed to export data: ' + err.message);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1); // reset to page 1 on search
    // the useEffect dependency on searchTerm will trigger the fetch
  };

  if (loading) {
    return <div className="text-slate-400 p-8 font-mono">Loading Results &amp; Statistics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 font-mono tracking-tight">RESULTS &amp; STATISTICS</h1>
          <p className="text-slate-400 text-sm mt-1">Operational view of event activity and attempts</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select 
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2.5 outline-none font-mono"
          >
            <option value="">-- All Events (Overview) --</option>
            {events.map(event => (
              <option key={event._id} value={event._id}>{event.name}</option>
            ))}
          </select>
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

      {/* OVERVIEW STATS (Shown either overall or for specific event) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="text-xs text-slate-400 font-mono mb-1">PARTICIPANTS</div>
          <div className="text-2xl font-bold text-white mb-2">
            {selectedEventId ? eventStats?.execution?.uniqueParticipants || 0 : overview?.participants?.total || 0}
          </div>
          {!selectedEventId && (
            <div className="flex gap-2 text-xs">
              <span className="text-emerald-400">{overview?.participants?.active || 0} Active</span>
              <span className="text-slate-500">•</span>
              <span className="text-rose-400">{overview?.participants?.disabled || 0} Disabled</span>
            </div>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="text-xs text-slate-400 font-mono mb-1">CHALLENGES</div>
          <div className="text-2xl font-bold text-white mb-2">
            {selectedEventId ? eventStats?.challengeCount || 0 : overview?.challenges?.total || 0}
          </div>
          {!selectedEventId && (
            <div className="flex gap-2 text-xs">
              <span className="text-emerald-400">{overview?.challenges?.enabled || 0} Enabled</span>
            </div>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="text-xs text-slate-400 font-mono mb-1">ATTEMPTS</div>
          <div className="text-2xl font-bold text-white mb-2">
            {selectedEventId ? eventStats?.execution?.totalAttempts || 0 : overview?.attempts?.total || 0}
          </div>
          <div className="text-xs text-slate-400">Total Code Executions</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="text-xs text-slate-400 font-mono mb-1">EXECUTIONS</div>
          <div className="flex gap-4 text-sm mt-2">
            <div>
              <div className="text-emerald-400 font-bold">{selectedEventId ? eventStats?.execution?.successfulExecutions || 0 : overview?.attempts?.successful || 0}</div>
              <div className="text-xs text-slate-500">Success</div>
            </div>
            <div>
              <div className="text-rose-400 font-bold">{selectedEventId ? eventStats?.execution?.failedExecutions || 0 : overview?.attempts?.failed || 0}</div>
              <div className="text-xs text-slate-500">Failed</div>
            </div>
          </div>
        </div>
      </div>

      {!selectedEventId ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400 font-mono">
          Select an event from the dropdown above to view participant results, challenge statistics, and leaderboard.
        </div>
      ) : (
        <>
          {eventDataLoading ? (
            <div className="p-8 text-center text-slate-500 font-mono">Loading event data...</div>
          ) : (
            <div className="space-y-8">
              
              {/* PARTICIPANT RESULTS */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h2 className="text-lg font-bold text-slate-200 font-mono">Participant Results</h2>
                  <form onSubmit={handleSearch} className="w-full sm:w-auto flex">
                    <input 
                      type="text" 
                      placeholder="Search name/email..." 
                      className="bg-slate-950 border border-slate-700 rounded-l-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 w-full sm:w-64"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button type="submit" className="bg-cyan-900/40 text-cyan-400 border border-cyan-800 border-l-0 rounded-r-lg px-3 py-1.5 hover:bg-cyan-800/60 transition">
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
                        <th className="px-4 py-3 text-center">Evaluated</th>
                        <th className="px-4 py-3 text-center">Solved</th>
                        <th className="px-4 py-3 text-center">Score</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono divide-y divide-slate-800/50">
                      {participantResults.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="px-4 py-8 text-center text-slate-500">
                            No participants found for this event.
                          </td>
                        </tr>
                      ) : (
                        participantResults.map(p => (
                          <tr key={p._id} className="hover:bg-slate-800/30">
                            <td className="px-4 py-3">
                              <div className="font-medium text-slate-200">{p.name}</div>
                              <div className="text-xs text-slate-500">{p.email}</div>
                            </td>
                            <td className="px-4 py-3 text-center">{p.totalAttempts}</td>
                            <td className="px-4 py-3 text-center">{p.evaluatedAttempts}</td>
                            <td className="px-4 py-3 text-center">
                              {p.evaluatedAttempts > 0 ? (
                                <span className="text-emerald-400 font-bold">{p.solved}</span>
                              ) : (
                                <span className="text-slate-600 text-xs italic">Not evaluated</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {p.evaluatedAttempts > 0 ? (
                                <span className="text-cyan-400 font-bold">{p.score}</span>
                              ) : (
                                <span className="text-slate-600 text-xs italic">Not evaluated</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Link 
                                to={`/admin/attempts?participant=${p._id}`}
                                className="text-xs text-cyan-500 hover:text-cyan-400 hover:underline"
                              >
                                View Attempts &rarr;
                              </Link>
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
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1 text-xs bg-slate-800 text-slate-300 rounded hover:bg-slate-700 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="text-xs text-slate-500 font-mono">Page {page} of {totalPages}</span>
                    <button 
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
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
                  <h2 className="text-lg font-bold text-slate-200 font-mono">Challenge Statistics</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="text-xs text-slate-400 uppercase bg-slate-950/50 border-b border-slate-800 font-mono">
                      <tr>
                        <th className="px-4 py-3">Challenge</th>
                        <th className="px-4 py-3 text-center">Attempts</th>
                        <th className="px-4 py-3 text-center">Participants</th>
                        <th className="px-4 py-3 text-center">Execution Success Rate</th>
                        <th className="px-4 py-3 text-center">Evaluation</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono divide-y divide-slate-800/50">
                      {challengeStats.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="px-4 py-8 text-center text-slate-500">
                            No challenges found for this event.
                          </td>
                        </tr>
                      ) : (
                        challengeStats.map(c => (
                          <tr key={c._id} className="hover:bg-slate-800/30">
                            <td className="px-4 py-3">
                              <div className="font-medium text-slate-200">{c.title}</div>
                              <div className="text-xs text-slate-500">Score: {c.score}</div>
                            </td>
                            <td className="px-4 py-3 text-center">{c.attemptsCount}</td>
                            <td className="px-4 py-3 text-center">{c.uniqueParticipants}</td>
                            <td className="px-4 py-3 text-center">
                              {c.attemptsCount > 0 ? (
                                <span>{c.executionSuccessRate.toFixed(1)}%</span>
                              ) : '-'}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {c.evaluationAvailable ? (
                                <div>
                                  <div className="text-emerald-400">{c.solved} Solved</div>
                                  <div className="text-xs text-slate-500">({c.solveRate.toFixed(1)}% solve rate)</div>
                                </div>
                              ) : (
                                <span className="text-slate-600 text-xs italic">Not internally evaluated</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* LEADERBOARD */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="p-5 border-b border-slate-800">
                  <h2 className="text-lg font-bold text-slate-200 font-mono">Leaderboard</h2>
                </div>
                
                {!leaderboard?.available ? (
                  <div className="p-8 text-center">
                    <div className="inline-block p-4 rounded-lg bg-slate-950/50 border border-slate-800 text-slate-400 font-mono text-sm max-w-lg mx-auto">
                      <div className="text-amber-500 mb-2">⚠️ Leaderboard Unavailable</div>
                      {leaderboard?.message || "Leaderboard unavailable because attempts are not internally evaluated."}
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-300">
                      <thead className="text-xs text-slate-400 uppercase bg-slate-950/50 border-b border-slate-800 font-mono">
                        <tr>
                          <th className="px-4 py-3 text-center w-16">Rank</th>
                          <th className="px-4 py-3">Participant</th>
                          <th className="px-4 py-3 text-center">Solved</th>
                          <th className="px-4 py-3 text-right">Score</th>
                        </tr>
                      </thead>
                      <tbody className="font-mono divide-y divide-slate-800/50">
                        {leaderboard.leaderboard.length === 0 ? (
                          <tr>
                            <td colSpan="4" className="px-4 py-8 text-center text-slate-500">
                              No participants have solved any challenges yet.
                            </td>
                          </tr>
                        ) : (
                          leaderboard.leaderboard.map(entry => (
                            <tr key={entry._id} className="hover:bg-slate-800/30">
                              <td className="px-4 py-3 text-center font-bold text-cyan-400">
                                #{entry.rank}
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-medium text-slate-200">{entry.name}</div>
                                <div className="text-xs text-slate-500">{entry.email}</div>
                              </td>
                              <td className="px-4 py-3 text-center">
                                {entry.solvedCount}
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-emerald-400">
                                {entry.totalScore}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ResultsPage;
