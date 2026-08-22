import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getLiveEvents, getUpcomingEvents, startEvent } from '../services/eventService';

const ParticipantDashboardShell = () => {
  const { participantUser, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'DEMO' | 'CONTEST'
  const [liveEvents, setLiveEvents] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [startStatus, setStartStatus] = useState({}); // { [eventId]: { isLoading, error, session } }

  const handleLogout = async () => {
    await logout('PARTICIPANT');
    navigate('/login');
  };


  // Password Modal state
  const [passwordModalEvent, setPasswordModalEvent] = useState(null);
  const [eventPasswordInput, setEventPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(null);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const typeFilter = activeTab === 'ALL' ? null : activeTab;
      const [liveRes, upcomingRes] = await Promise.all([
        getLiveEvents(typeFilter),
        getUpcomingEvents(typeFilter),
      ]);

      if (liveRes.success && liveRes.data) {
        setLiveEvents(liveRes.data.events || []);
      }
      if (upcomingRes.success && upcomingRes.data) {
        setUpcomingEvents(upcomingRes.data.events || []);
      }
    } catch (err) {
      setError(err.message || 'Unable to fetch events.');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const initiateStartEvent = (event) => {
    if (event.isPasswordProtected) {
      setPasswordModalEvent(event);
      setEventPasswordInput('');
      setPasswordError(null);
    } else {
      executeStartEvent(event.id, null);
    }
  };

  const executeStartEvent = async (eventId, password = null) => {
    setStartStatus((prev) => ({
      ...prev,
      [eventId]: { isLoading: true, error: null, session: null },
    }));

    try {
      const res = await startEvent(eventId, password);
      setStartStatus((prev) => ({
        ...prev,
        [eventId]: { isLoading: false, error: null, session: res.data },
      }));
      if (passwordModalEvent) {
        setPasswordModalEvent(null);
        setEventPasswordInput('');
      }
    } catch (err) {
      const errMsg = err.message || 'Failed to start event.';
      if (passwordModalEvent) {
        setPasswordError(errMsg);
      }
      setStartStatus((prev) => ({
        ...prev,
        [eventId]: {
          isLoading: false,
          error: errMsg,
          session: null,
        },
      }));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-mono">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Terminal Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-6 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-xs text-emerald-400 font-bold tracking-wider">[ backTrack TERMINAL ]</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mt-1">Participant Console</h1>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Logged in as <span className="text-slate-200 font-mono font-bold">{participantUser?.name}</span> ({participantUser?.email})
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchEvents}
              disabled={isLoading}
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-lg border border-slate-800 transition disabled:opacity-50 flex items-center gap-1.5"
            >
              <span>🔄</span>
              <span>Refresh</span>
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-slate-900 hover:bg-red-950/60 text-red-400 hover:text-red-300 text-xs font-bold rounded-lg border border-slate-800 hover:border-red-800 transition"
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* Global Error Banner */}
        {error && (
          <div className="p-4 bg-red-950/60 border border-red-800 rounded-xl text-red-300 text-sm flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
            <button
              onClick={fetchEvents}
              className="px-3 py-1 bg-red-900 hover:bg-red-800 text-white text-xs font-semibold rounded"
            >
              Retry
            </button>
          </div>
        )}

        {/* EVENTS NAVIGATION MENU (DEMO / CONTEST) */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-sans font-bold">EVENTS MENU:</span>
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                activeTab === 'ALL'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              All Events
            </button>
            <button
              onClick={() => setActiveTab('DEMO')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                activeTab === 'DEMO'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              🧪 Demo Events
            </button>
            <button
              onClick={() => setActiveTab('CONTEST')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                activeTab === 'CONTEST'
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/40'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              🏆 Contest Events
            </button>
          </div>
          <span className="text-[11px] text-slate-500 font-sans hidden md:inline">
            Select an event to practice or compete
          </span>
        </div>

        {/* SECTION 1: LIVE EVENTS */}
        <section className="space-y-4">
          <div className="flex items-center gap-2.5">
            <span className="text-emerald-400 text-lg">⚡</span>
            <h2 className="text-lg font-bold text-slate-100 tracking-wide">
              LIVE EVENTS {activeTab !== 'ALL' && `(${activeTab})`}
            </h2>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/80">
              {liveEvents.length} Available
            </span>
          </div>

          {isLoading ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs">Checking competition schedule...</p>
            </div>
          ) : liveEvents.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-8 text-center space-y-2">
              <div className="text-2xl">⏳</div>
              <h3 className="text-sm font-semibold text-slate-300">No events currently LIVE.</h3>
              <p className="text-xs text-slate-500 font-sans max-w-md mx-auto">
                When an event is activated by administrator and reaches its scheduled start time, it will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {liveEvents.map((ev) => {
                const statusInfo = startStatus[ev.id] || {};
                const now = new Date();
                const start = new Date(ev.startTime);
                const end = new Date(ev.endTime);
                const isBeforeStart = now.getTime() < start.getTime();
                const isAfterEnd = now.getTime() > end.getTime();

                return (
                  <div
                    key={ev.id}
                    className="bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-xl p-6 shadow-xl space-y-4 transition"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-white">{ev.name}</h3>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            ev.type === 'DEMO' ? 'bg-indigo-950 text-indigo-400 border border-indigo-800/60' : 'bg-amber-950 text-amber-400 border border-amber-800/60'
                          }`}>
                            {ev.type || 'CONTEST'}
                          </span>
                          {ev.isPasswordProtected && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-amber-300 border border-slate-700">
                              🔒 Protected
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            LIVE
                          </span>
                        </div>
                        {ev.description && (
                          <p className="text-xs text-slate-400 font-sans mt-1">{ev.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                      <div>
                        <span className="text-slate-500 block mb-0.5">Start Time:</span>
                        <span className="text-slate-200">{start.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block mb-0.5">End Time:</span>
                        <span className="text-slate-200">{end.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Start Action Feedback */}
                    {statusInfo.error && (
                      <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 text-xs rounded-lg flex items-center gap-2">
                        <span>⚠️</span>
                        <span>{statusInfo.error}</span>
                      </div>
                    )}

                    {statusInfo.session ? (
                      <div className="p-4 bg-emerald-950/60 border border-emerald-700/60 text-emerald-300 text-xs rounded-lg space-y-3">
                        <div className="flex items-center gap-2 font-bold text-emerald-400">
                          <span>✅</span>
                          <span>Event Session Active</span>
                        </div>
                        <p className="text-slate-300 font-sans">
                          You have successfully unlocked <span className="font-bold text-white font-mono">{ev.name}</span>.
                        </p>
                        <button
                          onClick={() => navigate(`/participant/events/${ev.id}/challenges`)}
                          className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-emerald-900/40 transition flex items-center gap-2"
                        >
                          <span>🚀</span>
                          <span>Open backTrack Terminal &rarr;</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                        <div className="text-xs text-slate-400 font-sans">
                          {isBeforeStart ? (
                            <span className="text-amber-400 flex items-center gap-1.5">
                              <span>⏰</span>
                              <span>Starts at {start.toLocaleTimeString()}</span>
                            </span>
                          ) : isAfterEnd ? (
                            <span className="text-red-400">This event has reached its end time.</span>
                          ) : (
                            <span className="text-emerald-400 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                              <span>Session in progress</span>
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => initiateStartEvent(ev)}
                          disabled={statusInfo.isLoading || isAfterEnd}
                          className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-emerald-900/40 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {statusInfo.isLoading && (
                            <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                            </svg>
                          )}
                          <span>Start Event &rarr;</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* SECTION 2: UPCOMING EVENTS */}
        <section className="space-y-4">
          <div className="flex items-center gap-2.5">
            <span className="text-amber-400 text-lg">📅</span>
            <h2 className="text-lg font-bold text-slate-100 tracking-wide">UPCOMING EVENTS</h2>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-950 text-amber-400 border border-amber-800/80">
              {upcomingEvents.length} Scheduled
            </span>
          </div>

          {isLoading ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
              <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs">Loading scheduled events...</p>
            </div>
          ) : upcomingEvents.length === 0 ? (
            <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-6 text-center text-slate-500 text-xs">
              No upcoming events currently scheduled.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-200">{ev.name}</h4>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          ev.type === 'DEMO' ? 'bg-indigo-950 text-indigo-400 border border-indigo-800/60' : 'bg-amber-950 text-amber-400 border border-amber-800/60'
                        }`}>
                          {ev.type || 'CONTEST'}
                        </span>
                      </div>
                      {ev.description && (
                        <p className="text-xs text-slate-400 font-sans mt-0.5 line-clamp-2">{ev.description}</p>
                      )}
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-amber-950 text-amber-400 border border-amber-800/60 shrink-0">
                      UPCOMING
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-400 bg-slate-950 p-2.5 rounded border border-slate-800/80 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Starts:</span>
                      <span className="text-slate-300">{new Date(ev.startTime).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Ends:</span>
                      <span className="text-slate-300">{new Date(ev.endTime).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* EVENT PASSWORD PROMPT MODAL */}
      {passwordModalEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn font-mono">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>🔒</span>
                <span>Protected Event Access</span>
              </h3>
              <button
                onClick={() => setPasswordModalEvent(null)}
                className="text-slate-400 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 font-sans">
              <span className="font-bold text-white">{passwordModalEvent.name}</span> requires a common event password to join.
            </p>

            {passwordError && (
              <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 text-xs rounded-lg flex items-center gap-2 font-sans">
                <span>⚠️</span>
                <span>{passwordError}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                executeStartEvent(passwordModalEvent.id, eventPasswordInput);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 font-sans">
                  Event Access Password
                </label>
                <input
                  type="password"
                  value={eventPasswordInput}
                  onChange={(e) => setEventPasswordInput(e.target.value)}
                  placeholder="Enter event password..."
                  required
                  autoFocus
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2 font-sans">
                <button
                  type="button"
                  onClick={() => setPasswordModalEvent(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={startStatus[passwordModalEvent.id]?.isLoading}
                  className="px-5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/40 transition flex items-center gap-2"
                >
                  {startStatus[passwordModalEvent.id]?.isLoading ? 'Verifying...' : 'Unlock & Start Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParticipantDashboardShell;
