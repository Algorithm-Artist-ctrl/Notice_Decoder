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
import { NoticeRecord, ExtractedEvent, ConflictRecord, ReminderRecord } from './types';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { AuthModal } from './components/AuthModal';
import { DemoSandboxModal } from './components/DemoSandboxModal';
import { AddReminderModal } from './components/AddReminderModal';
import { AuthUser } from './lib/auth-server';
import { apiClient } from './lib/api-client';

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
  const [reminders, setReminders] = useState<ReminderRecord[]>([]);
  const [activeReviewNotice, setActiveReviewNotice] = useState<NoticeRecord | null>(null);
  const [activeReviewEvents, setActiveReviewEvents] = useState<ExtractedEvent[]>([]);
  const [dbError, setDbError] = useState<string | null>(null);
  const [timezone, setTimezone] = useState<string>(
    localStorage.getItem('notice_decoder_tz') || 'Asia/Kolkata'
  );

  // Authentication State
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [pendingTab, setPendingTab] = useState<NavTab | null>(null);

  // Demo Sandbox & Reminder Modals
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [addReminderModalOpen, setAddReminderModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<ReminderRecord | null>(null);

  // Notification Toast state
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Synchronize Tab & Browser History with Strict Auth Guard
  const navigateToTab = useCallback((tab: NavTab, updateHistory: boolean = true) => {
    // Visitor Protection: Only 'landing' is accessible without signing in
    if (!authUser && tab !== 'landing') {
      setPendingTab(tab);
      setAuthModalOpen(true);
      showToast('Please sign in or create an account to access Notice Decoder features.', 'info');
      return;
    }

    setCurrentTabState(tab);
    if (updateHistory) {
      const targetPath = tabToPath(tab);
      if (window.location.pathname !== targetPath) {
        window.history.pushState({ tab }, '', targetPath);
      }
    }
  }, [authUser]);

  // Handle browser back and forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const tab = pathToTab(window.location.pathname);
      if (!authUser && tab !== 'landing') {
        setPendingTab(tab);
        setAuthModalOpen(true);
        setCurrentTabState('landing');
      } else {
        setCurrentTabState(tab);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [authUser]);

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
      const [noticesRes, scheduleRes, conflictsRes, remindersRes] = await Promise.all([
        apiClient.get('/api/notices', { signal }),
        apiClient.get('/api/schedule', { signal }),
        apiClient.get('/api/conflicts', { signal }),
        apiClient.get('/api/reminders', { signal }).catch(() => ({ data: [] })),
      ]);

      setNotices(noticesRes.data || []);
      setEvents(scheduleRes.data || []);
      setConflicts(conflictsRes.data?.conflicts || []);
      setReminders(remindersRes.data || []);
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
    setNotices([]);
    setEvents([]);
    setConflicts([]);
    setReminders([]);
    showToast('You have been signed out.', 'info');
    navigateToTab('landing');
  };

  const handleAccountDeleted = () => {
    localStorage.removeItem('notice_decoder_token');
    document.cookie = 'session_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    setAuthUser(null);
    setNotices([]);
    setEvents([]);
    setConflicts([]);
    setReminders([]);
    showToast('Your account and all associated data have been permanently deleted.', 'info');
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

  const handleUploadSuccess = (notice: NoticeRecord, extractedEvents: ExtractedEvent[]) => {
    refreshAppData();
    setActiveReviewNotice(notice);
    setActiveReviewEvents(extractedEvents);
    navigateToTab('review');
    showToast(`Successfully extracted ${extractedEvents.length} events from document!`, 'success');
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
      showToast('Document permanently deleted', 'info');
    } catch (err: any) {
      showToast(`Delete failed: ${err.message}`, 'error');
    }
  };

  const handleReviewConfirm = async () => {
    await refreshAppData();
    navigateToTab('conflicts');
    showToast('Schedule confirmed and saved! Reviewing conflicts...', 'success');
  };

  // Reminder Actions
  const handleReminderSuccess = (savedReminder: ReminderRecord) => {
    showToast('Personal reminder saved!', 'success');
    refreshAppData();
  };

  const handleDeleteReminder = async (reminderId: string) => {
    try {
      await apiClient.delete(`/api/reminders/${reminderId}`);
      setReminders(prev => prev.filter(r => r.id !== reminderId));
      showToast('Reminder deleted', 'info');
    } catch (err: any) {
      showToast(`Failed to delete reminder: ${err.message}`, 'error');
    }
  };

  const handleToggleReminder = async (reminderId: string, completed: boolean) => {
    setReminders(prev => prev.map(r => r.id === reminderId ? { ...r, isCompleted: completed } : r));
    try {
      await apiClient.patch(`/api/reminders/${reminderId}`, { isCompleted: completed });
    } catch (err: any) {
      showToast('Failed to update status', 'error');
      refreshAppData();
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 w-full overflow-x-clip">
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-4 sm:bottom-5 left-4 right-4 sm:left-auto sm:right-5 z-50 animate-bounce-once max-w-sm">
          <div className={`flex items-center justify-between space-x-2.5 px-4 py-3 rounded-2xl shadow-xl border text-xs font-semibold ${
            toast.type === 'success' 
              ? 'bg-emerald-950 text-emerald-100 border-emerald-800' 
              : toast.type === 'error'
                ? 'bg-rose-950 text-rose-100 border-rose-800'
                : 'bg-slate-900 text-slate-100 border-slate-800'
          }`}>
            <div className="flex items-center space-x-2 min-w-0">
              {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
              {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
              <span className="truncate sm:whitespace-normal">{toast.message}</span>
            </div>
            <button onClick={() => setToast(null)} className="ml-2 hover:opacity-75 shrink-0" aria-label="Dismiss notification">
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
        timezone={timezone}
        user={authUser}
        onOpenAuth={() => setAuthModalOpen(true)}
        onSignOut={handleSignOut}
      />

      {/* Main Content View Switcher */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {currentTab === 'landing' && (
          <LandingView
            onNavigate={(tab) => navigateToTab(tab)}
            onOpenDemo={() => setDemoModalOpen(true)}
          />
        )}

        {currentTab === 'dashboard' && (
          <DashboardView
            notices={notices}
            events={events}
            conflicts={conflicts}
            reminders={reminders}
            onNavigate={(tab) => navigateToTab(tab)}
            onOpenNotice={handleOpenNotice}
            onAddReminder={() => {
              setEditingReminder(null);
              setAddReminderModalOpen(true);
            }}
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
            reminders={reminders}
            onOpenNotice={handleOpenNotice}
            onAddReminder={() => {
              setEditingReminder(null);
              setAddReminderModalOpen(true);
            }}
            onEditReminder={(r) => {
              setEditingReminder(r);
              setAddReminderModalOpen(true);
            }}
            onDeleteReminder={handleDeleteReminder}
            onToggleReminder={handleToggleReminder}
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
            user={authUser}
            onSignOut={handleSignOut}
            onAccountDeleted={handleAccountDeleted}
          />
        )}
      </main>

      {/* Footer */}
      <Footer />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => {
          setAuthModalOpen(false);
          setPendingTab(null);
        }}
        onSuccess={(user) => {
          setAuthUser(user);
          refreshAppData();
          showToast(`Welcome back, ${user.name}!`, 'success');
          if (pendingTab) {
            const dest = pendingTab;
            setPendingTab(null);
            navigateToTab(dest);
          } else {
            navigateToTab('dashboard');
          }
        }}
      />

      {/* Demo Sandbox Modal */}
      <DemoSandboxModal
        isOpen={demoModalOpen}
        onClose={() => setDemoModalOpen(false)}
        onOpenAuth={() => setAuthModalOpen(true)}
      />

      {/* Add / Edit Personal Reminder Modal */}
      <AddReminderModal
        isOpen={addReminderModalOpen}
        onClose={() => {
          setAddReminderModalOpen(false);
          setEditingReminder(null);
        }}
        onSuccess={handleReminderSuccess}
        initialData={editingReminder}
      />

    </div>
  );
};
