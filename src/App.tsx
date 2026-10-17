import React, { useState, useEffect, useCallback } from 'react';
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
import { AuthModal } from './components/AuthModal';
import { AuthUser } from './lib/auth-server';
import { apiClient, ApiError } from './lib/api-client';

const pathToTab = (pathname: string): NavTab => {
  const p = pathname.toLowerCase();
  if (p === '/' || p === '/landing') return 'landing';
  if (p === '/app' || p.startsWith('/app/dashboard') || p === '/dashboard') return 'dashboard';
  if (p.startsWith('/app/upload') || p.startsWith('/upload') || p === '/notices' || p === '/app/notices') return 'notices';
  if (p.startsWith('/app/conflicts') || p === '/conflicts') return 'conflicts';
  if (p.startsWith('/app/calendar') || p === '/calendar') return 'calendar';
  if (p.startsWith('/app/history') || p === '/history') return 'history';
  if (p.startsWith('/app/settings') || p === '/settings') return 'settings';
  if (p.startsWith('/app/review') || p === '/review') return 'review';
  return 'landing';
};

const tabToPath = (tab: NavTab): string => {
  switch (tab) {
    case 'landing': return '/';
    case 'dashboard': return '/app/dashboard';
    case 'notices': return '/app/upload';
    case 'review': return '/app/review';
    case 'conflicts': return '/app/conflicts';
    case 'calendar': return '/app/calendar';
    case 'history': return '/app/history';
    case 'settings': return '/app/settings';
  }
};

export const App: React.FC = () => {
  // Brand-new visitors opening '/' land on the public Landing page
  const [currentTab, setCurrentTabState] = useState<NavTab>(() => pathToTab(window.location.pathname));
  const [notices, setNotices] = useState<NoticeRecord[]>([]);
  const [events, setEvents] = useState<ExtractedEvent[]>([]);
  const [conflicts, setConflicts] = useState<ConflictRecord[]>([]);
  const [activeReviewNotice, setActiveReviewNotice] = useState<NoticeRecord | null>(null);
  const [activeReviewEvents, setActiveReviewEvents] = useState<ExtractedEvent[]>([]);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [timezone, setTimezone] = useState<string>(
    localStorage.getItem('notice_decoder_tz') || 'Asia/Kolkata'
  );

  // Authentication State
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Notification Toast state
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Helper to get auth headers
  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('notice_decoder_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  // Synchronize Tab & Browser History
  const navigateToTab = useCallback((tab: NavTab, updateHistory: boolean = true) => {
    setCurrentTabState(tab);
    if (updateHistory) {
      const targetPath = tabToPath(tab);
      if (window.location.pathname !== targetPath) {
        window.history.pushState({ tab }, '', targetPath);
      }
    }
  }, []);

  // Handle browser back and forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const tab = pathToTab(window.location.pathname);
      setCurrentTabState(tab);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Check existing session on startup
  useEffect(() => {
    const token = localStorage.getItem('notice_decoder_token');
    if (token) {
      apiClient.get('/api/auth/session')
        .then(data => {
          if (data.user) {
            setAuthUser(data.user);
            apiClient.get('/api/preferences')
              .then(prefRes => {
                if (prefRes.data?.timezone) {
                  setTimezone(prefRes.data.timezone);
                  localStorage.setItem('notice_decoder_tz', prefRes.data.timezone);
                }
              })
              .catch(() => {});
          } else {
            localStorage.removeItem('notice_decoder_token');
          }
        })
        .catch(() => {});
    }
  }, []);

  // Fetch all state from API with safe cancellation
  const refreshAppData = async (signal?: AbortSignal) => {
    setDbError(null);
    try {
      const [noticesRes, scheduleRes, conflictsRes] = await Promise.all([
        apiClient.get('/api/notices', { signal }),
        apiClient.get('/api/schedule', { signal }),
        apiClient.get('/api/conflicts', { signal }),
      ]);

      setNotices(noticesRes.data || []);
      setEvents(scheduleRes.data || []);
      setConflicts(conflictsRes.data?.conflicts || []);
    } catch (err: any) {
      if (err.name === 'AbortError') return; // Cancelled
      const message = err.message || 'Failed to connect to database service';
      setDbError(message);
      console.warn('API data fetch warning:', message);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    refreshAppData(controller.signal);
    return () => controller.abort();
  }, [authUser]);

  const handleSignOut = async () => {
    try {
      await apiClient.post('/api/auth/sign-out');
    } catch {}
    localStorage.removeItem('notice_decoder_token');
    document.cookie = 'session_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    setAuthUser(null);
    showToast('You have been signed out.', 'info');
    navigateToTab('landing');
  };

  const handleTimezoneChange = async (newTz: string) => {
    setTimezone(newTz);
    localStorage.setItem('notice_decoder_tz', newTz);
    showToast(`Timezone updated to ${newTz}`, 'info');
    try {
      await apiClient.put('/api/preferences', { timezone: newTz });
    } catch {}
  };

  const handleLoadDemoNotice = async () => {
    try {
      setIsDemoLoading(true);
      const data = await apiClient.post('/api/demo/seed');
      if (!data.success) throw new Error(data.error || 'Failed to seed demo data');

      await refreshAppData();
      setActiveReviewNotice(data.data.notice);
      setActiveReviewEvents(data.data.events);
      navigateToTab('review');
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
    navigateToTab('review');
    showToast(`Successfully extracted ${extractedEvents.length} events from circular!`, 'success');
  };

  const handleOpenNotice = async (noticeId: string) => {
    try {
      const data = await apiClient.get(`/api/notices/${noticeId}`);
      if (data.data) {
        setActiveReviewNotice(data.data.notice);
        setActiveReviewEvents(data.data.events);
        navigateToTab('review');
      } else {
        showToast('Notice not found', 'error');
      }
    } catch (err: any) {
      showToast(`Failed to open notice: ${err.message}`, 'error');
    }
  };

  const handleDeleteNotice = async (noticeId: string) => {
    try {
      await apiClient.delete(`/api/notices/${noticeId}`);
      await refreshAppData();
      showToast('Notice permanently deleted', 'info');
    } catch (err: any) {
      showToast(`Delete failed: ${err.message}`, 'error');
    }
  };

  const handleReviewConfirm = async () => {
    await refreshAppData();
    navigateToTab('conflicts');
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
        onSelectTab={(tab) => navigateToTab(tab)}
        activeConflictsCount={conflicts.length}
        onLoadDemoNotice={handleLoadDemoNotice}
        isDemoLoading={isDemoLoading}
        timezone={timezone}
        user={authUser}
        onOpenAuth={() => setAuthModalOpen(true)}
        onSignOut={handleSignOut}
      />

      {/* Main Content View Switcher */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentTab === 'landing' && (
          <LandingView
            onNavigate={(tab) => navigateToTab(tab)}
            onLoadDemo={handleLoadDemoNotice}
            isDemoLoading={isDemoLoading}
          />
        )}

        {currentTab === 'dashboard' && (
          <DashboardView
            notices={notices}
            events={events}
            conflicts={conflicts}
            onNavigate={(tab) => navigateToTab(tab)}
            onOpenNotice={handleOpenNotice}
            onLoadDemo={handleLoadDemoNotice}
            isDemoLoading={isDemoLoading}
            dbError={dbError}
            onRetryConnection={refreshAppData}
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
            onCancel={() => navigateToTab('dashboard')}
          />
        )}

        {currentTab === 'conflicts' && (
          <ConflictsView
            conflicts={conflicts}
            events={events}
            onOpenNotice={handleOpenNotice}
            onNavigate={(tab) => navigateToTab(tab)}
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

      {/* Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(user) => {
          setAuthUser(user);
          refreshAppData();
          showToast(`Welcome back, ${user.name}!`, 'success');
        }}
      />

    </div>
  );
};
