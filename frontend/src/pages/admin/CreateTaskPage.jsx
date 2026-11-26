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
          className="p-2 text-[#64748B] hover:text-[#0F172A] hover:bg-white rounded-lg border border-[#E2E8F0] shadow-2xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <div className="flex items-center gap-2 text-xs text-[#64748B]">
            <Link to="/tasks" className="hover:text-[#0084FF]">Tasks</Link>
            <span>/</span>
            <span className="text-[#0F172A] font-medium">New Task</span>
          </div>
          <h2 className="text-xl font-bold text-[#0F172A] tracking-tight">
            Create & Assign Task
          </h2>
        </div>
      </div>

      {/* Form Container */}
      <TaskForm />
    </div>
  );
}
