import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Eye, Edit, Trash2 } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import PriorityBadge from '../common/PriorityBadge';
import ProgressBar from '../common/ProgressBar';

export default function TaskTable({ tasks, onDeleteTask }) {
  if (!tasks || tasks.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
          <ChevronRight className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-semibold text-slate-800 mb-1">No tasks found</h4>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          No tasks match the selected search or filter criteria. Try resetting filters or create a new task.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
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
          <tbody className="divide-y divide-slate-100">
            {tasks.map((task) => {
              const assignments = task.assignments || [];
              const avgProgress =
                assignments.length > 0
                  ? Math.round(assignments.reduce((acc, a) => acc + (a.progress || 0), 0) / assignments.length)
                  : 0;

              return (
                <tr
                  key={task.id}
                  className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                >
                  {/* Title & Category */}
                  <td className="py-3 px-4">
                    <Link to={`/tasks/${task.id}`} className="block">
                      <div className="font-medium text-slate-900 group-hover:text-sky-600 transition-colors line-clamp-1">
                        {task.title}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span className="font-semibold text-slate-500 uppercase text-[10px]">
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
                              className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-700 ring-2 ring-white"
                            >
                              {a.employee?.fullName
                                ? a.employee.fullName.split(' ').map(n => n[0]).join('').substring(0, 2)
                                : a.employeeId.slice(-2)}
                            </div>
                          ))}
                        </div>
                        <span className="text-xs text-slate-600 truncate max-w-[130px]">
                          {assignments[0]?.employee?.fullName || assignments[0]?.employeeId}
                          {assignments.length > 1 && ` +${assignments.length - 1}`}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Unassigned</span>
                    )}
                  </td>

                  {/* Deadline */}
                  <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-600">
                    {new Date(task.deadline).toLocaleDateString([], {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </td>

                  {/* Progress */}
                  <td className="py-3 px-4">
                    <ProgressBar progress={avgProgress} showLabel={false} size="sm" />
                    <span className="text-[11px] font-medium text-slate-500 mt-1 block">
                      {avgProgress}%
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <Link
                        to={`/tasks/${task.id}`}
                        className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <Link
                        to={`/tasks/${task.id}/edit`}
                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Edit Task"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      {onDeleteTask && (
                        <button
                          onClick={() => onDeleteTask(task.id, task.title)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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
