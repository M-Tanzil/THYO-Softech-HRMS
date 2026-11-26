
import api from "../../../services/api/axios";

// Existing attendance-generated overtime records
export const getOvertimeRecords = async (params = {}) => {
  const response = await api.get("/overtime", { params });
  return response.data;
};

export const approveOvertime = async (overtimeId) => {
  const response = await api.patch(
    `/overtime/${overtimeId}/approve`,
    {}
  );
  return response.data;
};

export const rejectOvertime = async ({ overtimeId, reason }) => {
  const response = await api.patch(
    `/overtime/${overtimeId}/reject`,
    { reason }
  );
  return response.data;
};

// Existing employee overtime authorization
export const updateEmployeeOvertimeAuthorization = async ({
  employeeId,
  overtimeEnabled,
}) => {
  const response = await api.patch(
    `/overtime/employees/${employeeId}/authorization`,
    { overtimeEnabled }
  );
  return response.data;
};

// Get employees and their overtime authorization status
export const getEmployeesOvertimeAuthorization = async () => {
  const response = await api.get("/overtime/employees/authorization");
  return response.data;
};
// New manual overtime request APIs
export const getOvertimeRequests = async (params = {}) => {
  const response = await api.get("/overtime/requests", { params });
  return response.data;
};

export const createOvertimeRequest = async ({
  overtimeDate,
  requestedHours,
  reason,
}) => {
  const response = await api.post("/overtime/requests", {
    overtimeDate,
    requestedHours,
    reason,
  });
  return response.data;
};

export const approveOvertimeRequest = async ({
  requestId,
  approvedHours,
  remarks,
}) => {
  const response = await api.patch(
    `/overtime/requests/${requestId}/approve`,
    { approvedHours, remarks }
  );
  return response.data;
};

export const rejectOvertimeRequest = async ({
  requestId,
  reason,
}) => {
  const response = await api.patch(
    `/overtime/requests/${requestId}/reject`,
    { reason }
  );
  return response.data;
};
