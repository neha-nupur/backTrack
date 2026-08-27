import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getLiveEvents, getUpcomingEvents, startEvent } from '../services/eventService';
import CyberBackground from '../components/CyberBackground';

const ParticipantDashboardShell = () => {
  const { participantUser, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('DEMO'); // 'DEMO' | 'CONTEST' | 'ALL'
  const [liveEvents, setLiveEvents] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [startStatus, setStartStatus] = useState({});

  const handleLogout = async () => {
    await logout('PARTICIPANT');
    navigate('/login');
  };

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
        activeTab === 'ALL' ? getUpcomingEvents(null) : Promise.resolve({ success: true, data: { events: [] } }),
      ]);
      if (liveRes.success && liveRes.data) setLiveEvents(liveRes.data.events || []);
      if (upcomingRes.success && upcomingRes.data) setUpcomingEvents(upcomingRes.data.events || []);
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
    setStartStatus((prev) => ({ ...prev, [eventId]: { isLoading: true, error: null, session: null } }));
    try {
      const res = await startEvent(eventId, password);
      setStartStatus((prev) => ({ ...prev, [eventId]: { isLoading: false, error: null, session: res.data } }));
      if (passwordModalEvent) { setPasswordModalEvent(null); setEventPasswordInput(''); }
      navigate(`/participant/events/${eventId}/challenges`);
    } catch (err) {
      const errMsg = err.message || 'Failed to start event.';
      if (passwordModalEvent) setPasswordError(errMsg);
      setStartStatus((prev) => ({ ...prev, [eventId]: { isLoading: false, error: errMsg, session: null } }));
    }
  };

  /* ── Tab ordering: Demo 1st, Contest 2nd, All last ── */
  const TABS = [
    {
      id: 'DEMO',
      label: 'Demo Events',
      icon: '🧪',
      activeClass: 'bg-gradient-to-r from-[#004db3] to-[#0088cc] text-white border-cyan-500/80 shadow-[0_0_15px_rgba(0,140,255,0.35)]',
    },
    {
      id: 'CONTEST',
      label: 'Contest Events',
      icon: '🏆',
      activeClass: 'bg-gradient-to-r from-[#0066ff] to-[#00c2ff] text-white border-cyan-400 shadow-[0_0_20px_rgba(0,140,255,0.45)]',
    },
    {
      id: 'ALL',
      label: 'All Events',
      icon: '▦',
      activeClass: 'bg-[#0e274c] text-cyan-300 border-cyan-600/70 shadow-[0_0_12px_rgba(6,182,212,0.25)]',
    },
  ];

  const TypeBadge = ({ type }) => (
    <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold font-mono ${
      type === 'DEMO'
        ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-700/60'
        : 'bg-amber-950/80 text-amber-300 border border-amber-700/60'
    }`}>
      {type || 'CONTEST'}
    </span>
  );

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 font-mono relative overflow-x-hidden">
      {/* Animated Cyber Background */}
      <CyberBackground />

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* ── HIGHLIGHTED PARTICIPANT CONSOLE DIV ── */}
        <header className="relative bg-[#071324]/85 border border-slate-800/90 hover:border-slate-700/80 rounded-2xl p-6 shadow-xl backdrop-blur-md transition-all duration-300"
                style={{ boxShadow: '0 4px 25px rgba(2, 6, 23, 0.7), inset 0 1px 0 rgba(56, 189, 248, 0.08)' }}>
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent"></div>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
                <span className="text-xs text-cyan-400 font-bold tracking-widest uppercase">
                  [ backTrack TERMINAL ]
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight"
                  style={{ textShadow: '0 0 16px rgba(56,189,248,0.12)' }}>
                Participant Console
              </h1>
              <p className="text-xs text-slate-400 mt-1 font-sans">
                Logged in as{' '}
                <span className="text-slate-100 font-mono font-bold">{participantUser?.name}</span>
                {' '}(<span className="text-slate-300">{participantUser?.email}</span>)
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchEvents}
                disabled={isLoading}
                className="px-3.5 py-2 bg-[#09182f]/90 hover:bg-[#0f2549] text-slate-300 hover:text-white text-xs font-semibold rounded-xl border border-slate-700/70 hover:border-cyan-500/50 transition disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
              >
                <span>🔄</span>
                <span>Refresh</span>
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-[#09182f]/90 hover:bg-red-950/50 text-red-400 hover:text-red-300 text-xs font-bold rounded-xl border border-slate-700/70 hover:border-red-700/60 transition shadow-sm"
              >
                Sign Out
              </button>
            </div>
          </div>
        </header>

        {/* ── GLOBAL ERROR BANNER ── */}
        {error && (
          <div className="p-4 bg-red-950/50 border border-red-800/70 rounded-xl text-red-300 text-sm flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
            <button
              onClick={fetchEvents}
              className="px-3 py-1 bg-red-900/80 hover:bg-red-800 text-white text-xs font-semibold rounded"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── HIGHLIGHTED EVENTS MENU BAR ── */}
        <div className="relative bg-[#071324]/80 border border-slate-800/80 rounded-2xl p-3.5 flex items-center justify-between flex-wrap gap-3 shadow-lg backdrop-blur-md"
             style={{ boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(56, 189, 248, 0.05)' }}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400 font-sans font-bold tracking-wider uppercase mr-2">
              EVENTS MENU:
            </span>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                  activeTab === tab.id
                    ? tab.activeClass
                    : 'bg-[#08162b]/80 text-slate-400 border-slate-800/80 hover:text-slate-200 hover:border-slate-700 hover:bg-[#0c1f3d]'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-500 font-sans hidden md:inline">
            Select an event to practice or compete
          </span>
        </div>

        {/* ── HIGHLIGHTED LIVE EVENTS SECTION ── */}
        <section className="space-y-4">
          <div className="flex items-center gap-2.5">
            <span className="text-cyan-400 text-lg">⚡</span>
            <h2 className="text-base font-bold text-slate-100 tracking-wider uppercase">
              LIVE EVENTS {activeTab !== 'ALL' && `(${activeTab})`}
            </h2>
            <span className="text-[10px] uppercase font-mono px-2.5 py-0.5 rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-700/60 font-semibold shadow-sm">
              {liveEvents.length} AVAILABLE
            </span>
          </div>

          {isLoading ? (
            <div className="bg-[#071324]/70 border border-slate-800/80 rounded-2xl p-12 text-center shadow-lg">
              <div className="w-7 h-7 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-xs text-slate-400">Checking competition schedule...</p>
            </div>
          ) : liveEvents.length === 0 ? (
            <div className="bg-[#071324]/50 border border-slate-800/70 rounded-2xl p-12 text-center space-y-2.5 shadow-lg">
              <div className="text-3xl opacity-60">⏳</div>
              <h3 className="text-sm font-semibold text-slate-300">No events currently LIVE.</h3>
              <p className="text-xs text-slate-500 font-sans max-w-md mx-auto">
                When an event is activated by the administrator and reaches its scheduled start time, it will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5">
              {liveEvents.map((ev) => {
                const statusInfo = startStatus[ev.id] || {};
                const now = new Date();
                const start = new Date(ev.startTime);
                const end = new Date(ev.endTime);
                const isBeforeStart = now < start;
                const isAfterEnd = now > end;

                return (
                  <div
                    key={ev.id}
                    className="relative bg-[#071426]/90 border border-slate-800/90 hover:border-slate-700 rounded-2xl p-6 shadow-2xl transition-all duration-300 overflow-hidden"
                    style={{ boxShadow: '0 8px 32px rgba(2, 6, 23, 0.8), inset 0 1px 0 rgba(56, 189, 248, 0.08)' }}
                  >
                    {/* Subtle top accent border line */}
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent"></div>

                    {/* Event title & badge header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/70 pb-4 mb-4">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="text-lg font-bold text-white tracking-tight">{ev.name}</h3>
                        <TypeBadge type={ev.type} />
                        {ev.isPasswordProtected && (
                          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-blue-950/60 text-cyan-300 border border-cyan-700/60 flex items-center gap-1">
                            <span>🔒</span> Protected
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-cyan-950/80 text-cyan-400 border border-cyan-700/60 shadow-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                          LIVE
                        </span>
                      </div>
                    </div>

                    {ev.description && (
                      <p className="text-xs text-slate-400 font-sans mb-4">{ev.description}</p>
                    )}

                    {/* Start Time / End Time Box */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs bg-[#030914]/80 p-3.5 rounded-xl border border-slate-800/80 mb-6">
                      <div>
                        <span className="text-slate-500 block mb-1 font-sans">Start Time:</span>
                        <span className="text-slate-200 font-semibold">{start.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block mb-1 font-sans">End Time:</span>
                        <span className="text-slate-200 font-semibold">{end.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Error message */}
                    {statusInfo.error && (
                      <div className="p-3 bg-red-950/50 border border-red-800/70 text-red-300 text-xs rounded-xl flex items-center gap-2 mb-4 font-sans">
                        <span>⚠️</span>
                        <span>{statusInfo.error}</span>
                      </div>
                    )}

                    {/* ── Status Text & Start Event Button in the Middle ── */}
                    <div className="flex flex-col items-center justify-center gap-4 pt-1">
                      {/* Status text */}
                      <div className="text-xs text-slate-400 font-sans text-center">
                        {isBeforeStart ? (
                          <span className="text-amber-400/90 flex items-center gap-1.5 justify-center">
                            <span>⏰</span>
                            <span>Starts at {start.toLocaleTimeString()}</span>
                          </span>
                        ) : isAfterEnd ? (
                          <span className="text-red-400/80">This event has reached its end time.</span>
                        ) : (
                          <span className="text-cyan-400 flex items-center gap-2 justify-center font-medium">
                            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                            <span>Session in progress</span>
                          </span>
                        )}
                      </div>

                      {/* Centered Blue/Cyan Start Event Button (Matching Picture 1) */}
                      <button
                        onClick={() => initiateStartEvent(ev)}
                        disabled={statusInfo.isLoading || isAfterEnd}
                        className="px-8 py-3 bg-gradient-to-r from-[#0066ff] to-[#00c2ff] hover:from-[#0055ee] hover:to-[#00b0ee] text-white font-mono font-bold text-xs sm:text-sm tracking-wide rounded-xl shadow-[0_0_25px_rgba(0,140,255,0.45)] hover:shadow-[0_0_30px_rgba(0,180,255,0.6)] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                      >
                        {statusInfo.isLoading ? (
                          <>
                            <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                            </svg>
                            <span>Starting...</span>
                          </>
                        ) : (
                          <>
                            <span>Start Event</span>
                            <span className="text-cyan-200 font-bold">&rarr;</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── SECTION 2: UPCOMING EVENTS (Only shown when activeTab === 'ALL') ── */}
        {activeTab === 'ALL' && (
          <section className="space-y-4 pt-2">
            <div className="flex items-center gap-2.5">
              <span className="text-amber-400 text-lg">📅</span>
              <h2 className="text-base font-bold text-slate-100 tracking-wider uppercase">UPCOMING EVENTS</h2>
              <span className="text-[10px] uppercase font-mono px-2.5 py-0.5 rounded-full bg-amber-950/80 text-amber-400 border border-amber-700/60 font-semibold shadow-sm">
                {upcomingEvents.length} SCHEDULED
              </span>
            </div>

            {isLoading ? (
              <div className="bg-[#071324]/70 border border-slate-800/80 rounded-2xl p-10 text-center shadow-lg">
                <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-xs text-slate-400">Loading scheduled events...</p>
              </div>
            ) : upcomingEvents.length === 0 ? (
              <div className="bg-[#071324]/50 border border-slate-800/70 rounded-2xl p-8 text-center text-slate-400 text-xs font-sans shadow-lg">
                No upcoming events currently scheduled.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="relative bg-[#071426]/80 border border-slate-800/80 hover:border-slate-700 rounded-2xl p-5 space-y-3.5 transition-all duration-200 shadow-xl"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-slate-200">{ev.name}</h4>
                          <TypeBadge type={ev.type} />
                        </div>
                        {ev.description && (
                          <p className="text-xs text-slate-400 font-sans mt-1 line-clamp-2">{ev.description}</p>
                        )}
                      </div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-amber-950/80 text-amber-400 border border-amber-700/60 shrink-0">
                        UPCOMING
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 bg-[#030914]/80 p-3 rounded-xl border border-slate-800/80 space-y-1 font-sans">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Starts:</span>
                        <span className="text-slate-300 font-semibold">{new Date(ev.startTime).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Ends:</span>
                        <span className="text-slate-300 font-semibold">{new Date(ev.endTime).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {/* ── PASSWORD MODAL ── */}
      {passwordModalEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm font-mono">
          <div
            className="bg-[#071324] border border-slate-700/80 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 relative overflow-hidden"
            style={{ boxShadow: '0 0 50px rgba(2, 6, 23, 0.9)' }}
          >
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>

            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>🔒</span>
                <span>Protected Event Access</span>
              </h3>
              <button
                onClick={() => setPasswordModalEvent(null)}
                className="text-slate-400 hover:text-white transition text-lg leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 font-sans">
              <span className="font-bold text-white">{passwordModalEvent.name}</span> requires a common event password to join.
            </p>

            {passwordError && (
              <div className="p-3 bg-red-950/50 border border-red-800/70 text-red-300 text-xs rounded-xl flex items-center gap-2 font-sans">
                <span>⚠️</span>
                <span>{passwordError}</span>
              </div>
            )}

            <form
              onSubmit={(e) => { e.preventDefault(); executeStartEvent(passwordModalEvent.id, eventPasswordInput); }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-sans tracking-wide">
                  Event Access Password
                </label>
                <input
                  type="password"
                  value={eventPasswordInput}
                  onChange={(e) => setEventPasswordInput(e.target.value)}
                  placeholder="Enter event password..."
                  required
                  autoFocus
                  className="w-full bg-[#030914] border border-slate-700/80 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div className="flex justify-end gap-3 pt-1 font-sans">
                <button
                  type="button"
                  onClick={() => setPasswordModalEvent(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={startStatus[passwordModalEvent.id]?.isLoading}
                  className="px-5 py-2.5 text-xs font-mono font-bold rounded-xl bg-gradient-to-r from-[#0066ff] to-[#00c2ff] hover:from-[#0055ee] hover:to-[#00b0ee] text-white shadow-[0_0_20px_rgba(0,140,255,0.4)] transition flex items-center gap-2 disabled:opacity-40 cursor-pointer"
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
