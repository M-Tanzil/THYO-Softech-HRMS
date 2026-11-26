import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays,
  MapPin,
  Building,
  Plus,
  Filter,
  Trash2,
  Pencil,
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { holidayApi } from '../api/student5Api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/common/Modal';
import { SkeletonTable } from '../components/common/SkeletonLoader';

export default function HolidaysPage() {
  const { currentUser, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [successMsg, setSuccessMsg] = useState('');

  // Filters
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');

  // React Query for instant cached holidays
  const {
    data: holidaysData,
    isLoading: loading,
    error: queryError,
    refetch: loadHolidays
  } = useQuery({
    queryKey: ['holidays', selectedBranch, selectedType],
    queryFn: async () => {
      const params = { year: 2026 };
      if (selectedBranch !== 'ALL') params.branch = selectedBranch;
      if (selectedType !== 'ALL') params.type = selectedType;
      const res = await holidayApi.getHolidays(params);
      return res.data || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    placeholderData: (prev) => prev
  });

  const holidays = holidaysData || [];
  const error = queryError ? (queryError.friendlyMessage || queryError.message) : null;

  // Add Holiday Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [holidayForm, setHolidayForm] = useState({
    name: '',
    date: '',
    type: 'NATIONAL',
    description: '',
    isAllBranches: true,
    branches: []
  });
  const [submitting, setSubmitting] = useState(false);

  // Edit Holiday Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    date: '',
    type: 'NATIONAL',
    description: '',
    isAllBranches: true,
    branches: []
  });
  const [editSubmitting, setEditSubmitting] = useState(false);

  const branchesList = [
    'Bangalore HQ',
    'Mumbai Regional Office',
    'Delhi NCR Tech Center',
    'Bhubaneswar Development Center'
  ];

  // Handle Create Holiday
  async function handleAddHoliday(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await holidayApi.createHoliday({
        name: holidayForm.name.trim(),
        date: holidayForm.date,
        type: holidayForm.type,
        description: holidayForm.description.trim() || null,
        isAllBranches: holidayForm.isAllBranches,
        branches: holidayForm.isAllBranches ? [] : holidayForm.branches
      });
      setSuccessMsg('Holiday added to organization calendar.');
      setShowAddModal(false);
      setHolidayForm({
        name: '',
        date: '',
        type: 'NATIONAL',
        description: '',
        isAllBranches: true,
        branches: []
      });
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
    } catch (err) {
      alert(err.friendlyMessage || err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // Handle Open Edit Modal
  function handleOpenEdit(h) {
    setEditingHoliday(h);
    let formattedDate = '';
    if (h.date) {
      const d = new Date(h.date);
      if (!isNaN(d.getTime())) {
        const year = d.getUTCFullYear();
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        formattedDate = `${year}-${month}-${day}`;
      }
    }

    setEditForm({
      name: h.name || '',
      date: formattedDate,
      type: h.type || 'NATIONAL',
      description: h.description || '',
      isAllBranches: h.isAllBranches !== undefined ? h.isAllBranches : true,
      branches: h.branches?.map(b => b.branch) || []
    });
    setShowEditModal(true);
  }

  // Handle Update Holiday
  async function handleEditHoliday(e) {
    e.preventDefault();
    if (!editingHoliday) return;
    setEditSubmitting(true);
    try {
      await holidayApi.updateHoliday(editingHoliday.id, {
        name: editForm.name.trim(),
        date: editForm.date,
        type: editForm.type,
        description: editForm.description.trim() || null,
        isAllBranches: editForm.isAllBranches,
        branches: editForm.isAllBranches ? [] : editForm.branches
      });
      setSuccessMsg(`Holiday "${editForm.name}" updated successfully.`);
      setShowEditModal(false);
      setEditingHoliday(null);
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
    } catch (err) {
      alert(err.friendlyMessage || err.message);
    } finally {
      setEditSubmitting(false);
    }
  }

  // Handle Delete Holiday
  async function handleDeleteHoliday(id, name) {
    if (!window.confirm(`Delete holiday "${name}"?`)) return;
    try {
      await holidayApi.deleteHoliday(id);
      setSuccessMsg('Holiday deleted.');
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
    } catch (err) {
      alert(err.friendlyMessage || err.message);
    }
  }

  // Toggle Branch Checkbox for Add Form
  function toggleBranchSelection(branch) {
    setHolidayForm(prev => {
      const exists = prev.branches.includes(branch);
      return {
        ...prev,
        branches: exists ? prev.branches.filter(b => b !== branch) : [...prev.branches, branch]
      };
    });
  }

  // Toggle Branch Checkbox for Edit Form
  function toggleEditBranchSelection(branch) {
    setEditForm(prev => {
      const exists = prev.branches.includes(branch);
      return {
        ...prev,
        branches: exists ? prev.branches.filter(b => b !== branch) : [...prev.branches, branch]
      };
    });
  }

  const typeBadges = {
    NATIONAL: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    REGIONAL: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    OPTIONAL: 'bg-amber-50 text-amber-800 border-amber-200',
    COMPANY: 'bg-violet-50 text-violet-700 border-violet-200'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Company & Branch Holidays (2026)
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Official gazetted national and branch-specific holiday schedule for THYO SOFTECH PVT. LTD.
            </p>
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="thyo-btn-primary"
          >
            <Plus className="w-4 h-4" />
            Add Holiday
          </button>
        )}
      </div>

      {/* Error Notification */}
      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => loadHolidays()}
            className="px-2.5 py-1 bg-white border border-rose-200 rounded-lg text-rose-700 hover:bg-rose-100 text-xs font-semibold cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Success Notification */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-medium text-emerald-800 flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold">Dismiss</button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="thyo-card p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-slate-400" />
            <select
              value={selectedBranch}
              onChange={e => setSelectedBranch(e.target.value)}
              className="text-xs border border-slate-200 rounded-xl px-3.5 py-2 bg-slate-50 font-medium text-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition"
            >
              <option value="ALL">All Branches & Locations</option>
              {branchesList.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
              className="text-xs border border-slate-200 rounded-xl px-3.5 py-2 bg-slate-50 font-medium text-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition"
            >
              <option value="ALL">All Holiday Categories</option>
              <option value="NATIONAL">National (All Branches)</option>
              <option value="REGIONAL">Regional (Branch Specific)</option>
              <option value="OPTIONAL">Optional / Restricted</option>
              <option value="COMPANY">Company Holiday</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-semibold">
          Showing {holidays.length} Holidays in 2026
        </div>
      </div>

      {/* Holidays List */}
      <div className="thyo-table-wrap">
        {loading ? (
          <div className="p-4">
            <SkeletonTable rows={5} cols={4} />
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {holidays.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No holidays found matching the selected filter criteria.
              </div>
            ) : (
              holidays.map(h => {
                const dateObj = new Date(h.date);
                const dayName = h.day || dateObj.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
                const monthName = dateObj.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
                const dayNum = dateObj.getUTCDate();

                return (
                  <div key={h.id} className="p-5 thyo-tr flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {/* Date Block */}
                      <div className="w-14 h-14 bg-indigo-50 border border-indigo-100 rounded-xl flex flex-col items-center justify-center shrink-0">
                        <span className="text-[10px] font-extrabold uppercase text-indigo-600">{monthName}</span>
                        <span className="text-lg font-black text-slate-900 leading-none">{dayNum}</span>
                        <span className="text-[9px] text-slate-500 mt-0.5">{dayName ? dayName.slice(0, 3) : ''}</span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900">{h.name}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${typeBadges[h.type] || typeBadges.NATIONAL}`}>
                            {h.type}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                          <span className="flex items-center gap-1 font-medium text-slate-600">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {h.isAllBranches
                              ? 'All Company Branches'
                              : (h.branches?.map(b => b.branch).join(', ') || 'Branch Specific')}
                          </span>
                          {h.description && (
                            <>
                              <span>•</span>
                              <span className="text-slate-400">{h.description}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(h)}
                          className="text-slate-400 hover:text-indigo-600 p-2 rounded-xl hover:bg-indigo-50 transition-colors cursor-pointer"
                          title="Edit holiday"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteHoliday(h.id, h.name)}
                          className="text-slate-400 hover:text-rose-600 p-2 rounded-xl hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete holiday"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* ADD HOLIDAY MODAL */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Holiday (2026 Calendar)">
        <form onSubmit={handleAddHoliday} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Holiday Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Maha Shivratri, Eid-ul-Fitr"
              value={holidayForm.name}
              onChange={e => setHolidayForm({ ...holidayForm, name: e.target.value })}
              className="thyo-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Date</label>
              <input
                type="date"
                required
                value={holidayForm.date}
                onChange={e => setHolidayForm({ ...holidayForm, date: e.target.value })}
                className="thyo-input"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Type</label>
              <select
                value={holidayForm.type}
                onChange={e => setHolidayForm({ ...holidayForm, type: e.target.value })}
                className="thyo-input"
              >
                <option value="NATIONAL">National Gazetted</option>
                <option value="REGIONAL">Regional Gazetted</option>
                <option value="OPTIONAL">Optional / Restricted</option>
                <option value="COMPANY">Company Holiday</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Description / Context</label>
            <input
              type="text"
              placeholder="Optional description..."
              value={holidayForm.description}
              onChange={e => setHolidayForm({ ...holidayForm, description: e.target.value })}
              className="thyo-input"
            />
          </div>

          <div className="pt-2 border-t border-slate-100">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 mb-2">
              <input
                type="checkbox"
                checked={holidayForm.isAllBranches}
                onChange={e => setHolidayForm({ ...holidayForm, isAllBranches: e.target.checked })}
                className="w-4 h-4 rounded accent-indigo-600"
              />
              Applicable to All Company Branches
            </label>

            {!holidayForm.isAllBranches && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 mt-2">
                <span className="text-[11px] font-bold text-slate-600 block">Select Applicable Branches:</span>
                {branchesList.map(b => (
                  <label key={b} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={holidayForm.branches.includes(b)}
                      onChange={() => toggleBranchSelection(b)}
                      className="w-3.5 h-3.5 rounded accent-indigo-600"
                    />
                    {b}
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="thyo-btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="thyo-btn-primary"
            >
              {submitting ? 'Saving...' : 'Add Holiday'}
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT HOLIDAY MODAL */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Holiday">
        <form onSubmit={handleEditHoliday} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Holiday Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Maha Shivratri, Eid-ul-Fitr"
              value={editForm.name}
              onChange={e => setEditForm({ ...editForm, name: e.target.value })}
              className="thyo-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Date</label>
              <input
                type="date"
                required
                value={editForm.date}
                onChange={e => setEditForm({ ...editForm, date: e.target.value })}
                className="thyo-input"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Type</label>
              <select
                value={editForm.type}
                onChange={e => setEditForm({ ...editForm, type: e.target.value })}
                className="thyo-input"
              >
                <option value="NATIONAL">National Gazetted</option>
                <option value="REGIONAL">Regional Gazetted</option>
                <option value="OPTIONAL">Optional / Restricted</option>
                <option value="COMPANY">Company Holiday</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Description / Context</label>
            <input
              type="text"
              placeholder="Optional description..."
              value={editForm.description}
              onChange={e => setEditForm({ ...editForm, description: e.target.value })}
              className="thyo-input"
            />
          </div>

          <div className="pt-2 border-t border-slate-100">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 mb-2">
              <input
                type="checkbox"
                checked={editForm.isAllBranches}
                onChange={e => setEditForm({ ...editForm, isAllBranches: e.target.checked })}
                className="w-4 h-4 rounded accent-indigo-600"
              />
              Applicable to All Company Branches
            </label>

            {!editForm.isAllBranches && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 mt-2">
                <span className="text-[11px] font-bold text-slate-600 block">Select Applicable Branches:</span>
                {branchesList.map(b => (
                  <label key={b} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.branches.includes(b)}
                      onChange={() => toggleEditBranchSelection(b)}
                      className="w-3.5 h-3.5 rounded accent-indigo-600"
                    />
                    {b}
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="thyo-btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editSubmitting}
              className="thyo-btn-primary"
            >
              {editSubmitting ? 'Updating...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
