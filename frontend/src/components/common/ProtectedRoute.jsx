import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuth, getDashboardRoute } from '../../context/AuthContext';

export default function ProtectedRoute({ allowedRoles = [], children }) {
  const { currentUser, activeRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-3 border-[#0084FF] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-[#64748B] font-medium">Verifying authorization...</p>
        </div>
      </div>
    );
  }

  const role = (activeRole || currentUser?.role || 'EMPLOYEE').toUpperCase();
  const normalizedAllowed = allowedRoles.map((r) => r.toUpperCase());

  // Admins always have master supervisory access
  const isAuthorized =
    normalizedAllowed.length === 0 ||
    role === 'ADMIN' ||
    normalizedAllowed.includes(role);

  if (!isAuthorized) {
    return (
      <div className="bg-white rounded-2xl border border-rose-200 p-8 sm:p-12 text-center max-w-xl mx-auto my-12 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mx-auto mb-5 shadow-xs">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h3 className="text-xl font-bold text-[#0F172A] mb-2">Access Restricted</h3>
        <p className="text-sm text-[#64748B] mb-6 leading-relaxed">
          Your active role (<span className="font-semibold text-rose-700">{role}</span>) does not possess permission for this administrative action. This feature is restricted to <span className="font-semibold text-[#0F172A]">{allowedRoles.join(', ')}</span>.
        </p>

        <div className="flex items-center justify-center gap-3">
          <Link
            to={getDashboardRoute(role)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0084FF] hover:bg-[#1C4ED8] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to My Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  return children;
}
