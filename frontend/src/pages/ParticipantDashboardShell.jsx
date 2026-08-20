import React from 'react';
import { useAuth } from '../context/AuthContext';

const ParticipantDashboardShell = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 font-mono">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center justify-between border-b border-slate-800 pb-6 mb-8">
          <div>
            <span className="text-xs text-cyan-400 font-bold tracking-wider">[ PARTICIPANT DASHBOARD SHELL ]</span>
            <h1 className="text-2xl font-bold text-white mt-1">BlackBox Challenge Platform</h1>
          </div>
          <button
            onClick={logout}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-800 text-rose-400 text-xs font-bold rounded-lg border border-slate-700 transition cursor-pointer"
          >
            Logout
          </button>
        </header>

        <main className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
            <h2 className="text-sm font-bold text-slate-300 mb-4 border-b border-slate-800 pb-2">
              Participant Profile Session
            </h2>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-950 p-3 rounded border border-slate-800">
                <span className="text-slate-500 block mb-1">Name:</span>
                <span className="text-slate-200 font-bold">{user?.name}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded border border-slate-800">
                <span className="text-slate-500 block mb-1">College Email:</span>
                <span className="text-slate-200 font-bold">{user?.email}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded border border-slate-800">
                <span className="text-slate-500 block mb-1">Status:</span>
                <span className="text-emerald-400 font-bold">{user?.status || 'ACTIVE'}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded border border-slate-800">
                <span className="text-slate-500 block mb-1">Role:</span>
                <span className="text-cyan-400 font-bold">{user?.role}</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-6 text-center text-slate-500 text-xs">
            [Phase 1 Baseline] Participant Event list & CMD blackbox challenge interface will be implemented in Phase 3+.
          </div>
        </main>
      </div>
    </div>
  );
};

export default ParticipantDashboardShell;
