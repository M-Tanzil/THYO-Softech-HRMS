import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, ChevronDown, LogOut, UserCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from '../notifications/NotificationBell';
import thyoLogo from '../../assets/logo.jpeg';

function Navbar({ onMenuToggle }) {
  const {
    currentUser,
    activeRole,
    logout
  } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const roleColors = {
    ADMIN: 'bg-purple-50 text-purple-700 border-purple-200',
    MANAGER: 'bg-amber-50 text-amber-700 border-amber-200',
    EMPLOYEE: 'bg-indigo-50 text-indigo-700 border-indigo-200'
  };

  const navigate = useNavigate();
  const handleLogout = async () => {
    setProfileOpen(false);
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-7 h-20">
        {/* Left: Mobile menu button & Branding */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuToggle}
            className="lg:hidden flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition focus:outline-none cursor-pointer"
            aria-label="Toggle menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <img
              src={thyoLogo}
              alt="THYO SOFTECH Logo"
              className="w-[110px] h-[44px] object-contain shrink-0 lg:hidden"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-none">
                  {currentUser?.fullName ? `Welcome, ${currentUser.fullName}` : 'THYO SOFTECH'}
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100">
                  HRMS
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                {currentUser?.department ? `${currentUser.department} • Enterprise HRMS Portal` : 'Enterprise HRMS Portal'}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Notification Bell & User Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Notification Bell Component */}
          <NotificationBell />

          {/* Authenticated User Profile & Logout */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-2 rounded-xl border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/40 transition-all text-left cursor-pointer focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
              title="View session profile"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-white font-bold text-xs flex items-center justify-center shadow-xs shrink-0">
                {currentUser?.fullName
                  ? currentUser.fullName
                      .split(' ')
                      .filter(Boolean)
                      .map((n) => n[0])
                      .join('')
                      .substring(0, 2)
                      .toUpperCase()
                  : 'TS'}
              </div>

              <div className="hidden sm:block">
                <div className="text-xs font-semibold text-slate-800 truncate max-w-[130px]">
                  {currentUser?.fullName || currentUser?.username}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded border ${
                      roleColors[activeRole] || roleColors.EMPLOYEE
                    }`}
                  >
                    {activeRole}
                  </span>
                  {currentUser?.department && (
                    <span className="text-[10px] text-slate-400">
                      • {currentUser.department}
                    </span>
                  )}
                </div>
              </div>

              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
            </button>

            {/* Profile & Logout Dropdown Menu */}
            {profileOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 py-3 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-4 pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-white font-bold text-sm flex items-center justify-center shadow-xs shrink-0">
                      {currentUser?.fullName
                        ? currentUser.fullName
                            .split(' ')
                            .filter(Boolean)
                            .map((n) => n[0])
                            .join('')
                            .substring(0, 2)
                            .toUpperCase()
                        : 'TS'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {currentUser?.fullName || currentUser?.username}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {currentUser?.email}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded border ${
                          roleColors[activeRole] || roleColors.EMPLOYEE
                        }`}>
                          {activeRole}
                        </span>
                        {currentUser?.employeeId && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            {currentUser.employeeId}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-4 py-2 text-[11px] text-slate-500 space-y-1">
                  {currentUser?.department && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Department:</span>
                      <span className="font-semibold text-slate-900">{currentUser.department}</span>
                    </div>
                  )}
                  {currentUser?.position && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Position:</span>
                      <span className="font-semibold text-slate-900">{currentUser.position}</span>
                    </div>
                  )}
                </div>

                <div className="px-2 pt-2 border-t border-slate-200 space-y-1">

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-rose-600" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default React.memo(Navbar);
