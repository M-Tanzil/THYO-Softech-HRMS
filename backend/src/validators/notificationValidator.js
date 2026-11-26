const { z } = require('zod');

const createNotificationSchema = z.object({
  recipientId: z.string().min(1, 'Recipient ID is required'),
  title: z.string().min(1, 'Title is required').max(200),
  message: z.string().min(1, 'Message is required'),
  type: z.enum(['INFO', 'SUCCESS', 'WARNING', 'ACTION_REQUIRED']).optional().default('INFO'),
  category: z.enum([
    'RECRUITMENT',
    'PERFORMANCE',
    'WFH',
    'ANNOUNCEMENT',
    'TASK',
    'LEAVE',
    'PAYROLL',
    'EXPENSE',
    'SYSTEM'
  ]).optional().default('SYSTEM'),
  entityType: z.string().optional().nullable(),
  entityId: z.string().optional().nullable(),
  link: z.string().optional().nullable()
});

const updatePreferencesSchema = z.object({
  emailAlerts: z.boolean().optional(),
  wfhAlerts: z.boolean().optional(),
  recruitmentAlerts: z.boolean().optional(),
  performanceAlerts: z.boolean().optional(),
  taskAlerts: z.boolean().optional(),
  announcementAlerts: z.boolean().optional(),
  payrollAlerts: z.boolean().optional(),
  leaveAlerts: z.boolean().optional()
});

function validateCreateNotification(req, res, next) {
  const result = createNotificationSchema.safeParse(req.body);
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

function validatePreferences(req, res, next) {
  const result = updatePreferencesSchema.safeParse(req.body);
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
  createNotificationSchema,
  updatePreferencesSchema,
  validateCreateNotification,
  validatePreferences
};
