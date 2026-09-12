import React, { useState } from 'react';
import { Send, AlertCircle } from 'lucide-react';
import Modal from '../common/Modal';
import apiClient from '../../api/client';

export default function AnnouncementModal({ isOpen, onClose, onCreated }) {
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    audience: 'ALL',
    targetValue: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      const res = await apiClient.post('/announcements', formData);
      if (res.data.success) {
        onCreated(res.data.data);
        onClose();
        setFormData({ title: '', message: '', audience: 'ALL', targetValue: '' });
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
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Announcement Title <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Q3 Strategic Townhall & Milestone Targets"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Target Audience
          </label>
          <select
            value={formData.audience}
            onChange={(e) => setFormData({ ...formData, audience: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="ALL">Entire Company (All Employees)</option>
            <option value="DEPARTMENT">Specific Department</option>
            <option value="POSITION">Specific Designation</option>
          </select>
        </div>

        {formData.audience === 'DEPARTMENT' && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Select Department
            </label>
            <select
              value={formData.targetValue}
              onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">Choose department...</option>
              <option value="IT">IT Department</option>
              <option value="HR">HR Department</option>
              <option value="Sales">Sales Department</option>
              <option value="Operations">Operations Department</option>
            </select>
          </div>
        )}

        {formData.audience === 'POSITION' && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Designation
            </label>
            <input
              type="text"
              placeholder="e.g. Software Developer"
              value={formData.targetValue}
              onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Message Content <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={4}
            placeholder="Write the full announcement message here..."
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 leading-relaxed"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-600 text-white text-xs font-semibold hover:bg-sky-700 transition-colors disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{loading ? 'Publishing...' : 'Publish Announcement'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
