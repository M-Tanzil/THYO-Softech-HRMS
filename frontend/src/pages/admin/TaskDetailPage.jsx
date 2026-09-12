import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
import { useAuth } from '../../context/AuthContext';

export default function TaskDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, isManagerOrAdmin, activeEmpId } = useAuth();

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
  const [reassignEmpId, setReassignEmpId] = useState('EMP002');
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
      }
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to load task details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaskDetails();

    if (isManagerOrAdmin) {
      apiClient.get('/employees').then(res => {
        if (res.data.success) setEmployees(res.data.data);
      });
    }
  }, [id, isManagerOrAdmin]);

  const handleStatusChange = async (newStatus, progressVal = undefined) => {
    setUpdatingStatus(true);
    try {
      const res = await apiClient.patch(`/tasks/${id}/status`, {
        status: newStatus,
        progress: progressVal
      });
      if (res.data.success) {
        setTask(res.data.data);
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
      navigate('/tasks');
    } catch (err) {
      alert(err.friendlyMessage || 'Failed to delete task.');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-16 text-center text-sm text-slate-400">
        Loading task information...
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="bg-white rounded-xl border border-rose-200 p-8 sm:p-12 text-center max-w-xl mx-auto shadow-xs my-8">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">Access Restricted</h3>
        <p className="text-xs text-slate-600 mb-4">{error || 'Task not found or access restricted.'}</p>
        <button
          onClick={() => navigate('/my-tasks')}
          className="px-4 py-2 bg-sky-600 text-white rounded-lg text-xs font-semibold hover:bg-sky-700"
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
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg border border-slate-200 shadow-2xs transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Link to={isManagerOrAdmin ? '/tasks' : '/my-tasks'} className="hover:text-sky-600">
                {isManagerOrAdmin ? 'Tasks' : 'My Tasks'}
              </Link>
              <span>/</span>
              <span className="text-slate-600 font-medium">Details</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-50"
            >
              <PlayCircle className="w-3.5 h-3.5" />
              <span>Start Task</span>
            </button>
          )}

          {task.status === 'IN_PROGRESS' && (isManagerOrAdmin || isAssigned) && (
            <>
              <button
                onClick={() => handleStatusChange('ON_HOLD')}
                disabled={updatingStatus}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-50"
              >
                <PauseCircle className="w-3.5 h-3.5" />
                <span>Put On Hold</span>
              </button>
              <button
                onClick={() => handleStatusChange('COMPLETED', 100)}
                disabled={updatingStatus}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Mark Completed</span>
              </button>
            </>
          )}

          {task.status === 'ON_HOLD' && (isManagerOrAdmin || isAssigned) && (
            <button
              onClick={() => handleStatusChange('IN_PROGRESS')}
              disabled={updatingStatus}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-50"
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
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5 text-slate-500" />
                <span>Reassign</span>
              </button>

              <Link
                to={`/tasks/${id}/edit`}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg transition-colors"
              >
                <Edit className="w-3.5 h-3.5 text-slate-500" />
                <span>Edit</span>
              </Link>

              <button
                onClick={() => setIsDeleteOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-medium rounded-lg transition-colors"
                title="Delete Task"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Details & Comments */}
        <div className="lg:col-span-2 space-y-6">
          {/* Task Info Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2.5 py-1 rounded">
                {task.category || 'General'}
              </span>
              <div className="flex items-center gap-2">
                <PriorityBadge priority={task.priority} />
                <StatusBadge status={task.status} />
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Description & Acceptance Criteria
              </h4>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50/50 p-4 rounded-lg border border-slate-100">
                {task.description}
              </p>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Deadline</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-sky-600" />
                  {new Date(task.deadline).toLocaleDateString([], {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block mb-0.5">Estimated Hours</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-purple-600" />
                  {task.estimatedHours > 0 ? `${task.estimatedHours} hrs` : 'Not specified'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block mb-0.5">Created By</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-emerald-600" />
                  {task.createdBy}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block mb-0.5">Strategy</span>
                <span className="font-semibold text-slate-800">
                  {task.assignmentType}
                </span>
              </div>
            </div>
          </div>

          {/* Comments Section */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-sky-600" />
                <span>Comments & Progress Notes ({task.comments?.length || 0})</span>
              </h3>
            </div>

            {/* Comments List */}
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {!task.comments || task.comments.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 italic">
                  No comments yet. Post an update or query below.
                </div>
              ) : (
                task.comments.map((c) => (
                  <div
                    key={c.id}
                    className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">{c.authorName}</span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(c.createdAt).toLocaleString([], {
                          dateStyle: 'short',
                          timeStyle: 'short'
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{c.comment}</p>
                  </div>
                ))
              )}
            </div>

            {/* Add Comment Input Form */}
            <form onSubmit={handleAddComment} className="pt-2">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Post an update as <strong className="text-slate-700">{currentUser?.fullName}</strong>:
                  </label>
                  <textarea
                    rows={2}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Type progress details, blocker updates, or team notes..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submittingComment || !commentText.trim()}
                  className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-40 flex items-center gap-1.5 h-10"
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
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Users className="w-4 h-4 text-sky-600" />
                <span>Assigned Staff ({assignments.length})</span>
              </h3>
            </div>

            <div className="space-y-3">
              {assignments.map((a) => (
                <div
                  key={a.id}
                  className="p-3 rounded-lg border border-slate-100 bg-slate-50/60 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-sky-100 text-sky-700 font-bold text-[10px] flex items-center justify-center">
                        {a.employee?.fullName
                          ? a.employee.fullName.split(' ').map(n => n[0]).join('').substring(0, 2)
                          : a.employeeId.slice(-2)}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-800">
                          {a.employee?.fullName || a.employeeId}
                        </div>
                        <div className="text-[10px] text-slate-400">
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
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <History className="w-4 h-4 text-purple-600" />
                <span>Audit Trail & History</span>
              </h3>
            </div>

            <div className="space-y-3.5 max-h-80 overflow-y-auto pr-1">
              {!task.history || task.history.length === 0 ? (
                <div className="text-xs text-slate-400 italic text-center py-4">
                  No history logged yet.
                </div>
              ) : (
                task.history.map((h) => (
                  <div key={h.id} className="relative pl-4 border-l-2 border-slate-200 text-xs">
                    <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-purple-500" />
                    <div className="font-semibold text-slate-800">{h.description}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
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
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Select Employee to Assign
              </label>
              <select
                value={reassignEmpId}
                onChange={(e) => setReassignEmpId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                {employees.map((emp) => (
                  <option key={emp.employeeId} value={emp.employeeId}>
                    {emp.employeeId} - {emp.fullName} ({emp.department} • {emp.position})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsReassignOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={reassigning}
                className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors disabled:opacity-50"
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
            <p className="text-sm text-slate-600">
              Are you sure you want to delete <strong className="text-slate-900">"{task.title}"</strong>?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsDeleteOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors disabled:opacity-50"
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
