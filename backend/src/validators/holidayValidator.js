const { z } = require('zod');

const holidaySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Holiday name is required').max(150),
  date: z.union([z.string().min(1, 'Date is required'), z.date()]),
  day: z.string().optional().nullable(),
  year: z.number().int().optional(),
  type: z.string().optional().default('NATIONAL'),
  campus: z.string().optional().default('All Campuses'),
  description: z.string().optional().nullable(),
  passed: z.boolean().optional().default(false),
  isNext: z.boolean().optional().default(false),
  isAllBranches: z.boolean().optional().default(true),
  branches: z.array(z.string()).optional().default([])
});

const updateHolidaySchema = holidaySchema.partial();

function validateHoliday(req, res, next) {
  const result = holidaySchema.safeParse(req.body);
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

function validateUpdateHoliday(req, res, next) {
  const result = updateHolidaySchema.safeParse(req.body);
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
  holidaySchema,
  updateHolidaySchema,
  validateHoliday,
  validateUpdateHoliday
};
