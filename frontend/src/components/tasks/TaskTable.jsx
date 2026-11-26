import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Eye, Edit, Trash2 } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import PriorityBadge from '../common/PriorityBadge';
import ProgressBar from '../common/ProgressBar';

export default function TaskTable({ tasks, onDeleteTask, canEdit = true }) {
  if (!tasks || tasks.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-12 text-center">
        <div className="w-12 h-12 rounded-full bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center mx-auto mb-3 text-[#64748B]">
          <ChevronRight className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-[#0F172A] mb-1">No tasks found</h4>
        <p className="text-xs text-[#64748B] max-w-sm mx-auto">
          No tasks match the selected search or filter criteria. Try resetting filters or create a new task.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-xs font-semibold text-[#64748B] uppercase tracking-wider">
            <tr>
              <th className="py-3.5 px-4">Task Details</th>
              <th className="py-3.5 px-4">Priority</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4">Assigned To</th>
              <th className="py-3.5 px-4">Deadline</th>
              <th className="py-3.5 px-4 w-36">Progress</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {tasks.map((task) => {
              const assignments = task.assignments || [];
              const avgProgress =
                assignments.length > 0
                  ? Math.round(assignments.reduce((acc, a) => acc + (a.progress || 0), 0) / assignments.length)
                  : 0;

              return (
                <tr
                  key={task.id}
                  className="hover:bg-[#F0F9FF]/60 transition-colors group cursor-pointer"
                >
                  {/* Title & Category */}
                  <td className="py-3 px-4">
                    <Link to={`/tasks/${task.id}`} className="block">
                      <div className="font-semibold text-[#0F172A] group-hover:text-[#0084FF] transition-colors line-clamp-1">
                        {task.title}
                      </div>
                      <div className="text-xs text-[#64748B] flex items-center gap-1.5 mt-0.5">
                        <span className="font-semibold text-[#64748B] uppercase text-[10px]">
                          {task.category || 'General'}
                        </span>
                        {task.estimatedHours > 0 && (
                          <>
                            <span>•</span>
                            <span>{task.estimatedHours}h est.</span>
                          </>
                        )}
                      </div>
                    </Link>
                  </td>

                  {/* Priority */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <PriorityBadge priority={task.priority} />
                  </td>

                  {/* Status */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <StatusBadge status={task.status} />
                  </td>

                  {/* Assignees */}
                  <td className="py-3 px-4">
                    {assignments.length > 0 ? (
                      <div className="flex items-center gap-2">
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
                        </div>
                        <span className="text-xs text-[#0F172A] truncate max-w-[130px]">
                          {assignments[0]?.employee?.fullName || assignments[0]?.employeeId}
                          {assignments.length > 1 && ` +${assignments.length - 1}`}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-[#64748B] italic">Unassigned</span>
                    )}
                  </td>

                  {/* Deadline */}
                  <td className="py-3 px-4 whitespace-nowrap text-xs text-[#0F172A]">
                    {new Date(task.deadline).toLocaleDateString([], {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </td>

                  {/* Progress */}
                  <td className="py-3 px-4">
                    <ProgressBar progress={avgProgress} showLabel={false} size="sm" />
                    <span className="text-[11px] font-medium text-[#64748B] mt-1 block">
                      {avgProgress}%
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <Link
                        to={`/tasks/${task.id}`}
                        className="p-1.5 text-[#64748B] hover:text-[#0084FF] hover:bg-[#E0F2FE] rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      {canEdit && (
                        <Link
                          to={`/tasks/${task.id}/edit`}
                          className="p-1.5 text-[#64748B] hover:text-[#1E40AF] hover:bg-[#E0F2FE] rounded-lg transition-colors"
                          title="Edit Task"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                      )}
                      {onDeleteTask && (
                        <button
                          onClick={() => onDeleteTask(task.id, task.title)}
                          className="p-1.5 text-[#64748B] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Task"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
