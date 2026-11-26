const recruitmentService = require('../services/recruitmentService');

class RecruitmentController {
  // ==========================================================================
  // 1. REQUISITIONS
  // ==========================================================================
  async getRequisitions(req, res, next) {
    try {
      const { department, status } = req.query;
      const requisitions = await recruitmentService.getRequisitions({ department, status });
      res.status(200).json({ success: true, data: requisitions, count: requisitions.length });
    } catch (error) {
      next(error);
    }
  }

  async getRequisitionById(req, res, next) {
    try {
      const requisition = await recruitmentService.getRequisitionById(req.params.id);
      res.status(200).json({ success: true, data: requisition });
    } catch (error) {
      next(error);
    }
  }

  async createRequisition(req, res, next) {
    try {
      const requisition = await recruitmentService.createJobRequisition(req.body, req.user);
      res.status(201).json({ success: true, message: 'Job requisition created successfully.', data: requisition });
    } catch (error) {
      next(error);
    }
  }

  async updateRequisition(req, res, next) {
    try {
      const requisition = await recruitmentService.updateJobRequisition(req.params.id, req.body);
      res.status(200).json({ success: true, message: 'Requisition updated.', data: requisition });
    } catch (error) {
      next(error);
    }
  }

  async approveRequisition(req, res, next) {
    try {
      const requisition = await recruitmentService.approveRequisition(req.params.id, req.user);
      res.status(200).json({ success: true, message: 'Requisition approved successfully.', data: requisition });
    } catch (error) {
      next(error);
    }
  }

  async rejectRequisition(req, res, next) {
    try {
      const { reason } = req.body;
      const requisition = await recruitmentService.rejectRequisition(req.params.id, reason);
      res.status(200).json({ success: true, message: 'Requisition marked as rejected.', data: requisition });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================================================
  // 2. JOB POSTINGS
  // ==========================================================================
  async getJobPostings(req, res, next) {
    try {
      const { department, branch, status } = req.query;
      const jobs = await recruitmentService.getJobPostings({ department, branch, status });
      res.status(200).json({ success: true, data: jobs, count: jobs.length });
    } catch (error) {
      next(error);
    }
  }

  async getJobPostingById(req, res, next) {
    try {
      const job = await recruitmentService.getJobPostingById(req.params.id);
      res.status(200).json({ success: true, data: job });
    } catch (error) {
      next(error);
    }
  }

  async createJobPosting(req, res, next) {
    try {
      const job = await recruitmentService.createJobPosting(req.body, req.user);
      res.status(201).json({ success: true, message: 'Job posting published successfully.', data: job });
    } catch (error) {
      next(error);
    }
  }

  async updateJobPosting(req, res, next) {
    try {
      const job = await recruitmentService.updateJobPosting(req.params.id, req.body);
      res.status(200).json({ success: true, message: 'Job posting updated.', data: job });
    } catch (error) {
      next(error);
    }
  }

  async togglePublishPosting(req, res, next) {
    try {
      const job = await recruitmentService.togglePublishPosting(req.params.id);
      res.status(200).json({ success: true, message: `Job posting is now ${job.isPublished ? 'Published' : 'Unpublished'}.`, data: job });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================================================
  // 3. CANDIDATES & APPLICATIONS
  // ==========================================================================
  async getCandidates(req, res, next) {
    try {
      const { department, stage, search } = req.query;
      const candidates = await recruitmentService.getCandidates({ department, stage, search });
      res.status(200).json({ success: true, data: candidates, count: candidates.length });
    } catch (error) {
      next(error);
    }
  }

  async getCandidateById(req, res, next) {
    try {
      const candidate = await recruitmentService.getCandidateById(req.params.id);
      res.status(200).json({ success: true, data: candidate });
    } catch (error) {
      next(error);
    }
  }

  async createCandidate(req, res, next) {
    try {
      const result = await recruitmentService.createCandidate(req.body);
      res.status(201).json({ success: true, message: 'Candidate registered successfully.', data: result });
    } catch (error) {
      next(error);
    }
  }

  async advanceCandidateStage(req, res, next) {
    try {
      const candidate = await recruitmentService.advanceCandidateStage(req.params.id);
      res.status(200).json({ success: true, message: `Candidate advanced to ${candidate.stage} stage.`, data: candidate });
    } catch (error) {
      next(error);
    }
  }

  async rejectCandidate(req, res, next) {
    try {
      const { reason } = req.body;
      const candidate = await recruitmentService.rejectCandidate(req.params.id, reason);
      res.status(200).json({ success: true, message: 'Candidate archived as rejected.', data: candidate });
    } catch (error) {
      next(error);
    }
  }

  async getApplications(req, res, next) {
    try {
      const { jobPostingId, status, search } = req.query;
      const applications = await recruitmentService.getApplications({ jobPostingId, status, search });
      res.status(200).json({ success: true, data: applications, count: applications.length });
    } catch (error) {
      next(error);
    }
  }

  async getApplicationById(req, res, next) {
    try {
      const application = await recruitmentService.getApplicationById(req.params.id);
      res.status(200).json({ success: true, data: application });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================================================
  // 4. SCREENING SCORECARDS
  // ==========================================================================
  async getScreeningNotes(req, res, next) {
    try {
      const { candidateId, applicationId } = req.query;
      const scorecards = await recruitmentService.getScreeningScorecards({ candidateId, applicationId });
      res.status(200).json({ success: true, data: scorecards, count: scorecards.length });
    } catch (error) {
      next(error);
    }
  }

  async saveScreeningScorecard(req, res, next) {
    try {
      const candidateId = req.body.candidateId;
      const scorecard = await recruitmentService.saveScreeningScorecard(candidateId, req.body, req.user);
      res.status(201).json({ success: true, message: 'Screening scorecard saved successfully.', data: scorecard });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================================================
  // 5. INTERVIEWS
  // ==========================================================================
  async getInterviews(req, res, next) {
    try {
      const { candidateId, status } = req.query;
      const interviews = await recruitmentService.getInterviews({ candidateId, status });
      res.status(200).json({ success: true, data: interviews, count: interviews.length });
    } catch (error) {
      next(error);
    }
  }

  async scheduleInterview(req, res, next) {
    try {
      const interview = await recruitmentService.scheduleInterview(req.body, req.user);
      res.status(201).json({ success: true, message: 'Interview scheduled successfully.', data: interview });
    } catch (error) {
      next(error);
    }
  }

  async submitInterviewFeedback(req, res, next) {
    try {
      const interview = await recruitmentService.submitInterviewFeedback(req.params.id, req.body, req.user);
      res.status(200).json({ success: true, message: 'Interview evaluation recorded.', data: interview });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================================================
  // 6. OFFERS & HIRING
  // ==========================================================================
  async getOffers(req, res, next) {
    try {
      const { status } = req.query;
      const offers = await recruitmentService.getOffers({ status });
      res.status(200).json({ success: true, data: offers, count: offers.length });
    } catch (error) {
      next(error);
    }
  }

  async createOffer(req, res, next) {
    try {
      const offer = await recruitmentService.createOffer(req.body, req.user);
      res.status(201).json({ success: true, message: 'Offer letter extended successfully.', data: offer });
    } catch (error) {
      next(error);
    }
  }

  async acceptOffer(req, res, next) {
    try {
      const offer = await recruitmentService.acceptOffer(req.params.id);
      res.status(200).json({ success: true, message: 'Offer marked as accepted.', data: offer });
    } catch (error) {
      next(error);
    }
  }

  async rejectOffer(req, res, next) {
    try {
      const { reason } = req.body;
      const offer = await recruitmentService.rejectOffer(req.params.id, reason);
      res.status(200).json({ success: true, message: 'Offer marked as rejected.', data: offer });
    } catch (error) {
      next(error);
    }
  }

  async getHiredEmployees(req, res, next) {
    try {
      const hired = await recruitmentService.getHiredEmployees();
      res.status(200).json({ success: true, data: hired, count: hired.length });
    } catch (error) {
      next(error);
    }
  }

  async hireCandidate(req, res, next) {
    try {
      const result = await recruitmentService.hireCandidate(req.body, req.user);
      res.status(200).json({
        success: true,
        message: result.message || 'Candidate hired successfully.',
        data: {
          ...result,
          officialEmployeeId: result.officialEmployeeId || result.employee?.employeeId,
          officialEmail: result.officialEmail || result.employee?.email
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new RecruitmentController();
