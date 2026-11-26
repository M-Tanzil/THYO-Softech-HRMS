import { z } from "zod";

export const overtimeQuerySchema = z.object({
  employeeId: z.string().uuid().optional(),
  attendanceId: z.string().uuid().optional(),
  status: z.enum([
    "PENDING",
    "APPROVED",
    "PARTIALLY_APPROVED",
    "REJECTED",
  ]).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}).refine(
  (data) => !data.startDate || !data.endDate || data.startDate <= data.endDate,
  {
    message: "Start date must be before or equal to end date",
    path: ["endDate"],
  }
);

// Existing attendance-generated overtime approval
export const overtimeApprovalSchema = z.object({
  remarks: z.string().trim().max(500).optional(),
});

// New employee/manager overtime request
export const overtimeRequestSchema = z.object({
  overtimeDate: z.coerce.date(),
  requestedHours: z.coerce.number().positive().max(24),
  reason: z.string().trim().min(3).max(500),
});

// Approval of a new overtime request
export const overtimeRequestApprovalSchema = z.object({
  approvedHours: z.coerce.number().positive().max(24),
  remarks: z.string().trim().max(500).optional(),
});

export const overtimeRejectionSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

export const employeeOvertimeAuthorizationSchema = z.object({
  overtimeEnabled: z.boolean({
    required_error: "overtimeEnabled is required",
  }),
});