import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../services/apiClient';
import { useAuth } from '../context/AuthContext';
import CyberBackground from '../components/CyberBackground';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError('Please enter both your college email and master password.');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post('/auth/login', {
        email: email.trim(),
        password: password.trim(),
      });

      if (response && response.success && response.data) {
        login(response.data.user, response.data.token);
        navigate('/participant/dashboard');
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (err) {
      setError(err.message || 'Unable to log in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen cinematic-bg text-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-cyan-600 selection:text-white">
      {/* Dynamic Cyber Background with Animated Lines Forming Squares & 01 Streams */}
      <CyberBackground />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-md flex flex-col items-center">
        {/* Brand Header with 3D Wireframe Cube Icon */}
        <div className="text-center mb-6 space-y-1.5 flex flex-col items-center">
          {/* Isometric Cube Logo */}
          <div className="w-14 h-14 rounded-2xl bg-[#071120] border border-cyan-500/25 flex items-center justify-center shadow-[0_0_20px_rgba(14,165,233,0.15)] mb-1.5 relative group">
            <div className="absolute inset-0 bg-cyan-500/5 rounded-2xl animate-pulse"></div>
            <svg
              className="w-8 h-8 text-cyan-400/90 drop-shadow-[0_0_8px_rgba(14,165,233,0.4)]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </div>

          {/* Title and Tagline */}
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-['Geist',sans-serif] glowing-text">
            backTrack
          </h1>
          <p className="text-[11px] text-cyan-400/70 font-mono tracking-widest uppercase flex items-center justify-center gap-2">
            <span>Trace</span>
            <span className="text-slate-600">•</span>
            <span>Reverse</span>
            <span className="text-slate-600">•</span>
            <span>Conquer</span>
          </p>
        </div>

        {/* Outer Square with Animated Running Line Frame */}
        <div className="w-full relative group">
          {/* Running Lines around the Box Perimeter */}
          <div className="absolute -inset-[2px] rounded-2xl overflow-hidden pointer-events-none opacity-60">
            {/* Top Running Line */}
            <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-line-h"></div>
            {/* Bottom Running Line */}
            <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-line-h" style={{ animationDelay: '2s' }}></div>
            {/* Left Running Line */}
            <div className="absolute top-0 bottom-0 left-0 w-[1.5px] bg-gradient-to-b from-transparent via-cyan-400 to-transparent animate-line-v" style={{ animationDelay: '1s' }}></div>
            {/* Right Running Line */}
            <div className="absolute top-0 bottom-0 right-0 w-[1.5px] bg-gradient-to-b from-transparent via-blue-500 to-transparent animate-line-v" style={{ animationDelay: '3s' }}></div>
          </div>

          {/* Cyber Glass Login Card */}
          <div className="w-full cyber-card rounded-2xl p-6 sm:p-7 shadow-2xl relative overflow-hidden">
            {/* HUD Corner Tech Brackets */}
            <div className="absolute top-2 left-2 w-2.5 h-2.5 border-t border-l border-cyan-400/40 pointer-events-none"></div>
            <div className="absolute top-2 right-2 w-2.5 h-2.5 border-t border-r border-cyan-400/40 pointer-events-none"></div>
            <div className="absolute bottom-2 left-2 w-2.5 h-2.5 border-b border-l border-cyan-400/40 pointer-events-none"></div>
            <div className="absolute bottom-2 right-2 w-2.5 h-2.5 border-b border-r border-cyan-400/40 pointer-events-none"></div>

            {/* Card Header */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3.5 mb-5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400/80 animate-pulse"></span>
                <span className="text-xs font-mono font-semibold tracking-wider text-cyan-300/90 uppercase">
                  Participant Access
                </span>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 mb-4 bg-rose-950/40 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-mono flex items-start gap-2 animate-fadeUp">
                <span className="text-rose-400 font-bold">⚠</span>
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-medium text-slate-300 mb-1.5 flex items-center justify-between">
                  <span className="text-cyan-400/90">&gt; College Email Address</span>
                  <span className="text-[10px] text-slate-500">Required</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your institute email id"
                  required
                  disabled={loading}
                  autoComplete="email"
                  className="w-full bg-[#050b16] border border-slate-800 focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 font-mono transition-colors disabled:opacity-50"
                  style={{ backgroundColor: '#050b16', color: '#e2e8f0' }}
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1.5 flex items-center justify-between">
                  <span className="text-cyan-400/90">&gt; Master Password</span>
                  <span className="text-[10px] text-slate-500">Event Key</span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  disabled={loading}
                  autoComplete="current-password"
                  className="w-full bg-[#050b16] border border-slate-800 focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 font-mono transition-colors disabled:opacity-50"
                  style={{ backgroundColor: '#050b16', color: '#e2e8f0' }}
                />
              </div>

              {/* Glowing Deep Blue Action Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-6 rounded-xl bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-600 hover:from-blue-600 hover:to-cyan-500 text-white font-mono font-bold text-xs tracking-wider uppercase transition-all duration-300 cyber-button-glow hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Verifying Node Access...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5 text-cyan-200 fill-current" viewBox="0 0 24 24">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    <span>LOGIN TO EVENT</span>
                  </>
                )}
              </button>
            </form>

            {/* Portal Switcher */}
            <div className="mt-5 pt-3.5 border-t border-slate-800/80 text-center">
              <Link
                to="/admin/login"
                className="text-xs font-mono text-slate-400 hover:text-cyan-300 transition flex items-center justify-center gap-1.5 group"
              >
                <span>Administrator Portal</span>
                <span className="text-cyan-500 group-hover:translate-x-1 transition-transform">→</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Micro Footer Notice */}
        <p className="text-[10px] font-mono text-slate-600 text-center mt-5">
          Controlled Black-Box Evaluation Environment • v1.0.0
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
