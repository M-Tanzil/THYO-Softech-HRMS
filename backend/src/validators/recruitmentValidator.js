const { z } = require('zod');

const jobPostingSchema = z.object({
  requisitionId: z.string().optional(),
  title: z.string().min(1, 'Job title is required').max(150),
  department: z.string().min(1, 'Department is required'),
  branch: z.string().optional().default('Bangalore HQ'),
  position: z.string().min(1, 'Position is required'),
  jobType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP']).optional().default('FULL_TIME'),
  experience: z.string().min(1, 'Experience is required'),
  openings: z.number().int().min(1).optional().default(1),
  salaryRange: z.string().optional().nullable(),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  requirements: z.string().min(10, 'Requirements must be at least 10 characters'),
  status: z.enum(['DRAFT', 'OPEN', 'ON_HOLD', 'CLOSED']).optional().default('OPEN')
});

const applyJobSchema = z.object({
  jobPostingId: z.string().min(1, 'Job posting ID is required'),
  fullName: z.string().min(1, 'Candidate full name is required').max(100),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(6, 'Valid phone number is required'),
  currentRole: z.string().optional().nullable(),
  currentOrg: z.string().optional().nullable(),
  totalExpYears: z.number().min(0).optional().default(0),
  skills: z.string().optional().nullable(),
  resumeUrl: z.string().optional().nullable(),
  stageNotes: z.string().optional().nullable()
});

const updateStageSchema = z.object({
  status: z.enum(['APPLIED', 'SCREENING', 'SHORTLISTED', 'INTERVIEWING', 'OFFERED', 'HIRED', 'REJECTED', 'WITHDRAWN']),
  stageNotes: z.string().optional().nullable(),
  rating: z.number().min(1).max(5).optional().nullable()
});

const scheduleInterviewSchema = z.object({
  applicationId: z.string().min(1, 'Application ID is required'),
  interviewerId: z.string().min(1, 'Interviewer employee ID is required'),
  roundName: z.string().min(1, 'Round name is required'),
  interviewDate: z.string().min(1, 'Interview date is required'),
  durationMinutes: z.number().int().min(15).optional().default(45),
  mode: z.enum(['ONLINE', 'IN_PERSON', 'PHONE']).optional().default('ONLINE'),
  meetingLink: z.string().optional().nullable()
});

const submitFeedbackSchema = z.object({
  status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED']).optional().default('COMPLETED'),
  feedback: z.string().min(5, 'Interview feedback is required'),
  score: z.number().min(1).max(10),
  recommendation: z.enum(['STRONG_HIRE', 'HIRE', 'HOLD', 'NO_HIRE'])
});

const createOfferSchema = z.object({
  applicationId: z.string().min(1, 'Application ID is required'),
  offeredSalary: z.string().min(1, 'Offered salary is required'),
  designation: z.string().min(1, 'Designation is required'),
  department: z.string().min(1, 'Department is required'),
  branch: z.string().min(1, 'Branch is required'),
  joiningDate: z.string().min(1, 'Joining date is required'),
  status: z.enum(['EXTENDED', 'ACCEPTED', 'DECLINED', 'WITHDRAWN']).optional().default('EXTENDED'),
  notes: z.string().optional().nullable()
});

const hireCandidateSchema = z.object({
  applicationId: z.string().min(1, 'Application ID is required'),
  employeeId: z.string().optional(), // If not provided, will generate EMP###
  department: z.string().optional(),
  designation: z.string().optional(),
  position: z.string().optional(),
  joiningDate: z.string().optional(),
  phone: z.string().optional()
});

function validateJobPosting(req, res, next) {
  const result = jobPostingSchema.safeParse(req.body);
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

function validateApplyJob(req, res, next) {
  const result = applyJobSchema.safeParse(req.body);
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

function validateUpdateStage(req, res, next) {
  const result = updateStageSchema.safeParse(req.body);
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

function validateScheduleInterview(req, res, next) {
  const result = scheduleInterviewSchema.safeParse(req.body);
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

function validateSubmitFeedback(req, res, next) {
  const result = submitFeedbackSchema.safeParse(req.body);
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

function validateCreateOffer(req, res, next) {
  const result = createOfferSchema.safeParse(req.body);
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

function validateHireCandidate(req, res, next) {
  const result = hireCandidateSchema.safeParse(req.body);
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
  validateJobPosting,
  validateApplyJob,
  validateUpdateStage,
  validateScheduleInterview,
  validateSubmitFeedback,
  validateCreateOffer,
  validateHireCandidate
};
