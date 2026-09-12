import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import TaskForm from '../../components/tasks/TaskForm';

export default function CreateTaskPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg border border-slate-200 shadow-2xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Link to="/tasks" className="hover:text-sky-600">Tasks</Link>
            <span>/</span>
            <span className="text-slate-600 font-medium">New Task</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Create & Assign Task
          </h2>
        </div>
      </div>

      {/* Form Container */}
      <TaskForm />
    </div>
  );
}
