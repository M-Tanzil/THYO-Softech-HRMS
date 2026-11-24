
import {
  LayoutDashboard,
  UsersRound,
  CalendarCheck,
  CalendarClock,
  Building2,
  Network,
  BriefcaseBusiness,
  Clock4,
  ShieldCheck,
  KeyRound,
  Wallet,
  Settings2,
  ChevronLeft,
  ChevronRight,
  UserRound,
  LogOut,
  ArrowLeftRight,
  X,
} from "lucide-react";

import { NavLink } from "react-router-dom";
import { clearTokens } from "../../services/storage/authStorage";

const mainItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/admin/dashboard" },
  { label: "Employees", icon: UsersRound, path: "/admin/employees" },
  { label: "Attendance", icon: CalendarCheck, path: "/admin/attendance" },
  { label: "Leave", icon: CalendarClock, path: "/admin/leave" },
];

const organizationItems = [
  { label: "Company & Branches", icon: Building2, path: "/admin/organization" },
  { label: "Departments", icon: Network, path: "/admin/departments" },
  { label: "Designations", icon: BriefcaseBusiness, path: "/admin/designations" },
  { label: "Shifts", icon: Clock4, path: "/admin/shifts" },
];

const managementItems = [
  { label: "Users & Roles", icon: ShieldCheck, path: "/admin/users-roles" },
  { label: "Permissions", icon: KeyRound, path: "/admin/permissions" },
  { label: "Delegations", icon: ArrowLeftRight, path: "/admin/delegations" },
  { label: "Payroll", icon: Wallet, path: "/admin/payroll" },
  { label: "Settings", icon: Settings2, path: "/admin/settings" },
  { label: "My Profile", icon: UserRound, path: "/admin/profile" },
];

function SidebarItem({ item, collapsed, onMobileClose }) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.path}
      title={collapsed ? item.label : undefined}
      onClick={onMobileClose}
      className={({ isActive }) =>
        [
          "group relative flex items-center gap-3 rounded-xl px-3 py-3",
          "text-sm font-medium transition-all duration-200",
          collapsed ? "justify-center" : "",
          isActive
            ? "bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white shadow-lg shadow-indigo-950/40 ring-1 ring-white/10"
            : "text-slate-300 hover:bg-white/[0.07] hover:text-white",
        ].join(" ")
      }
    >
      <Icon className="h-[21px] w-[21px] shrink-0 transition-all duration-300 group-hover:scale-110" />

      {!collapsed && <span className="truncate">{item.label}</span>}

      {!collapsed && (
        <span className="ml-auto text-lg leading-none opacity-0 transition-opacity group-hover:opacity-70">
          ›
        </span>
      )}
    </NavLink>
  );
}

function SidebarSection({ title, items, collapsed, onMobileClose }) {
  return (
    <section className="mt-7">
      {!collapsed && (
        <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
          {title}
        </p>
      )}

      <div className="space-y-1.5">
        {items.map((item) => (
          <SidebarItem
            key={item.path}
            item={item}
            collapsed={collapsed}
            onMobileClose={onMobileClose}
          />
        ))}
      </div>
    </section>
  );
}

function AdminSidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onMobileClose,
}) {
  const handleLogout = () => {
    clearTokens();
    window.location.replace("/login");
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={onMobileClose}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col overflow-hidden border-r border-indigo-300/10 bg-gradient-to-b from-[#171936] via-[#10152d] to-[#090d1d] shadow-2xl shadow-slate-950/30 transition-all duration-300
        ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0 lg:max-w-none lg:transition-[width]
        ${collapsed ? "lg:w-20" : "lg:w-64"}`}
      >
        {/* Brand */}
        <div
          className={`flex h-20 shrink-0 items-center border-b border-white/[0.08] ${
            collapsed ? "justify-center px-2" : "justify-between px-4"
          }`}
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-lg font-black text-white shadow-lg shadow-violet-900/40 ring-1 ring-white/20">
              T
            </div>

            {!collapsed && (
              <div className="min-w-0">
                <p className="whitespace-nowrap text-base font-bold tracking-tight text-white">
                  THYO Softtech
                </p>
                <p className="mt-1 whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.2em] text-indigo-300">
                  HR Management
                </p>
              </div>
            )}
          </div>

          {/* Desktop collapse */}
          <button
            type="button"
            onClick={onToggle}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`hidden shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white lg:block ${
              collapsed ? "absolute right-1 top-[5.25rem]" : "ml-1"
            }`}
          >
            {collapsed ? (
              <ChevronRight size={17} />
            ) : (
              <ChevronLeft size={17} />
            )}
          </button>

          {/* Mobile close */}
          <button
            type="button"
            onClick={onMobileClose}
            aria-label="Close sidebar"
            className="rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-x-hidden overflow-y-auto px-3 pb-5 pt-2 [scrollbar-color:#34385a_transparent] [scrollbar-width:thin]">
          <SidebarSection
            title="Main Menu"
            items={mainItems}
            collapsed={collapsed}
            onMobileClose={onMobileClose}
          />

          <SidebarSection
            title="Organization"
            items={organizationItems}
            collapsed={collapsed}
            onMobileClose={onMobileClose}
          />

          <SidebarSection
            title="Management"
            items={managementItems}
            collapsed={collapsed}
            onMobileClose={onMobileClose}
          />
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t border-white/[0.08] p-3">
          {/* Admin Portal */}
          <div
            className={`flex items-center gap-3 rounded-xl border border-white/[0.06] bg-gradient-to-r from-indigo-500/[0.10] to-purple-500/[0.10] p-3 ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-300 ring-1 ring-indigo-300/20">
              <ShieldCheck size={19} />
            </div>

            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-slate-100">
                  Admin Portal
                </p>
                <p className="mt-1 text-[10px] text-slate-400">
                  Secure workspace
                </p>
              </div>
            )}
          </div>

          {/* Logout */}
          <button
            type="button"
            onClick={handleLogout}
            title={collapsed ? "Logout" : undefined}
            className={`mt-3 flex w-full items-center gap-3 rounded-xl border border-red-400/10 bg-red-500/10 px-3 py-3 text-sm font-semibold text-red-300 transition-all duration-200 hover:border-red-400/30 hover:bg-red-500/20 hover:text-red-200 ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <LogOut className="h-5 w-5 shrink-0" />

            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

export default AdminSidebar;
