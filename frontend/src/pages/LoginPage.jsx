import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Lock,
  User,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  Building2,
  CheckCircle2
} from 'lucide-react';
import { useAuth, getDashboardRoute } from '../context/AuthContext';
import thyoLogo from '../assets/thyo-logo.png';
import thyoLogoFallback from '../assets/logo.jpeg';

/**
 * THYO SOFTECH PVT LTD — Centralized HRMS Login
 * 
 * Single centralized authentication portal for all roles (ADMIN, MANAGER, EMPLOYEE).
 * User enters corporate ID / username / email and password.
 * Authenticates against PostgreSQL with bcrypt hash comparison and JWT issuance.
 * Automatically identifies user role and routes to the appropriate dashboard.
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Please enter both corporate ID/email/username and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await login({ identifier: identifier.trim(), password });
      if (result && result.user) {
        const dest = getDashboardRoute(result.user.role);
        navigate(dest);
      }
    } catch (err) {
      setError(err.friendlyMessage || err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* LEFT BRAND SECTION (Matches team Login.jsx) */}
        <div className="relative hidden overflow-hidden bg-gradient-to-b from-[#171936] via-[#10152d] to-[#090d1d] lg:flex">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
            <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-indigo-500/15 blur-3xl" />
          </div>

          <div className="relative z-10 flex w-full flex-col justify-between p-12 xl:p-16">
            <div>
              <div className="mb-14 flex items-center gap-5">
                <div className="flex h-16 w-32 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1.5 shadow-lg">
                  <img
                    src={thyoLogo}
                    onError={(e) => {
                      if (e.currentTarget.src !== thyoLogoFallback) {
                        e.currentTarget.src = thyoLogoFallback;
                      }
                    }}
                    alt="THYO SOFTECH Logo"
                    className="h-full w-full object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-white">
                    THYO Softtech
                  </h1>
                  <p className="mt-1 text-xs text-indigo-200/80">
                    Human Resource Management
                  </p>
                </div>
              </div>

              <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-indigo-300">
                Welcome back
              </p>
              <h2 className="max-w-xl text-4xl font-bold leading-tight text-white xl:text-5xl">
                One workspace for your entire organization.
              </h2>
              <p className="mt-6 max-w-lg text-base leading-7 text-slate-300">
                Manage leave, holidays, recruitment, performance reviews, remote work, and company communications from one secure HRMS platform.
              </p>
            </div>

            <div className="flex items-center gap-3 text-sm text-slate-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Secure 3-Role RBAC access powered by THYO Softtech
            </div>
          </div>
        </div>

        {/* RIGHT LOGIN SECTION */}
        <div className="flex flex-col justify-center px-6 py-12 sm:px-10 lg:px-14">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-6 flex items-center gap-3 lg:hidden">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1 shadow-sm border border-slate-200">
                <img
                  src={thyoLogo}
                  onError={(e) => {
                    if (e.currentTarget.src !== thyoLogoFallback) {
                      e.currentTarget.src = thyoLogoFallback;
                    }
                  }}
                  alt="THYO SOFTECH Logo"
                  className="h-full w-full object-contain"
                />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">THYO Softtech</h2>
                <p className="text-xs text-slate-500">Enterprise HRMS Portal</p>
              </div>
            </div>

            <div className="bg-white py-8 px-6 shadow-sm rounded-2xl border border-slate-200 sm:px-9">
              <div className="mb-6">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-semibold border border-indigo-100 mb-3">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Centralized Authentication Portal</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900">Sign in to your account</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Your portal is automatically selected based on your assigned role.
                </p>
              </div>

              {error && (
                <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                    Corporate ID / Email / Username
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="identifier-input"
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="e.g. admin or tanzil or riya"
                      required
                      autoComplete="username"
                      className="block w-full pl-10 pr-3.5 py-2.5 text-xs border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition text-slate-900 bg-white placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="password-input"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                      className="block w-full pl-10 pr-10 py-2.5 text-xs border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition text-slate-900 bg-white placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  id="login-submit-button"
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl shadow-sm text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all disabled:opacity-50 cursor-pointer mt-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Sign In to THYO Softtech HRMS</span>
                    </>
                  )}
                </button>
              </form>

              {/* Quick Credential Guide */}
              <div className="mt-6 pt-5 border-t border-slate-100">
                <p className="text-[11px] font-semibold text-slate-500 mb-2 uppercase tracking-wider text-center">
                  Centralized Credentials Reference
                </p>
                <div className="space-y-1.5 text-[11px] text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800">Admin:</span>
                    <button
                      type="button"
                      onClick={() => { setIdentifier('admin'); setPassword('Admin@12345'); }}
                      className="text-indigo-600 hover:underline font-mono text-[10px] cursor-pointer"
                    >
                      admin / Admin@12345
                    </button>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800">Manager:</span>
                    <button
                      type="button"
                      onClick={() => { setIdentifier('tanzil'); setPassword('Employee@12345'); }}
                      className="text-indigo-600 hover:underline font-mono text-[10px] cursor-pointer"
                    >
                      tanzil / Employee@12345
                    </button>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800">Employee:</span>
                    <button
                      type="button"
                      onClick={() => { setIdentifier('riya'); setPassword('Employee@12345'); }}
                      className="text-indigo-600 hover:underline font-mono text-[10px] cursor-pointer"
                    >
                      riya / Employee@12345
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-center text-xs text-slate-400 mt-6">
              THYO SOFTECH PVT LTD • Strict 3-Role RBAC Enforced (ADMIN, MANAGER, EMPLOYEE)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
