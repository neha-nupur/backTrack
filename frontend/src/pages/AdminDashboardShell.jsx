import React from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../layouts/AdminLayout";
import { useAuth } from "../context/AuthContext";

const AdminDashboardShell = () => {
  const { user } = useAuth();

  return (
    <AdminLayout title="Dashboard Overview">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight font-mono">
              backTrack Admin Console
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-sans">
              Welcome back, <span className="text-cyan-300 font-mono font-bold">{user?.name || "Administrator"}</span>. Manage platform configuration and monitor live activity.
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-3.5 py-2 bg-[#091a32] text-xs font-mono font-semibold rounded-xl text-cyan-300 hover:text-white border border-slate-700/60 hover:border-cyan-500/50 transition cursor-pointer"
          >
            🔄 Refresh Data
          </button>
        </div>

        {/* Quick Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            to="/admin/events"
            className="p-6 bg-[#071324]/85 border border-slate-800/90 hover:border-cyan-500/60 rounded-2xl shadow-xl transition-all duration-300 group block relative overflow-hidden"
            style={{ boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(56, 189, 248, 0.08)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-950/80 border border-blue-700/50 flex items-center justify-center text-2xl text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.2)]">
                🏆
              </div>
              <span className="text-xs font-mono text-cyan-400 group-hover:translate-x-1 transition font-bold">
                Manage &rarr;
              </span>
            </div>
            <h3 className="text-base font-bold text-white font-mono mb-1">Events</h3>
            <p className="text-xs text-slate-400 font-sans leading-relaxed">
              Schedule competitions, set start/end times, and control live event status.
            </p>
          </Link>

          <Link
            to="/admin/participants"
            className="p-6 bg-[#071324]/85 border border-slate-800/90 hover:border-cyan-500/60 rounded-2xl shadow-xl transition-all duration-300 group block relative overflow-hidden"
            style={{ boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(56, 189, 248, 0.08)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-950/80 border border-blue-700/50 flex items-center justify-center text-2xl text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.2)]">
                👥
              </div>
              <span className="text-xs font-mono text-cyan-400 group-hover:translate-x-1 transition font-bold">
                Manage &rarr;
              </span>
            </div>
            <h3 className="text-base font-bold text-white font-mono mb-1">
              Participants
            </h3>
            <p className="text-xs text-slate-400 font-sans leading-relaxed">
              Add new participants, edit credentials, enable/disable access, and manage the registry.
            </p>
          </Link>

          <Link
            to="/admin/results"
            className="p-6 bg-[#071324]/85 border border-slate-800/90 hover:border-cyan-500/60 rounded-2xl shadow-xl transition-all duration-300 group block relative overflow-hidden"
            style={{ boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(56, 189, 248, 0.08)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-950/80 border border-blue-700/50 flex items-center justify-center text-2xl text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.2)]">
                📈
              </div>
              <span className="text-xs font-mono text-cyan-400 group-hover:translate-x-1 transition font-bold">
                View &rarr;
              </span>
            </div>
            <h3 className="text-base font-bold text-white font-mono mb-1">
              Results &amp; Statistics
            </h3>
            <p className="text-xs text-slate-400 font-sans leading-relaxed">
              View operational statistics, participant results, and leaderboards. Export CSV data.
            </p>
          </Link>
        </div>

        {/* Profile Session Card */}
        <div className="bg-[#071324]/85 border border-slate-800/90 rounded-2xl p-6 shadow-xl space-y-4"
             style={{ boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(56, 189, 248, 0.08)' }}>
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest font-mono border-b border-slate-800/70 pb-3">
            Active Administrator Session
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
            <div className="bg-[#030914] p-3.5 rounded-xl border border-slate-800/80">
              <span className="text-slate-500 block mb-1 font-sans">Name:</span>
              <span className="text-slate-100 font-bold">{user?.name}</span>
            </div>
            <div className="bg-[#030914] p-3.5 rounded-xl border border-slate-800/80">
              <span className="text-slate-500 block mb-1 font-sans">Email:</span>
              <span className="text-slate-100 font-bold">{user?.email}</span>
            </div>
            <div className="bg-[#030914] p-3.5 rounded-xl border border-slate-800/80">
              <span className="text-slate-500 block mb-1 font-sans">Role:</span>
              <span className="text-cyan-400 font-bold">{user?.role}</span>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboardShell;
