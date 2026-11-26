const prisma = require('../config/prisma');
const { normalizeCalendarDate } = require('../utils/dateUtils');
const cache = require('../utils/cache');

class RecruitmentRepository {
  invalidateRecruitmentCaches() {
    cache.delPrefix('recruitment_');
  }

  // ==========================================================================
  // 1. JOB REQUISITIONS
  // ==========================================================================

  async getRequisitions(filterParams = {}) {
    const { department, status } = filterParams;
    const cacheKey = `recruitment_reqs_${JSON.stringify({ department, status })}`;
    return await cache.wrapSWR(cacheKey, 180000, 600000, async () => {
      const params = [];
      const conditions = [];
      if (department && department !== 'All') {
        params.push(department);
        conditions.push(`LOWER(jr.department) = LOWER($${params.length})`);
      }
      if (status && status !== 'All') {
        params.push(status);
        conditions.push(`LOWER(jr.status) = LOWER($${params.length})`);
      }
      const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const sql = `
        SELECT
          jr.id, jr.title, jr.department, jr.openings, jr.priority, jr."targetDate",
          jr."budgetSalaryRange", jr.reason, jr."requestedBy", jr.status, jr."approvedBy",
          jr."rejectionReason", jr."convertedPostingId", jr."createdDate", jr."createdAt", jr."updatedAt",
          CASE WHEN jp.id IS NOT NULL THEN
            json_build_object('id', jp.id, 'title', jp.title, 'status', jp.status, 'branch', jp.branch)
          ELSE NULL END AS "jobPosting"
        FROM "JobRequisition" jr
        LEFT JOIN "JobPosting" jp ON jp."requisitionId" = jr.id::text
        ${whereSql}
        ORDER BY jr."createdDate" DESC
      `;
      return await prisma.$queryRawUnsafe(sql, ...params);
    });
  }

  async getRequisitionById(id) {
    return await prisma.jobRequisition.findUnique({
      where: { id },
      include: { jobPosting: true }
    });
  }

  async createRequisition(data) {
    this.invalidateRecruitmentCaches();
    return await prisma.jobRequisition.create({
      data: {
        id: data.id,
        title: data.title,
        department: data.department,
        openings: Number(data.openings) || 1,
        priority: data.priority || 'Medium',
        targetDate: data.targetDate ? normalizeCalendarDate(data.targetDate).date : null,
        budgetSalaryRange: data.budgetSalaryRange || null,
        reason: data.reason || null,
        requestedBy: data.requestedBy || 'Admin',
        status: data.status || 'Pending Approval',
        approvedBy: data.approvedBy || null,
        rejectionReason: data.rejectionReason || null,
        convertedPostingId: data.convertedPostingId || null,
        createdDate: data.createdDate ? new Date(data.createdDate) : new Date()
      }
    });
  }

  async updateRequisition(id, data) {
    this.invalidateRecruitmentCaches();
    const updateData = { ...data };
    if (data.targetDate) updateData.targetDate = normalizeCalendarDate(data.targetDate).date;
    if (data.openings !== undefined) updateData.openings = Number(data.openings);

    return await prisma.jobRequisition.update({
      where: { id },
      data: updateData,
      include: { jobPosting: true }
    });
  }

  // ==========================================================================
  // 2. JOB POSTINGS
  // ==========================================================================

  async createJobPosting(data) {
    this.invalidateRecruitmentCaches();
    const postData = {
      id: data.id || undefined,
      title: data.title,
      department: data.department,
      branch: data.branch || data.location || 'Bangalore HQ',
      location: data.location || data.branch || 'Bangalore HQ',
      position: data.position || data.title,
      jobType: data.jobType || 'FULL_TIME',
      type: data.type || 'Full-Time',
      experience: data.experience || '1-3 years',
      openings: Number(data.openings) || 1,
      salaryRange: data.salaryRange || null,
      description: data.description || data.jobDescription || 'Detailed job posting description and responsibilities.',
      requirements: Array.isArray(data.requirements) ? JSON.stringify(data.requirements) : (data.requirements || '["Strong domain expertise", "High sense of ownership"]'),
      status: data.status || 'Active',
      isPublished: data.isPublished !== undefined ? Boolean(data.isPublished) : true,
      postedDate: data.postedDate ? new Date(data.postedDate) : new Date()
    };

    if (data.postedById) {
      postData.postedBy = { connect: { employeeId: data.postedById } };
    }
    if (data.requisitionId) {
      postData.requisition = { connect: { id: data.requisitionId } };
    }

    return await prisma.jobPosting.create({
      data: postData,
      include: {
        postedBy: { select: { employeeId: true, fullName: true, department: true } },
        requisition: true,
        _count: { select: { applications: true } }
      }
    });
  }

  async getJobPostings(filterParams = {}) {
    const { department, branch, status } = filterParams;
    const cacheKey = `recruitment_jobs_${JSON.stringify({ department, branch, status })}`;
    return await cache.wrapSWR(cacheKey, 180000, 600000, async () => {
      const params = [];
      const conditions = [];
      if (department && department !== 'All') {
        params.push(department);
        conditions.push(`LOWER(jp.department) = LOWER($${params.length})`);
      }
      if (branch && branch !== 'All') {
        params.push(`%${branch}%`);
        conditions.push(`jp.branch ILIKE $${params.length}`);
      }
      if (status && status !== 'All') {
        params.push(status);
        conditions.push(`LOWER(jp.status) = LOWER($${params.length})`);
      }
      const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const sql = `
        SELECT
          jp.id, jp."requisitionId", jp.title, jp.department, jp.branch, jp.position,
          jp."jobType", jp.type, jp.experience, jp.location, jp.openings, jp."salaryRange",
          jp.description, jp.requirements, jp.status, jp."isPublished", jp."postedDate",
          jp."postedById", jp."createdAt", jp."updatedAt",
          CASE WHEN e."employeeId" IS NOT NULL THEN
            json_build_object('employeeId', e."employeeId", 'fullName', e."fullName", 'department', e.department)
          ELSE NULL END AS "postedBy",
          CASE WHEN jr.id IS NOT NULL THEN
            json_build_object('id', jr.id, 'title', jr.title, 'status', jr.status)
          ELSE NULL END AS requisition,
          json_build_object(
            'applications', (SELECT COUNT(*)::int FROM "JobApplication" ja WHERE ja."jobPostingId" = jp.id)
          ) AS "_count"
        FROM "JobPosting" jp
        LEFT JOIN "Employee" e ON e."employeeId" = jp."postedById"
        LEFT JOIN "JobRequisition" jr ON jr.id::text = jp."requisitionId"
        ${whereSql}
        ORDER BY jp."postedDate" DESC
      `;
      return await prisma.$queryRawUnsafe(sql, ...params);
    });
  }

  async getJobPostingById(id) {
    return await prisma.jobPosting.findUnique({
      where: { id },
      include: {
        postedBy: { select: { employeeId: true, fullName: true, department: true } },
        requisition: true,
        applications: {
          include: {
            candidate: true,
            interviews: true,
            offer: true
          },
          orderBy: { appliedDate: 'desc' }
        }
      }
    });
  }

  async updateJobPosting(id, data) {
    this.invalidateRecruitmentCaches();
    const updateData = { ...data };
    if (data.openings !== undefined) updateData.openings = Number(data.openings);
    if (data.isPublished !== undefined) updateData.isPublished = Boolean(data.isPublished);

    return await prisma.jobPosting.update({
      where: { id },
      data: updateData,
      include: {
        postedBy: { select: { employeeId: true, fullName: true, department: true } },
        requisition: true
      }
    });
  }

  // ==========================================================================
  // 3. CANDIDATES
  // ==========================================================================

  async getCandidates({ department, stage, search } = {}) {
    const cacheKey = `recruitment_candidates_${JSON.stringify({ department, stage, search })}`;
    return await cache.wrapSWR(cacheKey, 180000, 600000, async () => {
      const params = [];
      const conditions = [];
      if (department && department !== 'All') {
        params.push(department);
        conditions.push(`LOWER(c.department) = LOWER($${params.length})`);
      }
      if (stage && stage !== 'All') {
        params.push(stage);
        conditions.push(`LOWER(c.stage) = LOWER($${params.length})`);
      }
      if (search) {
        params.push(`%${search}%`);
        const p = `$${params.length}`;
        conditions.push(`(c."fullName" ILIKE ${p} OR c.email ILIKE ${p} OR c.skills ILIKE ${p} OR c."jobTitle" ILIKE ${p})`);
      }
      const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const sql = `
        SELECT
          c.id, c."fullName", c.email, c.phone, c.location, c.linkedin, c.portfolio,
          c."jobId", c."jobTitle", c.department, c."currentRole", c."currentOrg", c."currentCompany",
          c."currentSalary", c."expectedSalary", c."noticePeriod", c."totalExpYears", c.skills,
          c.stage, c.rating, c."appliedDate", c."resumeUrl", c.summary, c."createdAt", c."updatedAt",
          COALESCE(
            (SELECT json_agg(
              json_build_object(
                'id', ja.id,
                'jobPostingId', ja."jobPostingId",
                'status', ja.status,
                'appliedDate', ja."appliedDate",
                'jobPosting', CASE WHEN jp.id IS NOT NULL THEN
                  json_build_object('id', jp.id, 'title', jp.title, 'department', jp.department, 'branch', jp.branch, 'requisitionId', jp."requisitionId")
                ELSE NULL END,
                'offer', CASE WHEN jo.id IS NOT NULL THEN
                  json_build_object('id', jo.id, 'status', jo.status, 'designation', jo.designation)
                ELSE NULL END
              )
            )
            FROM "JobApplication" ja
            LEFT JOIN "JobPosting" jp ON jp.id = ja."jobPostingId"
            LEFT JOIN "JobOffer" jo ON jo."applicationId" = ja.id
            WHERE ja."candidateId" = c.id),
            '[]'::json
          ) AS applications
        FROM "Candidate" c
        ${whereSql}
        ORDER BY c."appliedDate" DESC
      `;
      return await prisma.$queryRawUnsafe(sql, ...params);
    });
  }

  async getCandidateById(id) {
    return await prisma.candidate.findUnique({
      where: { id },
      include: {
        applications: {
          include: {
            jobPosting: true,
            interviews: true,
            offer: true
          }
        },
        screeningScorecards: true
      }
    });
  }

  async createCandidate(data) {
    this.invalidateRecruitmentCaches();
    return await prisma.candidate.create({
      data: {
        id: data.id || undefined,
        fullName: data.fullName || data.name,
        email: data.email,
        phone: data.phone,
        location: data.location || null,
        linkedin: data.linkedin || null,
        portfolio: data.portfolio || null,
        jobId: data.jobId || null,
        jobTitle: data.jobTitle || null,
        department: data.department || null,
        currentRole: data.currentRole || null,
        currentOrg: data.currentOrg || data.currentCompany || null,
        currentCompany: data.currentCompany || data.currentOrg || null,
        currentSalary: data.currentSalary || null,
        expectedSalary: data.expectedSalary || null,
        noticePeriod: data.noticePeriod || null,
        totalExpYears: data.totalExpYears !== undefined ? Number(data.totalExpYears) : 0,
        skills: Array.isArray(data.skills) ? data.skills.join(', ') : (data.skills || null),
        stage: data.stage || 'Applied',
        rating: data.rating !== undefined ? Number(data.rating) : 4.5,
        appliedDate: data.appliedDate ? new Date(data.appliedDate) : new Date(),
        resumeUrl: data.resumeUrl || null,
        summary: data.summary || null
      }
    });
  }

  async updateCandidate(id, data) {
    this.invalidateRecruitmentCaches();
    const updateData = { ...data };
    if (data.name && !data.fullName) updateData.fullName = data.name;
    if (data.skills && Array.isArray(data.skills)) updateData.skills = data.skills.join(', ');
    if (data.rating !== undefined) updateData.rating = Number(data.rating);

    return await prisma.candidate.update({
      where: { id },
      data: updateData
    });
  }

  // ==========================================================================
  // 4. APPLICATIONS
  // ==========================================================================

  async createApplication(data) {
    this.invalidateRecruitmentCaches();
    return await prisma.jobApplication.create({
      data: {
        id: data.id || undefined,
        jobPostingId: data.jobPostingId,
        candidateId: data.candidateId,
        status: data.status || 'Applied',
        screeningStatus: data.screeningStatus || 'Pending',
        interviewStatus: data.interviewStatus || 'Not Scheduled',
        offerStatus: data.offerStatus || 'Not Initiated',
        stageNotes: data.stageNotes || null,
        rating: data.rating || null,
        appliedDate: data.appliedDate ? new Date(data.appliedDate) : new Date()
      },
      include: {
        jobPosting: true,
        candidate: true
      }
    });
  }

  async getApplications(filterParams = {}) {
    const { jobPostingId, status, search, limit = 100 } = filterParams;
    const cacheKey = `recruitment_apps_${JSON.stringify({ jobPostingId, status, search, limit })}`;

    return await cache.wrapSWR(cacheKey, 180000, 600000, async () => {
      const params = [];
      const conditions = [];

      if (jobPostingId) {
        params.push(jobPostingId);
        conditions.push(`ja."jobPostingId" = $${params.length}::uuid`);
      }
      if (status && status !== 'All') {
        params.push(status);
        conditions.push(`LOWER(ja.status) = LOWER($${params.length})`);
      }
      if (search) {
        params.push(`%${search}%`);
        const p = `$${params.length}`;
        conditions.push(`(c."fullName" ILIKE ${p} OR c.email ILIKE ${p} OR c.skills ILIKE ${p})`);
      }

      const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const takeVal = Math.max(1, Math.min(200, Number(limit) || 100));
      params.push(takeVal);

      const sql = `
        SELECT
          ja.id, ja."jobPostingId", ja."candidateId", ja.status, ja."screeningStatus",
          ja."interviewStatus", ja."offerStatus", ja."stageNotes", ja.rating, ja."appliedDate",
          ja."hiredAt", ja."hiredEmployeeId", ja."createdAt", ja."updatedAt",
          CASE WHEN jp.id IS NOT NULL THEN
            json_build_object('id', jp.id, 'title', jp.title, 'department', jp.department, 'branch', jp.branch, 'position', jp.position, 'requisitionId', jp."requisitionId")
          ELSE NULL END AS "jobPosting",
          CASE WHEN c.id IS NOT NULL THEN
            row_to_json(c.*)
          ELSE NULL END AS candidate,
          COALESCE(
            (SELECT json_agg(
              json_build_object(
                'id', i.id,
                'applicationId', i."applicationId",
                'interviewerId', i."interviewerId",
                'roundName', i."roundName",
                'interviewDate', i."interviewDate",
                'durationMinutes', i."durationMinutes",
                'mode', i.mode,
                'interviewType', i."interviewType",
                'meetingLink', i."meetingLink",
                'status', i.status,
                'feedback', i.feedback,
                'score', i.score,
                'rating', i.rating,
                'recommendation', i.recommendation,
                'interviewerEmp', CASE WHEN ie."employeeId" IS NOT NULL THEN
                  json_build_object('employeeId', ie."employeeId", 'fullName', ie."fullName")
                ELSE NULL END
              ) ORDER BY i."interviewDate" ASC
            )
            FROM "Interview" i
            LEFT JOIN "Employee" ie ON ie."employeeId" = i."interviewerId"
            WHERE i."applicationId" = ja.id),
            '[]'::json
          ) AS interviews,
          CASE WHEN jo.id IS NOT NULL THEN
            row_to_json(jo.*)
          ELSE NULL END AS offer,
          CASE WHEN he."employeeId" IS NOT NULL THEN
            json_build_object('employeeId', he."employeeId", 'fullName', he."fullName", 'email', he.email)
          ELSE NULL END AS "hiredEmployee"
        FROM "JobApplication" ja
        LEFT JOIN "JobPosting" jp ON jp.id = ja."jobPostingId"
        LEFT JOIN "Candidate" c ON c.id = ja."candidateId"
        LEFT JOIN "JobOffer" jo ON jo."applicationId" = ja.id
        LEFT JOIN "Employee" he ON he."employeeId" = ja."hiredEmployeeId"
        ${whereSql}
        ORDER BY ja."appliedDate" DESC
        LIMIT $${params.length}
      `;
      return await prisma.$queryRawUnsafe(sql, ...params);
    });
  }

  async getApplicationById(id) {
    return await prisma.jobApplication.findUnique({
      where: { id },
      include: {
        jobPosting: true,
        candidate: true,
        interviews: {
          include: {
            interviewerEmp: { select: { employeeId: true, fullName: true, designation: true } }
          },
          orderBy: { interviewDate: 'asc' }
        },
        offer: true,
        screeningScorecards: true,
        hiredEmployee: { select: { employeeId: true, fullName: true, email: true, department: true } }
      }
    });
  }

  async updateApplication(id, data) {
    this.invalidateRecruitmentCaches();
    return await prisma.jobApplication.update({
      where: { id },
      data,
      include: {
        candidate: true,
        jobPosting: true
      }
    });
  }

  // ==========================================================================
  // 5. SCREENING SCORECARDS
  // ==========================================================================

  async getScreeningScorecards({ candidateId, applicationId } = {}) {
    const where = {};
    if (candidateId) where.candidateId = candidateId;
    if (applicationId) where.applicationId = applicationId;

    return await prisma.screeningScorecard.findMany({
      where,
      include: { candidate: true, application: true },
      orderBy: { screenDate: 'desc' }
    });
  }

  async createScreeningScorecard(data) {
    return await prisma.screeningScorecard.create({
      data: {
        id: data.id || undefined,
        applicationId: data.applicationId || null,
        candidateId: data.candidateId,
        reviewer: data.reviewer,
        screenDate: data.screenDate ? new Date(data.screenDate) : new Date(),
        techFit: Number(data.techFit) || 3,
        communication: Number(data.communication) || 3,
        cultureFit: Number(data.cultureFit) || 3,
        salaryFit: Number(data.salaryFit) || 3,
        experienceFit: Number(data.experienceFit) || 3,
        recommendation: data.recommendation,
        notes: data.notes || null
      }
    });
  }

  // ==========================================================================
  // 6. INTERVIEWS
  // ==========================================================================

  async getInterviews({ candidateId, status } = {}) {
    const cacheKey = `recruitment_interviews_${JSON.stringify({ candidateId, status })}`;
    return await cache.wrapSWR(cacheKey, 180000, 600000, async () => {
      const params = [];
      const conditions = [];
      if (candidateId) {
        params.push(candidateId);
        conditions.push(`i."candidateId" = $${params.length}`);
      }
      if (status && status !== 'All') {
        params.push(status);
        conditions.push(`LOWER(i.status) = LOWER($${params.length})`);
      }
      const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const sql = `
        SELECT
          i.id, i."applicationId", i."interviewerId", i."candidateId", i."candidateName",
          i."candidateEmail", i."jobTitle", i."roundName", i."interviewDate", i.time,
          i."durationMinutes", i.duration, i.mode, i."interviewType", i."meetingLink",
          i.status, i.feedback, i.score, i.rating, i.recommendation, i.interviewer,
          i."interviewerRole", i."createdAt", i."updatedAt",
          CASE WHEN ie."employeeId" IS NOT NULL THEN
            json_build_object('employeeId', ie."employeeId", 'fullName', ie."fullName", 'email', ie.email, 'designation', ie.designation)
          ELSE NULL END AS "interviewerEmp"
        FROM "Interview" i
        LEFT JOIN "Employee" ie ON ie."employeeId" = i."interviewerId"
        ${whereSql}
        ORDER BY i."interviewDate" ASC
      `;
      return await prisma.$queryRawUnsafe(sql, ...params);
    });
  }

  async createInterview(data) {
    this.invalidateRecruitmentCaches();
    return await prisma.interview.create({
      data: {
        id: data.id || undefined,
        applicationId: data.applicationId,
        candidateId: data.candidateId || null,
        candidateName: data.candidateName || null,
        candidateEmail: data.candidateEmail || null,
        jobTitle: data.jobTitle || null,
        roundName: data.roundName || 'Technical Interview',
        interviewDate: normalizeCalendarDate(data.interviewDate).date,
        time: data.time || null,
        durationMinutes: Number(data.durationMinutes) || 60,
        duration: data.duration || `${data.durationMinutes || 60} mins`,
        mode: data.mode || 'ONLINE',
        interviewType: data.interviewType || 'Video Call (Microsoft Teams)',
        meetingLink: data.meetingLink || null,
        status: data.status || 'Scheduled',
        interviewer: data.interviewer || null,
        interviewerRole: data.interviewerRole || null,
        interviewerId: data.interviewerId || null
      },
      include: {
        application: { include: { candidate: true, jobPosting: true } },
        interviewerEmp: true
      }
    });
  }

  async updateInterview(id, data) {
    this.invalidateRecruitmentCaches();
    const updateData = { ...data };
    if (data.interviewDate) updateData.interviewDate = normalizeCalendarDate(data.interviewDate).date;
    if (data.rating !== undefined) updateData.rating = Number(data.rating);
    if (data.score !== undefined) updateData.score = Number(data.score);

    return await prisma.interview.update({
      where: { id },
      data: updateData,
      include: {
        application: { include: { candidate: true, jobPosting: true } },
        interviewerEmp: true
      }
    });
  }

  // ==========================================================================
  // 7. OFFERS & HIRING
  // ==========================================================================

  async getOffers({ status } = {}) {
    const cacheKey = `recruitment_offers_${status || 'ALL'}`;
    return await cache.wrapSWR(cacheKey, 180000, 600000, async () => {
      const params = [];
      let whereSql = '';
      if (status && status !== 'All') {
        params.push(status);
        whereSql = `WHERE LOWER(jo.status) = LOWER($1)`;
      }
      const sql = `
        SELECT
          jo.id, jo."applicationId", jo."candidateId", jo."candidateName", jo."candidateEmail",
          jo.position, jo."offeredSalary", jo."salaryCTC", jo."fixedSalary", jo."variableBonus",
          jo."reportingManager", jo.designation, jo.department, jo.branch, jo.location,
          jo."offerDate", jo."joiningDate", jo.status, jo.terms, jo."rejectionReason", jo.notes,
          jo."createdAt", jo."updatedAt",
          CASE WHEN ja.id IS NOT NULL THEN
            json_build_object(
              'id', ja.id,
              'status', ja.status,
              'candidate', CASE WHEN c.id IS NOT NULL THEN row_to_json(c.*) ELSE NULL END,
              'jobPosting', CASE WHEN jp.id IS NOT NULL THEN row_to_json(jp.*) ELSE NULL END
            )
          ELSE NULL END AS application
        FROM "JobOffer" jo
        LEFT JOIN "JobApplication" ja ON ja.id = jo."applicationId"
        LEFT JOIN "Candidate" c ON c.id = ja."candidateId"
        LEFT JOIN "JobPosting" jp ON jp.id = ja."jobPostingId"
        ${whereSql}
        ORDER BY jo."offerDate" DESC
      `;
      return await prisma.$queryRawUnsafe(sql, ...params);
    });
  }

  async createOffer(data) {
    this.invalidateRecruitmentCaches();
    // Views do not support PostgreSQL ON CONFLICT / Prisma upsert directly
    const existing = await prisma.jobOffer.findFirst({
      where: { applicationId: data.applicationId }
    });
    const payload = {
      candidateId: data.candidateId || null,
      candidateName: data.candidateName || null,
      candidateEmail: data.candidateEmail || null,
      position: data.position || data.designation,
      offeredSalary: data.offeredSalary || data.salaryCTC,
      salaryCTC: data.salaryCTC || data.offeredSalary,
      fixedSalary: data.fixedSalary || null,
      variableBonus: data.variableBonus || null,
      reportingManager: data.reportingManager || null,
      designation: data.designation || data.position,
      department: data.department,
      branch: data.branch || data.location || 'Bangalore HQ',
      location: data.location || data.branch || 'Bangalore HQ',
      joiningDate: data.joiningDate ? (normalizeCalendarDate(data.joiningDate)?.date || new Date()) : new Date(),
      status: data.status || 'Sent',
      terms: data.terms || null,
      notes: data.notes || null,
      rejectionReason: data.rejectionReason || null
    };
    if (existing) {
      return await prisma.jobOffer.update({
        where: { id: existing.id },
        data: payload,
        include: { application: { include: { candidate: true, jobPosting: true } } }
      });
    }
    return await prisma.jobOffer.create({
      data: {
        id: data.id || undefined,
        applicationId: data.applicationId,
        offerDate: data.offerDate ? (normalizeCalendarDate(data.offerDate)?.date || new Date()) : new Date(),
        ...payload
      },
      include: { application: { include: { candidate: true, jobPosting: true } } }
    });
  }

  async updateOffer(id, data) {
    this.invalidateRecruitmentCaches();
    return await prisma.jobOffer.update({
      where: { id },
      data,
      include: {
        application: { include: { candidate: true, jobPosting: true } }
      }
    });
  }

  async getHiredEmployees() {
    return await prisma.jobApplication.findMany({
      where: { status: 'Hired' },
      include: {
        candidate: true,
        hiredEmployee: true,
        jobPosting: true,
        offer: true
      },
      orderBy: { hiredAt: 'desc' }
    });
  }

  async completeHiring(applicationId, employeeId) {
    this.invalidateRecruitmentCaches();
    return await prisma.jobApplication.update({
      where: { id: applicationId },
      data: {
        status: 'Hired',
        hiredAt: new Date(),
        hiredEmployeeId: employeeId
      },
      include: {
        candidate: true,
        jobPosting: true,
        hiredEmployee: true
      }
    });
  }
}

module.exports = new RecruitmentRepository();
