import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  CheckSquare,
  PlusCircle,
  BarChart3,
  UserCheck,
  Megaphone,
  Bell,
  Layers,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar({ isOpen, onClose }) {
  const { isManagerOrAdmin, activeRole } = useAuth();

  const navLinkClasses = ({ isActive }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-sky-50 text-sky-700 font-semibold'
        : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
    }`;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-16 bottom-0 left-0 z-40 w-64 bg-white border-r border-slate-200 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } flex flex-col justify-between`}
      >
        <div className="p-4 space-y-6 overflow-y-auto">
          {/* Main Navigation Group: Strictly for Admin, HR, and Manager */}
          {isManagerOrAdmin && (
            <div>
              <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Task Administration</span>
                <span className="text-[10px] text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded font-bold">
                  {activeRole}
                </span>
              </div>
              <nav className="space-y-1">
                <NavLink to="/tasks" end className={navLinkClasses} onClick={onClose}>
                  <CheckSquare className="w-4 h-4 text-sky-600" />
                  <span>All Tasks</span>
                </NavLink>

                <NavLink to="/tasks/create" className={navLinkClasses} onClick={onClose}>
                  <PlusCircle className="w-4 h-4 text-emerald-600" />
                  <span>Create Task</span>
                </NavLink>

                <NavLink to="/tasks/reports" className={navLinkClasses} onClick={onClose}>
                  <BarChart3 className="w-4 h-4 text-purple-600" />
                  <span>Task Reports</span>
                </NavLink>
              </nav>
            </div>
          )}

          {/* Employee Workspace Group (Accessible to Everyone) */}
          <div>
            <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Employee Workspace
            </div>
            <nav className="space-y-1">
              <NavLink to="/my-tasks" className={navLinkClasses} onClick={onClose}>
                <UserCheck className="w-4 h-4 text-indigo-600" />
                <span>My Assigned Tasks</span>
              </NavLink>

              <NavLink to="/notifications" className={navLinkClasses} onClick={onClose}>
                <Bell className="w-4 h-4 text-amber-600" />
                <span>Notifications</span>
              </NavLink>
            </nav>
          </div>

          {/* Communication Group */}
          <div>
            <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Company Updates
            </div>
            <nav className="space-y-1">
              <NavLink to="/announcements" className={navLinkClasses} onClick={onClose}>
                <Megaphone className="w-4 h-4 text-blue-600" />
                <span>Announcements</span>
              </NavLink>
            </nav>
          </div>
        </div>

        {/* Integration Callout Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="rounded-lg bg-sky-50/80 p-3 border border-sky-100 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-sky-900 mb-1">
              <Layers className="w-3.5 h-3.5 text-sky-600" />
              <span>HRMS RBAC Security</span>
            </div>
            <p className="text-[11px] text-sky-700/90 leading-relaxed">
              Permissions enforced across backend APIs and UI controls.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
