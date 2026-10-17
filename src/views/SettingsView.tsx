import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Database, 
  Cpu, 
  ShieldCheck, 
  Globe, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Download,
  Trash2,
  LogOut,
  User,
  Mail,
  Languages,
  Clock,
  Bell,
  ShieldAlert,
  Calendar
} from 'lucide-react';
import { apiClient } from '../lib/api-client';
import { AuthUser } from '../lib/auth-server';
import { SummaryLanguage } from '../types';

interface SettingsViewProps {
  timezone: string;
  onChangeTimezone: (tz: string) => void;
  user: AuthUser | null;
  onSignOut: () => void;
  onAccountDeleted?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ 
  timezone, 
  onChangeTimezone,
  user,
  onSignOut,
  onAccountDeleted,
}) => {
  const [healthData, setHealthData] = useState<any>(null);
  const [isTestingServices, setIsTestingServices] = useState(false);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [leadTime, setLeadTime] = useState<number>(30);
  const [preferredLanguage, setPreferredLanguage] = useState<SummaryLanguage>('english');
  const [notifications, setNotifications] = useState({
    email: true,
    calendar: true,
    push: false,
  });

  // Account deletion modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchHealth = async () => {
    try {
      setIsTestingServices(true);
      const data = await apiClient.get('/api/health');
      setHealthData(data);
    } catch (e) {
      console.error('Health check failed:', e);
    } finally {
      setIsTestingServices(false);
    }
  };

  const fetchPreferences = async () => {
    try {
      const res = await apiClient.get('/api/preferences');
      if (res.data) {
        if (res.data.timezone && res.data.timezone !== timezone) {
          onChangeTimezone(res.data.timezone);
        }
        if (typeof res.data.reminderLeadTimeMinutes === 'number') {
          setLeadTime(res.data.reminderLeadTimeMinutes);
        }
        if (res.data.preferredLanguage) {
          setPreferredLanguage(res.data.preferredLanguage);
        }
        if (res.data.notificationPreferences) {
          setNotifications(res.data.notificationPreferences);
        }
      }
    } catch {
      // Graceful fallback
    }
  };

  useEffect(() => {
    fetchHealth();
    fetchPreferences();
  }, []);

  const handleSavePreferences = async () => {
    try {
      setIsSavingPrefs(true);
      setSaveSuccessMsg(null);
      const res = await apiClient.put('/api/preferences', {
        timezone,
        reminderLeadTimeMinutes: leadTime,
        preferredLanguage,
        notificationPreferences: notifications,
      });
      if (res.success) {
        setSaveSuccessMsg('Preferences saved successfully.');
        setTimeout(() => setSaveSuccessMsg(null), 4000);
      }
    } catch (e: any) {
      alert(`Failed to save preferences: ${e.message}`);
    } finally {
      setIsSavingPrefs(false);
    }
  };

  const handleExportCalendar = () => {
    window.location.href = '/api/calendar/export';
  };

  const handleDeleteAccountConfirm = async () => {
    if (deleteConfirmationText.trim().toUpperCase() !== 'DELETE') {
      setDeleteError('Please type DELETE to confirm account deletion.');
      return;
    }
    setIsDeletingAccount(true);
    setDeleteError(null);
    try {
      const res = await apiClient.delete('/api/auth/account');
      if (res.success) {
        localStorage.removeItem('notice_decoder_token');
        document.cookie = 'session_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        setShowDeleteModal(false);
        if (onAccountDeleted) {
          onAccountDeleted();
        } else {
          onSignOut();
        }
      } else {
        throw new Error(res.error || 'Failed to delete account.');
      }
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete account.');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const timezones = [
    'Asia/Kolkata',
    'UTC',
    'America/New_York',
    'America/Los_Angeles',
    'America/Chicago',
    'Europe/London',
    'Europe/Paris',
    'Asia/Dubai',
    'Asia/Singapore',
    'Asia/Tokyo',
    'Australia/Sydney',
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-12">
      
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Account & Application Settings</h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage your personal profile, notification thresholds, summary languages, and security preferences.
        </p>
      </div>

      {/* 1. User Profile & Account Card */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white font-extrabold text-xl flex items-center justify-center shadow-md shrink-0">
            {user?.name ? user.name.charAt(0).toUpperCase() : <User className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-slate-900">{user?.name || 'Guest User'}</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Verified Account
              </span>
            </div>
            <p className="text-xs text-slate-500 flex items-center space-x-1.5 mt-0.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>{user?.email || 'Sign in to access persistent cloud storage'}</span>
            </p>
          </div>
        </div>

        {user && (
          <button
            onClick={onSignOut}
            className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition self-start sm:self-auto"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-500" />
            <span>Sign Out</span>
          </button>
        )}
      </div>

      {/* 2. Schedule, Language & Notification Preferences */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
            <Globe className="w-4 h-4 text-brand-600 shrink-0" />
            <h2>Schedule & Language Preferences</h2>
          </div>
          {saveSuccessMsg && (
            <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg font-medium flex items-center space-x-1 self-start sm:self-auto">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{saveSuccessMsg}</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Preferred Language */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center space-x-1.5">
              <Languages className="w-3.5 h-3.5 text-slate-400" />
              <span>Default Summary Language</span>
            </label>
            <select
              value={preferredLanguage}
              onChange={(e) => setPreferredLanguage(e.target.value as SummaryLanguage)}
              className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 outline-hidden"
            >
              <option value="english">English (Standard Professional)</option>
              <option value="hinglish">Hinglish (Hindi in Roman Latin script)</option>
              <option value="hindi">हिंदी (Hindi in Devanagari script)</option>
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              Initial document summaries will default to this language while strictly preserving dates, numbers, and facts.
            </p>
          </div>

          {/* Timezone */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Primary Timezone</span>
            </label>
            <select
              value={timezone}
              onChange={(e) => onChangeTimezone(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 outline-hidden"
            >
              {timezones.map(tz => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              All parsed times, intervals, and calendar exports are aligned to this timezone.
            </p>
          </div>

          {/* Conflict & Deadline Lead Time */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center space-x-1.5">
              <Bell className="w-3.5 h-3.5 text-slate-400" />
              <span>Conflict & Deadline Lead Time Warning</span>
            </label>
            <select
              value={leadTime}
              onChange={(e) => setLeadTime(Number(e.target.value))}
              className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 outline-hidden"
            >
              <option value={15}>15 minutes before deadline</option>
              <option value={30}>30 minutes before deadline (Default)</option>
              <option value={60}>1 hour before deadline</option>
              <option value={120}>2 hours before deadline</option>
              <option value={1440}>1 day before deadline</option>
            </select>
          </div>

          {/* Notification Channels */}
          <div>
            <span className="block text-xs font-semibold text-slate-700 mb-2">Active Channels</span>
            <div className="space-y-2 text-xs">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications.email}
                  onChange={(e) => setNotifications({ ...notifications, email: e.target.checked })}
                  className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-slate-700 font-medium">Email Schedule & Conflict Alerts</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications.calendar}
                  onChange={(e) => setNotifications({ ...notifications, calendar: e.target.checked })}
                  className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-slate-700 font-medium">Auto RFC-5545 .ics Calendar Sync</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications.push}
                  onChange={(e) => setNotifications({ ...notifications, push: e.target.checked })}
                  className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-slate-700 font-medium">Desktop Browser Push Notifications</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            onClick={handleSavePreferences}
            disabled={isSavingPrefs}
            className="inline-flex items-center space-x-2 text-xs font-bold px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white shadow-xs transition disabled:opacity-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{isSavingPrefs ? 'Saving Changes...' : 'Save Preferences'}</span>
          </button>
        </div>
      </div>

      {/* 3. Calendar Export & Data Backup */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <h2>Export Schedule & Commitments</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Export all confirmed events, deadlines, and personal reminders as a standard RFC-5545 <code className="font-mono text-slate-700">.ics</code> file compatible with Google Calendar, Apple Calendar, and Outlook.
          </p>
        </div>

        <button
          onClick={handleExportCalendar}
          className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs hover:shadow-md transition self-start sm:self-auto shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Export .ics Calendar</span>
        </button>
      </div>

      {/* 4. Platform Services & Engine Status */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
            <Database className="w-4 h-4 text-indigo-600" />
            <h2>System Health & Backend Services</h2>
          </div>
          <button
            onClick={fetchHealth}
            disabled={isTestingServices}
            className="text-xs font-semibold text-brand-600 hover:text-brand-800 flex items-center space-x-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTestingServices ? 'animate-spin' : ''}`} />
            <span>Refresh Diagnostics</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">Database</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            </div>
            <p className="text-[11px] text-emerald-700 font-medium">PostgreSQL Online</p>
            <p className="text-[10px] text-slate-400">Encrypted at rest</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">AI Extractor</span>
              <span className="w-2 h-2 rounded-full bg-brand-500"></span>
            </div>
            <p className="text-[11px] text-brand-700 font-medium">
              {healthData?.system?.aiExtraction?.model || 'Active Engine'}
            </p>
            <p className="text-[10px] text-slate-400">Multilingual NLP</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">OCR Engine</span>
              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
            </div>
            <p className="text-[11px] text-purple-700 font-medium">Tesseract.js v5</p>
            <p className="text-[10px] text-slate-400">PDF & Image scans</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">Storage</span>
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            </div>
            <p className="text-[11px] text-blue-700 font-medium">Isolated Assets</p>
            <p className="text-[10px] text-slate-400">10 MB max size limit</p>
          </div>
        </div>
      </div>

      {/* 5. Privacy, Sandboxing & Security Policies */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <h2>Data Privacy & Sandboxing Policy</h2>
        </div>
        <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
          <p>
            • <strong>Untrusted Document Protection:</strong> Notice texts are treated strictly as untrusted data. Embedded instructions or prompt injections inside uploaded notices are safely neutralized.
          </p>
          <p>
            • <strong>Strict User Isolation:</strong> Your notices, events, and personal reminders are private to your authenticated account and are never exposed to other users or search engines.
          </p>
          <p>
            • <strong>No Unsolicited Advertising:</strong> Your document data is never monetized or sold to third parties.
          </p>
        </div>
      </div>

      {/* 6. Danger Zone: Account Deletion */}
      <div className="bg-rose-50/60 p-5 sm:p-6 rounded-3xl border border-rose-200/80 shadow-xs space-y-4">
        <div className="flex items-center space-x-2 text-rose-900 font-bold text-sm">
          <ShieldAlert className="w-4 h-4 text-rose-600" />
          <h2>Danger Zone: Account Deletion</h2>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-xs text-rose-800 leading-relaxed max-w-xl">
            Permanently delete your account along with all uploaded notices, extracted events, custom reminders, conflict records, and saved preferences. This action cannot be undone.
          </p>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs hover:shadow-md transition self-start sm:self-auto shrink-0"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Account & Data</span>
          </button>
        </div>
      </div>

      {/* Account Deletion Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-5 animate-scale-up">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Confirm Permanent Deletion</h3>
                <p className="text-xs text-slate-500">This action is irreversible</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              All your notices, calendar entries, reminders, and profile data will be permanently wiped from the database.
            </p>

            {deleteError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {deleteError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Type <strong className="text-rose-600 font-mono">DELETE</strong> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                placeholder="DELETE"
                className="w-full text-xs font-mono font-bold px-3 py-2.5 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10 outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmationText('');
                  setDeleteError(null);
                }}
                disabled={isDeletingAccount}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccountConfirm}
                disabled={isDeletingAccount || deleteConfirmationText.trim().toUpperCase() !== 'DELETE'}
                className="px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition disabled:opacity-40"
              >
                {isDeletingAccount ? 'Deleting Everything...' : 'Permanently Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
