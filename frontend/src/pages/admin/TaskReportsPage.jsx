import React, { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  Download,
  Filter,
  BarChart2,
  TrendingUp,
  CheckCircle2,
  Clock,
  PlayCircle,
  AlertCircle,
  Users,
  Building2,
  Calendar,
  X
} from 'lucide-react';
import apiClient from '../../api/client';
import ProgressBar from '../../components/common/ProgressBar';
import { SkeletonStats, SkeletonTable } from '../../components/common/SkeletonLoader';
import { useAuth } from '../../context/AuthContext';

export default function TaskReportsPage() {
  const { isManager, currentUser } = useAuth();
  const [exporting, setExporting] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    department: isManager && currentUser?.department ? currentUser.department : 'ALL',
    position: 'ALL',
    startDate: '',
    endDate: ''
  });

  const { data: metadataResult } = useQuery({
    queryKey: ['employeeMetadata'],
    queryFn: async () => {
      const res = await apiClient.get('/employees/meta');
      return res.data?.success ? res.data.data : { departments: [], positions: [] };
    },
    staleTime: 1000 * 60 * 10
  });

  const metadata = {
    departments: Array.isArray(metadataResult?.departments)
      ? metadataResult.departments
      : Array.isArray(metadataResult)
        ? metadataResult
        : [],
    positions: Array.isArray(metadataResult?.positions) ? metadataResult.positions : []
  };

  const { data: reportResult, isLoading: reportLoading } = useQuery({
    queryKey: ['taskReports', filters.department, filters.position, filters.startDate, filters.endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.department !== 'ALL') params.append('department', filters.department);
      if (filters.position !== 'ALL') params.append('position', filters.position);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const res = await apiClient.get(`/reports?${params.toString()}`);
      return res.data?.success ? res.data.data : null;
    },
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 3
  });

  const data = reportResult || null;
  const loading = !data && reportLoading;

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (filters.department !== 'ALL') params.append('department', filters.department);
      if (filters.position !== 'ALL') params.append('position', filters.position);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await apiClient.get(`/reports/export?${params.toString()}`, {
        responseType: 'blob'
      });

      // Trigger browser download
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `THYO_HRMS_Task_Report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert(err.friendlyMessage || 'Failed to export CSV report.');
    } finally {
      setExporting(false);
    }
  };

  const handleResetFilters = () => {
    setFilters({ department: 'ALL', position: 'ALL', startDate: '', endDate: '' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight">
            Task Analytics & Reports
          </h2>
          <p className="text-xs text-[#64748B] mt-1">
            Enterprise analytics, employee workload balance, and completion efficiency metrics.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          disabled={exporting}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#0084FF] hover:bg-[#1C4ED8] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>{exporting ? 'Generating CSV...' : 'Export CSV Report'}</span>
        </button>
      </div>

      {/* Manager Scope Banner */}
      {isManager && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>
              Manager Scope: Analytics and CSV export are strictly scoped to the <strong>{currentUser?.department || 'Sales'} Department</strong> team.
            </span>
          </div>
          <span className="font-bold text-[10px] uppercase px-2 py-0.5 rounded bg-amber-200/80 text-amber-900">
            {currentUser?.department || 'Team'} Scope
          </span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mb-1">
              Department
            </label>
            <select
              value={isManager && currentUser?.department ? currentUser.department : filters.department}
              disabled={isManager}
              onChange={(e) => setFilters({ ...filters, department: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0084FF] disabled:bg-[#F8FAFC] disabled:text-[#64748B] cursor-pointer"
            >
              {isManager ? (
                <option value={currentUser?.department}>{currentUser?.department} Department</option>
              ) : (
                <>
                  <option value="ALL">All Departments</option>
                  {metadata.departments.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </>
              )}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mb-1">
              Position
            </label>
            <select
              value={filters.position}
              onChange={(e) => setFilters({ ...filters, position: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0084FF] cursor-pointer"
            >
              <option value="ALL">All Positions</option>
              {metadata.positions.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0084FF]"
            />
          </div>

          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mb-1">
                End Date
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0084FF]"
              />
            </div>
            {(filters.department !== 'ALL' || filters.position !== 'ALL' || filters.startDate || filters.endDate) && (
              <button
                onClick={handleResetFilters}
                className="p-2 text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] rounded-lg cursor-pointer"
                title="Reset filters"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          <SkeletonStats count={4} />
          <SkeletonTable rows={4} cols={5} />
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B] block mb-1">
                Total Tasks
              </span>
              <div className="text-3xl font-bold text-[#0F172A]">{data.summary.total}</div>
              <div className="text-xs text-[#64748B] mt-1">Across all departments</div>
            </div>

            <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 block mb-1">
                Completed
              </span>
              <div className="text-3xl font-bold text-emerald-600">{data.summary.completed}</div>
              <div className="text-xs text-emerald-700 font-medium mt-1">
                {data.summary.completionRate}% completion rate
              </div>
            </div>

            <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#0084FF] block mb-1">
                In Progress
              </span>
              <div className="text-3xl font-bold text-[#0084FF]">{data.summary.inProgress}</div>
              <div className="text-xs text-[#64748B] mt-1">Active execution</div>
            </div>

            <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-rose-600 block mb-1">
                Overdue Tasks
              </span>
              <div className="text-3xl font-bold text-rose-600">{data.summary.overdue}</div>
              <div className="text-xs text-rose-600 mt-1">Action required</div>
            </div>
          </div>

          {/* Priority Breakdown Bar */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-xs">
            <h3 className="text-sm font-bold text-[#0F172A] mb-3">
              Tasks by Priority Distribution
            </h3>
            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                <div className="text-xs font-semibold text-[#64748B]">LOW</div>
                <div className="text-xl font-bold text-[#0F172A]">{data.priorityBreakdown.LOW}</div>
              </div>
              <div className="p-3 rounded-lg bg-[#F0F9FF] border border-[#BAE6FD]">
                <div className="text-xs font-semibold text-[#0084FF]">MEDIUM</div>
                <div className="text-xl font-bold text-[#1E40AF]">{data.priorityBreakdown.MEDIUM}</div>
              </div>
              <div className="p-3 rounded-lg bg-orange-50 border border-orange-100">
                <div className="text-xs font-semibold text-orange-600">HIGH</div>
                <div className="text-xl font-bold text-orange-700">{data.priorityBreakdown.HIGH}</div>
              </div>
              <div className="p-3 rounded-lg bg-red-50 border border-red-100">
                <div className="text-xs font-semibold text-red-600">URGENT</div>
                <div className="text-xl font-bold text-red-700">{data.priorityBreakdown.URGENT}</div>
              </div>
            </div>
          </div>

          {/* Employee-wise Performance Table */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#0084FF]" />
                <h3 className="text-sm font-bold text-[#0F172A]">
                  Employee-wise Task Performance
                </h3>
              </div>
              <span className="text-xs text-[#64748B]">
                {data.employeeMetrics.length} active staff
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Department & Role</th>
                    <th className="py-3 px-4 text-center">Assigned</th>
                    <th className="py-3 px-4 text-center">Completed</th>
                    <th className="py-3 px-4 text-center">In Progress</th>
                    <th className="py-3 px-4 text-center">Pending</th>
                    <th className="py-3 px-4 text-center">Overdue</th>
                    <th className="py-3 px-4 w-36">Completion %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.employeeMetrics.map((emp) => (
                    <tr key={emp.employeeId} className="hover:bg-[#F0F9FF]/60 transition-colors">
                      <td className="py-3 px-4 font-medium text-[#0F172A]">
                        <div>{emp.fullName}</div>
                        <div className="text-[11px] text-[#64748B]">{emp.employeeId}</div>
                      </td>
                      <td className="py-3 px-4 text-xs text-[#64748B]">
                        <div className="font-semibold text-[#0F172A]">{emp.department}</div>
                        <div className="text-[#64748B]">{emp.designation}</div>
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-[#0F172A]">
                        {emp.totalAssigned}
                      </td>
                      <td className="py-3 px-4 text-center text-emerald-600 font-semibold">
                        {emp.completed}
                      </td>
                      <td className="py-3 px-4 text-center text-[#0084FF] font-semibold">
                        {emp.inProgress}
                      </td>
                      <td className="py-3 px-4 text-center text-amber-600">
                        {emp.pending}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={emp.overdue > 0 ? 'text-rose-600 font-bold' : 'text-[#64748B]'}>
                          {emp.overdue}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <ProgressBar progress={emp.completionRate} size="sm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Department Breakdown Table */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#1E40AF]" />
                <h3 className="text-sm font-bold text-[#0F172A]">
                  Department Workload Breakdown
                </h3>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4 text-center">Staff Count</th>
                    <th className="py-3 px-4 text-center">Assigned Tasks</th>
                    <th className="py-3 px-4 text-center">Completed</th>
                    <th className="py-3 px-4 text-center">Pending</th>
                    <th className="py-3 px-4 text-center">Overdue</th>
                    <th className="py-3 px-4 w-36">Completion %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.departmentMetrics.map((dept) => (
                    <tr key={dept.department} className="hover:bg-[#F0F9FF]/60 transition-colors">
                      <td className="py-3 px-4 font-semibold text-[#0F172A]">
                        {dept.department} Department
                      </td>
                      <td className="py-3 px-4 text-center text-[#64748B]">
                        {dept.employeesCount}
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-[#0F172A]">
                        {dept.totalAssigned}
                      </td>
                      <td className="py-3 px-4 text-center text-emerald-600 font-semibold">
                        {dept.completed}
                      </td>
                      <td className="py-3 px-4 text-center text-amber-600">
                        {dept.pending}
                      </td>
                      <td className="py-3 px-4 text-center text-rose-600 font-semibold">
                        {dept.overdue}
                      </td>
                      <td className="py-3 px-4">
                        <ProgressBar progress={dept.completionRate} size="sm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
