import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import AdminLayout from '../../layouts/AdminLayout';
import ChallengeFormModal from '../../components/admin/ChallengeFormModal';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import { adminGetEventById } from '../../services/eventService';
import {
  adminListChallenges,
  adminCreateChallenge,
  adminUpdateChallenge,
  adminUpdateChallengeStatus,
  adminDeleteChallenge,
} from '../../services/challengeService';

const ChallengesPage = () => {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [challenges, setChallenges] = useState([]);
  const [copiedChallengeId, setCopiedChallengeId] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Modal States
  const [modalState, setModalState] = useState({ isOpen: false, mode: 'create', data: null, error: null, isLoading: false });
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, challenge: null, isLoading: false });
  const [statusDialog, setStatusDialog] = useState({ isOpen: false, challenge: null, newStatus: null, isLoading: false });

  // Auto-dismiss success message
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Fetch Event & Challenges
  const fetchChallenges = useCallback(async (page = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Fetch Event Header Details if not already loaded
      if (!event) {
        const evRes = await adminGetEventById(eventId);
        if (evRes.success && evRes.data) {
          setEvent(evRes.data.event);
        }
      }

      // 2. Fetch Challenges
      const params = { page, limit: pagination.limit };
      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;

      const res = await adminListChallenges(eventId, params);
      if (res.success && res.data) {
        setChallenges(res.data.challenges);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      setError(err.message || 'Unable to load event challenges.');
    } finally {
      setIsLoading(false);
    }
  }, [eventId, event, search, statusFilter, pagination.limit]);

  useEffect(() => {
    fetchChallenges(1);
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchChallenges(1);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchChallenges(newPage);
    }
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setModalState({ isOpen: true, mode: 'create', data: null, error: null, isLoading: false });
  };

  // Open Edit Modal
  const handleOpenEditModal = (challenge) => {
    setModalState({ isOpen: true, mode: 'edit', data: challenge, error: null, isLoading: false });
  };

  const handleCopyChallengeId = async (challengeId) => {
    try {
      await navigator.clipboard.writeText(String(challengeId));
      setCopiedChallengeId(challengeId);
      window.setTimeout(() => setCopiedChallengeId(null), 1500);
    } catch (err) {
      setError('Unable to copy the challenge ID.');
    }
  };

  // Submit Modal (Create or Edit)
  const handleModalSubmit = async (formData) => {
    setModalState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      if (modalState.mode === 'create') {
        await adminCreateChallenge(eventId, formData);
        setSuccessMessage(`Challenge "${formData.title}" created successfully.`);
      } else {
        await adminUpdateChallenge(modalState.data.id, formData);
        setSuccessMessage(`Challenge "${formData.title}" updated successfully.`);
      }
      setModalState({ isOpen: false, mode: 'create', data: null, error: null, isLoading: false });
      fetchChallenges(pagination.page);
    } catch (err) {
      setModalState((prev) => ({ ...prev, isLoading: false, error: err.message || 'Operation failed.' }));
    }
  };

  // Trigger Status Toggle
  const handleToggleStatusClick = (challenge) => {
    const newStatus = challenge.status === 'ENABLED' ? 'DISABLED' : 'ENABLED';
    setStatusDialog({ isOpen: true, challenge, newStatus, isLoading: false });
  };

  // Confirm Status Toggle
  const handleConfirmStatusToggle = async () => {
    const { challenge, newStatus } = statusDialog;
    setStatusDialog((prev) => ({ ...prev, isLoading: true }));
    try {
      await adminUpdateChallengeStatus(challenge.id, newStatus);
      setSuccessMessage(`Challenge "${challenge.title}" status changed to ${newStatus}.`);
      setStatusDialog({ isOpen: false, challenge: null, newStatus: null, isLoading: false });
      fetchChallenges(pagination.page);
    } catch (err) {
      setError(err.message || 'Failed to update challenge status.');
      setStatusDialog({ isOpen: false, challenge: null, newStatus: null, isLoading: false });
    }
  };

  // Trigger Delete
  const handleDeleteClick = (challenge) => {
    setDeleteDialog({ isOpen: true, challenge, isLoading: false });
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    const { challenge } = deleteDialog;
    setDeleteDialog((prev) => ({ ...prev, isLoading: true }));
    try {
      await adminDeleteChallenge(challenge.id);
      setSuccessMessage(`Challenge "${challenge.title}" was deleted.`);
      setDeleteDialog({ isOpen: false, challenge: null, isLoading: false });
      fetchChallenges(pagination.page);
    } catch (err) {
      setError(err.message || 'Failed to delete challenge.');
      setDeleteDialog({ isOpen: false, challenge: null, isLoading: false });
    }
  };

  return (
    <AdminLayout title="Challenge Management">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <Link to="/admin/events" className="hover:text-cyan-400 transition">
            &larr; Back to Events
          </Link>
          <span>/</span>
          <span className="text-slate-200 font-bold">{event?.name || 'Event'}</span>
          <span>/</span>
          <span className="text-cyan-400">Challenges</span>
        </div>

        {/* Header Action Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#071324]/85 border border-slate-800/90 rounded-2xl p-6 shadow-xl"
             style={{ boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(56, 189, 248, 0.08)' }}>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white tracking-tight font-mono">
                {event?.name || 'Event Challenges'}
              </h1>
              {event && (
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                    event.status === 'LIVE'
                      ? 'bg-cyan-950 text-cyan-400 border border-cyan-800'
                      : event.status === 'UPCOMING'
                      ? 'bg-blue-950 text-blue-400 border border-blue-800'
                      : 'bg-slate-900 text-slate-400 border border-slate-700'
                  }`}
                >
                  {event.status}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1 font-sans">
              Configure coding problems, input/output formats, scoring, and hidden JavaScript validation algorithms.
            </p>
          </div>
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-700 to-cyan-600 hover:from-blue-600 hover:to-cyan-500 text-white rounded-xl text-xs font-mono font-bold shadow-[0_0_15px_rgba(6,182,212,0.3)] transition shrink-0 cursor-pointer"
          >
            <span className="text-base font-bold">+</span>
            <span>Add Challenge</span>
          </button>
        </div>

        {/* Alerts */}
        {successMessage && (
          <div className="p-4 bg-emerald-950/60 border border-emerald-700/60 rounded-xl text-emerald-300 text-sm flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2">
              <span>✅</span>
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-white">✕</button>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-950/60 border border-red-800 rounded-xl text-red-300 text-sm flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
            <button
              onClick={() => fetchChallenges(pagination.page)}
              className="px-3 py-1 bg-red-900 hover:bg-red-800 text-white text-xs font-semibold rounded"
            >
              Retry
            </button>
          </div>
        )}

        {/* Filter Controls */}
        <div className="bg-[#071324]/85 border border-slate-800/90 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-xl">
          <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2 w-full md:w-auto">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search challenges by title..."
              className="flex-1 bg-[#030914] border border-slate-800 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500/70 transition font-mono"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-[#091a32] hover:bg-[#0e274c] text-cyan-300 border border-slate-700/60 rounded-xl text-xs font-mono font-semibold transition cursor-pointer"
            >
              Search
            </button>
          </form>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <label className="text-xs text-slate-400 font-medium font-mono">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#030914] border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition font-mono"
            >
              <option value="">All Statuses</option>
              <option value="ENABLED">ENABLED only</option>
              <option value="DISABLED">DISABLED only</option>
            </select>
          </div>
        </div>

        {/* Challenges Table */}
        <div className="bg-[#071324]/85 border border-slate-800/90 rounded-2xl overflow-hidden shadow-2xl">
          {isLoading ? (
            <div className="p-12 text-center text-slate-400 space-y-3 font-mono">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-sm">Loading challenges...</p>
            </div>
          ) : challenges.length === 0 ? (
            <div className="p-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-2xl">
                🧩
              </div>
              <h3 className="text-base font-semibold text-slate-200">
                {search || statusFilter ? 'No matching challenges found.' : 'No challenges added to this event yet.'}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {search || statusFilter
                  ? 'Try clearing the search query or status filter.'
                  : 'Get started by creating your first coding challenge for this competition.'}
              </p>
              {!search && !statusFilter && (
                <button
                  onClick={handleOpenCreateModal}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-lg transition"
                >
                  + Add First Challenge
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider font-mono">
                  <tr>
                    <th className="px-6 py-3.5">Challenge ID</th>
                    <th className="px-6 py-3.5">Challenge Title</th>
                    <th className="px-6 py-3.5">Score</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">HackerRank</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {challenges.map((ch) => (
                    <tr key={ch.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-6 py-4 align-top">
                        <div className="flex items-center gap-2">
                          <code className="max-w-40 truncate text-xs text-cyan-300" title={ch.id}>
                            {ch.id}
                          </code>
                          <button
                            type="button"
                            onClick={() => handleCopyChallengeId(ch.id)}
                            title="Copy challenge ID"
                            aria-label={`Copy challenge ID ${ch.id}`}
                            className="shrink-0 px-2 py-1 text-[10px] rounded bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-800/60 transition"
                          >
                            {copiedChallengeId === ch.id ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-100">{ch.title}</p>
                        {ch.description && (
                          <p className="text-xs text-slate-400 mt-0.5 line-clamp-1 max-w-md">
                            {ch.description}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs font-bold text-amber-400">
                        {ch.score} pts
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold ${
                            ch.status === 'ENABLED'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                              : 'bg-red-950 text-red-400 border border-red-800/60'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              ch.status === 'ENABLED' ? 'bg-emerald-400' : 'bg-red-400'
                            }`}
                          ></span>
                          {ch.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-400">
                        {ch.hackerRankUrl ? (
                          <a
                            href={ch.hackerRankUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-400 hover:text-indigo-300 underline flex items-center gap-1"
                          >
                            <span>Link</span>
                            <span>↗</span>
                          </a>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenEditModal(ch)}
                          className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleStatusClick(ch)}
                          className={`px-2.5 py-1 text-xs rounded transition ${
                            ch.status === 'ENABLED'
                              ? 'bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-800/40'
                              : 'bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800/40'
                          }`}
                        >
                          {ch.status === 'ENABLED' ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          onClick={() => handleDeleteClick(ch)}
                          className="px-2.5 py-1 text-xs rounded bg-red-950/40 hover:bg-red-900 text-red-400 hover:text-white border border-red-900/60 transition"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          {!isLoading && challenges.length > 0 && (
            <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs text-slate-400 font-mono">
              <div>
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                <span className="text-slate-200 font-bold">{pagination.total}</span> challenges
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  &lt; Prev
                </button>
                <span className="px-2">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  Next &gt;
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Modal */}
      <ChallengeFormModal
        isOpen={modalState.isOpen}
        mode={modalState.mode}
        initialData={modalState.data}
        isLoading={modalState.isLoading}
        error={modalState.error}
        onSubmit={handleModalSubmit}
        onClose={() => setModalState({ isOpen: false, mode: 'create', data: null, error: null, isLoading: false })}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title="Delete Challenge"
        message={`Are you sure you want to delete the challenge "${deleteDialog.challenge?.title}"? This action cannot be undone.`}
        confirmLabel="Delete Challenge"
        isDanger={true}
        isLoading={deleteDialog.isLoading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteDialog({ isOpen: false, challenge: null, isLoading: false })}
      />

      {/* Status Toggle Confirmation Dialog */}
      <ConfirmDialog
        isOpen={statusDialog.isOpen}
        title={`${statusDialog.newStatus === 'DISABLED' ? 'Disable' : 'Enable'} Challenge`}
        message={`Are you sure you want to set "${statusDialog.challenge?.title}" to ${statusDialog.newStatus}? ${
          statusDialog.newStatus === 'DISABLED'
            ? 'The challenge will be hidden from participants.'
            : 'The challenge will be accessible to participants during the event.'
        }`}
        confirmLabel={`Set to ${statusDialog.newStatus}`}
        isDanger={statusDialog.newStatus === 'DISABLED'}
        isLoading={statusDialog.isLoading}
        onConfirm={handleConfirmStatusToggle}
        onCancel={() => setStatusDialog({ isOpen: false, challenge: null, newStatus: null, isLoading: false })}
      />
    </AdminLayout>
  );
};

export default ChallengesPage;
