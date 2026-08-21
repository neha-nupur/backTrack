import React, { useState, useEffect } from 'react';

// Helper to format ISO string to datetime-local input format (YYYY-MM-DDTHH:mm)
const toDatetimeLocal = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const EventFormModal = ({
  isOpen,
  mode = 'create', // 'create' | 'edit'
  initialData = null,
  isLoading = false,
  error = null,
  onSubmit,
  onClose,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState('CONTEST');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [status, setStatus] = useState('UPCOMING');
  const [isActive, setIsActive] = useState(true);
  const [password, setPassword] = useState('');
  const [clientError, setClientError] = useState(null);

  useEffect(() => {
    if (initialData && mode === 'edit') {
      setName(initialData.name || '');
      setType(initialData.type || 'CONTEST');
      setDescription(initialData.description || '');
      setStartTime(toDatetimeLocal(initialData.startTime));
      setEndTime(toDatetimeLocal(initialData.endTime));
      setStatus(initialData.status || 'UPCOMING');
      setIsActive(initialData.isActive !== false);
      setPassword('');
    } else {
      // Default to 1 hour from now for 2 hours duration
      const now = new Date();
      const start = new Date(now.getTime() + 60 * 60 * 1000);
      const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);

      setName('');
      setType('CONTEST');
      setDescription('');
      setStartTime(toDatetimeLocal(start.toISOString()));
      setEndTime(toDatetimeLocal(end.toISOString()));
      setStatus('UPCOMING');
      setIsActive(true);
      setPassword('');
    }
    setClientError(null);
  }, [initialData, mode, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setClientError(null);

    if (!name.trim()) {
      setClientError('Event name is required.');
      return;
    }

    if (!startTime) {
      setClientError('Scheduled start time is required.');
      return;
    }

    if (!endTime) {
      setClientError('Scheduled end time is required.');
      return;
    }

    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      setClientError('Please provide valid start and end dates.');
      return;
    }

    if (endDate.getTime() <= startDate.getTime()) {
      setClientError('Scheduled end time must be after the start time.');
      return;
    }

    const payload = {
      name: name.trim(),
      type,
      description: description.trim(),
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      status,
      isActive,
    };

    if (password.trim()) {
      payload.password = password.trim();
    }

    onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-xl w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <span className="text-emerald-400 font-mono">&gt;</span>
            {mode === 'edit' ? 'Edit Event Details' : 'Create New Event'}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-slate-300 mb-1 font-sans text-sm font-semibold">
                Event Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. backTrack Contest Spring 2026"
                disabled={isLoading}
                required
                maxLength={150}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-slate-300 mb-1 font-sans text-sm font-semibold">
                Event Type <span className="text-red-400">*</span>
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                disabled={isLoading}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500 transition disabled:opacity-50"
              >
                <option value="CONTEST">CONTEST Event</option>
                <option value="DEMO">DEMO Event</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 mb-1 font-sans text-sm font-semibold">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a brief description of the event..."
              disabled={isLoading}
              rows={2}
              maxLength={1000}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition disabled:opacity-50 resize-none font-sans text-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 mb-1 font-sans text-sm font-semibold">
                Scheduled Start Time <span className="text-red-400">*</span>
              </label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                disabled={isLoading}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500 transition disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-sans text-sm font-semibold">
                Scheduled End Time <span className="text-red-400">*</span>
              </label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={isLoading}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500 transition disabled:opacity-50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 mb-1 font-sans text-sm font-semibold">
                Lifecycle Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={isLoading}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500 transition disabled:opacity-50"
              >
                <option value="UPCOMING">UPCOMING</option>
                <option value="LIVE">LIVE</option>
                <option value="COMPLETED">COMPLETED</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-300 mb-1 font-sans text-sm font-semibold">
                Activation State
              </label>
              <select
                value={isActive ? 'active' : 'inactive'}
                onChange={(e) => setIsActive(e.target.value === 'active')}
                disabled={isLoading}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500 transition disabled:opacity-50"
              >
                <option value="active">Active (Available to participants)</option>
                <option value="inactive">Inactive (Deactivated)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 mb-1 font-sans text-sm font-semibold">
              Event Password (Optional Protection)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'edit' ? 'Leave blank to keep existing password' : 'Enter common event password (optional)'}
              disabled={isLoading}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition disabled:opacity-50"
            />
            <p className="text-[11px] text-slate-400 font-sans mt-1">
              If set, participants must enter this password to unlock and join the event.
            </p>
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
              {mode === 'edit' ? 'Save Changes' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventFormModal;
