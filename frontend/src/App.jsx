import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/common/Navbar';
import Sidebar from './components/common/Sidebar';
import ProtectedRoute from './components/common/ProtectedRoute';
import { useAuth } from './context/AuthContext';

// Pages
import TaskListPage from './pages/admin/TaskListPage';
import CreateTaskPage from './pages/admin/CreateTaskPage';
import TaskDetailPage from './pages/admin/TaskDetailPage';
import EditTaskPage from './pages/admin/EditTaskPage';
import TaskReportsPage from './pages/admin/TaskReportsPage';

import MyTasksPage from './pages/employee/MyTasksPage';
import EmployeeTaskDetailPage from './pages/employee/EmployeeTaskDetailPage';

import NotificationsPage from './pages/NotificationsPage';
import AnnouncementsPage from './pages/AnnouncementsPage';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isManagerOrAdmin } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation Bar */}
      <Navbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex flex-1">
        {/* Navigation Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main Content Area */}
        <main className="flex-1 lg:pl-64 flex flex-col">
          <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            <Routes>
              {/* Default Dynamic Redirect based on role */}
              <Route
                path="/"
                element={
                  isManagerOrAdmin ? (
                    <Navigate to="/tasks" replace />
                  ) : (
                    <Navigate to="/my-tasks" replace />
                  )
                }
              />

              {/* Administrative Routes (Guarded: ADMIN, HR, MANAGER) */}
              <Route
                path="/tasks"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'MANAGER']}>
                    <TaskListPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tasks/create"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'MANAGER']}>
                    <CreateTaskPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tasks/:id/edit"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'MANAGER']}>
                    <EditTaskPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tasks/reports"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'MANAGER']}>
                    <TaskReportsPage />
                  </ProtectedRoute>
                }
              />

              {/* Supervisory & Employee View of Task Details */}
              <Route path="/tasks/:id" element={<TaskDetailPage />} />

              {/* Employee Routes */}
              <Route path="/my-tasks" element={<MyTasksPage />} />
              <Route path="/my-tasks/:id" element={<EmployeeTaskDetailPage />} />

              {/* Shared Routes */}
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/announcements" element={<AnnouncementsPage />} />

              {/* 404 Fallback */}
              <Route
                path="*"
                element={
                  <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <h3 className="text-lg font-bold text-slate-800">Page Not Found</h3>
                    <p className="text-xs text-slate-500 mt-1">The requested URL route does not exist.</p>
                  </div>
                }
              />
            </Routes>
          </div>

          {/* Footer */}
          <footer className="border-t border-slate-200 bg-white py-4 px-6 text-center text-xs text-slate-400">
            THYO SOFTECH PVT LTD • Human Resource Management System (HRMS) • Task Management Module v1.0 • RBAC Enabled
          </footer>
        </main>
      </div>
    </div>
  );
}
