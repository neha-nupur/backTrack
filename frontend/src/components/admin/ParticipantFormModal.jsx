import React, { useState, useEffect } from 'react';

const ParticipantFormModal = ({
  isOpen,
  mode = 'add', // 'add' | 'edit'
  initialData = null,
  isLoading = false,
  error = null,
  onSubmit,
  onClose,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [clientError, setClientError] = useState(null);

  useEffect(() => {
    if (initialData && mode === 'edit') {
      setName(initialData.name || '');
      setEmail(initialData.email || '');
      setStatus(initialData.status || 'ACTIVE');
    } else {
      setName('');
      setEmail('');
      setStatus('ACTIVE');
    }
    setClientError(null);
  }, [initialData, mode, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setClientError(null);

    if (!name.trim()) {
      setClientError('Participant name is required.');
      return;
    }

    if (!email.trim()) {
      setClientError('College email is required.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setClientError('Please enter a valid email address.');
      return;
    }

    onSubmit({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      status,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <span className="text-emerald-400 font-mono">&gt;</span>
            {mode === 'edit' ? 'Edit Participant' : 'Add New Participant'}
          </h3>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-slate-400 hover:text-white transition text-lg"
          >
            ✕
          </button>
        </div>

        {(error || clientError) && (
          <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 text-sm rounded-lg flex items-center gap-2">
            <span className="text-red-400">⚠️</span>
            <span>{error || clientError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 font-mono text-sm">
          <div>
            <label className="block text-slate-300 mb-1 font-sans text-sm font-semibold">
              Participant Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex Rivera"
              disabled={isLoading}
              required
              maxLength={100}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1 font-sans text-sm font-semibold">
              College Email <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. alex@college.edu"
              disabled={isLoading}
              required
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition disabled:opacity-50"
            />
            <p className="text-xs text-slate-400 mt-1 font-sans">
              Participants log in using their email and the shared master password. Individual passwords do not exist.
            </p>
          </div>

          <div>
            <label className="block text-slate-300 mb-1 font-sans text-sm font-semibold">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={isLoading}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500 transition disabled:opacity-50"
            >
              <option value="ACTIVE">ACTIVE (Can Authenticate & Participate)</option>
              <option value="DISABLED">DISABLED (Access Blocked)</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800 font-sans">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/40 transition disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading && (
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
              )}
              {mode === 'edit' ? 'Save Changes' : 'Add Participant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ParticipantFormModal;
