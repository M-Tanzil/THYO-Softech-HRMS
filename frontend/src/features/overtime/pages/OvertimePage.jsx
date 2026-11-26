
import { useMemo, useState } from "react";
import {
  Clock3,
  CheckCircle2,
  XCircle,
  Hourglass,
  Search,
  RefreshCw,
  Check,
  X,
  Send,
  ClipboardList,
} from "lucide-react";

import {
  useOvertimeRecords,
  useApproveOvertime,
  useRejectOvertime,
  useOvertimeRequests,
  useCreateOvertimeRequest,
  useApproveOvertimeRequest,
  useRejectOvertimeRequest,
  useEmployeesOvertimeAuthorization,
  useUpdateOvertimeAuthorization,
} from "../hooks/useOvertime";

import { getCurrentUser } from "../../../services/storage/currentUser";

const formatDate = (value) => {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getEmployeeName = (employee) =>
  [employee?.firstName, employee?.lastName].filter(Boolean).join(" ") ||
  "Unknown employee";

const getPersonName = (person) =>
  getEmployeeName(person?.employee) !== "Unknown employee"
    ? getEmployeeName(person?.employee)
    : person?.email || "Unknown user";

const statusStyles = {
  PENDING: "bg-amber-50 text-amber-700 ring-amber-200",
  APPROVED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  PARTIALLY_APPROVED: "bg-blue-50 text-blue-700 ring-blue-200",
  REJECTED: "bg-red-50 text-red-700 ring-red-200",
};

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
        statusStyles[status] ||
        "bg-slate-100 text-slate-600 ring-slate-200"
      }`}
    >
      {(status || "UNKNOWN").replaceAll("_", " ")}
    </span>
  );
}


function SummaryCard({ title, value, icon: Icon, color }) {
  const shadowColor = color.includes("indigo")
    ? "shadow-indigo-300/60"
    : color.includes("amber")
    ? "shadow-amber-300/60"
    : color.includes("emerald")
    ? "shadow-emerald-300/60"
    : color.includes("red")
    ? "shadow-red-300/60"
    : "shadow-slate-200";

  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-lg ${shadowColor}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{title}</p>

        <div className={`rounded-xl p-3 ${color}`}>
          <Icon size={20} />
        </div>
      </div>

      <p className="mt-4 text-3xl font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function Modal({ title, description, children, onClose }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

function OvertimePage() {
  const user = getCurrentUser();
  
  const roles = Array.isArray(user?.roles) ? user.roles : [];

  const isAdmin = roles.includes("ADMIN");
  const isManager = roles.includes("MANAGER") && !isAdmin;
  const isEmployee =
    roles.includes("EMPLOYEE") && !isAdmin && !isManager;

  const canManage = isAdmin || isManager;
  const canSubmit = isEmployee || isManager;

  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [requestDate, setRequestDate] = useState("");
  const [requestedHours, setRequestedHours] = useState("");
  const [requestReason, setRequestReason] = useState("");

  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const [approvalTarget, setApprovalTarget] = useState(null);
  const [approvedHours, setApprovedHours] = useState("");

  const [notice, setNotice] = useState(null);
  

  // Display an in-page notification
  const showNotice = (message, type = "success") => {
    setNotice({ message, type });
  };

  // Get today's local date in YYYY-MM-DD format
  const now = new Date();

  const todayDate = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");

  const params = useMemo(
    () => ({
      ...(status ? { status } : {}),
      page,
      limit: 10,
    }),
    [status, page]
  );

  // Existing attendance-generated overtime
  const {
    data: attendanceData,
    isLoading: attendanceLoading,
    isError: attendanceError,
    error: attendanceErrorDetails,
    refetch: refetchAttendance,
    isFetching: attendanceFetching,
  } = useOvertimeRecords(params);

  // Manual overtime requests
  const {
    data: requestData,
    isLoading: requestsLoading,
    isError: requestsError,
    error: requestsErrorDetails,
    refetch: refetchRequests,
    isFetching: requestsFetching,
  } = useOvertimeRequests(params);

  const approveMutation = useApproveOvertime();
  const rejectMutation = useRejectOvertime();

  const createRequestMutation = useCreateOvertimeRequest();
  const approveRequestMutation = useApproveOvertimeRequest();
  const rejectRequestMutation = useRejectOvertimeRequest();

  // Employee overtime authorization
const {
  data: authorizationData,
  isLoading: authorizationLoading,
  isError: authorizationError,
  refetch: refetchAuthorization,
} = useEmployeesOvertimeAuthorization(canManage);

const authorizationMutation = useUpdateOvertimeAuthorization();

const employees = authorizationData?.data || [];

  const records = attendanceData?.data || [];
  const attendancePagination = attendanceData?.pagination || {};

  const requests = requestData?.data || [];
  const requestPagination = requestData?.pagination || {};

  const query = search.trim().toLowerCase();

  const filteredRecords = records.filter((record) => {
    const name = getEmployeeName(record.employee).toLowerCase();
    const code = record.employee?.employeeCode?.toLowerCase() || "";

    return name.includes(query) || code.includes(query);
  });

  const filteredRequests = requests.filter((request) => {
    const name = getEmployeeName(request.employee).toLowerCase();
    const code = request.employee?.employeeCode?.toLowerCase() || "";
    const requester = getPersonName(request.submitter).toLowerCase();

    return (
      name.includes(query) ||
      code.includes(query) ||
      requester.includes(query)
    );
  });

  const refreshAll = () => {
  refetchAttendance();
  refetchRequests();

  if (canManage) {
    refetchAuthorization();
  }
};

// Enable or disable overtime for an employee
const handleToggleAuthorization = async (employee) => {
  try {
    await authorizationMutation.mutateAsync({
      employeeId: employee.id,
      overtimeEnabled: !employee.overtimeEnabled,
    });

    showNotice(
      `${getEmployeeName(employee)}'s overtime has been ${
        employee.overtimeEnabled ? "disabled" : "enabled"
      } successfully.`
    );
  } catch (err) {
    showNotice(
      err.response?.data?.message ||
        "Unable to update overtime authorization.",
      "error"
    );
  }
};

  // Submit manual overtime request
  const handleCreateRequest = async (event) => {
    event.preventDefault();

    if (!requestDate || !requestedHours || !requestReason.trim()) {
      showNotice("Please complete all overtime request fields.", "error");
      return;
    }

    // Employees cannot submit requests for previous dates
    if (canSubmit && requestDate < todayDate) {
  showNotice(
    "You cannot request overtime for a previous date.",
    "error"
  );
  return;
}

    if (Number(requestedHours) <= 0) {
      showNotice("Requested hours must be greater than zero.", "error");
      return;
    }

    try {
      await createRequestMutation.mutateAsync({
        overtimeDate: requestDate,
        requestedHours: Number(requestedHours),
        reason: requestReason.trim(),
      });

      setRequestDate("");
      setRequestedHours("");
      setRequestReason("");

      showNotice("Overtime request submitted successfully.");
    } catch (err) {
      showNotice(
        err.response?.data?.message ||
          "Unable to submit overtime request.",
        "error"
      );
    }
  };

  // Approve attendance-generated overtime
  const handleApproveAttendance = async (id) => {
    try {
      await approveMutation.mutateAsync(id);

      showNotice("Attendance overtime approved successfully.");
    } catch (err) {
      showNotice(
        err.response?.data?.message || "Unable to approve overtime.",
        "error"
      );
    }
  };

  // Reject attendance-generated overtime
  const handleRejectAttendance = async (event) => {
    event.preventDefault();

    if (!rejectTarget || rejectionReason.trim().length < 3) {
      return;
    }

    try {
      await rejectMutation.mutateAsync({
        overtimeId: rejectTarget.id,
        reason: rejectionReason.trim(),
      });

      setRejectTarget(null);
      setRejectionReason("");

      showNotice("Attendance overtime rejected successfully.");
    } catch (err) {
      showNotice(
        err.response?.data?.message || "Unable to reject overtime.",
        "error"
      );
    }
  };

  // Open manual request approval dialog
  const openApproval = (request) => {
    setApprovalTarget(request);
    setApprovedHours(String(request.requestedHours));
  };

  // Approve full or partial manual overtime request
  const handleApproveRequest = async (event) => {
    event.preventDefault();

    if (!approvalTarget) return;

    const hours = Number(approvedHours);
    const requested = Number(approvalTarget.requestedHours);

    if (!Number.isFinite(hours) || hours <= 0 || hours > requested) {
      showNotice(
        `Enter approved hours greater than zero and no more than ${requested}.`,
        "error"
      );
      return;
    }

    try {
      await approveRequestMutation.mutateAsync({
        requestId: approvalTarget.id,
        approvedHours: hours,
      });

      setApprovalTarget(null);
      setApprovedHours("");

      showNotice("Overtime request reviewed successfully.");
    } catch (err) {
      showNotice(
        err.response?.data?.message ||
          "Unable to approve overtime request.",
        "error"
      );
    }
  };

  // Reject manual overtime request
  const handleRejectRequest = async (event) => {
    event.preventDefault();

    if (!rejectTarget || rejectionReason.trim().length < 3) {
      return;
    }

    try {
      await rejectRequestMutation.mutateAsync({
        requestId: rejectTarget.id,
        reason: rejectionReason.trim(),
      });

      setRejectTarget(null);
      setRejectionReason("");

      showNotice("Overtime request rejected successfully.");
    } catch (err) {
      showNotice(
        err.response?.data?.message ||
          "Unable to reject overtime request.",
        "error"
      );
    }
  };

  const attendanceSummary = {
    total: records.length,
    pending: records.filter((r) => r.status === "PENDING").length,
    approved: records.filter((r) => r.status === "APPROVED").length,
    rejected: records.filter((r) => r.status === "REJECTED").length,
  };

  const requestSummary = {
    total: requests.length,
    pending: requests.filter((r) => r.status === "PENDING").length,
    approved: requests.filter(
      (r) =>
        r.status === "APPROVED" ||
        r.status === "PARTIALLY_APPROVED"
    ).length,
    rejected: requests.filter((r) => r.status === "REJECTED").length,
  };

  const isRefreshing = attendanceFetching || requestsFetching;

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isEmployee ? "My Overtime" : "Overtime Management"}
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            {isEmployee
              ? "Submit overtime requests and track your overtime records."
              : "Manage attendance overtime and employee overtime requests."}
          </p>
        </div>

        <button
          onClick={refreshAll}
          disabled={isRefreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={isRefreshing ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </div>

      {/* In-page notification */}
      {notice && (
        <div
          role="alert"
          className={`flex items-center justify-between gap-3 rounded-xl border p-4 text-sm ${
            notice.type === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          <span>{notice.message}</span>

          <button
            type="button"
            onClick={() => setNotice(null)}
            className="font-semibold"
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        </div>
      )}

      {/* Manual request form */}
      {canSubmit && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
              <Send size={20} />
            </div>

            <div>
              <h2 className="font-semibold text-slate-900">
                Submit Overtime Request
              </h2>

              <p className="text-xs text-slate-500">
                Enter the date, requested hours and reason.
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateRequest}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Overtime Date
                </label>

                <input
                  type="date"
                  min={canSubmit ? todayDate : undefined}
                  value={requestDate}
                  onChange={(e) => setRequestDate(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-500"
                />

                {canSubmit && (
  <p className="mt-1 text-xs text-slate-400">
    Previous dates are not allowed.
  </p>
)}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Requested Hours
                </label>

                <input
                  type="number"
                  min="0.25"
                  max="24"
                  step="0.25"
                  value={requestedHours}
                  onChange={(e) => setRequestedHours(e.target.value)}
                  required
                  placeholder="Example: 5"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Reason
                </label>

                <textarea
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  required
                  minLength={3}
                  maxLength={500}
                  rows={3}
                  placeholder="Explain why overtime is required..."
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                disabled={createRequestMutation.isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                <Send size={16} />

                {createRequestMutation.isPending
                  ? "Submitting..."
                  : "Submit Request"}
              </button>
            </div>
          </form>
        </section>
      )}
      {/* Employee overtime authorization - Admin and Manager only */}
{canManage && (
  <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
      <div>
        <h2 className="font-semibold text-slate-900">
          Employee Overtime Authorization
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Control which employees are allowed to submit overtime requests.
        </p>
      </div>

      <button
        type="button"
        onClick={() => refetchAuthorization()}
        disabled={authorizationLoading}
        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
      >
        Refresh
      </button>
    </div>

    {authorizationLoading ? (
      <div className="p-8 text-center text-sm text-slate-500">
        Loading employee authorization...
      </div>
    ) : authorizationError ? (
      <div className="p-8 text-center">
        <p className="text-sm text-red-600">
          Unable to load employee authorization records.
        </p>
        <button
          type="button"
          onClick={() => refetchAuthorization()}
          className="mt-2 text-sm font-semibold text-indigo-600"
        >
          Try again
        </button>
      </div>
    ) : employees.length === 0 ? (
      <div className="p-8 text-center text-sm text-slate-500">
        No employees found.
      </div>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[650px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-4">Employee</th>
              <th className="px-5 py-4">Employee Code</th>
              <th className="px-5 py-4">Authorization</th>
              <th className="px-5 py-4">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {employees.map((employee) => (
              <tr key={employee.id} className="hover:bg-slate-50/70">
                <td className="px-5 py-4 font-medium text-slate-800">
                  {getEmployeeName(employee)}
                </td>

                <td className="px-5 py-4 text-slate-600">
                  {employee.employeeCode}
                </td>

                <td className="px-5 py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      employee.overtimeEnabled
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {employee.overtimeEnabled ? "Enabled" : "Disabled"}
                  </span>
                </td>

                <td className="px-5 py-4">
                  <button
                    type="button"
                    onClick={() => handleToggleAuthorization(employee)}
                    disabled={authorizationMutation.isPending}
                    className={`rounded-lg px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${
                      employee.overtimeEnabled
                        ? "bg-red-600 hover:bg-red-700"
                        : "bg-emerald-600 hover:bg-emerald-700"
                    }`}
                  >
                    {employee.overtimeEnabled ? "Disable" : "Enable"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </section>
)}

      {/* Attendance overtime summary */}
      
{/* Manual Overtime Request Summary */}

{/* Manual Overtime Request Summary */}
<section className="space-y-4">
  <h2 className="font-semibold text-slate-900">
    Overtime Request Summary
  </h2>

  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <SummaryCard
      title="Requests on this page"
      value={requestSummary.total}
      icon={Clock3}
      color="bg-indigo-50 text-indigo-600 shadow-md shadow-indigo-200/60"
    />

    <SummaryCard
      title="Pending"
      value={requestSummary.pending}
      icon={Hourglass}
      color="bg-amber-50 text-amber-600 shadow-md shadow-amber-200/60"
    />

    <SummaryCard
      title="Approved"
      value={requestSummary.approved}
      icon={CheckCircle2}
      color="bg-emerald-50 text-emerald-600 shadow-md shadow-emerald-200/60"
    />

    <SummaryCard
      title="Rejected"
      value={requestSummary.rejected}
      icon={XCircle}
      color="bg-red-50 text-red-600 shadow-md shadow-red-200/60"
    />
  </div>
</section>


      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search employee name or code..."
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-500"
        >
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="PARTIALLY_APPROVED">Partially approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {/* Manual overtime requests */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList size={20} className="text-indigo-600" />

            <div>
              <h2 className="font-semibold text-slate-900">
                Overtime Requests
              </h2>

              <p className="text-xs text-slate-500">
                {requestPagination.total || 0} total requests
              </p>
            </div>
          </div>

          <div className="flex gap-4 text-xs">
            <span className="text-amber-700">
              Pending: {requestSummary.pending}
            </span>

            <span className="text-emerald-700">
              Approved: {requestSummary.approved}
            </span>

            <span className="text-red-700">
              Rejected: {requestSummary.rejected}
            </span>
          </div>
        </div>

        {requestsLoading ? (
          <div className="p-12 text-center text-sm text-slate-500">
            Loading overtime requests...
          </div>
        ) : requestsError ? (
          <div className="p-10 text-center">
            <p className="text-sm text-red-600">
              {requestsErrorDetails?.response?.data?.message ||
                "Failed to load overtime requests."}
            </p>

            <button
              onClick={() => refetchRequests()}
              className="mt-3 text-sm font-semibold text-indigo-600"
            >
              Try again
            </button>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList
              className="mx-auto text-slate-300"
              size={36}
            />

            <p className="mt-3 font-medium text-slate-700">
              No overtime requests found
            </p>

            <p className="mt-1 text-sm text-slate-400">
              Submitted requests will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  {!isEmployee && (
                    <th className="px-5 py-4">Employee</th>
                  )}

                  <th className="px-5 py-4">Date</th>
                  <th className="px-5 py-4">Requester</th>
                  <th className="px-5 py-4">Requested</th>
                  <th className="px-5 py-4">Allocated</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Reviewer</th>
                  <th className="px-5 py-4">Details</th>

                  {canManage && (
                    <th className="px-5 py-4">Actions</th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredRequests.map((request) => {
                  const isOwnRequest =
                    request.submitter?.id === user.id;

                  const canReview =
                    canManage &&
                    request.status === "PENDING" &&
                    !isOwnRequest &&
                    (isAdmin || request.requesterRole === "EMPLOYEE");

                  return (
                    <tr
                      key={request.id}
                      className="align-top hover:bg-slate-50/70"
                    >
                      {!isEmployee && (
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-800">
                            {getEmployeeName(request.employee)}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {request.employee?.employeeCode || "—"}
                          </p>
                        </td>
                      )}

                      <td className="whitespace-nowrap px-5 py-4 text-slate-700">
                        {formatDate(request.overtimeDate)}
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-700">
                          {getPersonName(request.submitter)}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {request.requesterRole || "—"}
                        </p>
                      </td>

                      <td className="px-5 py-4 font-semibold text-slate-700">
                        {Number(request.requestedHours).toFixed(2)} h
                      </td>

                      <td className="px-5 py-4 font-semibold text-indigo-700">
                        {request.approvedHours != null
                          ? `${Number(request.approvedHours).toFixed(2)} h`
                          : "—"}
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge status={request.status} />
                      </td>

                      <td className="px-5 py-4">
                        {request.reviewer ? (
                          <>
                            <p className="font-medium text-slate-700">
                              {getPersonName(request.reviewer)}
                            </p>

                            <p className="mt-1 whitespace-nowrap text-xs text-slate-400">
                              {formatDate(request.reviewedAt)}
                            </p>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400">
                            Awaiting review
                          </span>
                        )}
                      </td>

                      <td className="max-w-[220px] px-5 py-4 text-xs text-slate-500">
                        <p>{request.reason || "—"}</p>

                        {request.rejectionReason && (
                          <p className="mt-2 text-red-600">
                            Rejection: {request.rejectionReason}
                          </p>
                        )}
                      </td>

                      {canManage && (
                        <td className="px-5 py-4">
                          {canReview ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openApproval(request)}
                                title="Approve request"
                                className="rounded-lg bg-emerald-50 p-2 text-emerald-700 hover:bg-emerald-100"
                              >
                                <Check size={17} />
                              </button>

                              <button
                                onClick={() => {
                                  setRejectTarget(request);
                                  setRejectionReason("");
                                }}
                                title="Reject request"
                                className="rounded-lg bg-red-50 p-2 text-red-700 hover:bg-red-100"
                              >
                                <X size={17} />
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">
                              No actions
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!requestsLoading &&
          !requestsError &&
          requestPagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
              <p className="text-xs text-slate-500">
                Page {requestPagination.page} of{" "}
                {requestPagination.totalPages}
              </p>

              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((value) => value - 1)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium disabled:opacity-40"
                >
                  Previous
                </button>

                <button
                  disabled={page >= requestPagination.totalPages}
                  onClick={() => setPage((value) => value + 1)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
      </section>

      {/* Attendance-generated overtime records */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-900">
            Attendance Overtime Records
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            {attendancePagination.total || 0} total records
          </p>
        </div>

        {attendanceLoading ? (
          <div className="p-12 text-center text-sm text-slate-500">
            Loading attendance overtime...
          </div>
        ) : attendanceError ? (
          <div className="p-10 text-center">
            <p className="text-sm text-red-600">
              {attendanceErrorDetails?.response?.data?.message ||
                "Failed to load overtime records."}
            </p>

            <button
              onClick={() => refetchAttendance()}
              className="mt-3 text-sm font-semibold text-indigo-600"
            >
              Try again
            </button>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-12 text-center">
            <Clock3 className="mx-auto text-slate-300" size={36} />

            <p className="mt-3 font-medium text-slate-700">
              No attendance overtime records found
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  {!isEmployee && (
                    <th className="px-5 py-4">Employee</th>
                  )}

                  <th className="px-5 py-4">Date</th>
                  <th className="px-5 py-4">Regular Hours</th>
                  <th className="px-5 py-4">Actual Hours</th>
                  <th className="px-5 py-4">Overtime Hours</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Details</th>

                  {canManage && (
                    <th className="px-5 py-4">Actions</th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50/70">
                    {!isEmployee && (
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-800">
                          {getEmployeeName(record.employee)}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {record.employee?.employeeCode || "—"}
                        </p>
                      </td>
                    )}

                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">
                      {formatDate(record.overtimeDate)}
                    </td>

                    <td className="px-5 py-4 text-slate-700">
                      {Number(record.regularHours).toFixed(2)} h
                    </td>

                    <td className="px-5 py-4 text-slate-700">
                      {Number(record.actualHours).toFixed(2)} h
                    </td>

                    <td className="px-5 py-4 font-semibold text-indigo-700">
                      {Number(record.overtimeHours).toFixed(2)} h
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge status={record.status} />
                    </td>

                    <td className="max-w-[220px] px-5 py-4 text-xs text-slate-500">
                      {record.rejectionReason || "—"}
                    </td>

                    {canManage && (
                      <td className="px-5 py-4">
                        {record.status === "PENDING" ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                handleApproveAttendance(record.id)
                              }
                              disabled={approveMutation.isPending}
                              title="Approve"
                              className="rounded-lg bg-emerald-50 p-2 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                            >
                              <Check size={17} />
                            </button>

                            <button
                              onClick={() => {
                                setRejectTarget({
                                  ...record,
                                  type: "attendance",
                                });
                                setRejectionReason("");
                              }}
                              title="Reject"
                              className="rounded-lg bg-red-50 p-2 text-red-700 hover:bg-red-100"
                            >
                              <X size={17} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">
                            No actions
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!attendanceLoading &&
          !attendanceError &&
          attendancePagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
              <p className="text-xs text-slate-500">
                Page {attendancePagination.page} of{" "}
                {attendancePagination.totalPages}
              </p>

              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((value) => value - 1)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium disabled:opacity-40"
                >
                  Previous
                </button>

                <button
                  disabled={page >= attendancePagination.totalPages}
                  onClick={() => setPage((value) => value + 1)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
      </section>

      {/* Approve manual request dialog */}
      {approvalTarget && (
        <Modal
          title="Review Overtime Request"
          description={`Requested hours: ${Number(
            approvalTarget.requestedHours
          ).toFixed(2)} h`}
          onClose={() => setApprovalTarget(null)}
        >
          <form onSubmit={handleApproveRequest}>
            <label className="mt-5 block text-sm font-medium text-slate-700">
              Approved / Allocated Hours
            </label>

            <input
              type="number"
              min="0.25"
              max={Number(approvalTarget.requestedHours)}
              step="0.25"
              value={approvedHours}
              onChange={(e) => setApprovedHours(e.target.value)}
              required
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500"
            />

            <p className="mt-2 text-xs text-slate-500">
              You can approve the full requested hours or allocate fewer hours.
            </p>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setApprovalTarget(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={approveRequestMutation.isPending}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {approveRequestMutation.isPending
                  ? "Approving..."
                  : "Confirm Approval"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Rejection dialog for both record types */}
      {rejectTarget && (
        <Modal
          title="Reject Overtime"
          description="Provide a reason for rejecting this overtime item."
          onClose={() => setRejectTarget(null)}
        >
          <form
            onSubmit={
              rejectTarget.type === "attendance"
                ? handleRejectAttendance
                : handleRejectRequest
            }
          >
            <textarea
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              rows={4}
              minLength={3}
              maxLength={500}
              required
              placeholder="Enter rejection reason..."
              className="mt-4 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
            />

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  rejectionReason.trim().length < 3 ||
                  rejectMutation.isPending ||
                  rejectRequestMutation.isPending
                }
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {rejectMutation.isPending || rejectRequestMutation.isPending
                  ? "Rejecting..."
                  : "Confirm Reject"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default OvertimePage;
