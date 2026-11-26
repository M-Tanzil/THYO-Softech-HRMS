import React, { useState } from 'react';
import { Send, AlertCircle } from 'lucide-react';
import Modal from '../common/Modal';
import apiClient from '../../api/client';

export default function AnnouncementModal({ isOpen, onClose, onCreated }) {
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    priority: 'NORMAL',
    category: 'GENERAL',
    targetType: 'ALL',
    targetValue: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const branches = [
    'Bangalore HQ',
    'Mumbai Regional Office',
    'Delhi NCR Tech Center',
    'Bhubaneswar Development Center'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.title.trim()) {
      setError('Announcement title is required.');
      return;
    }
    if (!formData.message.trim()) {
      setError('Announcement message is required.');
      return;
    }

    setLoading(true);
    try {
      const targets = [
        {
          targetType: formData.targetType,
          targetValue: formData.targetType === 'ALL' ? null : formData.targetValue
        }
      ];

      const res = await apiClient.post('/announcements', {
        title: formData.title,
        message: formData.message,
        priority: formData.priority,
        category: formData.category,
        targets,
        audience: formData.targetType,
        targetValue: formData.targetValue
      });

      if (res.data.success) {
        onCreated(res.data.data);
        onClose();
        setFormData({
          title: '',
          message: '',
          priority: 'NORMAL',
          category: 'GENERAL',
          targetType: 'ALL',
          targetValue: ''
        });
      }
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to publish announcement.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Publish Company Announcement">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-900 uppercase tracking-wider mb-1">
            Announcement Title <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Q3 Strategic Townhall & Milestone Targets"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="thyo-input"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-900 uppercase tracking-wider mb-1">
              Priority
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="thyo-input"
            >
              <option value="NORMAL">Normal Priority</option>
              <option value="HIGH">High Priority</option>
              <option value="URGENT">Urgent Alert</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-900 uppercase tracking-wider mb-1">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="thyo-input"
            >
              <option value="GENERAL">General News</option>
              <option value="HR_POLICY">HR Policy</option>
              <option value="EVENT">Company Event</option>
              <option value="SYSTEM">Technical / System</option>
              <option value="EMERGENCY">Emergency Notice</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-900 uppercase tracking-wider mb-1">
            Target Audience Scope
          </label>
          <select
            value={formData.targetType}
            onChange={(e) => setFormData({ ...formData, targetType: e.target.value, targetValue: '' })}
            className="thyo-input"
          >
            <option value="ALL">Entire Company (All Branches & Staff)</option>
            <option value="BRANCH">Specific Branch</option>
            <option value="DEPARTMENT">Specific Department</option>
            <option value="ROLE">Specific Role</option>
            <option value="EMPLOYEE_GROUP">Custom Employee Group</option>
          </select>
        </div>

        {formData.targetType === 'BRANCH' && (
          <div>
            <label className="block text-xs font-semibold text-slate-900 uppercase tracking-wider mb-1">
              Select Branch
            </label>
            <select
              value={formData.targetValue}
              onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })}
              className="thyo-input"
            >
              <option value="">Choose branch...</option>
              {branches.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
        )}

        {formData.targetType === 'DEPARTMENT' && (
          <div>
            <label className="block text-xs font-semibold text-slate-900 uppercase tracking-wider mb-1">
              Select Department
            </label>
            <select
              value={formData.targetValue}
              onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })}
              className="thyo-input"
            >
              <option value="">Choose department...</option>
              <option value="IT">IT</option>
              <option value="HR">HR</option>
              <option value="Sales">Sales</option>
              <option value="Operations">Operations</option>
              <option value="Management">Management</option>
            </select>
          </div>
        )}

        {formData.targetType === 'ROLE' && (
          <div>
            <label className="block text-xs font-semibold text-slate-900 uppercase tracking-wider mb-1">
              Select Role
            </label>
            <select
              value={formData.targetValue}
              onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })}
              className="thyo-input"
            >
              <option value="">Choose role...</option>
              <option value="ADMIN">Admin</option>
              <option value="MANAGER">Manager</option>
              <option value="EMPLOYEE">Employee</option>
            </select>
          </div>
        )}

        {formData.targetType === 'EMPLOYEE_GROUP' && (
          <div>
            <label className="block text-xs font-semibold text-slate-900 uppercase tracking-wider mb-1">
              Employee IDs (Comma-separated)
            </label>
            <input
              type="text"
              placeholder="e.g. EMP001, EMP004, EMP005"
              value={formData.targetValue}
              onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })}
              className="thyo-input"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-900 uppercase tracking-wider mb-1">
            Message Content <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={4}
            placeholder="Write the full announcement message here..."
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            className="thyo-input leading-relaxed"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="thyo-btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="thyo-btn-primary"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{loading ? 'Publishing...' : 'Publish Announcement'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
