import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../services/apiClient';
import { useAuth } from '../context/AuthContext';

const AdminLoginPage = () => {
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
      setError('Please enter administrator email and password.');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post('/auth/admin/login', {
        email: email.trim(),
        password: password.trim(),
      });

      if (response && response.success && response.data) {
        login(response.data.user, response.data.token);
        navigate('/admin/dashboard');
      } else {
        throw new Error(response.message || 'Admin login failed');
      }
    } catch (err) {
      setError(err.message || 'Invalid administrator credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-8 font-mono">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-950/60 border border-amber-800/80 rounded-full text-xs text-amber-400 mb-3">
          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
          ADMINISTRATOR ACCESS ONLY
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          backTrack System Management
        </h1>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 max-w-md w-full shadow-2xl font-mono">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <span className="text-xs text-amber-400 font-bold">[ ADMIN CONTROL ]</span>
          <span className="text-xs text-slate-500">v1.0.0</span>
        </div>

        {error && (
          <div className="p-3.5 mb-5 bg-rose-950/60 border border-rose-800/80 rounded-lg text-rose-300 text-xs">
            <span className="font-bold">Authentication Failed:</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-semibold">
              Admin Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@college.edu"
              required
              disabled={loading}
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none transition disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-semibold">
              Admin Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              disabled={loading}
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none transition disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold rounded-lg transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
                <span>Authenticating Admin...</span>
              </>
            ) : (
              '[ AUTHENTICATE ADMIN ]'
            )}
          </button>
        </form>

        <div className="mt-8 pt-4 border-t border-slate-800/80 text-center">
          <Link
            to="/login"
            className="text-xs text-slate-500 hover:text-slate-300 transition underline underline-offset-4"
          >
            &larr; Participant Login Portal
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;
