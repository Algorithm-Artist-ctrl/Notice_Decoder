import React, { useState, useEffect } from 'react';
import { Navbar, NavTab } from './components/Navbar';
import { Footer } from './components/Footer';
import { LandingView } from './views/LandingView';
import { DashboardView } from './views/DashboardView';
import { UploadView } from './views/UploadView';
import { ReviewView } from './views/ReviewView';
import { ConflictsView } from './views/ConflictsView';
import { ScheduleView } from './views/ScheduleView';
import { HistoryView } from './views/HistoryView';
import { SettingsView } from './views/SettingsView';
import { NoticeRecord, ExtractedEvent, ConflictRecord } from './types';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [notices, setNotices] = useState<NoticeRecord[]>([]);
  const [events, setEvents] = useState<ExtractedEvent[]>([]);
  const [conflicts, setConflicts] = useState<ConflictRecord[]>([]);
  const [activeReviewNotice, setActiveReviewNotice] = useState<NoticeRecord | null>(null);
  const [activeReviewEvents, setActiveReviewEvents] = useState<ExtractedEvent[]>([]);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [timezone, setTimezone] = useState<string>(
    localStorage.getItem('notice_decoder_tz') || 'Asia/Kolkata'
  );

  // Notification Toast state
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Fetch all state from API
  const refreshAppData = async () => {
    try {
      const [noticesRes, scheduleRes, conflictsRes] = await Promise.all([
        fetch('/api/notices'),
        fetch('/api/schedule'),
        fetch('/api/conflicts'),
      ]);

      if (noticesRes.ok) {
        const data = await noticesRes.json();
        setNotices(data.data || []);
      }

      if (scheduleRes.ok) {
        const data = await scheduleRes.json();
        setEvents(data.data || []);
      }

      if (conflictsRes.ok) {
        const data = await conflictsRes.json();
        setConflicts(data.data?.conflicts || []);
      }
    } catch (err: any) {
      console.warn('Could not connect to API server:', err.message);
    }
  };

  useEffect(() => {
    refreshAppData();
  }, []);

  const handleTimezoneChange = (newTz: string) => {
    setTimezone(newTz);
    localStorage.setItem('notice_decoder_tz', newTz);
    showToast(`Timezone updated to ${newTz}`, 'info');
  };

  const handleLoadDemoNotice = async () => {
    try {
      setIsDemoLoading(true);
      const res = await fetch('/api/demo/seed', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to seed demo data');

      await refreshAppData();
      setActiveReviewNotice(data.data.notice);
      setActiveReviewEvents(data.data.events);
      setCurrentTab('review');
      showToast('Sample circular loaded into Review Gate!', 'success');
    } catch (err: any) {
      showToast(`Error loading sample notice: ${err.message}`, 'error');
    } finally {
      setIsDemoLoading(false);
    }
  };

  const handleUploadSuccess = (notice: NoticeRecord, extractedEvents: ExtractedEvent[]) => {
    refreshAppData();
    setActiveReviewNotice(notice);
    setActiveReviewEvents(extractedEvents);
    setCurrentTab('review');
    showToast(`Successfully extracted ${extractedEvents.length} events from circular!`, 'success');
  };

  const handleOpenNotice = async (noticeId: string) => {
    try {
      const res = await fetch(`/api/notices/${noticeId}`);
      const data = await res.json();
      if (res.ok && data.data) {
        setActiveReviewNotice(data.data.notice);
        setActiveReviewEvents(data.data.events);
        setCurrentTab('review');
      } else {
        showToast('Notice not found', 'error');
      }
    } catch (err: any) {
      showToast(`Failed to open notice: ${err.message}`, 'error');
    }
  };

  const handleDeleteNotice = async (noticeId: string) => {
    try {
      const res = await fetch(`/api/notices/${noticeId}`, { method: 'DELETE' });
      if (res.ok) {
        await refreshAppData();
        showToast('Notice permanently deleted', 'info');
      } else {
        showToast('Failed to delete notice', 'error');
      }
    } catch (err: any) {
      showToast(`Delete failed: ${err.message}`, 'error');
    }
  };

  const handleReviewConfirm = async () => {
    await refreshAppData();
    setCurrentTab('conflicts');
    showToast('Schedule confirmed and saved! Reviewing conflicts...', 'success');
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900">
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-bounce-once">
          <div className={`flex items-center space-x-2.5 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold ${
            toast.type === 'success' 
              ? 'bg-emerald-900 text-emerald-100 border-emerald-700' 
              : toast.type === 'error'
                ? 'bg-red-900 text-red-100 border-red-700'
                : 'bg-navy-900 text-slate-100 border-navy-700'
          }`}>
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-red-400" />}
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 hover:opacity-75">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Navigation Header */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        activeConflictsCount={conflicts.length}
        onLoadDemoNotice={handleLoadDemoNotice}
        isDemoLoading={isDemoLoading}
        timezone={timezone}
      />

      {/* Main Content View Switcher */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentTab === 'landing' && (
          <LandingView
            onNavigate={setCurrentTab}
            onLoadDemo={handleLoadDemoNotice}
            isDemoLoading={isDemoLoading}
          />
        )}

        {currentTab === 'dashboard' && (
          <DashboardView
            notices={notices}
            events={events}
            conflicts={conflicts}
            onNavigate={setCurrentTab}
            onOpenNotice={handleOpenNotice}
            onLoadDemo={handleLoadDemoNotice}
            isDemoLoading={isDemoLoading}
          />
        )}

        {currentTab === 'notices' && (
          <UploadView onUploadSuccess={handleUploadSuccess} />
        )}

        {currentTab === 'review' && activeReviewNotice && (
          <ReviewView
            notice={activeReviewNotice}
            initialEvents={activeReviewEvents}
            onConfirm={handleReviewConfirm}
            onCancel={() => setCurrentTab('dashboard')}
          />
        )}

        {currentTab === 'conflicts' && (
          <ConflictsView
            conflicts={conflicts}
            events={events}
            onOpenNotice={handleOpenNotice}
            onNavigate={setCurrentTab}
          />
        )}

        {currentTab === 'calendar' && (
          <ScheduleView
            events={events}
            onOpenNotice={handleOpenNotice}
          />
        )}

        {currentTab === 'history' && (
          <HistoryView
            notices={notices}
            onOpenNotice={handleOpenNotice}
            onDeleteNotice={handleDeleteNotice}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsView
            timezone={timezone}
            onChangeTimezone={handleTimezoneChange}
          />
        )}
      </main>

      {/* Footer */}
      <Footer />

    </div>
  );
};
