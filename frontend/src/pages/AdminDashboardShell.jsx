import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';
import { useAuth } from '../context/AuthContext';
import { getDashboardStats } from '../services/adminMonitoringService';

const AdminDashboardShell = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await getDashboardStats();
        if (res.success) {
          setStats(res.data);
        }
      } catch (err) {
        console.error('Failed to load stats', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <AdminLayout title="Dashboard Overview">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Admin Console</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Welcome back, {user?.name || 'Administrator'}. Manage platform configuration and monitor activity.
            </p>
          </div>
          <button onClick={() => window.location.reload()} className="px-3 py-1 bg-slate-800 text-xs rounded text-slate-300 hover:bg-slate-700">Refresh Data</button>
        </div>

        {/* Real Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-xl flex flex-col justify-between">
            <span className="text-xs font-mono text-slate-500">Participants</span>
            <span className="text-2xl font-bold text-slate-100">{loading ? '...' : stats?.participants?.total || 0}</span>
            <span className="text-[10px] text-emerald-400">{loading ? '' : `${stats?.participants?.active || 0} active`}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-xl flex flex-col justify-between">
            <span className="text-xs font-mono text-slate-500">Events (Live)</span>
            <span className="text-2xl font-bold text-slate-100">{loading ? '...' : stats?.events?.live || 0}</span>
            <span className="text-[10px] text-indigo-400">{loading ? '' : `${stats?.events?.total || (stats?.events?.upcoming + stats?.events?.live + stats?.events?.completed) || 0} total events`}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-xl flex flex-col justify-between">
            <span className="text-xs font-mono text-slate-500">Challenges</span>
            <span className="text-2xl font-bold text-slate-100">{loading ? '...' : stats?.challenges?.total || 0}</span>
            <span className="text-[10px] text-emerald-400">{loading ? '' : `${stats?.challenges?.enabled || 0} enabled`}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-xl flex flex-col justify-between">
            <span className="text-xs font-mono text-slate-500">Total Attempts</span>
            <span className="text-2xl font-bold text-slate-100">{loading ? '...' : stats?.attempts?.total || 0}</span>
            <span className="text-[10px] text-amber-400">Recorded executions</span>
          </div>
        </div>

        {/* Quick Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            to="/admin/events"
            className="p-6 bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-xl shadow-xl transition group block"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-indigo-950/80 border border-indigo-800/60 flex items-center justify-center text-2xl text-indigo-400">
                🏆
              </div>
              <span className="text-xs font-mono text-indigo-400 group-hover:translate-x-1 transition">
                Manage &rarr;
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-100 mb-1">Events</h3>
            <p className="text-xs text-slate-400">
              Schedule competitions, set start/end times, and control live event status.
            </p>
          </Link>

          <Link
            to="/admin/participants"
            className="p-6 bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-xl shadow-xl transition group block"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-2xl text-emerald-400">
                👥
              </div>
              <span className="text-xs font-mono text-emerald-400 group-hover:translate-x-1 transition">
                Manage &rarr;
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-100 mb-1">Participants</h3>
            <p className="text-xs text-slate-400">
              Add new participants, edit details, enable/disable access, and manage the student registry.
            </p>
          </Link>

          <Link
            to="/admin/results"
            className="p-6 bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-xl shadow-xl transition group block"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-2xl text-cyan-400">
                📈
              </div>
              <span className="text-xs font-mono text-cyan-400 group-hover:translate-x-1 transition">
                View &rarr;
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-100 mb-1">Results &amp; Statistics</h3>
            <p className="text-xs text-slate-400">
              View operational statistics, participant results, and leaderboards. Export CSV data.
            </p>
          </Link>
        </div>

        {/* Profile Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-slate-300 border-b border-slate-800 pb-2">
            Active Administrator Session
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-500 block mb-1">Name:</span>
              <span className="text-slate-200 font-bold">{user?.name}</span>
            </div>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-500 block mb-1">Email:</span>
              <span className="text-slate-200 font-bold">{user?.email}</span>
            </div>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-500 block mb-1">Role:</span>
              <span className="text-emerald-400 font-bold">{user?.role}</span>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboardShell;
