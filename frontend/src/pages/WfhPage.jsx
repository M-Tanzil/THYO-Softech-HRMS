import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Home,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  Calendar,
  Phone,
  ListTodo,
  FileText,
  UserCheck
} from 'lucide-react';
import { wfhApi } from '../api/student5Api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/common/Modal';
import { SkeletonStats, SkeletonTable } from '../components/common/SkeletonLoader';

export default function WfhPage() {
  const { currentUser, isManagerOrAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      if (tabParam === 'approvalQueue' && !isManagerOrAdmin) return 'my';
      if (['my', 'approvalQueue'].includes(tabParam)) return tabParam;
    }
    return isManagerOrAdmin ? 'approvalQueue' : 'my';
  });

  const [successMsg, setSuccessMsg] = useState('');

  // Modals
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedReq, setSelectedReq] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Form
  const [applyForm, setApplyForm] = useState({
    startDate: '',
    endDate: '',
    daysCount: 1,
    reason: '',
    contactNumber: '',
    tasksPlanned: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Modular cached TanStack React Query for WFH governance
  const myRequestsQuery = useQuery({
    queryKey: ['wfh', 'my', currentUser?.employeeId],
    queryFn: async () => {
      const res = await wfhApi.getMyRequests();
      return res.data || [];
    },
    staleTime: 1000 * 60 * 3,
    placeholderData: (prev) => prev
  });

  const statsQuery = useQuery({
    queryKey: ['wfh', 'stats', currentUser?.employeeId],
    queryFn: async () => {
      const res = await wfhApi.getStats();
      return res.data || { total: 0, pending: 0, approved: 0, rejected: 0 };
    },
    staleTime: 1000 * 60 * 3,
    placeholderData: (prev) => prev
  });

  const teamRequestsQuery = useQuery({
    queryKey: ['wfh', 'team'],
    queryFn: async () => {
      const res = await wfhApi.getRequests();
      return res.data || [];
    },
    enabled: !!isManagerOrAdmin,
    staleTime: 1000 * 60 * 2,
    placeholderData: (prev) => prev
  });

  const myRequests = myRequestsQuery.data || [];
  const stats = statsQuery.data || { total: 0, pending: 0, approved: 0, rejected: 0 };
  const allRequests = teamRequestsQuery.data || [];
  const statsLoading = statsQuery.isLoading && !stats.total;
  const myLoading = myRequestsQuery.isLoading && !myRequests.length;
  const teamLoading = teamRequestsQuery.isLoading && !allRequests.length;
  const error = (myRequestsQuery.error || statsQuery.error || teamRequestsQuery.error)?.friendlyMessage || null;

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams(prev => {
      const p = new URLSearchParams(prev);
      p.set('tab', tab);
      return p;
    }, { replace: true });
  };

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      if (tabParam === 'approvalQueue' && !isManagerOrAdmin) {
        setActiveTab('my');
      } else if (['my', 'approvalQueue'].includes(tabParam)) {
        setActiveTab(tabParam);
      }
    }
    if (searchParams.get('action') === 'apply') {
      setShowApplyModal(true);
    }
  }, [searchParams, isManagerOrAdmin]);

  // Helper to format date cleanly as DD-MM-YYYY without timezone shift
  function formatDateDisplay(dateInput) {
    if (!dateInput) return '';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    const day = String(d.getUTCDate()).padStart(2, '0');
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const year = d.getUTCFullYear();
    return `${day}-${month}-${year}`;
  }

  // Handle Date input change with auto-calculation of days count
  function handleDateChange(field, val) {
    const updated = { ...applyForm, [field]: val };
    if (updated.startDate && updated.endDate) {
      const parseDateUtc = (str) => {
        const p = str.split(/[-/]/);
        if (p.length === 3) {
          if (p[0].length === 4) return new Date(Date.UTC(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10)));
          return new Date(Date.UTC(parseInt(p[2], 10), parseInt(p[1], 10) - 1, parseInt(p[0], 10)));
        }
        return new Date(str);
      };
      const dStart = parseDateUtc(updated.startDate);
      const dEnd = parseDateUtc(updated.endDate);
      if (!isNaN(dStart.getTime()) && !isNaN(dEnd.getTime()) && dEnd >= dStart) {
        const diffDays = Math.round((dEnd - dStart) / (1000 * 60 * 60 * 24)) + 1;
        updated.daysCount = diffDays;
      }
    }
    setApplyForm(updated);
  }

  // Handle Apply
  async function handleApply(e) {
    e.preventDefault();
    if (!applyForm.startDate || !applyForm.endDate) {
      alert('Please select both Start Date and End Date.');
      return;
    }
    const parseDateUtc = (str) => {
      const p = str.split(/[-/]/);
      if (p.length === 3) {
        if (p[0].length === 4) return new Date(Date.UTC(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10)));
        return new Date(Date.UTC(parseInt(p[2], 10), parseInt(p[1], 10) - 1, parseInt(p[0], 10)));
      }
      return new Date(str);
    };
    const s = parseDateUtc(applyForm.startDate);
    const end = parseDateUtc(applyForm.endDate);
    if (s.getTime() > end.getTime()) {
      alert('Start date cannot be after end date.');
      return;
    }

    setSubmitting(true);
    try {
      await wfhApi.createRequest(applyForm);
      setSuccessMsg('Work From Home request submitted successfully.');
      setShowApplyModal(false);
      setApplyForm({
        startDate: '',
        endDate: '',
        daysCount: 1,
        reason: '',
        contactNumber: '',
        tasksPlanned: ''
      });
      queryClient.invalidateQueries({ queryKey: ['wfh'] });
    } catch (err) {
      alert(err.friendlyMessage || err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // Handle Cancel
  async function handleCancel(id) {
    if (!window.confirm('Cancel this pending WFH request?')) return;
    try {
      await wfhApi.cancelRequest(id);
      setSuccessMsg('WFH request cancelled.');
      queryClient.invalidateQueries({ queryKey: ['wfh'] });
    } catch (err) {
      alert(err.friendlyMessage || err.message);
    }
  }

  // Handle Approve
  async function handleApprove(id) {
    try {
      await wfhApi.reviewRequest(id, { status: 'APPROVED' });
      setSuccessMsg('WFH request approved.');
      queryClient.invalidateQueries({ queryKey: ['wfh'] });
    } catch (err) {
      alert(err.friendlyMessage || err.message);
    }
  }

  // Handle Reject
  async function handleRejectSubmit(e) {
    e.preventDefault();
    if (!selectedReq) return;
    setSubmitting(true);
    try {
      await wfhApi.reviewRequest(selectedReq.id, {
        status: 'REJECTED',
        rejectionReason
      });
      setSuccessMsg('WFH request rejected.');
      setShowRejectModal(false);
      setRejectionReason('');
      queryClient.invalidateQueries({ queryKey: ['wfh'] });
    } catch (err) {
      alert(err.friendlyMessage || err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const statusBadges = {
    PENDING: 'bg-amber-50 text-amber-800 border-amber-200',
    APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
    CANCELLED: 'bg-slate-100 text-slate-600 border-slate-200'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <Home className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Work From Home (WFH) Governance
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Submit remote work applications, monitor approval queues, and verify manager approvals.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowApplyModal(true)}
          className="thyo-btn-primary"
        >
          <Plus className="w-4 h-4" />
          Request Work From Home
        </button>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-medium text-emerald-800 flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold">Dismiss</button>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['wfh'] })}
            className="px-2.5 py-1 bg-white border border-rose-200 rounded-lg text-rose-700 hover:bg-rose-100 text-xs font-semibold cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI Stats */}
      {statsLoading ? (
        <SkeletonStats count={4} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="thyo-card p-5">
            <div className="text-slate-500 text-xs font-semibold">Total Requests</div>
            <div className="text-2xl font-bold text-indigo-600 mt-1">{stats.total}</div>
          </div>
          <div className="thyo-card p-5">
            <div className="text-amber-600 text-xs font-semibold">Pending Approval</div>
            <div className="text-2xl font-bold text-amber-600 mt-1">{stats.pending}</div>
          </div>
          <div className="thyo-card p-5">
            <div className="text-emerald-600 text-xs font-semibold">Approved</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{stats.approved}</div>
          </div>
          <div className="thyo-card p-5">
            <div className="text-rose-600 text-xs font-semibold">Rejected</div>
            <div className="text-2xl font-bold text-rose-600 mt-1">{stats.rejected}</div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-2xl px-4 pt-2 gap-2 overflow-x-auto">
        <button
          onClick={() => handleTabChange('my')}
          className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'my'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Home className="w-4 h-4" />
          My WFH Requests ({myRequests.length})
        </button>

        {isManagerOrAdmin && (
          <button
            onClick={() => handleTabChange('approvalQueue')}
            className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'approvalQueue'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Team Approval Queue ({allRequests.filter(r => String(r.status || '').toUpperCase() === 'PENDING').length} Pending)
          </button>
        )}
      </div>

      {/* MY REQUESTS */}
      {activeTab === 'my' && (
        <div className="thyo-table-wrap">
          {myLoading ? (
            <div className="p-4">
              <SkeletonTable rows={4} cols={5} />
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {myRequests.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  You have not submitted any Work From Home requests yet.
                </div>
              ) : (
              myRequests.map(req => (
                <div key={req.id} className="p-5 thyo-tr">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-indigo-600" />
                        <span className="text-sm font-bold text-slate-900">
                          {formatDateDisplay(req.startDate)} – {formatDateDisplay(req.endDate)}
                        </span>
                        <span className="text-xs text-slate-500">({req.daysCount} Day/s)</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        <strong>Reason:</strong> {req.reason}
                      </p>
                      {req.tasksPlanned && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          <strong>Planned Deliverables:</strong> {req.tasksPlanned}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusBadges[String(req.status || '').toUpperCase()] || statusBadges.PENDING}`}>
                        {req.status}
                      </span>

                      {String(req.status || '').toUpperCase() === 'PENDING' && (
                        <button
                          onClick={() => handleCancel(req.id)}
                          className="px-3 py-1 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>

                  {req.rejectionReason && (
                    <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                      <strong>Rejection Reason:</strong> {req.rejectionReason}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
        </div>
      )}

      {/* TEAM APPROVAL QUEUE (MANAGER / ADMIN) */}
      {activeTab === 'approvalQueue' && isManagerOrAdmin && (
        <div className="thyo-table-wrap">
          {teamLoading ? (
            <div className="p-4">
              <SkeletonTable rows={4} cols={5} />
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {allRequests.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No team WFH requests found.
                </div>
              ) : (
              allRequests.map(req => (
                <div key={req.id} className="p-5 thyo-tr">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{req.employee?.fullName || 'Employee'}</span>
                        <span className="text-xs text-slate-400">({req.employee?.department || 'General'} • {req.employee?.employeeId || req.employeeId})</span>
                      </div>

                      <div className="text-xs text-slate-600 mt-1 flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatDateDisplay(req.startDate)} to {formatDateDisplay(req.endDate)} ({req.daysCount} days)</span>
                      </div>

                      <p className="text-xs text-slate-600 mt-1">
                        <strong>Reason:</strong> {req.reason}
                      </p>
                      {req.tasksPlanned && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          <strong>Planned Tasks:</strong> {req.tasksPlanned}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusBadges[String(req.status || '').toUpperCase()] || statusBadges.PENDING}`}>
                        {req.status}
                      </span>

                      {String(req.status || '').toUpperCase() === 'PENDING' && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleApprove(req.id)}
                            className="px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              setSelectedReq(req);
                              setShowRejectModal(true);
                            }}
                            className="px-3 py-1.5 bg-rose-600 text-white hover:bg-rose-700 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
        </div>
      )}

      {/* APPLY WFH MODAL */}
      <Modal
        isOpen={showApplyModal}
        onClose={() => {
          setShowApplyModal(false);
          if (searchParams.get('action')) {
            setSearchParams(prev => {
              const p = new URLSearchParams(prev);
              p.delete('action');
              return p;
            }, { replace: true });
          }
        }}
        title="Apply for Work From Home"
      >
        <form onSubmit={handleApply} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Start Date</label>
              <input
                type="date"
                required
                value={applyForm.startDate}
                onChange={e => handleDateChange('startDate', e.target.value)}
                className="thyo-input"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">End Date</label>
              <input
                type="date"
                required
                value={applyForm.endDate}
                onChange={e => handleDateChange('endDate', e.target.value)}
                className="thyo-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Number of Days</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                required
                value={applyForm.daysCount}
                onChange={e => setApplyForm({ ...applyForm, daysCount: parseFloat(e.target.value) })}
                className="thyo-input"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Emergency Contact Number</label>
              <input
                type="tel"
                placeholder="+91 98765 43210"
                value={applyForm.contactNumber}
                onChange={e => setApplyForm({ ...applyForm, contactNumber: e.target.value })}
                className="thyo-input"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Remote Work</label>
            <textarea
              required
              rows={3}
              placeholder="Explain justification for remote work..."
              value={applyForm.reason}
              onChange={e => setApplyForm({ ...applyForm, reason: e.target.value })}
              className="thyo-input"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Deliverables Planned Today</label>
            <textarea
              rows={2}
              placeholder="Key sprint deliverables or tasks to be delivered during WFH..."
              value={applyForm.tasksPlanned}
              onChange={e => setApplyForm({ ...applyForm, tasksPlanned: e.target.value })}
              className="thyo-input"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowApplyModal(false)}
              className="thyo-btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="thyo-btn-primary"
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </Modal>

      {/* REJECT MODAL */}
      <Modal isOpen={showRejectModal} onClose={() => setShowRejectModal(false)} title="Reject WFH Request">
        <form onSubmit={handleRejectSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Rejection</label>
            <textarea
              required
              rows={3}
              placeholder="State reason (e.g. on-site hardware testing required, client presentation scheduled)..."
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              className="thyo-input"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowRejectModal(false)}
              className="thyo-btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-700 transition-colors cursor-pointer"
            >
              {submitting ? 'Rejecting...' : 'Confirm Rejection'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
