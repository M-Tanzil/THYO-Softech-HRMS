import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  TrendingUp,
  Target,
  FileCheck,
  Plus,
  Star,
  CheckCircle2,
  Clock,
  Award,
  ChevronRight,
  AlertCircle,
  Heart,
  Sparkles
} from 'lucide-react';
import apiClient from '../api/client';
import { performanceApi } from '../api/student5Api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/common/Modal';
import { SkeletonCard, SkeletonTable } from '../components/common/SkeletonLoader';

export default function PerformancePage() {
  const { currentUser, isManagerOrAdmin, isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'cycles' && !isAdmin) return 'goals';
    if (tabParam && ['goals', 'reviews', 'cycles', 'kudos'].includes(tabParam)) return tabParam;
    return 'goals';
  });

  const [successMsg, setSuccessMsg] = useState('');

  // Modals
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showSelfReviewModal, setShowSelfReviewModal] = useState(false);
  const [showManagerEvalModal, setShowManagerEvalModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);

  // Forms
  const [goalForm, setGoalForm] = useState({
    title: '',
    description: '',
    category: 'TECHNICAL',
    targetMetric: '',
    weightage: 25,
    dueDate: ''
  });

  const [selfReviewForm, setSelfReviewForm] = useState({
    selfRating: 4.5,
    selfAssessment: ''
  });

  const [managerEvalForm, setManagerEvalForm] = useState({
    managerRating: 4.0,
    managerFeedback: '',
    strengths: '',
    improvements: ''
  });

  const [feedbackForm, setFeedbackForm] = useState({
    toEmployeeId: 'EMP002',
    feedbackType: 'Praise / Kudos',
    badge: 'Code Ninja ⚡',
    message: ''
  });

  const [submitting, setSubmitting] = useState(false);

  // Modular TanStack React Query hooks with independent caching
  const goalsQuery = useQuery({
    queryKey: ['performance', 'goals', currentUser?.employeeId],
    queryFn: async () => {
      const res = await performanceApi.getGoals();
      return res.data || [];
    },
    staleTime: 1000 * 60 * 3,
    placeholderData: (prev) => prev
  });

  const reviewsQuery = useQuery({
    queryKey: ['performance', 'reviews', currentUser?.employeeId],
    queryFn: async () => {
      const res = await performanceApi.getReviews();
      return res.data || [];
    },
    staleTime: 1000 * 60 * 3,
    placeholderData: (prev) => prev
  });

  const cyclesQuery = useQuery({
    queryKey: ['performance', 'cycles'],
    queryFn: async () => {
      const res = await performanceApi.getCycles();
      return res.data || [];
    },
    staleTime: 1000 * 60 * 5,
    placeholderData: (prev) => prev
  });

  const feedbacksQuery = useQuery({
    queryKey: ['performance', 'feedbacks'],
    queryFn: async () => {
      const res = await performanceApi.getFeedbacks().catch(() => ({ data: [] }));
      return res.data || [];
    },
    staleTime: 1000 * 60 * 2,
    placeholderData: (prev) => prev
  });

  const employeesQuery = useQuery({
    queryKey: ['employees', 'list'],
    queryFn: async () => {
      const res = await apiClient.get('/employees');
      return res.data?.data || [];
    },
    enabled: !!showFeedbackModal,
    staleTime: 1000 * 60 * 10,
    placeholderData: (prev) => prev
  });

  const cycles = cyclesQuery.data || [];
  const goals = goalsQuery.data || [];
  const reviews = reviewsQuery.data || [];
  const feedbacks = feedbacksQuery.data || [];
  const employeesList = employeesQuery.data || [];

  const goalsLoading = goalsQuery.isLoading && !goals.length;
  const reviewsLoading = reviewsQuery.isLoading && !reviews.length;
  const cyclesLoading = cyclesQuery.isLoading && !cycles.length;
  const feedbacksLoading = feedbacksQuery.isLoading && !feedbacks.length;

  const error = (goalsQuery.error || reviewsQuery.error || cyclesQuery.error)?.friendlyMessage || null;

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams(prev => {
      const p = new URLSearchParams(prev);
      p.set('tab', tab);
      return p;
    }, { replace: true });
  };

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      if (tabParam === 'cycles' && !isAdmin) {
        setActiveTab('goals');
      } else if (['goals', 'reviews', 'cycles', 'kudos'].includes(tabParam)) {
        setActiveTab(tabParam);
      }
    }
  }, [searchParams, isAdmin]);

  // Handle Add Goal
  async function handleAddGoal(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await performanceApi.createGoal({
        ...goalForm,
        cycleId: cycles[0]?.id || null
      });
      setSuccessMsg('Goal added successfully.');
      setShowGoalModal(false);
      setGoalForm({
        title: '',
        description: '',
        category: 'TECHNICAL',
        targetMetric: '',
        weightage: 25,
        dueDate: ''
      });
      queryClient.invalidateQueries({ queryKey: ['performance'] });
    } catch (err) {
      alert(err.friendlyMessage || err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // Handle Update Goal Progress
  async function handleProgressChange(goalId, newProgress) {
    try {
      await performanceApi.updateGoalProgress(goalId, {
        progress: newProgress,
        currentProgress: newProgress
      });
      queryClient.invalidateQueries({ queryKey: ['performance'] });
    } catch (err) {
      alert(err.friendlyMessage || err.message);
    }
  }

  // Handle Self Review
  async function handleSubmitSelfReview(e) {
    e.preventDefault();
    if (!cycles[0]) {
      alert('No active appraisal cycle.');
      return;
    }
    setSubmitting(true);
    try {
      await performanceApi.submitSelfReview({
        cycleId: cycles[0].id,
        employeeId: currentUser.employeeId,
        selfRating: parseFloat(selfReviewForm.selfRating),
        selfAssessment: selfReviewForm.selfAssessment
      });
      setSuccessMsg('Self-assessment submitted to manager.');
      setShowSelfReviewModal(false);
      queryClient.invalidateQueries({ queryKey: ['performance'] });
    } catch (err) {
      alert(err.friendlyMessage || err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // Handle Manager Evaluation
  async function handleSubmitManagerEval(e) {
    e.preventDefault();
    if (!selectedReview) return;
    setSubmitting(true);
    try {
      await performanceApi.evaluateReview(selectedReview.id, {
        managerRating: parseFloat(managerEvalForm.managerRating),
        managerFeedback: managerEvalForm.managerFeedback,
        strengths: managerEvalForm.strengths,
        improvements: managerEvalForm.improvements
      });
      setSuccessMsg('Manager evaluation submitted.');
      setShowManagerEvalModal(false);
      queryClient.invalidateQueries({ queryKey: ['performance'] });
    } catch (err) {
      alert(err.friendlyMessage || err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // Handle Acknowledge
  async function handleAcknowledge(reviewId) {
    try {
      await performanceApi.acknowledgeReview(reviewId);
      setSuccessMsg('Appraisal acknowledged.');
      queryClient.invalidateQueries({ queryKey: ['performance'] });
    } catch (err) {
      alert(err.friendlyMessage || err.message);
    }
  }

  // Handle Kudos
  async function handleSendFeedback(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await performanceApi.createFeedback(feedbackForm);
      setSuccessMsg('Kudos and recognition posted successfully!');
      setShowFeedbackModal(false);
      setFeedbackForm({
        toEmployeeId: employeesList[0]?.employeeId || 'EMP002',
        feedbackType: 'Praise / Kudos',
        badge: 'Code Ninja ⚡',
        message: ''
      });
      queryClient.invalidateQueries({ queryKey: ['performance'] });
    } catch (err) {
      alert(err.friendlyMessage || err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleLike(id) {
    try {
      await performanceApi.toggleFeedbackLike(id);
      queryClient.invalidateQueries({ queryKey: ['performance'] });
    } catch (err) {
      console.error(err);
    }
  }

  const categoryBadges = {
    TECHNICAL: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    LEADERSHIP: 'bg-violet-50 text-violet-700 border-violet-200',
    OPERATIONAL: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    INNOVATION: 'bg-amber-50 text-amber-800 border-amber-200',
    SOFT_SKILLS: 'bg-slate-100 text-slate-700 border-slate-200'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Performance & Appraisal Management
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Track individual goals, KPI progression, 360 appraisal cycles, and manager feedback.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowGoalModal(true)}
            className="thyo-btn-primary"
          >
            <Plus className="w-4 h-4" />
            Add Goal
          </button>

          <button
            onClick={() => setShowSelfReviewModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            <Star className="w-4 h-4" />
            Submit Self-Review
          </button>

          <button
            onClick={() => setShowFeedbackModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            Give Kudos
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-medium text-emerald-800 flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold">Dismiss</button>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-800 flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['performance'] })}
            className="px-2.5 py-1 bg-white border border-rose-200 rounded-lg text-rose-700 hover:bg-rose-100 text-xs font-semibold cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Active Cycle Banner (Matches Team Sidebar Gradient) */}
      {cycles[0] && (
        <div className="p-5 bg-gradient-to-r from-[#171936] via-[#172554] to-[#312e81] text-white rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 border border-indigo-300/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-white/10 text-indigo-200 rounded-full text-[10px] font-bold border border-white/15">
                {cycles[0].cycleType}
              </span>
              <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                ACTIVE CYCLE
              </span>
            </div>
            <h3 className="text-lg font-bold mt-1.5 text-white">{cycles[0].title}</h3>
            <p className="text-xs text-slate-300 mt-0.5">{cycles[0].description}</p>
          </div>
          <div className="text-xs text-right text-indigo-100">
            <div><strong>Period:</strong> {new Date(cycles[0].startDate).toLocaleDateString()} – {new Date(cycles[0].endDate).toLocaleDateString()}</div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-2xl px-4 pt-2 gap-2 overflow-x-auto">
        <button
          onClick={() => handleTabChange('goals')}
          className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'goals'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Target className="w-4 h-4" />
          Key Performance Goals ({goals.length})
        </button>

        <button
          onClick={() => handleTabChange('reviews')}
          className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'reviews'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          Appraisal Reviews ({reviews.length})
        </button>

        <button
          onClick={() => handleTabChange('kudos')}
          className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'kudos'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          Kudos & Recognition ({feedbacks.length})
        </button>

        {isAdmin && (
          <button
            onClick={() => handleTabChange('cycles')}
            className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'cycles'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4 text-violet-500" />
            Appraisal Cycles ({cycles.length})
          </button>
        )}
      </div>

      {/* TAB 1: GOALS */}
      {activeTab === 'goals' && (
        goalsLoading ? (
          <SkeletonCard count={2} />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {goals.map(goal => (
                <div key={goal.id} className="thyo-card p-5 hover:border-indigo-200 transition-all">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${categoryBadges[goal.category] || categoryBadges.OPERATIONAL}`}>
                      {goal.category}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${goal.status === 'ACHIEVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'}`}>
                      {goal.status}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 leading-snug">{goal.title}</h3>
                  <p className="text-xs text-slate-600 mt-1 mb-3">{goal.description || 'No additional description provided.'}</p>

                  {goal.targetMetric && (
                    <div className="text-[11px] font-medium text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100 mb-3">
                      <strong>Target Metric:</strong> {goal.targetMetric} (Weight: {goal.weightage}%)
                    </div>
                  )}

                  {/* Progress Bar & Slider */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-600">Attainment</span>
                      <span className="font-bold text-indigo-600">{goal.currentProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${goal.currentProgress >= 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-indigo-600 to-violet-600'}`}
                        style={{ width: `${goal.currentProgress}%` }}
                      />
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={goal.currentProgress}
                      onChange={e => handleProgressChange(goal.id, parseInt(e.target.value, 10))}
                      className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer mt-2 accent-indigo-600"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {/* TAB 2: REVIEWS */}
      {activeTab === 'reviews' && (
        reviewsLoading ? (
          <SkeletonTable rows={4} cols={4} />
        ) : (
          <div className="space-y-4">
            <div className="thyo-table-wrap">
              <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Appraisal History & Reviews</h3>
                <span className="text-xs text-slate-500">Cycle: {cycles[0]?.title || 'Annual 2026'}</span>
              </div>

              <div className="divide-y divide-slate-100">
                {reviews.map(rev => (
                  <div key={rev.id} className="p-5 thyo-tr">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900">{rev.employee?.fullName || 'Employee'}</h4>
                          <span className="text-xs text-slate-400">({rev.employee?.department || 'Dept'} • {rev.employee?.position || 'Role'})</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Reviewer: {rev.reviewer?.fullName || 'Manager'} • Status: <span className="font-bold text-indigo-600">{rev.status}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        {rev.finalScore && (
                          <div className="text-right">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Final Score</span>
                            <div className="text-lg font-extrabold text-emerald-600 flex items-center gap-1">
                              <Star className="w-4 h-4 fill-emerald-500 text-emerald-500" />
                              {rev.finalScore} / 5.0
                            </div>
                          </div>
                        )}

                        {/* Action buttons */}
                        {isManagerOrAdmin && ['SUBMITTED', 'MANAGER REVIEW PENDING', 'SELF-REVIEW PENDING'].includes(String(rev.status || '').toUpperCase()) && (
                          <button
                            onClick={() => {
                              setSelectedReview(rev);
                              setShowManagerEvalModal(true);
                            }}
                            className="thyo-btn-primary py-1.5 px-3"
                          >
                            Evaluate Employee
                          </button>
                        )}

                        {['REVIEWED', 'COMPLETED'].includes(String(rev.status || '').toUpperCase()) && !rev.acknowledgedAt && rev.employeeId === currentUser?.employeeId && (
                          <button
                            onClick={() => handleAcknowledge(rev.id)}
                            className="px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                          >
                            Acknowledge Appraisal
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Feedback Details */}
                    {(rev.selfAssessment || rev.managerFeedback) && (
                      <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        {rev.selfAssessment && (
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                            <span className="font-bold text-slate-700 block mb-1">Self Assessment (Rating: {rev.selfRating || 'N/A'}/5)</span>
                            <p className="text-slate-600 italic">"{rev.selfAssessment}"</p>
                          </div>
                        )}
                        {rev.managerFeedback && (
                          <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-200">
                            <span className="font-bold text-indigo-900 block mb-1">Manager Feedback (Rating: {rev.managerRating || 'N/A'}/5)</span>
                            <p className="text-indigo-800">"{rev.managerFeedback}"</p>
                            {rev.strengths && <div className="mt-2 text-slate-700"><strong>Strengths:</strong> {rev.strengths}</div>}
                            {rev.improvements && <div className="mt-1 text-slate-700"><strong>Growth Areas:</strong> {rev.improvements}</div>}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      )}

      {/* TAB 3: CONTINUOUS FEEDBACK & KUDOS */}
      {activeTab === 'kudos' && (
        feedbacksLoading ? (
          <SkeletonCard count={2} />
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-amber-500 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-amber-900">Peer Recognition & Continuous Feedback Wall</h4>
                  <p className="text-[11px] text-amber-700">Celebrate team milestones, award achievement badges, and share recognition across THYO SOFTECH.</p>
                </div>
              </div>
              <button
                onClick={() => setShowFeedbackModal(true)}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
              >
                Give Kudos
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {feedbacks.length === 0 ? (
                <div className="col-span-2 p-12 thyo-card text-center text-xs text-slate-500">
                  No kudos submitted yet. Be the first to recognize a colleague!
                </div>
              ) : (
                feedbacks.map((fb) => (
                  <div key={fb.id} className="thyo-card p-5 flex flex-col justify-between hover:border-amber-300 transition-all">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-900 border border-amber-200">
                          {fb.badge}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {fb.date || new Date(fb.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <p className="text-xs text-slate-700 italic my-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        "{fb.message}"
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                      <div>
                        <span className="text-slate-400">From:</span> <strong className="text-slate-700">{fb.fromEmployeeName || fb.fromEmployeeId}</strong>
                        <span className="mx-1 text-slate-300">→</span>
                        <span className="text-slate-400">To:</span> <strong className="text-indigo-600">{fb.toEmployeeName || fb.toEmployeeId}</strong>
                      </div>

                      <button
                        onClick={() => handleToggleLike(fb.id)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-pink-50 hover:text-pink-600 text-slate-600 text-xs font-bold transition-colors cursor-pointer"
                      >
                        <Heart className="w-3.5 h-3.5 fill-current text-pink-500" />
                        <span>{fb.likes || 0}</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )
      )}

      {/* TAB 4: APPRAISAL CYCLES (ADMIN ONLY) */}
      {activeTab === 'cycles' && isAdmin && (
        cyclesLoading ? (
          <SkeletonCard count={2} />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cycles.map(cycle => (
                <div key={cycle.id} className="thyo-card p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-violet-700 bg-violet-50 border border-violet-100 px-2.5 py-0.5 rounded-full">
                        {cycle.cycleType || 'Appraisal Cycle'}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 mt-2">{cycle.title || cycle.name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{cycle.description}</p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${cycle.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                      {cycle.status}
                    </span>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <div><strong>Start Date:</strong> {new Date(cycle.startDate).toLocaleDateString()}</div>
                    <div><strong>End Date:</strong> {new Date(cycle.endDate).toLocaleDateString()}</div>
                    {cycle.reviewDeadline && (
                      <div className="col-span-2 text-violet-700"><strong>Review Deadline:</strong> {new Date(cycle.reviewDeadline).toLocaleDateString()}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {/* GIVE KUDOS MODAL */}
      <Modal isOpen={showFeedbackModal} onClose={() => setShowFeedbackModal(false)} title="Recognize Colleague (Give Kudos)">
        <form onSubmit={handleSendFeedback} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Select Colleague</label>
            <select
              value={feedbackForm.toEmployeeId}
              onChange={e => setFeedbackForm({ ...feedbackForm, toEmployeeId: e.target.value })}
              className="thyo-input"
            >
              {employeesList.length > 0 ? (
                employeesList.map(emp => (
                  <option key={emp.employeeId} value={emp.employeeId}>
                    {emp.fullName} ({emp.designation || emp.position || emp.department})
                  </option>
                ))
              ) : (
                <option value={feedbackForm.toEmployeeId}>Loading colleagues...</option>
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Achievement Badge</label>
            <select
              value={feedbackForm.badge}
              onChange={e => setFeedbackForm({ ...feedbackForm, badge: e.target.value })}
              className="thyo-input"
            >
              <option value="Code Ninja ⚡">Code Ninja ⚡</option>
              <option value="Design Champion 🎨">Design Champion 🎨</option>
              <option value="Bug Hunter 🛡️">Bug Hunter 🛡️</option>
              <option value="Reliability Hero 🚀">Reliability Hero 🚀</option>
              <option value="Team Mentor 🌟">Team Mentor 🌟</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Recognition Message</label>
            <textarea
              rows={3}
              required
              placeholder="What exceptional contribution would you like to celebrate?"
              value={feedbackForm.message}
              onChange={e => setFeedbackForm({ ...feedbackForm, message: e.target.value })}
              className="thyo-input"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowFeedbackModal(false)}
              className="thyo-btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              {submitting ? 'Sending...' : 'Send Kudos'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ADD GOAL MODAL */}
      <Modal isOpen={showGoalModal} onClose={() => setShowGoalModal(false)} title="Add Performance Goal">
        <form onSubmit={handleAddGoal} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Goal Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Optimize Database Latency & Reliability"
              value={goalForm.title}
              onChange={e => setGoalForm({ ...goalForm, title: e.target.value })}
              className="thyo-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
              <select
                value={goalForm.category}
                onChange={e => setGoalForm({ ...goalForm, category: e.target.value })}
                className="thyo-input"
              >
                <option value="TECHNICAL">Technical</option>
                <option value="LEADERSHIP">Leadership</option>
                <option value="OPERATIONAL">Operational</option>
                <option value="INNOVATION">Innovation</option>
                <option value="SOFT_SKILLS">Soft Skills</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Weightage (%)</label>
              <input
                type="number"
                min="5"
                max="100"
                value={goalForm.weightage}
                onChange={e => setGoalForm({ ...goalForm, weightage: parseInt(e.target.value, 10) })}
                className="thyo-input"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Target Metric / Deliverable</label>
            <input
              type="text"
              placeholder="e.g. 99.9% uptime, 5 core features delivered"
              value={goalForm.targetMetric}
              onChange={e => setGoalForm({ ...goalForm, targetMetric: e.target.value })}
              className="thyo-input"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
            <textarea
              rows={3}
              placeholder="Detail specific milestones and objectives..."
              value={goalForm.description}
              onChange={e => setGoalForm({ ...goalForm, description: e.target.value })}
              className="thyo-input"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowGoalModal(false)}
              className="thyo-btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="thyo-btn-primary"
            >
              {submitting ? 'Adding...' : 'Save Goal'}
            </button>
          </div>
        </form>
      </Modal>

      {/* SUBMIT SELF REVIEW MODAL */}
      <Modal isOpen={showSelfReviewModal} onClose={() => setShowSelfReviewModal(false)} title="Submit Self-Assessment">
        <form onSubmit={handleSubmitSelfReview} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Self Rating (1.0 to 5.0)</label>
            <input
              type="number"
              min="1.0"
              max="5.0"
              step="0.1"
              required
              value={selfReviewForm.selfRating}
              onChange={e => setSelfReviewForm({ ...selfReviewForm, selfRating: e.target.value })}
              className="thyo-input"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Self Assessment & Achievements</label>
            <textarea
              required
              rows={4}
              placeholder="Highlight major achievements, initiatives delivered, challenges resolved..."
              value={selfReviewForm.selfAssessment}
              onChange={e => setSelfReviewForm({ ...selfReviewForm, selfAssessment: e.target.value })}
              className="thyo-input"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowSelfReviewModal(false)}
              className="thyo-btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="thyo-btn-primary"
            >
              {submitting ? 'Submitting...' : 'Submit Appraisal'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MANAGER EVALUATION MODAL */}
      <Modal isOpen={showManagerEvalModal} onClose={() => setShowManagerEvalModal(false)} title={`Evaluate ${selectedReview?.employee?.fullName || 'Employee'}`}>
        <form onSubmit={handleSubmitManagerEval} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Manager Rating (1.0 to 5.0)</label>
            <input
              type="number"
              min="1.0"
              max="5.0"
              step="0.1"
              required
              value={managerEvalForm.managerRating}
              onChange={e => setManagerEvalForm({ ...managerEvalForm, managerRating: e.target.value })}
              className="thyo-input"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Manager Feedback</label>
            <textarea
              required
              rows={3}
              placeholder="Provide constructive feedback on quality of work, team impact, and velocity..."
              value={managerEvalForm.managerFeedback}
              onChange={e => setManagerEvalForm({ ...managerEvalForm, managerFeedback: e.target.value })}
              className="thyo-input"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Key Strengths</label>
            <input
              type="text"
              placeholder="e.g. Strong problem solving, dependable ownership"
              value={managerEvalForm.strengths}
              onChange={e => setManagerEvalForm({ ...managerEvalForm, strengths: e.target.value })}
              className="thyo-input"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Development / Growth Areas</label>
            <input
              type="text"
              placeholder="e.g. Expand automated testing coverage"
              value={managerEvalForm.improvements}
              onChange={e => setManagerEvalForm({ ...managerEvalForm, improvements: e.target.value })}
              className="thyo-input"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowManagerEvalModal(false)}
              className="thyo-btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="thyo-btn-primary"
            >
              {submitting ? 'Submitting...' : 'Complete Evaluation'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
