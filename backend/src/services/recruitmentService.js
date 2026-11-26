const recruitmentRepository = require('../repositories/recruitmentRepository');
const notificationService = require('./notificationService');
const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');
const { normalizeCalendarDate, formatCalendarDate } = require('../utils/dateUtils');

class RecruitmentService {
  // ==========================================================================
  // 1. JOB REQUISITIONS
  // ==========================================================================

  async getRequisitions(filters = {}) {
    return await recruitmentRepository.getRequisitions(filters);
  }

  async getRequisitionById(id) {
    const req = await recruitmentRepository.getRequisitionById(id);
    if (!req) {
      const error = new Error(`Requisition ${id} not found.`);
      error.statusCode = 404;
      throw error;
    }
    return req;
  }

  async createJobRequisition(data, user) {
    let id = data.id;
    if (!id) {
      const count = await prisma.jobRequisition.count();
      id = `REQ-0${count + 1}`;
    }

    const requestedBy = data.requestedBy || `${user.fullName || user.name || 'User'} (${user.role || 'Staff'})`;
    const status = user.role === 'ADMIN' ? 'Approved' : 'Pending Approval';
    const approvedBy = status === 'Approved' ? (user.fullName || user.name || 'Admin') : null;

    const requisition = await recruitmentRepository.createRequisition({
      id,
      title: data.title,
      department: data.department,
      openings: data.openings || 1,
      priority: data.priority || 'Medium',
      targetDate: data.targetDate,
      budgetSalaryRange: data.budgetSalaryRange,
      reason: data.reason,
      requestedBy,
      status,
      approvedBy,
      createdDate: new Date()
    });

    // Notify HR and Admins
    try {
      await notificationService.notifyRecruitment({
        recipientId: 'EMP006', // HRBP
        title: "New Job Requisition Created",
        message: `${requisition.title} (${requisition.department}) requisition was submitted by ${requestedBy}.`,
        category: "Recruitment",
        type: "recruitment",
        actionLink: "recruitment",
        targetTab: "requisitions"
      });
    } catch (err) {
      console.error('Error sending notification:', err.message);
    }

    return requisition;
  }

  async updateJobRequisition(id, updates) {
    await this.getRequisitionById(id);
    return await recruitmentRepository.updateRequisition(id, updates);
  }

  async approveRequisition(id, user) {
    await this.getRequisitionById(id);
    return await recruitmentRepository.updateRequisition(id, {
      status: 'Approved',
      approvedBy: user.fullName || user.name || 'Admin'
    });
  }

  async rejectRequisition(id, reason) {
    await this.getRequisitionById(id);
    return await recruitmentRepository.updateRequisition(id, {
      status: 'Rejected',
      rejectionReason: reason || 'Requisition budget not approved.'
    });
  }

  // ==========================================================================
  // 2. JOB POSTINGS
  // ==========================================================================

  async getJobPostings(filters = {}) {
    return await recruitmentRepository.getJobPostings(filters);
  }

  async getJobPostingById(id) {
    const job = await recruitmentRepository.getJobPostingById(id);
    if (!job) {
      const error = new Error(`Job posting ${id} not found.`);
      error.statusCode = 404;
      throw error;
    }
    return job;
  }

  async createJobPosting(data, user) {
    let id = data.id;
    if (!id) {
      const count = await prisma.jobPosting.count();
      id = `JOB-0${count + 1}`;
    }

    const job = await recruitmentRepository.createJobPosting({
      id,
      ...data,
      postedById: user.employeeId || 'EMP001'
    });

    // If linked to a requisition, mark convertedPostingId on the requisition
    if (data.requisitionId) {
      await prisma.jobRequisition.update({
        where: { id: data.requisitionId },
        data: { convertedPostingId: job.id, status: 'Approved' }
      }).catch(() => {});
    }

    // Notify organization of new job vacancy
    try {
      await notificationService.notifyRecruitment({
        recipientId: 'EMP001',
        title: "New Job Vacancy Published",
        message: `Job posting for ${job.title} (${job.department}) is now active on the career board.`,
        category: "Recruitment",
        type: "recruitment",
        actionLink: "recruitment",
        targetTab: "postings"
      });
    } catch (err) {
      console.error('Error sending notification:', err.message);
    }

    return job;
  }

  async updateJobPosting(id, data) {
    await this.getJobPostingById(id);
    return await recruitmentRepository.updateJobPosting(id, data);
  }

  async togglePublishPosting(id) {
    const job = await this.getJobPostingById(id);
    const nextPublished = !job.isPublished;
    return await recruitmentRepository.updateJobPosting(id, {
      isPublished: nextPublished,
      status: nextPublished ? 'Active' : 'Draft'
    });
  }

  // ==========================================================================
  // 3. CANDIDATES & APPLICATIONS
  // ==========================================================================

  async getCandidates(filters = {}) {
    return await recruitmentRepository.getCandidates(filters);
  }

  async getCandidateById(id) {
    const cand = await recruitmentRepository.getCandidateById(id);
    if (!cand) {
      const error = new Error(`Candidate ${id} not found.`);
      error.statusCode = 404;
      throw error;
    }
    return cand;
  }

  async createCandidate(data) {
    let id = data.id;
    if (!id) {
      const count = await prisma.candidate.count();
      id = `CAND-0${count + 1}`;
    }

    // 1. Create Candidate
    const candidate = await recruitmentRepository.createCandidate({
      id,
      ...data
    });

    // 2. Automatically generate JobApplication entry if jobPostingId or jobId is present
    let jobPostingId = data.jobPostingId || data.jobId;
    if (!jobPostingId) {
      const firstJob = await prisma.jobPosting.findFirst();
      if (firstJob) jobPostingId = firstJob.id;
    }

    let application = null;
    if (jobPostingId) {
      const appCount = await prisma.jobApplication.count();
      const appId = `APP-${100 + appCount + 1}`;
      application = await recruitmentRepository.createApplication({
        id: appId,
        jobPostingId,
        candidateId: candidate.id,
        status: 'Applied',
        screeningStatus: 'Pending',
        interviewStatus: 'Not Scheduled',
        offerStatus: 'Not Initiated',
        appliedDate: candidate.appliedDate || new Date()
      }).catch(err => {
        console.warn('Auto application creation warning:', err.message);
        return null;
      });
    }

    // Notify HR
    try {
      await notificationService.notifyRecruitment({
        recipientId: 'EMP006',
        title: "New Candidate Application Received",
        message: `${candidate.fullName} applied for ${candidate.jobTitle || 'Open Position'}.`,
        category: "Recruitment",
        type: "recruitment",
        actionLink: "recruitment",
        targetTab: "candidates"
      });
    } catch (err) {}

    return { candidate, application };
  }

  async advanceCandidateStage(candidateId) {
    const candidate = await this.getCandidateById(candidateId);
    const stages = ['Applied', 'Screening', 'Interview', 'Offered', 'Hired'];
    const currentIdx = stages.indexOf(candidate.stage);

    if (currentIdx !== -1 && currentIdx < stages.length - 1) {
      const nextStage = stages[currentIdx + 1];
      const updated = await recruitmentRepository.updateCandidate(candidateId, { stage: nextStage });

      // Synchronize associated applications
      await prisma.jobApplication.updateMany({
        where: { candidateId },
        data: { status: nextStage }
      });

      return updated;
    }

    return candidate;
  }

  async rejectCandidate(candidateId, reason = 'Screening criteria not met') {
    const updated = await recruitmentRepository.updateCandidate(candidateId, {
      stage: 'Rejected',
      summary: reason ? `Rejected: ${reason}` : undefined
    });

    await prisma.jobApplication.updateMany({
      where: { candidateId },
      data: { status: 'Rejected' }
    });

    return updated;
  }

  async getApplications(filters = {}) {
    return await recruitmentRepository.getApplications(filters);
  }

  async getApplicationById(id) {
    const app = await recruitmentRepository.getApplicationById(id);
    if (!app) {
      const error = new Error(`Application ${id} not found.`);
      error.statusCode = 404;
      throw error;
    }
    return app;
  }

  // ==========================================================================
  // 4. SCREENING SCORECARDS
  // ==========================================================================

  async getScreeningScorecards(filters = {}) {
    return await recruitmentRepository.getScreeningScorecards(filters);
  }

  async saveScreeningScorecard(candidateId, scorecardData, user) {
    const reviewer = scorecardData.reviewer || `${user.fullName || user.name || 'Reviewer'} (${user.role || 'Reviewer'})`;

    // Find candidate's application
    const app = await prisma.jobApplication.findFirst({
      where: { candidateId }
    });

    const scorecard = await recruitmentRepository.createScreeningScorecard({
      candidateId,
      applicationId: app ? app.id : null,
      reviewer,
      ...scorecardData
    });

    // Handle automated stage advancement based on recommendation
    if (scorecardData.recommendation === 'Move to Interview') {
      await this.advanceCandidateStage(candidateId);
      if (app) {
        await recruitmentRepository.updateApplication(app.id, {
          screeningStatus: 'Passed',
          status: 'Interview'
        });
      }
    } else if (scorecardData.recommendation === 'Reject') {
      await this.rejectCandidate(candidateId, scorecardData.notes);
      if (app) {
        await recruitmentRepository.updateApplication(app.id, {
          screeningStatus: 'Failed',
          status: 'Rejected'
        });
      }
    }

    return scorecard;
  }

  // ==========================================================================
  // 5. INTERVIEWS
  // ==========================================================================

  async getInterviews(filters = {}) {
    return await recruitmentRepository.getInterviews(filters);
  }

  async scheduleInterview(data, user) {
    // Determine applicationId
    let applicationId = data.applicationId;
    if (!applicationId && data.candidateId) {
      const app = await prisma.jobApplication.findFirst({
        where: { candidateId: data.candidateId }
      });
      if (app) applicationId = app.id;
    }

    if (!applicationId) {
      // Find candidate
      const cand = await prisma.candidate.findUnique({ where: { id: data.candidateId } });
      const firstJob = await prisma.jobPosting.findFirst();
      const appCount = await prisma.jobApplication.count();
      const newApp = await recruitmentRepository.createApplication({
        id: `APP-${100 + appCount + 1}`,
        jobPostingId: firstJob ? firstJob.id : 'JOB-01',
        candidateId: data.candidateId,
        status: 'Interview',
        screeningStatus: 'Passed',
        interviewStatus: 'Scheduled'
      });
      applicationId = newApp.id;
    }

    const intCount = await prisma.interview.count();
    const id = data.id || `INT-0${intCount + 1}`;

    const interview = await recruitmentRepository.createInterview({
      id,
      applicationId,
      ...data
    });

    // Sync candidate stage to Interview
    if (data.candidateId) {
      await recruitmentRepository.updateCandidate(data.candidateId, { stage: 'Interview' });
      await recruitmentRepository.updateApplication(applicationId, {
        status: 'Interview',
        interviewStatus: 'Scheduled'
      });
    }

    // Notify interviewer
    try {
      await notificationService.notifyRecruitment({
        recipientId: data.interviewerId || 'EMP001',
        title: "Interview Scheduled",
        message: `${interview.roundName} scheduled for ${interview.candidateName || 'Candidate'} on ${formatCalendarDate(interview.interviewDate, 'DD-MM-YYYY')}.`,
        category: "Recruitment",
        type: "recruitment",
        actionLink: "recruitment",
        targetTab: "interviews"
      });
    } catch (err) {}

    return interview;
  }

  async submitInterviewFeedback(interviewId, feedbackData, user) {
    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      include: { application: true }
    });

    if (!interview) {
      const error = new Error(`Interview ${interviewId} not found.`);
      error.statusCode = 404;
      throw error;
    }

    const updated = await recruitmentRepository.updateInterview(interviewId, {
      status: 'Completed',
      rating: feedbackData.rating,
      score: feedbackData.score || feedbackData.rating,
      feedback: feedbackData.feedback,
      recommendation: feedbackData.recommendation
    });

    // Advance or reject based on recommendation
    if (interview.application) {
      if (feedbackData.recommendation === 'Strong Hire' || feedbackData.recommendation === 'Hire') {
        await recruitmentRepository.updateApplication(interview.application.id, {
          interviewStatus: 'Completed'
        });
      } else if (feedbackData.recommendation === 'Reject') {
        await recruitmentRepository.updateApplication(interview.application.id, {
          interviewStatus: 'Failed',
          status: 'Rejected'
        });
        if (interview.candidateId) {
          await this.rejectCandidate(interview.candidateId, feedbackData.feedback);
        }
      }
    }

    return updated;
  }

  // ==========================================================================
  // 6. OFFERS & HIRING
  // ==========================================================================

  async getOffers(filters = {}) {
    return await recruitmentRepository.getOffers(filters);
  }

  async createOffer(data, user) {
    let applicationId = data.applicationId;
    if (!applicationId && data.candidateId) {
      let app = await prisma.jobApplication.findFirst({
        where: { candidateId: data.candidateId }
      });
      if (!app) {
        const jobPosting = await prisma.jobPosting.findFirst();
        if (jobPosting) {
          app = await prisma.jobApplication.create({
            data: {
              candidateId: data.candidateId,
              jobPostingId: jobPosting.id,
              status: 'Offered'
            }
          });
        }
      }
      if (app) applicationId = app.id;
    }

    if (!applicationId) {
      const error = new Error('Application ID or valid candidate with an application is required to create an offer.');
      error.statusCode = 400;
      throw error;
    }

    const offerCount = await prisma.jobOffer.count();
    const id = data.id || `OFF-0${offerCount + 1}`;

    const offer = await recruitmentRepository.createOffer({
      id,
      applicationId,
      ...data,
      status: 'Sent'
    });

    // Update candidate and application status to Offered
    if (data.candidateId) {
      await recruitmentRepository.updateCandidate(data.candidateId, { stage: 'Offered' });
    }
    if (applicationId) {
      await recruitmentRepository.updateApplication(applicationId, {
        status: 'Offered',
        offerStatus: 'Sent'
      });
    }

    return offer;
  }

  async acceptOffer(offerId) {
    const offer = await prisma.jobOffer.findUnique({
      where: { id: offerId },
      include: { application: true }
    });

    if (!offer) {
      const error = new Error(`Offer ${offerId} not found.`);
      error.statusCode = 404;
      throw error;
    }

    const updated = await recruitmentRepository.updateOffer(offerId, { status: 'Accepted' });

    if (offer.application) {
      await recruitmentRepository.updateApplication(offer.application.id, {
        offerStatus: 'Accepted'
      });
    }

    return updated;
  }

  async rejectOffer(offerId, reason = '') {
    const offer = await prisma.jobOffer.findUnique({
      where: { id: offerId },
      include: { application: true }
    });

    if (!offer) {
      const error = new Error(`Offer ${offerId} not found.`);
      error.statusCode = 404;
      throw error;
    }

    const updated = await recruitmentRepository.updateOffer(offerId, {
      status: 'Rejected',
      rejectionReason: reason
    });

    if (offer.candidateId) {
      await this.rejectCandidate(offer.candidateId, reason);
    }

    return updated;
  }

  async getHiredEmployees() {
    return await recruitmentRepository.getHiredEmployees();
  }

  async hireCandidate(data, user) {
    const candidateId = data.candidateId;
    let applicationId = data.applicationId;

    if (!applicationId && candidateId) {
      const app = await prisma.jobApplication.findFirst({
        where: { candidateId }
      });
      if (app) applicationId = app.id;
    }

    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId }
    });

    if (!candidate) {
      const error = new Error(`Candidate ${candidateId} not found.`);
      error.statusCode = 404;
      throw error;
    }

    // Generate clean, sequential employeeId (e.g. EMP011, EMP012)
    const count = await prisma.employee.count();
    let employeeId = data.officialEmployeeId || `EMP${String(count + 1).padStart(3, '0')}`;

    const existingEmp = await prisma.employee.findUnique({ where: { employeeId } });
    if (existingEmp) {
      employeeId = `EMP${String(count + 2).padStart(3, '0')}`;
    }

    const department = data.department || candidate.department || 'Engineering';
    const designation = data.position || data.designation || candidate.jobTitle || 'Software Engineer';
    const officialEmail = data.officialEmail || `${candidate.fullName.toLowerCase().replace(/\s+/g, '.')}@thysoftech.com`;

    // 1. Create real Employee in PostgreSQL
    const employee = await prisma.employee.create({
      data: {
        employeeId,
        fullName: candidate.fullName,
        email: officialEmail,
        phone: candidate.phone,
        department,
        designation,
        position: designation,
        status: 'ACTIVE',
        joiningDate: data.joiningDate ? (normalizeCalendarDate(data.joiningDate)?.date || new Date()) : new Date()
      }
    });

    // 2. Create User credential in PostgreSQL
    const username = officialEmail.split('@')[0];
    const passwordHash = await bcrypt.hash('Thyo@2026', 10);
    await prisma.user.create({
      data: {
        username,
        email: officialEmail,
        passwordHash,
        role: 'EMPLOYEE',
        isActive: true,
        employeeId: employee.employeeId
      }
    });

    // 3. Mark candidate stage as Hired and application as Hired
    await recruitmentRepository.updateCandidate(candidateId, { stage: 'Hired' });
    if (applicationId) {
      await recruitmentRepository.completeHiring(applicationId, employee.employeeId);
    }

    // 4. Create Notification Preferences
    await prisma.notificationPreference.create({
      data: {
        employeeId: employee.employeeId
      }
    }).catch(() => {});

    // 5. Send welcome notification
    try {
      await notificationService.notifyRecruitment({
        recipientId: employee.employeeId,
        title: "Welcome to THY SOFTECH PVT LTD!",
        message: `Congratulations ${employee.fullName}! Your onboarding is complete as ${employee.designation}.`,
        category: "Recruitment",
        type: "recruitment",
        actionLink: "recruitment",
        targetTab: "hiring"
      });
    } catch (err) {}

    return {
      success: true,
      message: `Candidate ${candidate.fullName} successfully hired as ${employee.employeeId}.`,
      employee,
      officialEmployeeId: employee.employeeId,
      officialEmail: employee.email
    };
  }
}

module.exports = new RecruitmentService();
