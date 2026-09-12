import React, { useState, useEffect } from 'react';
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

export default function TaskReportsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    department: 'ALL',
    position: 'ALL',
    startDate: '',
    endDate: ''
  });

  const [metadata, setMetadata] = useState({ departments: [], positions: [] });

  const loadReportData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.department !== 'ALL') params.append('department', filters.department);
      if (filters.position !== 'ALL') params.append('position', filters.position);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const res = await apiClient.get(`/reports?${params.toString()}`);
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load metadata for filters
    apiClient.get('/employees/meta').then(res => {
      if (res.data.success) setMetadata(res.data.data);
    });
  }, []);

  useEffect(() => {
    loadReportData();
  }, [filters]);

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
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Task Analytics & Reports
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Enterprise analytics, employee workload balance, and completion efficiency metrics.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          disabled={exporting}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          <span>{exporting ? 'Generating CSV...' : 'Export CSV Report'}</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Department
            </label>
            <select
              value={filters.department}
              onChange={(e) => setFilters({ ...filters, department: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="ALL">All Departments</option>
              {metadata.departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Position
            </label>
            <select
              value={filters.position}
              onChange={(e) => setFilters({ ...filters, position: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="ALL">All Positions</option>
              {metadata.positions.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                End Date
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            {(filters.department !== 'ALL' || filters.position !== 'ALL' || filters.startDate || filters.endDate) && (
              <button
                onClick={handleResetFilters}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                title="Reset filters"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center text-sm text-slate-400">
          Calculating organization metrics...
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                Total Tasks
              </span>
              <div className="text-3xl font-bold text-slate-900">{data.summary.total}</div>
              <div className="text-xs text-slate-500 mt-1">Across all departments</div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 block mb-1">
                Completed
              </span>
              <div className="text-3xl font-bold text-emerald-600">{data.summary.completed}</div>
              <div className="text-xs text-emerald-700 font-medium mt-1">
                {data.summary.completionRate}% completion rate
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-sky-600 block mb-1">
                In Progress
              </span>
              <div className="text-3xl font-bold text-sky-600">{data.summary.inProgress}</div>
              <div className="text-xs text-slate-500 mt-1">Active execution</div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-rose-600 block mb-1">
                Overdue Tasks
              </span>
              <div className="text-3xl font-bold text-rose-600">{data.summary.overdue}</div>
              <div className="text-xs text-rose-600 mt-1">Action required</div>
            </div>
          </div>

          {/* Priority Breakdown Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">
              Tasks by Priority Distribution
            </h3>
            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <div className="text-xs font-semibold text-slate-500">LOW</div>
                <div className="text-xl font-bold text-slate-700">{data.priorityBreakdown.LOW}</div>
              </div>
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                <div className="text-xs font-semibold text-blue-600">MEDIUM</div>
                <div className="text-xl font-bold text-blue-700">{data.priorityBreakdown.MEDIUM}</div>
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
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-sky-600" />
                <h3 className="text-sm font-semibold text-slate-800">
                  Employee-wise Task Performance
                </h3>
              </div>
              <span className="text-xs text-slate-400">
                {data.employeeMetrics.length} active staff
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
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
                    <tr key={emp.employeeId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-900">
                        <div>{emp.fullName}</div>
                        <div className="text-[11px] text-slate-400">{emp.employeeId}</div>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        <div className="font-semibold text-slate-700">{emp.department}</div>
                        <div className="text-slate-400">{emp.designation}</div>
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-slate-800">
                        {emp.totalAssigned}
                      </td>
                      <td className="py-3 px-4 text-center text-emerald-600 font-semibold">
                        {emp.completed}
                      </td>
                      <td className="py-3 px-4 text-center text-sky-600 font-semibold">
                        {emp.inProgress}
                      </td>
                      <td className="py-3 px-4 text-center text-amber-600">
                        {emp.pending}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={emp.overdue > 0 ? 'text-rose-600 font-bold' : 'text-slate-400'}>
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
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-purple-600" />
                <h3 className="text-sm font-semibold text-slate-800">
                  Department Workload Breakdown
                </h3>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
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
                    <tr key={dept.department} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {dept.department} Department
                      </td>
                      <td className="py-3 px-4 text-center text-slate-600">
                        {dept.employeesCount}
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-slate-800">
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
