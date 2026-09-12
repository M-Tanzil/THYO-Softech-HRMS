import React from 'react';
import { Navigate, Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ allowedRoles = [], children }) {
  const { activeRole, currentUser } = useAuth();

  const role = (activeRole || 'EMPLOYEE').toUpperCase();
  const normalizedAllowed = allowedRoles.map(r => r.toUpperCase());

  // Admins always have access
  const isAuthorized =
    role === 'ADMIN' ||
    role === 'SUPER_ADMIN' ||
    normalizedAllowed.includes(role);

  if (!isAuthorized) {
    return (
      <div className="bg-white rounded-xl border border-rose-200 p-8 sm:p-12 text-center max-w-xl mx-auto shadow-xs my-8">
        <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">Access Restricted</h3>
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          Your active role (<span className="font-semibold text-rose-700">{role}</span>) does not possess administrative permissions for this resource. This feature is strictly reserved for <span className="font-semibold text-slate-800">{allowedRoles.join(', ')}</span>.
        </p>

        <div className="flex items-center justify-center gap-3">
          <Link
            to="/my-tasks"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go to My Assigned Tasks</span>
          </Link>
        </div>
      </div>
    );
  }

  return children;
}
