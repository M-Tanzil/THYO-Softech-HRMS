const performanceService = require('../services/performanceService');

class PerformanceController {
  // ==========================================================================
  // 1. CYCLES
  // ==========================================================================
  async createCycle(req, res, next) {
    try {
      const cycle = await performanceService.createCycle(req.body);
      res.status(201).json({ success: true, message: 'Performance cycle created successfully.', data: cycle });
    } catch (error) {
      next(error);
    }
  }

  async getCycles(req, res, next) {
    try {
      const { status } = req.query;
      const cycles = await performanceService.getCycles(status);
      res.status(200).json({ success: true, data: cycles, count: cycles.length });
    } catch (error) {
      next(error);
    }
  }

  async getCycleById(req, res, next) {
    try {
      const cycle = await performanceService.getCycleById(req.params.id);
      res.status(200).json({ success: true, data: cycle });
    } catch (error) {
      next(error);
    }
  }

  async updateCycle(req, res, next) {
    try {
      const cycle = await performanceService.updateCycle(req.params.id, req.body);
      res.status(200).json({ success: true, message: 'Performance cycle updated.', data: cycle });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================================================
  // 2. GOALS & PROGRESS
  // ==========================================================================
  async createGoal(req, res, next) {
    try {
      const goal = await performanceService.createGoal(req.body, req.user);
      res.status(201).json({ success: true, message: 'Goal created successfully.', data: goal });
    } catch (error) {
      next(error);
    }
  }

  async getGoals(req, res, next) {
    try {
      const { employeeId, cycleId, status, department } = req.query;
      const goals = await performanceService.getGoals(req.user, { employeeId, cycleId, status, department });
      res.status(200).json({ success: true, data: goals, count: goals.length });
    } catch (error) {
      next(error);
    }
  }

  async updateGoalProgress(req, res, next) {
    try {
      const { progress, currentProgress, factualProgressNote, note } = req.body;
      const resolvedProgress = progress !== undefined ? progress : currentProgress;
      const goal = await performanceService.updateGoalProgress(req.params.id, resolvedProgress, factualProgressNote || note);
      res.status(200).json({ success: true, message: 'Goal progress updated.', data: goal });
    } catch (error) {
      next(error);
    }
  }

  async updateGoalStatus(req, res, next) {
    try {
      const { status } = req.body;
      const goal = await performanceService.updateGoalStatus(req.params.id, status);
      res.status(200).json({ success: true, message: 'Goal status updated.', data: goal });
    } catch (error) {
      next(error);
    }
  }

  async updateGoal(req, res, next) {
    try {
      const goal = await performanceService.updateGoal(req.params.id, req.body);
      res.status(200).json({ success: true, message: 'Goal updated successfully.', data: goal });
    } catch (error) {
      next(error);
    }
  }

  async deleteGoal(req, res, next) {
    try {
      await performanceService.deleteGoal(req.params.id, req.user);
      res.status(200).json({ success: true, message: 'Goal deleted successfully.' });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================================================
  // 3. REVIEWS
  // ==========================================================================
  async getReviews(req, res, next) {
    try {
      const { employeeId, reviewerId, cycleId, department, status } = req.query;
      const reviews = await performanceService.getReviews(req.user, { employeeId, reviewerId, cycleId, department, status });
      res.status(200).json({ success: true, data: reviews, count: reviews.length });
    } catch (error) {
      next(error);
    }
  }

  async getReviewById(req, res, next) {
    try {
      const review = await performanceService.getReviewById(req.params.id, req.user);
      res.status(200).json({ success: true, data: review });
    } catch (error) {
      next(error);
    }
  }

  async submitSelfReview(req, res, next) {
    try {
      const review = await performanceService.submitSelfReview(req.body, req.user);
      res.status(200).json({ success: true, message: 'Self-appraisal submitted.', data: review });
    } catch (error) {
      next(error);
    }
  }

  async submitManagerReview(req, res, next) {
    try {
      const review = await performanceService.submitManagerReview(req.params.id, req.body, req.user);
      res.status(200).json({ success: true, message: 'Manager evaluation submitted.', data: review });
    } catch (error) {
      next(error);
    }
  }

  async submitAppraisalReview(req, res, next) {
    try {
      const review = await performanceService.submitAppraisalReview(req.params.id, req.body, req.user);
      res.status(200).json({ success: true, message: 'Performance review finalized.', data: review });
    } catch (error) {
      next(error);
    }
  }

  async acknowledgeReview(req, res, next) {
    try {
      const review = await performanceService.acknowledgeReview(req.params.id, req.user);
      res.status(200).json({ success: true, message: 'Appraisal review acknowledged.', data: review });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================================================
  // 4. CONTINUOUS FEEDBACK / KUDOS
  // ==========================================================================
  async getFeedbacks(req, res, next) {
    try {
      const feedbacks = await performanceService.getFeedbacks();
      res.status(200).json({ success: true, data: feedbacks, count: feedbacks.length });
    } catch (error) {
      next(error);
    }
  }

  async createFeedback(req, res, next) {
    try {
      const feedback = await performanceService.createFeedback(req.body, req.user);
      res.status(201).json({ success: true, message: 'Recognition & feedback sent.', data: feedback });
    } catch (error) {
      next(error);
    }
  }

  async toggleFeedbackLike(req, res, next) {
    try {
      const feedback = await performanceService.toggleFeedbackLike(req.params.id);
      res.status(200).json({ success: true, message: 'Feedback liked.', data: feedback });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PerformanceController();
