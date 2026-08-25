import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  getParticipantChallenges,
  executeChallenge,
} from "../../services/challengeService";
import { getLiveEvents } from "../../services/eventService";
import { getAttempts } from "../../services/resultService";
import CyberBackground from "../../components/CyberBackground";

const getTimeRemainingMs = (endTime) => {
  if (!endTime) return 0;
  return Math.max(0, new Date(endTime).getTime() - Date.now());
};

const formatCountdown = (ms) => {
  if (!Number.isFinite(ms) || ms <= 0) return "00:00:00";

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
};

const formatAttemptDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const isQualifiedOutput = (output) => {
  return output !== null && output !== undefined && String(output).trim() !== "";
};

const ChallengePage = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { participantUser, user } = useAuth();
  const currentUser = participantUser || user;

  // Track whether the event has ended (timer hit zero)
  const [eventEnded, setEventEnded] = useState(false);

  // Challenge list state
  const [challenges, setChallenges] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Selected challenge state
  const [selectedChallenge, setSelectedChallenge] = useState(null);

  // Solved / completed challenge IDs tracked for progression
  const [solvedChallengeIds, setSolvedChallengeIds] = useState(() => {
    try {
      const stored = localStorage.getItem(`blackbox_solved_${eventId}`);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Execution state
  const [userInput, setUserInput] = useState("");
  const [inputError, setInputError] = useState(null);
  const [executionResult, setExecutionResult] = useState(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionHistory, setExecutionHistory] = useState([]);
  const [copiedIndex, setCopiedIndex] = useState(null);

  const [eventEndTime, setEventEndTime] = useState(() => {
    try {
      return localStorage.getItem(`blackbox_event_end_${eventId}`) || null;
    } catch {
      return null;
    }
  });
  const [timeRemainingMs, setTimeRemainingMs] = useState(() =>
    getTimeRemainingMs(eventEndTime),
  );

  const refreshEventEndTime = useCallback(async () => {
    if (!eventId) return;

    try {
      const res = await getLiveEvents();
      const event = (res?.data?.events || []).find(
        (entry) => (entry.id ?? entry._id) === eventId,
      );

      const nextEndTime =
        event?.endTime || localStorage.getItem(`blackbox_event_end_${eventId}`);
      if (nextEndTime) {
        setEventEndTime(nextEndTime);
        try {
          localStorage.setItem(`blackbox_event_end_${eventId}`, nextEndTime);
        } catch (err) {
          console.warn("Failed to persist event timer state:", err);
        }
      }
    } catch (err) {
      console.warn("Failed to refresh event timer metadata:", err);
    }
  }, [eventId]);

  useEffect(() => {
    refreshEventEndTime();
  }, [refreshEventEndTime]);

  useEffect(() => {
    if (!eventEndTime) {
      setTimeRemainingMs(0);
      return undefined;
    }

    const syncTimer = () => {
      const remaining = getTimeRemainingMs(eventEndTime);
      setTimeRemainingMs(remaining);
      // When timer hits zero, mark event as ended
      if (remaining <= 0) {
        setEventEnded(true);
      }
    };
    syncTimer();

    const intervalId = window.setInterval(syncTimer, 1000);
    return () => window.clearInterval(intervalId);
  }, [eventEndTime]);

  // Save solved IDs to localStorage
  const markChallengeSolved = useCallback(
    (challengeId) => {
      setSolvedChallengeIds((prev) => {
        const updated = new Set(prev);
        updated.add(challengeId);
        try {
          localStorage.setItem(
            `blackbox_solved_${eventId}`,
            JSON.stringify([...updated]),
          );
        } catch (err) {
          console.warn("Failed to persist solved challenge state:", err);
        }
        return updated;
      });
    },
    [eventId],
  );

  // Remove false/stale solved IDs
  const unmarkChallengeSolved = useCallback(
    (challengeId) => {
      setSolvedChallengeIds((prev) => {
        const updated = new Set(prev);
        updated.delete(challengeId);
        try {
          localStorage.setItem(
            `blackbox_solved_${eventId}`,
            JSON.stringify([...updated]),
          );
        } catch (err) {
          console.warn("Failed to update solved challenge state:", err);
        }
        return updated;
      });
    },
    [eventId],
  );

  // Fetch challenges for this event
  const fetchChallenges = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const res = await getParticipantChallenges(eventId);
      if (res.success && res.data) {
        const fetched = res.data.challenges || [];
        setChallenges(fetched);
        if (!selectedChallenge && fetched.length > 0) {
          setSelectedChallenge(fetched[0]);
        }
      }
    } catch (err) {
      setFetchError(err.message || "Failed to load challenges.");
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  // Fetch attempts for selected challenge
  const fetchAttemptHistory = useCallback(
    async (challengeId) => {
      try {
        const res = await getAttempts(eventId, { challengeId, limit: 30 });
        if (res.success && res.data) {
          const attempts = res.data.attempts || [];
          setExecutionHistory(attempts);

          const hasValidSuccess = attempts.some(
            (a) =>
              a.success === true && a.output && isQualifiedOutput(a.output),
          );

          if (hasValidSuccess) {
            markChallengeSolved(challengeId);
          } else {
            unmarkChallengeSolved(challengeId);
          }
        }
      } catch (err) {
        console.error("Failed to fetch attempt history:", err);
      }
    },
    [eventId, markChallengeSolved, unmarkChallengeSolved],
  );

  useEffect(() => {
    if (selectedChallenge) {
      fetchAttemptHistory(selectedChallenge.id);
    } else {
      setExecutionHistory([]);
    }
  }, [selectedChallenge, fetchAttemptHistory]);

  const currentChallengeIndex = useMemo(() => {
    if (!selectedChallenge || challenges.length === 0) return -1;
    return challenges.findIndex((c) => c.id === selectedChallenge.id);
  }, [selectedChallenge, challenges]);

  const isCurrentChallengeSolved = useMemo(() => {
    if (!selectedChallenge) return false;
    return solvedChallengeIds.has(selectedChallenge.id);
  }, [selectedChallenge, solvedChallengeIds]);

  const hasNextChallenge = useMemo(() => {
    return (
      currentChallengeIndex >= 0 &&
      currentChallengeIndex < challenges.length - 1
    );
  }, [currentChallengeIndex, challenges.length]);

  const nextChallenge = useMemo(() => {
    if (!hasNextChallenge) return null;
    return challenges[currentChallengeIndex + 1];
  }, [hasNextChallenge, currentChallengeIndex, challenges]);

  const handleSelectChallenge = (challenge) => {
    setSelectedChallenge(challenge);
    setUserInput("");
    setInputError(null);
    setExecutionResult(null);
  };

  const handleGoToNextChallenge = () => {
    if (nextChallenge) {
      handleSelectChallenge(nextChallenge);
    }
  };

  const handleExecute = async () => {
    if (!selectedChallenge || isExecuting || eventEnded) return;

    const trimmedInput = (userInput || "").trim();
    if (!trimmedInput) {
      setInputError("Please enter a valid input to test the black box.");
      return;
    }

    // Clear input immediately upon execution as requested
    setUserInput("");
    setInputError(null);
    setIsExecuting(true);
    setExecutionResult(null);

    try {
      const res = await executeChallenge(
        eventId,
        selectedChallenge.id,
        trimmedInput,
      );

      if (res.success && res.data?.execution) {
        const exec = res.data.execution;
        const attempt = res.data.attempt;
        setExecutionResult({ ...exec, attempt });

        if (attempt) {
          setExecutionHistory((prev) => [attempt, ...prev.slice(0, 29)]);
        }

        if (
          exec.success &&
          exec.output &&
          isQualifiedOutput(exec.output) &&
          !exec.error
        ) {
          markChallengeSolved(selectedChallenge.id);
        } else {
          unmarkChallengeSolved(selectedChallenge.id);
        }
      } else {
        throw new Error(res.message || "Execution failed");
      }
    } catch (err) {
      const failedResult = {
        success: false,
        output: null,
        error: {
          code: err.errorCode || "EXECUTION_ERROR",
          message:
            err.message ||
            "Execution request failed. Please check your input format.",
        },
      };
      setExecutionResult(failedResult);
      unmarkChallengeSolved(selectedChallenge.id);
    } finally {
      setIsExecuting(false);
    }
  };

  const copyToClipboard = (text, index) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const solvedPercentage = challenges.length > 0
    ? Math.round((solvedChallengeIds.size / challenges.length) * 100)
    : 0;

  return (
    <div className="h-screen max-h-screen bg-[#030712] text-slate-100 font-sans flex flex-col relative overflow-hidden selection:bg-cyan-600 selection:text-white">
      {/* Background with Subtle Cyan-Blue Grid */}
      <CyberBackground />

      {/* ── TOP NAV BAR ── */}
      <header className="relative z-20 bg-[#06101e]/90 border-b border-slate-800/80 px-6 py-3 flex items-center justify-between backdrop-blur-md shrink-0">
        {/* Left: Brand + Slogan */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/participant/dashboard")}
            className="flex items-center gap-3 group text-left cursor-pointer"
            title="Back to Participant Console"
          >
            <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 group-hover:border-cyan-400 transition shadow-[0_0_12px_rgba(6,182,212,0.25)]">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
              </svg>
            </div>
            <div>
              <span className="text-base font-black tracking-wider text-white font-mono">
                backTrack
              </span>
              <span className="text-[11px] text-slate-400 font-mono ml-3 hidden md:inline">
                Trace <span className="text-cyan-500">•</span> Reverse <span className="text-cyan-500">•</span> Conquer
              </span>
            </div>
          </button>
        </div>

        {/* Right: Stats, Timer & Participant Info */}
        <div className="flex items-center gap-4 text-xs font-mono">
          {/* Solved Count Pill */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#091a32] border border-cyan-700/50 text-cyan-300 shadow-sm">
            <span className="text-cyan-400">🏆</span>
            <span className="font-bold">
              {solvedChallengeIds.size} / {challenges.length} Solved
            </span>
          </div>

          {/* Countdown timer */}
          {eventEndTime && (
            <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border ${
              eventEnded
                ? 'bg-red-950/60 border-red-700/60 text-red-300'
                : 'bg-[#091a32] border-slate-700/60 text-slate-300'
            }`}>
              <span className={`uppercase text-[10px] ${eventEnded ? 'text-red-400' : 'text-slate-500'}`}>
                {eventEnded ? '⏱ Ended' : 'Timer'}
              </span>
              <span className={`font-bold ${eventEnded ? 'text-red-400 animate-pulse' : 'text-cyan-400'}`}>
                {eventEnded ? "TIME'S UP" : formatCountdown(timeRemainingMs)}
              </span>
            </div>
          )}

          {/* Participant Name & Avatar */}
          <div className="flex items-center gap-2.5 pl-2 border-l border-slate-800">
            <div className="text-right hidden sm:block">
              <span className="text-[11px] text-slate-400 font-sans block">Participant:</span>
              <span className="text-xs font-bold text-cyan-300 font-mono">
                {currentUser?.name || "Participant"}
              </span>
            </div>
            <div className="w-8 h-8 rounded-full bg-cyan-950 border border-cyan-500/50 flex items-center justify-center text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/>
              </svg>
            </div>
          </div>
        </div>
      </header>

      {/* ── EVENT ENDED FULL-SCREEN OVERLAY ── */}
      {eventEnded && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#030712]/95 backdrop-blur-md">
          <div className="relative max-w-lg w-full mx-4">
            {/* Glowing border effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-red-600/30 via-orange-500/20 to-red-600/30 rounded-3xl blur-xl animate-pulse" />
            
            <div className="relative bg-[#0a1628]/95 border border-red-800/60 rounded-3xl p-10 text-center space-y-6 shadow-2xl overflow-hidden">
              {/* Top accent line */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent" />
              
              {/* Animated icon */}
              <div className="relative mx-auto w-24 h-24">
                <div className="absolute inset-0 rounded-full bg-red-500/10 animate-ping" style={{ animationDuration: '2s' }} />
                <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-red-950 to-[#0a1628] border-2 border-red-500/50 flex items-center justify-center shadow-[0_0_40px_rgba(239,68,68,0.3)]">
                  <span className="text-5xl">⏱️</span>
                </div>
              </div>

              {/* Title */}
              <div>
                <h2 className="text-3xl font-black text-white font-mono tracking-tight mb-2"
                    style={{ textShadow: '0 0 20px rgba(239,68,68,0.3)' }}>
                  EVENT ENDED
                </h2>
                <div className="w-20 h-0.5 bg-gradient-to-r from-transparent via-red-500/60 to-transparent mx-auto" />
              </div>

              {/* Message */}
              <div className="space-y-2">
                <p className="text-sm text-slate-300 font-sans leading-relaxed">
                  The event timer has reached <span className="text-red-400 font-bold font-mono">00:00:00</span>.
                </p>
                <p className="text-xs text-slate-400 font-sans">
                  All challenge submissions are now closed. Your previous attempts have been recorded.
                </p>
              </div>

              {/* Stats summary */}
              <div className="flex items-center justify-center gap-6 py-3">
                <div className="text-center">
                  <span className="block text-2xl font-black text-cyan-400 font-mono">{solvedChallengeIds.size}</span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Solved</span>
                </div>
                <div className="w-px h-10 bg-slate-700/60" />
                <div className="text-center">
                  <span className="block text-2xl font-black text-slate-300 font-mono">{challenges.length}</span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Total</span>
                </div>
                <div className="w-px h-10 bg-slate-700/60" />
                <div className="text-center">
                  <span className="block text-2xl font-black text-amber-400 font-mono">{executionHistory.length}</span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Attempts</span>
                </div>
              </div>

              {/* Return button */}
              <button
                onClick={() => navigate('/participant/dashboard')}
                className="px-8 py-3.5 bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 text-white font-mono font-bold text-sm tracking-wider uppercase rounded-xl transition-all duration-300 shadow-[0_0_25px_rgba(239,68,68,0.4)] hover:shadow-[0_0_35px_rgba(239,68,68,0.6)] flex items-center justify-center gap-3 mx-auto cursor-pointer active:scale-95"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M19 12H5" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
                <span>Return to Dashboard</span>
              </button>

              {/* Bottom subtle text */}
              <p className="text-[10px] text-slate-500 font-mono">
                backTrack — Trace • Reverse • Conquer
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN WORKSPACE ── */}
      <div className="relative z-10 flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        
        {/* ── LEFT SIDEBAR: Challenges Stepper & Path Overview ── */}
        <aside className="w-full lg:w-72 xl:w-80 bg-[#06101e]/85 border-r border-slate-800/80 flex flex-col shrink-0 overflow-y-auto">
          {/* Header */}
          <div className="p-5 border-b border-slate-800/70">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="grid grid-cols-2 gap-0.5 w-3.5 h-3.5">
                  <div className="bg-cyan-400 rounded-[1px]"></div>
                  <div className="bg-cyan-400 rounded-[1px]"></div>
                  <div className="bg-cyan-400 rounded-[1px]"></div>
                  <div className="bg-cyan-400 rounded-[1px]"></div>
                </div>
                <h2 className="text-xs font-bold text-white tracking-widest uppercase font-mono">
                  CHALLENGES
                </h2>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/60 font-bold">
                {solvedChallengeIds.size} / {challenges.length}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans">
              Decode the Black Box.
            </p>
          </div>

          {/* Vertical Node Stepper List */}
          <div className="p-4 flex-1 space-y-3 relative">
            {/* Connecting line */}
            <div className="absolute left-[34px] top-6 bottom-6 w-0.5 border-l-2 border-dashed border-cyan-900/50 pointer-events-none"></div>

            {isLoading ? (
              <div className="p-8 text-center">
                <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-xs text-slate-400 font-mono">Loading nodes...</p>
              </div>
            ) : fetchError ? (
              <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-red-300 text-xs">
                <p>{fetchError}</p>
                <button
                  onClick={fetchChallenges}
                  className="mt-2 px-3 py-1 bg-red-900 text-white text-xs rounded"
                >
                  Retry
                </button>
              </div>
            ) : (
              challenges.map((ch, idx) => {
                const challengeNum = ch.challengeNumber || idx + 1;
                const formattedNum = String(challengeNum).padStart(2, "0");
                const isSelected = selectedChallenge?.id === ch.id;
                const isSolved = solvedChallengeIds.has(ch.id);

                return (
                  <div key={ch.id} className="relative z-10">
                    <button
                      onClick={() => handleSelectChallenge(ch)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all duration-200 text-left cursor-pointer ${
                        isSelected
                          ? "bg-gradient-to-r from-blue-900/80 to-cyan-900/40 border border-cyan-500/70 shadow-[0_0_20px_rgba(6,182,212,0.25)]"
                          : isSolved
                            ? "bg-[#09182d]/60 border border-cyan-800/40 hover:border-cyan-600/60"
                            : "bg-[#071324]/40 border border-slate-800/60 hover:border-slate-700/80 hover:bg-[#0a1b32]/40"
                      }`}
                    >
                      {/* Node Shape / Number */}
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 transition-all ${
                          isSelected
                            ? "bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.6)]"
                            : isSolved
                              ? "bg-cyan-950 text-cyan-400 border border-cyan-700"
                              : "bg-[#030914] text-slate-400 border border-slate-800"
                        }`}
                      >
                        {isSolved ? "✓" : formattedNum}
                      </div>

                      {/* Title / Status */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3
                            className={`text-xs font-bold font-mono truncate ${
                              isSelected ? "text-white" : "text-slate-300"
                            }`}
                          >
                            Challenge {formattedNum}
                          </h3>
                          {isSelected && (
                            <span className="text-cyan-400 text-xs">›</span>
                          )}
                          {!isSelected && isSolved && (
                            <span className="text-[10px] font-mono text-cyan-400">
                              PASSED
                            </span>
                          )}
                          {!isSelected && !isSolved && (
                            <span className="text-slate-600 text-xs">🔒</span>
                          )}
                        </div>
                        <p className="text-[10px] font-mono text-slate-400 truncate">
                          {isSelected ? "Current Node" : isSolved ? "Completed" : "Black Box"}
                        </p>
                      </div>
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom Nav Icons */}
          <div className="p-3 border-t border-slate-800/70 flex items-center justify-around text-slate-400 bg-[#040c17]/90 shrink-0">
            <button
              onClick={() => navigate("/participant/dashboard")}
              className="p-2 hover:text-cyan-400 transition cursor-pointer"
              title="Dashboard Home"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
            </button>
            <button className="p-2 text-cyan-400" title="Code Challenges">
              <span className="font-mono font-bold text-xs">&lt;/&gt;</span>
            </button>
            <button
              onClick={() => navigate("/participant/dashboard")}
              className="p-2 hover:text-cyan-400 transition cursor-pointer"
              title="Statistics"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
              </svg>
            </button>
            <button className="p-2 hover:text-cyan-400 transition" title="Leaderboard">
              <span className="text-xs">🏆</span>
            </button>
            <button className="p-2 hover:text-cyan-400 transition" title="Settings">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </button>
          </div>
        </aside>

        {/* ── MAIN WORKSPACE CONTENT AREA ── */}
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#030814]">
          {selectedChallenge ? (
            <>
              {/* ── TOP SECTION: Node Header + Constraints (3D Cube deleted as requested) ── */}
              <div className="border-b border-slate-800/80 p-5 lg:p-6 bg-[#06101e]/60 shrink-0">
                <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6">
                  
                  {/* Left: Current Node Title & Description */}
                  <div className="flex-1 max-w-xl">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-mono font-bold text-cyan-400 uppercase tracking-wider">
                        CURRENT NODE —
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-2xl lg:text-3xl font-black text-white font-mono tracking-tight">
                        Challenge{" "}
                        {String(
                          selectedChallenge.challengeNumber || currentChallengeIndex + 1,
                        ).padStart(2, "0")}
                      </h1>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-950 text-cyan-300 border border-cyan-800/70">
                        NODE #{String(selectedChallenge.challengeNumber || currentChallengeIndex + 1).padStart(2, "0")}
                      </span>
                      {isCurrentChallengeSolved && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-950 text-cyan-400 border border-cyan-700/60 shadow-sm">
                          ✓ OUTPUT VERIFIED
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed font-sans">
                      You are interacting with a black box function. Your goal is to understand the pattern and backtrack to discover hidden logic.
                    </p>

                    {/* Navigation Buttons (HackerRank & Next Challenge) */}
                    <div className="flex items-center gap-3 mt-3">
                      {selectedChallenge.hackerRankUrl && (
                        <a
                          href={selectedChallenge.hackerRankUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-1.5 bg-[#091a32] hover:bg-[#0e274c] text-cyan-300 border border-cyan-700/50 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5"
                        >
                          <span>HackerRank</span>
                          <span>↗</span>
                        </a>
                      )}
                      {hasNextChallenge && isCurrentChallengeSolved && (
                        <button
                          onClick={handleGoToNextChallenge}
                          className="px-5 py-2 bg-gradient-to-r from-[#0066ff] to-[#00c2ff] hover:from-[#0055ee] hover:to-[#00b0ee] text-white text-xs font-mono font-bold rounded-xl transition-all duration-300 flex items-center gap-2 shadow-[0_0_20px_rgba(0,140,255,0.4)] cursor-pointer"
                        >
                          <span>Next Challenge</span>
                          <span>➔</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Center/Right: Constraints & Hint Cards */}
                  <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full">
                    {/* Constraints Card */}
                    <div className="flex-1 bg-[#071324]/80 border border-slate-800/90 rounded-2xl p-4 space-y-1.5 shadow-lg">
                      <div className="flex items-center gap-1.5 text-cyan-400 text-xs font-mono font-bold uppercase">
                        <span>&lt;/&gt;</span>
                        <span>INPUT CONSTRAINTS</span>
                      </div>
                      <p className="text-xs text-slate-300 font-mono">
                        {selectedChallenge.inputConstraints || selectedChallenge.constraints || "1 ≤ input.length ≤ 1000"}
                      </p>
                    </div>

                    {/* Hint Card */}
                    <div className="flex-1 bg-[#071324]/80 border border-slate-800/90 rounded-2xl p-4 space-y-1.5 shadow-lg">
                      <div className="flex items-center gap-1.5 text-cyan-400 text-xs font-mono font-bold uppercase">
                        <span>💡</span>
                        <span>HINT</span>
                      </div>
                      <p className="text-xs text-slate-400 font-sans leading-relaxed">
                        {selectedChallenge.hint || "No hint provided for this challenge. Every black box hides a pattern."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── WORKSPACE BODY: Fixed Input Tester Sidebar + Independently Scrollable History ── */}
              <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
                
                {/* ── INPUT TESTER SIDEBAR (Fixed Size, Non-Growing, Pinned Run Button) ── */}
                <div className="w-full md:w-80 xl:w-96 bg-[#040d1a]/95 border-r border-slate-800/80 flex flex-col shrink-0 h-full overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-slate-800/70 flex items-center justify-between bg-[#061224]/80 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-cyan-400 text-xs">⌨️</span>
                      <h3 className="text-xs font-mono font-bold text-slate-200 tracking-wider uppercase">
                        INPUT TESTER
                      </h3>
                    </div>
                    <button
                      onClick={() => {
                        setUserInput("");
                        setInputError(null);
                      }}
                      className="text-[11px] text-slate-400 hover:text-cyan-400 font-mono transition cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>

                  {/* Input Validation Error */}
                  {inputError && (
                    <div className="px-4 py-2 bg-red-950/60 border-b border-red-800 text-red-300 text-xs font-mono flex items-center gap-2 shrink-0">
                      <span>⚠️</span>
                      <span>{inputError}</span>
                    </div>
                  )}

                  {/* Textarea */}
                  <div className="flex-1 p-4 flex flex-col min-h-0">
                    <textarea
                      value={userInput}
                      onChange={(e) => {
                        setUserInput(e.target.value);
                        if (inputError) setInputError(null);
                      }}
                      placeholder="Type your input here (e.g. 5, hello, [1, 2, 3])..."
                      className="flex-1 w-full bg-[#030914] border border-slate-800/90 rounded-xl p-4 text-xs sm:text-sm font-mono text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/30 transition resize-none leading-relaxed min-h-0"
                      spellCheck="false"
                    />

                    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 font-mono shrink-0">
                      <span>{userInput.length} / 10,000 chars</span>
                    </div>
                  </div>

                  {/* RUN Button in Input Sidebar (Always Pinned at Bottom) */}
                  <div className="p-4 border-t border-slate-800/70 bg-[#061224]/80 shrink-0">
                    <button
                      onClick={handleExecute}
                      disabled={isExecuting || eventEnded}
                      className="w-full py-3 bg-gradient-to-r from-[#0066ff] to-[#00c2ff] hover:from-[#0055ee] hover:to-[#00b0ee] text-white font-mono font-bold text-xs sm:text-sm tracking-widest uppercase rounded-xl transition-all duration-300 shadow-[0_0_25px_rgba(0,140,255,0.45)] hover:shadow-[0_0_30px_rgba(0,180,255,0.6)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                    >
                      {isExecuting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>EVALUATING...</span>
                        </>
                      ) : (
                        <>
                          <span>▶</span>
                          <span>RUN</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* ── EXECUTION HISTORY (Independently Scrollable Container) ── */}
                <div className="flex-1 flex flex-col min-w-0 bg-[#030814] h-full overflow-hidden">
                  
                  {/* History Header */}
                  <div className="px-6 py-3.5 border-b border-slate-800/70 bg-[#061224]/60 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-cyan-400 text-sm">⏱️</span>
                      <h3 className="text-xs font-mono font-bold text-white tracking-widest uppercase">
                        EXECUTION HISTORY
                      </h3>
                    </div>
                    {executionHistory.length > 0 && (
                      <button
                        onClick={() => setExecutionHistory([])}
                        className="px-3.5 py-1.5 bg-[#091a32] hover:bg-red-950/40 text-slate-400 hover:text-red-400 border border-slate-700/60 rounded-xl text-xs font-mono transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>🗑</span>
                        <span>Clear All</span>
                      </button>
                    )}
                  </div>

                  {/* History Timeline Cards List (Only this section scrolls) */}
                  <div className="flex-1 overflow-y-auto min-h-0 p-6 space-y-4 relative">
                    {/* Connecting Timeline Line */}
                    {executionHistory.length > 0 && (
                      <div className="absolute left-[38px] top-8 bottom-8 w-0.5 bg-gradient-to-b from-cyan-500 via-blue-600 to-transparent opacity-40 pointer-events-none"></div>
                    )}

                    {executionHistory.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                        <div className="w-16 h-16 rounded-2xl bg-[#061224] border border-cyan-500/20 flex items-center justify-center text-2xl text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.1)]">
                          ⚡
                        </div>
                        <h4 className="text-sm font-bold text-slate-200 font-mono">No executions yet</h4>
                        <p className="text-xs text-slate-400 font-sans max-w-sm">
                          Enter your test input in the left panel and click <span className="text-cyan-400 font-mono font-bold">RUN</span> to observe the black box output history.
                        </p>
                      </div>
                    ) : (
                      executionHistory.map((entry, idx) => {
                        const attemptNum = String(executionHistory.length - idx).padStart(2, "0");
                        const isCopied = copiedIndex === idx;

                        return (
                          <div key={entry.id || idx} className="flex items-start gap-4 relative z-10">
                            {/* Glowing Timeline Node Dot */}
                            <div className="w-4 h-4 rounded-full bg-[#030914] border-2 border-cyan-400 flex items-center justify-center shrink-0 mt-4 shadow-[0_0_10px_rgba(6,182,212,0.8)]">
                              <div className="w-1.5 h-1.5 rounded-full bg-cyan-300"></div>
                            </div>

                            {/* Execution Card */}
                            <div
                              className="flex-1 bg-gradient-to-r from-[#07172d]/90 via-[#0a1e3b]/80 to-[#07172d]/70 border border-cyan-900/60 hover:border-cyan-500/50 rounded-2xl p-4 shadow-xl transition-all duration-200 space-y-2.5 relative overflow-hidden group"
                              style={{ boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(56, 189, 248, 0.08)' }}
                            >
                              {/* Top Bar: Attempt #, Timestamp, Copy Icon */}
                              <div className="flex items-center justify-between text-xs font-mono">
                                <span className="text-cyan-300 font-bold text-sm">
                                  #{attemptNum}
                                </span>
                                <div className="flex items-center gap-3">
                                  <span className="text-slate-400 text-[11px]">
                                    {formatAttemptDate(entry.createdAt) || "Just now"}
                                  </span>
                                  {entry.executionTimeMs !== undefined && (
                                    <span className="text-slate-400 text-[11px]">
                                      ⏱ {entry.executionTimeMs}ms
                                    </span>
                                  )}
                                  <button
                                    onClick={() => copyToClipboard(entry.output || entry.input, idx)}
                                    className="p-1.5 text-slate-400 hover:text-cyan-300 bg-[#051121] hover:bg-[#091b35] rounded-lg border border-slate-700/60 transition cursor-pointer"
                                    title="Copy output"
                                  >
                                    {isCopied ? (
                                      <span className="text-cyan-400 text-[10px]">✓</span>
                                    ) : (
                                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                      </svg>
                                    )}
                                  </button>
                                </div>
                              </div>

                              {/* Input Row with INP Badge */}
                              <div className="flex items-start gap-3 bg-[#030a14]/80 p-2.5 rounded-xl border border-slate-800/70 font-mono text-xs">
                                <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 font-bold text-[10px] border border-blue-800/60 shrink-0">
                                  INP
                                </span>
                                <span className="text-slate-200 whitespace-pre-wrap break-all">
                                  {entry.input}
                                </span>
                              </div>

                              {/* Output Row with OUT Badge */}
                              <div className="flex items-start gap-3 bg-[#030a14]/80 p-2.5 rounded-xl border border-slate-800/70 font-mono text-xs">
                                <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 font-bold text-[10px] border border-cyan-800/60 shrink-0">
                                  OUT
                                </span>
                                <span className={`whitespace-pre-wrap break-all ${
                                  entry.success && entry.output
                                    ? "text-cyan-200 font-semibold"
                                    : "text-red-300"
                                }`}>
                                  {entry.output || (entry.error ? `${entry.error.code}: ${entry.error.message}` : "No output returned")}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center space-y-3">
                <div className="text-4xl">🎯</div>
                <h2 className="text-lg font-bold text-slate-300 font-mono">
                  Select a Challenge Node
                </h2>
                <p className="text-xs text-slate-400 font-sans max-w-sm">
                  Choose a challenge node from the sidebar to view its constraints and interact with the black box.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ChallengePage;
