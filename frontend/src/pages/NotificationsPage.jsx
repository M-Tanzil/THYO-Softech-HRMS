import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Check,
  CheckCheck,
  AlertTriangle,
  CheckCircle2,
  Megaphone,
  Info,
  ExternalLink,
  Filter,
  Settings,
  Briefcase,
  TrendingUp,
  Home,
  Clock,
  CalendarDays
} from 'lucide-react';
import { notificationApi } from '../api/student5Api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/common/Modal';
import { SkeletonBox } from '../components/common/SkeletonLoader';

export default function NotificationsPage() {
  const { refreshNotificationsCount } = useAuth();
  const queryClient = useQueryClient();
  const [filterUnread, setFilterUnread] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Preferences Modal
  const [showPrefModal, setShowPrefModal] = useState(false);
  const [preferences, setPreferences] = useState({
    emailAlerts: true,
    wfhAlerts: true,
    recruitmentAlerts: true,
    performanceAlerts: true,
    taskAlerts: true,
    announcementAlerts: true,
    payrollAlerts: true,
    leaveAlerts: true
  });
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Load preferences with cache
  const { data: serverPrefs } = useQuery({
    queryKey: ['notificationPreferences'],
    queryFn: async () => {
      const res = await notificationApi.getPreferences();
      return res.data;
    },
    staleTime: 1000 * 60 * 10
  });

  useEffect(() => {
    if (serverPrefs) {
      setPreferences(serverPrefs);
    }
  }, [serverPrefs]);

  const {
    data: notifications = [],
    isLoading: loading,
    refetch: fetchNotifications
  } = useQuery({
    queryKey: ['notifications', filterUnread, selectedCategory],
    queryFn: async () => {
      const params = {};
      if (filterUnread) params.isRead = false;
      if (selectedCategory !== 'ALL') params.category = selectedCategory;

      const res = await notificationApi.getNotifications(params);
      if (res.success) {
        return res.data;
      }
      return [];
    },
    staleTime: 1000 * 60 * 3, // 3 minutes
    placeholderData: (prev) => prev
  });

  const handleMarkAsRead = async (id) => {
    try {
      await notificationApi.markAsRead(id);
      queryClient.setQueryData(['notifications', filterUnread, selectedCategory], (prev = []) =>
        prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
      );
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      refreshNotificationsCount();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      queryClient.setQueryData(['notifications', filterUnread, selectedCategory], (prev = []) =>
        prev.map(n => ({ ...n, isRead: true }))
      );
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      refreshNotificationsCount();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSavePreferences = async (e) => {
    e.preventDefault();
    setSavingPrefs(true);
    try {
      await notificationApi.updatePreferences(preferences);
      queryClient.setQueryData(['notificationPreferences'], preferences);
      setShowPrefModal(false);
    } catch (err) {
      alert(err.friendlyMessage || 'Failed to update preferences');
    } finally {
      setSavingPrefs(false);
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'LEAVE':
        return <CalendarDays className="w-5 h-5 text-emerald-500" />;
      case 'WFH':
        return <Home className="w-5 h-5 text-purple-500" />;
      case 'RECRUITMENT':
        return <Briefcase className="w-5 h-5 text-blue-500" />;
      case 'PERFORMANCE':
        return <TrendingUp className="w-5 h-5 text-emerald-500" />;
      case 'ANNOUNCEMENT':
        return <Megaphone className="w-5 h-5 text-indigo-700" />;
      case 'HOLIDAYS':
        return <CalendarDays className="w-5 h-5 text-amber-500" />;
      case 'TASK':
        return <CheckCircle2 className="w-5 h-5 text-indigo-600" />;
      default:
        return <Info className="w-5 h-5 text-indigo-600" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Notifications Center
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Centralized alerts from Recruitment, Performance, WFH, Announcements, Tasks, Leaves & Payroll.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowPrefModal(true)}
            className="thyo-btn-secondary"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Preferences</span>
          </button>

          <button
            onClick={() => setFilterUnread(!filterUnread)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-1.5 cursor-pointer ${
              filterUnread
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                : 'bg-white border-slate-200 text-slate-600 hover:text-indigo-700 hover:bg-indigo-50'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Unread Only</span>
          </button>

          <button
            onClick={handleMarkAllRead}
            className="thyo-btn-secondary"
          >
            <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Mark all read</span>
          </button>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {['ALL', 'LEAVE', 'WFH', 'RECRUITMENT', 'PERFORMANCE', 'ANNOUNCEMENT', 'HOLIDAYS', 'TASK'].map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all whitespace-nowrap cursor-pointer ${
              selectedCategory === cat
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 border-indigo-600 text-white shadow-xs'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700'
            }`}
          >
            {cat === 'ALL' ? 'All Alerts' : cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="thyo-card divide-y divide-slate-100 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 flex items-start gap-4">
              <SkeletonBox className="w-10 h-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <SkeletonBox className="h-4 w-32" />
                  <SkeletonBox className="h-3 w-16" />
                </div>
                <SkeletonBox className="h-3 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="thyo-card p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto mb-3 text-indigo-600">
            <Bell className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 mb-1">No notifications</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You're completely caught up! New updates across all HRMS modules will appear here in real-time.
          </p>
        </div>
      ) : (
        <div className="thyo-card divide-y divide-slate-100 overflow-hidden">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 flex items-start gap-4 transition-colors ${
                !n.isRead ? 'bg-indigo-50/40' : 'hover:bg-indigo-50/20'
              }`}
            >
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 shrink-0">
                {getCategoryIcon(n.category)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {n.category || 'SYSTEM'}
                    </span>
                    <h4 className={`text-sm ${!n.isRead ? 'font-bold text-slate-900' : 'font-semibold text-slate-800'}`}>
                      {n.title}
                    </h4>
                  </div>
                  <span className="text-xs text-slate-400 whitespace-nowrap">
                    {new Date(n.createdAt).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>

                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>

                {n.link && (
                  <div className="mt-2.5">
                    <Link
                      to={n.link}
                      onClick={() => !n.isRead && handleMarkAsRead(n.id)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
                    >
                      <span>View Related Item</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                )}
              </div>

              {!n.isRead && (
                <button
                  onClick={() => handleMarkAsRead(n.id)}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors shrink-0 cursor-pointer"
                  title="Mark as read"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* NOTIFICATION PREFERENCES MODAL */}
      <Modal isOpen={showPrefModal} onClose={() => setShowPrefModal(false)} title="Notification Preferences">
        <form onSubmit={handleSavePreferences} className="space-y-4">
          <p className="text-xs text-slate-500">
            Configure which events and system modules dispatch alerts to your notification center.
          </p>

          <div className="space-y-3 pt-2">
            <label className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:border-indigo-200 transition-colors">
              <div>
                <span className="text-xs font-bold text-slate-800 block">Leave Applications Alerts</span>
                <span className="text-[11px] text-slate-500">Leave balance, manager approvals, emergency leaves</span>
              </div>
              <input
                type="checkbox"
                checked={preferences.leaveAlerts}
                onChange={e => setPreferences({ ...preferences, leaveAlerts: e.target.checked })}
                className="w-4 h-4 accent-indigo-600 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:border-indigo-200 transition-colors">
              <div>
                <span className="text-xs font-bold text-slate-800 block">Work From Home (WFH) Alerts</span>
                <span className="text-[11px] text-slate-500">Request updates, manager approvals & rejections</span>
              </div>
              <input
                type="checkbox"
                checked={preferences.wfhAlerts}
                onChange={e => setPreferences({ ...preferences, wfhAlerts: e.target.checked })}
                className="w-4 h-4 accent-indigo-600 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:border-indigo-200 transition-colors">
              <div>
                <span className="text-xs font-bold text-slate-800 block">Recruitment & ATS Alerts</span>
                <span className="text-[11px] text-slate-500">New applicants, interview schedules & offer updates</span>
              </div>
              <input
                type="checkbox"
                checked={preferences.recruitmentAlerts}
                onChange={e => setPreferences({ ...preferences, recruitmentAlerts: e.target.checked })}
                className="w-4 h-4 accent-indigo-600 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:border-indigo-200 transition-colors">
              <div>
                <span className="text-xs font-bold text-slate-800 block">Performance & Appraisal Alerts</span>
                <span className="text-[11px] text-slate-500">Cycle announcements, review requests & ratings</span>
              </div>
              <input
                type="checkbox"
                checked={preferences.performanceAlerts}
                onChange={e => setPreferences({ ...preferences, performanceAlerts: e.target.checked })}
                className="w-4 h-4 accent-indigo-600 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:border-indigo-200 transition-colors">
              <div>
                <span className="text-xs font-bold text-slate-800 block">Company Announcements</span>
                <span className="text-[11px] text-slate-500">Townhalls, policy revisions & general broadcasts</span>
              </div>
              <input
                type="checkbox"
                checked={preferences.announcementAlerts}
                onChange={e => setPreferences({ ...preferences, announcementAlerts: e.target.checked })}
                className="w-4 h-4 accent-indigo-600 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:border-indigo-200 transition-colors">
              <div>
                <span className="text-xs font-bold text-slate-800 block">Task Deliverables & Assignment Alerts</span>
                <span className="text-[11px] text-slate-500">Assignments, milestone status changes & discussions</span>
              </div>
              <input
                type="checkbox"
                checked={preferences.taskAlerts}
                onChange={e => setPreferences({ ...preferences, taskAlerts: e.target.checked })}
                className="w-4 h-4 accent-indigo-600 rounded"
              />
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowPrefModal(false)}
              className="thyo-btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingPrefs}
              className="thyo-btn-primary"
            >
              {savingPrefs ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
