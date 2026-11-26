
import {
  getOvertimeRecords,
   getEmployeesOvertimeAuthorization,
  approveOvertime,
  rejectOvertime,
  updateEmployeeOvertimeAuthorization,
  createOvertimeRequest,
  getOvertimeRequests,
  approveOvertimeRequest,
  rejectOvertimeRequest,
} from "./overtime.service.js";

import {
  overtimeQuerySchema,
  overtimeApprovalSchema,
  overtimeRequestSchema,
  overtimeRequestApprovalSchema,
  overtimeRejectionSchema,
  employeeOvertimeAuthorizationSchema,
} from "./overtime.validator.js";

// --------------------------------------------------
// USER ROLE AND SCOPE HELPERS
// --------------------------------------------------

const getUserRoles = (req) => req.user?.roles || [];

const isAdmin = (req) => getUserRoles(req).includes("ADMIN");

const isManager = (req) => getUserRoles(req).includes("MANAGER");

const isEmployee = (req) =>
  getUserRoles(req).includes("EMPLOYEE") &&
  !isAdmin(req) &&
  !isManager(req);

const getUserScope = (req) => ({
  companyId: req.user.companyId,
  branchId: isAdmin(req) ? undefined : req.user.branchId,
  isAdmin: isAdmin(req),
});

const handleError = (res, error, defaultMessage) => {
  console.error(defaultMessage, error);

  return res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || defaultMessage,
  });
};

// --------------------------------------------------
// EXISTING ATTENDANCE-GENERATED OVERTIME RECORDS
// --------------------------------------------------

export const getOvertimeRecordsController = async (req, res) => {
  try {
    if (!isAdmin(req) && !isManager(req) && !isEmployee(req)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view overtime records",
      });
    }

    const validation = overtimeQuerySchema.safeParse(req.query);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid overtime query parameters",
        errors: validation.error.flatten(),
      });
    }

    const result = await getOvertimeRecords({
      ...validation.data,
      ...getUserScope(req),
      employeeId: isEmployee(req)
        ? req.user.employeeId
        : validation.data.employeeId,
    });

    return res.status(200).json({
      success: true,
      message: "Overtime records retrieved successfully",
      data: result.records,
      pagination: result.pagination,
    });
  } catch (error) {
    return handleError(res, error, "Failed to retrieve overtime records");
  }
};

export const approveOvertimeController = async (req, res) => {
  try {
    const validation = overtimeApprovalSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid overtime approval data",
        errors: validation.error.flatten(),
      });
    }

    const approvedBy = req.user.id;

    if (!approvedBy) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user information is missing",
      });
    }

    const record = await approveOvertime({
      overtimeId: req.params.id,
      approvedBy,
      scope: getUserScope(req),
    });

    return res.status(200).json({
      success: true,
      message: "Overtime approved successfully",
      data: record,
    });
  } catch (error) {
    return handleError(res, error, "Failed to approve overtime");
  }
};

export const rejectOvertimeController = async (req, res) => {
  try {
    const validation = overtimeRejectionSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid overtime rejection data",
        errors: validation.error.flatten(),
      });
    }

    const record = await rejectOvertime({
      overtimeId: req.params.id,
      reason: validation.data.reason,
      scope: getUserScope(req),
    });

    return res.status(200).json({
      success: true,
      message: "Overtime rejected successfully",
      data: record,
    });
  } catch (error) {
    return handleError(res, error, "Failed to reject overtime");
  }
};

// --------------------------------------------------
// CREATE MANUAL OVERTIME REQUEST
// --------------------------------------------------

export const createOvertimeRequestController = async (req, res) => {
  try {
    if (!isManager(req) && !isEmployee(req)) {
      return res.status(403).json({
        success: false,
        message: "Only employees and managers can submit overtime requests",
      });
    }

    const validation = overtimeRequestSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid overtime request data",
        errors: validation.error.flatten(),
      });
    }

    if (!req.user.id || !req.user.employeeId) {
      return res.status(401).json({
        success: false,
        message: "Authenticated employee information is missing",
      });
    }

    const record = await createOvertimeRequest({
      ...validation.data,
      employeeId: req.user.employeeId,
      submittedBy: req.user.id,
      requesterRole: isManager(req) ? "MANAGER" : "EMPLOYEE",
      scope: getUserScope(req),
    });

    return res.status(201).json({
      success: true,
      message: "Overtime request submitted successfully",
      data: record,
    });
  } catch (error) {
    return handleError(res, error, "Failed to submit overtime request");
  }
};

// --------------------------------------------------
// GET MANUAL OVERTIME REQUESTS
// --------------------------------------------------

export const getOvertimeRequestsController = async (req, res) => {
  try {
    if (!isAdmin(req) && !isManager(req) && !isEmployee(req)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view overtime requests",
      });
    }

    const validation = overtimeQuerySchema.safeParse(req.query);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid overtime request query parameters",
        errors: validation.error.flatten(),
      });
    }

    const result = await getOvertimeRequests({
      ...validation.data,
      ...getUserScope(req),
      employeeId: isEmployee(req)
        ? req.user.employeeId
        : validation.data.employeeId,
    });

    return res.status(200).json({
      success: true,
      message: "Overtime requests retrieved successfully",
      data: result.records,
      pagination: result.pagination,
    });
  } catch (error) {
    return handleError(res, error, "Failed to retrieve overtime requests");
  }
};

// --------------------------------------------------
// APPROVE MANUAL OVERTIME REQUEST
// --------------------------------------------------

export const approveOvertimeRequestController = async (req, res) => {
  try {
    if (!isAdmin(req) && !isManager(req)) {
      return res.status(403).json({
        success: false,
        message: "Only admins and managers can approve overtime requests",
      });
    }

    const validation = overtimeRequestApprovalSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid overtime request approval data",
        errors: validation.error.flatten(),
      });
    }

    if (!req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Authenticated reviewer information is missing",
      });
    }

    const record = await approveOvertimeRequest({
      requestId: req.params.id,
      approvedHours: validation.data.approvedHours,
      reviewedBy: req.user.id,
      reviewerRole: isAdmin(req) ? "ADMIN" : "MANAGER",
      scope: getUserScope(req),
    });

    return res.status(200).json({
      success: true,
      message: "Overtime request approved successfully",
      data: record,
    });
  } catch (error) {
    return handleError(res, error, "Failed to approve overtime request");
  }
};

// --------------------------------------------------
// REJECT MANUAL OVERTIME REQUEST
// --------------------------------------------------

export const rejectOvertimeRequestController = async (req, res) => {
  try {
    if (!isAdmin(req) && !isManager(req)) {
      return res.status(403).json({
        success: false,
        message: "Only admins and managers can reject overtime requests",
      });
    }

    const validation = overtimeRejectionSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid overtime request rejection data",
        errors: validation.error.flatten(),
      });
    }

    if (!req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Authenticated reviewer information is missing",
      });
    }

    const record = await rejectOvertimeRequest({
      requestId: req.params.id,
      reason: validation.data.reason,
      reviewedBy: req.user.id,
      reviewerRole: isAdmin(req) ? "ADMIN" : "MANAGER",
      scope: getUserScope(req),
    });

    return res.status(200).json({
      success: true,
      message: "Overtime request rejected successfully",
      data: record,
    });
  } catch (error) {
    return handleError(res, error, "Failed to reject overtime request");
  }
};

// --------------------------------------------------
// ENABLE / DISABLE EMPLOYEE OVERTIME
// --------------------------------------------------

export const updateEmployeeOvertimeAuthorizationController = async (
  req,
  res
) => {
  try {
    if (!isAdmin(req) && !isManager(req)) {
      return res.status(403).json({
        success: false,
        message: "Only admins and managers can change overtime authorization",
      });
    }

    const validation = employeeOvertimeAuthorizationSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid employee overtime authorization data",
        errors: validation.error.flatten(),
      });
    }

    const employee = await updateEmployeeOvertimeAuthorization({
      employeeId: req.params.employeeId,
      overtimeEnabled: validation.data.overtimeEnabled,
      scope: getUserScope(req),
    });

    return res.status(200).json({
      success: true,
      message: validation.data.overtimeEnabled
        ? "Overtime enabled for employee successfully"
        : "Overtime disabled for employee successfully",
      data: employee,
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Failed to update employee overtime authorization"
    );
  }
};

// --------------------------------------------------
// GET EMPLOYEES WITH OVERTIME AUTHORIZATION STATUS
// --------------------------------------------------

export const getEmployeesOvertimeAuthorizationController = async (
  req,
  res
) => {
  try {
    if (!isAdmin(req) && !isManager(req)) {
      return res.status(403).json({
        success: false,
        message: "Only admins and managers can view employee overtime authorization",
      });
    }

    const employees = await getEmployeesOvertimeAuthorization({
      ...getUserScope(req),
    });

    return res.status(200).json({
      success: true,
      message: "Employee overtime authorization records retrieved successfully",
      data: employees,
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Failed to retrieve employee overtime authorization records"
    );
  }
};
