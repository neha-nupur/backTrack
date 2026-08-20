import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DevVerificationPage from '../pages/DevVerificationPage';
import LoginPage from '../pages/LoginPage';
import AdminLoginPage from '../pages/AdminLoginPage';
import ProtectedRoute from '../components/ProtectedRoute';
import AdminDashboardShell from '../pages/AdminDashboardShell';
import EventsPage from '../pages/admin/EventsPage';
import ChallengesPage from '../pages/admin/ChallengesPage';
import ParticipantsPage from '../pages/admin/ParticipantsPage';
import SettingsPage from '../pages/admin/SettingsPage';
import AttemptsPage from '../pages/admin/AttemptsPage';
import ParticipantDashboardShell from '../pages/ParticipantDashboardShell';
import ChallengePage from '../pages/participant/ChallengePage';
import ROLES from '../constants/roles';

const AppRoutes = () => {
  return (
    <Routes>
      {/* Dev Verification Endpoint */}
      <Route path="/dev" element={<DevVerificationPage />} />

      {/* Public Auth Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />

      {/* Protected Admin Routes */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
            <AdminDashboardShell />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/events"
        element={
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
            <EventsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/events/:eventId/challenges"
        element={
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
            <ChallengesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/participants"
        element={
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
            <ParticipantsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/attempts"
        element={
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
            <AttemptsPage />
          </ProtectedRoute>
        }
      />

      {/* Protected Participant Routes */}
      <Route
        path="/participant/dashboard"
        element={
          <ProtectedRoute allowedRoles={[ROLES.PARTICIPANT]}>
            <ParticipantDashboardShell />
          </ProtectedRoute>
        }
      />
      <Route
        path="/participant/events/:eventId/challenges"
        element={
          <ProtectedRoute allowedRoles={[ROLES.PARTICIPANT]}>
            <ChallengePage />
          </ProtectedRoute>
        }
      />

      {/* Default Fallback Redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default AppRoutes;
