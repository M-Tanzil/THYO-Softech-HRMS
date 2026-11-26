import apiClient from './client';

// ============================================================================
// 1. LEAVE MANAGEMENT API (Student 5 - Complete Implementation)
// ============================================================================
export const leaveApi = {
  getTypes: () => apiClient.get('/leave/types').then(res => res.data),
  getBalances: (params) => apiClient.get('/leave/balances', { params }).then(res => res.data),
  getStats: () => apiClient.get('/leave/stats').then(res => res.data),
  getMyRequests: (params) => apiClient.get('/leave/my', { params }).then(res => res.data),
  getRequests: (params) => apiClient.get('/leave', { params }).then(res => res.data),
  getRequestById: (id) => apiClient.get(`/leave/${id}`).then(res => res.data),
  createRequest: (data) => apiClient.post('/leave', data).then(res => res.data),
  reviewRequest: (id, data) => apiClient.patch(`/leave/${id}/review`, data).then(res => res.data),
  cancelRequest: (id) => apiClient.patch(`/leave/${id}/cancel`).then(res => res.data)
};

// ============================================================================
// 2. RECRUITMENT / ATS API (Student 5 - 9-Stage Pipeline)
// ============================================================================
export const recruitmentApi = {
  // Requisitions
  getRequisitions: (params) => apiClient.get('/recruitment/requisitions', { params }).then(res => res.data),
  getRequisitionById: (id) => apiClient.get(`/recruitment/requisitions/${id}`).then(res => res.data),
  createRequisition: (data) => apiClient.post('/recruitment/requisitions', data).then(res => res.data),
  approveRequisition: (id) => apiClient.patch(`/recruitment/requisitions/${id}/approve`).then(res => res.data),
  rejectRequisition: (id, data) => apiClient.patch(`/recruitment/requisitions/${id}/reject`, data).then(res => res.data),

  // Job Postings
  getJobs: (params) => apiClient.get('/recruitment/jobs', { params }).then(res => res.data),
  getJobById: (id) => apiClient.get(`/recruitment/jobs/${id}`).then(res => res.data),
  createJob: (data) => apiClient.post('/recruitment/jobs', data).then(res => res.data),
  updateJob: (id, data) => apiClient.put(`/recruitment/jobs/${id}`, data).then(res => res.data),

  // Candidates & Applications
  getCandidates: (params) => apiClient.get('/recruitment/candidates', { params }).then(res => res.data),
  getCandidateById: (id) => apiClient.get(`/recruitment/candidates/${id}`).then(res => res.data),
  createCandidate: (data) => apiClient.post('/recruitment/candidates', data).then(res => res.data),
  getApplications: (params) => apiClient.get('/recruitment/applications', { params }).then(res => res.data),
  getApplicationById: (id) => apiClient.get(`/recruitment/applications/${id}`).then(res => res.data),
  applyForJob: (data) => apiClient.post('/recruitment/apply', data).then(res => res.data),
  updateStage: (id, data) => apiClient.patch(`/recruitment/applications/${id}/stage`, data).then(res => res.data),

  // Screening
  submitScreeningScorecard: (id, data) => apiClient.post(`/recruitment/applications/${id}/screening-scorecard`, data).then(res => res.data),

  // Interviews
  scheduleInterview: (data) => apiClient.post('/recruitment/interviews', data).then(res => res.data),
  submitFeedback: (id, data) => apiClient.patch(`/recruitment/interviews/${id}/feedback`, data).then(res => res.data),

  // Offers & Hiring
  createOffer: (data) => apiClient.post('/recruitment/offers', data).then(res => res.data),
  getOfferById: (id) => apiClient.get(`/recruitment/offers/${id}`).then(res => res.data),
  hireCandidate: (data) => apiClient.post('/recruitment/hire', data).then(res => res.data)
};

// ============================================================================
// 3. PERFORMANCE MANAGEMENT API (Student 5)
// ============================================================================
export const performanceApi = {
  getCycles: (params) => apiClient.get('/performance/cycles', { params }).then(res => res.data),
  getCycleById: (id) => apiClient.get(`/performance/cycles/${id}`).then(res => res.data),
  createCycle: (data) => apiClient.post('/performance/cycles', data).then(res => res.data),

  getGoals: (params) => apiClient.get('/performance/goals', { params }).then(res => res.data),
  createGoal: (data) => apiClient.post('/performance/goals', data).then(res => res.data),
  updateGoalProgress: (id, data) => apiClient.patch(`/performance/goals/${id}/progress`, data).then(res => res.data),
  deleteGoal: (id) => apiClient.delete(`/performance/goals/${id}`).then(res => res.data),

  getReviews: (params) => apiClient.get('/performance/reviews', { params }).then(res => res.data),
  getReviewById: (id) => apiClient.get(`/performance/reviews/${id}`).then(res => res.data),
  submitSelfReview: (data) => apiClient.post('/performance/reviews/self', data).then(res => res.data),
  evaluateReview: (id, data) => apiClient.patch(`/performance/reviews/${id}/evaluate`, data).then(res => res.data),
  acknowledgeReview: (id) => apiClient.patch(`/performance/reviews/${id}/acknowledge`).then(res => res.data),

  // Continuous Feedback / Kudos Wall
  getFeedbacks: (params) => apiClient.get('/performance/feedback', { params }).then(res => res.data),
  createFeedback: (data) => apiClient.post('/performance/feedback', data).then(res => res.data),
  toggleFeedbackLike: (id) => apiClient.patch(`/performance/feedback/${id}/like`).then(res => res.data)
};

// ============================================================================
// 4. WORK FROM HOME (WFH) API (Student 5)
// ============================================================================
export const wfhApi = {
  getRequests: (params) => apiClient.get('/wfh', { params }).then(res => res.data),
  getMyRequests: (params) => apiClient.get('/wfh/my', { params }).then(res => res.data),
  getRequestById: (id) => apiClient.get(`/wfh/${id}`).then(res => res.data),
  getStats: () => apiClient.get('/wfh/stats').then(res => res.data),
  createRequest: (data) => apiClient.post('/wfh', data).then(res => res.data),
  reviewRequest: (id, data) => apiClient.patch(`/wfh/${id}/review`, data).then(res => res.data),
  cancelRequest: (id) => apiClient.patch(`/wfh/${id}/cancel`).then(res => res.data)
};

// ============================================================================
// 5. HOLIDAYS API (Student 5)
// ============================================================================
export const holidayApi = {
  getHolidays: (params) => apiClient.get('/holidays', { params }).then(res => res.data),
  getHolidayById: (id) => apiClient.get(`/holidays/${id}`).then(res => res.data),
  createHoliday: (data) => apiClient.post('/holidays', data).then(res => res.data),
  updateHoliday: (id, data) => apiClient.put(`/holidays/${id}`, data).then(res => res.data),
  deleteHoliday: (id) => apiClient.delete(`/holidays/${id}`).then(res => res.data)
};

// ============================================================================
// 6. ANNOUNCEMENTS API (Student 5)
// ============================================================================
export const announcementApi = {
  getAnnouncements: () => apiClient.get('/announcements').then(res => res.data),
  createAnnouncement: (data) => apiClient.post('/announcements', data).then(res => res.data),
  acknowledgeAnnouncement: (id) => apiClient.post(`/announcements/${id}/acknowledge`).then(res => res.data),
  deleteAnnouncement: (id) => apiClient.delete(`/announcements/${id}`).then(res => res.data)
};

// ============================================================================
// 7. NOTIFICATIONS & PREFERENCES API (Student 5)
// ============================================================================
export const notificationApi = {
  getNotifications: (params) => apiClient.get('/notifications', { params }).then(res => res.data),
  markAsRead: (id) => apiClient.patch(`/notifications/${id}/read`).then(res => res.data),
  markAllAsRead: () => apiClient.patch('/notifications/read-all').then(res => res.data),
  getPreferences: () => apiClient.get('/notifications/preferences').then(res => res.data),
  updatePreferences: (data) => apiClient.put('/notifications/preferences', data).then(res => res.data)
};
