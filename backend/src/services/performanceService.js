const performanceRepository = require('../repositories/performanceRepository');
const notificationService = require('./notificationService');
const prisma = require('../config/prisma');
const { normalizeCalendarDate, formatCalendarDate } = require('../utils/dateUtils');

const isUuid = (val) => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

class PerformanceService {
  async createCycle(data) {
    if (!data.startDate || !data.endDate) {
      const error = new Error('Start date and end date are required.');
      error.statusCode = 400;
      throw error;
    }

    const normStart = normalizeCalendarDate(data.startDate);
    const normEnd = normalizeCalendarDate(data.endDate);
    if (!normStart || !normEnd) {
      const error = new Error('Invalid start date or end date format.');
      error.statusCode = 400;
      throw error;
    }

    if (normStart.date > normEnd.date) {
      const error = new Error('Start date cannot be after end date.');
      error.statusCode = 400;
      throw error;
    }

    const totalEmployees = await prisma.employee.count();

    const cycle = await performanceRepository.createCycle({
      id: isUuid(data.id) ? data.id : undefined,
      title: data.title || data.name,
      name: data.name || data.title,
      cycleType: data.cycleType || data.type || 'Quarterly',
      type: data.type || data.cycleType || 'Quarterly',
      startDate: normStart.date,
      endDate: normEnd.date,
      reviewDeadline: data.reviewDeadline ? (normalizeCalendarDate(data.reviewDeadline)?.date || null) : null,
      status: data.status || 'Active',
      description: data.description,
      participantsCount: data.participantsCount || totalEmployees,
      pendingReviewsCount: data.pendingReviewsCount || totalEmployees,
      completedReviewsCount: 0
    });

    setImmediate(() => {
      notificationService.notifyPerformance({
        recipientId: 'EMP009',
        title: 'New Performance Cycle Active',
        message: `${cycle.name || cycle.title} has been initiated. Review deadline: ${cycle.reviewDeadline ? formatCalendarDate(cycle.reviewDeadline, 'DD-MM-YYYY') : 'N/A'}.`,
        cycleId: cycle.id,
        type: 'performance'
      }).catch(() => {});
    });

    return cycle;
  }

  async getCycles(status = null) {
    return await performanceRepository.getCycles(status);
  }

  async getCycleById(id) {
    const cycle = await performanceRepository.getCycleById(id);
    if (!cycle) {
      const error = new Error(`Performance cycle ${id} not found.`);
      error.statusCode = 404;
      throw error;
    }
    return cycle;
  }

  async updateCycle(id, data) {
    const existing = await this.getCycleById(id);
    const startStr = data.startDate || existing.startDate;
    const endStr = data.endDate || existing.endDate;
    if (startStr && endStr) {
      const normStart = normalizeCalendarDate(startStr);
      const normEnd = normalizeCalendarDate(endStr);
      if (normStart && normEnd && normStart.date > normEnd.date) {
        const error = new Error('Start date cannot be after end date.');
        error.statusCode = 400;
        throw error;
      }
    }
    return await performanceRepository.updateCycle(id, data);
  }

  async createGoal(data, user) {
    const role = (user.role || 'EMPLOYEE').toUpperCase();
    let employeeId = data.employeeId || user.employeeId;
    if (role === 'EMPLOYEE') {
      employeeId = user.employeeId;
    }
    let employeeName = data.employeeName || user.fullName || user.name;
    let department = data.department || user.department;

    if (!employeeName || !department) {
      const emp = await prisma.employee.findUnique({ where: { employeeId } });
      if (emp) {
        employeeName = emp.fullName;
        if (!department) department = emp.department;
      }
    }

    const cycleId = isUuid(data.cycleId) ? data.cycleId : null;
    const progress = data.progress !== undefined ? Number(data.progress) : (data.currentProgress !== undefined ? Number(data.currentProgress) : 0);

    return await performanceRepository.createGoal({
      id: isUuid(data.id) ? data.id : undefined,
      employeeId,
      employeeName,
      department: department || 'Human Resources',
      cycleId,
      title: data.title,
      description: data.description,
      category: data.category || 'OPERATIONAL',
      target: data.target || data.targetMetric,
      targetMetric: data.targetMetric || data.target,
      weightage: data.weightage,
      progress,
      currentProgress: progress,
      status: data.status || 'On Track',
      dueDate: data.dueDate,
      factualProgressNote: data.factualProgressNote || 'Goal initiated for current appraisal cycle.'
    });
  }

  async getGoals(user, filters = {}) {
    const role = (user.role || 'EMPLOYEE').toUpperCase();
    const query = { ...filters };
    if (role === 'EMPLOYEE') {
      query.employeeId = user.employeeId;
    } else if (role === 'MANAGER') {
      if (user.department) query.department = user.department;
    }
    return await performanceRepository.getGoals(query);
  }

  async updateGoalProgress(id, progress, note = '') {
    if (!isUuid(id)) {
      const error = new Error('Invalid goal ID format.');
      error.statusCode = 400;
      throw error;
    }
    const parsed = Number(progress);
    if (progress === undefined || progress === null || progress === '' || Number.isNaN(parsed)) {
      const error = new Error('A valid numeric progress value (0-100) is required.');
      error.statusCode = 400;
      throw error;
    }
    const numProgress = Math.round(Math.min(100, Math.max(0, parsed)));
    const status = numProgress === 100 ? 'Completed' : numProgress < 40 ? 'At Risk' : 'On Track';

    const goal = await performanceRepository.updateGoal(id, {
      progress: numProgress,
      currentProgress: numProgress,
      status,
      ...(note ? { factualProgressNote: `Factual Update: ${note}` } : {})
    });

    setImmediate(() => {
      notificationService.notifyPerformance({
        recipientId: 'EMP009',
        title: 'Performance Goal Progress Updated',
        message: `${goal.employeeName || 'Employee'} updated goal progress on "${goal.title}" to ${numProgress}%.`,
        cycleId: goal.cycleId,
        type: 'performance'
      }).catch(() => {});
    });

    return goal;
  }

  async updateGoalStatus(id, status) {
    if (!isUuid(id)) {
      const error = new Error('Invalid goal ID format.');
      error.statusCode = 400;
      throw error;
    }
    return await performanceRepository.updateGoal(id, { status });
  }

  async updateGoal(id, updates) {
    if (!isUuid(id)) {
      const error = new Error('Invalid goal ID format.');
      error.statusCode = 400;
      throw error;
    }
    return await performanceRepository.updateGoal(id, updates);
  }

  async deleteGoal(id, user) {
    if (!isUuid(id)) {
      const error = new Error('Invalid goal ID format.');
      error.statusCode = 400;
      throw error;
    }
    return await performanceRepository.deleteGoal(id);
  }

  async getReviews(user, filters = {}) {
    const role = (user.role || 'EMPLOYEE').toUpperCase();
    const query = { ...filters };
    if (role === 'EMPLOYEE') {
      query.employeeId = user.employeeId;
    } else if (role === 'MANAGER') {
      if (user.department) query.department = user.department;
    }
    return await performanceRepository.getReviews(query);
  }

  async getReviewById(id, user) {
    const review = await performanceRepository.getReviewById(id);
    if (!review) {
      const error = new Error(`Appraisal review ${id} not found.`);
      error.statusCode = 404;
      throw error;
    }
    const role = (user.role || 'EMPLOYEE').toUpperCase();
    if (role === 'EMPLOYEE' && review.employeeId !== user.employeeId) {
      const error = new Error('Forbidden: You can only view your own appraisal reviews.');
      error.statusCode = 403;
      throw error;
    }
    if (role === 'MANAGER' && review.employeeId !== user.employeeId) {
      if (review.department && user.department && review.department.toLowerCase() !== user.department.toLowerCase()) {
        const error = new Error(`Forbidden: Managers can only view appraisals for their department (${user.department}).`);
        error.statusCode = 403;
        throw error;
      }
    }
    return review;
  }

  async submitSelfReview(data, user) {
    let cycleId = isUuid(data.cycleId) ? data.cycleId : null;
    if (!cycleId) {
      const cycles = await performanceRepository.getCycles();
      if (cycles[0]) cycleId = cycles[0].id;
    }

    return await performanceRepository.createReview({
      cycleId,
      employeeId: user.employeeId,
      employeeName: user.fullName || user.name,
      selfRating: Number(data.selfRating) || 4.0,
      selfAssessment: data.selfAssessment,
      status: 'Manager Review Pending',
      submittedAt: new Date()
    });
  }

  async submitManagerReview(id, data, user) {
    const review = await performanceRepository.getReviewById(id);
    if (!review) {
      const error = new Error(`Appraisal review ${id} not found.`);
      error.statusCode = 404;
      throw error;
    }
    if (user.role === 'MANAGER') {
      if (review.department && user.department && review.department.toLowerCase() !== user.department.toLowerCase()) {
        const error = new Error(`Forbidden: Managers can only evaluate employees in their department (${user.department}).`);
        error.statusCode = 403;
        throw error;
      }
    }
    return await performanceRepository.updateReview(id, {
      reviewerId: user.employeeId,
      managerRating: Number(data.managerRating) || 4.5,
      finalScore: Number(data.finalScore) || Number(data.overallRating) || Number(data.managerRating) || 4.5,
      overallRating: Number(data.overallRating) || Number(data.finalScore) || Number(data.managerRating) || 4.5,
      managerFeedback: data.managerFeedback || data.managerComments,
      managerComments: data.managerComments || data.managerFeedback,
      strengths: data.strengths,
      improvements: data.improvements,
      competencies: data.competencies,
      status: 'Completed',
      completionDate: new Date(),
      reviewedAt: new Date()
    });
  }

  async submitAppraisalReview(id, reviewData, user) {
    const existing = await prisma.performanceReview.findUnique({ where: { id } });
    if (existing) {
      return await performanceRepository.updateReview(id, {
        ...reviewData,
        status: 'Completed',
        completionDate: new Date()
      });
    }

    return await performanceRepository.createReview({
      id: isUuid(id) ? id : undefined,
      ...reviewData,
      status: 'Completed',
      completionDate: new Date()
    });
  }

  async acknowledgeReview(id, user) {
    return await performanceRepository.updateReview(id, {
      status: 'Completed',
      acknowledgedAt: new Date()
    });
  }

  async getFeedbacks() {
    return await performanceRepository.getFeedbacks();
  }

  async createFeedback(data, user) {
    let toEmployeeName = data.toEmployeeName;
    let toRole = data.toRole;

    if (!toEmployeeName && data.toEmployeeId) {
      const target = await prisma.employee.findUnique({ where: { employeeId: data.toEmployeeId } });
      if (target) {
        toEmployeeName = target.fullName;
        toRole = target.designation;
      }
    }

    const fromEmployeeId = user.employeeId || data.fromEmployeeId || 'EMP001';
    const fromEmployeeName = user.fullName || user.name || data.fromEmployeeName || 'Teammate';
    const fromRole = user.designation || user.role || data.fromRole || 'Lead';

    const feedback = await performanceRepository.createFeedback({
      id: isUuid(data.id) ? data.id : undefined,
      toEmployeeId: data.toEmployeeId,
      toEmployeeName: toEmployeeName || 'Teammate',
      toRole: toRole || 'Colleague',
      fromEmployeeId,
      fromEmployeeName,
      fromRole,
      feedbackType: data.feedbackType || 'Praise / Kudos',
      badge: data.badge || 'Code Ninja ⚡',
      message: data.message,
      likes: data.likes || 1,
      date: 'Just now'
    });

    setImmediate(() => {
      notificationService.notifyPerformance({
        recipientId: data.toEmployeeId,
        title: 'Continuous Feedback Received',
        message: `${fromEmployeeName} gave you ${feedback.feedbackType} (${feedback.badge}).`,
        cycleId: feedback.id,
        type: 'performance'
      }).catch(() => {});
    });

    return feedback;
  }

  async toggleFeedbackLike(id) {
    return await performanceRepository.toggleFeedbackLike(id);
  }
}

module.exports = new PerformanceService();
