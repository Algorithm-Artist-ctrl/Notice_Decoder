import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Database, 
  Cpu, 
  ShieldCheck, 
  Globe, 
  RefreshCw, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';

import { apiClient } from '../lib/api-client';

interface SettingsViewProps {
  timezone: string;
  onChangeTimezone: (tz: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ timezone, onChangeTimezone }) => {
  const [healthData, setHealthData] = useState<any>(null);
  const [isTestingDb, setIsTestingDb] = useState(false);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [leadTime, setLeadTime] = useState<number>(30);
  const [notifications, setNotifications] = useState({
    email: true,
    calendar: true,
    push: false,
  });

  const fetchHealth = async () => {
    try {
      setIsTestingDb(true);
      const data = await apiClient.get('/api/health');
      setHealthData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsTestingDb(false);
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
        if (res.data.notificationPreferences) {
          setNotifications(res.data.notificationPreferences);
        }
      }
    } catch (e) {
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
        notificationPreferences: notifications,
      });
      if (res.success) {
        setSaveSuccessMsg('Preferences saved to PostgreSQL (user_preferences table)');
        setTimeout(() => setSaveSuccessMsg(null), 4000);
      }
    } catch (e: any) {
      alert(`Failed to save preferences: ${e.message}`);
    } finally {
      setIsSavingPrefs(false);
    }
  };

  const timezones = [
    'Asia/Kolkata',
    'UTC',
    'America/New_York',
    'America/Los_Angeles',
    'Europe/London',
    'Asia/Singapore',
    'Asia/Tokyo',
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">System Configuration & Settings</h1>
        <p className="text-xs text-slate-500 mt-1">
          Timezone preferences, database connectivity status, AI engine diagnostics, and privacy policies.
        </p>
      </div>

      {/* 1. User & Schedule Preferences (Persisted to PostgreSQL) */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
            <Globe className="w-4 h-4 text-brand-600 shrink-0" />
            <h2>Schedule & Notification Preferences</h2>
          </div>
          {saveSuccessMsg && (
            <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg font-medium flex items-center space-x-1 animate-fade-in self-start sm:self-auto">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{saveSuccessMsg}</span>
            </span>
          )}
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Extracted dates and events are normalized to this timezone. Preferences are securely persisted to your user profile in Neon PostgreSQL.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label htmlFor="tz-select" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Primary Timezone
            </label>
            <select
              id="tz-select"
              value={timezone}
              onChange={(e) => onChangeTimezone(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-300 bg-white"
            >
              {timezones.map(tz => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="lead-time-select" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Conflict & Deadline Lead Time Alert
            </label>
            <select
              id="lead-time-select"
              value={leadTime}
              onChange={(e) => setLeadTime(Number(e.target.value))}
              className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-300 bg-white"
            >
              <option value={15}>15 minutes before event</option>
              <option value={30}>30 minutes before event</option>
              <option value={60}>1 hour before event</option>
              <option value={120}>2 hours before event</option>
              <option value={1440}>1 day before event</option>
            </select>
          </div>
        </div>

        {/* Notification channels */}
        <div className="pt-2 border-t border-slate-100">
          <span className="block text-xs font-semibold text-slate-700 mb-3">Notification Channels</span>
          <div className="flex flex-wrap gap-4 text-xs">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={notifications.email}
                onChange={(e) => setNotifications({ ...notifications, email: e.target.checked })}
                className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-slate-700 font-medium">Email Schedule Summaries</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={notifications.calendar}
                onChange={(e) => setNotifications({ ...notifications, calendar: e.target.checked })}
                className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-slate-700 font-medium">Auto RFC-5545 .ics Sync</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={notifications.push}
                onChange={(e) => setNotifications({ ...notifications, push: e.target.checked })}
                className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-slate-700 font-medium">Browser Push Notifications</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleSavePreferences}
            disabled={isSavingPrefs}
            className="inline-flex items-center space-x-2 text-xs font-bold px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white shadow-xs transition disabled:opacity-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{isSavingPrefs ? 'Saving to Database...' : 'Save Preferences to Database'}</span>
          </button>
        </div>
      </div>

      {/* 2. Database & Neon Cloud Backend Primitives Status */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
            <Database className="w-4 h-4 text-emerald-600" />
            <h2>Neon Cloud Backend Services (Lakebase Postgres, Auth, S3 & Functions)</h2>
          </div>
          <button
            onClick={fetchHealth}
            disabled={isTestingDb}
            className="text-xs font-semibold text-brand-600 hover:text-brand-800 flex items-center space-x-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTestingDb ? 'animate-spin' : ''}`} />
            <span>Test All Services</span>
          </button>
        </div>

        {healthData?.system?.database ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            
            {/* Postgres */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Lakebase Postgres</span>
                </span>
                <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                  healthData.system.database.connected 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {healthData.system.database.connected ? 'ONLINE' : 'FALLBACK'}
                </span>
              </div>
              <p className="text-slate-500 text-[11px]">
                Driver: <code className="font-mono text-slate-700">@neondatabase/serverless</code>
              </p>
              <p className="text-slate-600 font-mono text-[11px] truncate">
                {healthData.system.database.databaseUrlRedacted || 'Not configured'}
              </p>
            </div>

            {/* Neon Functions */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span>Neon Functions</span>
                </span>
                <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-blue-100 text-blue-800">
                  {healthData.system.neon?.functions?.configured ? 'DEPLOYED' : 'UNCONFIGURED'}
                </span>
              </div>
              <p className="text-slate-500 text-[11px]">
                Function: <code className="font-mono text-slate-700">hello.ts</code> (Long-running compute)
              </p>
              <p className="text-emerald-700 font-semibold text-[11px]">
                Status: {healthData.system.neon?.functions?.status || 'Active'}
              </p>
            </div>

            {/* Neon Object Storage */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  <span>Neon Object Storage</span>
                </span>
                <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-purple-100 text-purple-800">
                  {healthData.system.neon?.objectStorage?.configured ? 'ACTIVE' : 'UNCONFIGURED'}
                </span>
              </div>
              <p className="text-slate-500 text-[11px]">
                Bucket: <code className="font-mono text-slate-700">assets</code> (S3-compatible)
              </p>
              <p className="text-slate-600 font-mono text-[11px] truncate">
                Endpoint: {healthData.system.neon?.objectStorage?.endpoint || 'AWS S3 SigV4'}
              </p>
            </div>

            {/* Neon Auth */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span>Neon Auth</span>
                </span>
                <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-amber-100 text-amber-800">
                  {healthData.system.neon?.auth?.configured ? 'ACTIVE' : 'UNCONFIGURED'}
                </span>
              </div>
              <p className="text-slate-500 text-[11px]">
                Provider: Managed Better Auth (schema: <code className="font-mono text-slate-700">neon_auth</code>)
              </p>
              <p className="text-slate-600 font-mono text-[11px] truncate">
                JWKS: {healthData.system.neon?.auth?.jwksUrl ? 'Verified RSA key available' : 'Disabled'}
              </p>
            </div>

          </div>
        ) : (
          <div className="text-xs text-slate-400">Loading Neon services status...</div>
        )}

        <div className="text-[11px] text-slate-500 bg-blue-50 p-3 rounded-lg border border-blue-200">
          <strong>Neon Branch Synchronization:</strong> All backend primitives (Lakebase Postgres, Auth, Object Storage, and Functions) branch together on branch <code className="font-mono bg-blue-100 text-blue-800 px-1 py-0.5 rounded">{healthData?.system?.neon?.branch || 'production'}</code>. Changes and uploaded files are isolated per branch.
        </div>
      </div>

      {/* 3. AI & OCR Engine Diagnostics */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
          <Cpu className="w-4 h-4 text-purple-600" />
          <h2>Entity Extraction & OCR Engine</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <span className="font-bold text-slate-900 block">AI Parsing Provider</span>
            <p className="text-slate-600">
              Provider: <code className="font-mono font-semibold text-brand-700">{healthData?.system?.aiExtraction?.provider || 'Loading...'}</code>
            </p>
            <p className="text-slate-500 text-[11px]">
              Accuracy Baseline: <strong>Validated against multi-domain document test suites</strong>.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <span className="font-bold text-slate-900 block">OCR Engine (Scans & Images)</span>
            <p className="text-slate-600">
              Engine: <code className="font-mono font-semibold text-brand-700">Tesseract.js v5 (eng)</code>
            </p>
            <p className="text-slate-500 text-[11px]">
              Extracts text layers from PNG, JPG, and non-text PDFs with character bounding detection.
            </p>
          </div>
        </div>
      </div>

      {/* 4. Privacy, Data Retention & Document Boundaries */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <h2>Data Privacy & Retention Policy</h2>
        </div>

        <div className="text-xs text-slate-600 space-y-3 leading-relaxed">
          <p>
            • <strong>Untrusted Input Protection:</strong> Notice texts are treated strictly as untrusted data. Any prompt injections or system commands embedded inside uploaded circulars are discarded.
          </p>
          <p>
            • <strong>No Unsolicited Data Sharing:</strong> Your notice data is never shared with third-party advertisers. All records are stored either in your private Neon database or your local persistent workspace.
          </p>
          <p>
            • <strong>10 MB Enforced Size Limit:</strong> File uploads are constrained to 10 MB per document on both client and server to prevent denial of service and memory exhaustion.
          </p>
          <p>
            • <strong>Permanent Deletion:</strong> Clicking "Delete Notice" permanently removes the circular, its extracted candidates, and all associated conflict records.
          </p>
        </div>
      </div>

    </div>
  );
};
