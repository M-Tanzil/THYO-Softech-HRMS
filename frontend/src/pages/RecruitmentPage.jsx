import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Briefcase,
  Users,
  Calendar,
  Award,
  Plus,
  Search,
  Filter,
  CheckCircle,
  Clock,
  MapPin,
  Building,
  UserCheck,
  ChevronRight,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { recruitmentApi } from '../api/student5Api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/common/Modal';
import { SkeletonCard, SkeletonTable } from '../components/common/SkeletonLoader';

export default function RecruitmentPage() {
  const { currentUser, isManagerOrAdmin, isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const isEmployee = !isManagerOrAdmin;

  const [activeTab, setActiveTab] = useState(() => {
    const tabParam = searchParams.get('tab');
    if (isEmployee) return 'jobs';
    if (!isAdmin && tabParam === 'offers') return 'jobs';
    if (tabParam && ['jobs', 'candidates', 'interviews', 'offers'].includes(tabParam)) return tabParam;
    return 'jobs';
  });

  // Modals
  const [showJobModal, setShowJobModal] = useState(false);
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);

  // Form states
  const [jobForm, setJobForm] = useState({
    title: '',
    department: 'IT',
    branch: 'Bangalore HQ',
    position: '',
    jobType: 'FULL_TIME',
    experience: '2-5 years',
    openings: 1,
    salaryRange: '',
    description: '',
    requirements: ''
  });

  const [interviewForm, setInterviewForm] = useState({
    roundName: 'Technical Round 1',
    interviewerId: currentUser?.employeeId || 'EMP001',
    interviewDate: '',
    durationMinutes: 45,
    mode: 'ONLINE',
    meetingLink: 'https://teams.microsoft.com/l/meetup-join/thyo-ats'
  });

  const [offerForm, setOfferForm] = useState({
    offeredSalary: '₹14,00,000 per annum',
    designation: '',
    department: '',
    branch: 'Bangalore HQ',
    joiningDate: '',
    notes: 'Standard 30-day notice period accepted.'
  });

  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Modular TanStack React Query for cached ATS data
  const jobsQuery = useQuery({
    queryKey: ['recruitment', 'jobs'],
    queryFn: async () => {
      const res = await recruitmentApi.getJobs();
      return res.data || [];
    },
    staleTime: 1000 * 60 * 3,
    placeholderData: (prev) => prev
  });

  const applicationsQuery = useQuery({
    queryKey: ['recruitment', 'applications'],
    queryFn: async () => {
      const res = await recruitmentApi.getApplications();
      return res.data || [];
    },
    enabled: !!isManagerOrAdmin,
    staleTime: 1000 * 60 * 2,
    placeholderData: (prev) => prev
  });

  const jobs = jobsQuery.data || [];
  const applications = applicationsQuery.data || [];
  const jobsLoading = jobsQuery.isLoading && !jobs.length;
  const appsLoading = applicationsQuery.isLoading && !applications.length;
  const error = (jobsQuery.error || applicationsQuery.error)?.friendlyMessage || null;

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
      if (isEmployee) {
        setActiveTab('jobs');
      } else if (tabParam === 'offers' && !isAdmin) {
        setActiveTab('jobs');
      } else if (['jobs', 'candidates', 'interviews', 'offers'].includes(tabParam)) {
        setActiveTab(tabParam);
      }
    }
  }, [searchParams, isEmployee, isAdmin]);

  // Handle Create Job
  async function handleCreateJob(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await recruitmentApi.createJob(jobForm);
      setSuccessMsg('Job requisition published successfully.');
      setShowJobModal(false);
      setJobForm({
        title: '',
        department: 'IT',
        branch: 'Bangalore HQ',
        position: '',
        jobType: 'FULL_TIME',
        experience: '2-5 years',
        openings: 1,
        salaryRange: '',
        description: '',
        requirements: ''
      });
      queryClient.invalidateQueries({ queryKey: ['recruitment'] });
    } catch (err) {
      alert(err.friendlyMessage || err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // Handle Update Stage
  async function handleUpdateStage(appId, newStatus) {
    try {
      await recruitmentApi.updateStage(appId, { status: newStatus });
      setSuccessMsg(`Candidate moved to ${newStatus}.`);
      queryClient.invalidateQueries({ queryKey: ['recruitment'] });
    } catch (err) {
      alert(err.friendlyMessage || err.message);
    }
  }

  // Handle Schedule Interview
  async function handleScheduleInterview(e) {
    e.preventDefault();
    if (!selectedApp) return;
    setSubmitting(true);
    try {
      await recruitmentApi.scheduleInterview({
        applicationId: selectedApp.id,
        ...interviewForm
      });
      setSuccessMsg('Interview scheduled and notification dispatched.');
      setShowInterviewModal(false);
      queryClient.invalidateQueries({ queryKey: ['recruitment'] });
    } catch (err) {
      alert(err.friendlyMessage || err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // Handle Create Offer
  async function handleCreateOffer(e) {
    e.preventDefault();
    if (!selectedApp) return;
    setSubmitting(true);
    try {
      await recruitmentApi.createOffer({
        applicationId: selectedApp.id,
        ...offerForm
      });
      setSuccessMsg('Offer extended successfully.');
      setShowOfferModal(false);
      queryClient.invalidateQueries({ queryKey: ['recruitment'] });
    } catch (err) {
      alert(err.friendlyMessage || err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // Handle 1-Click Hire (Integrates with Employee model!)
  async function handleHireCandidate(app) {
    const candidateName = app.candidate?.fullName || 'this candidate';
    if (!window.confirm(`Are you sure you want to hire ${candidateName}? This will automatically create an Employee record in the central HRMS database.`)) {
      return;
    }
    try {
      const res = await recruitmentApi.hireCandidate({
        applicationId: app.id,
        department: app.offer?.department || app.jobPosting?.department,
        designation: app.offer?.designation || app.jobPosting?.position
      });
      const newEmpId = res?.data?.officialEmployeeId || res?.data?.employee?.employeeId || res?.employee?.employeeId || 'New ID';
      setSuccessMsg(`Candidate hired successfully! Employee ID: ${newEmpId}`);
      queryClient.invalidateQueries({ queryKey: ['recruitment'] });
    } catch (err) {
      alert(err.friendlyMessage || err.message);
    }
  }

  const normStage = (s) => {
    const u = String(s || 'APPLIED').toUpperCase();
    return u === 'INTERVIEW' ? 'INTERVIEWING' : u;
  };

  const stageBadges = {
    APPLIED: 'bg-slate-100 text-slate-700 border-slate-200',
    SCREENING: 'bg-blue-50 text-blue-700 border-blue-200',
    INTERVIEWING: 'bg-amber-50 text-amber-700 border-amber-200',
    OFFERED: 'bg-purple-50 text-purple-700 border-purple-200',
    HIRED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    REJECTED: 'bg-rose-50 text-rose-700 border-rose-200'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Recruitment & Applicant Tracking (ATS)
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Manage job requisitions, candidate pipelines, interview scheduling, and employee hiring.
            </p>
          </div>
        </div>

        {isManagerOrAdmin && (
          <button
            onClick={() => setShowJobModal(true)}
            className="thyo-btn-primary"
          >
            <Plus className="w-4 h-4" />
            Create Job Requisition
          </button>
        )}
      </div>

      {/* Success Banner */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-medium text-emerald-800 flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold">Dismiss</button>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-800 flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['recruitment'] })}
            className="px-2.5 py-1 bg-white border border-rose-200 rounded-lg text-rose-700 hover:bg-rose-100 text-xs font-semibold cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-2xl px-4 pt-2 gap-2 overflow-x-auto">
        <button
          onClick={() => handleTabChange('jobs')}
          className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'jobs'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          Job Openings ({jobs.length})
        </button>

        {isManagerOrAdmin && (
          <button
            onClick={() => handleTabChange('candidates')}
            className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'candidates'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            Candidate Pipeline ({applications.length})
          </button>
        )}

        {isManagerOrAdmin && (
          <button
            onClick={() => handleTabChange('interviews')}
            className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'interviews'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Scheduled Interviews
          </button>
        )}

        {isAdmin && (
          <button
            onClick={() => handleTabChange('offers')}
            className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'offers'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Award className="w-4 h-4" />
            Offers & Hiring Integration
          </button>
        )}
      </div>

      {/* TAB CONTENT 1: JOB OPENINGS */}
      {activeTab === 'jobs' && (
        jobsLoading ? (
          <SkeletonCard count={3} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {jobs.map(job => (
              <div key={job.id} className="thyo-card p-5 hover:border-indigo-300 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{job.requisitionId}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${['OPEN', 'ACTIVE'].includes(String(job.status || '').toUpperCase()) ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      {job.status}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 leading-snug">{job.title}</h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-2 mb-3">
                    <span className="flex items-center gap-1"><Building className="w-3.5 h-3.5 text-slate-400" />{job.department}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" />{job.branch}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-slate-400" />{job.experience}</span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-3 mb-4">{job.description}</p>
                </div>

                <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                  <span className="text-xs font-semibold text-indigo-600">
                    {job._count?.applications || 0} Applicants
                  </span>
                  <span className="text-xs font-medium text-slate-500">
                    {job.salaryRange || 'Competitive'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* TAB CONTENT 2: CANDIDATE PIPELINE */}
      {activeTab === 'candidates' && isManagerOrAdmin && (
        appsLoading ? (
          <SkeletonTable rows={5} columns={5} />
        ) : (
          <div className="thyo-table-wrap">
          <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Active Pipeline ({applications.length})</h3>
            <span className="text-xs text-slate-500">Stages: Applied ➔ Screening ➔ Interviewing ➔ Offered ➔ Hired</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="thyo-thead">
                <tr>
                  <th className="py-3 px-4">Candidate</th>
                  <th className="py-3 px-4">Role Applied</th>
                  <th className="py-3 px-4">Experience</th>
                  <th className="py-3 px-4">Current Stage</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {applications.map(app => {
                  const stageKey = normStage(app.status);
                  return (
                  <tr key={app.id} className="thyo-tr">
                    <td className="py-3.5 px-4 font-medium text-slate-900">
                      <div>{app.candidate?.fullName || 'Candidate'}</div>
                      <div className="text-[11px] text-slate-400">{app.candidate?.email || 'No email'} • {app.candidate?.phone || 'No phone'}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <div>{app.jobPosting?.title || 'Open Role'}</div>
                      <div className="text-[10px] text-slate-400">{app.jobPosting?.department || 'Department'} • {app.jobPosting?.requisitionId || 'REQ'}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <div>{app.candidate?.totalExpYears ?? 0} yrs exp</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-xs">{app.candidate?.skills || 'N/A'}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${stageBadges[stageKey] || stageBadges.APPLIED}`}>
                        {app.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      {isManagerOrAdmin && stageKey !== 'HIRED' && stageKey !== 'REJECTED' && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedApp(app);
                              setShowInterviewModal(true);
                            }}
                            className="px-3 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            Schedule Interview
                          </button>

                          {isAdmin && stageKey === 'INTERVIEWING' && (
                            <button
                              onClick={() => {
                                setSelectedApp(app);
                                setOfferForm(prev => ({ ...prev, designation: app.jobPosting?.position || '', department: app.jobPosting?.department || '' }));
                                setShowOfferModal(true);
                              }}
                              className="px-3 py-1 bg-violet-50 text-violet-700 hover:bg-violet-100 rounded-xl text-[11px] font-semibold transition-colors cursor-pointer"
                            >
                              Extend Offer
                            </button>
                          )}

                          {isAdmin && stageKey === 'OFFERED' && (
                            <button
                              onClick={() => handleHireCandidate(app)}
                              className="px-3 py-1 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-[11px] font-bold shadow-xs transition-colors cursor-pointer"
                            >
                              Complete Hiring
                            </button>
                          )}
                        </>
                      )}
                      {stageKey === 'HIRED' && (
                        <span className="text-[11px] font-bold text-emerald-600 flex items-center justify-end gap-1">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Hired as {app.hiredEmployee?.employeeId}
                        </span>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        )
      )}

      {/* TAB CONTENT 3: INTERVIEWS */}
      {activeTab === 'interviews' && isManagerOrAdmin && (
        appsLoading ? (
          <SkeletonCard count={2} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {applications.flatMap(app => (app.interviews || []).map(interview => ({
            ...interview,
            candidate: app.candidate || {},
            jobTitle: app.jobPosting?.title || 'Open Position'
          }))).map(item => (
            <div key={item.id} className="thyo-card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full">
                    {item.roundName || 'Interview'}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 mt-2">{item.candidate?.fullName || 'Candidate'}</h4>
                  <p className="text-xs text-slate-500">{item.jobTitle}</p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {item.status}
                </span>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{item.interviewDate ? new Date(item.interviewDate).toLocaleString() : 'Date Pending'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{item.durationMinutes} Minutes ({item.mode})</span>
                </div>
              </div>

              {item.meetingLink && (
                <div className="mt-3">
                  <a
                    href={item.meetingLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-indigo-600 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open Interview Meeting
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
        )
      )}

      {/* TAB CONTENT 4: OFFERS & HIRING */}
      {activeTab === 'offers' && isAdmin && (
        appsLoading ? (
          <SkeletonCard count={2} />
        ) : (
          <div className="space-y-4">
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-xs text-emerald-900">
            <h4 className="font-bold mb-1 flex items-center gap-1.5"><UserCheck className="w-4 h-4 text-emerald-600" /> Zero Duplicate Employee Architecture</h4>
            When an offer is accepted and you click <strong>Complete Hiring</strong>, the candidate is automatically converted into an active <strong>Employee</strong> in PostgreSQL with an auto-generated sequential Employee ID (e.g. EMP010) and User credentials. Existing employee profiles are reused to guarantee zero duplicates!
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {applications.filter(a => a.offer || ['OFFERED', 'HIRED'].includes(normStage(a.status))).map(app => {
              const stageKey = normStage(app.status);
              return (
              <div key={app.id} className="thyo-card p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{app.candidate?.fullName || 'Candidate'}</h4>
                    <p className="text-xs text-slate-500">{app.offer?.designation || app.jobPosting?.title || 'Open Position'}</p>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${stageKey === 'HIRED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-violet-50 text-violet-700 border border-violet-200'}`}>
                    {app.status}
                  </span>
                </div>

                <div className="mt-3 text-xs text-slate-600 space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div><strong>Offered CTC:</strong> {app.offer?.offeredSalary || '₹14,00,000 PA'}</div>
                  <div><strong>Joining Date:</strong> {app.offer?.joiningDate ? new Date(app.offer.joiningDate).toLocaleDateString() : 'Immediate'}</div>
                  <div><strong>Branch:</strong> {app.offer?.branch || app.jobPosting?.branch || 'HQ'}</div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  {stageKey === 'OFFERED' ? (
                    <button
                      onClick={() => handleHireCandidate(app)}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <UserCheck className="w-4 h-4" />
                      Complete Hiring (Sync to Core Employee System)
                    </button>
                  ) : (
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      Employee Synced ({app.hiredEmployee?.employeeId})
                    </span>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        </div>
        )
      )}

      {/* CREATE JOB MODAL */}
      <Modal isOpen={showJobModal} onClose={() => setShowJobModal(false)} title="Create New Job Requisition">
        <form onSubmit={handleCreateJob} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Job Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Senior Software Engineer"
              value={jobForm.title}
              onChange={e => setJobForm({ ...jobForm, title: e.target.value })}
              className="thyo-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
              <select
                value={jobForm.department}
                onChange={e => setJobForm({ ...jobForm, department: e.target.value })}
                className="thyo-input"
              >
                <option value="IT">IT</option>
                <option value="Sales">Sales</option>
                <option value="HR">HR</option>
                <option value="Operations">Operations</option>
                <option value="Management">Management</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Branch</label>
              <select
                value={jobForm.branch}
                onChange={e => setJobForm({ ...jobForm, branch: e.target.value })}
                className="thyo-input"
              >
                <option value="Bangalore HQ">Bangalore HQ</option>
                <option value="Mumbai Regional Office">Mumbai Regional Office</option>
                <option value="Delhi NCR Tech Center">Delhi NCR Tech Center</option>
                <option value="Bhubaneswar Development Center">Bhubaneswar Development Center</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Position / Designation</label>
              <input
                type="text"
                required
                placeholder="e.g. Software Engineer"
                value={jobForm.position}
                onChange={e => setJobForm({ ...jobForm, position: e.target.value })}
                className="thyo-input"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Experience</label>
              <input
                type="text"
                required
                placeholder="e.g. 2-5 years"
                value={jobForm.experience}
                onChange={e => setJobForm({ ...jobForm, experience: e.target.value })}
                className="thyo-input"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Salary Range</label>
            <input
              type="text"
              placeholder="e.g. ₹12,00,000 - ₹18,00,000 PA"
              value={jobForm.salaryRange}
              onChange={e => setJobForm({ ...jobForm, salaryRange: e.target.value })}
              className="thyo-input"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Job Description</label>
            <textarea
              required
              rows={3}
              placeholder="Key responsibilities and project context..."
              value={jobForm.description}
              onChange={e => setJobForm({ ...jobForm, description: e.target.value })}
              className="thyo-input"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Requirements</label>
            <textarea
              required
              rows={3}
              placeholder="Required skills, education, certifications..."
              value={jobForm.requirements}
              onChange={e => setJobForm({ ...jobForm, requirements: e.target.value })}
              className="thyo-input"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowJobModal(false)}
              className="thyo-btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="thyo-btn-primary"
            >
              {submitting ? 'Publishing...' : 'Publish Requisition'}
            </button>
          </div>
        </form>
      </Modal>

      {/* SCHEDULE INTERVIEW MODAL */}
      <Modal isOpen={showInterviewModal} onClose={() => setShowInterviewModal(false)} title={`Schedule Interview for ${selectedApp?.candidate?.fullName || 'Candidate'}`}>
        <form onSubmit={handleScheduleInterview} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Round Title</label>
            <input
              type="text"
              required
              value={interviewForm.roundName}
              onChange={e => setInterviewForm({ ...interviewForm, roundName: e.target.value })}
              className="thyo-input"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Date & Time</label>
            <input
              type="datetime-local"
              required
              value={interviewForm.interviewDate}
              onChange={e => setInterviewForm({ ...interviewForm, interviewDate: e.target.value })}
              className="thyo-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Duration (Mins)</label>
              <input
                type="number"
                value={interviewForm.durationMinutes}
                onChange={e => setInterviewForm({ ...interviewForm, durationMinutes: parseInt(e.target.value, 10) })}
                className="thyo-input"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mode</label>
              <select
                value={interviewForm.mode}
                onChange={e => setInterviewForm({ ...interviewForm, mode: e.target.value })}
                className="thyo-input"
              >
                <option value="ONLINE">Online (Teams / Meet)</option>
                <option value="IN_PERSON">In Person</option>
                <option value="PHONE">Phone</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Meeting Link</label>
            <input
              type="text"
              value={interviewForm.meetingLink}
              onChange={e => setInterviewForm({ ...interviewForm, meetingLink: e.target.value })}
              className="thyo-input"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowInterviewModal(false)}
              className="thyo-btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="thyo-btn-primary"
            >
              {submitting ? 'Scheduling...' : 'Confirm Schedule'}
            </button>
          </div>
        </form>
      </Modal>

      {/* EXTEND OFFER MODAL */}
      <Modal isOpen={showOfferModal} onClose={() => setShowOfferModal(false)} title={`Extend Job Offer to ${selectedApp?.candidate?.fullName || 'Candidate'}`}>
        <form onSubmit={handleCreateOffer} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Designation</label>
              <input
                type="text"
                required
                value={offerForm.designation}
                onChange={e => setOfferForm({ ...offerForm, designation: e.target.value })}
                className="thyo-input"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
              <input
                type="text"
                required
                value={offerForm.department}
                onChange={e => setOfferForm({ ...offerForm, department: e.target.value })}
                className="thyo-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Offered CTC</label>
              <input
                type="text"
                required
                placeholder="e.g. ₹15,00,000 per annum"
                value={offerForm.offeredSalary}
                onChange={e => setOfferForm({ ...offerForm, offeredSalary: e.target.value })}
                className="thyo-input"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Joining Date</label>
              <input
                type="date"
                required
                value={offerForm.joiningDate}
                onChange={e => setOfferForm({ ...offerForm, joiningDate: e.target.value })}
                className="thyo-input"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Notes / Terms</label>
            <textarea
              rows={2}
              value={offerForm.notes}
              onChange={e => setOfferForm({ ...offerForm, notes: e.target.value })}
              className="thyo-input"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowOfferModal(false)}
              className="thyo-btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="thyo-btn-primary"
            >
              {submitting ? 'Extending...' : 'Extend Offer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
