import React from 'react';
import { Clock, PlayCircle, PauseCircle, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

const STATUS_CONFIG = {
  PENDING: {
    label: 'Pending',
    bg: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: Clock
  },
  IN_PROGRESS: {
    label: 'In Progress',
    bg: 'bg-sky-50 text-sky-700 border-sky-200',
    icon: PlayCircle
  },
  ON_HOLD: {
    label: 'On Hold',
    bg: 'bg-purple-50 text-purple-700 border-purple-200',
    icon: PauseCircle
  },
  COMPLETED: {
    label: 'Completed',
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: CheckCircle2
  },
  CANCELLED: {
    label: 'Cancelled',
    bg: 'bg-slate-100 text-slate-600 border-slate-200',
    icon: XCircle
  },
  OVERDUE: {
    label: 'Overdue',
    bg: 'bg-rose-50 text-rose-700 border-rose-200',
    icon: AlertCircle
  }
};

export default function StatusBadge({ status, className = '' }) {
  const norm = (status || 'PENDING').toUpperCase();
  const config = STATUS_CONFIG[norm] || STATUS_CONFIG.PENDING;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.bg} ${className}`}
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{config.label}</span>
    </span>
  );
}
