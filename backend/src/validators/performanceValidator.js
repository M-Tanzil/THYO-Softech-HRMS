const { z } = require('zod');

const cycleSchema = z.object({
  title: z.string().min(1, 'Title is required').max(150),
  cycleType: z.enum(['QUARTERLY', 'HALF_YEARLY', 'ANNUAL']).optional().default('ANNUAL'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  status: z.enum(['UPCOMING', 'ACTIVE', 'IN_REVIEW', 'COMPLETED']).optional().default('ACTIVE'),
  description: z.string().optional().nullable()
});

const goalSchema = z.object({
  cycleId: z.string().optional().nullable(),
  employeeId: z.string().optional(), // Inferred from auth user if not supplied
  title: z.string().min(1, 'Goal title is required').max(200),
  description: z.string().optional().nullable(),
  category: z.enum(['TECHNICAL', 'LEADERSHIP', 'OPERATIONAL', 'INNOVATION', 'SOFT_SKILLS']).optional().default('OPERATIONAL'),
  targetMetric: z.string().optional().nullable(),
  currentProgress: z.number().min(0).max(100).optional().default(0),
  weightage: z.number().min(1).max(100).optional().default(20),
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'ACHIEVED', 'DEFERRED']).optional().default('IN_PROGRESS'),
  dueDate: z.string().optional().nullable()
});

const updateGoalProgressSchema = z.object({
  currentProgress: z.number().min(0).max(100),
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'ACHIEVED', 'DEFERRED']).optional()
});

const reviewSubmitSchema = z.object({
  cycleId: z.string().min(1, 'Cycle ID is required'),
  employeeId: z.string().min(1, 'Employee ID is required'),
  reviewerId: z.string().optional(),
  selfRating: z.number().min(1).max(5).optional().nullable(),
  selfAssessment: z.string().optional().nullable()
});

const managerReviewSchema = z.object({
  managerRating: z.number().min(1).max(5),
  finalScore: z.number().min(1).max(5).optional(),
  managerFeedback: z.string().min(5, 'Manager feedback is required'),
  strengths: z.string().optional().nullable(),
  improvements: z.string().optional().nullable()
});

function validateCycle(req, res, next) {
  const result = cycleSchema.safeParse(req.body);
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

function validateGoal(req, res, next) {
  const result = goalSchema.safeParse(req.body);
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

function validateGoalProgress(req, res, next) {
  const result = updateGoalProgressSchema.safeParse(req.body);
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

function validateReviewSubmit(req, res, next) {
  const result = reviewSubmitSchema.safeParse(req.body);
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

function validateManagerReview(req, res, next) {
  const result = managerReviewSchema.safeParse(req.body);
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
  validateCycle,
  validateGoal,
  validateGoalProgress,
  validateReviewSubmit,
  validateManagerReview
};
