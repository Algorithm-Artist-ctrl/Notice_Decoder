import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  Download, 
  Clock, 
  MapPin, 
  Tag, 
  Filter, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { ExtractedEvent, EventCategory } from '../types';
import { format12Hour } from '../lib/conflict-engine';
import { downloadICalendarFile, generateICalendar } from '../lib/ics-exporter';

interface ScheduleViewProps {
  events: ExtractedEvent[];
  onOpenNotice: (noticeId: string) => void;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({ events, onOpenNotice }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'agenda' | 'timeline'>('agenda');
  const [isExporting, setIsExporting] = useState(false);

  const categories: { id: string; label: string }[] = [
    { id: 'all', label: 'All Items' },
    { id: 'exam', label: 'Exams & Tests' },
    { id: 'lecture', label: 'Lectures' },
    { id: 'deadline', label: 'Deadlines' },
    { id: 'meeting', label: 'Meetings' },
    { id: 'workshop', label: 'Workshops' },
    { id: 'job_interview', label: 'Interviews' },
    { id: 'task', label: 'Tasks' },
  ];

  const filteredEvents = events.filter(e => {
    if (selectedCategory === 'all') return true;
    return e.category === selectedCategory;
  });

  // Group events by date
  const eventsByDate = filteredEvents.reduce<Record<string, ExtractedEvent[]>>((acc, ev) => {
    const d = ev.date;
    if (!acc[d]) acc[d] = [];
    acc[d].push(ev);
    return acc;
  }, {});

  const sortedDates = Object.keys(eventsByDate).sort();

  const handleExportICS = async () => {
    try {
      setIsExporting(true);
      const icsString = generateICalendar(events, 'Notice Decoder Schedule');
      downloadICalendarFile(icsString, 'notice-decoder-schedule.ics');
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-8">
      
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Verified Commitments & Schedule</h1>
            <span className="text-[10px] font-semibold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
              RFC 5545 Ready
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Confirmed events and deadlines verified through the review gate, with single-click universal calendar export.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportICS}
            disabled={isExporting || events.length === 0}
            className="inline-flex items-center space-x-2 bg-navy-900 hover:bg-navy-850 text-white font-semibold px-4 py-2.5 rounded-xl text-xs shadow-sm transition disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-brand-300" />
            <span>{isExporting ? 'Generating...' : 'Export to .ics Calendar'}</span>
          </button>
        </div>
      </div>

      {/* Filter and View Toggles Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
        
        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                selectedCategory === cat.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* View Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs font-medium self-start sm:self-auto">
          <button
            onClick={() => setViewMode('agenda')}
            className={`px-3 py-1 rounded-md transition ${viewMode === 'agenda' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}
          >
            Agenda View
          </button>
          <button
            onClick={() => setViewMode('timeline')}
            className={`px-3 py-1 rounded-md transition ${viewMode === 'timeline' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}
          >
            Timeline Scale
          </button>
        </div>

      </div>

      {/* Main Schedule Content */}
      {filteredEvents.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center max-w-xl mx-auto space-y-3">
          <CalendarIcon className="w-10 h-10 text-slate-400 mx-auto" />
          <h2 className="text-base font-bold text-slate-900">No events found for this filter</h2>
          <p className="text-xs text-slate-500">
            Select another category or upload circulars to populate your schedule.
          </p>
        </div>
      ) : viewMode === 'agenda' ? (
        /* Agenda View */
        <div className="space-y-6">
          {sortedDates.map((dateStr) => {
            const dateEvents = eventsByDate[dateStr];

            return (
              <div key={dateStr} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                
                {/* Date Header */}
                <div className="bg-slate-50 border-b border-slate-200 px-5 py-3.5 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CalendarIcon className="w-4 h-4 text-brand-600" />
                    <span className="font-bold text-slate-900 text-xs font-mono">{dateStr}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {dateEvents.length} items scheduled
                  </span>
                </div>

                {/* Event Rows */}
                <div className="divide-y divide-slate-100">
                  {dateEvents.map((ev) => {
                    const isDeadline = ev.kind === 'deadline_point';

                    return (
                      <div key={ev.id} className="p-5 hover:bg-slate-50/70 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        
                        <div className="space-y-1.5">
                          <div className="flex items-center space-x-2">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                              ev.category === 'exam' ? 'bg-red-100 text-red-800' :
                              ev.category === 'deadline' ? 'bg-amber-100 text-amber-800' :
                              ev.category === 'lecture' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {ev.category}
                            </span>
                            <h3 className="font-bold text-slate-900 text-sm">{ev.title}</h3>
                          </div>

                          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                            <span className="flex items-center space-x-1 font-mono font-medium text-slate-700">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>
                                {isDeadline 
                                  ? `Deadline: ${format12Hour(ev.deadlineTime || ev.startTime)}`
                                  : `${format12Hour(ev.startTime)} – ${format12Hour(ev.endTime)}`}
                              </span>
                            </span>

                            {ev.venue && (
                              <span className="flex items-center space-x-1">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                <span>{ev.venue}</span>
                              </span>
                            )}

                            {ev.departmentOrAudience && (
                              <span className="text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                                {ev.departmentOrAudience}
                              </span>
                            )}
                          </div>
                        </div>

                        {ev.noticeId && (
                          <button
                            onClick={() => onOpenNotice(ev.noticeId!)}
                            className="text-xs font-semibold text-brand-600 hover:text-brand-800 shrink-0 self-start sm:self-auto flex items-center space-x-1"
                          >
                            <span>Source Notice</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}

                      </div>
                    );
                  })}
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        /* Timeline View */
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="text-xs text-slate-500 font-medium">
            Visualizing events on chronological scale
          </div>

          <div className="space-y-4">
            {filteredEvents.map((ev) => (
              <div key={ev.id} className="border border-slate-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded">
                      {ev.date}
                    </span>
                    <span className="font-bold text-slate-900 text-sm">{ev.title}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {ev.kind === 'deadline_point'
                      ? `Deadline at ${format12Hour(ev.deadlineTime || ev.startTime)}`
                      : `From ${format12Hour(ev.startTime)} to ${format12Hour(ev.endTime)}`} · {ev.venue || 'Campus'}
                  </div>
                </div>
                <span className="text-[10px] font-mono font-semibold bg-slate-100 text-slate-600 px-2.5 py-1 rounded">
                  {ev.kind.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
