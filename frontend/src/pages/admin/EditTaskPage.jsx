import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import apiClient from '../../api/client';
import TaskForm from '../../components/tasks/TaskForm';

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
    <div className="max-w-4xl mx-auto space-y-6">
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
            <Link to={`/tasks/${id}`} className="hover:text-sky-600">{task.title}</Link>
            <span>/</span>
            <span className="text-slate-600 font-medium">Edit</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Edit Task: {task.title}
          </h2>
        </div>
      </div>

      <TaskForm initialData={task} isEdit={true} />
    </div>
  );
}
