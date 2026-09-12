import React from 'react';
import { Menu, Shield, Users, Briefcase } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from '../notifications/NotificationBell';

export default function Navbar({ onMenuToggle }) {
  const { employees, activeEmpId, activeRole, currentUser, switchUser } = useAuth();

  const handleUserSelect = (e) => {
    const selectedEmpId = e.target.value;
    switchUser(selectedEmpId);
  };

  const handleRoleSelect = (e) => {
    const selectedRole = e.target.value;
    switchUser(activeEmpId, selectedRole);
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
      <div className="flex items-center justify-between px-4 lg:px-6 h-16">
        {/* Left: Mobile menu button & Branding */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg focus:outline-none"
            aria-label="Toggle menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sky-600 to-sky-800 flex items-center justify-center text-white font-bold text-base shadow-sm">
              TS
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-800 tracking-tight leading-none">
                  THYO SOFTECH
                </h1>
                <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-sky-100 text-sky-800">
                  HRMS
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Task Management Module</p>
            </div>
          </div>
        </div>

        {/* Right: RBAC Simulation Controls & Notification Bell */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Identity & Role Simulation Controls */}
          <div className="hidden sm:flex items-center gap-2 bg-slate-100/80 p-1.5 rounded-lg border border-slate-200/80 text-xs">
            {/* User Select */}
            <div className="flex items-center gap-1 text-slate-500 pl-1 font-medium">
              <Users className="w-3.5 h-3.5 text-sky-600" />
              <span>User:</span>
            </div>
            <select
              value={activeEmpId}
              onChange={handleUserSelect}
              className="bg-white border border-slate-200 rounded px-2 py-1 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
            >
              {employees.map((emp) => (
                <option key={emp.employeeId} value={emp.employeeId}>
                  {emp.employeeId} - {emp.fullName} ({emp.department})
                </option>
              ))}
            </select>

            {/* Role Select Dropdown (for testing strict RBAC) */}
            <div className="flex items-center gap-1 text-slate-500 pl-2 font-medium border-l border-slate-200">
              <Shield className="w-3.5 h-3.5 text-purple-600" />
              <span>Role:</span>
            </div>
            <select
              value={activeRole}
              onChange={handleRoleSelect}
              className={`border rounded px-2 py-1 text-xs font-bold focus:outline-none cursor-pointer ${
                activeRole === 'ADMIN'
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : activeRole === 'HR'
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : activeRole === 'MANAGER'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              <option value="ADMIN">ADMIN</option>
              <option value="HR">HR</option>
              <option value="MANAGER">MANAGER</option>
              <option value="EMPLOYEE">EMPLOYEE</option>
            </select>
          </div>

          {/* Notification Bell Component */}
          <NotificationBell />

          {/* User profile avatar and details */}
          <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 font-semibold text-xs flex items-center justify-center ring-1 ring-sky-200">
              {currentUser?.fullName
                ? currentUser.fullName.split(' ').map(n => n[0]).join('').substring(0, 2)
                : 'TS'}
            </div>
            <div className="hidden lg:block text-left">
              <div className="text-xs font-semibold text-slate-800 truncate max-w-[120px]">
                {currentUser?.fullName || activeEmpId}
              </div>
              <div className="text-[10px] text-slate-400 leading-tight flex items-center gap-1">
                <span className="font-semibold text-sky-700">{activeRole}</span>
                <span>•</span>
                <span>{currentUser?.department || 'IT'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
