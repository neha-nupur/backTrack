import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import apiClient from '../services/apiClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // Admin Session State
  const [adminUser, setAdminUser] = useState(() => {
    try {
      const cached = localStorage.getItem('blackbox_admin_user');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem('blackbox_admin_token') || null);

  // Participant Session State
  const [participantUser, setParticipantUser] = useState(() => {
    try {
      const cached = localStorage.getItem('blackbox_participant_user');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [participantToken, setParticipantToken] = useState(() => localStorage.getItem('blackbox_participant_token') || null);

  const [loading, setLoading] = useState(true);
  const refreshPromiseRef = useRef(null);

  // Verify and refresh both sessions independently
  const refreshSessions = useCallback(async () => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    const refreshPromise = (async () => {
      const curAdminToken = localStorage.getItem('blackbox_admin_token');
      const curParticipantToken = localStorage.getItem('blackbox_participant_token');

      const promises = [];

      // Verify Admin session if token exists
      if (curAdminToken) {
        promises.push(
          apiClient
            .get('/auth/me', {
              headers: { Authorization: `Bearer ${curAdminToken}` },
            })
            .then((res) => {
              if (res?.success && res.data?.user && res.data.user.role === 'ADMIN') {
                setAdminUser(res.data.user);
                localStorage.setItem('blackbox_admin_user', JSON.stringify(res.data.user));
              } else {
                throw new Error('Invalid admin session');
              }
            })
            .catch(() => {
              localStorage.removeItem('blackbox_admin_token');
              localStorage.removeItem('blackbox_admin_user');
              setAdminToken(null);
              setAdminUser(null);
            })
        );
      } else {
        setAdminUser(null);
      }

      // Verify Participant session if token exists
      if (curParticipantToken) {
        promises.push(
          apiClient
            .get('/auth/me', {
              headers: { Authorization: `Bearer ${curParticipantToken}` },
            })
            .then((res) => {
              if (res?.success && res.data?.user && res.data.user.role === 'PARTICIPANT') {
                setParticipantUser(res.data.user);
                localStorage.setItem('blackbox_participant_user', JSON.stringify(res.data.user));
              } else {
                throw new Error('Invalid participant session');
              }
            })
            .catch(() => {
              localStorage.removeItem('blackbox_participant_token');
              localStorage.removeItem('blackbox_participant_user');
              setParticipantToken(null);
              setParticipantUser(null);
            })
        );
      } else {
        setParticipantUser(null);
      }

      await Promise.allSettled(promises);
      setLoading(false);
    })();

    refreshPromiseRef.current = refreshPromise;

    try {
      return await refreshPromise;
    } finally {
      if (refreshPromiseRef.current === refreshPromise) {
        refreshPromiseRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

  // Login handler: stores token & user into the specific role's session
  const login = (userData, authToken) => {
    if (userData?.role === 'ADMIN') {
      localStorage.setItem('blackbox_admin_token', authToken);
      localStorage.setItem('blackbox_admin_user', JSON.stringify(userData));
      setAdminToken(authToken);
      setAdminUser(userData);
    } else {
      localStorage.setItem('blackbox_participant_token', authToken);
      localStorage.setItem('blackbox_participant_user', JSON.stringify(userData));
      setParticipantToken(authToken);
      setParticipantUser(userData);
    }
  };

  // Role-specific logout
  const logout = async (roleToLogout) => {
    const isCurrentAdminPath = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
    const targetRole = roleToLogout || (isCurrentAdminPath ? 'ADMIN' : 'PARTICIPANT');

    if (targetRole === 'ADMIN') {
      try {
        if (adminToken) {
          await apiClient.post('/auth/logout', {}, {
            headers: { Authorization: `Bearer ${adminToken}` },
          });
        }
      } catch (e) {
        console.warn('Admin logout notification failed:', e);
      } finally {
        localStorage.removeItem('blackbox_admin_token');
        localStorage.removeItem('blackbox_admin_user');
        setAdminToken(null);
        setAdminUser(null);
      }
    } else {
      try {
        if (participantToken) {
          await apiClient.post('/auth/logout', {}, {
            headers: { Authorization: `Bearer ${participantToken}` },
          });
        }
      } catch (e) {
        console.warn('Participant logout notification failed:', e);
      } finally {
        localStorage.removeItem('blackbox_participant_token');
        localStorage.removeItem('blackbox_participant_user');
        setParticipantToken(null);
        setParticipantUser(null);
      }
    }
  };

  // Dynamic contextual user/token for universal components
  const isCurrentAdminPath = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
  const activeUser = isCurrentAdminPath ? adminUser : participantUser;
  const activeToken = isCurrentAdminPath ? adminToken : participantToken;

  const value = {
    // Contextually resolved properties
    user: activeUser,
    token: activeToken,
    role: activeUser?.role || null,
    isAuthenticated: !!activeToken && !!activeUser,
    loading,
    login,
    logout,
    refreshUser: refreshSessions,

    // Explicit role-separated properties
    adminUser,
    adminToken,
    isAdminAuthenticated: !!adminToken && !!adminUser,
    participantUser,
    participantToken,
    isParticipantAuthenticated: !!participantToken && !!participantUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;

