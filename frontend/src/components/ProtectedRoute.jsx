import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ROLES from '../constants/roles';

const ProtectedRoute = ({ allowedRoles = [], children }) => {
  const {
    adminUser,
    isAdminAuthenticated,
    participantUser,
    isParticipantAuthenticated,
    loading,
  } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-emerald-400 flex items-center justify-center font-mono text-sm">
        <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 px-6 py-4 rounded-xl shadow-2xl">
          <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></span>
          <span>Verifying session credentials...</span>
        </div>
      </div>
    );
  }

  // Admin Route Verification
  if (allowedRoles.includes(ROLES.ADMIN)) {
    if (!isAdminAuthenticated || adminUser?.role !== ROLES.ADMIN) {
      return <Navigate to="/admin/login" replace />;
    }
    return children;
  }

  // Participant Route Verification
  if (allowedRoles.includes(ROLES.PARTICIPANT)) {
    if (!isParticipantAuthenticated || participantUser?.role !== ROLES.PARTICIPANT) {
      return <Navigate to="/login" replace />;
    }
    return children;
  }

  return children;
};

export default ProtectedRoute;

