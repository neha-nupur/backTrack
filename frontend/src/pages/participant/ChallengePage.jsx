import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getParticipantChallenges, executeChallenge } from '../../services/challengeService';
import { getAttempts } from '../../services/resultService';

/**
 * Participant backTrack Challenge Workspace
 * 
 * Displays challenges for a LIVE event and provides a terminal-style
 * execution interface with input/output panels.
 * 
 * SRS SANITIZATION & SECURITY:
 * Strictly displays ONLY: Challenge number, Input, Run, Output, Constraints, Hint, HackerRank button.
 * Strictly HIDES: Title, Description, Problem Statement, Score, hiddenCode, Solution, Correct Answer, Solved/Completed status.
 */
const ChallengePage = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Challenge list state
  const [challenges, setChallenges] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Selected challenge state
  const [selectedChallenge, setSelectedChallenge] = useState(null);

  // Execution state
  const [userInput, setUserInput] = useState('');
  const [executionResult, setExecutionResult] = useState(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionHistory, setExecutionHistory] = useState([]);

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
      setFetchError(err.message || 'Failed to load challenges.');
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  // Fetch attempts for selected challenge
  const fetchAttemptHistory = useCallback(async (challengeId) => {
    try {
      const res = await getAttempts(eventId, { challengeId, limit: 20 });
      if (res.success && res.data) {
        setExecutionHistory(res.data.attempts || []);
      }
    } catch (err) {
      console.error('Failed to fetch attempt history:', err);
    }
  }, [eventId]);

  useEffect(() => {
    if (selectedChallenge) {
      fetchAttemptHistory(selectedChallenge.id);
    } else {
      setExecutionHistory([]);
    }
  }, [selectedChallenge, fetchAttemptHistory]);

  // Handle challenge selection
  const handleSelectChallenge = (challenge) => {
    setSelectedChallenge(challenge);
    setUserInput('');
    setExecutionResult(null);
  };

  // Handle code execution
  const handleExecute = async () => {
    if (!selectedChallenge || isExecuting) return;

    setIsExecuting(true);
    setExecutionResult(null);

    try {
      const res = await executeChallenge(eventId, selectedChallenge.id, userInput);
      
      if (res.success && res.data?.execution) {
        const exec = res.data.execution;
        const attempt = res.data.attempt;
        setExecutionResult({ ...exec, attempt });

        if (attempt) {
          setExecutionHistory((prev) => [attempt, ...prev.slice(0, 19)]);
        }
      }
    } catch (err) {
      setExecutionResult({
        success: false,
        output: null,
        error: {
          code: err.errorCode || 'NETWORK_ERROR',
          message: err.message || 'Execution request failed.',
        },
      });
    } finally {
      setIsExecuting(false);
    }
  };

  // Handle keyboard shortcut (Ctrl+Enter to execute)
  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleExecute();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-mono">
      {/* Top Navigation Bar */}
      <nav className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/participant/dashboard')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition flex items-center gap-1.5"
          >
            <span>←</span>
            <span>Back to Console</span>
          </button>
          <div className="hidden md:flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs text-emerald-400 font-bold tracking-wider">[ backTrack EXECUTOR ]</span>
          </div>
        </div>
        <div className="text-xs text-slate-400 font-sans">
          <span className="text-slate-500">Participant:</span>{' '}
          <span className="text-slate-200 font-mono font-bold">{user?.name}</span>
        </div>
      </nav>

      <div className="flex flex-col lg:flex-row h-[calc(100vh-52px)]">
        {/* LEFT PANEL — Challenge List */}
        <aside className="w-full lg:w-72 xl:w-80 bg-slate-900/80 border-r border-slate-800 overflow-y-auto shrink-0">
          <div className="p-4 border-b border-slate-800">
            <h2 className="text-sm font-bold text-slate-200 tracking-wide flex items-center gap-2">
              <span>📋</span>
              <span>CHALLENGES</span>
              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                {challenges.length}
              </span>
            </h2>
          </div>

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
            <div className="divide-y divide-slate-800/60">
              {challenges.map((ch, idx) => {
                const challengeNum = ch.challengeNumber || (idx + 1);
                const isSelected = selectedChallenge?.id === ch.id;

                return (
                  <button
                    key={ch.id}
                    onClick={() => handleSelectChallenge(ch)}
                    className={`w-full text-left p-4 hover:bg-slate-800/60 transition group ${
                      isSelected
                        ? 'bg-slate-800 border-l-2 border-emerald-500'
                        : 'border-l-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-bold w-6 h-6 rounded flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700'
                      }`}>
                        {challengeNum}
                      </span>
                      <div className="flex-1 min-w-0">
                        <h3 className={`text-sm font-semibold truncate ${
                          isSelected ? 'text-emerald-400' : 'text-slate-200'
                        }`}>
                          Challenge {String(challengeNum).padStart(2, '0')}
                        </h3>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        {/* MAIN CONTENT — Challenge Details (Constraints/Hint) + Execution */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {selectedChallenge ? (
            <>
              {/* Constraints & Hint Block */}
              <div className="border-b border-slate-800 p-6 bg-slate-900/40 overflow-y-auto max-h-[40vh] lg:max-h-[35vh]">
                <div className="max-w-4xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h1 className="text-xl font-bold text-white">
                      Challenge {String(selectedChallenge.challengeNumber || 1).padStart(2, '0')}
                    </h1>
                    {selectedChallenge.hackerRankUrl && (
                      <a
                        href={selectedChallenge.hackerRankUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <span>HackerRank</span>
                        <span>↗</span>
                      </a>
                    )}
                  </div>

                  {/* Input Constraints */}
                  {(selectedChallenge.inputConstraints || selectedChallenge.constraints) && (
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                      <h4 className="text-xs font-bold text-slate-400 tracking-wide uppercase flex items-center gap-1.5">
                        <span>📏</span>
                        <span>INPUT CONSTRAINTS</span>
                      </h4>
                      <p className="text-xs text-slate-300 font-mono whitespace-pre-wrap">
                        {selectedChallenge.inputConstraints || selectedChallenge.constraints}
                      </p>
                    </div>
                  )}

                  {/* Hint Block */}
                  {selectedChallenge.hint && (
                    <div className="bg-slate-950 p-4 rounded-xl border border-indigo-900/60 shadow-lg space-y-1">
                      <h4 className="text-xs font-bold text-indigo-400 tracking-wide uppercase flex items-center gap-1.5">
                        <span>💡</span>
                        <span>HINT</span>
                      </h4>
                      <p className="text-xs text-slate-200 font-sans leading-relaxed whitespace-pre-wrap">
                        {selectedChallenge.hint}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Execution Panel */}
              <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                {/* Input Panel */}
                <div className="flex-1 flex flex-col border-r border-slate-800 min-w-0">
                  <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
                    <h3 className="text-xs font-bold text-slate-400 tracking-wide flex items-center gap-1.5">
                      <span>⌨️</span>
                      <span>INPUT</span>
                    </h3>
                    <button
                      onClick={() => setUserInput('')}
                      className="text-[10px] text-slate-500 hover:text-slate-300 transition"
                    >
                      Clear
                    </button>
                  </div>
                  <textarea
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter your input here..."
                    className="flex-1 w-full bg-slate-950 text-slate-200 p-4 text-sm font-mono resize-none outline-none placeholder:text-slate-700 focus:ring-1 focus:ring-emerald-500/30"
                    spellCheck="false"
                  />
                  <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-t border-slate-800">
                    <span className="text-[10px] text-slate-500">
                      {userInput.length} / 10,000 chars
                      <span className="hidden sm:inline ml-2 text-slate-600">• Ctrl+Enter to run</span>
                    </span>
                    <button
                      onClick={handleExecute}
                      disabled={isExecuting}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-emerald-900/40 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isExecuting ? (
                        <>
                          <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                          </svg>
                          <span>Executing...</span>
                        </>
                      ) : (
                        <>
                          <span>▶</span>
                          <span>Run</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Output Panel */}
                <div className="flex-1 flex flex-col min-w-0">
                  <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
                    <h3 className="text-xs font-bold text-slate-400 tracking-wide flex items-center gap-1.5">
                      <span>📤</span>
                      <span>OUTPUT</span>
                      {executionResult && (
                        <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                          executionResult.success
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                            : 'bg-red-950 text-red-400 border border-red-800/60'
                        }`}>
                          {executionResult.success ? 'SUCCESS' : 'ERROR'}
                        </span>
                      )}
                    </h3>
                    {executionResult?.executionTimeMs !== undefined && (
                      <span className="text-[10px] text-slate-500">
                        ⏱ {executionResult.executionTimeMs}ms
                      </span>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto bg-slate-950 p-4">
                    {isExecuting ? (
                      <div className="flex items-center gap-3 text-sm text-slate-400">
                        <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                        <span>Running in sandbox...</span>
                      </div>
                    ) : executionResult ? (
                      <div className="space-y-3">
                        {/* Output */}
                        {executionResult.output !== null && executionResult.output !== '' && (
                          <pre className="text-sm text-slate-200 whitespace-pre-wrap break-words font-mono leading-relaxed">
                            {executionResult.output}
                          </pre>
                        )}

                        {/* Error */}
                        {executionResult.error && (
                          <div className="p-3 bg-red-950/60 border border-red-800 rounded-lg text-xs space-y-1">
                            <div className="flex items-center gap-2 text-red-400 font-bold">
                              <span>⚠️</span>
                              <span>{executionResult.error.code}</span>
                            </div>
                            <p className="text-red-300 font-sans">{executionResult.error.message}</p>
                          </div>
                        )}

                        {/* Success with no output */}
                        {executionResult.success && (!executionResult.output || executionResult.output === '') && !executionResult.error && (
                          <p className="text-sm text-slate-500 italic">Execution completed with no output.</p>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-slate-600 italic">
                        <p>Output will appear here after execution.</p>
                        <p className="mt-1 text-xs text-slate-700">Enter your input and click Run or press Ctrl+Enter.</p>
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
                <h2 className="text-lg font-bold text-slate-300">Select a Challenge</h2>
                <p className="text-sm text-slate-500 font-sans max-w-sm">
                  Choose a challenge from the sidebar to view its constraints and begin execution.
                </p>
              </div>
            </div>
          )}
        </main>

        {/* RIGHT PANEL — Execution History */}
        {executionHistory.length > 0 && (
          <aside className="hidden xl:block w-72 bg-slate-900/60 border-l border-slate-800 overflow-y-auto">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 tracking-wide flex items-center gap-1.5">
                <span>📜</span>
                <span>HISTORY</span>
              </h3>
              <button
                onClick={() => setExecutionHistory([])}
                className="text-[10px] text-slate-600 hover:text-slate-400 transition"
              >
                Clear
              </button>
            </div>
            <div className="divide-y divide-slate-800/60">
              {executionHistory.map((entry) => (
                <div key={entry.id} className="p-3 hover:bg-slate-800/40 transition">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] font-bold ${
                      entry.success ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {entry.success ? '✓ SUCCESS' : '✗ ERROR'}
                    </span>
                    <span className="text-[10px] text-slate-600">
                      {new Date(entry.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  {entry.input && (
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">
                      Input: {entry.input}
                    </p>
                  )}
                  {entry.output && (
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      → {entry.output}
                    </p>
                  )}
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-[10px] text-slate-600">⏱ {entry.executionTimeMs}ms</span>
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
