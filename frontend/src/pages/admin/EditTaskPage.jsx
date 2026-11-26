import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import apiClient from '../../api/client';
import TaskForm from '../../components/tasks/TaskForm';
import { SkeletonCard } from '../../components/common/SkeletonLoader';

export default function EditTaskPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTask = async () => {
      try {
        const res = await apiClient.get(`/tasks/${id}`);
        if (res.data.success) {
          setTask(res.data.data);
        }
      } catch (err) {
        setError(err.friendlyMessage || 'Failed to load task.');
      } finally {
        setLoading(false);
      }
    };
    fetchTask();
  }, [id]);

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
    <div className="max-w-4xl mx-auto space-y-6">
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
            <Link to={`/tasks/${id}`} className="hover:text-[#0084FF]">{task.title}</Link>
            <span>/</span>
            <span className="text-[#0F172A] font-medium">Edit</span>
          </div>
          <h2 className="text-xl font-bold text-[#0F172A] tracking-tight">
            Edit Task: {task.title}
          </h2>
        </div>
      </div>

      <TaskForm initialData={task} isEdit={true} />
    </div>
  );
}
