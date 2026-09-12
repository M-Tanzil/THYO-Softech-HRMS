import React from 'react';
import { Megaphone, Calendar, Users, Building2, Briefcase, Trash2 } from 'lucide-react';

export default function AnnouncementCard({ announcement, onDelete, canDelete = false }) {
  const getAudienceBadge = () => {
    switch (announcement.audience) {
      case 'DEPARTMENT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Building2 className="w-3 h-3" />
            <span>{announcement.targetValue || 'Department'}</span>
          </span>
        );
      case 'POSITION':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <Briefcase className="w-3 h-3" />
            <span>{announcement.targetValue || 'Position'}</span>
          </span>
        );
      case 'INDIVIDUAL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Users className="w-3 h-3" />
            <span>Employee {announcement.targetValue}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Users className="w-3 h-3" />
            <span>All Company</span>
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-sky-50 text-sky-600">
            <Megaphone className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-base font-semibold text-slate-800 leading-snug">
              {announcement.title}
            </h4>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(announcement.publishDate).toLocaleDateString([], {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </span>
              <span>•</span>
              <span>By {announcement.createdById}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {getAudienceBadge()}
          {canDelete && onDelete && (
            <button
              onClick={() => onDelete(announcement.id)}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Delete announcement"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <p className="text-sm text-slate-600 leading-relaxed pl-11">
        {announcement.message}
      </p>
    </div>
  );
}
