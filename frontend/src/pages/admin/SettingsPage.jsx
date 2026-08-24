import React, { useState } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import { updateMasterPassword } from '../../services/settingsService';

const SettingsPage = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!currentPassword) {
      setError('Current master password is required.');
      return;
    }

    if (!newPassword) {
      setError('New master password is required.');
      return;
    }

    if (newPassword.length < 8) {
      setError('New master password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New master password and confirmation do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await updateMasterPassword({ currentPassword, newPassword });
      setSuccessMessage(res.message || 'Master password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message || 'Failed to update master password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AdminLayout title="System Settings">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight font-mono">System Settings</h1>
          <p className="text-xs text-slate-400 mt-1 font-sans">
            Configure system-wide event access credentials and platform parameters.
          </p>
        </div>

        {/* Master Password Card */}
        <div className="bg-[#071324]/85 border border-slate-800/90 rounded-2xl p-6 shadow-xl space-y-6"
             style={{ boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(56, 189, 248, 0.08)' }}>
          <div className="border-b border-slate-800/70 pb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2 font-mono">
              <span className="text-cyan-400">🔑</span>
              <span>EVENT ACCESS PASSWORD</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1 font-sans">
              Participants use this shared master password together with their registered college email to enter the event.
              Updating this password takes effect immediately for all subsequent participant login attempts.
            </p>
          </div>

          {/* Success Banner */}
          {successMessage && (
            <div className="p-4 bg-cyan-950/40 border border-cyan-700/60 rounded-2xl text-cyan-300 text-sm flex items-center justify-between animate-fadeIn shadow-lg">
              <div className="flex items-center gap-2">
                <span>✅</span>
                <span>{successMessage}</span>
              </div>
              <button onClick={() => setSuccessMessage(null)} className="text-cyan-400 hover:text-white cursor-pointer">✕</button>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-4 bg-red-950/40 border border-red-800 rounded-2xl text-red-300 text-sm flex items-center justify-between animate-fadeIn shadow-lg">
              <div className="flex items-center gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-white cursor-pointer">✕</button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5 font-mono text-sm">
            <div>
              <label className="block text-slate-300 mb-1.5 font-sans text-xs font-semibold">
                Current Master Password <span className="text-red-400">*</span>
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current master password..."
                disabled={isLoading}
                required
                className="w-full bg-[#030914] border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition disabled:opacity-50 text-xs sm:text-sm"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 mb-1.5 font-sans text-xs font-semibold">
                  New Master Password <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 characters..."
                  disabled={isLoading}
                  required
                  minLength={8}
                  className="w-full bg-[#030914] border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition disabled:opacity-50 text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1.5 font-sans text-xs font-semibold">
                  Confirm New Password <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password..."
                  disabled={isLoading}
                  required
                  minLength={8}
                  className="w-full bg-[#030914] border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition disabled:opacity-50 text-xs sm:text-sm"
                />
              </div>
            </div>

            <div className="p-3.5 bg-[#030914] border border-slate-800 rounded-xl font-sans text-xs text-slate-400 space-y-1">
              <p className="font-semibold text-slate-300 font-mono">Security Notes:</p>
              <ul className="list-disc list-inside space-y-0.5 text-slate-400">
                <li>Existing participant accounts and records are preserved.</li>
                <li>Active participant sessions remain valid until their JWT expires.</li>
                <li>The master password is saved as a secure bcrypt hash — never in plaintext.</li>
              </ul>
            </div>

            <div className="flex justify-end pt-2 font-sans">
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-700 to-cyan-600 hover:from-blue-600 hover:to-cyan-500 text-white text-xs font-mono font-bold rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.3)] transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {isLoading && (
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                )}
                <span>Update Master Password</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
};

export default SettingsPage;
