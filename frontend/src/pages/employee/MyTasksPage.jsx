import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  CheckCircle2,
  Clock,
  PlayCircle,
  PauseCircle,
  AlertCircle,
  Search,
  Calendar,
  Sparkles,
  ArrowRight,
  User,
  Shield,
  Filter,
  Check
} from 'lucide-react';
import apiClient from '../../api/client';
import StatusBadge from '../../components/common/StatusBadge';
import PriorityBadge from '../../components/common/PriorityBadge';
import ProgressBar from '../../components/common/ProgressBar';
import { SkeletonCard } from '../../components/common/SkeletonLoader';
import { useAuth } from '../../context/AuthContext';

/**
 * Helper to compute effective overdue status
 * Rule: If current date/time > dueDate AND task is not COMPLETED/CANCELLED -> OVERDUE
 */
export function getEffectiveStatus(task) {
  if (!task) return 'PENDING';
  const status = (task.status || 'PENDING').toUpperCase();
  if (status === 'COMPLETED' || status === 'CANCELLED') {
    return status;
  }
  if (task.deadline && new Date(task.deadline) < new Date()) {
    return 'OVERDUE';
  }
  return status;
}

/**
 * Responsive Flexbox Employee Task Card
 */
function EmployeeFlexTaskCard({ task, isFeatured = false }) {
  const deadlineDate = new Date(task.deadline);
  const now = new Date();
  const isPastDeadline = deadlineDate < now;
  const effectiveStatus = getEffectiveStatus(task);
  const isOverdue = effectiveStatus === 'OVERDUE';

  // Assignment & Progress
  const assignment = task.assignments?.[0];
  const progress = assignment?.progress ?? 0;

  // Format Due Date & Time: "20 Sep 2026, 5:00 PM"
  const formattedDueDate = deadlineDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
  const formattedDueTime = deadlineDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  const dueDisplay = `${formattedDueDate}${formattedDueTime !== '12:00 AM' ? `, ${formattedDueTime}` : ''}`;

  // Format Assigned Date
  const assignedDate = new Date(assignment?.assignedAt || task.createdAt);
  const formattedAssignedDate = assignedDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const creatorName = task.creator?.fullName || task.createdBy || 'Administration';

  if (isFeatured) {
    return (
      <div className="bg-[#F0F9FF] rounded-2xl border-2 border-[#BAE6FD] p-6 shadow-sm hover:shadow-md transition-all">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#BAE6FD]/80 pb-4 mb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#1E40AF] bg-[#E0F2FE] px-2.5 py-0.5 rounded-full">
                {task.category || 'General'}
              </span>
              <PriorityBadge priority={task.priority} />
              <StatusBadge status={effectiveStatus} />
              {isOverdue && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                  <AlertCircle className="w-3 h-3" />
                  Past Due Time
                </span>
              )}
            </div>
            <h3 className="text-xl font-bold text-[#0F172A] tracking-tight pt-1">
              {task.title}
            </h3>
          </div>

          <Link
            to={`/my-tasks/${task.id}`}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#0084FF] hover:bg-[#1C4ED8] text-white text-xs font-bold rounded-xl shadow-xs transition-all shrink-0 cursor-pointer"
          >
            <span>View Task</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <p className="text-xs text-[#64748B] leading-relaxed mb-5 line-clamp-3">
          {task.description || 'No detailed instructions provided.'}
        </p>

        {/* Progress bar */}
        <div className="space-y-1.5 mb-5 bg-white p-3.5 rounded-xl border border-[#E2E8F0]">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#0F172A]">Deliverable Progress</span>
            <span className="font-bold text-[#0084FF]">{progress}%</span>
          </div>
          <ProgressBar progress={progress} size="md" />
        </div>

        {/* Deliverable Meta Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-[#64748B] pt-3 border-t border-[#BAE6FD]/80">
          <div>
            <span className="text-[11px] text-[#64748B] block">Due Date & Time:</span>
            <span className={`font-semibold ${isOverdue ? 'text-rose-600' : 'text-[#0F172A]'}`}>
              {dueDisplay}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-[#64748B] block">Assigned Date:</span>
            <span className="font-medium text-[#0F172A]">{formattedAssignedDate}</span>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <span className="text-[11px] text-[#64748B] block">Assigned By:</span>
            <span className="font-medium text-[#0F172A] truncate block">{creatorName}</span>
          </div>
        </div>
      </div>
    );
  }

  // Standard Flex Card
  return (
    <div className="flex-1 min-w-[280px] max-w-full md:max-w-[calc(50%-0.5rem)] xl:max-w-[calc(33.333%-0.67rem)] bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-xs flex flex-col justify-between hover:border-[#0084FF]/50 hover:shadow-md transition-all duration-200">
      <div>
        {/* Card Header: Category & Priority */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#1E40AF] bg-[#E0F2FE] px-2 py-0.5 rounded">
            {task.category || 'General'}
          </span>
          <div className="flex items-center gap-1">
            <PriorityBadge priority={task.priority} />
            <StatusBadge status={effectiveStatus} />
          </div>
        </div>

        {/* Task Title */}
        <h4 className="text-base font-bold text-[#0F172A] line-clamp-1 mb-1.5 hover:text-[#0084FF] transition-colors">
          <Link to={`/my-tasks/${task.id}`}>{task.title}</Link>
        </h4>

        {/* Description */}
        <p className="text-xs text-[#64748B] line-clamp-2 leading-relaxed mb-4">
          {task.description || 'No description provided.'}
        </p>

        {/* Overdue Alert Banner if past due */}
        {isOverdue && (
          <div className="mb-3 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-semibold flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span>Task is past due time!</span>
          </div>
        )}

        {/* Progress */}
        <div className="space-y-1 mb-4">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[#64748B]">Progress:</span>
            <span className="font-bold text-[#0F172A]">{progress}%</span>
          </div>
          <ProgressBar progress={progress} size="sm" />
        </div>
      </div>

      {/* Card Footer: Metadata & Action Button */}
      <div className="pt-3 border-t border-[#E2E8F0] space-y-3">
        <div className="flex items-center justify-between text-[11px] text-[#64748B]">
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-[#64748B]" />
            <span className={isOverdue ? 'text-rose-600 font-bold' : 'text-[#0F172A]'}>
              Due: {dueDisplay}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="text-[10px] text-[#64748B] truncate max-w-[140px]">
            By: <strong className="text-[#0F172A]">{creatorName}</strong>
          </span>

          <Link
            to={`/my-tasks/${task.id}`}
            className="px-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-[#0084FF] text-[#0F172A] hover:text-white hover:border-[#0084FF] text-xs font-semibold rounded-lg transition-colors cursor-pointer shrink-0"
          >
            View Task
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function MyTasksPage() {
  const {
    currentUser,
    activeEmpId
  } = useAuth();

  const [activeTab, setActiveTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 350);
    return () => clearTimeout(handler);
  }, [search]);

  const displayedName = currentUser?.fullName || activeEmpId;
  const displayedDept = currentUser?.department || 'General';
  const displayedPosition = currentUser?.position || currentUser?.designation || 'Staff';

  // React Query for employee tasks with keepPreviousData for instant, smooth filtering
  const {
    data: tasks = [],
    isLoading: tasksLoading,
    isError: tasksError,
    error: tasksErrObj,
    refetch: fetchMyTasks
  } = useQuery({
    queryKey: ['myTasks', currentUser?.employeeId || activeEmpId, activeTab, debouncedSearch, sortBy],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeTab !== 'ALL') params.append('status', activeTab);
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (sortBy) params.append('sortBy', sortBy);

      const res = await apiClient.get(`/tasks/my?${params.toString()}`);
      return res.data?.success ? (res.data.data || []) : [];
    },
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 2
  });

  const loading = tasksLoading && tasks.length === 0;

  const handleSearchSubmit = (e) => {
    e.preventDefault();
  };

  // Status Tabs definition
  const tabs = [
    { id: 'ALL', label: 'All Tasks' },
    { id: 'PENDING', label: 'Pending' },
    { id: 'IN_PROGRESS', label: 'In Progress' },
    { id: 'ON_HOLD', label: 'On Hold' },
    { id: 'COMPLETED', label: 'Completed' },
    { id: 'OVERDUE', label: 'Overdue' }
  ];

  // Latest Task is the newest assigned task based on database timestamp (createdAt / assignedAt)
  const latestTask = tasks.length > 0 ? tasks[0] : null;
  const otherTasks = tasks.length > 1 ? tasks.slice(1) : [];

  return (
    <div className="space-y-6">
      {/* Header with Employee Greeting & Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight">
              Employee Dashboard
            </h2>
            <span className="px-2.5 py-0.5 bg-[#E0F2FE] text-[#1E40AF] border border-[#BAE6FD] text-[10px] font-extrabold rounded-full uppercase tracking-wider">
              My Assigned Tasks
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            Viewing real database deliverables assigned to{' '}
            <strong className="text-[#0F172A]">{displayedName}</strong> ({displayedPosition}, {displayedDept}).
          </p>
        </div>

        <button
          onClick={fetchMyTasks}
          className="px-3.5 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-[#E0F2FE] text-[#0F172A] hover:text-[#1E40AF] text-xs font-semibold rounded-lg transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
        >
          Refresh Deliverables
        </button>
      </div>

      {/* Tabs & Search Filter Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-3">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[#0084FF] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Sort */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 md:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#64748B]" />
            <input
              type="text"
              placeholder="Search assigned tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#0084FF]"
            />
          </form>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0084FF] cursor-pointer"
          >
            <option value="newest">Newest First</option>
            <option value="deadline">Due Date</option>
            <option value="priority">Priority</option>
          </select>
        </div>
      </div>

      {/* Error Banner */}
      {tasksError && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{tasksErrObj?.friendlyMessage || tasksErrObj?.message || 'Failed to load assigned tasks.'}</span>
          </div>
          <button
            onClick={() => fetchMyTasks()}
            className="px-2.5 py-1 bg-white border border-rose-200 rounded text-rose-700 hover:bg-rose-100 text-xs font-semibold cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Content Rendering */}
      {loading ? (
        <div className="space-y-4">
          <SkeletonCard count={3} />
        </div>
      ) : tasks.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center mx-auto mb-3 text-[#64748B]">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-[#0F172A] mb-1">No tasks in this category</h4>
          <p className="text-xs text-[#64748B] max-w-sm mx-auto">
            You currently have no tasks marked under "{activeTab}". Newly assigned tasks from your supervisor will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* 1. LATEST TASK SECTION */}
          {latestTask && (
            <div>
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#E2E8F0]">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#0084FF]" />
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#0F172A]">
                    LATEST TASK
                  </h3>
                </div>
                <span className="text-[11px] text-[#64748B] font-medium">
                  Most recent database assignment
                </span>
              </div>

              {/* Render Latest Task in Featured Flex Card */}
              <EmployeeFlexTaskCard task={latestTask} isFeatured={true} />
            </div>
          )}

          {/* 2. ALL ASSIGNED TASKS (FLEXBOX CARDS) */}
          <div>
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#E2E8F0]">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#0F172A]">
                ALL ASSIGNED TASKS ({tasks.length})
              </h3>
              <span className="text-[11px] text-[#64748B] font-medium">
                Responsive Flexbox Cards
              </span>
            </div>

            {/* Responsive Flexbox Container */}
            <div className="flex flex-wrap gap-4">
              {tasks.map((task) => (
                <EmployeeFlexTaskCard key={task.id} task={task} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
