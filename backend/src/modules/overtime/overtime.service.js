
import prisma from "../../config/prisma.js";
import { OVERTIME_STATUS } from "./overtime.constants.js";

// --------------------------------------------------
// Shared helpers
// --------------------------------------------------

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};
const getTodayDate = () => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value])
  );

  return `${values.year}-${values.month}-${values.day}`;
};

const getDateOnly = (value) => {
  if (!value) {
    throw createError("Overtime date is required");
  }

  const dateString =
    value instanceof Date
      ? value.toISOString().slice(0, 10)
      : String(value).slice(0, 10);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    throw createError("Invalid overtime date");
  }

  const parsedDate = new Date(`${dateString}T00:00:00.000Z`);

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== dateString
  ) {
    throw createError("Invalid overtime date");
  }

  return dateString;
};

// Restrict records to the user's company and branch.
const getEmployeeScopeFilter = (scope) => {
  if (!scope?.companyId) {
    throw createError("Valid company context is required", 403);
  }

  // Only Admin can access all branches.
  if (!scope.isAdmin && !scope.branchId) {
    throw createError("Valid branch context is required", 403);
  }

  return {
    is: {
      companyId: scope.companyId,
      ...(!scope.isAdmin ? { branchId: scope.branchId } : {}),
    },
  };
};

const employeeSelect = {
  id: true,
  employeeCode: true,
  firstName: true,
  lastName: true,
};

const requestInclude = {
  employee: {
    select: employeeSelect,
  },
  submitter: {
    select: {
      id: true,
      email: true,
      employee: {
        select: employeeSelect,
      },
    },
  },
  reviewer: {
    select: {
      id: true,
      email: true,
      employee: {
        select: employeeSelect,
      },
    },
  },
};

// --------------------------------------------------
// Existing attendance-generated overtime functions
// --------------------------------------------------

const findOvertimeRecordInScope = async (overtimeId, scope) => {
  const record = await prisma.overtimeRecord.findFirst({
    where: {
      id: overtimeId,
      employee: getEmployeeScopeFilter(scope),
    },
  });

  if (!record) {
    throw createError("Overtime record not found", 404);
  }

  return record;
};

export const getOvertimeRecords = async ({
  employeeId,
  attendanceId,
  status,
  startDate,
  endDate,
  page = 1,
  limit = 20,
  companyId,
  branchId,
  isAdmin,
}) => {
  const scope = { companyId, branchId, isAdmin };

  const where = {
    employee: getEmployeeScopeFilter(scope),
  };

  if (employeeId) where.employeeId = employeeId;
  if (attendanceId) where.attendanceId = attendanceId;
  if (status) where.status = status;

  if (startDate || endDate) {
    where.overtimeDate = {};

    if (startDate) {
      where.overtimeDate.gte = startDate;
    }

    if (endDate) {
      const exclusiveEndDate = new Date(endDate);
      exclusiveEndDate.setUTCDate(exclusiveEndDate.getUTCDate() + 1);
      where.overtimeDate.lt = exclusiveEndDate;
    }
  }

  const skip = (page - 1) * limit;

  const [records, total] = await prisma.$transaction([
    prisma.overtimeRecord.findMany({
      where,
      skip,
      take: limit,
      orderBy: [
        { overtimeDate: "desc" },
        { createdAt: "desc" },
      ],
      include: {
        employee: {
          select: employeeSelect,
        },
        attendance: {
          select: {
            id: true,
            attendanceDate: true,
            status: true,
            workingHours: true,
            regularHours: true,
            overtimeHours: true,
          },
        },
        approvedByUser: {
          select: {
            id: true,
          },
        },
      },
    }),

    prisma.overtimeRecord.count({ where }),
  ]);

  return {
    records,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const approveOvertime = async ({
  overtimeId,
  approvedBy,
  scope,
}) => {
  const existingRecord = await findOvertimeRecordInScope(
    overtimeId,
    scope
  );

  if (existingRecord.status !== OVERTIME_STATUS.PENDING) {
    throw createError(
      `Only pending overtime records can be approved. Current status: ${existingRecord.status}`
    );
  }

  return prisma.overtimeRecord.update({
    where: { id: overtimeId },
    data: {
      status: OVERTIME_STATUS.APPROVED,
      approvedBy,
      approvedAt: new Date(),
      rejectionReason: null,
    },
    include: {
      employee: {
        select: employeeSelect,
      },
      attendance: true,
    },
  });
};

export const rejectOvertime = async ({
  overtimeId,
  reason,
  scope,
}) => {
  const existingRecord = await findOvertimeRecordInScope(
    overtimeId,
    scope
  );

  if (existingRecord.status !== OVERTIME_STATUS.PENDING) {
    throw createError(
      `Only pending overtime records can be rejected. Current status: ${existingRecord.status}`
    );
  }

  return prisma.overtimeRecord.update({
    where: { id: overtimeId },
    data: {
      status: OVERTIME_STATUS.REJECTED,
      rejectionReason: reason,
      approvedBy: null,
      approvedAt: null,
    },
    include: {
      employee: {
        select: employeeSelect,
      },
      attendance: true,
    },
  });
};

// --------------------------------------------------
// Existing employee overtime authorization
// --------------------------------------------------


export const updateEmployeeOvertimeAuthorization = async ({
  employeeId,
  overtimeEnabled,
  scope,
}) => {
  if (!scope?.companyId) {
    throw createError("Valid company context is required", 403);
  }

  if (!scope.isAdmin && !scope.branchId) {
    throw createError("Valid branch context is required", 403);
  }

  const employee = await prisma.employee.findFirst({
    where: {
      id: employeeId,
      companyId: scope.companyId,
      ...(!scope.isAdmin ? { branchId: scope.branchId } : {}),
    },
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      lastName: true,
      overtimeEnabled: true,
      user: {
        select: {
          userRoles: {
            select: {
              role: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!employee) {
    throw createError(
      "Employee not found in your permitted branch or company",
      404
    );
  }

  // Managers cannot modify another Manager's overtime authorization.
  const isTargetManager = employee.user.userRoles.some(
    (userRole) => userRole.role.name === "MANAGER"
  );

  if (!scope.isAdmin && isTargetManager) {
    throw createError(
      "Managers cannot modify another manager's overtime authorization",
      403
    );
  }

  return prisma.employee.update({
    where: { id: employeeId },
    data: { overtimeEnabled },
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      lastName: true,
      overtimeEnabled: true,
    },
  });
};


// --------------------------------------------------
// List employees and their overtime authorization
// --------------------------------------------------


export const getEmployeesOvertimeAuthorization = async ({
  companyId,
  branchId,
  isAdmin,
}) => {
  if (!companyId) {
    throw createError("Valid company context is required", 403);
  }

  if (!isAdmin && !branchId) {
    throw createError("Valid branch context is required", 403);
  }

  const employees = await prisma.employee.findMany({
    where: {
      companyId,
      ...(!isAdmin
        ? {
            branchId,
            user: {
              userRoles: {
                none: {
                  role: {
                    name: "MANAGER",
                  },
                },
              },
            },
          }
        : {}),
    },
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      lastName: true,
      overtimeEnabled: true,
    },
    orderBy: [
      { firstName: "asc" },
      { lastName: "asc" },
    ],
  });

  return employees;
};

// --------------------------------------------------
// NEW: Manual overtime request submission
// --------------------------------------------------


export const createOvertimeRequest = async ({
  employeeId,
  submittedBy,
  requesterRole,
  overtimeDate,
  requestedHours,
  reason,
  scope,
}) => {
  if (!["EMPLOYEE", "MANAGER"].includes(requesterRole)) {
    throw createError(
      "Only employees and managers can submit overtime requests",
      403
    );
  }

  if (!submittedBy || !employeeId) {
    throw createError(
      "Employee authentication context is required",
      403
    );
  }

  // Validate company and branch scope.
  if (!scope?.companyId) {
    throw createError("Valid company context is required", 403);
  }

  if (!scope.branchId) {
    throw createError("Valid branch context is required", 403);
  }

  // Employees and Managers cannot request previous dates.
  const requestedDate = getDateOnly(overtimeDate);
  const today = getTodayDate();

  if (requestedDate < today) {
    throw createError(
      "Overtime requests cannot be submitted for previous dates",
      400
    );
  }

  const employee = await prisma.employee.findFirst({
    where: {
      id: employeeId,
      userId: submittedBy,
      companyId: scope.companyId,
      branchId: scope.branchId,
    },
    select: {
      id: true,
      overtimeEnabled: true,
    },
  });

  if (!employee) {
    throw createError(
      "Employee not found in your permitted scope",
      404
    );
  }

  // Employees must have overtime authorization enabled.
  // Managers can submit their own requests without this restriction.
  // Both Employees and Managers must have overtime authorization enabled.
if (!employee.overtimeEnabled) {
  throw createError(
    "Overtime authorization is disabled for your account. Please contact your administrator.",
    403
  );
}

  return prisma.overtimeRequest.create({
    data: {
      employeeId,
      submittedBy,
      requesterRole,
      overtimeDate,
      requestedHours,
      reason,
      status: OVERTIME_STATUS.PENDING,
    },
    include: requestInclude,
  });
};


// --------------------------------------------------
// NEW: List manual overtime requests
// --------------------------------------------------

export const getOvertimeRequests = async ({
  employeeId,
  status,
  startDate,
  endDate,
  page = 1,
  limit = 20,
  companyId,
  branchId,
    isAdmin,
}) => {
  const where = {
    employee: getEmployeeScopeFilter({
      companyId,
      branchId,
      isAdmin,
    }),
  };

  if (employeeId) {
    where.employeeId = employeeId;
  }

  if (status) {
    where.status = status;
  }

  if (startDate || endDate) {
    where.overtimeDate = {};

    if (startDate) {
      where.overtimeDate.gte = startDate;
    }

    if (endDate) {
      const exclusiveEndDate = new Date(endDate);
      exclusiveEndDate.setUTCDate(
        exclusiveEndDate.getUTCDate() + 1
      );
      where.overtimeDate.lt = exclusiveEndDate;
    }
  }

  const skip = (page - 1) * limit;

  const [requests, total] = await prisma.$transaction([
    prisma.overtimeRequest.findMany({
      where,
      skip,
      take: limit,
      orderBy: [
        { overtimeDate: "desc" },
        { createdAt: "desc" },
      ],
      include: requestInclude,
    }),

    prisma.overtimeRequest.count({ where }),
  ]);

  return {
    records: requests,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// --------------------------------------------------
// NEW: Approve or partially approve a request
// --------------------------------------------------

export const approveOvertimeRequest = async ({
  requestId,
  approvedHours,
  reviewedBy,
  reviewerRole,
  scope,
}) => {
  if (!["ADMIN", "MANAGER"].includes(reviewerRole)) {
    throw createError("You are not allowed to approve requests", 403);
  }

  return prisma.$transaction(async (tx) => {
    const request = await tx.overtimeRequest.findFirst({
      where: {
        id: requestId,
        employee: getEmployeeScopeFilter(scope),
      },
    });

    if (!request) {
      throw createError("Overtime request not found", 404);
    }

    if (request.status !== OVERTIME_STATUS.PENDING) {
      throw createError(
        `Only pending requests can be approved. Current status: ${request.status}`
      );
    }

    // A user cannot review their own request.
    if (request.submittedBy === reviewedBy) {
      throw createError("You cannot approve your own overtime request", 403);
    }

    // Managers can approve employee requests only.
    // Manager-submitted requests must be reviewed by Admin.
    if (
      reviewerRole === "MANAGER" &&
      request.requesterRole !== "EMPLOYEE"
    ) {
      throw createError(
        "Managers cannot approve manager-submitted requests",
        403
      );
    }

    const requestedHours = Number(request.requestedHours);

    if (
      !Number.isFinite(approvedHours) ||
      approvedHours <= 0 ||
      approvedHours > requestedHours
    ) {
      throw createError(
        `Approved hours must be greater than zero and cannot exceed ${requestedHours}`
      );
    }

    const newStatus =
      approvedHours === requestedHours
        ? OVERTIME_STATUS.APPROVED
        : OVERTIME_STATUS.PARTIALLY_APPROVED;

    // Update only if the request is still pending.
    const updateResult = await tx.overtimeRequest.updateMany({
      where: {
        id: requestId,
        status: OVERTIME_STATUS.PENDING,
      },
      data: {
        status: newStatus,
        approvedHours,
        reviewedBy,
        reviewedAt: new Date(),
        rejectionReason: null,
      },
    });

    if (updateResult.count !== 1) {
      throw createError(
        "This request has already been reviewed by someone else"
      );
    }

    return tx.overtimeRequest.findUnique({
      where: { id: requestId },
      include: requestInclude,
    });
  });
};

// --------------------------------------------------
// NEW: Reject a manual overtime request
// --------------------------------------------------

export const rejectOvertimeRequest = async ({
  requestId,
  reason,
  reviewedBy,
  reviewerRole,
  scope,
}) => {
  if (!["ADMIN", "MANAGER"].includes(reviewerRole)) {
    throw createError("You are not allowed to reject requests", 403);
  }

  return prisma.$transaction(async (tx) => {
    const request = await tx.overtimeRequest.findFirst({
      where: {
        id: requestId,
        employee: getEmployeeScopeFilter(scope),
      },
    });

    if (!request) {
      throw createError("Overtime request not found", 404);
    }

    if (request.status !== OVERTIME_STATUS.PENDING) {
      throw createError(
        `Only pending requests can be rejected. Current status: ${request.status}`
      );
    }

    if (request.submittedBy === reviewedBy) {
      throw createError("You cannot reject your own overtime request", 403);
    }

    if (
      reviewerRole === "MANAGER" &&
      request.requesterRole !== "EMPLOYEE"
    ) {
      throw createError(
        "Managers cannot reject manager-submitted requests",
        403
      );
    }

    const updateResult = await tx.overtimeRequest.updateMany({
      where: {
        id: requestId,
        status: OVERTIME_STATUS.PENDING,
      },
      data: {
        status: OVERTIME_STATUS.REJECTED,
        approvedHours: null,
        reviewedBy,
        reviewedAt: new Date(),
        rejectionReason: reason,
      },
    });

    if (updateResult.count !== 1) {
      throw createError(
        "This request has already been reviewed by someone else"
      );
    }

    return tx.overtimeRequest.findUnique({
      where: { id: requestId },
      include: requestInclude,
    });
  });
};
