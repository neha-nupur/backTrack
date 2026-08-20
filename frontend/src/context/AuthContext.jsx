import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient from '../services/apiClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('blackbox_token') || null);
  const [loading, setLoading] = useState(true);

  // Restore session using GET /api/auth/me
  const refreshUser = useCallback(async () => {
    const currentToken = localStorage.getItem('blackbox_token');
    if (!currentToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await apiClient.get('/auth/me');
      if (response && response.success && response.data?.user) {
        setUser(response.data.user);
      } else {
        throw new Error('Invalid user session response');
      }
    } catch (err) {
      console.warn('Session restoration failed:', err.message || err);
      // Clear invalid token
      localStorage.removeItem('blackbox_token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = (userData, authToken) => {
    localStorage.setItem('blackbox_token', authToken);
    setToken(authToken);
    setUser(userData);
  };

  const logout = async () => {
    try {
      if (token) {
        await apiClient.post('/auth/logout');
      }
    } catch (err) {
      console.warn('Logout notification error:', err);
    } finally {
      localStorage.removeItem('blackbox_token');
      setToken(null);
      setUser(null);
    }
  };

  const value = {
    user,
    token,
    role: user?.role || null,
    isAuthenticated: !!token && !!user,
    loading,
    login,
    logout,
    refreshUser,
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
