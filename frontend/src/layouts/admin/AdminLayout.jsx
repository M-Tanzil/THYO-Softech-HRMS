import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { getCurrentUser } from "../../services/storage/currentUser";
import {
  Bell,
  ChevronDown,
  Menu,
  Search,
  UserRound,
} from "lucide-react";

import AdminSidebar from "./AdminSidebar";

function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);

  const [profile, setProfile] = useState({
    name: "Administrator",
    photo: "",
    designation: "Super Admin",
  });

  useEffect(() => {
    const user = getCurrentUser();

    const userKey =
      user?.id || user?.email || user?.employeeId || "default";

    const profileKey = `thyo_profile_Admin_${userKey}`;

    const loadProfile = () => {
      try {
        const savedProfile = localStorage.getItem(profileKey);

        if (!savedProfile) return;

        const parsedProfile = JSON.parse(savedProfile);

        setProfile((previous) => ({
          ...previous,
          ...parsedProfile,
        }));
      } catch (error) {
        console.error("Unable to load Admin profile:", error);
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

  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      <AdminSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((value) => !value)}
      />

      {/* Main area */}
      <div
        className={`min-h-screen transition-all duration-300 ${collapsed ? "lg:pl-20" : "lg:pl-64"
          }`}
      >
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-gray-200 bg-white/95 px-5 backdrop-blur-md sm:px-7">
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition hover:bg-gray-50 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="hidden md:block">
              <p className="text-sm font-semibold text-gray-900">
                Good morning, {profile.name || "Admin"}
              </p>

              <p className="text-xs text-gray-400">
                Here's what's happening today.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="hidden lg:flex">
              <div className="flex h-10 w-64 items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3">
                <Search className="h-4 w-4 text-gray-400" />

                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Notification */}
            <button
              type="button"
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition hover:bg-gray-50"
            >
              <Bell className="h-[18px] w-[18px]" />

              <span className="absolute right-2.5 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            </button>

            {/* Profile */}
            <button
              type="button"
              className="flex items-center gap-3 rounded-xl px-2 py-1.5 transition hover:bg-gray-50"
            >
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#111827] text-white">
                {profile.photo ? (
                  <img
                    src={profile.photo}
                    alt="Admin profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-semibold">
                    {(profile.name || "Administrator")
                      .split(" ")
                      .map((part) => part[0])
                      .join("")
                      .toUpperCase()}
                  </span>
                )}
              </div>

              <div className="hidden text-left sm:block">
                <p className="text-xs font-semibold text-gray-800">
                  {profile.name || "Administrator"}
                </p>

                <p className="text-[10px] text-gray-400">
                  {profile.designation || profile.role || "Super Admin"}
                </p>
              </div>

              <ChevronDown className="hidden h-4 w-4 text-gray-400 sm:block" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="p-5 sm:p-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;