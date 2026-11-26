import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  UserCheck,
  ShieldCheck,
  Building,
  HelpCircle,
  ChevronRight,
  Filter
} from 'lucide-react';
import { leaveApi } from '../api/student5Api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/common/Modal';
import { SkeletonCard, SkeletonTable } from '../components/common/SkeletonLoader';

export default function LeaveManagementPage() {
  const { currentUser, isManagerOrAdmin, activeRole } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const hasManagerRights = isManagerOrAdmin || ['ADMIN', 'MANAGER'].includes(
    String(activeRole || currentUser?.role || '').toUpperCase()
  );
  const [activeTab, setActiveTab] = useState(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      if (tabParam === 'approvalQueue' && !hasManagerRights) return 'my';
      if (['my', 'approvalQueue', 'policies'].includes(tabParam)) return tabParam;
    }
    return hasManagerRights ? 'approvalQueue' : 'my';
  });

  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState(null);

  // Modals
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedReq, setSelectedReq] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalComment, setApprovalComment] = useState('');
  const [showApproveModal, setShowApproveModal] = useState(false);

  // Form State
  const [applyForm, setApplyForm] = useState({
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    daysCount: 1.0,
    isHalfDay: false,
    halfDaySession: 'FIRST_HALF',
    reason: '',
    contactNumber: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // TanStack React Query for modular, cached leave data fetching
  const leaveTypesQuery = useQuery({
    queryKey: ['leave', 'types'],
    queryFn: async () => {
      const res = await leaveApi.getTypes();
      return res.data || [];
    },
    staleTime: 1000 * 60 * 10,
    placeholderData: (prev) => prev
  });

  const leaveBalancesQuery = useQuery({
    queryKey: ['leave', 'balances', currentUser?.employeeId],
    queryFn: async () => {
      const res = await leaveApi.getBalances();
      return res.data || [];
    },
    staleTime: 1000 * 60 * 3,
    placeholderData: (prev) => prev
  });

  const myRequestsQuery = useQuery({
    queryKey: ['leave', 'myRequests', currentUser?.employeeId],
    queryFn: async () => {
      const res = await leaveApi.getMyRequests();
      return res.data || [];
    },
    staleTime: 1000 * 60 * 2,
    placeholderData: (prev) => prev
  });

  const teamRequestsQuery = useQuery({
    queryKey: ['leave', 'teamRequests'],
    queryFn: async () => {
      const res = await leaveApi.getRequests();
      return res.data || [];
    },
    enabled: !!hasManagerRights,
    staleTime: 1000 * 60 * 2,
    placeholderData: (prev) => prev
  });

  const leaveTypes = leaveTypesQuery.data || [];
  const balances = leaveBalancesQuery.data || [];
  const myRequests = myRequestsQuery.data || [];
  const teamRequests = teamRequestsQuery.data || [];
  const balancesLoading = leaveBalancesQuery.isLoading && !balances.length;
  const myRequestsLoading = myRequestsQuery.isLoading && !myRequests.length;
  const teamRequestsLoading = teamRequestsQuery.isLoading && !teamRequests.length;
  const queryErrorMsg =
    (leaveTypesQuery.error || leaveBalancesQuery.error || myRequestsQuery.error || teamRequestsQuery.error)
      ?.friendlyMessage || null;

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams(prev => {
      const p = new URLSearchParams(prev);
      p.set('tab', tab);
      return p;
    }, { replace: true });
  };

  const loadData = () => {
    queryClient.invalidateQueries({ queryKey: ['leave'] });
  };

  // Pre-select default leave type in apply form when leave types load
  useEffect(() => {
    if (leaveTypes.length > 0 && !applyForm.leaveTypeId) {
      const defaultCL = leaveTypes.find(t => t.code === 'CL') || leaveTypes[0];
      setApplyForm(prev => ({ ...prev, leaveTypeId: defaultCL.id }));
    }
  }, [leaveTypes, applyForm.leaveTypeId]);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      if (tabParam === 'approvalQueue' && !hasManagerRights) {
        setActiveTab('my');
      } else if (['my', 'approvalQueue', 'policies'].includes(tabParam)) {
        setActiveTab(tabParam);
      }
    }
    if (searchParams.get('action') === 'apply') {
      setShowApplyModal(true);
    }
  }, [searchParams, hasManagerRights]);

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

  // Calculate day count automatically based on start and end dates
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
      const start = parseDateUtc(updated.startDate);
      const end = parseDateUtc(updated.endDate);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start) {
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        updated.daysCount = updated.isHalfDay ? 0.5 : diffDays;
      }
    }
    setApplyForm(updated);
  }

  function handleHalfDayToggle(e) {
    const isHalf = e.target.checked;
    setApplyForm(prev => ({
      ...prev,
      isHalfDay: isHalf,
      daysCount: isHalf ? 0.5 : (prev.daysCount < 1 ? 1 : prev.daysCount)
    }));
  }

  async function handleApplyLeave(e) {
    e.preventDefault();
    if (!applyForm.startDate || !applyForm.endDate) {
      setError('Please select both Start Date and End Date.');
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
      setError('Start date cannot be after end date.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await leaveApi.createRequest(applyForm);
      setSuccessMsg('Leave request submitted successfully. Sent to supervisor for review.');
      setShowApplyModal(false);
      setApplyForm({
        leaveTypeId: leaveTypes[0]?.id || '',
        startDate: '',
        endDate: '',
        daysCount: 1.0,
        isHalfDay: false,
        halfDaySession: 'FIRST_HALF',
        reason: '',
        contactNumber: ''
      });
      queryClient.invalidateQueries({ queryKey: ['leave'] });
    } catch (err) {
      setError(err.friendlyMessage || err.message || 'Failed to submit leave request');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove(req) {
    setSelectedReq(req);
    setApprovalComment('');
    setShowApproveModal(true);
  }

  async function confirmApprove() {
    if (!selectedReq) return;
    setSubmitting(true);
    try {
      await leaveApi.reviewRequest(selectedReq.id, {
        status: 'APPROVED',
        comments: approvalComment || 'Leave request approved'
      });
      setSuccessMsg(`Leave request for ${selectedReq.employee?.fullName || 'employee'} approved.`);
      setShowApproveModal(false);
      setSelectedReq(null);
      queryClient.invalidateQueries({ queryKey: ['leave'] });
    } catch (err) {
      setError(err.friendlyMessage || err.message || 'Approval action failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject(req) {
    setSelectedReq(req);
    setRejectionReason('');
    setShowRejectModal(true);
  }

  async function confirmReject() {
    if (!selectedReq) return;
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejecting this leave request.');
      return;
    }
    setSubmitting(true);
    try {
      await leaveApi.reviewRequest(selectedReq.id, {
        status: 'REJECTED',
        rejectionReason: rejectionReason.trim(),
        comments: rejectionReason.trim()
      });
      setSuccessMsg(`Leave request for ${selectedReq.employee?.fullName || 'employee'} rejected.`);
      setShowRejectModal(false);
      setSelectedReq(null);
      queryClient.invalidateQueries({ queryKey: ['leave'] });
    } catch (err) {
      setError(err.friendlyMessage || err.message || 'Rejection action failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel(reqId) {
    if (!window.confirm('Are you sure you want to cancel this pending leave request?')) return;
    try {
      await leaveApi.cancelRequest(reqId);
      setSuccessMsg('Leave request cancelled.');
      queryClient.invalidateQueries({ queryKey: ['leave'] });
    } catch (err) {
      setError(err.friendlyMessage || err.message || 'Cancellation failed');
    }
  }

  // Selected leave type balance check helper
  const selectedBalance = balances.find(b => b.leaveTypeId === applyForm.leaveTypeId);
  const remainingDays = selectedBalance ? selectedBalance.remaining - selectedBalance.pending : 0;
  const isInsufficient = selectedBalance?.leaveType?.code !== 'UNPAID' && applyForm.daysCount > remainingDays;

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Leave Management
              </h1>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                HRMS Leave Portal
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Apply for statutory leave, track real-time balances, review team approval requests, and view company leave policies.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setError(null);
            setShowApplyModal(true);
          }}
          className="thyo-btn-primary"
        >
          <Plus className="w-4 h-4" />
          <span>Apply for Leave</span>
        </button>
      </div>

      {/* Notifications / Alerts */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-700 hover:text-emerald-900 font-bold ml-2">
            ×
          </button>
        </div>
      )}

      {(error || queryErrorMsg) && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error || queryErrorMsg}</span>
          </div>
          <div className="flex items-center gap-2">
            {queryErrorMsg && (
              <button
                onClick={loadData}
                className="px-2.5 py-1 bg-white border border-rose-200 rounded-lg text-rose-700 hover:bg-rose-100 font-semibold cursor-pointer"
              >
                Retry
              </button>
            )}
            {error && (
              <button onClick={() => setError(null)} className="text-rose-700 hover:text-rose-900 font-bold ml-2">
                ×
              </button>
            )}
          </div>
        </div>
      )}

      {/* Leave Balances Grid */}
      {balancesLoading ? (
        <SkeletonCard count={4} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {balances
            .filter(b => ['CL', 'SL', 'PL', 'COMP'].includes(b.leaveType?.code))
            .map((bal) => {
              const pct = bal.total > 0 ? Math.round((bal.used / bal.total) * 100) : 0;
              return (
                <div key={bal.id} className="thyo-card p-5 hover:border-indigo-200 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {bal.leaveType?.name}
                    </span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {bal.leaveType?.code}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2 mb-2.5">
                    <span className="text-2xl font-extrabold text-indigo-600">
                      {bal.remaining}
                    </span>
                    <span className="text-xs text-slate-500">
                      / {bal.total} days remaining
                    </span>
                  </div>

                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-2.5">
                    <div
                      className={`h-full rounded-full transition-all ${
                        pct > 75 ? 'bg-amber-500' : 'bg-gradient-to-r from-indigo-600 to-violet-600'
                      }`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Used: {bal.used}d</span>
                    {bal.pending > 0 && (
                      <span className="text-amber-600 font-medium">Pending: {bal.pending}d</span>
                    )}
                    {bal.carriedForward > 0 && (
                      <span className="text-violet-600">Carried: +{bal.carriedForward}d</span>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-2xl px-4 pt-2 gap-2 overflow-x-auto">
        <button
          onClick={() => handleTabChange('my')}
          className={`pb-3 px-4 text-xs font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'my'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span>My Leave Requests</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-indigo-50 text-indigo-700">
            {myRequests.length}
          </span>
        </button>

        {hasManagerRights && (
          <button
            onClick={() => handleTabChange('approvalQueue')}
            className={`pb-3 px-4 text-xs font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'approvalQueue'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Team Approval Queue</span>
            {teamRequests.filter(r => r.status === 'PENDING').length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-amber-500 text-white font-bold">
                {teamRequests.filter(r => r.status === 'PENDING').length}
              </span>
            )}
          </button>
        )}

        <button
          onClick={() => handleTabChange('policies')}
          className={`pb-3 px-4 text-xs font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'policies'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Corporate Policy & Rules</span>
        </button>
      </div>

      {/* TAB 1: My Requests */}
      {activeTab === 'my' && (
        <div className="thyo-table-wrap">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">My Leave Applications</h3>
            <span className="text-xs text-slate-500">Showing recent requests for 2026</span>
          </div>

          {myRequestsLoading ? (
            <div className="p-4">
              <SkeletonTable rows={4} cols={7} />
            </div>
          ) : myRequests.length === 0 ? (
            <div className="p-12 text-center">
              <CalendarDays className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500 font-medium">No leave applications submitted yet.</p>
              <button
                onClick={() => setShowApplyModal(true)}
                className="mt-3 text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
              >
                Submit your first leave request
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="thyo-thead">
                  <tr>
                    <th className="py-3 px-4">Leave Type</th>
                    <th className="py-3 px-4">Duration & Dates</th>
                    <th className="py-3 px-4">Days</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Approver Note</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {myRequests.map((req) => (
                    <tr key={req.id} className="thyo-tr">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-indigo-600" />
                          <span>{req.leaveType?.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({req.leaveType?.code})</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-900">
                        <div className="font-medium">
                          {formatDateDisplay(req.startDate)} — {formatDateDisplay(req.endDate)}
                        </div>
                        {req.isHalfDay && (
                          <span className="text-[10px] text-violet-600 font-semibold">
                            Half Day ({req.halfDaySession === 'FIRST_HALF' ? '1st Half' : '2nd Half'})
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {req.daysCount} d
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate" title={req.reason}>
                        {req.reason}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            req.status === 'APPROVED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : req.status === 'REJECTED'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : req.status === 'CANCELLED'
                              ? 'bg-slate-100 text-slate-600 border-slate-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {req.status === 'APPROVED' && <CheckCircle2 className="w-3 h-3" />}
                          {req.status === 'REJECTED' && <XCircle className="w-3 h-3" />}
                          {req.status === 'PENDING' && <Clock className="w-3 h-3" />}
                          <span>{req.status}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-[11px] max-w-xs truncate">
                        {req.rejectionReason || req.approvals?.[0]?.comments || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {req.status === 'PENDING' && (
                          <button
                            onClick={() => handleCancel(req.id)}
                            className="px-3 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Approval Queue */}
      {activeTab === 'approvalQueue' && hasManagerRights && (
        <div className="thyo-table-wrap">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Manager & Supervisor Approval Queue</h3>
              <p className="text-[11px] text-slate-500">Review, approve, or reject employee leave applications</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 font-bold">
              Total: {teamRequests.length}
            </span>
          </div>

          {teamRequestsLoading ? (
            <div className="p-4">
              <SkeletonTable rows={4} cols={8} />
            </div>
          ) : teamRequests.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">
              No employee leave requests require review at this time.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="thyo-thead">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Leave Type</th>
                    <th className="py-3 px-4">Dates</th>
                    <th className="py-3 px-4">Days</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Review Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {teamRequests.map((req) => (
                    <tr key={req.id} className="thyo-tr">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{req.employee?.fullName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{req.employeeId}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {req.employee?.department || 'General'}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {req.leaveType?.name}
                      </td>
                      <td className="py-3.5 px-4 text-slate-900">
                        <div>
                          {formatDateDisplay(req.startDate)} — {formatDateDisplay(req.endDate)}
                        </div>
                        {req.isHalfDay && (
                          <span className="text-[10px] text-violet-600 font-semibold">Half Day</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {req.daysCount} d
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate" title={req.reason}>
                        {req.reason}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            req.status === 'APPROVED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : req.status === 'REJECTED'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {req.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        {req.status === 'PENDING' ? (
                          <>
                            <button
                              onClick={() => handleApprove(req)}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-semibold transition-colors cursor-pointer"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(req)}
                              className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[11px] font-semibold transition-colors cursor-pointer"
                            >
                              Reject
                            </button>
                          </>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Reviewed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Corporate Policy & Rules */}
      {activeTab === 'policies' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="thyo-card p-5 space-y-4">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>Leave Allocation & Accrual Policy</span>
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-500">
              <li className="flex items-start gap-2">
                <ChevronRight className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                <span><strong>Casual Leave (CL):</strong> 12 days per annum credited on January 1st. Cannot be carried forward to subsequent calendar years.</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                <span><strong>Sick / Medical Leave (SL):</strong> 10 days per annum. Absences exceeding 2 continuous days mandate a registered medical practitioner's certificate upon resumption.</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                <span><strong>Privilege / Earned Leave (PL):</strong> 15 days accrued annually (1.25 days per month). Up to 30 unused days carry forward automatically.</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                <span><strong>Compensatory Off (Comp-Off):</strong> Granted for authorized client deployment or production support conducted on weekends or declared company holidays.</span>
              </li>
            </ul>
          </div>

          <div className="thyo-card p-5 space-y-4">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building className="w-4 h-4 text-indigo-600" />
              <span>Statutory Benefits & Approval Workflows</span>
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-500">
              <li className="flex items-start gap-2">
                <ChevronRight className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                <span><strong>Maternity Benefit Act:</strong> 26 weeks (180 calendar days) of fully paid maternity leave for eligible female employees with statutory medical cover.</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                <span><strong>Paternity Leave:</strong> 15 calendar days of paid parental leave to be utilized within 6 months of childbirth or legal adoption.</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                <span><strong>Notice Period:</strong> Planned leaves of 3+ consecutive days must be submitted at least 5 business days in advance to facilitate project staffing.</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                <span><strong>Sandwich Leave Rule:</strong> Official company holidays or weekends falling between two leave dates are calculated per standard corporate HR guidelines.</span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* MODAL 1: Apply for Leave */}
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
        title="Apply for Leave"
      >
        <form onSubmit={handleApplyLeave} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-900 mb-1">
              Select Leave Type <span className="text-rose-500">*</span>
            </label>
            <select
              value={applyForm.leaveTypeId}
              onChange={(e) => setApplyForm({ ...applyForm, leaveTypeId: e.target.value })}
              className="thyo-input"
              required
            >
              {leaveTypes.map((t) => {
                const bal = balances.find(b => b.leaveTypeId === t.id);
                return (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.code}) — {bal ? `${bal.remaining}d remaining` : `${t.defaultDays}d`}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-900 mb-1">
                Start Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={applyForm.startDate}
                onChange={(e) => handleDateChange('startDate', e.target.value)}
                className="thyo-input"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-900 mb-1">
                End Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={applyForm.endDate}
                onChange={(e) => handleDateChange('endDate', e.target.value)}
                className="thyo-input"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-900">
              <input
                type="checkbox"
                checked={applyForm.isHalfDay}
                onChange={handleHalfDayToggle}
                className="rounded border-slate-300 accent-indigo-600 focus:ring-0"
              />
              <span>Half Day Application</span>
            </label>

            {applyForm.isHalfDay && (
              <select
                value={applyForm.halfDaySession}
                onChange={(e) => setApplyForm({ ...applyForm, halfDaySession: e.target.value })}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs"
              >
                <option value="FIRST_HALF">First Half (Morning)</option>
                <option value="SECOND_HALF">Second Half (Afternoon)</option>
              </select>
            )}

            <span className="font-bold text-indigo-600">
              Calculated: {applyForm.daysCount} day(s)
            </span>
          </div>

          {/* Balance Warning */}
          {isInsufficient && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-[11px] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>
                Warning: You only have <strong>{remainingDays}</strong> day(s) available for this leave type.
              </span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-900 mb-1">
              Reason for Absence <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={applyForm.reason}
              onChange={(e) => setApplyForm({ ...applyForm, reason: e.target.value })}
              placeholder="State the purpose of your leave (family function, medical recovery, personal trip, etc.)"
              className="thyo-input"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-900 mb-1">
              Emergency Contact Number (Optional)
            </label>
            <input
              type="text"
              value={applyForm.contactNumber}
              onChange={(e) => setApplyForm({ ...applyForm, contactNumber: e.target.value })}
              placeholder="+91 98765 43210"
              className="thyo-input"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowApplyModal(false)}
              className="thyo-btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || isInsufficient}
              className="thyo-btn-primary"
            >
              {submitting ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Approve Leave */}
      <Modal
        isOpen={showApproveModal}
        onClose={() => setShowApproveModal(false)}
        title="Approve Leave Application"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-500">
            You are about to approve <strong>{selectedReq?.daysCount} day(s)</strong> of{' '}
            <strong>{selectedReq?.leaveType?.name}</strong> for{' '}
            <strong>{selectedReq?.employee?.fullName}</strong> ({formatDateDisplay(selectedReq?.startDate)} - {formatDateDisplay(selectedReq?.endDate)}).
          </p>

          <div>
            <label className="block font-semibold text-slate-900 mb-1">
              Supervisor Approval Note (Optional)
            </label>
            <textarea
              rows={2}
              value={approvalComment}
              onChange={(e) => setApprovalComment(e.target.value)}
              placeholder="e.g. Approved. Please ensure handover notes are shared with your team."
              className="thyo-input"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowApproveModal(false)}
              className="thyo-btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={confirmApprove}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-sm transition-colors cursor-pointer"
            >
              {submitting ? 'Approving...' : 'Confirm Approval'}
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL 3: Reject Leave */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="Reject Leave Application"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-500">
            Please provide a formal justification for rejecting the leave application submitted by{' '}
            <strong>{selectedReq?.employee?.fullName}</strong>.
          </p>

          <div>
            <label className="block font-semibold text-slate-900 mb-1">
              Rejection Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Critical release sprint scheduled; please reschedule leave dates."
              className="thyo-input"
              required
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
              type="button"
              disabled={submitting}
              onClick={confirmReject}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl shadow-sm transition-colors cursor-pointer"
            >
              {submitting ? 'Rejecting...' : 'Confirm Rejection'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
