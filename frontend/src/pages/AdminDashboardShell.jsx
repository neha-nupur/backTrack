import React from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';
import { useAuth } from '../context/AuthContext';

const AdminDashboardShell = () => {
  const { user } = useAuth();

  return (
    <AdminLayout title="Dashboard Overview">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Admin Console</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Welcome back, {user?.name || 'Administrator'}. Manage platform configuration and participant access.
          </p>
        </div>

        {/* Quick Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            to="/admin/settings"
            className="p-6 bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-xl shadow-xl transition group block"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-amber-950/80 border border-amber-800/60 flex items-center justify-center text-2xl text-amber-400">
                🔑
              </div>
              <span className="text-xs font-mono text-amber-400 group-hover:translate-x-1 transition">
                Configure &rarr;
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-100 mb-1">Master Password</h3>
            <p className="text-xs text-slate-400">
              Update the shared event master password used by all participants to access the competition.
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
