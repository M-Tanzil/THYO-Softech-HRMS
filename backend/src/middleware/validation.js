const VALID_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const VALID_STATUSES = ['PENDING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED', 'OVERDUE'];
const VALID_ASSIGNMENT_TYPES = ['INDIVIDUAL', 'MULTIPLE', 'DEPARTMENT', 'POSITION', 'ALL', 'MANAGERS', 'MANAGER'];
const VALID_AUDIENCES = ['ALL', 'DEPARTMENT', 'POSITION', 'INDIVIDUAL'];

function validateCreateTask(req, res, next) {
  const { title, description, priority, deadline, assignmentType, employeeId, employeeIds, targetDepartment, targetPosition } = req.body;
  const errors = [];

  if (!title || typeof title !== 'string' || title.trim().length < 3) {
    errors.push('Task title is mandatory and must be at least 3 characters long.');
  }

  if (!description || typeof description !== 'string' || description.trim().length < 5) {
    errors.push('Task description is mandatory and must be at least 5 characters long.');
  }

  if (!priority || !VALID_PRIORITIES.includes(priority.toUpperCase())) {
    errors.push(`Priority must be one of: ${VALID_PRIORITIES.join(', ')}.`);
  }

  if (!deadline || isNaN(Date.parse(deadline))) {
    errors.push('A valid deadline date is required.');
  }

  if (!assignmentType || !VALID_ASSIGNMENT_TYPES.includes(assignmentType.toUpperCase())) {
    errors.push(`Assignment type must be one of: ${VALID_ASSIGNMENT_TYPES.join(', ')}.`);
  } else {
    const type = assignmentType.toUpperCase();
    if (type === 'INDIVIDUAL' && (!employeeId || typeof employeeId !== 'string')) {
      errors.push('Please select an individual employee for assignment.');
    }
    if (type === 'MULTIPLE' && (!Array.isArray(employeeIds) || employeeIds.length === 0)) {
      errors.push('Please select at least one employee for multiple assignment.');
    }
    if (type === 'DEPARTMENT' && (!targetDepartment || typeof targetDepartment !== 'string')) {
      errors.push('Please select a target department.');
    }
    if (type === 'POSITION' && (!targetPosition || typeof targetPosition !== 'string')) {
      errors.push('Please select a target position/designation.');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed.',
      errors
    });
  }

  next();
}

function validateUpdateTask(req, res, next) {
  const { title, description, priority, deadline } = req.body;
  const errors = [];

  if (title !== undefined && (typeof title !== 'string' || title.trim().length < 3)) {
    errors.push('Task title must be at least 3 characters long.');
  }

  if (description !== undefined && (typeof description !== 'string' || description.trim().length < 5)) {
    errors.push('Task description must be at least 5 characters long.');
  }

  if (priority !== undefined && !VALID_PRIORITIES.includes(priority.toUpperCase())) {
    errors.push(`Priority must be one of: ${VALID_PRIORITIES.join(', ')}.`);
  }

  if (deadline !== undefined && isNaN(Date.parse(deadline))) {
    errors.push('Deadline must be a valid date.');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed.',
      errors
    });
  }

  next();
}

function validateStatusUpdate(req, res, next) {
  const { status, progress } = req.body;
  const errors = [];

  if (!status || !VALID_STATUSES.includes(status.toUpperCase())) {
    errors.push(`Status must be one of: ${VALID_STATUSES.join(', ')}.`);
  }

  if (progress !== undefined) {
    const num = Number(progress);
    if (isNaN(num) || num < 0 || num > 100) {
      errors.push('Progress must be a numeric value between 0 and 100.');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed.',
      errors
    });
  }

  next();
}

function validateComment(req, res, next) {
  const { comment } = req.body;

  if (!comment || typeof comment !== 'string' || comment.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Comment content cannot be empty.'
    });
  }

  next();
}

function validateAnnouncement(req, res, next) {
  const { title, message, audience } = req.body;
  const errors = [];

  if (!title || typeof title !== 'string' || title.trim().length < 3) {
    errors.push('Announcement title must be at least 3 characters long.');
  }

  if (!message || typeof message !== 'string' || message.trim().length < 5) {
    errors.push('Announcement message must be at least 5 characters long.');
  }

  if (audience && !VALID_AUDIENCES.includes(audience.toUpperCase())) {
    errors.push(`Audience must be one of: ${VALID_AUDIENCES.join(', ')}.`);
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed.',
      errors
    });
  }

  next();
}

module.exports = {
  validateCreateTask,
  validateUpdateTask,
  validateStatusUpdate,
  validateComment,
  validateAnnouncement
};
