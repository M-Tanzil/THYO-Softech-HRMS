
import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
} from "lucide-react";
import { motion } from "motion/react";

import api from "../../services/api/axios";
import { saveTokens } from "../../services/storage/authStorage";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    if (!password.trim()) {
      setError("Please enter your password.");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/auth/login", {
        email: email.trim(),
        password,
      });

      const data = response.data;

      if (!data?.data?.accessToken || !data?.data?.refreshToken) {
        throw new Error("Invalid login response from server.");
      }

      const roles = data?.data?.user?.roles || [];

      const normalizedRoles = roles
        .map((role) => {
          const roleName =
            typeof role === "string" ? role : role?.name;

          return roleName
            ?.trim()
            .toUpperCase()
            .replace(/_/g, " ")
            .replace(/-/g, " ");
        })
        .filter(Boolean);

      const isAdmin = normalizedRoles.some(
        (role) =>
          role === "SUPER ADMIN" ||
          role === "HR ADMIN" ||
          role === "HR EXECUTIVE" ||
          role === "ADMIN" ||
          role.includes("SUPER ADMIN") ||
          role.includes("HR ADMIN") ||
          role.includes("HR EXECUTIVE")
      );

      const isManager = normalizedRoles.some(
        (role) =>
          role === "MANAGER" ||
          role === "MANAGER ROLE" ||
          role.includes("MANAGER")
      );

      const isEmployee = normalizedRoles.some(
        (role) =>
          role === "EMPLOYEE" ||
          role === "EMPLOYEE ROLE" ||
          role.includes("EMPLOYEE")
      );

      if (!isAdmin && !isManager && !isEmployee) {
        setError(
          "Your account does not have a valid HRMS role. Please contact the administrator."
        );
        return;
      }

      saveTokens({
        accessToken: data.data.accessToken,
        refreshToken: data.data.refreshToken,
      });

      if (isAdmin) {
        setSuccess("Login successful. Redirecting to Admin Dashboard...");
        window.location.href = "/admin/dashboard";
        return;
      }

      if (isManager) {
        setSuccess("Login successful. Redirecting to Manager Dashboard...");
        window.location.href = "/manager/dashboard";
        return;
      }

      if (isEmployee) {
        setSuccess("Login successful. Redirecting to Employee Dashboard...");
        window.location.href = "/employee/dashboard";
      }
    } catch (err) {
      console.error("Login error:", err);

      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Login failed. Please check your email and password.";

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="grid min-h-screen lg:grid-cols-2">

        {/* LEFT BRAND SECTION */}
        <div className="relative hidden overflow-hidden bg-[#111827] lg:flex">

          {/* Background decoration */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
            <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />
          </div>

          <div className="relative z-10 flex w-full flex-col justify-between p-12 xl:p-16">

            <div>
              {/* COMPANY BRAND */}
              <div className="mb-14 flex items-center gap-5">

                <div className="flex h-16 w-36 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white p-1 shadow-lg">
                  <img
                    src="/thyo-logo.jpeg"
                    alt="THYO Private Limited Logo"
                    className="h-full w-full object-contain"
                  />
                </div>

                <div>
                  <h1 className="text-xl font-bold tracking-tight text-white">
                    THYO Softtech
                  </h1>

                  <p className="mt-1 text-xs text-gray-400">
                    Human Resource Management
                  </p>
                </div>

              </div>

              {/* WELCOME CONTENT */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-gray-400">
                  Welcome back
                </p>

                <h2 className="max-w-xl text-4xl font-bold leading-tight text-white xl:text-5xl">
                  One workspace for your entire organization.
                </h2>

                <p className="mt-6 max-w-lg text-base leading-7 text-gray-400">
                  Manage employees, teams, attendance, payroll and workplace
                  operations from one secure HRMS platform.
                </p>
              </motion.div>
            </div>

            {/* FOOTER */}
            <div className="flex items-center gap-3 text-sm text-gray-400">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              Secure access powered by THYO Softtech
            </div>

          </div>
        </div>

        {/* RIGHT LOGIN SECTION */}
        <div className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="w-full max-w-md"
          >

            {/* MOBILE BRAND - hidden on desktop */}
            <div className="mb-10 flex items-center gap-4 lg:hidden">

              <div className="flex h-14 w-32 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white p-1 shadow-md ring-1 ring-gray-200">
                <img
                  src="/thyo-logo.jpeg"
                  alt="THYO Private Limited Logo"
                  className="h-full w-full object-contain"
                />
              </div>

              <div>
                <h1 className="text-lg font-bold text-gray-900">
                  THYO Softtech
                </h1>

                <p className="mt-1 text-xs text-gray-500">
                  Human Resource Management
                </p>
              </div>

            </div>

            {/* LOGIN HEADER */}
            <div className="mb-8">

              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600">
                <LockKeyhole className="h-3.5 w-3.5" />
                SECURE LOGIN
              </div>

              <h2 className="text-3xl font-bold tracking-tight text-gray-950">
                Welcome back
              </h2>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                Sign in with your registered email and password. Your access
                will be determined automatically based on your role.
              </p>

            </div>

            {/* LOGIN FORM */}
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* EMAIL */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Email Address
                </label>

                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-400" />

                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@thyosoft.com"
                    autoComplete="email"
                    className="h-13 w-full rounded-xl border border-gray-200 bg-white pl-11 pr-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-4 focus:ring-gray-900/5"
                  />
                </div>
              </div>

              {/* PASSWORD */}
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Password
                </label>

                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-400" />

                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="h-13 w-full rounded-xl border border-gray-200 bg-white pl-11 pr-12 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-4 focus:ring-gray-900/5"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((previous) => !previous)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-700"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-[18px] w-[18px]" />
                    ) : (
                      <Eye className="h-[18px] w-[18px]" />
                    )}
                  </button>
                </div>
              </div>

              {/* ERROR MESSAGE */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600"
                >
                  {error}
                </motion.div>
              )}

              {/* SUCCESS MESSAGE */}
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-600"
                >
                  {success}
                </motion.div>
              )}

              {/* LOGIN BUTTON */}
              <button
                type="submit"
                disabled={loading}
                className="group flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>

            </form>

            {/* FOOTER */}
            <p className="mt-8 text-center text-xs text-gray-400">
              Authorized users only. Your dashboard is automatically selected
              according to your assigned role.
            </p>

          </motion.div>
        </div>

      </div>
    </div>
  );
}

export default Login;
