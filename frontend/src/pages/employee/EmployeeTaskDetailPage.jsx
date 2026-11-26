import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
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
import { SkeletonCard } from '../../components/common/SkeletonLoader';
import { useAuth } from '../../context/AuthContext';

export default function EmployeeTaskDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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
        queryClient.invalidateQueries({ queryKey: ['myTasks'] });
        queryClient.invalidateQueries({ queryKey: ['adminTasks'] });
        queryClient.invalidateQueries({ queryKey: ['taskAnalyticsSummary'] });
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
        queryClient.invalidateQueries({ queryKey: ['myTasks'] });
        queryClient.invalidateQueries({ queryKey: ['adminTasks'] });
        queryClient.invalidateQueries({ queryKey: ['taskAnalyticsSummary'] });
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
      <div className="max-w-4xl mx-auto space-y-6">
        <SkeletonCard count={2} />
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
          className="p-2 text-[#64748B] hover:text-[#0F172A] hover:bg-white rounded-lg border border-[#E2E8F0] shadow-2xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <div className="flex items-center gap-2 text-xs text-[#64748B]">
            <Link to="/my-tasks" className="hover:text-[#0084FF]">My Tasks</Link>
            <span>/</span>
            <span className="text-[#0F172A] font-medium">Deliverable</span>
          </div>
          <h2 className="text-xl font-bold text-[#0F172A] tracking-tight">
            {task.title}
          </h2>
        </div>
      </div>

      {/* Task Details Card */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
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
            Task Description
          </h4>
          <p className="text-sm text-[#0F172A] leading-relaxed whitespace-pre-line bg-[#F8FAFC] p-4 rounded-lg border border-[#E2E8F0]">
            {task.description}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2 border-t border-[#E2E8F0] text-xs">
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
            <span className="text-[#64748B] block mb-0.5">Estimated Time</span>
            <span className="font-semibold text-[#0F172A] flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#1E40AF]" />
              {task.estimatedHours > 0 ? `${task.estimatedHours} hours` : 'Flexible'}
            </span>
          </div>

          <div>
            <span className="text-[#64748B] block mb-0.5">Assigned By</span>
            <span className="font-semibold text-[#0F172A]">{task.createdBy}</span>
          </div>
        </div>
      </div>

      {/* Employee Progress & Action Control Panel */}
      <div className="bg-white rounded-xl border border-[#BAE6FD] bg-gradient-to-br from-white to-[#F0F9FF] p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-[#BAE6FD]/60 pb-3">
          <div>
            <h3 className="text-base font-bold text-[#0F172A]">
              Update Deliverable Progress
            </h3>
            <p className="text-xs text-[#64748B] mt-0.5">
              Keep your team updated on your execution milestones.
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-[#0084FF]">{currentProgress}%</span>
            <span className="text-[10px] text-[#64748B] block">Completed</span>
          </div>
        </div>

        <ProgressBar progress={currentProgress} size="lg" showLabel={false} />

        {/* Milestone Buttons (0%, 25%, 50%, 75%, 100%) */}
        <div>
          <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
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
                  className={`py-2.5 rounded-lg border font-bold text-xs transition-all cursor-pointer ${
                    isSelected
                      ? stage === 100
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-[#0084FF] text-white border-[#0084FF] shadow-sm'
                      : 'bg-white border-[#E2E8F0] text-[#0F172A] hover:bg-[#F8FAFC]'
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
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0084FF] hover:bg-[#1C4ED8] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
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
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0084FF] hover:bg-[#1C4ED8] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
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
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-semibold text-[#0F172A] flex items-center gap-2 border-b border-[#E2E8F0] pb-3">
          <MessageSquare className="w-4 h-4 text-[#0084FF]" />
          <span>Task Discussion & Updates ({task.comments?.length || 0})</span>
        </h3>

        <div className="space-y-3 max-h-80 overflow-y-auto">
          {!task.comments || task.comments.length === 0 ? (
            <div className="text-xs text-[#64748B] italic text-center py-4">
              No comments yet. Post your first progress update.
            </div>
          ) : (
            task.comments.map((c) => (
              <div key={c.id} className="p-3.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs space-y-1">
                <div className="flex items-center justify-between font-semibold text-[#0F172A]">
                  <span>{c.authorName}</span>
                  <span className="text-[10px] text-[#64748B] font-normal">
                    {new Date(c.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-[#64748B] leading-relaxed">{c.comment}</p>
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
                className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#0F172A] placeholder:text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#0084FF]"
              />
            </div>
            <button
              type="submit"
              disabled={submittingComment || !commentText.trim()}
              className="px-4 py-2 bg-[#0084FF] hover:bg-[#1C4ED8] text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-40 flex items-center gap-1.5 h-10 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submittingComment ? 'Sending...' : 'Send'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Task History Audit Trail */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-semibold text-[#0F172A] flex items-center gap-2 border-b border-[#E2E8F0] pb-3">
          <History className="w-4 h-4 text-[#1E40AF]" />
          <span>Task History Timeline</span>
        </h3>

        <div className="space-y-3 max-h-64 overflow-y-auto">
          {task.history?.map((h) => (
            <div key={h.id} className="relative pl-4 border-l-2 border-[#E2E8F0] text-xs">
              <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-[#0084FF]" />
              <div className="font-semibold text-[#0F172A]">{h.description}</div>
              <div className="text-[10px] text-[#64748B] mt-0.5">
                {new Date(h.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
