import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Megaphone, Plus } from 'lucide-react';
import apiClient from '../api/client';
import AnnouncementCard from '../components/announcements/AnnouncementCard';
import AnnouncementModal from '../components/announcements/AnnouncementModal';
import { useAuth } from '../context/AuthContext';
import { SkeletonCard } from '../components/common/SkeletonLoader';

export default function AnnouncementsPage() {
  const { activeRole, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const {
    data: announcements = [],
    isLoading: loading,
    refetch: fetchAnnouncements
  } = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const res = await apiClient.get('/announcements');
      if (res.data.success) {
        return res.data.data;
      }
      return [];
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    placeholderData: (prev) => prev
  });

  const handleCreated = (newAnn) => {
    queryClient.invalidateQueries({ queryKey: ['announcements'] });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await apiClient.delete(`/announcements/${id}`);
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    } catch (err) {
      alert(err.friendlyMessage || 'Failed to delete announcement.');
    }
  };

  const handleAcknowledge = async (id) => {
    try {
      await apiClient.post(`/announcements/${id}/acknowledge`);
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    } catch (err) {
      alert(err.friendlyMessage || 'Failed to acknowledge announcement.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <Megaphone className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Company Announcements
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Official communications, policy updates, and project directives across THYO SOFTECH PVT LTD.
            </p>
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="thyo-btn-primary"
          >
            <Plus className="w-4 h-4" />
            <span>Publish Announcement</span>
          </button>
        )}
      </div>

      {loading ? (
        <SkeletonCard count={3} />
      ) : announcements.length === 0 ? (
        <div className="thyo-card p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto mb-3 text-indigo-600">
            <Megaphone className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-semibold text-slate-900 mb-1">No active announcements</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            There are currently no company-wide announcements published.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((ann) => (
            <AnnouncementCard
              key={ann.id}
              announcement={ann}
              onDelete={handleDelete}
              onAcknowledge={handleAcknowledge}
              canDelete={isAdmin}
            />
          ))}
        </div>
      )}

      <AnnouncementModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
