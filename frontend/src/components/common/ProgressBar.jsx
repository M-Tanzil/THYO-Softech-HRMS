import React from 'react';

export default function ProgressBar({ progress = 0, showLabel = true, size = 'md', className = '' }) {
  const clamped = Math.max(0, Math.min(100, Number(progress) || 0));

  let color = 'bg-sky-600';
  if (clamped === 100) color = 'bg-emerald-500';
  else if (clamped >= 50) color = 'bg-blue-600';
  else if (clamped > 0) color = 'bg-amber-500';

  const heightClass = size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-3' : 'h-2';

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-center text-xs font-medium text-slate-600 mb-1">
          <span>Progress</span>
          <span className="font-semibold text-slate-800">{clamped}%</span>
        </div>
      )}
      <div className={`w-full bg-slate-200 rounded-full overflow-hidden ${heightClass}`}>
        <div
          className={`${heightClass} ${color} transition-all duration-300 rounded-full`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
