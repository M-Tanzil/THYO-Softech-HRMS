import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  PlayCircle,
  PauseCircle,
  AlertCircle,
  Search,
  ArrowUpDown,
  Filter
} from 'lucide-react';
import apiClient from '../../api/client';
import TaskCard from '../../components/tasks/TaskCard';
import { useAuth } from '../../context/AuthContext';

export default function MyTasksPage() {
  const { currentUser, activeEmpId } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  const fetchMyTasks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab !== 'ALL') params.append('status', activeTab);
      if (search) params.append('search', search);
      if (sortBy) params.append('sortBy', sortBy);

      const res = await apiClient.get(`/tasks/my?${params.toString()}`);
      if (res.data.success) {
        setTasks(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load my tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyTasks();
  }, [activeTab, sortBy, activeEmpId]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchMyTasks();
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          My Assigned Tasks
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Viewing deliverables assigned to <strong className="text-slate-800">{currentUser?.fullName || activeEmpId}</strong> ({currentUser?.position || 'Staff'}).
        </p>
      </div>

      {/* Tabs & Search Filter Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200 pb-3">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Sort */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 md:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search my tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </form>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="newest">Newest</option>
            <option value="deadline">Deadline</option>
            <option value="priority">Priority</option>
          </select>
        </div>
      </div>

      {/* Task Grid */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center text-sm text-slate-400">
          Loading assigned deliverables...
        </div>
      ) : tasks.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-semibold text-slate-800 mb-1">No tasks in this category</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You currently have no tasks marked under "{activeTab}". Select another tab to see other deliverables.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} isEmployeeView={true} />
          ))}
        </div>
      )}
    </div>
  );
}
