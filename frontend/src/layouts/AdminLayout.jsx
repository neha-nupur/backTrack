import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CyberBackground from '../components/CyberBackground';
import logo from '../assets/logo.png';

const AdminLayout = ({ children, title = 'Administration' }) => {
  const { adminUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout('ADMIN');
    navigate('/admin/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: '📊' },
    { label: 'Events', path: '/admin/events', icon: '🏆' },
    { label: 'Challenges', path: '/admin/events', icon: '💻' },
    { label: 'Attempts', path: '/admin/attempts', icon: '⏱️' },
    { label: 'Results', path: '/admin/results', icon: '📈' },
    { label: 'Participants', path: '/admin/participants', icon: '👥' },
    { label: 'Settings', path: '/admin/settings', icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col md:flex-row relative overflow-x-hidden font-sans selection:bg-cyan-600 selection:text-white">
      {/* Background with Animated Cyber Elements */}
      <CyberBackground />

      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-[#06101e]/90 border-r border-slate-800/80 flex flex-col justify-between shrink-0 relative z-20 backdrop-blur-md">
        <div>
          {/* Brand */}
          <div className="p-5 border-b border-slate-800/70 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-mono font-bold shadow-[0_0_15px_rgba(6,182,212,0.2)] overflow-hidden">
                <img src={logo} alt="Cout Masters Coding Club Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-wider text-slate-100 font-mono">backTrack</h1>
                <p className="text-[10px] uppercase font-mono tracking-widest text-cyan-400">Admin Console</p>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-900/80 to-cyan-900/40 text-cyan-300 border border-cyan-500/60 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#091a32]/60'
                  }`
                }
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* User & Logout */}
        <div className="p-4 border-t border-slate-800/70 bg-[#040c17]/80">
          <div className="flex items-center justify-between mb-3">
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-slate-200 truncate">{adminUser?.name || 'Admin'}</p>
              <p className="text-[10px] text-slate-400 truncate font-mono">{adminUser?.email || 'admin@college.edu'}</p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-cyan-300 border border-cyan-800/60">
              ADMIN
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-[#091a32] text-red-400 hover:bg-red-950/40 hover:text-red-300 border border-slate-700/60 hover:border-red-800/50 text-xs font-mono font-semibold transition cursor-pointer"
          >
            <span>🚪</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#030712] relative z-10">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-800/80 px-6 flex items-center justify-between bg-[#06101e]/60 backdrop-blur shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 font-mono">&gt;</span>
            <h2 className="text-sm font-bold text-slate-100 font-mono uppercase tracking-wider">{title}</h2>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/50 text-cyan-400 text-[10px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
              SECURE TERMINAL
            </span>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-6 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
