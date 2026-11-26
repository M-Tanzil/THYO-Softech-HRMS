import React from 'react';

/**
 * Reusable Skeleton Loaders matching THYO HRMS Design System
 */

export function SkeletonBox({ className = '' }) {
  return <div className={`animate-pulse bg-slate-200/80 rounded-lg ${className}`} />;
}

export function SkeletonCard({ count = 3, className = '' }) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <SkeletonBox className="h-4 w-24" />
            <SkeletonBox className="h-4 w-12 rounded-full" />
          </div>
          <SkeletonBox className="h-6 w-3/4" />
          <SkeletonBox className="h-4 w-full" />
          <SkeletonBox className="h-4 w-5/6" />
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <SkeletonBox className="h-3 w-20" />
            <SkeletonBox className="h-6 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonStats({ count = 4, className = '' }) {
  return (
    <div className={`grid grid-cols-2 sm:grid-cols-4 gap-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2 shadow-sm">
          <SkeletonBox className="h-3 w-20" />
          <SkeletonBox className="h-7 w-12" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 5, columns, className = '' }) {
  const columnCount = columns || cols;
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm ${className}`}>
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <SkeletonBox className="h-5 w-32" />
        <SkeletonBox className="h-8 w-24 rounded-lg" />
      </div>
      <div className="divide-y divide-slate-100 p-4 space-y-3">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 py-2">
            {Array.from({ length: columnCount }).map((_, c) => (
              <SkeletonBox
                key={c}
                className={`h-4 ${c === 0 ? 'w-1/4' : c === 1 ? 'w-1/5' : 'flex-1'}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default {
  Box: SkeletonBox,
  Card: SkeletonCard,
  Stats: SkeletonStats,
  Table: SkeletonTable
};
