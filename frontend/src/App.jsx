import React, { useState, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Layers } from 'lucide-react';
import Navbar from './components/common/Navbar';
import Sidebar from './components/common/Sidebar';
import ProtectedRoute from './components/common/ProtectedRoute';
import ErrorBoundary from './components/common/ErrorBoundary';
import { useAuth, getDashboardRoute } from './context/AuthContext';
import { SkeletonStats, SkeletonTable } from './components/common/SkeletonLoader';

import LoginPage from './pages/LoginPage';

// Eagerly loaded primary modules for instantaneous navigation and refresh without flashes
import LeaveManagementPage from './pages/LeaveManagementPage';
import HolidaysPage from './pages/HolidaysPage';
import RecruitmentPage from './pages/RecruitmentPage';
import PerformancePage from './pages/PerformancePage';
import WfhPage from './pages/WfhPage';
import NotificationsPage from './pages/NotificationsPage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import TaskListPage from './pages/admin/TaskListPage';
import MyTasksPage from './pages/employee/MyTasksPage';

// Code-split secondary task detail/create/edit sub-pages
const CreateTaskPage = lazy(() => import('./pages/admin/CreateTaskPage'));
const TaskDetailPage = lazy(() => import('./pages/admin/TaskDetailPage'));
const EditTaskPage = lazy(() => import('./pages/admin/EditTaskPage'));
const TaskReportsPage = lazy(() => import('./pages/admin/TaskReportsPage'));
const EmployeeTaskDetailPage = lazy(() => import('./pages/employee/EmployeeTaskDetailPage'));

function PageFallback() {
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <SkeletonStats count={4} />
      <SkeletonTable rows={4} cols={5} />
    </div>
  );
}

const TEAMMATE_PENDING_ROUTES = [
  // Admin teammate routes (pages not yet available in this repo)
  { path: '/admin/dashboard', title: 'Admin Dashboard', allowedRoles: ['ADMIN'] },
  { path: '/admin/employees', title: 'Employees', allowedRoles: ['ADMIN'] },
  { path: '/admin/attendance', title: 'Attendance', allowedRoles: ['ADMIN'] },
  { path: '/admin/organization', title: 'Company & Branches', allowedRoles: ['ADMIN'] },
  { path: '/admin/departments', title: 'Departments', allowedRoles: ['ADMIN'] },
  { path: '/admin/designations', title: 'Designations', allowedRoles: ['ADMIN'] },
  { path: '/admin/shifts', title: 'Shifts', allowedRoles: ['ADMIN'] },
  { path: '/admin/users-roles', title: 'Users & Roles', allowedRoles: ['ADMIN'] },
  { path: '/admin/permissions', title: 'Permissions', allowedRoles: ['ADMIN'] },
  { path: '/admin/delegations', title: 'Delegations', allowedRoles: ['ADMIN'] },
  { path: '/admin/payroll', title: 'Payroll', allowedRoles: ['ADMIN'] },
  { path: '/admin/settings', title: 'Admin Settings', allowedRoles: ['ADMIN'] },
  { path: '/admin/profile', title: 'My Profile', allowedRoles: ['ADMIN'] },
  // Manager teammate routes
  { path: '/manager/dashboard', title: 'Manager Dashboard', allowedRoles: ['ADMIN', 'MANAGER'] },
  { path: '/manager/team', title: 'My Team', allowedRoles: ['ADMIN', 'MANAGER'] },
  { path: '/manager/attendance', title: 'Team Attendance', allowedRoles: ['ADMIN', 'MANAGER'] },
  { path: '/manager/shifts', title: 'Shift Schedule', allowedRoles: ['ADMIN', 'MANAGER'] },
  { path: '/manager/calendar', title: 'Team Calendar', allowedRoles: ['ADMIN', 'MANAGER'] },
  { path: '/manager/approvals', title: 'Approvals', allowedRoles: ['ADMIN', 'MANAGER'] },
  { path: '/manager/profile', title: 'My Profile', allowedRoles: ['ADMIN', 'MANAGER'] },
  { path: '/manager/settings', title: 'Manager Settings', allowedRoles: ['ADMIN', 'MANAGER'] },
  // Employee teammate routes
  { path: '/employee/dashboard', title: 'Employee Dashboard', allowedRoles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
  { path: '/employee/attendance', title: 'My Attendance', allowedRoles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
  { path: '/employee/calendar', title: 'My Calendar', allowedRoles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
  { path: '/employee/shifts', title: 'My Shift Schedule', allowedRoles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
  { path: '/employee/documents', title: 'My Documents', allowedRoles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
  { path: '/employee/payslips', title: 'My Payslips', allowedRoles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
  { path: '/employee/profile', title: 'My Profile', allowedRoles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
  { path: '/employee/files', title: 'My Files', allowedRoles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
  { path: '/employee/settings', title: 'Settings', allowedRoles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] }
];

function ModulePendingNotice({ title, role }) {
  const location = useLocation();
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center max-w-xl mx-auto my-8 shadow-sm">
      <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto mb-4">
        <Layers className="w-6 h-6" />
      </div>
      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100 mb-3">
        Module Integration Pending
      </span>
      <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      <p className="text-xs text-slate-500 mt-2 leading-relaxed">
        The <span className="font-mono text-slate-700">{location.pathname}</span> module is part of the team HRMS sidebar and its page component is not yet available in this branch.
      </p>
      <div className="mt-6 flex items-center justify-center">
        <Link
          to={getDashboardRoute(role)}
          className="thyo-btn-primary"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Active Workspace</span>
        </Link>
      </div>
    </div>
  );
}

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  // App shell skeleton while restoring session (prevents blank white/black screens)
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f7fb] flex">
        <div className="hidden lg:block w-64 bg-gradient-to-b from-[#171936] via-[#10152d] to-[#090d1d] border-r border-indigo-300/10 p-4 space-y-3 shrink-0">
          <div className="h-12 bg-white/10 rounded-xl animate-pulse mb-4" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-9 bg-white/10 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <div className="h-20 bg-white/95 border-b border-slate-200 px-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-28 h-8 bg-slate-200/80 rounded-xl animate-pulse" />
              <div className="w-36 h-4 bg-slate-200/80 rounded animate-pulse" />
            </div>
            <div className="w-32 h-9 bg-slate-200/80 rounded-xl animate-pulse" />
          </div>
          <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
            <SkeletonStats count={4} />
            <SkeletonTable rows={5} cols={5} />
          </main>
        </div>
      </div>
    );
  }

  // If user is on the login page, render clean login view without navigation frame
  if (location.pathname === '/login') {
    if (currentUser) {
      return <Navigate to={getDashboardRoute(currentUser?.role)} replace />;
    }
    return <LoginPage />;
  }

  // If user is not authenticated, redirect to /login
  if (!currentUser) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb] flex flex-col">
      {/* Role-Based Team Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
      />

      {/* Right Shell: Topbar + Main Content + Footer */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        {/* Enterprise Navigation Bar */}
        <Navbar onMenuToggle={() => setSidebarOpen((prev) => !prev)} />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col">
          <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            <ErrorBoundary key={location.pathname}>
              <Suspense fallback={<PageFallback />}>
                <Routes>
                {/* Default Root Redirect based on Real Role */}
                <Route
                  path="/"
                  element={<Navigate to={getDashboardRoute(currentUser?.role)} replace />}
                />

                {/* Student 4: Task Management Supervisory & Manager Routes */}
                <Route
                  path="/tasks"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                      <TaskListPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/tasks/create"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                      <CreateTaskPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/tasks/:id/edit"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                      <EditTaskPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/tasks/reports"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                      <TaskReportsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/tasks/:id"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                      <TaskDetailPage />
                    </ProtectedRoute>
                  }
                />

                {/* Student 4: Employee Personal Task Workspace */}
                <Route path="/my-tasks" element={<MyTasksPage />} />
                <Route path="/my-tasks/:id" element={<EmployeeTaskDetailPage />} />

                {/* Student 5: Talent & Performance Modules */}
                <Route path="/recruitment" element={<RecruitmentPage />} />
                <Route path="/performance" element={<PerformancePage />} />

                {/* Student 5: Employee Self-Service & Remote Work */}
                <Route path="/leave" element={<LeaveManagementPage />} />
                <Route path="/wfh" element={<WfhPage />} />
                <Route path="/holidays" element={<HolidaysPage />} />

                {/* Student 5: Communications & Alerts */}
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/announcements" element={<AnnouncementsPage />} />

                {/* Preserved Team Sidebar Routes (awaiting teammate module pages) */}
                {TEAMMATE_PENDING_ROUTES.map((route) => (
                  <Route
                    key={route.path}
                    path={route.path}
                    element={
                      <ProtectedRoute allowedRoles={route.allowedRoles}>
                        <ModulePendingNotice title={route.title} role={currentUser?.role} />
                      </ProtectedRoute>
                    }
                  />
                ))}

                {/* 404 Fallback */}
                <Route
                  path="*"
                  element={
                    <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
                      <h3 className="text-lg font-bold text-slate-900">Page Not Found</h3>
                      <p className="text-xs text-slate-500 mt-1">
                        The requested URL route does not exist in the THYO SOFTECH HRMS.
                      </p>
                    </div>
                  }
                />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </div>

          {/* Footer */}
          <footer className="border-t border-[#E2E8F0] bg-white py-4 px-6 text-center text-xs text-[#64748B]">
            THYO SOFTECH PVT LTD • TO HELP YOU OUT • Human Resource Management System (HRMS) • PostgreSQL & RBAC Enforced
          </footer>
        </main>
      </div>
    </div>
  );
}
