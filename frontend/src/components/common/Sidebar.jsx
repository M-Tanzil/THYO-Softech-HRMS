import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeftRight,
  Award,
  BarChart3,
  Bell,
  Briefcase,
  BriefcaseBusiness,
  Building2,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CheckCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  Clock4,
  FileText,
  FolderOpen,
  Home,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Network,
  PlusCircle,
  Settings,
  Settings2,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserRound,
  UsersRound,
  Wallet,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import thyoLogo from '../../assets/logo.jpeg';

/**
 * Role-specific visual themes from team/feature/sidebar-integration
 * (AdminSidebar, ManagerLayout, EmployeeLayout), integrated with AuthContext.
 */
const ROLE_THEMES = {
  ADMIN: {
    subtitle: 'HR Management',
    portalTitle: 'Admin Portal',
    portalSubtext: 'Secure workspace',
    asideBg:
      'border-r border-indigo-300/10 bg-gradient-to-b from-[#171936] via-[#10152d] to-[#090d1d] shadow-2xl shadow-slate-950/30',
    brandBorder: 'border-white/[0.08]',
    brandBadge:
      'rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 shadow-lg shadow-violet-900/40 ring-1 ring-white/20',
    subtitleColor: 'text-indigo-300',
    sectionTitleColor: 'text-slate-500',
    activeItem:
      'bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white shadow-lg shadow-indigo-950/40 ring-1 ring-white/10',
    inactiveItem: 'text-slate-300 hover:bg-white/[0.07] hover:text-white',
    badgeClass: 'bg-purple-500/20 text-purple-200 border border-purple-400/30',
    showChevronHint: true,
    logoutBtn:
      'border border-red-400/10 bg-red-500/10 text-red-300 hover:border-red-400/30 hover:bg-red-500/20 hover:text-red-200'
  },
  MANAGER: {
    subtitle: 'Manager Portal',
    portalTitle: 'Manager Portal',
    portalSubtext: 'Team workspace',
    asideBg:
      'border-r border-indigo-300/10 bg-gradient-to-b from-[#111827] via-[#172554] to-[#312e81] shadow-2xl shadow-slate-950/30',
    brandBorder: 'border-white/10',
    brandBadge:
      'rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg ring-1 ring-white/15',
    subtitleColor: 'text-indigo-200',
    sectionTitleColor: 'text-indigo-300/80',
    activeItem:
      'bg-white/[0.12] text-white shadow-lg shadow-black/10 ring-1 ring-white/[0.08] before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-full before:bg-violet-400',
    inactiveItem: 'text-slate-300 hover:bg-white/[0.07] hover:text-white',
    badgeClass: 'bg-amber-500/20 text-amber-200 border border-amber-400/30',
    showChevronHint: false,
    logoutBtn:
      'border border-red-400/10 bg-red-500/10 text-red-200 hover:bg-red-500/20 hover:text-white'
  },
  EMPLOYEE: {
    subtitle: 'Employee Portal',
    portalTitle: 'Employee Portal',
    portalSubtext: 'Self-service workspace',
    asideBg:
      'border-r border-indigo-300/10 bg-gradient-to-b from-[#111827] via-[#172554] to-[#312e81] shadow-2xl shadow-slate-950/30',
    brandBorder: 'border-white/10',
    brandBadge:
      'rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg ring-1 ring-white/15',
    subtitleColor: 'text-indigo-200',
    sectionTitleColor: 'text-indigo-300/80',
    activeItem:
      'bg-white/[0.12] text-white shadow-lg shadow-black/10 ring-1 ring-white/[0.08] before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-full before:bg-violet-400',
    inactiveItem: 'text-slate-300 hover:bg-white/[0.07] hover:text-white',
    badgeClass: 'bg-sky-500/20 text-sky-200 border border-sky-400/30',
    showChevronHint: false,
    logoutBtn:
      'border border-red-400/10 bg-red-500/10 text-red-200 hover:bg-red-500/20 hover:text-white'
  }
};

/**
 * Merged navigation combining ALL existing team menu items from
 * team/feature/sidebar-integration with the six HRMS modules
 * (Leave Management, Holidays, Recruitment, Performance Management, WFH, Communication),
 * mapped to their actual existing routes and role-based permissions.
 */
const ROLE_SECTIONS = {
  ADMIN: [
    {
      title: 'Main Menu',
      items: [
        { label: 'Dashboard', to: '/admin/dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
        { label: 'Employees', to: '/admin/employees', path: '/admin/employees', icon: UsersRound },
        { label: 'Attendance', to: '/admin/attendance', path: '/admin/attendance', icon: CalendarCheck },
        {
          label: 'Leave Management',
          to: '/leave?tab=approvalQueue',
          path: '/leave',
          tab: 'approvalQueue',
          icon: CalendarClock
        },
        {
          label: 'Leave Policies',
          to: '/leave?tab=policies',
          path: '/leave',
          tab: 'policies',
          icon: FileText
        },
        { label: 'Holidays', to: '/holidays', path: '/holidays', icon: CalendarDays },
        {
          label: 'Work From Home',
          to: '/wfh?tab=approvalQueue',
          path: '/wfh',
          tab: 'approvalQueue',
          icon: Home
        }
      ]
    },
    {
      title: 'Organization',
      items: [
        { label: 'Company & Branches', to: '/admin/organization', path: '/admin/organization', icon: Building2 },
        { label: 'Departments', to: '/admin/departments', path: '/admin/departments', icon: Network },
        { label: 'Designations', to: '/admin/designations', path: '/admin/designations', icon: BriefcaseBusiness },
        { label: 'Shifts', to: '/admin/shifts', path: '/admin/shifts', icon: Clock4 }
      ]
    },
    {
      title: 'Recruitment & ATS',
      items: [
        { label: 'Job Postings', to: '/recruitment?tab=jobs', path: '/recruitment', tab: 'jobs', icon: Briefcase },
        {
          label: 'Candidate Pipeline',
          to: '/recruitment?tab=candidates',
          path: '/recruitment',
          tab: 'candidates',
          icon: UsersRound
        },
        {
          label: 'Interviews',
          to: '/recruitment?tab=interviews',
          path: '/recruitment',
          tab: 'interviews',
          icon: CalendarClock
        },
        {
          label: 'Offers & Hiring',
          to: '/recruitment?tab=offers',
          path: '/recruitment',
          tab: 'offers',
          icon: Award
        }
      ]
    },
    {
      title: 'Performance Management',
      items: [
        {
          label: 'Appraisal Cycles',
          to: '/performance?tab=cycles',
          path: '/performance',
          tab: 'cycles',
          icon: Clock4
        },
        {
          label: 'Organization Goals',
          to: '/performance?tab=goals',
          path: '/performance',
          tab: 'goals',
          icon: TrendingUp
        },
        {
          label: 'Appraisal Reviews',
          to: '/performance?tab=reviews',
          path: '/performance',
          tab: 'reviews',
          icon: CheckCircle2
        },
        {
          label: 'Kudos & Feedback',
          to: '/performance?tab=kudos',
          path: '/performance',
          tab: 'kudos',
          icon: Sparkles
        }
      ]
    },
    {
      title: 'Communication',
      items: [
        { label: 'Announcements', to: '/announcements', path: '/announcements', icon: Megaphone },
        {
          label: 'Notifications',
          to: '/notifications',
          path: '/notifications',
          icon: Bell,
          showUnreadBadge: true
        }
      ]
    },
    {
      title: 'Management',
      items: [
        { label: 'Users & Roles', to: '/admin/users-roles', path: '/admin/users-roles', icon: ShieldCheck },
        { label: 'Permissions', to: '/admin/permissions', path: '/admin/permissions', icon: KeyRound },
        { label: 'Delegations', to: '/admin/delegations', path: '/admin/delegations', icon: ArrowLeftRight },
        { label: 'Payroll', to: '/admin/payroll', path: '/admin/payroll', icon: Wallet },
        { label: 'Settings', to: '/admin/settings', path: '/admin/settings', icon: Settings2 },
        { label: 'My Profile', to: '/admin/profile', path: '/admin/profile', icon: UserRound }
      ]
    }
  ],
  MANAGER: [
    {
      title: 'Workspace',
      items: [
        { label: 'Dashboard', to: '/manager/dashboard', path: '/manager/dashboard', icon: LayoutDashboard },
        { label: 'My Team', to: '/manager/team', path: '/manager/team', icon: UsersRound },
        { label: 'Attendance', to: '/manager/attendance', path: '/manager/attendance', icon: CalendarCheck },
        {
          label: 'Leave Requests',
          to: '/leave?tab=approvalQueue',
          path: '/leave',
          tab: 'approvalQueue',
          icon: CalendarClock
        },
        { label: 'My Leaves', to: '/leave?tab=my', path: '/leave', tab: 'my', icon: CalendarCheck },
        {
          label: 'WFH Approvals',
          to: '/wfh?tab=approvalQueue',
          path: '/wfh',
          tab: 'approvalQueue',
          icon: Home
        },
        { label: 'My WFH', to: '/wfh?tab=my', path: '/wfh', tab: 'my', icon: PlusCircle },
        { label: 'Holidays', to: '/holidays', path: '/holidays', icon: CalendarDays }
      ]
    },
    {
      title: 'Team Management',
      items: [
        { label: 'Shift Schedule', to: '/manager/shifts', path: '/manager/shifts', icon: Clock },
        { label: 'Team Calendar', to: '/manager/calendar', path: '/manager/calendar', icon: CalendarDays },
        { label: 'Task Management', to: '/tasks', path: '/tasks', icon: ClipboardList },
        { label: 'Approvals', to: '/manager/approvals', path: '/manager/approvals', icon: CheckCircle }
      ]
    },
    {
      title: 'Recruitment',
      items: [
        { label: 'Job Postings', to: '/recruitment?tab=jobs', path: '/recruitment', tab: 'jobs', icon: Briefcase },
        {
          label: 'Candidate Pipeline',
          to: '/recruitment?tab=candidates',
          path: '/recruitment',
          tab: 'candidates',
          icon: UsersRound
        },
        {
          label: 'Interviews',
          to: '/recruitment?tab=interviews',
          path: '/recruitment',
          tab: 'interviews',
          icon: CalendarClock
        }
      ]
    },
    {
      title: 'Insights & Performance',
      items: [
        {
          label: 'Team Performance',
          to: '/performance?tab=reviews',
          path: '/performance',
          tab: 'reviews',
          icon: BarChart3
        },
        {
          label: 'Department Goals',
          to: '/performance?tab=goals',
          path: '/performance',
          tab: 'goals',
          icon: TrendingUp
        },
        {
          label: 'Kudos & Feedback',
          to: '/performance?tab=kudos',
          path: '/performance',
          tab: 'kudos',
          icon: Sparkles
        },
        { label: 'Reports & Analytics', to: '/tasks/reports', path: '/tasks/reports', icon: FileText }
      ]
    },
    {
      title: 'Communication',
      items: [
        { label: 'Announcements', to: '/announcements', path: '/announcements', icon: Megaphone },
        {
          label: 'Notifications',
          to: '/notifications',
          path: '/notifications',
          icon: Bell,
          showUnreadBadge: true
        }
      ]
    },
    {
      title: 'My Account',
      items: [
        { label: 'My Profile', to: '/manager/profile', path: '/manager/profile', icon: UserRound },
        { label: 'Settings', to: '/manager/settings', path: '/manager/settings', icon: Settings }
      ]
    }
  ],
  EMPLOYEE: [
    {
      title: 'My Workspace',
      items: [
        { label: 'Dashboard', to: '/employee/dashboard', path: '/employee/dashboard', icon: LayoutDashboard },
        { label: 'My Attendance', to: '/employee/attendance', path: '/employee/attendance', icon: CalendarCheck },
        { label: 'My Leave', to: '/leave?tab=my', path: '/leave', tab: 'my', icon: CalendarClock },
        {
          label: 'Apply Leave',
          to: '/leave?tab=my&action=apply',
          path: '/leave',
          tab: 'my',
          action: 'apply',
          icon: PlusCircle
        },
        { label: 'My WFH', to: '/wfh?tab=my', path: '/wfh', tab: 'my', icon: Home },
        {
          label: 'Apply WFH',
          to: '/wfh?tab=my&action=apply',
          path: '/wfh',
          tab: 'my',
          action: 'apply',
          icon: PlusCircle
        },
        { label: 'Holidays', to: '/holidays', path: '/holidays', icon: CalendarDays },
        { label: 'My Calendar', to: '/employee/calendar', path: '/employee/calendar', icon: CalendarDays }
      ]
    },
    {
      title: 'My Work',
      items: [
        { label: 'My Tasks', to: '/my-tasks', path: '/my-tasks', icon: ClipboardList },
        { label: 'My Shift Schedule', to: '/employee/shifts', path: '/employee/shifts', icon: Clock },
        { label: 'My Documents', to: '/employee/documents', path: '/employee/documents', icon: FileText },
        { label: 'My Payslips', to: '/employee/payslips', path: '/employee/payslips', icon: Wallet }
      ]
    },
    {
      title: 'Performance & Careers',
      items: [
        {
          label: 'My Goals & Progress',
          to: '/performance?tab=goals',
          path: '/performance',
          tab: 'goals',
          icon: TrendingUp
        },
        {
          label: 'My Self-Appraisal',
          to: '/performance?tab=reviews',
          path: '/performance',
          tab: 'reviews',
          icon: CheckCircle2
        },
        {
          label: 'Kudos & Feedback',
          to: '/performance?tab=kudos',
          path: '/performance',
          tab: 'kudos',
          icon: Sparkles
        },
        { label: 'Job Openings', to: '/recruitment?tab=jobs', path: '/recruitment', tab: 'jobs', icon: Briefcase }
      ]
    },
    {
      title: 'Communication',
      items: [
        { label: 'Announcements', to: '/announcements', path: '/announcements', icon: Megaphone },
        {
          label: 'Notifications',
          to: '/notifications',
          path: '/notifications',
          icon: Bell,
          showUnreadBadge: true
        }
      ]
    },
    {
      title: 'My Account',
      items: [
        { label: 'My Profile', to: '/employee/profile', path: '/employee/profile', icon: UserRound },
        { label: 'My Files', to: '/employee/files', path: '/employee/files', icon: FolderOpen },
        { label: 'Settings', to: '/employee/settings', path: '/employee/settings', icon: Settings }
      ]
    }
  ]
};

function getInitials(user) {
  const source = user?.fullName || user?.name || user?.username || 'TS';
  const parts = String(source).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'TS';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function Sidebar({ isOpen = false, onClose, collapsed: controlledCollapsed, onToggleCollapse }) {
  const { activeRole, currentUser, logout, unreadCount } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [internalCollapsed, setInternalCollapsed] = useState(false);

  const compact = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;
  const handleToggleCollapse = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setInternalCollapsed((prev) => !prev);
    }
  };

  const rawRole = String(activeRole || currentUser?.role || 'EMPLOYEE').toUpperCase();
  const role = ROLE_THEMES[rawRole] ? rawRole : 'EMPLOYEE';
  const theme = ROLE_THEMES[role];
  const sections = ROLE_SECTIONS[role] || ROLE_SECTIONS.EMPLOYEE;

  const isItemActive = (item) => {
    if (item.path === '/tasks') {
      return (
        location.pathname === '/tasks' ||
        (location.pathname.startsWith('/tasks/') && location.pathname !== '/tasks/reports')
      );
    }
    if (item.path === '/my-tasks') {
      return location.pathname === '/my-tasks' || location.pathname.startsWith('/my-tasks/');
    }
    if (location.pathname !== item.path) return false;
    if (!item.tab && !item.action) return true;

    const searchParams = new URLSearchParams(location.search);
    const activeTab = searchParams.get('tab');
    const activeAction = searchParams.get('action');

    if (item.action) {
      return activeAction === item.action && (!item.tab || !activeTab || activeTab === item.tab);
    }

    if (activeAction) return false;

    if (!activeTab) {
      if (item.path === '/leave' || item.path === '/wfh') {
        return role === 'EMPLOYEE' ? item.tab === 'my' : item.tab === 'approvalQueue';
      }
      if (item.path === '/performance') return item.tab === 'goals';
      if (item.path === '/recruitment') return item.tab === 'jobs';
    }

    return activeTab === item.tab;
  };

  const handleLogout = async () => {
    if (onClose) onClose();
    await logout();
    navigate('/login', { replace: true });
  };

  const BrandIcon = role === 'MANAGER' ? UsersRound : role === 'EMPLOYEE' ? UserRound : null;

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        id="hrms-role-sidebar"
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col overflow-hidden text-white transition-all duration-300 ${
          theme.asideBg
        } ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:max-w-none ${
          compact ? 'lg:w-20' : 'lg:w-64'
        }`}
      >
        {/* Brand Header */}
        <div
          className={`flex shrink-0 items-center border-b ${theme.brandBorder} ${
            compact
              ? 'h-20 justify-between px-4 lg:h-auto lg:flex-col lg:justify-center lg:gap-1.5 lg:px-2 lg:py-3'
              : 'h-20 justify-between px-4'
          }`}
        >
          <div className="flex min-w-0 items-center gap-3">
            {role === 'ADMIN' ? (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1 shadow-lg shadow-black/20 ring-1 ring-white/20">
                <img
                  src={thyoLogo}
                  alt="THYO Softtech Logo"
                  className="h-full w-full object-contain"
                />
              </div>
            ) : (
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center text-base font-black text-white ${theme.brandBadge}`}
              >
                {BrandIcon ? <BrandIcon size={21} /> : 'T'}
              </div>
            )}

            <div className={`min-w-0 ${compact ? 'lg:hidden' : ''}`}>
              <p className="truncate text-base font-bold tracking-tight text-white">
                THYO Softtech
              </p>
              <p
                className={`mt-0.5 truncate text-[9px] font-semibold uppercase tracking-[0.2em] ${theme.subtitleColor}`}
              >
                {theme.subtitle}
              </p>
            </div>
          </div>

          {/* Desktop Collapse/Expand Toggle */}
          <button
            type="button"
            onClick={handleToggleCollapse}
            title={compact ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={compact ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden shrink-0 rounded-lg p-1.5 text-slate-300 transition hover:bg-white/10 hover:text-white lg:flex items-center justify-center cursor-pointer"
          >
            {compact ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
          </button>

          {/* Mobile Close Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
            className="rounded-lg p-2 text-slate-300 transition hover:bg-white/10 hover:text-white lg:hidden cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Navigation Sections */}
        <nav className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-3 pb-4 pt-2 [scrollbar-color:#34385a_transparent] [scrollbar-width:thin]">
          {sections.map((section) => (
            <section key={section.title} className="mt-5 first:mt-2">
              <p
                className={`mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.2em] ${
                  theme.sectionTitleColor
                } ${compact ? 'lg:hidden' : ''}`}
              >
                {section.title}
              </p>

              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isItemActive(item);

                  return (
                    <NavLink
                      key={`${section.title}:${item.to}`}
                      to={item.to}
                      title={compact ? item.label : undefined}
                      onClick={() => {
                        if (onClose) onClose();
                      }}
                      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition-all duration-200 ${
                        compact ? 'lg:justify-center lg:px-2' : ''
                      } ${active ? theme.activeItem : theme.inactiveItem}`}
                    >
                      <Icon className="h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover:scale-105" />

                      <span className={`truncate flex-1 ${compact ? 'lg:hidden' : ''}`}>
                        {item.label}
                      </span>

                      {item.showUnreadBadge && unreadCount > 0 && (
                        <span
                          className={`inline-flex items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white ${
                            compact ? 'lg:absolute lg:right-1.5 lg:top-1.5 lg:px-1' : ''
                          }`}
                        >
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}

                      {theme.showChevronHint && !item.showUnreadBadge && (
                        <ChevronRight
                          className={`ml-auto h-4 w-4 opacity-0 transition-opacity group-hover:opacity-70 ${
                            compact ? 'lg:hidden' : ''
                          }`}
                        />
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </section>
          ))}
        </nav>

        {/* Footer: Role / Profile Card + AuthContext Logout */}
        <div className={`shrink-0 border-t ${theme.brandBorder} p-3`}>
          {role === 'ADMIN' ? (
            <div
              className={`flex items-center gap-3 rounded-xl border border-white/[0.06] bg-gradient-to-r from-indigo-500/[0.10] to-purple-500/[0.10] p-2.5 ${
                compact ? 'lg:justify-center' : ''
              }`}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-300 ring-1 ring-indigo-300/20">
                <ShieldCheck size={18} />
              </div>

              <div className={`min-w-0 flex-1 ${compact ? 'lg:hidden' : ''}`}>
                <div className="flex items-center justify-between gap-1.5">
                  <p className="truncate text-xs font-semibold text-slate-100">
                    {currentUser?.fullName || currentUser?.username || theme.portalTitle}
                  </p>
                  <span
                    id="user-role-badge"
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase ${theme.badgeClass}`}
                  >
                    {role}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-[10px] text-slate-400">
                  {currentUser?.department || 'THYO Softtech'} • {theme.portalSubtext}
                </p>
              </div>
            </div>
          ) : (
            <div
              className={`flex items-center gap-3 rounded-xl bg-white/[0.06] p-2.5 ring-1 ring-white/[0.08] ${
                compact ? 'lg:justify-center' : ''
              }`}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-500/30 text-xs font-bold text-indigo-100 ring-1 ring-white/15">
                {getInitials(currentUser)}
              </div>

              <div className={`min-w-0 flex-1 ${compact ? 'lg:hidden' : ''}`}>
                <div className="flex items-center justify-between gap-1.5">
                  <p className="truncate text-xs font-semibold text-white">
                    {currentUser?.fullName || currentUser?.name || currentUser?.username}
                  </p>
                  <span
                    id="user-role-badge"
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase ${theme.badgeClass}`}
                  >
                    {role}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-[10px] text-slate-300">
                  {currentUser?.department || 'THYO Softtech'} •{' '}
                  {currentUser?.designation || currentUser?.position || theme.portalTitle}
                </p>
              </div>
            </div>
          )}

          {/* Logout adapted to AuthContext.jsx */}
          <button
            type="button"
            onClick={handleLogout}
            title={compact ? 'Logout' : undefined}
            className={`mt-2.5 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-200 cursor-pointer ${
              theme.logoutBtn
            } ${compact ? 'lg:justify-center' : ''}`}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className={compact ? 'lg:hidden' : ''}>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export default React.memo(Sidebar);
