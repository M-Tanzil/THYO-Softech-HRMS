import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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

export default function TaskListPage() {
  const [tasks, setTasks] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [analytics, setAnalytics] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
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

  // Load KPI analytics
  const loadAnalytics = async () => {
    try {
      const res = await apiClient.get('/reports');
      if (res.data.success) {
        setAnalytics(res.data.data.summary);
      }
    } catch (err) {
      console.error('Failed to load analytics summary:', err);
    }
  };

  // Load metadata
  const loadMetadata = async () => {
    try {
      const res = await apiClient.get('/employees/meta');
      if (res.data.success) {
        setDepartments(res.data.data.departments || []);
      }
    } catch (err) {
      console.error('Failed to load departments:', err);
    }
  };

  // Load tasks with filters
  const loadTasks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.status !== 'ALL') params.append('status', filters.status);
      if (filters.priority !== 'ALL') params.append('priority', filters.priority);
      if (filters.department !== 'ALL') params.append('department', filters.department);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      params.append('page', filters.page);
      params.append('limit', filters.limit);

      const res = await apiClient.get(`/tasks?${params.toString()}`);
      if (res.data.success) {
        setTasks(res.data.data);
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }
      }
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
    loadMetadata();
  }, []);

  useEffect(() => {
    loadTasks();
  }, [filters]);

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
      loadTasks();
      loadAnalytics();
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
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Task Management
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Organize, assign, and track employee deliverables across THYO SOFTECH PVT LTD.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View toggle (Grid / Table) */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-2xs">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded ${
                viewMode === 'table' ? 'bg-sky-50 text-sky-600' : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded ${
                viewMode === 'grid' ? 'bg-sky-50 text-sky-600' : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          <Link
            to="/tasks/create"
            className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Task</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Overview Cards */}
      {analytics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Total</span>
              <Layers className="w-4 h-4 text-slate-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{analytics.total}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Tasks created</div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
            <div className="flex items-center justify-between text-amber-500 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Pending</span>
              <Clock className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{analytics.pending}</div>
            <div className="text-[10px] text-amber-600 mt-0.5">Awaiting start</div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
            <div className="flex items-center justify-between text-sky-500 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">In Progress</span>
              <PlayCircle className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{analytics.inProgress}</div>
            <div className="text-[10px] text-sky-600 mt-0.5">Active progress</div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
            <div className="flex items-center justify-between text-purple-500 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">On Hold</span>
              <PauseCircle className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{analytics.onHold}</div>
            <div className="text-[10px] text-purple-600 mt-0.5">Paused tasks</div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
            <div className="flex items-center justify-between text-emerald-500 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Completed</span>
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{analytics.completed}</div>
            <div className="text-[10px] text-emerald-600 mt-0.5">{analytics.completionRate}% rate</div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
            <div className="flex items-center justify-between text-rose-500 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Overdue</span>
              <AlertCircle className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold text-rose-600">{analytics.overdue}</div>
            <div className="text-[10px] text-rose-600 mt-0.5">Deadline passed</div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <TaskFilters
        filters={filters}
        onChange={setFilters}
        onReset={handleFilterReset}
        departments={departments}
      />

      {/* Task Listing View */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center text-sm text-slate-400">
          Loading tasks from database...
        </div>
      ) : viewMode === 'table' ? (
        <TaskTable tasks={tasks} onDeleteTask={handleDeletePrompt} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-4 py-3 border border-slate-200 rounded-xl text-xs text-slate-600">
          <div>
            Showing <span className="font-semibold text-slate-800">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
            <span className="font-semibold text-slate-800">
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{' '}
            of <span className="font-semibold text-slate-800">{pagination.total}</span> records
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
              className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-2 font-medium">
              Page {pagination.page} of {pagination.totalPages}
            </span>

            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
              className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
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
          <p className="text-sm text-slate-600">
            Are you sure you want to permanently delete task{' '}
            <strong className="text-slate-900">"{deleteModal.taskTitle}"</strong>?
          </p>
          <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-100">
            Warning: This action will permanently cascade and delete all associated assignments, progress logs, history records, and comments.
          </p>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={() => setDeleteModal({ isOpen: false, taskId: null, taskTitle: '' })}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
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
