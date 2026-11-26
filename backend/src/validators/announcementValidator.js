const { z } = require('zod');

const targetSchema = z.object({
  targetType: z.string(),
  targetValue: z.string().optional().nullable()
});

const createAnnouncementSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Title is required').max(250),
  message: z.string().optional().nullable(),
  content: z.string().optional().nullable(),
  date: z.string().optional().nullable(),
  author: z.string().optional().nullable(),
  authorRole: z.string().optional().nullable(),
  authorAvatar: z.string().optional().nullable(),
  priority: z.string().optional().default('Normal'),
  category: z.string().optional().default('Company Event'),
  targetDepartment: z.string().optional().default('All Organization'),
  pinned: z.boolean().optional().default(false),
  acknowledgedBy: z.array(z.string()).optional().default([]),
  publishDate: z.string().optional().nullable(),
  expiryDate: z.string().optional().nullable(),
  audience: z.string().optional().default('ALL'),
  targetValue: z.string().optional().nullable(),
  targets: z.array(targetSchema).optional().default([{ targetType: 'ALL', targetValue: null }])
});

function validateCreateAnnouncement(req, res, next) {
  // Ensure message or content is present
  if (!req.body.message && !req.body.content) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: ['message: Content or message is required']
    });
  }

  const result = createAnnouncementSchema.safeParse(req.body);
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
  createAnnouncementSchema,
  validateCreateAnnouncement
};
