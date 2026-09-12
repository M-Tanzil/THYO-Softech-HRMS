import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  PlayCircle,
  PauseCircle,
  CheckCircle2,
  MessageSquare,
  History,
  Send,
  AlertCircle
} from 'lucide-react';
import apiClient from '../../api/client';
import StatusBadge from '../../components/common/StatusBadge';
import PriorityBadge from '../../components/common/PriorityBadge';
import ProgressBar from '../../components/common/ProgressBar';
import { useAuth } from '../../context/AuthContext';

export default function EmployeeTaskDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, activeEmpId } = useAuth();

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [updating, setUpdating] = useState(false);

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
  }, [id]);

  // Find the specific assignment for the logged-in employee
  const myAssignment = task?.assignments?.find(a => a.employeeId === activeEmpId);
  const currentProgress = myAssignment?.progress ?? 0;

  const handleUpdateStatusAndProgress = async (newStatus, newProgress) => {
    setUpdating(true);
    try {
      const res = await apiClient.patch(`/tasks/${id}/status`, {
        status: newStatus,
        progress: newProgress
      });
      if (res.data.success) {
        setTask(res.data.data);
      }
    } catch (err) {
      alert(err.friendlyMessage || 'Failed to update progress.');
    } finally {
      setUpdating(false);
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
      alert(err.friendlyMessage || 'Failed to add comment.');
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-16 text-center text-sm text-slate-400">
        Loading task details...
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="bg-white rounded-xl border border-rose-200 p-8 text-center text-sm text-rose-600">
        {error || 'Task not found.'}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header with back */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg border border-slate-200 shadow-2xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Link to="/my-tasks" className="hover:text-sky-600">My Tasks</Link>
            <span>/</span>
            <span className="text-slate-600 font-medium">Deliverable</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {task.title}
          </h2>
        </div>
      </div>

      {/* Task Details Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
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
            Task Description
          </h4>
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50/50 p-4 rounded-lg border border-slate-100">
            {task.description}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100 text-xs">
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
            <span className="text-slate-400 block mb-0.5">Estimated Time</span>
            <span className="font-semibold text-slate-800 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-purple-600" />
              {task.estimatedHours > 0 ? `${task.estimatedHours} hours` : 'Flexible'}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block mb-0.5">Assigned By</span>
            <span className="font-semibold text-slate-800">{task.createdBy}</span>
          </div>
        </div>
      </div>

      {/* Employee Progress & Action Control Panel */}
      <div className="bg-white rounded-xl border border-sky-200 bg-gradient-to-br from-white to-sky-50/30 p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-sky-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-800">
              Update Deliverable Progress
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Keep your team updated on your execution milestones.
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-sky-700">{currentProgress}%</span>
            <span className="text-[10px] text-slate-400 block">Completed</span>
          </div>
        </div>

        <ProgressBar progress={currentProgress} size="lg" showLabel={false} />

        {/* Milestone Buttons (0%, 25%, 50%, 75%, 100%) */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
            Select Progress Stage
          </label>
          <div className="grid grid-cols-5 gap-2">
            {[0, 25, 50, 75, 100].map((stage) => {
              const isSelected = currentProgress === stage;
              return (
                <button
                  type="button"
                  key={stage}
                  disabled={updating}
                  onClick={() => {
                    const nextStatus = stage === 100 ? 'COMPLETED' : stage > 0 ? 'IN_PROGRESS' : 'PENDING';
                    handleUpdateStatusAndProgress(nextStatus, stage);
                  }}
                  className={`py-2.5 rounded-lg border font-bold text-xs transition-all ${
                    isSelected
                      ? stage === 100
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-sky-600 text-white border-sky-600 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {stage}%
                </button>
              );
            })}
          </div>
        </div>

        {/* Status Transition Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          {task.status === 'PENDING' && (
            <button
              onClick={() => handleUpdateStatusAndProgress('IN_PROGRESS', 25)}
              disabled={updating}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
            >
              <PlayCircle className="w-4 h-4" />
              <span>START TASK</span>
            </button>
          )}

          {task.status === 'IN_PROGRESS' && (
            <>
              <button
                onClick={() => handleUpdateStatusAndProgress('ON_HOLD', currentProgress)}
                disabled={updating}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
              >
                <PauseCircle className="w-4 h-4" />
                <span>PUT ON HOLD</span>
              </button>

              <button
                onClick={() => handleUpdateStatusAndProgress('COMPLETED', 100)}
                disabled={updating}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>MARK AS COMPLETED</span>
              </button>
            </>
          )}

          {task.status === 'ON_HOLD' && (
            <button
              onClick={() => handleUpdateStatusAndProgress('IN_PROGRESS', currentProgress)}
              disabled={updating}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
            >
              <PlayCircle className="w-4 h-4" />
              <span>RESUME TASK</span>
            </button>
          )}

          {task.status === 'COMPLETED' && (
            <div className="flex items-center gap-2 text-emerald-700 text-xs font-semibold bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200">
              <CheckCircle2 className="w-4 h-4" />
              <span>Task marked as fully completed. Well done!</span>
            </div>
          )}
        </div>
      </div>

      {/* Discussion & Comments */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
          <MessageSquare className="w-4 h-4 text-sky-600" />
          <span>Task Discussion & Updates ({task.comments?.length || 0})</span>
        </h3>

        <div className="space-y-3 max-h-80 overflow-y-auto">
          {!task.comments || task.comments.length === 0 ? (
            <div className="text-xs text-slate-400 italic text-center py-4">
              No comments yet. Post your first progress update.
            </div>
          ) : (
            task.comments.map((c) => (
              <div key={c.id} className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 text-xs space-y-1">
                <div className="flex items-center justify-between font-semibold text-slate-800">
                  <span>{c.authorName}</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {new Date(c.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-slate-600 leading-relaxed">{c.comment}</p>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleAddComment} className="pt-2">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <textarea
                rows={2}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Share your progress note or query..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <button
              type="submit"
              disabled={submittingComment || !commentText.trim()}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-40 flex items-center gap-1.5 h-10"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submittingComment ? 'Sending...' : 'Send'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Task History Audit Trail */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
          <History className="w-4 h-4 text-purple-600" />
          <span>Task History Timeline</span>
        </h3>

        <div className="space-y-3 max-h-64 overflow-y-auto">
          {task.history?.map((h) => (
            <div key={h.id} className="relative pl-4 border-l-2 border-slate-200 text-xs">
              <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-purple-500" />
              <div className="font-semibold text-slate-800">{h.description}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {new Date(h.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
