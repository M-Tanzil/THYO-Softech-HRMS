import React, { useState, useEffect } from 'react';
import { Megaphone, Plus } from 'lucide-react';
import apiClient from '../api/client';
import AnnouncementCard from '../components/announcements/AnnouncementCard';
import AnnouncementModal from '../components/announcements/AnnouncementModal';
import { useAuth } from '../context/AuthContext';

export default function AnnouncementsPage() {
  const { activeRole } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/announcements');
      if (res.data.success) {
        setAnnouncements(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load announcements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleCreated = (newAnn) => {
    setAnnouncements(prev => [newAnn, ...prev]);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await apiClient.delete(`/announcements/${id}`);
      setAnnouncements(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      alert(err.friendlyMessage || 'Failed to delete announcement.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Company Announcements
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Official communications, policy updates, and project directives across THYO SOFTECH PVT LTD.
          </p>
        </div>

        {activeRole === 'ADMIN' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Publish Announcement</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center text-sm text-slate-400">
          Loading company announcements...
        </div>
      ) : announcements.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <Megaphone className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-semibold text-slate-800 mb-1">No active announcements</h4>
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
              canDelete={activeRole === 'ADMIN'}
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
