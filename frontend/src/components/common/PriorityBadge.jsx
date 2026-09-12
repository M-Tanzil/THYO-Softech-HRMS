import React from 'react';
import { ArrowDown, Minus, ArrowUp, AlertTriangle } from 'lucide-react';

const PRIORITY_CONFIG = {
  LOW: {
    label: 'Low',
    bg: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: ArrowDown
  },
  MEDIUM: {
    label: 'Medium',
    bg: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: Minus
  },
  HIGH: {
    label: 'High',
    bg: 'bg-orange-50 text-orange-700 border-orange-200',
    icon: ArrowUp
  },
  URGENT: {
    label: 'Urgent',
    bg: 'bg-red-50 text-red-700 border-red-200',
    icon: AlertTriangle
  }
};

export default function PriorityBadge({ priority, className = '' }) {
  const norm = (priority || 'MEDIUM').toUpperCase();
  const config = PRIORITY_CONFIG[norm] || PRIORITY_CONFIG.MEDIUM;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider border ${config.bg} ${className}`}
    >
      <Icon className="w-3 h-3" />
      <span>{config.label}</span>
    </span>
  );
}
