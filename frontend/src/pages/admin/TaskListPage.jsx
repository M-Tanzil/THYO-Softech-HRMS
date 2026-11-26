import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  Plus,
  LayoutGrid,
  List,
  CheckCircle2,
  Clock,
  PlayCircle,
  PauseCircle,
  AlertCircle,
  Layers,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import apiClient from '../../api/client';
import TaskFilters from '../../components/tasks/TaskFilters';
import TaskTable from '../../components/tasks/TaskTable';
import TaskCard from '../../components/tasks/TaskCard';
import Modal from '../../components/common/Modal';
import { SkeletonStats, SkeletonTable } from '../../components/common/SkeletonLoader';
import { useAuth } from '../../context/AuthContext';

export default function TaskListPage() {
  const { isAdmin, isManagerOrAdmin, isManager, isHR, activeRole, currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'

  // Filter state
  const [filters, setFilters] = useState({
    search: '',
    status: 'ALL',
    priority: 'ALL',
    department: 'ALL',
    sortBy: 'newest',
    page: 1,
    limit: 10
  });

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, taskId: null, taskTitle: '' });
  const [deleting, setDeleting] = useState(false);

  // Debounced search query to prevent hammering API on every keystroke
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 350);
    return () => clearTimeout(handler);
  }, [filters.search]);

  // Load KPI analytics via React Query (Admin / HR / Manager only)
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['taskAnalyticsSummary'],
    queryFn: async () => {
      const res = await apiClient.get('/reports');
      return res.data?.success ? res.data.data.summary : null;
    },
    enabled: !!isManagerOrAdmin,
    staleTime: 1000 * 60 * 3
  });

  // Load metadata for department filter (shared canonical shape with TaskReportsPage)
  const { data: employeeMeta } = useQuery({
    queryKey: ['employeeMetadata'],
    queryFn: async () => {
      const res = await apiClient.get('/employees/meta');
      return res.data?.success ? res.data.data : { departments: [], positions: [], designations: [] };
    },
    staleTime: 1000 * 60 * 10
  });
  const departments = Array.isArray(employeeMeta?.departments)
    ? employeeMeta.departments
    : Array.isArray(employeeMeta)
      ? employeeMeta
      : [];

  // Load tasks with filters and keepPreviousData for smooth pagination
  const { data: tasksResult, isLoading: tasksLoading, isFetching } = useQuery({
    queryKey: [
      'adminTasks',
      {
        debouncedSearch,
        status: filters.status,
        priority: filters.priority,
        department: filters.department,
        sortBy: filters.sortBy,
        page: filters.page,
        limit: filters.limit
      }
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (filters.status !== 'ALL') params.append('status', filters.status);
      if (filters.priority !== 'ALL') params.append('priority', filters.priority);
      if (filters.department !== 'ALL') params.append('department', filters.department);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      params.append('page', filters.page);
      params.append('limit', filters.limit);

      const res = await apiClient.get(`/tasks?${params.toString()}`);
      if (res.data.success) {
        return {
          tasks: res.data.data || [],
          pagination: res.data.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 }
        };
      }
      return { tasks: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 1 } };
    },
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 2
  });

  const tasks = tasksResult?.tasks || [];
  const pagination = tasksResult?.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 };
  const initialLoading = !tasksResult && tasksLoading;

  const handleFilterReset = () => {
    setFilters({
      search: '',
      status: 'ALL',
      priority: 'ALL',
      department: 'ALL',
      sortBy: 'newest',
      page: 1,
      limit: 10
    });
  };

  const handleDeletePrompt = (taskId, taskTitle) => {
    setDeleteModal({ isOpen: true, taskId, taskTitle });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.taskId) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/tasks/${deleteModal.taskId}`);
      setDeleteModal({ isOpen: false, taskId: null, taskTitle: '' });
      queryClient.invalidateQueries({ queryKey: ['adminTasks'] });
      queryClient.invalidateQueries({ queryKey: ['taskAnalyticsSummary'] });
    } catch (err) {
      alert(err.friendlyMessage || 'Failed to delete task.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight">
              {isManager
                ? 'Manager Dashboard'
                : isAdmin
                ? 'Admin Dashboard'
                : isHR
                ? 'HR Task Dashboard'
                : 'Task Management'}
            </h2>
            {isManager && (
              <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                {currentUser?.department} Department
              </span>
            )}
            {isAdmin && (
              <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                Master Authority
              </span>
            )}
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            {isManager
              ? `Manage deliverables, assign tasks to authorized ${currentUser?.department || 'team'} employees, and track team progress.`
              : 'Full task administration, employee deliverable assignments, and company-wide progress tracking.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View toggle (Grid / Table) */}
          <div className="flex items-center bg-white border border-[#E2E8F0] rounded-lg p-1 shadow-2xs">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'table' ? 'bg-[#E0F2FE] text-[#0084FF]' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'grid' ? 'bg-[#E0F2FE] text-[#0084FF]' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          {isManagerOrAdmin && (
            <Link
              to="/tasks/create"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#0084FF] hover:bg-[#1C4ED8] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create & Assign Task</span>
            </Link>
          )}
        </div>
      </div>

      {/* KPI Stats Overview Cards */}
      {analytics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-3.5 shadow-2xs">
            <div className="flex items-center justify-between text-[#64748B] mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Total</span>
              <Layers className="w-4 h-4 text-[#64748B]" />
            </div>
            <div className="text-2xl font-bold text-[#0F172A]">{analytics.total}</div>
            <div className="text-[10px] text-[#64748B] mt-0.5">Tasks created</div>
          </div>

          <div className="bg-white rounded-xl border border-[#E2E8F0] p-3.5 shadow-2xs">
            <div className="flex items-center justify-between text-amber-500 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Pending</span>
              <Clock className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold text-[#0F172A]">{analytics.pending}</div>
            <div className="text-[10px] text-amber-600 mt-0.5">Awaiting start</div>
          </div>

          <div className="bg-white rounded-xl border border-[#E2E8F0] p-3.5 shadow-2xs">
            <div className="flex items-center justify-between text-[#0084FF] mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">In Progress</span>
              <PlayCircle className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold text-[#0F172A]">{analytics.inProgress}</div>
            <div className="text-[10px] text-[#0084FF] font-medium mt-0.5">Active progress</div>
          </div>

          <div className="bg-white rounded-xl border border-[#E2E8F0] p-3.5 shadow-2xs">
            <div className="flex items-center justify-between text-purple-500 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">On Hold</span>
              <PauseCircle className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold text-[#0F172A]">{analytics.onHold}</div>
            <div className="text-[10px] text-purple-600 mt-0.5">Paused tasks</div>
          </div>

          <div className="bg-white rounded-xl border border-[#E2E8F0] p-3.5 shadow-2xs">
            <div className="flex items-center justify-between text-emerald-500 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Completed</span>
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold text-[#0F172A]">{analytics.completed}</div>
            <div className="text-[10px] text-emerald-600 mt-0.5">{analytics.completionRate}% rate</div>
          </div>

          <div className="bg-white rounded-xl border border-[#E2E8F0] p-3.5 shadow-2xs">
            <div className="flex items-center justify-between text-rose-500 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Overdue</span>
              <AlertCircle className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold text-rose-600">{analytics.overdue}</div>
            <div className="text-[10px] text-rose-600 mt-0.5">Deadline passed</div>
          </div>
        </div>
      )}

      {/* Manager Team Scope Banner */}
      {isManager && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            <span>
              Manager Authority: Displaying tasks for <strong>{currentUser?.department || 'Sales'} Department</strong>. You have team-level authority to create, assign, and track deliverables.
            </span>
          </div>
          <span className="font-bold text-[10px] uppercase px-2 py-0.5 rounded bg-amber-200/80 text-amber-900 tracking-wider">
            {currentUser?.department || 'Team'} Scope
          </span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <TaskFilters
        filters={filters}
        onChange={setFilters}
        onReset={handleFilterReset}
        departments={departments}
        showDepartment={!isManager}
      />

      {/* Task Listing View */}
      {initialLoading ? (
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-4">
          <SkeletonTable rows={5} cols={6} />
        </div>
      ) : viewMode === 'table' ? (
        <TaskTable tasks={tasks} onDeleteTask={isAdmin ? handleDeletePrompt : null} canEdit={isManagerOrAdmin} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-4 py-3 border border-[#E2E8F0] rounded-xl text-xs text-[#64748B]">
          <div>
            Showing <span className="font-semibold text-[#0F172A]">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
            <span className="font-semibold text-[#0F172A]">
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{' '}
            of <span className="font-semibold text-[#0F172A]">{pagination.total}</span> records
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
              className="p-1.5 rounded-lg border border-[#E2E8F0] disabled:opacity-40 hover:bg-[#F8FAFC] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-2 font-medium">
              Page {pagination.page} of {pagination.totalPages}
            </span>

            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
              className="p-1.5 rounded-lg border border-[#E2E8F0] disabled:opacity-40 hover:bg-[#F8FAFC] transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Delete */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, taskId: null, taskTitle: '' })}
        title="Confirm Task Deletion"
      >
        <div className="space-y-4">
          <p className="text-sm text-[#64748B]">
            Are you sure you want to permanently delete task{' '}
            <strong className="text-[#0F172A]">"{deleteModal.taskTitle}"</strong>?
          </p>
          <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-100">
            Warning: This action will permanently cascade and delete all associated assignments, progress logs, history records, and comments.
          </p>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={() => setDeleteModal({ isOpen: false, taskId: null, taskTitle: '' })}
              className="px-4 py-2 text-xs font-medium text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Delete Task'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
