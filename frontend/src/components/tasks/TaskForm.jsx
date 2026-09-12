import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Users,
  Building2,
  Briefcase,
  Globe,
  Calendar,
  Clock,
  Tag,
  AlertCircle,
  Save,
  X
} from 'lucide-react';
import apiClient from '../../api/client';

export default function TaskForm({ initialData = null, isEdit = false, onSubmitSuccess }) {
  const navigate = useNavigate();

  // Form State
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    category: initialData?.category || 'IT',
    priority: initialData?.priority || 'MEDIUM',
    deadline: initialData?.deadline
      ? new Date(initialData.deadline).toISOString().split('T')[0]
      : '',
    estimatedHours: initialData?.estimatedHours || '',
    tags: initialData?.tags || '',
    assignmentType: initialData?.assignmentType || 'INDIVIDUAL',
    employeeId: initialData?.targetValue || 'EMP001',
    employeeIds: [],
    targetDepartment: 'IT',
    targetPosition: 'Software Developer'
  });

  // Metadata dropdowns
  const [employees, setEmployees] = useState([]);
  const [metadata, setMetadata] = useState({ departments: [], positions: [] });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');

  // Fetch employees and metadata
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [empRes, metaRes] = await Promise.all([
          apiClient.get('/employees'),
          apiClient.get('/employees/meta')
        ]);
        if (empRes.data.success) setEmployees(empRes.data.data);
        if (metaRes.data.success) setMetadata(metaRes.data.data);
      } catch (err) {
        console.error('Failed to load form metadata:', err);
      }
    };
    loadMetadata();
  }, []);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear inline error
    if (errors[field]) {
      setErrors(prev => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  const handleMultipleEmployeeToggle = (empId) => {
    setFormData(prev => {
      const current = prev.employeeIds || [];
      const updated = current.includes(empId)
        ? current.filter(id => id !== empId)
        : [...current, empId];
      return { ...prev, employeeIds: updated };
    });
    if (errors.employeeIds) {
      setErrors(prev => {
        const copy = { ...prev };
        delete copy.employeeIds;
        return copy;
      });
    }
  };

  // Client-side validation
  const validate = () => {
    const errs = {};
    if (!formData.title.trim()) {
      errs.title = 'Task title is required.';
    } else if (formData.title.trim().length < 3) {
      errs.title = 'Title must be at least 3 characters.';
    }

    if (!formData.description.trim()) {
      errs.description = 'Task description is required.';
    } else if (formData.description.trim().length < 5) {
      errs.description = 'Description must be at least 5 characters.';
    }

    if (!formData.deadline) {
      errs.deadline = 'Please select a valid deadline date.';
    }

    if (!isEdit) {
      if (formData.assignmentType === 'INDIVIDUAL' && !formData.employeeId) {
        errs.employeeId = 'Please select an employee.';
      }
      if (formData.assignmentType === 'MULTIPLE' && formData.employeeIds.length === 0) {
        errs.employeeIds = 'Please select at least one employee.';
      }
      if (formData.assignmentType === 'DEPARTMENT' && !formData.targetDepartment) {
        errs.targetDepartment = 'Please select a department.';
      }
      if (formData.assignmentType === 'POSITION' && !formData.targetPosition) {
        errs.targetPosition = 'Please select a designation/position.';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validate()) return;

    setLoading(true);
    try {
      if (isEdit && initialData?.id) {
        const res = await apiClient.put(`/tasks/${initialData.id}`, {
          title: formData.title,
          description: formData.description,
          category: formData.category,
          priority: formData.priority,
          deadline: formData.deadline,
          estimatedHours: formData.estimatedHours ? Number(formData.estimatedHours) : 0,
          tags: formData.tags
        });
        if (onSubmitSuccess) onSubmitSuccess(res.data.data);
        else navigate(`/tasks/${initialData.id}`);
      } else {
        const payload = {
          title: formData.title,
          description: formData.description,
          category: formData.category,
          priority: formData.priority,
          deadline: formData.deadline,
          estimatedHours: formData.estimatedHours ? Number(formData.estimatedHours) : 0,
          tags: formData.tags,
          assignmentType: formData.assignmentType,
          employeeId: formData.employeeId,
          employeeIds: formData.employeeIds,
          targetDepartment: formData.targetDepartment,
          targetPosition: formData.targetPosition
        };

        const res = await apiClient.post('/tasks', payload);
        if (onSubmitSuccess) onSubmitSuccess(res.data.data);
        else navigate('/tasks');
      }
    } catch (err) {
      setServerError(err.friendlyMessage || 'Failed to save task.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {serverError && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Unable to submit task</div>
            <div>{serverError}</div>
          </div>
        </div>
      )}

      {/* Basic Task Information Panel */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h3 className="text-base font-semibold text-slate-800 border-b border-slate-100 pb-3">
          1. Task Details
        </h3>

        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Task Title <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Prepare Monthly Sales Report"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            className={`w-full px-3.5 py-2.5 rounded-lg border text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 ${
              errors.title ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 bg-slate-50/50'
            }`}
          />
          {errors.title && <p className="text-xs text-rose-500 mt-1">{errors.title}</p>}
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Task Description <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={4}
            placeholder="Provide clear instructions, deliverables, and acceptance criteria for this task..."
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            className={`w-full px-3.5 py-2.5 rounded-lg border text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 leading-relaxed ${
              errors.description ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 bg-slate-50/50'
            }`}
          />
          {errors.description && <p className="text-xs text-rose-500 mt-1">{errors.description}</p>}
        </div>

        {/* Category & Estimated Hours */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => handleChange('category', e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-200 bg-slate-50/50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="IT">IT & Software</option>
              <option value="HR">HR & Recruitment</option>
              <option value="Sales">Sales & Revenue</option>
              <option value="Operations">Operations & Facilities</option>
              <option value="Documentation">Documentation & Audit</option>
              <option value="General">General / Administrative</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Estimated Hours
            </label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="number"
                min="0"
                step="0.5"
                placeholder="e.g. 12"
                value={formData.estimatedHours}
                onChange={(e) => handleChange('estimatedHours', e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-slate-200 bg-slate-50/50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>
        </div>

        {/* Priority & Deadline */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Priority <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => {
                const isSelected = formData.priority === p;
                return (
                  <button
                    type="button"
                    key={p}
                    onClick={() => handleChange('priority', p)}
                    className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                      isSelected
                        ? p === 'URGENT'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                          : p === 'HIGH'
                          ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                          : p === 'MEDIUM'
                          ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                          : 'bg-slate-700 text-white border-slate-700 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Deadline <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={formData.deadline}
                onChange={(e) => handleChange('deadline', e.target.value)}
                className={`w-full pl-9 pr-3.5 py-2 rounded-lg border text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                  errors.deadline ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 bg-slate-50/50'
                }`}
              />
            </div>
            {errors.deadline && <p className="text-xs text-rose-500 mt-1">{errors.deadline}</p>}
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Tags (Optional)
          </label>
          <div className="relative">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="e.g. Q3, Frontend, Audit, Client-A"
              value={formData.tags}
              onChange={(e) => handleChange('tags', e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-slate-200 bg-slate-50/50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>
      </div>

      {/* Assignment Type Panel (Only for Task Creation, not general edit) */}
      {!isEdit && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-semibold text-slate-800">
                2. Assignment Strategy
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Targeted distribution handled automatically by the backend.
              </p>
            </div>
          </div>

          {/* Type Selector Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              { id: 'INDIVIDUAL', label: 'Individual', icon: User },
              { id: 'MULTIPLE', label: 'Multiple', icon: Users },
              { id: 'DEPARTMENT', label: 'Department', icon: Building2 },
              { id: 'POSITION', label: 'Position', icon: Briefcase },
              { id: 'ALL', label: 'All Staff', icon: Globe }
            ].map(({ id, label, icon: Icon }) => (
              <button
                type="button"
                key={id}
                onClick={() => handleChange('assignmentType', id)}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all ${
                  formData.assignmentType === id
                    ? 'bg-sky-50 border-sky-500 text-sky-700 font-semibold ring-1 ring-sky-500 shadow-xs'
                    : 'bg-slate-50/80 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4 mb-1" />
                <span className="text-xs">{label}</span>
              </button>
            ))}
          </div>

          {/* Conditional Assignment Inputs */}
          <div className="pt-2">
            {/* 1. Individual */}
            {formData.assignmentType === 'INDIVIDUAL' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Select Employee <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.employeeId}
                  onChange={(e) => handleChange('employeeId', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50/50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {employees.map((emp) => (
                    <option key={emp.employeeId} value={emp.employeeId}>
                      {emp.employeeId} - {emp.fullName} ({emp.department} • {emp.position})
                    </option>
                  ))}
                </select>
                {errors.employeeId && (
                  <p className="text-xs text-rose-500 mt-1">{errors.employeeId}</p>
                )}
              </div>
            )}

            {/* 2. Multiple */}
            {formData.assignmentType === 'MULTIPLE' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Select Employees <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto p-1 border border-slate-200 rounded-lg bg-slate-50/40">
                  {employees.map((emp) => {
                    const isChecked = formData.employeeIds.includes(emp.employeeId);
                    return (
                      <label
                        key={emp.employeeId}
                        className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-sky-50 border-sky-300 text-sky-900 font-medium'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleMultipleEmployeeToggle(emp.employeeId)}
                          className="rounded text-sky-600 focus:ring-sky-500 h-4 w-4"
                        />
                        <div className="text-xs">
                          <div className="font-semibold text-slate-800">{emp.fullName}</div>
                          <div className="text-slate-500 text-[11px]">
                            {emp.employeeId} • {emp.department}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
                {errors.employeeIds && (
                  <p className="text-xs text-rose-500 mt-1">{errors.employeeIds}</p>
                )}
              </div>
            )}

            {/* 3. Department */}
            {formData.assignmentType === 'DEPARTMENT' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Target Department <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.targetDepartment}
                  onChange={(e) => handleChange('targetDepartment', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50/50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {(metadata.departments.length > 0
                    ? metadata.departments
                    : ['IT', 'HR', 'Operations', 'Sales']
                  ).map((dept) => (
                    <option key={dept} value={dept}>
                      {dept} Department
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1.5">
                  The backend will automatically assign this task to every active employee currently in this department.
                </p>
              </div>
            )}

            {/* 4. Position */}
            {formData.assignmentType === 'POSITION' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Target Position / Role <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.targetPosition}
                  onChange={(e) => handleChange('targetPosition', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50/50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {(metadata.positions.length > 0
                    ? metadata.positions
                    : ['Software Developer', 'HR Executive', 'Operations Executive', 'Sales Executive']
                  ).map((pos) => (
                    <option key={pos} value={pos}>
                      {pos}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1.5">
                  All active employees holding this title will automatically receive individual task assignments.
                </p>
              </div>
            )}

            {/* 5. All Staff */}
            {formData.assignmentType === 'ALL' && (
              <div className="p-4 rounded-lg bg-sky-50 border border-sky-100 text-sky-800 text-xs leading-relaxed flex items-start gap-2.5">
                <Globe className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block mb-0.5">Company-Wide Assignment</span>
                  This task will be assigned to all active employees across THYO SOFTECH PVT LTD. Each employee will receive an individual assignment entry and instant notification.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="px-5 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 transition-colors shadow-sm disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{loading ? 'Saving...' : isEdit ? 'Update Task' : 'Create Task'}</span>
        </button>
      </div>
    </form>
  );
}
