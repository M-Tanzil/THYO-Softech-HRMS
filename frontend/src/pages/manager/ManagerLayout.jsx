
import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { getCurrentUser } from "../../services/storage/currentUser";
import {
  LayoutDashboard,
  UsersRound,
  CalendarCheck,
  CalendarClock,
  UserRound,
  Menu,
  Bell,
  Settings,
  Clock,
  ClipboardList,
  BarChart3,
  CalendarDays,
  FileText,
  CheckCircle,
  LogOut,
} from "lucide-react";

function ManagerLayout() {
  const [collapsed, setCollapsed] = useState(false);

  const [profile, setProfile] = useState(() => {
    const user = getCurrentUser() || {};
    return {
      name: user.name || "Manager",
      email: user.email || user.role || "Manager Portal",
      photo: "",
    };
  });

  useEffect(() => {
    const loadProfile = () => {
      const user = getCurrentUser() || {};
      const storageKey = `thyo_profile_Manager_${
        user.id || user.email || user.employeeId || "default"
      }`;

      try {
        const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");

        setProfile({
          name: saved.name || user.name || "Manager",
          email: saved.email || user.email || user.role || "Manager Portal",
          photo: saved.photo || "",
        });
      } catch (error) {
        console.error("Could not load manager profile:", error);
        setProfile({
          name: user.name || "Manager",
          email: user.email || user.role || "Manager Portal",
          photo: "",
        });
      }
    };

    loadProfile();

    window.addEventListener("thyo-profile-updated", loadProfile);
    window.addEventListener("storage", loadProfile);

    return () => {
      window.removeEventListener("thyo-profile-updated", loadProfile);
      window.removeEventListener("storage", loadProfile);
    };
  }, []);

  const handleLogout = () => {
    // Preserve the project's existing logout behavior.
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    window.location.href = "/login";
  };

  const menuItems = [
    {
      name: "Dashboard",
      path: "/manager/dashboard",
      icon: LayoutDashboard,
      section: "Workspace",
    },
    {
      name: "My Team",
      path: "/manager/team",
      icon: UsersRound,
      section: "Workspace",
    },
    {
      name: "Attendance",
      path: "/manager/attendance",
      icon: CalendarCheck,
      section: "Workspace",
    },
    {
      name: "Leave Requests",
      path: "/manager/leave",
      icon: CalendarClock,
      section: "Workspace",
    },
    {
      name: "Shift Schedule",
      path: "/manager/shifts",
      icon: Clock,
      section: "Team Management",
    },
    {
      name: "Team Calendar",
      path: "/manager/calendar",
      icon: CalendarDays,
      section: "Team Management",
    },
    {
      name: "Task Management",
      path: "/manager/tasks",
      icon: ClipboardList,
      section: "Team Management",
    },
    {
      name: "Approvals",
      path: "/manager/approvals",
      icon: CheckCircle,
      section: "Team Management",
    },
    {
      name: "Team Performance",
      path: "/manager/performance",
      icon: BarChart3,
      section: "Insights",
    },
    {
      name: "Reports & Analytics",
      path: "/manager/reports",
      icon: FileText,
      section: "Insights",
    },
    {
      name: "My Profile",
      path: "/manager/profile",
      icon: UserRound,
      section: "My Account",
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
            <UsersRound size={23} />
          </div>

          {!collapsed && (
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold tracking-wide">
                THYO Softtech
              </h2>
              <p className="text-xs text-indigo-200">Manager Portal</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="manager-sidebar-nav min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-4">
          {sections.map((section) => (
            <div key={section} className="mb-6">
              {!collapsed && (
                <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300/80">
                  {section}
                </p>
              )}

              <nav className="space-y-2">
                {menuItems
                  .filter((item) => item.section === section)
                  .map((item) => {
                    const Icon = item.icon;

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
        <div className="shrink-0 border-t border-white/10 p-4">
          <NavLink
            to="/manager/notifications"
            title={collapsed ? "Notifications" : undefined}
            className={linkClass}
          >
            <Bell size={20} className="shrink-0" />
            {!collapsed && <span>Notifications</span>}
          </NavLink>

          <NavLink
            to="/manager/settings"
            title={collapsed ? "Settings" : undefined}
            className={`${linkClass} mt-2`}
          >
            <Settings size={20} className="shrink-0" />
            {!collapsed && <span>Settings</span>}
          </NavLink>

          {/* Saved profile card */}
          <div className="mt-4 border-t border-white/10 pt-4">
            <NavLink
              to="/manager/profile"
              title={collapsed ? "My Profile" : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl p-3 transition-all duration-200 ${
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
                    alt="Manager profile"
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

            <button
              type="button"
              onClick={handleLogout}
              title={collapsed ? "Logout" : undefined}
              className={`mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-200 transition hover:bg-red-500/15 hover:text-white ${
                collapsed ? "justify-center" : ""
              }`}
            >
              <LogOut size={20} className="shrink-0" />
              {!collapsed && <span>Logout</span>}
            </button>
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
                Manager Workspace
              </h1>
              <p className="hidden text-xs text-gray-500 sm:block">
                Manage your team and daily activities
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Notifications"
            onClick={() => {
              window.location.href = "/manager/notifications";
            }}
            className="relative rounded-xl border border-gray-200 p-2.5 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600"
          >
            <Bell size={20} />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-violet-500" />
          </button>
        </header>

        <main className="p-5 sm:p-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default ManagerLayout;
