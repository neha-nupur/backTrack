import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import ParticipantFormModal from '../../components/admin/ParticipantFormModal';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import {
  listParticipants,
  createParticipant,
  updateParticipant,
  updateParticipantStatus,
  deleteParticipant,
} from '../../services/participantService';

const ParticipantsPage = () => {
  const [participants, setParticipants] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Modal States
  const [modalState, setModalState] = useState({ isOpen: false, mode: 'add', data: null, error: null, isLoading: false });
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, participant: null, isLoading: false });
  const [statusDialog, setStatusDialog] = useState({ isOpen: false, participant: null, newStatus: null, isLoading: false });

  // Auto-dismiss success message
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Fetch participants from server
  const fetchParticipants = useCallback(async (page = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = { page, limit: pagination.limit };
      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;

      const res = await listParticipants(params);
      if (res.success && res.data) {
        setParticipants(res.data.participants);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      setError(err.message || 'Unable to load participants.');
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, pagination.limit]);

  useEffect(() => {
    fetchParticipants(1);
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchParticipants(1);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchParticipants(newPage);
    }
  };

  // Add Participant
  const handleOpenAddModal = () => {
    setModalState({ isOpen: true, mode: 'add', data: null, error: null, isLoading: false });
  };

  // Edit Participant
  const handleOpenEditModal = (participant) => {
    setModalState({ isOpen: true, mode: 'edit', data: participant, error: null, isLoading: false });
  };

  // Submit Modal (Add or Edit)
  const handleModalSubmit = async (formData) => {
    setModalState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      if (modalState.mode === 'add') {
        await createParticipant(formData);
        setSuccessMessage(`Participant "${formData.name}" added successfully.`);
      } else {
        await updateParticipant(modalState.data.id, formData);
        setSuccessMessage(`Participant "${formData.name}" updated successfully.`);
      }
      setModalState({ isOpen: false, mode: 'add', data: null, error: null, isLoading: false });
      fetchParticipants(pagination.page);
    } catch (err) {
      setModalState((prev) => ({ ...prev, isLoading: false, error: err.message || 'Operation failed.' }));
    }
  };

  // Trigger Status Toggle
  const handleToggleStatusClick = (participant) => {
    const newStatus = participant.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    setStatusDialog({ isOpen: true, participant, newStatus, isLoading: false });
  };

  // Confirm Status Toggle
  const handleConfirmStatusToggle = async () => {
    const { participant, newStatus } = statusDialog;
    setStatusDialog((prev) => ({ ...prev, isLoading: true }));
    try {
      await updateParticipantStatus(participant.id, newStatus);
      setSuccessMessage(`Participant "${participant.name}" status changed to ${newStatus}.`);
      setStatusDialog({ isOpen: false, participant: null, newStatus: null, isLoading: false });
      fetchParticipants(pagination.page);
    } catch (err) {
      setError(err.message || 'Failed to update participant status.');
      setStatusDialog({ isOpen: false, participant: null, newStatus: null, isLoading: false });
    }
  };

  // Trigger Delete
  const handleDeleteClick = (participant) => {
    setDeleteDialog({ isOpen: true, participant, isLoading: false });
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    const { participant } = deleteDialog;
    setDeleteDialog((prev) => ({ ...prev, isLoading: true }));
    try {
      await deleteParticipant(participant.id);
      setSuccessMessage(`Participant "${participant.name}" was removed.`);
      setDeleteDialog({ isOpen: false, participant: null, isLoading: false });
      fetchParticipants(pagination.page);
    } catch (err) {
      setError(err.message || 'Failed to delete participant.');
      setDeleteDialog({ isOpen: false, participant: null, isLoading: false });
    }
  };

  return (
    <AdminLayout title="Participant Management">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Action Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight font-mono">Participants</h1>
            <p className="text-xs text-slate-400 mt-1 font-sans">
              Manage participant records, provision passwords, and control student access to competitions.
            </p>
          </div>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-700 to-cyan-600 hover:from-blue-600 hover:to-cyan-500 text-white rounded-xl text-xs font-mono font-bold shadow-[0_0_15px_rgba(6,182,212,0.3)] transition shrink-0 cursor-pointer"
          >
            <span className="text-base font-bold">+</span>
            <span>Add Participant</span>
          </button>
        </div>

        {/* Alerts & Notifications */}
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
              onClick={() => fetchParticipants(pagination.page)}
              className="px-3 py-1 bg-red-900 hover:bg-red-800 text-white text-xs font-semibold rounded"
            >
              Retry
            </button>
          </div>
        )}

        {/* Filters & Search Controls */}
        <div className="bg-[#071324]/85 border border-slate-800/90 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-xl">
          <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2 w-full md:w-auto">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
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
              <option value="ACTIVE">ACTIVE only</option>
              <option value="DISABLED">DISABLED only</option>
            </select>
          </div>
        </div>

        {/* Participants Table / State Card */}
        <div className="bg-[#071324]/85 border border-slate-800/90 rounded-2xl overflow-hidden shadow-2xl">
          {isLoading ? (
            <div className="p-12 text-center text-slate-400 space-y-3 font-mono">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-sm">Loading participants...</p>
            </div>
          ) : participants.length === 0 ? (
            <div className="p-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-2xl">
                👥
              </div>
              <h3 className="text-base font-semibold text-slate-200">
                {search || statusFilter ? 'No matching participants found.' : 'No participants added yet.'}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {search || statusFilter
                  ? 'Try clearing the search query or status filter to see all records.'
                  : 'Get started by adding participants using their college email address.'}
              </p>
              {!search && !statusFilter && (
                <button
                  onClick={handleOpenAddModal}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-lg transition"
                >
                  + Add First Participant
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider font-mono">
                  <tr>
                    <th className="px-6 py-3.5">Name</th>
                    <th className="px-6 py-3.5">College Email</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Created</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {participants.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-6 py-4 font-medium text-slate-200">
                        {p.name}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-300">
                        {p.email}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold ${
                            p.status === 'ACTIVE'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                              : 'bg-red-950 text-red-400 border border-red-800/60'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              p.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-red-400'
                            }`}
                          ></span>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-400">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenEditModal(p)}
                          className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleStatusClick(p)}
                          className={`px-2.5 py-1 text-xs rounded transition ${
                            p.status === 'ACTIVE'
                              ? 'bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-800/40'
                              : 'bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800/40'
                          }`}
                        >
                          {p.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          onClick={() => handleDeleteClick(p)}
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
          {!isLoading && participants.length > 0 && (
            <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs text-slate-400 font-mono">
              <div>
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                <span className="text-slate-200 font-bold">{pagination.total}</span> participants
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
      <ParticipantFormModal
        isOpen={modalState.isOpen}
        mode={modalState.mode}
        initialData={modalState.data}
        isLoading={modalState.isLoading}
        error={modalState.error}
        onSubmit={handleModalSubmit}
        onClose={() => setModalState({ isOpen: false, mode: 'add', data: null, error: null, isLoading: false })}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title="Delete Participant"
        message={`Are you sure you want to delete "${deleteDialog.participant?.name}" (${deleteDialog.participant?.email})? This action cannot be undone.`}
        confirmLabel="Delete Participant"
        isDanger={true}
        isLoading={deleteDialog.isLoading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteDialog({ isOpen: false, participant: null, isLoading: false })}
      />

      {/* Status Toggle Confirmation Dialog */}
      <ConfirmDialog
        isOpen={statusDialog.isOpen}
        title={`${statusDialog.newStatus === 'DISABLED' ? 'Disable' : 'Enable'} Participant`}
        message={`Are you sure you want to set "${statusDialog.participant?.name}" to ${statusDialog.newStatus}? ${
          statusDialog.newStatus === 'DISABLED'
            ? 'The participant will be blocked from authenticating.'
            : 'The participant will be able to log in using the shared master password.'
        }`}
        confirmLabel={`Set to ${statusDialog.newStatus}`}
        isDanger={statusDialog.newStatus === 'DISABLED'}
        isLoading={statusDialog.isLoading}
        onConfirm={handleConfirmStatusToggle}
        onCancel={() => setStatusDialog({ isOpen: false, participant: null, newStatus: null, isLoading: false })}
      />
    </AdminLayout>
  );
};

export default ParticipantsPage;
