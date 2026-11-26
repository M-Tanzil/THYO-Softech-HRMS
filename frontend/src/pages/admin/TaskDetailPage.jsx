import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Users,
  Edit,
  Trash2,
  PlayCircle,
  PauseCircle,
  CheckCircle2,
  MessageSquare,
  History,
  Send,
  UserPlus,
  ShieldAlert
} from 'lucide-react';
import apiClient from '../../api/client';
import StatusBadge from '../../components/common/StatusBadge';
import PriorityBadge from '../../components/common/PriorityBadge';
import ProgressBar from '../../components/common/ProgressBar';
import Modal from '../../components/common/Modal';
import { SkeletonCard, SkeletonTable } from '../../components/common/SkeletonLoader';
import { useAuth } from '../../context/AuthContext';

export default function TaskDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentUser, isManagerOrAdmin, isAdmin, isManager, activeEmpId } = useAuth();

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Comment state
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Status update state
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Reassignment modal
  const [isReassignOpen, setIsReassignOpen] = useState(false);
  const [reassignType, setReassignType] = useState('INDIVIDUAL');
  const [reassignEmpId, setReassignEmpId] = useState('');
  const [employees, setEmployees] = useState([]);
  const [reassigning, setReassigning] = useState(false);

  // Delete modal
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchTaskDetails = async () => {
    try {
      const res = await apiClient.get(`/tasks/${id}`);
      if (res.data.success) {
        setTask(res.data.data);
        queryClient.invalidateQueries({ queryKey: ['adminTasks'] });
        queryClient.invalidateQueries({ queryKey: ['taskAnalyticsSummary'] });
        queryClient.invalidateQueries({ queryKey: ['myTasks'] });
      }
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to load task details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaskDetails();
  }, [id]);

  useEffect(() => {
    if (isManagerOrAdmin && isReassignOpen) {
      // Backend automatically enforces Manager's authenticated database department scope
      const endpoint = isManager ? '/employees?scope=reassign' : '/employees?scope=assignable';
      apiClient.get(endpoint).then(res => {
        if (res.data && res.data.success) {
          const empList = res.data.data || [];
          setEmployees(empList);
          if (empList.length > 0) {
            setReassignEmpId(empList[0].employeeId);
          } else {
            setReassignEmpId('');
          }
        }
      }).catch(err => {
        console.error('Failed to load assignable employees:', err);
      });
    }
  }, [isManagerOrAdmin, isManager, isReassignOpen, currentUser?.department]);

  const handleStatusChange = async (newStatus, progressVal = undefined) => {
    setUpdatingStatus(true);
    try {
      const res = await apiClient.patch(`/tasks/${id}/status`, {
        status: newStatus,
        progress: progressVal
      });
      if (res.data.success) {
        setTask(res.data.data);
        queryClient.invalidateQueries({ queryKey: ['adminTasks'] });
        queryClient.invalidateQueries({ queryKey: ['taskAnalyticsSummary'] });
        queryClient.invalidateQueries({ queryKey: ['myTasks'] });
      }
    } catch (err) {
      alert(err.friendlyMessage || 'Failed to update task status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setSubmittingComment(true);
    try {
      const res = await apiClient.post(`/tasks/${id}/comments`, {
        comment: commentText
      });
      if (res.data.success) {
        setCommentText('');
        fetchTaskDetails();
      }
    } catch (err) {
      alert(err.friendlyMessage || 'Failed to post comment.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleReassign = async (e) => {
    e.preventDefault();
    setReassigning(true);
    try {
      const res = await apiClient.post(`/tasks/${id}/assign`, {
        assignmentType: reassignType,
        employeeId: reassignEmpId
      });
      if (res.data.success) {
        setTask(res.data.data);
        setIsReassignOpen(false);
      }
    } catch (err) {
      alert(err.friendlyMessage || 'Failed to reassign task.');
    } finally {
      setReassigning(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiClient.delete(`/tasks/${id}`);
      queryClient.invalidateQueries({ queryKey: ['adminTasks'] });
      queryClient.invalidateQueries({ queryKey: ['taskAnalyticsSummary'] });
      queryClient.invalidateQueries({ queryKey: ['myTasks'] });
      navigate('/tasks');
    } catch (err) {
      alert(err.friendlyMessage || 'Failed to delete task.');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonCard count={2} />
        <SkeletonTable rows={4} cols={4} />
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="bg-white rounded-xl border border-rose-200 p-8 sm:p-12 text-center max-w-xl mx-auto shadow-xs my-8">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-[#0F172A] mb-1">Access Restricted</h3>
        <p className="text-xs text-[#64748B] mb-4">{error || 'Task not found or access restricted.'}</p>
        <button
          onClick={() => navigate('/my-tasks')}
          className="px-4 py-2 bg-[#0084FF] text-white rounded-lg text-xs font-semibold hover:bg-[#1C4ED8] transition-colors"
        >
          Return to My Tasks
        </button>
      </div>
    );
  }

  // Calculate average progress
  const assignments = task.assignments || [];
  const avgProgress =
    assignments.length > 0
      ? Math.round(assignments.reduce((acc, a) => acc + (a.progress || 0), 0) / assignments.length)
      : 0;

  // Check if current user is assigned
  const isAssigned = assignments.some(a => a.employeeId === activeEmpId);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Breadcrumb & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 text-[#64748B] hover:text-[#0F172A] hover:bg-white rounded-lg border border-[#E2E8F0] shadow-2xs transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 text-xs text-[#64748B]">
              <Link to={isManagerOrAdmin ? '/tasks' : '/my-tasks'} className="hover:text-[#0084FF]">
                {isManagerOrAdmin ? 'Tasks' : 'My Tasks'}
              </Link>
              <span>/</span>
              <span className="text-[#0F172A] font-medium">Details</span>
            </div>
            <h2 className="text-xl font-bold text-[#0F172A] tracking-tight">
              {task.title}
            </h2>
          </div>
        </div>

        {/* Action Button Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Transitions */}
          {task.status === 'PENDING' && (isManagerOrAdmin || isAssigned) && (
            <button
              onClick={() => handleStatusChange('IN_PROGRESS', 25)}
              disabled={updatingStatus}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0084FF] hover:bg-[#1C4ED8] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-50"
            >
              <PlayCircle className="w-3.5 h-3.5" />
              <span>Start Task</span>
            </button>
          )}

          {task.status === 'IN_PROGRESS' && (isManagerOrAdmin || isAssigned) && (
            <div className="flex flex-wrap items-center gap-1.5">
              <div className="hidden sm:flex items-center gap-1 mr-1">
                {[25, 50, 75, 100].map((stage) => (
                  <button
                    key={stage}
                    type="button"
                    onClick={() => handleStatusChange(stage === 100 ? 'COMPLETED' : 'IN_PROGRESS', stage)}
                    disabled={updatingStatus}
                    className="px-2 py-1 text-[11px] font-bold rounded border border-[#BAE6FD] bg-[#F0F9FF] hover:bg-[#E0F2FE] text-[#1E40AF] transition-colors disabled:opacity-50 cursor-pointer"
                    title={`Update progress to ${stage}%`}
                  >
                    {stage}%
                  </button>
                ))}
              </div>
              <button
                onClick={() => handleStatusChange('ON_HOLD')}
                disabled={updatingStatus}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                <PauseCircle className="w-3.5 h-3.5" />
                <span>Put On Hold</span>
              </button>
              <button
                onClick={() => handleStatusChange('COMPLETED', 100)}
                disabled={updatingStatus}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Mark Completed</span>
              </button>
            </div>
          )}

          {task.status === 'ON_HOLD' && (isManagerOrAdmin || isAssigned) && (
            <button
              onClick={() => handleStatusChange('IN_PROGRESS')}
              disabled={updatingStatus}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0084FF] hover:bg-[#1C4ED8] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-50"
            >
              <PlayCircle className="w-3.5 h-3.5" />
              <span>Resume Task</span>
            </button>
          )}

          {/* Administrative Controls: STRICTLY HIDDEN AND INACCESSIBLE TO EMPLOYEES */}
          {isManagerOrAdmin && (
            <>
              <button
                onClick={() => setIsReassignOpen(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#0F172A] text-xs font-medium rounded-lg transition-colors cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5 text-[#64748B]" />
                <span>Reassign</span>
              </button>

              <Link
                to={`/tasks/${id}/edit`}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#0F172A] text-xs font-medium rounded-lg transition-colors"
              >
                <Edit className="w-3.5 h-3.5 text-[#64748B]" />
                <span>Edit</span>
              </Link>

              {isAdmin && (
                <button
                  onClick={() => setIsDeleteOpen(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                  title="Delete Task (Admin Only)"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Details & Comments */}
        <div className="lg:col-span-2 space-y-6">
          {/* Task Info Card */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#1E40AF] bg-[#E0F2FE] px-2.5 py-1 rounded">
                {task.category || 'General'}
              </span>
              <div className="flex items-center gap-2">
                <PriorityBadge priority={task.priority} />
                <StatusBadge status={task.status} />
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                Description & Acceptance Criteria
              </h4>
              <p className="text-sm text-[#0F172A] leading-relaxed whitespace-pre-line bg-[#F8FAFC] p-4 rounded-lg border border-[#E2E8F0]">
                {task.description}
              </p>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-[#E2E8F0] text-xs">
              <div>
                <span className="text-[#64748B] block mb-0.5">Deadline</span>
                <span className="font-semibold text-[#0F172A] flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#0084FF]" />
                  {new Date(task.deadline).toLocaleDateString([], {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
              </div>

              <div>
                <span className="text-[#64748B] block mb-0.5">Estimated Hours</span>
                <span className="font-semibold text-[#0F172A] flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#1E40AF]" />
                  {task.estimatedHours > 0 ? `${task.estimatedHours} hrs` : 'Not specified'}
                </span>
              </div>

              <div>
                <span className="text-[#64748B] block mb-0.5">Created By</span>
                <span className="font-semibold text-[#0F172A] flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-[#0084FF]" />
                  {task.createdBy}
                </span>
              </div>

              <div>
                <span className="text-[#64748B] block mb-0.5">Strategy</span>
                <span className="font-semibold text-[#0F172A]">
                  {task.assignmentType}
                </span>
              </div>
            </div>
          </div>

          {/* Comments Section */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="text-sm font-semibold text-[#0F172A] flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#0084FF]" />
                <span>Comments & Progress Notes ({task.comments?.length || 0})</span>
              </h3>
            </div>

            {/* Comments List */}
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {!task.comments || task.comments.length === 0 ? (
                <div className="text-center py-6 text-xs text-[#64748B] italic">
                  No comments yet. Post an update or query below.
                </div>
              ) : (
                task.comments.map((c) => (
                  <div
                    key={c.id}
                    className="p-3.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#0F172A]">{c.authorName}</span>
                      <span className="text-[11px] text-[#64748B]">
                        {new Date(c.createdAt).toLocaleString([], {
                          dateStyle: 'short',
                          timeStyle: 'short'
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-[#0F172A] leading-relaxed">{c.comment}</p>
                  </div>
                ))
              )}
            </div>

            {/* Add Comment Input Form */}
            <form onSubmit={handleAddComment} className="pt-2">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-[#64748B] mb-1">
                    Post an update as <strong className="text-[#0F172A]">{currentUser?.fullName}</strong>:
                  </label>
                  <textarea
                    rows={2}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Type progress details, blocker updates, or team notes..."
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0084FF] focus:bg-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submittingComment || !commentText.trim()}
                  className="px-4 py-2.5 bg-[#0084FF] hover:bg-[#1C4ED8] text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-40 flex items-center gap-1.5 h-10 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submittingComment ? 'Sending...' : 'Comment'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right 1 Col: Assignees & History Timeline */}
        <div className="space-y-6">
          {/* Assigned Employees Box */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5">
              <h3 className="text-sm font-semibold text-[#0F172A] flex items-center gap-2">
                <Users className="w-4 h-4 text-[#0084FF]" />
                <span>Assigned Staff ({assignments.length})</span>
              </h3>
            </div>

            <div className="space-y-3">
              {assignments.map((a) => (
                <div
                  key={a.id}
                  className="p-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#E0F2FE] text-[#1E40AF] font-bold text-[10px] flex items-center justify-center ring-2 ring-white">
                        {a.employee?.fullName
                          ? a.employee.fullName.split(' ').map(n => n[0]).join('').substring(0, 2)
                          : a.employeeId.slice(-2)}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-[#0F172A]">
                          {a.employee?.fullName || a.employeeId}
                        </div>
                        <div className="text-[10px] text-[#64748B]">
                          {a.employee?.department} • {a.employee?.position}
                        </div>
                      </div>
                    </div>
                    <StatusBadge status={a.status} className="scale-90" />
                  </div>

                  <ProgressBar progress={a.progress} size="sm" />
                </div>
              ))}
            </div>
          </div>

          {/* Task History Audit Trail */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5">
              <h3 className="text-sm font-semibold text-[#0F172A] flex items-center gap-2">
                <History className="w-4 h-4 text-[#1E40AF]" />
                <span>Audit Trail & History</span>
              </h3>
            </div>

            <div className="space-y-3.5 max-h-80 overflow-y-auto pr-1">
              {!task.history || task.history.length === 0 ? (
                <div className="text-xs text-[#64748B] italic text-center py-4">
                  No history logged yet.
                </div>
              ) : (
                task.history.map((h) => (
                  <div key={h.id} className="relative pl-4 border-l-2 border-[#E2E8F0] text-xs">
                    <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-[#0084FF]" />
                    <div className="font-semibold text-[#0F172A]">{h.description}</div>
                    <div className="text-[10px] text-[#64748B] mt-0.5">
                      {new Date(h.createdAt).toLocaleString([], {
                        dateStyle: 'short',
                        timeStyle: 'short'
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reassign Modal */}
      {isManagerOrAdmin && (
        <Modal
          isOpen={isReassignOpen}
          onClose={() => setIsReassignOpen(false)}
          title="Reassign Task"
        >
          <form onSubmit={handleReassign} className="space-y-4">
            {isManager && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Manager Scope: Reassigning within <strong>{currentUser?.department} Department</strong>.
                </span>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
                Assign To <span className="text-rose-500">*</span>
              </label>
              {employees.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                  No active team members available in your department for reassignment.
                </div>
              ) : (
                <select
                  value={reassignEmpId}
                  onChange={(e) => setReassignEmpId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] bg-white text-sm font-medium text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0084FF] cursor-pointer shadow-xs"
                >
                  <option value="">[ Select Employee ]</option>
                  {employees.map((emp) => (
                    <option key={emp.employeeId} value={emp.employeeId}>
                      {emp.employeeId} — {emp.fullName}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setIsReassignOpen(false)}
                className="px-4 py-2 text-xs font-medium text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={reassigning}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#0084FF] hover:bg-[#1C4ED8] rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
              >
                {reassigning ? 'Assigning...' : 'Assign Staff'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {isManagerOrAdmin && (
        <Modal
          isOpen={isDeleteOpen}
          onClose={() => setIsDeleteOpen(false)}
          title="Delete Task Confirmation"
        >
          <div className="space-y-4">
            <p className="text-sm text-[#64748B]">
              Are you sure you want to delete <strong className="text-[#0F172A]">"{task.title}"</strong>?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
              <button
                onClick={() => setIsDeleteOpen(false)}
                className="px-4 py-2 text-xs font-medium text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
              >
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
