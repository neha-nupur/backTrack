import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  getParticipantChallenges,
  executeChallenge,
} from "../../services/challengeService";
import { getLiveEvents } from "../../services/eventService";
import { getAttempts } from "../../services/resultService";

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

/**
 * Participant backTrack Challenge Workspace
 *
 * Displays challenges for a LIVE event and provides a terminal-style
 * execution interface with input/output panels, validation, and challenge progression.
 */
const ChallengePage = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { participantUser, user } = useAuth();
  const currentUser = participantUser || user;

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

    const syncTimer = () =>
      setTimeRemainingMs(getTimeRemainingMs(eventEndTime));
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

  // Check if output is a qualified non-fallback result
  // NOTE: This platform is an intentional "black box" executor — it has no
  // expected-output/test-case data to compare against, so it can never know
  // whether an output is *correct*. It can only know whether the hidden code
  // actually ran and returned a real result. Values like `[]`, `false`,
  // `null`, or `NaN` are legitimate, correct outputs for plenty of
  // algorithms (a backtracking search with no valid solutions correctly
  // returns `[]`; a predicate correctly returns `false`). Treating them as
  // automatic failures was rejecting correct runs. The backend's success
  // flag already reflects whether the run genuinely produced output — trust
  // it here instead of re-guessing based on the output's value.
  const isQualifiedOutput = (output) => {
    return (
      output !== null && output !== undefined && String(output).trim() !== ""
    );
  };

  // Fetch attempts for selected challenge
  const fetchAttemptHistory = useCallback(
    async (challengeId) => {
      try {
        const res = await getAttempts(eventId, { challengeId, limit: 20 });
        if (res.success && res.data) {
          const attempts = res.data.attempts || [];
          setExecutionHistory(attempts);

          // Check if ANY attempt was legitimately successful and produced a qualified solution output
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

  // Index of current challenge
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

  // Handle challenge selection
  const handleSelectChallenge = (challenge) => {
    setSelectedChallenge(challenge);
    setUserInput("");
    setInputError(null);
    setExecutionResult(null);
  };

  // Handle navigating to next challenge
  const handleGoToNextChallenge = () => {
    if (nextChallenge) {
      handleSelectChallenge(nextChallenge);
    }
  };

  // Handle code execution
  const handleExecute = async () => {
    if (!selectedChallenge || isExecuting) return;

    // Strict input validation: must not be empty or whitespace only
    if (!userInput || !userInput.trim()) {
      setInputError("Please enter a valid input to test the black box.");
      return;
    }

    setInputError(null);
    setIsExecuting(true);
    setExecutionResult(null);

    try {
      const res = await executeChallenge(
        eventId,
        selectedChallenge.id,
        userInput.trim(),
      );

      if (res.success && res.data?.execution) {
        const exec = res.data.execution;
        const attempt = res.data.attempt;
        setExecutionResult({ ...exec, attempt });

        if (attempt) {
          setExecutionHistory((prev) => [attempt, ...prev.slice(0, 19)]);
        }

        // Check if execution yielded valid non-fallback solution output without errors
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
      setExecutionResult({
        success: false,
        output: null,
        error: {
          code: err.errorCode || "EXECUTION_ERROR",
          message:
            err.message ||
            "Execution request failed. Please check your input format.",
        },
      });
      unmarkChallengeSolved(selectedChallenge.id);
    } finally {
      setIsExecuting(false);
    }
  };

  // Handle keyboard shortcut (Ctrl+Enter to execute)
  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleExecute();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-mono flex flex-col">
      {/* Top Navigation Bar */}
      <nav className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-50 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/participant/dashboard")}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition flex items-center gap-1.5"
          >
            <span>←</span>
            <span>Back to Console</span>
          </button>
          <div className="hidden md:flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs text-emerald-400 font-bold tracking-wider">
              [ backTrack EXECUTOR ]
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-400 font-sans">
          <div className="hidden sm:flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-full border border-slate-800 font-mono text-[11px]">
            <span className="text-slate-500 uppercase tracking-wider">
              Contest ends
            </span>
            <span
              className={`font-bold ${timeRemainingMs > 0 ? "text-emerald-400" : "text-red-400"}`}
            >
              {timeRemainingMs > 0
                ? formatCountdown(timeRemainingMs)
                : "00:00:00"}
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-slate-950 px-3 py-1 rounded-full border border-slate-800 font-mono text-[11px]">
            <span className="text-emerald-400 font-bold">
              {solvedChallengeIds.size}
            </span>
            <span className="text-slate-600">/</span>
            <span className="text-slate-400">{challenges.length} Solved</span>
          </div>
          <div>
            <span className="text-slate-500">Participant:</span>{" "}
            <span className="text-slate-200 font-mono font-bold">
              {currentUser?.name || "Participant"}
            </span>
          </div>
        </div>
      </nav>

      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* LEFT PANEL — Challenge List with Progress */}
        <aside className="w-full lg:w-72 xl:w-80 bg-slate-900/80 border-r border-slate-800 flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-slate-200 tracking-wide flex items-center gap-2">
                <span>📋</span>
                <span>CHALLENGES</span>
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/60 font-bold">
                {solvedChallengeIds.size} / {challenges.length}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
              <div
                className="bg-emerald-500 h-full transition-all duration-500"
                style={{
                  width: `${challenges.length > 0 ? (solvedChallengeIds.size / challenges.length) * 100 : 0}%`,
                }}
              ></div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-xs text-slate-400">Loading challenges...</p>
              </div>
            ) : fetchError ? (
              <div className="p-4">
                <div className="p-3 bg-red-950/60 border border-red-800 rounded-lg text-red-300 text-xs">
                  <p>{fetchError}</p>
                  <button
                    onClick={fetchChallenges}
                    className="mt-2 px-3 py-1 bg-red-900 hover:bg-red-800 text-white text-xs rounded"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : challenges.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs">
                <p>No challenges available for this event.</p>
              </div>
            ) : (
              challenges.map((ch, idx) => {
                const challengeNum = ch.challengeNumber || idx + 1;
                const isSelected = selectedChallenge?.id === ch.id;
                const isSolved = solvedChallengeIds.has(ch.id);

                return (
                  <button
                    key={ch.id}
                    onClick={() => handleSelectChallenge(ch)}
                    className={`w-full text-left p-4 hover:bg-slate-800/60 transition group ${
                      isSelected
                        ? "bg-slate-800 border-l-2 border-emerald-500"
                        : "border-l-2 border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs font-bold w-6 h-6 rounded flex items-center justify-center shrink-0 ${
                          isSolved
                            ? "bg-emerald-500 text-slate-950 font-bold"
                            : isSelected
                              ? "bg-emerald-600/30 text-emerald-400 border border-emerald-500/50"
                              : "bg-slate-800 text-slate-400 group-hover:bg-slate-700"
                        }`}
                      >
                        {isSolved ? "✓" : challengeNum}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3
                            className={`text-sm font-semibold truncate ${
                              isSelected ? "text-emerald-400" : "text-slate-200"
                            }`}
                          >
                            Challenge {String(challengeNum).padStart(2, "0")}
                          </h3>
                          {isSolved && (
                            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                              PASSED
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* MAIN CONTENT — Challenge Details (Constraints/Hint) + Execution */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {selectedChallenge ? (
            <>
              {/* Header Bar with Challenge Title, HackerRank Link & Next Button */}
              <div className="border-b border-slate-800 p-4 lg:p-6 bg-slate-900/40 shrink-0">
                <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-emerald-400 font-bold">
                        [ CURRENT CHALLENGE ]
                      </span>
                      {isCurrentChallengeSolved && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
                          ✓ OUTPUT VERIFIED
                        </span>
                      )}
                    </div>
                    <h1 className="text-xl md:text-2xl font-bold text-white mt-0.5">
                      Challenge{" "}
                      {String(
                        selectedChallenge.challengeNumber ||
                          currentChallengeIndex + 1,
                      ).padStart(2, "0")}
                    </h1>
                  </div>

                  <div className="flex items-center gap-3">
                    {selectedChallenge.hackerRankUrl && (
                      <a
                        href={selectedChallenge.hackerRankUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                      >
                        <span>HackerRank</span>
                        <span>↗</span>
                      </a>
                    )}

                    {/* Dynamic NEXT CHALLENGE Button */}
                    {hasNextChallenge ? (
                      <button
                        onClick={handleGoToNextChallenge}
                        disabled={!isCurrentChallengeSolved}
                        title={
                          isCurrentChallengeSolved
                            ? `Go to Challenge ${String(currentChallengeIndex + 2).padStart(2, "0")}`
                            : "Provide input and generate output to unlock next challenge"
                        }
                        className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-2 shadow-lg ${
                          isCurrentChallengeSolved
                            ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40 cursor-pointer animate-pulse"
                            : "bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed opacity-60"
                        }`}
                      >
                        {isCurrentChallengeSolved ? (
                          <>
                            <span>
                              Next Challenge (
                              {String(currentChallengeIndex + 2).padStart(
                                2,
                                "0",
                              )}
                              )
                            </span>
                            <span>➔</span>
                          </>
                        ) : (
                          <>
                            <span>🔒</span>
                            <span>Next Challenge</span>
                          </>
                        )}
                      </button>
                    ) : (
                      isCurrentChallengeSolved && (
                        <div className="px-3 py-1.5 bg-emerald-950 border border-emerald-800 text-emerald-400 text-xs font-bold rounded-lg flex items-center gap-1.5">
                          <span>🎉</span>
                          <span>All Challenges Completed!</span>
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* Constraints & Hint Accordion */}
                <div className="max-w-5xl mx-auto mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Input Constraints */}
                  {selectedChallenge.inputConstraints ||
                  selectedChallenge.constraints ? (
                    <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
                      <h4 className="text-xs font-bold text-slate-400 tracking-wide uppercase flex items-center gap-1.5">
                        <span>📏</span>
                        <span>INPUT CONSTRAINTS</span>
                      </h4>
                      <p className="text-xs text-slate-300 font-mono whitespace-pre-wrap">
                        {selectedChallenge.inputConstraints ||
                          selectedChallenge.constraints}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/60 text-xs text-slate-500 italic">
                      No special constraints specified.
                    </div>
                  )}

                  {/* Hint */}
                  {selectedChallenge.hint ? (
                    <div className="bg-slate-950 p-3.5 rounded-xl border border-indigo-900/50 shadow-sm space-y-1">
                      <h4 className="text-xs font-bold text-indigo-400 tracking-wide uppercase flex items-center gap-1.5">
                        <span>💡</span>
                        <span>HINT</span>
                      </h4>
                      <p className="text-xs text-slate-200 font-sans leading-relaxed whitespace-pre-wrap">
                        {selectedChallenge.hint}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/60 text-xs text-slate-500 italic">
                      No hint provided for this challenge.
                    </div>
                  )}
                </div>
              </div>

              {/* Execution Workspace: Input Panel & Output Panel */}
              <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
                {/* Input Panel */}
                <div className="flex-1 flex flex-col border-r border-slate-800 min-w-0 bg-slate-950">
                  <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
                    <h3 className="text-xs font-bold text-slate-400 tracking-wide flex items-center gap-1.5">
                      <span>⌨️</span>
                      <span>INPUT STRING</span>
                    </h3>
                    <button
                      onClick={() => {
                        setUserInput("");
                        setInputError(null);
                      }}
                      className="text-[10px] text-slate-500 hover:text-slate-300 transition"
                    >
                      Clear
                    </button>
                  </div>

                  {inputError && (
                    <div className="px-4 py-2 bg-rose-950/80 border-b border-rose-800 text-rose-300 text-xs flex items-center gap-2 animate-fadeIn">
                      <span>⚠️</span>
                      <span>{inputError}</span>
                    </div>
                  )}

                  <textarea
                    value={userInput}
                    onChange={(e) => {
                      setUserInput(e.target.value);
                      if (inputError) setInputError(null);
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter input here to observe the black box output (e.g. 5, hello, [1, 2, 3])..."
                    className="flex-1 w-full bg-slate-950 text-slate-200 p-4 text-sm font-mono resize-none outline-none placeholder:text-slate-700 focus:ring-1 focus:ring-emerald-500/30"
                    spellCheck="false"
                  />

                  <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-t border-slate-800">
                    <span className="text-[10px] text-slate-500">
                      {userInput.length} / 10,000 chars
                      <span className="hidden sm:inline ml-2 text-slate-600">
                        • Ctrl+Enter to execute
                      </span>
                    </span>
                    <button
                      onClick={handleExecute}
                      disabled={isExecuting}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-lg shadow-emerald-900/40 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                    >
                      {isExecuting ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Executing...</span>
                        </>
                      ) : (
                        <>
                          <span>▶</span>
                          <span>Run Challenge</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Output Panel */}
                <div className="flex-1 flex flex-col min-w-0 bg-slate-950">
                  <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
                    <h3 className="text-xs font-bold text-slate-400 tracking-wide flex items-center gap-1.5">
                      <span>📤</span>
                      <span>OUTPUT</span>
                      {executionResult && (
                        <span
                          className={`ml-2 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                            executionResult.success &&
                            executionResult.output &&
                            executionResult.output.trim().length > 0
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                              : "bg-red-950 text-red-400 border border-red-800"
                          }`}
                        >
                          {executionResult.success &&
                          executionResult.output &&
                          executionResult.output.trim().length > 0
                            ? "✓ SUCCESS"
                            : "✗ FAILED"}
                        </span>
                      )}
                    </h3>
                    {executionResult?.executionTimeMs !== undefined && (
                      <span className="text-[10px] text-slate-500 font-mono">
                        ⏱ {executionResult.executionTimeMs}ms
                      </span>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 bg-slate-950">
                    {isExecuting ? (
                      <div className="flex items-center gap-3 text-sm text-slate-400 py-8 justify-center">
                        <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                        <span>Evaluating logic in isolated sandbox...</span>
                      </div>
                    ) : executionResult ? (
                      <div className="space-y-4">
                        {/* Output */}
                        {executionResult.output !== null &&
                        executionResult.output !== "" ? (
                          <div>
                            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">
                              Received Output:
                            </div>
                            <pre className="text-sm text-emerald-300 whitespace-pre-wrap break-words font-mono leading-relaxed bg-slate-900/80 p-4 rounded-lg border border-slate-800">
                              {executionResult.output}
                            </pre>
                          </div>
                        ) : null}

                        {/* Error */}
                        {executionResult.error && (
                          <div className="p-3.5 bg-red-950/60 border border-red-800 rounded-lg text-xs space-y-1.5">
                            <div className="flex items-center gap-2 text-red-400 font-bold">
                              <span>⚠️</span>
                              <span>{executionResult.error.code}</span>
                            </div>
                            <p className="text-red-300 font-sans">
                              {executionResult.error.message}
                            </p>
                          </div>
                        )}

                        {/* Success with no output */}
                        {executionResult.success &&
                          (!executionResult.output ||
                            executionResult.output === "") &&
                          !executionResult.error && (
                            <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-lg text-amber-300 text-xs">
                              <p>
                                ⚠️ Execution completed, but the hidden logic
                                returned no output for this input.
                              </p>
                              <p className="text-[11px] text-amber-400/80 mt-1">
                                Try entering a different input format.
                              </p>
                            </div>
                          )}

                        {/* Next Challenge Prompt when Solved */}
                        {isCurrentChallengeSolved && hasNextChallenge && (
                          <div className="p-3.5 bg-emerald-950/40 border border-emerald-800/60 rounded-lg flex items-center justify-between animate-fadeIn">
                            <div className="text-xs text-emerald-300">
                              <span className="font-bold">
                                Challenge {currentChallengeIndex + 1} passed!
                              </span>
                              <p className="text-[11px] text-emerald-400/80">
                                You can now proceed to the next challenge.
                              </p>
                            </div>
                            <button
                              onClick={handleGoToNextChallenge}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-md transition flex items-center gap-1.5 shadow"
                            >
                              <span>Next</span>
                              <span>➔</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-slate-600 italic py-8 text-center space-y-1">
                        <p>Output will appear here after execution.</p>
                        <p className="text-xs text-slate-700">
                          Enter your test input and click Run or press
                          Ctrl+Enter.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-3">
                <div className="text-4xl">🎯</div>
                <h2 className="text-lg font-bold text-slate-300">
                  Select a Challenge
                </h2>
                <p className="text-sm text-slate-500 font-sans max-w-sm">
                  Choose a challenge from the sidebar to view its constraints
                  and begin execution.
                </p>
              </div>
            </div>
          )}
        </main>

        {/* RIGHT PANEL — Execution History */}
        {executionHistory.length > 0 && (
          <aside className="hidden xl:flex flex-col w-72 bg-slate-900/60 border-l border-slate-800 shrink-0">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 tracking-wide flex items-center gap-1.5">
                <span>📜</span>
                <span>ATTEMPTS</span>
              </h3>
              <button
                onClick={() => setExecutionHistory([])}
                className="text-[10px] text-slate-600 hover:text-slate-400 transition"
              >
                Clear
              </button>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
              {executionHistory.map((entry) => (
                <div
                  key={entry.id}
                  className="p-3 hover:bg-slate-800/40 transition"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-[10px] font-bold ${
                        entry.success && entry.output
                          ? "text-emerald-400"
                          : "text-red-400"
                      }`}
                    >
                      {entry.success && entry.output ? "✓ SUCCESS" : "✗ FAILED"}
                    </span>
                    <span className="text-[10px] text-slate-600">
                      {new Date(entry.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  {entry.input && (
                    <p className="text-[10px] text-slate-500 truncate mt-0.5 font-mono">
                      In: {entry.input}
                    </p>
                  )}
                  {entry.output && (
                    <p className="text-[10px] text-slate-300 truncate mt-0.5 font-mono">
                      Out: {entry.output}
                    </p>
                  )}
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-[10px] text-slate-600">
                      ⏱ {entry.executionTimeMs || 0}ms
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};

export default ChallengePage;
