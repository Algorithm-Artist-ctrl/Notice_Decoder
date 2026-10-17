import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  FileText, 
  ArrowRight, 
  ShieldAlert, 
  Sparkles,
  MapPin,
  HelpCircle,
  Calendar
} from 'lucide-react';
import { ConflictRecord, ExtractedEvent } from '../types';
import { format12Hour } from '../lib/conflict-engine';
import { NavTab } from '../components/Navbar';

interface ConflictsViewProps {
  conflicts: ConflictRecord[];
  events: ExtractedEvent[];
  onOpenNotice: (noticeId: string) => void;
  onNavigate: (tab: NavTab) => void;
}

export const ConflictsView: React.FC<ConflictsViewProps> = ({
  conflicts,
  events,
  onOpenNotice,
  onNavigate,
}) => {
  const [filter, setFilter] = useState<'all' | 'hard_overlap' | 'deadline'>('all');

  const filteredConflicts = conflicts.filter(c => {
    if (filter === 'hard_overlap') return c.type === 'HARD_OVERLAP';
    if (filter === 'deadline') return c.type === 'DEADLINE_DURING_EVENT';
    return true;
  });

  const hardOverlapsCount = conflicts.filter(c => c.type === 'HARD_OVERLAP').length;
  const deadlineCount = conflicts.filter(c => c.type === 'DEADLINE_DURING_EVENT').length;

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Deterministic Conflict Analysis</h1>
            <span className="text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
              Half-Open Interval Math
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Proven timetable overlap calculation based strictly on <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-800">[start, end)</code> intervals and discrete point deadlines.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap sm:flex-nowrap items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold gap-1 max-w-full">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${filter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}
          >
            All ({conflicts.length})
          </button>
          <button
            onClick={() => setFilter('hard_overlap')}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${filter === 'hard_overlap' ? 'bg-red-600 text-white shadow-xs' : 'text-slate-600'}`}
          >
            <span className="sm:hidden">Overlaps</span>
            <span className="hidden sm:inline">Schedule Overlaps</span> ({hardOverlapsCount})
          </button>
          <button
            onClick={() => setFilter('deadline')}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${filter === 'deadline' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600'}`}
          >
            <span className="sm:hidden">Deadlines</span>
            <span className="hidden sm:inline">Deadline Alerts</span> ({deadlineCount})
          </button>
        </div>
      </div>

      {/* Zero Conflicts State */}
      {conflicts.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center max-w-xl mx-auto space-y-4 shadow-xs">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Zero Schedule Conflicts Detected</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            All your confirmed schedule items have disjoint time intervals or valid non-overlapping sequences.
          </p>
          <button
            onClick={() => onNavigate('calendar')}
            className="inline-flex items-center space-x-2 text-xs font-semibold px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition"
          >
            <span>View Calendar & Export .ics</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          
          {filteredConflicts.map((c) => {
            const isHardOverlap = c.type === 'HARD_OVERLAP';

            return (
              <div 
                key={c.id}
                className={`bg-white rounded-2xl border transition p-6 shadow-xs space-y-5 ${
                  isHardOverlap 
                    ? 'border-red-300 ring-1 ring-red-100' 
                    : 'border-amber-300 ring-1 ring-amber-100'
                }`}
              >
                
                {/* Conflict Card Title & Severity Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                  <div className="flex items-center space-x-2.5">
                    {isHardOverlap ? (
                      <span className="p-2 rounded-xl bg-red-100 text-red-700">
                        <AlertTriangle className="w-5 h-5" />
                      </span>
                    ) : (
                      <span className="p-2 rounded-xl bg-amber-100 text-amber-700">
                        <Clock className="w-5 h-5" />
                      </span>
                    )}
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          isHardOverlap ? 'bg-red-600 text-white' : 'bg-amber-600 text-white'
                        }`}>
                          {isHardOverlap ? 'Schedule Overlap' : 'Deadline During Event'}
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-700">
                          {c.eventA.date}
                        </span>
                      </div>
                      <h3 className="font-extrabold text-slate-900 text-base mt-1">
                        {isHardOverlap 
                          ? `${c.eventA.title} × ${c.eventB.title}`
                          : `Deadline: ${c.eventB.title}`}
                      </h3>
                    </div>
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <span className="text-xs font-mono font-bold text-slate-900 block">
                      {isHardOverlap ? `${c.overlapMinutes} Minutes Overlap` : 'Critical Time Collision'}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Window: {format12Hour(c.overlapStart)} – {format12Hour(c.overlapEnd)}
                    </span>
                  </div>
                </div>

                {/* Overlapping Entity Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Event A */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-200 px-2 py-0.5 rounded">
                        {c.eventA.category}
                      </span>
                      <span className="text-xs font-mono font-semibold text-slate-700">
                        {format12Hour(c.eventA.startTime)} – {format12Hour(c.eventA.endTime)}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm">{c.eventA.title}</h4>
                    <div className="flex items-center space-x-3 text-xs text-slate-500">
                      {c.eventA.venue && (
                        <span className="flex items-center space-x-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{c.eventA.venue}</span>
                        </span>
                      )}
                    </div>
                    {c.eventA.noticeId && (
                      <button
                        onClick={() => onOpenNotice(c.eventA.noticeId!)}
                        className="text-[11px] font-semibold text-brand-600 hover:underline pt-1 block"
                      >
                        View Source Notice &rarr;
                      </button>
                    )}
                  </div>

                  {/* Event B / Deadline */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-200 px-2 py-0.5 rounded">
                        {c.eventB.category}
                      </span>
                      <span className="text-xs font-mono font-semibold text-slate-700">
                        {c.eventB.kind === 'deadline_point' 
                          ? `Deadline: ${format12Hour(c.eventB.deadlineTime || c.eventB.startTime)}`
                          : `${format12Hour(c.eventB.startTime)} – ${format12Hour(c.eventB.endTime)}`}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm">{c.eventB.title}</h4>
                    <div className="flex items-center space-x-3 text-xs text-slate-500">
                      {c.eventB.venue && (
                        <span className="flex items-center space-x-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{c.eventB.venue}</span>
                        </span>
                      )}
                    </div>
                    {c.eventB.noticeId && (
                      <button
                        onClick={() => onOpenNotice(c.eventB.noticeId!)}
                        className="text-[11px] font-semibold text-brand-600 hover:underline pt-1 block"
                      >
                        View Source Notice &rarr;
                      </button>
                    )}
                  </div>

                </div>

                {/* Mathematical Proof Box */}
                <div className="bg-slate-900 text-slate-200 p-4 rounded-xl font-mono text-xs space-y-1 overflow-x-auto max-w-full">
                  <div className="text-brand-300 font-bold text-[11px] uppercase tracking-wider">
                    // Deterministic Proof:
                  </div>
                  <div className="text-slate-100 break-words">{c.mathProof}</div>
                  <div className="text-slate-400 text-[11px] pt-1">
                    Proof logic: Evaluated via half-open interval overlap algorithm.
                  </div>
                </div>

                {/* Suggested Action Pill */}
                <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-xl text-xs flex items-start space-x-2">
                  <HelpCircle className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-blue-950">Suggested Action: </span>
                    <span className="text-blue-900">{c.suggestedAction}</span>
                  </div>
                </div>

              </div>
            );
          })}

        </div>
      )}

    </div>
  );
};
