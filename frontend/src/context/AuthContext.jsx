import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [employees, setEmployees] = useState([]);
  const [activeEmpId, setActiveEmpId] = useState(
    localStorage.getItem('thyo_active_emp_id') || 'EMP001'
  );
  const [activeRole, setActiveRole] = useState(
    localStorage.getItem('thyo_active_role') || 'ADMIN'
  );
  const [currentUser, setCurrentUser] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch employees list from backend
  const fetchEmployees = async () => {
    try {
      const res = await apiClient.get('/employees');
      if (res.data && res.data.success) {
        setEmployees(res.data.data);
        const current = res.data.data.find(e => e.employeeId === activeEmpId);
        if (current) {
          setCurrentUser(current);
        }
      }
    } catch (err) {
      console.error('Failed to fetch employees in AuthContext:', err.friendlyMessage || err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch unread notifications count
  const refreshNotificationsCount = async () => {
    try {
      const res = await apiClient.get('/notifications?limit=1');
      if (res.data && res.data.success) {
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      // Silently catch in development
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [activeEmpId]);

  useEffect(() => {
    if (activeEmpId) {
      refreshNotificationsCount();
    }
  }, [activeEmpId, activeRole]);

  // Switcher to simulate different employee identities without fake passwords
  const switchUser = (empId, role = null) => {
    let determinedRole = role;
    if (!determinedRole) {
      if (empId === 'EMP001') determinedRole = 'ADMIN';
      else if (empId === 'EMP002') determinedRole = 'HR';
      else determinedRole = 'EMPLOYEE';
    }

    setActiveEmpId(empId);
    setActiveRole(determinedRole);
    localStorage.setItem('thyo_active_emp_id', empId);
    localStorage.setItem('thyo_active_role', determinedRole);

    const emp = employees.find(e => e.employeeId === empId);
    if (emp) setCurrentUser(emp);
  };

  const isManagerOrAdmin = ['ADMIN', 'SUPER_ADMIN', 'HR', 'MANAGER'].includes(
    (activeRole || 'EMPLOYEE').toUpperCase()
  );

  return (
    <AuthContext.Provider
      value={{
        employees,
        activeEmpId,
        activeRole,
        isManagerOrAdmin,
        currentUser: currentUser || {
          employeeId: activeEmpId,
          fullName: activeEmpId === 'EMP001' ? 'RUPAM BHARGOV' : activeEmpId,
          role: activeRole,
          department: 'IT',
          position: 'Software Developer'
        },
        unreadCount,
        switchUser,
        refreshNotificationsCount,
        loading
      }}
    >
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
