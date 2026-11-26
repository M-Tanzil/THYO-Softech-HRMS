import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import apiClient from '../api/client';
import { clearPersistedQueryCache } from '../main';

const AuthContext = createContext(null);

export const getDashboardRoute = (role) => {
  const normRole = String(role || 'EMPLOYEE').toUpperCase();
  if (normRole === 'ADMIN') return '/leave?tab=approvalQueue';
  if (normRole === 'MANAGER') return '/leave?tab=approvalQueue';
  return '/leave?tab=my';
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => {
    return (
      localStorage.getItem('thyo_task_token') ||
      localStorage.getItem('thyo_auth_token') ||
      localStorage.getItem('token') ||
      null
    );
  });

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved =
        localStorage.getItem('thyo_user_data') ||
        localStorage.getItem('user') ||
        localStorage.getItem('currentUser') ||
        localStorage.getItem('auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(() => {
    const savedToken =
      localStorage.getItem('thyo_task_token') ||
      localStorage.getItem('thyo_auth_token') ||
      localStorage.getItem('token');
    const savedUser =
      localStorage.getItem('thyo_user_data') ||
      localStorage.getItem('user') ||
      localStorage.getItem('currentUser') ||
      localStorage.getItem('auth_user');
    return Boolean(savedToken && !savedUser);
  });

  const [unreadCount, setUnreadCount] = useState(0);

  const refreshNotificationsCount = useCallback(async () => {
    try {
      const res = await apiClient.get('/notifications/unread-count');
      if (res.data && res.data.success) {
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch {
      // Silently ignore if unauthenticated or offline
    }
  }, []);

  const initAuth = useCallback(async () => {
    const savedToken =
      localStorage.getItem('thyo_task_token') ||
      localStorage.getItem('thyo_auth_token') ||
      localStorage.getItem('token');
    const savedUser =
      localStorage.getItem('thyo_user_data') ||
      localStorage.getItem('user') ||
      localStorage.getItem('currentUser') ||
      localStorage.getItem('auth_user');

    if (!savedUser && savedToken) {
      setLoading(true);
    }

    try {
      if (savedToken) {
        try {
          const res = await apiClient.get('/auth/me');
          if (res.data && res.data.success && res.data.user) {
            const u = res.data.user;
            let role = String(u.role || 'EMPLOYEE').toUpperCase();
            if (!['ADMIN', 'MANAGER', 'EMPLOYEE'].includes(role)) {
              role = 'EMPLOYEE';
            }
            const normalizedUser = { ...u, role };
            localStorage.setItem('thyo_user_data', JSON.stringify(normalizedUser));
            setCurrentUser((prev) => {
              if (prev && prev.employeeId === normalizedUser.employeeId && prev.role === normalizedUser.role && prev.email === normalizedUser.email && prev.fullName === normalizedUser.fullName) {
                return prev;
              }
              return normalizedUser;
            });
            setToken(savedToken);
            setLoading(false);
            return;
          }
        } catch (err) {
          if (err.response && err.response.status === 401) {
            localStorage.removeItem('thyo_task_token');
            localStorage.removeItem('thyo_auth_token');
            localStorage.removeItem('token');
            localStorage.removeItem('thyo_user_data');
            setToken(null);
            setCurrentUser(null);
          }
        }
      } else {
        setCurrentUser(null);
        setToken(null);
      }
    } catch (err) {
      console.error('Error during auth initialization:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  const currentEmployeeId = currentUser?.employeeId;

  useEffect(() => {
    if (currentEmployeeId) {
      refreshNotificationsCount();
    }
  }, [currentEmployeeId, refreshNotificationsCount]);

  const login = useCallback(async ({ identifier, username, email, password }) => {
    const loginPayload = {
      identifier: identifier || username || email,
      password
    };

    const res = await apiClient.post('/auth/login', loginPayload);
    if (res.data && res.data.success) {
      const { token: receivedToken, user: receivedUser } = res.data;
      let role = String(receivedUser.role || 'EMPLOYEE').toUpperCase();
      if (!['ADMIN', 'MANAGER', 'EMPLOYEE'].includes(role)) {
        role = 'EMPLOYEE';
      }
      const normalizedUser = { ...receivedUser, role };

      clearPersistedQueryCache();
      localStorage.setItem('thyo_task_token', receivedToken);
      localStorage.setItem('thyo_auth_token', receivedToken);
      localStorage.setItem('token', receivedToken);
      localStorage.setItem('thyo_user_data', JSON.stringify(normalizedUser));
      setToken(receivedToken);
      setCurrentUser(normalizedUser);
      return { success: true, user: normalizedUser };
    }
    throw new Error(res.data?.message || 'Authentication failed.');
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Proceed with local logout regardless of server state
    } finally {
      clearPersistedQueryCache();
      localStorage.removeItem('thyo_task_token');
      localStorage.removeItem('thyo_auth_token');
      localStorage.removeItem('token');
      localStorage.removeItem('thyo_user_data');
      localStorage.removeItem('thyo_active_emp_id');
      localStorage.removeItem('thyo_active_role');
      localStorage.removeItem('thyo_dev_dashboard_role');
      setToken(null);
      setCurrentUser(null);
      setUnreadCount(0);
    }
  }, []);

  const verifiedRole = (currentUser?.role || 'EMPLOYEE').toUpperCase();
  const isAuthenticated = !!currentUser;
  const isAdmin = verifiedRole === 'ADMIN';
  const isManager = verifiedRole === 'MANAGER';
  const isEmployee = verifiedRole === 'EMPLOYEE';
  const isManagerOrAdmin = isAdmin || isManager;

  const value = useMemo(() => ({
    token,
    currentUser,
    user: currentUser,
    isAuthenticated,
    loading,
    activeRole: verifiedRole,
    activeEmpId: currentUser?.employeeId || null,
    isManagerOrAdmin,
    isAdmin,
    isManager,
    isEmployee,
    isSuperAdmin: false,
    isHR: false,
    login,
    logout,
    unreadCount,
    refreshNotificationsCount,
    getDashboardRoute
  }), [
    token,
    currentUser,
    isAuthenticated,
    loading,
    verifiedRole,
    isManagerOrAdmin,
    isAdmin,
    isManager,
    isEmployee,
    login,
    logout,
    unreadCount,
    refreshNotificationsCount
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
