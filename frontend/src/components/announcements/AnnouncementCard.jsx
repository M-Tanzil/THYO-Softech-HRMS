import React from 'react';
import { Megaphone, Calendar, Users, Building2, Briefcase, Trash2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AnnouncementCard({ announcement, onDelete, onAcknowledge, canDelete = false }) {
  const { currentUser } = useAuth();

  const getAudienceBadge = () => {
    switch (announcement.audience) {
      case 'DEPARTMENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Building2 className="w-3 h-3" />
            <span>{announcement.targetValue || 'Department'}</span>
          </span>
        );
      case 'POSITION':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-violet-50 text-violet-700 border border-violet-200">
            <Briefcase className="w-3 h-3" />
            <span>{announcement.targetValue || 'Position'}</span>
          </span>
        );
      case 'INDIVIDUAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Users className="w-3 h-3" />
            <span>Employee {announcement.targetValue}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Users className="w-3 h-3" />
            <span>All Organization</span>
          </span>
        );
    }
  };

  const ackList = Array.isArray(announcement.acknowledgedBy) ? announcement.acknowledgedBy : [];
  const isAcknowledged = currentUser?.employeeId && ackList.includes(currentUser.employeeId);

  return (
    <div className="thyo-card p-5 hover:border-indigo-200 transition-all">
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">
            <Megaphone className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-base font-bold text-slate-900 leading-snug">
              {announcement.title}
            </h4>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(announcement.publishDate).toLocaleDateString([], {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </span>
              <span>•</span>
              <span>By {announcement.author || announcement.createdById || 'HR Administration'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {getAudienceBadge()}
          {canDelete && onDelete && (
            <button
              onClick={() => onDelete(announcement.id)}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
              title="Delete announcement"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <p className="text-sm text-slate-700 leading-relaxed pl-12 mb-3">
        {announcement.message}
      </p>

      {/* Acknowledgment Bar */}
      <div className="pl-12 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className="text-slate-400 text-[11px]">
          Acknowledged by {ackList.length} employee{ackList.length === 1 ? '' : 's'}
        </span>

        {isAcknowledged ? (
          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Acknowledged</span>
          </span>
        ) : (
          onAcknowledge && (
            <button
              onClick={() => onAcknowledge(announcement.id)}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Acknowledge Notice</span>
            </button>
          )
        )}
      </div>
    </div>
  );
}
