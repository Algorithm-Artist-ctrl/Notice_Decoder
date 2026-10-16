import React from 'react';
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
  Tag,
  AlertCircle
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
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  notices,
  events,
  conflicts,
  onNavigate,
  onOpenNotice,
  onLoadDemo,
  isDemoLoading,
}) => {
  const hardOverlaps = conflicts.filter(c => c.type === 'HARD_OVERLAP');
  const deadlineWarnings = conflicts.filter(c => c.type === 'DEADLINE_DURING_EVENT');
  const deadlines = events.filter(e => e.kind === 'deadline_point');

  const isEmpty = notices.length === 0;

  return (
    <div className="space-y-8">
      
      {/* Top Banner / Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Academic Schedule Dashboard</h1>
            <span className="text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
              Live Stored Records
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time conflict detection and synchronized schedule from verified circulars.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => onNavigate('notices')}
            className="inline-flex items-center space-x-2 bg-navy-900 hover:bg-navy-850 text-white font-medium px-4 py-2.5 rounded-xl text-xs shadow-xs transition"
          >
            <UploadCloud className="w-4 h-4 text-brand-300" />
            <span>Upload Notice</span>
          </button>
          
          {isEmpty && (
            <button
              onClick={onLoadDemo}
              disabled={isDemoLoading}
              className="inline-flex items-center space-x-1.5 bg-brand-50 hover:bg-brand-100 text-brand-800 border border-brand-200 font-medium px-4 py-2.5 rounded-xl text-xs transition disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-brand-600" />
              <span>{isDemoLoading ? 'Loading sample...' : 'Try sample notice'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Empty State */}
      {isEmpty ? (
        <div className="bg-white border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center max-w-2xl mx-auto space-y-4">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
            <FileText className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">No notices uploaded yet</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Upload an academic circular, timetable, or exam notice to view upcoming commitments and detect schedule conflicts, or explore our sample notice.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => onNavigate('notices')}
              className="inline-flex items-center space-x-2 bg-brand-600 hover:bg-brand-700 text-white font-medium px-5 py-2.5 rounded-xl text-xs transition shadow-xs"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload Notice</span>
            </button>
            <button
              onClick={onLoadDemo}
              disabled={isDemoLoading}
              className="inline-flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium px-5 py-2.5 rounded-xl text-xs transition"
            >
              <Sparkles className="w-4 h-4 text-brand-600" />
              <span>{isDemoLoading ? 'Loading sample...' : 'Try sample notice'}</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Saved Notices</span>
                <FileText className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900">{notices.length}</div>
              <p className="text-[11px] text-slate-500">Processed into schedule records</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Confirmed Events</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900">{events.length}</div>
              <p className="text-[11px] text-emerald-700 font-medium">Verified by student review</p>
            </div>

            <div className={`p-5 rounded-xl border shadow-xs space-y-2 ${hardOverlaps.length > 0 ? 'bg-red-50/70 border-red-200' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center justify-between text-xs font-medium">
                <span className={hardOverlaps.length > 0 ? 'text-red-800 font-semibold' : 'text-slate-500'}>
                  Hard Overlaps
                </span>
                <AlertTriangle className={`w-4 h-4 ${hardOverlaps.length > 0 ? 'text-red-600' : 'text-slate-400'}`} />
              </div>
              <div className={`text-2xl font-extrabold ${hardOverlaps.length > 0 ? 'text-red-700' : 'text-slate-900'}`}>
                {hardOverlaps.length}
              </div>
              <p className="text-[11px] text-red-600">Simultaneous event clashes</p>
            </div>

            <div className={`p-5 rounded-xl border shadow-xs space-y-2 ${deadlineWarnings.length > 0 ? 'bg-amber-50/70 border-amber-200' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center justify-between text-xs font-medium">
                <span className={deadlineWarnings.length > 0 ? 'text-amber-800 font-semibold' : 'text-slate-500'}>
                  Deadline Warnings
                </span>
                <Clock className={`w-4 h-4 ${deadlineWarnings.length > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
              </div>
              <div className={`text-2xl font-extrabold ${deadlineWarnings.length > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
                {deadlineWarnings.length}
              </div>
              <p className="text-[11px] text-amber-700">Deadlines inside active events</p>
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
                  <div key={c.id} className="bg-white/80 p-3 rounded-lg border border-red-200 flex items-center justify-between text-xs">
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

              <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 shadow-xs">
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
                    <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded">
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

              <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 shadow-xs">
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
                      <span className="text-brand-600 font-medium">Review &rarr;</span>
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
