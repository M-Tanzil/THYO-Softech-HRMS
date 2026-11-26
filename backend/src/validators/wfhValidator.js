const { z } = require('zod');

const createWfhSchema = z.object({
  id: z.string().optional(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  days: z.number().optional(),
  daysCount: z.number().optional(),
  reason: z.string().min(1, 'Reason is required').max(1000),
  remarks: z.string().optional().nullable(),
  contactNumber: z.string().optional().nullable(),
  equipmentConfirmed: z.boolean().optional(),
  vpnSecured: z.boolean().optional(),
  tasksPlanned: z.string().optional().nullable()
});

const reviewWfhSchema = z.object({
  status: z.preprocess(val => typeof val === 'string' ? val.toUpperCase() : val, z.enum(['APPROVED', 'REJECTED', 'PENDING'])),
  rejectionReason: z.string().optional().nullable(),
  approverNote: z.string().optional().nullable()
});

function validateCreateWfh(req, res, next) {
  const result = createWfhSchema.safeParse(req.body);
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

function validateReviewWfh(req, res, next) {
  const result = reviewWfhSchema.safeParse(req.body);
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
  createWfhSchema,
  reviewWfhSchema,
  validateCreateWfh,
  validateReviewWfh
};
