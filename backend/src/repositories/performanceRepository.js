const prisma = require('../config/prisma');
const { normalizeCalendarDate } = require('../utils/dateUtils');
const cache = require('../utils/cache');

const toDate = (v) => (v ? (v instanceof Date ? v : (normalizeCalendarDate(v)?.date || new Date(v))) : null);

class PerformanceRepository {
  invalidatePerformanceCaches() {
    cache.delPrefix('perf_');
  }

  // ==========================================================================
  // 1. PERFORMANCE CYCLES
  // ==========================================================================

  async createCycle(data) {
    this.invalidatePerformanceCaches();
    return await prisma.performanceCycle.create({
      data: {
        id: data.id || undefined,
        title: data.title || data.name,
        name: data.name || data.title,
        cycleType: data.cycleType || data.type || 'Quarterly',
        type: data.type || data.cycleType || 'Quarterly',
        startDate: toDate(data.startDate) || new Date(),
        endDate: toDate(data.endDate) || new Date(),
        reviewDeadline: toDate(data.reviewDeadline),
        status: data.status || 'Active',
        description: data.description || null,
        participantsCount: data.participantsCount || 0,
        completedReviewsCount: data.completedReviewsCount || 0,
        pendingReviewsCount: data.pendingReviewsCount || 0
      }
    });
  }

  async getCycles(status = null) {
    const cacheKey = `perf_cycles_${status || 'ALL'}`;
    return await cache.wrapSWR(cacheKey, 300000, 900000, async () => {
      const params = [];
      let whereSql = '';
      if (status && status !== 'All') {
        params.push(status);
        whereSql = `WHERE LOWER(pc.status) = LOWER($1)`;
      }
      const sql = `
        SELECT
          pc.id, pc.title, pc.name, pc."cycleType", pc.type,
          pc."startDate", pc."endDate", pc."reviewDeadline", pc.status, pc.description,
          pc."participantsCount", pc."completedReviewsCount", pc."pendingReviewsCount",
          pc."createdAt", pc."updatedAt",
          json_build_object(
            'reviews', (SELECT COUNT(*)::int FROM "PerformanceReview" pr WHERE pr."cycleId" = pc.id),
            'goals', (SELECT COUNT(*)::int FROM "PerformanceGoal" pg WHERE pg."cycleId" = pc.id)
          ) AS "_count"
        FROM "PerformanceCycle" pc
        ${whereSql}
        ORDER BY pc."startDate" DESC
      `;
      return await prisma.$queryRawUnsafe(sql, ...params);
    });
  }

  async getCycleById(id) {
    return await prisma.performanceCycle.findUnique({
      where: { id },
      include: {
        reviews: {
          include: {
            employee: { select: { employeeId: true, fullName: true, department: true, position: true } },
            reviewer: { select: { employeeId: true, fullName: true, designation: true } }
          }
        },
        goals: {
          include: {
            employee: { select: { employeeId: true, fullName: true, department: true } }
          }
        }
      }
    });
  }

  async updateCycle(id, data) {
    this.invalidatePerformanceCaches();
    const updateData = { ...data };
    if (data.startDate) updateData.startDate = toDate(data.startDate);
    if (data.endDate) updateData.endDate = toDate(data.endDate);
    if (data.reviewDeadline) updateData.reviewDeadline = toDate(data.reviewDeadline);

    return await prisma.performanceCycle.update({
      where: { id },
      data: updateData
    });
  }

  // ==========================================================================
  // 2. GOALS & PROGRESS
  // ==========================================================================

  async createGoal(data) {
    this.invalidatePerformanceCaches();
    const progress = data.progress !== undefined ? Number(data.progress) : (data.currentProgress !== undefined ? Number(data.currentProgress) : 0);
    return await prisma.performanceGoal.create({
      data: {
        id: data.id || undefined,
        cycleId: data.cycleId || null,
        employeeId: data.employeeId,
        employeeName: data.employeeName || null,
        department: data.department || null,
        title: data.title,
        description: data.description || null,
        category: data.category || 'OPERATIONAL',
        target: data.target || data.targetMetric || null,
        targetMetric: data.targetMetric || data.target || null,
        currentProgress: progress,
        progress: progress,
        weightage: data.weightage ? Number(data.weightage) : 20,
        status: data.status || 'On Track',
        dueDate: toDate(data.dueDate),
        factualProgressNote: data.factualProgressNote || null
      },
      include: {
        employee: { select: { employeeId: true, fullName: true, department: true } },
        cycle: true
      }
    });
  }

  async getGoals(filterParams = {}) {
    const { employeeId, cycleId, status, department } = filterParams;
    const cacheKey = `perf_goals_${JSON.stringify({ employeeId, cycleId, status, department })}`;

    return await cache.wrapSWR(cacheKey, 180000, 600000, async () => {
      const params = [];
      const conditions = [];

      if (employeeId) {
        params.push(employeeId);
        conditions.push(`pg."employeeId" = $${params.length}`);
      }
      if (cycleId) {
        params.push(cycleId);
        conditions.push(`pg."cycleId" = $${params.length}::uuid`);
      }
      if (status && status !== 'All') {
        params.push(status);
        conditions.push(`LOWER(pg.status) = LOWER($${params.length})`);
      }
      if (department && department !== 'All') {
        params.push(department);
        conditions.push(`LOWER(pg.department) = LOWER($${params.length})`);
      }

      const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const sql = `
        SELECT
          pg.id, pg."cycleId", pg."employeeId", pg."employeeName", pg.department,
          pg.title, pg.description, pg.category, pg.target, pg."targetMetric",
          pg."currentProgress", pg.progress, pg.weightage, pg.status,
          pg."dueDate", pg."factualProgressNote", pg."createdAt", pg."updatedAt",
          CASE WHEN e."employeeId" IS NOT NULL THEN
            json_build_object(
              'employeeId', e."employeeId",
              'fullName', e."fullName",
              'department', e.department,
              'position', e.position
            )
          ELSE NULL END AS employee,
          CASE WHEN pc.id IS NOT NULL THEN
            json_build_object('id', pc.id, 'title', pc.title, 'name', pc.name, 'status', pc.status)
          ELSE NULL END AS cycle
        FROM "PerformanceGoal" pg
        LEFT JOIN "Employee" e ON e."employeeId" = pg."employeeId"
        LEFT JOIN "PerformanceCycle" pc ON pc.id = pg."cycleId"
        ${whereSql}
        ORDER BY pg."createdAt" DESC
      `;

      return await prisma.$queryRawUnsafe(sql, ...params);
    });
  }

  async getGoalById(id) {
    return await prisma.performanceGoal.findUnique({
      where: { id },
      include: { employee: true, cycle: true }
    });
  }

  async updateGoal(id, data) {
    this.invalidatePerformanceCaches();
    const updateData = {};
    if (data.title !== undefined) updateData.title = String(data.title);
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.target !== undefined) updateData.target = data.target;
    if (data.targetMetric !== undefined) updateData.targetMetric = data.targetMetric;
    if (data.factualProgressNote !== undefined) updateData.factualProgressNote = data.factualProgressNote;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? toDate(data.dueDate) : null;
    if (data.cycleId !== undefined) {
      updateData.cycleId = typeof data.cycleId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.cycleId)
        ? data.cycleId
        : null;
    }
    if (data.weightage !== undefined && Number.isFinite(Number(data.weightage))) {
      updateData.weightage = Math.round(Number(data.weightage));
    }
    const rawProg = data.progress !== undefined ? data.progress : data.currentProgress;
    if (rawProg !== undefined && rawProg !== null && rawProg !== '' && Number.isFinite(Number(rawProg))) {
      const numProg = Math.round(Math.min(100, Math.max(0, Number(rawProg))));
      updateData.progress = numProg;
      updateData.currentProgress = numProg;
    }

    return await prisma.performanceGoal.update({
      where: { id },
      data: updateData,
      include: { employee: true, cycle: true }
    });
  }

  async deleteGoal(id) {
    this.invalidatePerformanceCaches();
    return await prisma.performanceGoal.delete({
      where: { id }
    });
  }

  // ==========================================================================
  // 3. REVIEWS
  // ==========================================================================

  async getReviews(filterParams = {}) {
    const { employeeId, reviewerId, cycleId, department, status } = filterParams;
    const cacheKey = `perf_reviews_${JSON.stringify({ employeeId, reviewerId, cycleId, department, status })}`;

    return await cache.wrapSWR(cacheKey, 180000, 600000, async () => {
      const params = [];
      const conditions = [];

      if (employeeId) {
        params.push(employeeId);
        conditions.push(`pr."employeeId" = $${params.length}`);
      }
      if (reviewerId) {
        params.push(reviewerId);
        conditions.push(`pr."reviewerId" = $${params.length}`);
      }
      if (cycleId) {
        params.push(cycleId);
        conditions.push(`pr."cycleId" = $${params.length}::uuid`);
      }
      if (status && status !== 'All') {
        params.push(status);
        conditions.push(`LOWER(pr.status) = LOWER($${params.length})`);
      }
      if (department && department !== 'All') {
        params.push(department);
        conditions.push(`LOWER(pr.department) = LOWER($${params.length})`);
      }

      const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const sql = `
        SELECT
          pr.id, pr."cycleId", pr."employeeId", pr."reviewerId", pr."employeeName",
          pr."employeeRole", pr.department, pr."cycleName", pr."selfRating",
          pr."managerRating", pr."finalScore", pr."overallRating", pr.competencies,
          pr."selfAssessment", pr."managerFeedback", pr."managerComments",
          pr.strengths, pr.improvements, pr.status, pr."completionDate",
          pr."submittedAt", pr."reviewedAt", pr."acknowledgedAt", pr."createdAt", pr."updatedAt",
          CASE WHEN e."employeeId" IS NOT NULL THEN
            json_build_object(
              'employeeId', e."employeeId",
              'fullName', e."fullName",
              'department', e.department,
              'position', e.position
            )
          ELSE NULL END AS employee,
          CASE WHEN rev."employeeId" IS NOT NULL THEN
            json_build_object(
              'employeeId', rev."employeeId",
              'fullName', rev."fullName",
              'designation', rev.designation
            )
          ELSE NULL END AS reviewer,
          CASE WHEN pc.id IS NOT NULL THEN
            json_build_object('id', pc.id, 'title', pc.title, 'name', pc.name, 'status', pc.status)
          ELSE NULL END AS cycle
        FROM "PerformanceReview" pr
        LEFT JOIN "Employee" e ON e."employeeId" = pr."employeeId"
        LEFT JOIN "Employee" rev ON rev."employeeId" = pr."reviewerId"
        LEFT JOIN "PerformanceCycle" pc ON pc.id = pr."cycleId"
        ${whereSql}
        ORDER BY pr."createdAt" DESC
      `;

      return await prisma.$queryRawUnsafe(sql, ...params);
    });
  }

  async getReviewById(id) {
    return await prisma.performanceReview.findUnique({
      where: { id },
      include: { employee: true, reviewer: true, cycle: true }
    });
  }

  async createReview(data) {
    this.invalidatePerformanceCaches();
    // Views do not support PostgreSQL ON CONFLICT / Prisma upsert directly
    const existing = await prisma.performanceReview.findFirst({
      where: { cycleId: data.cycleId, employeeId: data.employeeId }
    });
    if (existing) {
      const updatePayload = {};
      if (data.selfRating !== undefined) updatePayload.selfRating = data.selfRating;
      if (data.selfAssessment !== undefined) updatePayload.selfAssessment = data.selfAssessment;
      if (data.managerRating !== undefined) updatePayload.managerRating = data.managerRating;
      if (data.finalScore !== undefined) updatePayload.finalScore = data.finalScore;
      if (data.overallRating !== undefined) updatePayload.overallRating = data.overallRating;
      if (data.competencies !== undefined) updatePayload.competencies = data.competencies;
      if (data.managerFeedback !== undefined) updatePayload.managerFeedback = data.managerFeedback;
      if (data.managerComments !== undefined) updatePayload.managerComments = data.managerComments;
      if (data.strengths !== undefined) updatePayload.strengths = data.strengths;
      if (data.improvements !== undefined) updatePayload.improvements = data.improvements;
      if (data.status !== undefined) updatePayload.status = data.status;
      if (data.completionDate) updatePayload.completionDate = toDate(data.completionDate);
      if (data.submittedAt) updatePayload.submittedAt = toDate(data.submittedAt);
      if (data.reviewedAt) updatePayload.reviewedAt = toDate(data.reviewedAt);

      return await prisma.performanceReview.update({
        where: { id: existing.id },
        data: updatePayload,
        include: { employee: true, reviewer: true, cycle: true }
      });
    }

    return await prisma.performanceReview.create({
      data: {
        id: data.id || undefined,
        cycleId: data.cycleId,
        employeeId: data.employeeId,
        reviewerId: data.reviewerId || null,
        employeeName: data.employeeName || null,
        employeeRole: data.employeeRole || null,
        department: data.department || null,
        cycleName: data.cycleName || null,
        selfRating: data.selfRating || null,
        managerRating: data.managerRating || null,
        finalScore: data.finalScore || data.overallRating || null,
        overallRating: data.overallRating || data.finalScore || null,
        competencies: data.competencies || null,
        selfAssessment: data.selfAssessment || null,
        managerFeedback: data.managerFeedback || null,
        managerComments: data.managerComments || data.managerFeedback || null,
        strengths: data.strengths || null,
        improvements: data.improvements || null,
        status: data.status || 'Manager Review Pending',
        completionDate: toDate(data.completionDate),
        submittedAt: toDate(data.submittedAt)
      },
      include: { employee: true, reviewer: true, cycle: true }
    });
  }

  async updateReview(id, data) {
    this.invalidatePerformanceCaches();
    const updateData = { ...data };
    if (data.completionDate) updateData.completionDate = toDate(data.completionDate);
    if (data.submittedAt) updateData.submittedAt = toDate(data.submittedAt);
    if (data.reviewedAt) updateData.reviewedAt = toDate(data.reviewedAt);

    return await prisma.performanceReview.update({
      where: { id },
      data: updateData,
      include: { employee: true, reviewer: true, cycle: true }
    });
  }

  // ==========================================================================
  // 4. CONTINUOUS FEEDBACK & KUDOS
  // ==========================================================================

  async getFeedbacks() {
    return await cache.wrapSWR('perf_feedbacks', 180000, 600000, async () => {
      const sql = `
        SELECT
          pf.id, pf."toEmployeeId", pf."toEmployeeName", pf."toRole",
          pf."fromEmployeeId", pf."fromEmployeeName", pf."fromRole",
          pf."feedbackType", pf.badge, pf.message, pf.likes, pf.date,
          pf."createdAt", pf."updatedAt",
          CASE WHEN fe."employeeId" IS NOT NULL THEN
            json_build_object('employeeId', fe."employeeId", 'fullName', fe."fullName", 'department', fe.department)
          ELSE NULL END AS "fromEmployee",
          CASE WHEN te."employeeId" IS NOT NULL THEN
            json_build_object('employeeId', te."employeeId", 'fullName', te."fullName", 'department', te.department)
          ELSE NULL END AS "toEmployee"
        FROM "PerformanceFeedback" pf
        LEFT JOIN "Employee" fe ON fe."employeeId" = pf."fromEmployeeId"
        LEFT JOIN "Employee" te ON te."employeeId" = pf."toEmployeeId"
        ORDER BY pf."createdAt" DESC
      `;
      return await prisma.$queryRawUnsafe(sql);
    });
  }

  async createFeedback(data) {
    this.invalidatePerformanceCaches();
    return await prisma.performanceFeedback.create({
      data: {
        id: data.id || undefined,
        toEmployeeId: data.toEmployeeId,
        toEmployeeName: data.toEmployeeName || null,
        toRole: data.toRole || null,
        fromEmployeeId: data.fromEmployeeId,
        fromEmployeeName: data.fromEmployeeName || null,
        fromRole: data.fromRole || null,
        feedbackType: data.feedbackType || 'Praise / Kudos',
        badge: data.badge,
        message: data.message,
        likes: data.likes || 1,
        date: data.date || 'Just now'
      }
    });
  }

  async toggleFeedbackLike(id) {
    this.invalidatePerformanceCaches();
    return await prisma.performanceFeedback.update({
      where: { id },
      data: {
        likes: { increment: 1 }
      }
    });
  }
}

module.exports = new PerformanceRepository();
