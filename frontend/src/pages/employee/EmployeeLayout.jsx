
import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { getCurrentUser } from "../../services/storage/currentUser";
import { clearTokens } from "../../services/storage/authStorage";
import {
  LayoutDashboard,
  CalendarCheck,
  CalendarClock,
  FileText,
  UserRound,
  Menu,
  Bell,
  CalendarDays,
  Clock,
  Wallet,
  ClipboardList,
  Settings,
  FolderOpen,
  LogOut,
} from "lucide-react";

function EmployeeLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [profile, setProfile] = useState(() => {
    const user = getCurrentUser() || {};
    return {
      user,
      name: user.name || "",
      email: user.email || "",
      photo: "",
    };
  });

  // Read the saved profile and refresh when ProfilePage saves it.
  useEffect(() => {
    const loadProfile = () => {
      const user = getCurrentUser() || {};
      const storageKey = `thyo_profile_Employee_${
        user.id || user.email || user.employeeId || "default"
      }`;

      let saved = {};

      try {
        saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
      } catch (error) {
        console.error("Could not load sidebar profile:", error);
      }

      setProfile({
        user,
        name: saved.name || user.name || "Employee",
        email: saved.email || user.email || user.role || "Employee Portal",
        photo: saved.photo || "",
      });
    };

    loadProfile();

    // Respond to profile saves in this tab and other tabs.
    window.addEventListener("thyo-profile-updated", loadProfile);
    window.addEventListener("storage", loadProfile);

    return () => {
      window.removeEventListener("thyo-profile-updated", loadProfile);
      window.removeEventListener("storage", loadProfile);
    };
  }, []);

  const handleLogout = () => {
    clearTokens();
    window.location.href = "/login";
  };

  const menuItems = [
    {
      name: "Dashboard",
      path: "/employee/dashboard",
      icon: LayoutDashboard,
      section: "My Workspace",
      active: true,
    },
    {
      name: "My Attendance",
      path: "/employee/attendance",
      icon: CalendarCheck,
      section: "My Workspace",
      active: true,
    },
    {
  name: "My Overtime",
  path: "/employee/overtime",
  icon: Clock,
  section: "My Workspace",
  active: true,
},
    {
      name: "My Leave",
      path: "/employee/leave",
      icon: CalendarClock,
      section: "My Workspace",
      active: true,
    },
    {
      name: "My Calendar",
      path: "/employee/calendar",
      icon: CalendarDays,
      section: "My Workspace",
      active: true,
    },
    {
      name: "My Tasks",
      path: "/employee/tasks",
      icon: ClipboardList,
      section: "My Work",
      active: true,
    },
    {
      name: "My Shift Schedule",
      path: "/employee/shifts",
      icon: Clock,
      section: "My Work",
      active: true,
    },
    {
      name: "My Documents",
      path: "/employee/documents",
      icon: FileText,
      section: "My Work",
      active: true,
    },
    {
      name: "My Payslips",
      path: "/employee/payslips",
      icon: Wallet,
      section: "My Work",
      active: true,
    },
    {
      name: "My Profile",
      path: "/employee/profile",
      icon: UserRound,
      section: "My Account",
      active: true,
    },
    {
      name: "My Files",
      path: "/employee/files",
      icon: FolderOpen,
      section: "My Account",
      active: true,
    },
  ];

  const sections = [...new Set(menuItems.map((item) => item.section))];

  const linkClass = ({ isActive }) =>
    `group relative flex items-center gap-3 rounded-xl px-3 py-2.5
    text-sm font-medium transition-all duration-200 ease-out
    ${collapsed ? "justify-center" : ""}
    ${
      isActive
        ? "bg-white/[0.12] text-white shadow-lg shadow-black/10 ring-1 ring-white/[0.08] before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-full before:bg-violet-400"
        : "text-slate-300 hover:bg-white/[0.07] hover:text-white"
    }`;

  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col
        bg-gradient-to-b from-[#111827] via-[#172554] to-[#312e81]
        text-white transition-all duration-300
        ${collapsed ? "w-20" : "w-64"}`}
      >
        {/* Brand */}
        <div className="flex h-20 shrink-0 items-center gap-3 border-b border-white/10 px-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
            <UserRound size={23} />
          </div>

          {!collapsed && (
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold tracking-wide">
                THYO Softtech
              </h2>
              <p className="text-xs text-indigo-200">Employee Portal</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="employee-sidebar-nav min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-4">
          {sections.map((section) => (
            <div key={section} className="mb-5">
              {!collapsed && (
                <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300/80">
                  {section}
                </p>
              )}

              <nav className="space-y-1.5">
                {menuItems
                  .filter((item) => item.section === section)
                  .map((item) => {
                    const Icon = item.icon;

                    if (!item.active) {
                      return (
                        <div
                          key={item.path}
                          title={`${item.name} — coming soon`}
                          aria-disabled="true"
                          className={`flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400/70 ${
                            collapsed ? "justify-center" : ""
                          }`}
                        >
                          <Icon size={20} className="shrink-0" />
                          {!collapsed && <span>{item.name}</span>}
                        </div>
                      );
                    }

                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        title={collapsed ? item.name : undefined}
                        className={linkClass}
                      >
                        <Icon size={20} className="shrink-0" />
                        {!collapsed && <span>{item.name}</span>}
                      </NavLink>
                    );
                  })}
              </nav>
            </div>
          ))}
        </div>

        {/* Bottom actions */}
        <div className="shrink-0 border-t border-white/10 p-3">
          <NavLink
            to="/employee/notifications"
            title={collapsed ? "Notifications" : undefined}
            className={linkClass}
          >
            <Bell size={20} className="shrink-0" />
            {!collapsed && <span>Notifications</span>}
          </NavLink>

          <NavLink
            to="/employee/settings"
            title={collapsed ? "Settings" : undefined}
            className={`${linkClass} mt-1.5`}
          >
            <Settings size={20} className="shrink-0" />
            {!collapsed && <span>Settings</span>}
          </NavLink>

          <button
            type="button"
            onClick={handleLogout}
            title={collapsed ? "Logout" : undefined}
            className={`mt-1.5 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-200 transition hover:bg-red-500/15 hover:text-white ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <LogOut size={20} className="shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>

          {/* Saved employee profile */}
          <div className="mt-3 border-t border-white/10 pt-3">
            <NavLink
              to="/employee/profile"
              title={collapsed ? "My Profile" : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl p-2.5 transition-all duration-200 ${
                  isActive
                    ? "bg-white/[0.12] ring-1 ring-white/[0.08]"
                    : "hover:bg-white/[0.07]"
                } ${collapsed ? "justify-center" : ""}`
              }
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-500/20 text-indigo-200 ring-1 ring-white/10">
                {profile.photo ? (
                  <img
                    src={profile.photo}
                    alt="Your profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UserRound size={21} />
                )}
              </div>

              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">
                    {profile.name}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {profile.email}
                  </p>
                </div>
              )}
            </NavLink>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div
        className={`min-h-screen transition-all duration-300 ${
          collapsed ? "ml-20" : "ml-64"
        }`}
      >
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-gray-200 bg-white/95 px-5 backdrop-blur-md sm:px-7">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setCollapsed((value) => !value)}
              className="rounded-xl border border-gray-200 p-2.5 text-gray-600 transition hover:bg-indigo-50 hover:text-indigo-600"
              aria-label="Toggle sidebar"
            >
              <Menu size={21} />
            </button>

            <div>
              <h1 className="text-lg font-bold text-gray-800">
                Employee Workspace
              </h1>
              <p className="hidden text-xs text-gray-500 sm:block">
                Your work information in one place
              </p>
            </div>
          </div>

          <NavLink
            to="/employee/notifications"
            aria-label="Notifications"
            className="relative rounded-xl border border-gray-200 p-2.5 text-gray-600 transition hover:bg-indigo-50 hover:text-indigo-600"
          >
            <Bell size={20} />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-violet-500" />
          </NavLink>
        </header>

        <main className="p-5 sm:p-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default EmployeeLayout;
