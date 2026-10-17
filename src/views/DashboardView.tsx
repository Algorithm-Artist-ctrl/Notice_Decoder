import React, { useState } from 'react';
import { 
  Calendar, 
  UploadCloud, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  FileText, 
  ArrowRight, 
  Sparkles,
  ChevronRight,
  MapPin,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  X
} from 'lucide-react';
import { NoticeRecord, ExtractedEvent, ConflictRecord } from '../types';
import { NavTab } from '../components/Navbar';
import { format12Hour } from '../lib/conflict-engine';

interface DashboardViewProps {
  notices: NoticeRecord[];
  events: ExtractedEvent[];
  conflicts: ConflictRecord[];
  onNavigate: (tab: NavTab) => void;
  onOpenNotice: (noticeId: string) => void;
  onLoadDemo: () => void;
  isDemoLoading: boolean;
  dbError?: string | null;
  onRetryConnection?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  notices,
  events,
  conflicts,
  onNavigate,
  onOpenNotice,
  onLoadDemo,
  isDemoLoading,
  dbError,
  onRetryConnection,
}) => {
  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => {
    return localStorage.getItem('notice_decoder_onboarding_dismissed') !== 'true';
  });

  const dismissOnboarding = () => {
    setShowOnboarding(false);
    localStorage.setItem('notice_decoder_onboarding_dismissed', 'true');
  };

  const hardOverlaps = conflicts.filter(c => c.type === 'HARD_OVERLAP');
  const deadlineWarnings = conflicts.filter(c => c.type === 'DEADLINE_DURING_EVENT');
  const isEmpty = notices.length === 0;

  return (
    <div className="space-y-8">
      
      {/* Database Connection Error Banner */}
      {dbError && (
        <div className="bg-red-50 border border-red-300 rounded-2xl p-5 text-red-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start sm:items-center space-x-2.5">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <span className="font-bold text-sm block">Database Connection Error</span>
              <p className="text-red-700">{dbError}</p>
            </div>
          </div>
          {onRetryConnection && (
            <button
              onClick={onRetryConnection}
              className="inline-flex items-center space-x-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-xl text-xs transition shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Connection</span>
            </button>
          )}
        </div>
      )}

      {/* Optional First-Time Onboarding Guide */}
      {showOnboarding && (
        <div className="bg-gradient-to-r from-navy-900 to-navy-850 text-white rounded-2xl p-6 sm:p-7 shadow-md relative overflow-hidden">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-brand-500/20 text-brand-300 border border-brand-400/30 px-2.5 py-0.5 rounded-full">
                  Quick Start Guide
                </span>
                <span className="text-xs text-slate-400">Welcome to Notice Decoder</span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white">
                Three steps to a conflict-free academic schedule:
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 text-xs">
                <div className="bg-white/10 rounded-xl p-3 border border-white/10 space-y-1">
                  <div className="font-bold text-brand-300">1. Upload Notice</div>
                  <p className="text-slate-300 text-[11px]">Upload circulars, exam datesheets, or pasted portal text.</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3 border border-white/10 space-y-1">
                  <div className="font-bold text-brand-300">2. Review Gate</div>
                  <p className="text-slate-300 text-[11px]">Verify extracted events against original document evidence.</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3 border border-white/10 space-y-1">
                  <div className="font-bold text-brand-300">3. Spot Conflicts & Export</div>
                  <p className="text-slate-300 text-[11px]">Surfaces overlapping exams & exports .ics calendars.</p>
                </div>
              </div>
            </div>

            <button
              onClick={dismissOnboarding}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              title="Dismiss guide"
              aria-label="Dismiss guide"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Top Banner / Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Document-to-Action Dashboard</h1>
            <span className="text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
              Live Stored Records
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time conflict detection and synchronized schedule extracted from your verified documents.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => onNavigate('notices')}
            className="inline-flex items-center space-x-2 bg-navy-900 hover:bg-navy-850 text-white font-medium px-4 py-2.5 rounded-xl text-xs shadow-xs transition"
          >
            <UploadCloud className="w-4 h-4 text-brand-300" />
            <span>Upload Document</span>
          </button>
          
          <button
            onClick={onLoadDemo}
            disabled={isDemoLoading}
            className="inline-flex items-center space-x-1.5 bg-brand-50 hover:bg-brand-100 text-brand-800 border border-brand-200 font-medium px-4 py-2.5 rounded-xl text-xs transition disabled:opacity-50"
            title="Open isolated demonstration sandbox (does not modify your account records)"
          >
            <Sparkles className="w-3.5 h-3.5 text-brand-600" />
            <span>{isDemoLoading ? 'Loading sandbox...' : 'Demo Sandbox'}</span>
          </button>
        </div>
      </div>

      {/* Empty State vs Active Dashboard */}
      {isEmpty ? (
        <div className="bg-white border-2 border-dashed border-slate-300 rounded-3xl p-10 sm:p-14 text-center max-w-2xl mx-auto space-y-5 shadow-xs">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
            <FileText className="w-8 h-8 text-brand-600" />
          </div>
          
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-slate-900">No documents processed yet</h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
              Upload any document—such as academic circulars, office notices, meeting minutes, conference announcements, job notifications, or government advisories—to extract dates, deadlines, and key actionable points.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => onNavigate('notices')}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-navy-900 hover:bg-navy-850 text-white font-semibold px-6 py-3 rounded-xl text-xs transition shadow-sm"
            >
              <UploadCloud className="w-4 h-4 text-brand-300" />
              <span>Upload Document</span>
            </button>
            <button
              onClick={onLoadDemo}
              disabled={isDemoLoading}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold px-6 py-3 rounded-xl text-xs transition border border-slate-200"
              title="Open isolated demonstration sandbox (does not modify your account records)"
            >
              <Sparkles className="w-4 h-4 text-brand-600" />
              <span>{isDemoLoading ? 'Loading sandbox...' : 'Explore Demo Sandbox'}</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Processed Documents</span>
                <FileText className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900">{notices.length}</div>
              <p className="text-[11px] text-slate-500">Stored in your private database</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Confirmed Commitments</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900">{events.length}</div>
              <p className="text-[11px] text-emerald-700 font-medium">Verified by human review</p>
            </div>

            <div className={`p-5 rounded-2xl border shadow-xs space-y-2 ${hardOverlaps.length > 0 ? 'bg-red-50/70 border-red-200' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center justify-between text-xs font-medium">
                <span className={hardOverlaps.length > 0 ? 'text-red-800 font-semibold' : 'text-slate-500'}>
                  Hard Overlaps
                </span>
                <AlertTriangle className={`w-4 h-4 ${hardOverlaps.length > 0 ? 'text-red-600' : 'text-slate-400'}`} />
              </div>
              <div className={`text-2xl font-extrabold ${hardOverlaps.length > 0 ? 'text-red-700' : 'text-slate-900'}`}>
                {hardOverlaps.length}
              </div>
              <p className="text-[11px] text-red-600">Simultaneous schedule clashes</p>
            </div>

            <div className={`p-5 rounded-2xl border shadow-xs space-y-2 ${deadlineWarnings.length > 0 ? 'bg-amber-50/70 border-amber-200' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center justify-between text-xs font-medium">
                <span className={deadlineWarnings.length > 0 ? 'text-amber-800 font-semibold' : 'text-slate-500'}>
                  Deadline Warnings
                </span>
                <Clock className={`w-4 h-4 ${deadlineWarnings.length > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
              </div>
              <div className={`text-2xl font-extrabold ${deadlineWarnings.length > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
                {deadlineWarnings.length}
              </div>
              <p className="text-[11px] text-amber-700">Deadlines inside active commitments</p>
            </div>

          </div>

          {/* Urgent Conflicts Alert Banner */}
          {conflicts.length > 0 && (
            <div className="bg-red-50 border border-red-300 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <h3 className="font-bold text-red-950 text-sm">
                    {conflicts.length} Actionable Schedule Conflicts Detected
                  </h3>
                </div>
                <button
                  onClick={() => onNavigate('conflicts')}
                  className="text-xs font-bold text-red-700 hover:text-red-900 flex items-center space-x-1"
                >
                  <span>Resolve in Conflict Analyzer</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2">
                {conflicts.slice(0, 2).map((c) => (
                  <div key={c.id} className="bg-white/80 p-3 rounded-xl border border-red-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-red-950">
                        {c.type === 'HARD_OVERLAP' ? `[${c.overlapMinutes}m Overlap]` : '[Deadline Alert]'}
                      </span>{' '}
                      <span className="text-slate-700">{c.explanation}</span>
                    </div>
                    <span className="text-[11px] font-mono text-red-600 font-semibold bg-red-100 px-2 py-0.5 rounded">
                      {c.overlapStart}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Two-Column Layout: Upcoming Confirmed Events & Notices */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Upcoming Events / Schedule Column */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-brand-600" />
                  <span>Upcoming Confirmed Events ({events.length})</span>
                </h3>
                <button
                  onClick={() => onNavigate('calendar')}
                  className="text-xs font-semibold text-brand-600 hover:text-brand-800 flex items-center space-x-1"
                >
                  <span>View Full Schedule</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 shadow-xs overflow-hidden">
                {events.slice(0, 5).map((ev) => (
                  <div key={ev.id} className="p-4 hover:bg-slate-50 transition flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          ev.category === 'exam' ? 'bg-red-100 text-red-800' :
                          ev.category === 'deadline' ? 'bg-amber-100 text-amber-800' :
                          ev.category === 'lecture' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {ev.category}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm">{ev.title}</h4>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center space-x-1 font-mono">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>
                            {ev.kind === 'deadline_point'
                              ? `Deadline: ${format12Hour(ev.deadlineTime)}`
                              : `${format12Hour(ev.startTime)} – ${format12Hour(ev.endTime)}`}
                          </span>
                        </span>
                        {ev.venue && (
                          <span className="flex items-center space-x-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{ev.venue}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2.5 py-1 rounded">
                      {ev.date}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Notices Column */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-slate-600" />
                  <span>Recent Notices</span>
                </h3>
                <button
                  onClick={() => onNavigate('history')}
                  className="text-xs font-semibold text-brand-600 hover:text-brand-800 flex items-center space-x-1"
                >
                  <span>All History</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 shadow-xs overflow-hidden">
                {notices.map((n) => (
                  <div 
                    key={n.id}
                    onClick={() => onOpenNotice(n.id)}
                    className="p-4 hover:bg-slate-50 transition cursor-pointer space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-slate-900 text-xs line-clamp-1">{n.title}</h4>
                      {n.isDemo && (
                        <span className="text-[9px] bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded border border-slate-200">
                          Sample
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>{n.extractedEventsCount} events extracted</span>
                      <span className="text-brand-600 font-semibold flex items-center space-x-0.5">
                        <span>Review</span>
                        <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </>
      )}

    </div>
  );
};
