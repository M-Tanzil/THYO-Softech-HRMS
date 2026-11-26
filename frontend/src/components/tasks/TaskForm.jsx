import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
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
  X,
  ShieldAlert,
  Shield,
  Check,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import Modal from '../common/Modal';

export default function TaskForm({ initialData = null, isEdit = false, onSubmitSuccess }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentUser, user = currentUser, isManager, isAdmin } = useAuth();
  const activeUser = user || currentUser;

  // Form State
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    category: initialData?.category || (isManager && activeUser?.department ? activeUser.department : 'IT'),
    priority: initialData?.priority || 'MEDIUM',
    deadline: initialData?.deadline
      ? new Date(initialData.deadline).toISOString().split('T')[0]
      : '',
    estimatedHours: initialData?.estimatedHours || '',
    tags: initialData?.tags || '',
    assignmentType: initialData?.assignmentType || 'INDIVIDUAL',
    employeeId: initialData?.targetValue || '',
    employeeIds: [],
    targetDepartment: isManager && activeUser?.department ? activeUser.department : 'IT',
    targetPosition: 'Software Developer'
  });

  // Metadata dropdowns
  const [employees, setEmployees] = useState([]);
  const [metadata, setMetadata] = useState({ departments: [], positions: [] });
  const [loading, setLoading] = useState(false);
  const [loadingMetadata, setLoadingMetadata] = useState(true);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const isSubmittingRef = useRef(false);

  // Success Confirmation Popup State
  const [successModal, setSuccessModal] = useState({
    isOpen: false,
    taskTitle: '',
    assignedCount: 0,
    assignedEmployees: [],
    taskId: null
  });

  // Failure Popup State
  const [failureModal, setFailureModal] = useState({
    isOpen: false,
    message: ''
  });

  // Fetch real employees and metadata from PostgreSQL through backend API
  useEffect(() => {
    let isMounted = true;
    const loadMetadata = async () => {
      setLoadingMetadata(true);
      try {
        const [empRes, metaRes] = await Promise.all([
          apiClient.get('/employees'),
          apiClient.get('/employees/meta')
        ]);

        if (isMounted) {
          let empList = [];
          if (empRes.data && empRes.data.success) {
            empList = empRes.data.data || [];
            // If manager, filter to manager's department
            if (isManager && activeUser?.department) {
              empList = empList.filter(
                (e) => (e.department || '').toLowerCase() === activeUser.department.toLowerCase()
              );
            }
            setEmployees(empList);
          }

          if (metaRes.data && metaRes.data.success) {
            setMetadata(metaRes.data.data);
          }

          // Ensure default employeeId is set to a valid employee from the fetched list
          setFormData((prev) => {
            const hasValidEmp = empList.some((e) => e.employeeId === prev.employeeId);
            const defaultEmp = hasValidEmp
              ? prev.employeeId
              : empList.length > 0
              ? empList[0].employeeId
              : '';

            return {
              ...prev,
              employeeId: defaultEmp,
              category: isManager && activeUser?.department ? activeUser.department : prev.category,
              targetDepartment: isManager && activeUser?.department ? activeUser.department : prev.targetDepartment
            };
          });
        }
      } catch (err) {
        console.error('Failed to load form metadata:', err);
      } finally {
        if (isMounted) setLoadingMetadata(false);
      }
    };

    loadMetadata();
    return () => {
      isMounted = false;
    };
  }, [isManager, activeUser]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear inline error
    if (errors[field]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  const handleMultipleEmployeeToggle = (empId) => {
    setFormData((prev) => {
      const current = prev.employeeIds || [];
      const updated = current.includes(empId)
        ? current.filter((id) => id !== empId)
        : [...current, empId];
      return { ...prev, employeeIds: updated };
    });
    if (errors.employeeIds) {
      setErrors((prev) => {
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

    // Prevent duplicate simultaneous submissions
    if (isSubmittingRef.current || loading) return;

    setServerError('');

    if (!validate()) return;

    isSubmittingRef.current = true;
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
        queryClient.invalidateQueries({ queryKey: ['adminTasks'] });
        queryClient.invalidateQueries({ queryKey: ['taskAnalyticsSummary'] });
        queryClient.invalidateQueries({ queryKey: ['myTasks'] });
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

        // Real POST request to backend API
        const res = await apiClient.post('/tasks', payload);
        const task = res.data?.data || {};
        const count = res.data?.assignedCount ?? (task.assignments?.length || 0);
        const assignedEmpNames = (task.assignments || []).map(
          (a) => a.employee?.fullName || a.employeeId
        );

        queryClient.invalidateQueries({ queryKey: ['adminTasks'] });
        queryClient.invalidateQueries({ queryKey: ['taskAnalyticsSummary'] });
        queryClient.invalidateQueries({ queryKey: ['myTasks'] });

        // DO NOT show success popup before backend confirms successful creation
        setSuccessModal({
          isOpen: true,
          taskTitle: task.title || formData.title,
          assignedCount: count,
          assignedEmployees: assignedEmpNames,
          taskId: task.id
        });
      }
    } catch (err) {
      const errorMsg = err.friendlyMessage || 'Failed to save task.';
      setServerError(errorMsg);
      if (!isEdit) {
        setFailureModal({
          isOpen: true,
          message: errorMsg
        });
      }
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  const handleSuccessOk = () => {
    const createdId = successModal.taskId;
    const createdTitle = successModal.taskTitle;
    setSuccessModal((prev) => ({ ...prev, isOpen: false }));
    if (onSubmitSuccess && createdId) {
      onSubmitSuccess({ id: createdId, title: createdTitle });
    } else {
      navigate('/tasks');
    }
  };

  const handleSuccessViewTask = () => {
    const createdId = successModal.taskId;
    setSuccessModal((prev) => ({ ...prev, isOpen: false }));
    if (createdId) {
      navigate(`/tasks/${createdId}`);
    } else {
      navigate('/tasks');
    }
  };

  // Available assignment strategies based on RBAC
  const assignmentTabs = [
    { id: 'INDIVIDUAL', label: 'Individual', icon: User },
    { id: 'MULTIPLE', label: 'Multiple', icon: Users },
    { id: 'DEPARTMENT', label: 'Department', icon: Building2 },
    ...(!isManager
      ? [
          { id: 'MANAGERS', label: 'Managers', icon: Shield },
          { id: 'POSITION', label: 'Position', icon: Briefcase },
          { id: 'ALL', label: 'All Staff', icon: Globe }
        ]
      : [])
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {serverError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2.5 shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">Unable to submit task</div>
            <div className="text-xs mt-0.5 leading-relaxed">{serverError}</div>
          </div>
        </div>
      )}

      {/* Scope Alert for Manager */}
      {isManager && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            Manager Scope: You are creating tasks for the <strong>{activeUser?.department}</strong> department. Assignments are restricted to team members in your authorized department.
          </span>
        </div>
      )}

      {/* Basic Task Information Panel */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-[#0F172A] border-b border-[#E2E8F0] pb-3">
          1. Task Details
        </h3>

        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
            Task Title <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Prepare Monthly Sales Report"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            className={`w-full px-3.5 py-2.5 rounded-lg border text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0084FF] focus:bg-white ${
              errors.title ? 'border-rose-400 bg-rose-50/20' : 'border-[#E2E8F0] bg-[#F8FAFC]'
            }`}
          />
          {errors.title && <p className="text-xs text-rose-500 mt-1">{errors.title}</p>}
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
            Task Description <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={4}
            placeholder="Provide clear instructions, deliverables, and acceptance criteria for this task..."
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            className={`w-full px-3.5 py-2.5 rounded-lg border text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0084FF] focus:bg-white ${
              errors.description
                ? 'border-rose-400 bg-rose-50/20'
                : 'border-[#E2E8F0] bg-[#F8FAFC]'
            }`}
          />
          {errors.description && (
            <p className="text-xs text-rose-500 mt-1">{errors.description}</p>
          )}
        </div>

        {/* Category, Priority, Hours, Deadline Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
              Category / Dept
            </label>
            <select
              value={formData.category}
              disabled={isManager}
              onChange={(e) => handleChange('category', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0084FF] disabled:bg-[#F8FAFC] disabled:text-[#64748B] cursor-pointer"
            >
              {(metadata.departments.length > 0
                ? metadata.departments
                : ['IT', 'HR', 'Operations', 'Sales']
              ).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
              Priority <span className="text-rose-500">*</span>
            </label>
            <select
              value={formData.priority}
              onChange={(e) => handleChange('priority', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-sm font-medium text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0084FF] cursor-pointer"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
              Estimated Hours
            </label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B] pointer-events-none" />
              <input
                type="number"
                min="0"
                step="0.5"
                placeholder="e.g. 12"
                value={formData.estimatedHours}
                onChange={(e) => handleChange('estimatedHours', e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0084FF] focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
              Deadline <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B] pointer-events-none" />
              <input
                type="date"
                value={formData.deadline}
                onChange={(e) => handleChange('deadline', e.target.value)}
                className={`w-full pl-9 pr-3.5 py-2 rounded-lg border text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0084FF] focus:bg-white ${
                  errors.deadline
                    ? 'border-rose-400 bg-rose-50/20'
                    : 'border-[#E2E8F0] bg-[#F8FAFC]'
                }`}
              />
            </div>
            {errors.deadline && <p className="text-xs text-rose-500 mt-1">{errors.deadline}</p>}
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
            Tags (Optional)
          </label>
          <div className="relative">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
            <input
              type="text"
              placeholder="e.g. Q3, Frontend, Audit, Client-A"
              value={formData.tags}
              onChange={(e) => handleChange('tags', e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0084FF] focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* Assignment Type Panel (Only for Task Creation, not general edit) */}
      {!isEdit && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <div>
              <h3 className="text-base font-bold text-[#0F172A]">
                2. Assignment Strategy
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Targeted distribution handled automatically by the PostgreSQL database.
              </p>
            </div>
          </div>

          {/* Type Selector Tabs */}
          <div className={`grid grid-cols-2 ${isManager ? 'sm:grid-cols-3' : 'sm:grid-cols-3 lg:grid-cols-6'} gap-2`}>
            {assignmentTabs.map(({ id, label, icon: Icon }) => (
              <button
                type="button"
                key={id}
                onClick={() => handleChange('assignmentType', id)}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all cursor-pointer ${
                  formData.assignmentType === id
                    ? 'bg-[#E0F2FE] border-[#0084FF] text-[#0084FF] font-bold ring-1 ring-[#0084FF] shadow-xs'
                    : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B] hover:bg-white hover:border-[#0084FF]/40 hover:text-[#0F172A]'
                }`}
              >
                <Icon className="w-4 h-4 mb-1" />
                <span className="text-xs">{label}</span>
              </button>
            ))}
          </div>

          {/* Conditional Assignment Inputs */}
          <div className="pt-2">
            {/* 1. Individual Dropdown */}
            {formData.assignmentType === 'INDIVIDUAL' && (
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
                  Assign To <span className="text-rose-500">*</span>
                </label>
                {loadingMetadata ? (
                  <div className="py-2.5 px-3.5 border border-[#E2E8F0] rounded-lg bg-[#F8FAFC] text-xs text-[#64748B] flex items-center gap-2">
                    <div className="w-3.5 h-3.5 border-2 border-[#0084FF] border-t-transparent rounded-full animate-spin"></div>
                    <span>Loading active employees from database...</span>
                  </div>
                ) : employees.length === 0 ? (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>No active employees found in PostgreSQL database.</span>
                  </div>
                ) : (
                  <select
                    value={formData.employeeId}
                    onChange={(e) => handleChange('employeeId', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] bg-white text-sm font-medium text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0084FF] cursor-pointer shadow-xs"
                  >
                    <option value="">[ Select Employee ]</option>
                    {employees.map((emp) => (
                      <option key={emp.employeeId} value={emp.employeeId}>
                        {emp.employeeId} — {emp.fullName}
                      </option>
                    ))}
                  </select>
                )}
                {errors.employeeId && (
                  <p className="text-xs text-rose-500 mt-1">{errors.employeeId}</p>
                )}
              </div>
            )}

            {/* 2. Multiple Selector */}
            {formData.assignmentType === 'MULTIPLE' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider">
                    Assign To Multiple Employees ({formData.employeeIds.length} selected){' '}
                    <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => handleChange('employeeIds', employees.map((e) => e.employeeId))}
                      className="text-[#0084FF] hover:text-[#1C4ED8] font-semibold cursor-pointer"
                    >
                      Select All
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => handleChange('employeeIds', [])}
                      className="text-[#64748B] hover:text-[#0F172A] cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {loadingMetadata ? (
                  <div className="py-4 text-center text-xs text-[#64748B]">
                    Loading employees list...
                  </div>
                ) : employees.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                    No active employees available for selection.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-2 border border-[#E2E8F0] rounded-lg bg-[#F8FAFC]">
                    {employees.map((emp) => {
                      const isChecked = formData.employeeIds.includes(emp.employeeId);
                      return (
                        <label
                          key={emp.employeeId}
                          className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                            isChecked
                              ? 'bg-[#E0F2FE] border-[#BAE6FD] text-[#0F172A] font-medium'
                              : 'bg-white border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleMultipleEmployeeToggle(emp.employeeId)}
                            className="rounded text-[#0084FF] focus:ring-[#0084FF] h-4 w-4"
                          />
                          <div className="text-xs">
                            <div className="font-semibold text-[#0F172A]">
                              {emp.employeeId} — {emp.fullName}
                            </div>
                            <div className="text-[#64748B] text-[11px]">
                              {emp.department} • {emp.position || emp.designation}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
                {errors.employeeIds && (
                  <p className="text-xs text-rose-500 mt-1">{errors.employeeIds}</p>
                )}
              </div>
            )}

            {/* 3. Department */}
            {formData.assignmentType === 'DEPARTMENT' && (
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
                  Target Department <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.targetDepartment}
                  disabled={isManager}
                  onChange={(e) => handleChange('targetDepartment', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0084FF] disabled:bg-[#F8FAFC] disabled:text-[#64748B] cursor-pointer shadow-xs"
                >
                  {(metadata.departments.length > 0
                    ? metadata.departments
                    : ['IT', 'HR', 'Operations', 'Sales']
                  ).map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-[#64748B] mt-1.5">
                  {isManager
                    ? `Restricted to your authorized team department (${activeUser?.department}). All active team members will receive this deliverable.`
                    : 'All active employees in this department will automatically receive individual task assignments.'}
                </p>
              </div>
            )}

            {/* 4. Managers Assignment (Admin Only) */}
            {formData.assignmentType === 'MANAGERS' && (
              <div className="p-4 rounded-xl bg-[#F0F9FF] border border-[#BAE6FD] text-[#0F172A] text-xs leading-relaxed space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm text-[#1E40AF]">
                  <Shield className="w-4 h-4 text-[#0084FF] shrink-0" />
                  <span>Administrative Assignment to Team Managers</span>
                </div>
                <p className="text-[#64748B]">
                  This task will be assigned to active Team Managers across departments (e.g., Sales Manager, Engineering Manager, HR Lead). Each manager will receive individual deliverable tracking and notifications.
                </p>
              </div>
            )}

            {/* 5. Position */}
            {formData.assignmentType === 'POSITION' && (
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
                  Target Position / Role <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.targetPosition}
                  onChange={(e) => handleChange('targetPosition', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0084FF] cursor-pointer"
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
                <p className="text-xs text-[#64748B] mt-1.5">
                  All active employees holding this title will automatically receive individual task assignments.
                </p>
              </div>
            )}

            {/* 6. All Staff */}
            {formData.assignmentType === 'ALL' && (
              <div className="p-4 rounded-lg bg-[#F0F9FF] border border-[#BAE6FD] text-[#0F172A] text-xs leading-relaxed flex items-start gap-2.5">
                <Globe className="w-4 h-4 text-[#0084FF] shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-[#1E40AF] block mb-0.5">Company-Wide Assignment</span>
                  <span className="text-[#64748B]">This task will be assigned to all active employees across THYO SOFTECH PVT LTD. Each employee will receive an individual assignment entry and instant notification.</span>
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
          className="px-5 py-2.5 rounded-lg border border-[#E2E8F0] text-sm font-medium text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A] transition-colors cursor-pointer"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#0084FF] text-white text-sm font-semibold hover:bg-[#1C4ED8] transition-colors shadow-sm disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          <span>
            {loading
              ? (isEdit ? 'Updating Task...' : 'Creating Task...')
              : (isEdit ? 'Update Task' : 'Create Task')}
          </span>
        </button>
      </div>

      {/* Success Confirmation Modal */}
      <Modal
        isOpen={successModal.isOpen}
        onClose={handleSuccessOk}
        title="TASK CREATED SUCCESSFULLY"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 py-2">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                Confirmed & Recorded
              </p>
              <h4 className="text-base font-bold text-[#0F172A] leading-snug">
                Task Created Successfully
              </h4>
            </div>
          </div>

          <p className="text-sm text-[#64748B] leading-relaxed">
            Task created successfully and assigned to all selected employees.
          </p>

          {/* Details Card */}
          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2.5 text-sm">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-medium text-[#64748B] uppercase tracking-wider">
                Task:
              </span>
              <span className="font-semibold text-[#0F172A] text-right">
                {successModal.taskTitle}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-[#E2E8F0] pt-2">
              <span className="text-xs font-medium text-[#64748B] uppercase tracking-wider">
                Assigned to:
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E0F2FE] text-[#1E40AF] border border-[#BAE6FD]">
                <Users className="w-3.5 h-3.5 text-[#0084FF]" />
                {successModal.assignedCount} {successModal.assignedCount === 1 ? 'Employee' : 'Employees'}
              </span>
            </div>

            {successModal.assignedEmployees && successModal.assignedEmployees.length > 0 && (
              <div className="border-t border-[#E2E8F0] pt-2">
                <span className="text-[11px] font-medium text-[#64748B] block mb-1.5">
                  Assigned Employees:
                </span>
                <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto pr-1">
                  {successModal.assignedEmployees.map((name, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-white border border-[#E2E8F0] rounded text-[11px] text-[#0F172A] font-medium shadow-2xs"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            {successModal.taskId && (
              <button
                type="button"
                onClick={handleSuccessViewTask}
                className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-xs font-semibold text-[#0F172A] hover:bg-[#F8FAFC] transition-colors cursor-pointer"
              >
                View Details
              </button>
            )}
            <button
              type="button"
              onClick={handleSuccessOk}
              className="px-6 py-2 rounded-lg bg-[#0084FF] hover:bg-[#1C4ED8] text-white text-xs font-bold tracking-wide transition-colors shadow-sm cursor-pointer"
            >
              OK
            </button>
          </div>
        </div>
      </Modal>

      {/* Failure Alert Modal */}
      <Modal
        isOpen={failureModal.isOpen}
        onClose={() => setFailureModal({ isOpen: false, message: '' })}
        title="TASK CREATION FAILED"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 py-2">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
              <AlertCircle className="w-6 h-6 text-rose-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-rose-700 uppercase tracking-wider">
                Submission Error
              </p>
              <h4 className="text-base font-bold text-[#0F172A] leading-snug">
                Task Creation Failed
              </h4>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs leading-relaxed">
            {failureModal.message}
          </div>

          <div className="flex items-center justify-end pt-2">
            <button
              type="button"
              onClick={() => setFailureModal({ isOpen: false, message: '' })}
              className="px-5 py-2 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-bold tracking-wide transition-colors cursor-pointer"
            >
              OK
            </button>
          </div>
        </div>
      </Modal>
    </form>
  );
}
