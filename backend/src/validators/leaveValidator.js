const { z } = require('zod');

const createLeaveRequestSchema = z.object({
  leaveTypeId: z.string().optional(),
  leaveType: z.string().optional(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  daysCount: z.number().positive('Days count must be positive').optional(),
  isHalfDay: z.boolean().optional().default(false),
  halfDaySession: z.enum(['FIRST_HALF', 'SECOND_HALF']).optional().nullable(),
  reason: z.string().min(3, 'Reason must be at least 3 characters').max(1000),
  documentUrl: z.string().optional().nullable(),
  contactNumber: z.string().optional().nullable()
}).refine(data => !!(data.leaveTypeId || data.leaveType), {
  message: 'Leave type is required',
  path: ['leaveTypeId']
});

const reviewLeaveRequestSchema = z.object({
  status: z.preprocess(
    val => typeof val === 'string' ? val.toUpperCase() : val,
    z.enum(['APPROVED', 'REJECTED'])
  ),
  comments: z.string().optional().nullable(),
  reviewNote: z.string().optional().nullable(),
  approverNote: z.string().optional().nullable(),
  rejectionReason: z.string().optional().nullable()
});

const createLeaveTypeSchema = z.object({
  code: z.string().min(2).max(10).toUpperCase(),
  name: z.string().min(3).max(100),
  description: z.string().optional().nullable(),
  defaultDays: z.number().min(0).default(12),
  isPaid: z.boolean().default(true),
  carryForward: z.boolean().default(false),
  maxCarryForward: z.number().min(0).default(0),
  requiresProof: z.boolean().default(false)
});

function validateCreateLeaveRequest(req, res, next) {
  const result = createLeaveRequestSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`)
    });
  }
  req.validatedData = result.data;
  next();
}

function validateReviewLeaveRequest(req, res, next) {
  const result = reviewLeaveRequestSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`)
    });
  }
  req.validatedData = result.data;
  next();
}

function validateCreateLeaveType(req, res, next) {
  const result = createLeaveTypeSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`)
    });
  }
  req.validatedData = result.data;
  next();
}

module.exports = {
  createLeaveRequestSchema,
  reviewLeaveRequestSchema,
  createLeaveTypeSchema,
  validateCreateLeaveRequest,
  validateReviewLeaveRequest,
  validateCreateLeaveType
};
