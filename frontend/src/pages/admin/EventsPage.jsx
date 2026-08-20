import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import EventFormModal from '../../components/admin/EventFormModal';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import {
  adminListEvents,
  adminCreateEvent,
  adminUpdateEvent,
  adminUpdateEventStatus,
  adminDeleteEvent,
} from '../../services/eventService';

const EventsPage = () => {
  const [events, setEvents] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Modal States
  const [modalState, setModalState] = useState({ isOpen: false, mode: 'create', data: null, error: null, isLoading: false });
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, event: null, isLoading: false });
  const [statusDialog, setStatusDialog] = useState({ isOpen: false, event: null, newStatus: null, isLoading: false });

  // Auto-dismiss success message
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const fetchEvents = useCallback(async (page = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = { page, limit: pagination.limit };
      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;

      const res = await adminListEvents(params);
      if (res.success && res.data) {
        setEvents(res.data.events);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      setError(err.message || 'Unable to load events.');
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, pagination.limit]);

  useEffect(() => {
    fetchEvents(1);
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchEvents(1);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchEvents(newPage);
    }
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setModalState({ isOpen: true, mode: 'create', data: null, error: null, isLoading: false });
  };

  // Open Edit Modal
  const handleOpenEditModal = (event) => {
    setModalState({ isOpen: true, mode: 'edit', data: event, error: null, isLoading: false });
  };

  // Submit Modal (Create or Edit)
  const handleModalSubmit = async (formData) => {
    setModalState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      if (modalState.mode === 'create') {
        await adminCreateEvent(formData);
        setSuccessMessage(`Event "${formData.name}" created successfully.`);
      } else {
        await adminUpdateEvent(modalState.data.id, formData);
        setSuccessMessage(`Event "${formData.name}" updated successfully.`);
      }
      setModalState({ isOpen: false, mode: 'create', data: null, error: null, isLoading: false });
      fetchEvents(pagination.page);
    } catch (err) {
      setModalState((prev) => ({ ...prev, isLoading: false, error: err.message || 'Operation failed.' }));
    }
  };

  // Trigger Status Transition
  const handleStatusChangeClick = (event, newStatus) => {
    setStatusDialog({ isOpen: true, event, newStatus, isLoading: false });
  };

  // Confirm Status Transition
  const handleConfirmStatusChange = async () => {
    const { event, newStatus } = statusDialog;
    setStatusDialog((prev) => ({ ...prev, isLoading: true }));
    try {
      await adminUpdateEventStatus(event.id, newStatus);
      setSuccessMessage(`Event "${event.name}" marked as ${newStatus}.`);
      setStatusDialog({ isOpen: false, event: null, newStatus: null, isLoading: false });
      fetchEvents(pagination.page);
    } catch (err) {
      setError(err.message || 'Failed to update event status.');
      setStatusDialog({ isOpen: false, event: null, newStatus: null, isLoading: false });
    }
  };

  // Trigger Delete
  const handleDeleteClick = (event) => {
    setDeleteDialog({ isOpen: true, event, isLoading: false });
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    const { event } = deleteDialog;
    setDeleteDialog((prev) => ({ ...prev, isLoading: true }));
    try {
      await adminDeleteEvent(event.id);
      setSuccessMessage(`Event "${event.name}" was deleted.`);
      setDeleteDialog({ isOpen: false, event: null, isLoading: false });
      fetchEvents(pagination.page);
    } catch (err) {
      setError(err.message || 'Failed to delete event.');
      setDeleteDialog({ isOpen: false, event: null, isLoading: false });
    }
  };

  // Status Badge Helper
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'LIVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            LIVE
          </span>
        );
      case 'UPCOMING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-amber-950 text-amber-400 border border-amber-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            UPCOMING
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
            COMPLETED
          </span>
        );
      default:
        return status;
    }
  };

  return (
    <AdminLayout title="Event Management">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Action Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Events</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Create and manage coding competitions, schedule event windows, and control live status.
            </p>
          </div>
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold shadow-lg shadow-emerald-900/40 transition shrink-0"
          >
            <span className="text-base font-bold">+</span>
            <span>Create Event</span>
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
              onClick={() => fetchEvents(pagination.page)}
              className="px-3 py-1 bg-red-900 hover:bg-red-800 text-white text-xs font-semibold rounded"
            >
              Retry
            </button>
          </div>
        )}

        {/* Filter Controls */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-3">
          <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2 w-full md:w-auto">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search events by name..."
              className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition font-mono"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-lg transition"
            >
              Search
            </button>
          </form>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <label className="text-xs text-slate-400 font-medium">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition"
            >
              <option value="">All Statuses</option>
              <option value="UPCOMING">UPCOMING only</option>
              <option value="LIVE">LIVE only</option>
              <option value="COMPLETED">COMPLETED only</option>
            </select>
          </div>
        </div>

        {/* Events Table / State Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          {isLoading ? (
            <div className="p-12 text-center text-slate-400 space-y-3 font-mono">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-sm">Loading events...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="p-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-2xl">
                🏆
              </div>
              <h3 className="text-base font-semibold text-slate-200">
                {search || statusFilter ? 'No matching events found.' : 'No events created yet.'}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {search || statusFilter
                  ? 'Try clearing the search query or status filter.'
                  : 'Get started by creating your first BlackBox coding event.'}
              </p>
              {!search && !statusFilter && (
                <button
                  onClick={handleOpenCreateModal}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-lg transition"
                >
                  + Create First Event
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider font-mono">
                  <tr>
                    <th className="px-6 py-3.5">Event Name</th>
                    <th className="px-6 py-3.5">Scheduled Start</th>
                    <th className="px-6 py-3.5">Scheduled End</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {events.map((ev) => (
                    <tr key={ev.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-100">{ev.name}</p>
                        {ev.description && (
                          <p className="text-xs text-slate-400 mt-0.5 line-clamp-1 max-w-md">
                            {ev.description}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-300">
                        {new Date(ev.startTime).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-300">
                        {new Date(ev.endTime).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        {renderStatusBadge(ev.status)}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {/* Status Transition Action */}
                        {ev.status === 'UPCOMING' && (
                          <button
                            onClick={() => handleStatusChangeClick(ev, 'LIVE')}
                            className="px-2.5 py-1 text-xs rounded bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800/60 font-semibold transition"
                          >
                            Mark LIVE
                          </button>
                        )}
                        {ev.status === 'LIVE' && (
                          <button
                            onClick={() => handleStatusChangeClick(ev, 'COMPLETED')}
                            className="px-2.5 py-1 text-xs rounded bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-800/60 font-semibold transition"
                          >
                            Mark COMPLETED
                          </button>
                        )}

                        {/* Edit Action */}
                        {ev.status !== 'COMPLETED' && (
                          <button
                            onClick={() => handleOpenEditModal(ev)}
                            className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                          >
                            Edit
                          </button>
                        )}

                        {/* Delete Action */}
                        <button
                          onClick={() => handleDeleteClick(ev)}
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
          {!isLoading && events.length > 0 && (
            <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs text-slate-400 font-mono">
              <div>
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                <span className="text-slate-200 font-bold">{pagination.total}</span> events
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

      {/* Create / Edit Modal */}
      <EventFormModal
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
        title="Delete Event"
        message={`Are you sure you want to delete the event "${deleteDialog.event?.name}"? This action cannot be undone.`}
        confirmLabel="Delete Event"
        isDanger={true}
        isLoading={deleteDialog.isLoading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteDialog({ isOpen: false, event: null, isLoading: false })}
      />

      {/* Status Transition Confirmation Dialog */}
      <ConfirmDialog
        isOpen={statusDialog.isOpen}
        title={`Transition Event to ${statusDialog.newStatus}`}
        message={
          statusDialog.newStatus === 'LIVE'
            ? `Marking "${statusDialog.event?.name}" as LIVE will make it available to participants once the scheduled start time (${new Date(
                statusDialog.event?.startTime || Date.now()
              ).toLocaleString()}) is reached.`
            : `Marking "${statusDialog.event?.name}" as COMPLETED will conclude the event and prevent any new participant starts.`
        }
        confirmLabel={`Set to ${statusDialog.newStatus}`}
        isDanger={statusDialog.newStatus === 'COMPLETED'}
        isLoading={statusDialog.isLoading}
        onConfirm={handleConfirmStatusChange}
        onCancel={() => setStatusDialog({ isOpen: false, event: null, newStatus: null, isLoading: false })}
      />
    </AdminLayout>
  );
};

export default EventsPage;
