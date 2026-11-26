import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Users, MessageSquare, Clock } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import PriorityBadge from '../common/PriorityBadge';
import ProgressBar from '../common/ProgressBar';

export default function TaskCard({ task, isEmployeeView = false }) {
  const deadlineDate = new Date(task.deadline);
  const now = new Date();
  const diffDays = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));

  // Determine deadline badge
  let deadlineText = `${diffDays} days left`;
  let deadlineColor = 'text-[#64748B]';

  if (diffDays < 0) {
    deadlineText = `Overdue by ${Math.abs(diffDays)}d`;
    deadlineColor = 'text-rose-600 font-semibold';
  } else if (diffDays === 0) {
    deadlineText = 'Due Today';
    deadlineColor = 'text-amber-600 font-semibold';
  } else if (diffDays === 1) {
    deadlineText = 'Due Tomorrow';
    deadlineColor = 'text-amber-600 font-semibold';
  }

  // Calculate average progress across assignments
  const assignments = task.assignments || [];
  const avgProgress =
    assignments.length > 0
      ? Math.round(assignments.reduce((acc, a) => acc + (a.progress || 0), 0) / assignments.length)
      : 0;

  const detailUrl = isEmployeeView ? `/my-tasks/${task.id}` : `/tasks/${task.id}`;

  return (
    <Link
      to={detailUrl}
      className="group block bg-white rounded-xl border border-[#E2E8F0] p-5 hover:border-[#0084FF]/50 hover:shadow-md transition-all duration-200"
    >
      {/* Card Header: Category & Badges */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#1E40AF] bg-[#F0F9FF] border border-[#BAE6FD]/60 px-2 py-0.5 rounded">
          {task.category || 'General'}
        </span>
        <div className="flex items-center gap-1.5">
          <PriorityBadge priority={task.priority} />
          <StatusBadge status={task.status} />
        </div>
      </div>

      {/* Task Title & Description */}
      <h3 className="text-base font-bold text-[#0F172A] group-hover:text-[#0084FF] transition-colors line-clamp-1 mb-1.5">
        {task.title}
      </h3>
      <p className="text-xs text-[#64748B] line-clamp-2 mb-4 leading-relaxed">
        {task.description}
      </p>

      {/* Progress Bar */}
      <div className="mb-4">
        <ProgressBar progress={avgProgress} size="sm" />
      </div>

      {/* Card Footer: Assignees, Deadline & Comments count */}
      <div className="flex items-center justify-between pt-3 border-t border-[#E2E8F0] text-xs">
        {/* Assigned Employees */}
        <div className="flex items-center gap-1.5">
          {assignments.length > 0 ? (
            <div className="flex -space-x-1.5 overflow-hidden">
              {assignments.slice(0, 3).map((a) => (
                <div
                  key={a.id}
                  title={a.employee ? `${a.employee.fullName} (${a.employee.department})` : a.employeeId}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#E0F2FE] text-[10px] font-bold text-[#1E40AF] ring-2 ring-white"
                >
                  {a.employee?.fullName
                    ? a.employee.fullName.split(' ').map(n => n[0]).join('').substring(0, 2)
                    : a.employeeId.slice(-2)}
                </div>
              ))}
              {assignments.length > 3 && (
                <div className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#E2E8F0] text-[10px] font-bold text-[#64748B] ring-2 ring-white">
                  +{assignments.length - 3}
                </div>
              )}
            </div>
          ) : (
            <span className="text-[#64748B] italic text-[11px]">Unassigned</span>
          )}
        </div>

        {/* Deadline info */}
        <div className="flex items-center gap-3">
          {task._count?.comments > 0 && (
            <span className="flex items-center gap-1 text-[#64748B]">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{task._count.comments}</span>
            </span>
          )}

          <span className={`flex items-center gap-1 text-xs ${deadlineColor}`}>
            <Calendar className="w-3.5 h-3.5" />
            <span>{deadlineText}</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
