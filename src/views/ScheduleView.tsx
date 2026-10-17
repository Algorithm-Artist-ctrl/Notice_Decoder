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
  ChevronRight,
  Plus,
  Bell,
  Trash2,
  Edit2,
  CheckSquare,
  Square,
  Repeat
} from 'lucide-react';
import { ExtractedEvent, EventCategory, ReminderRecord } from '../types';
import { format12Hour } from '../lib/conflict-engine';
import { downloadICalendarFile, generateICalendar } from '../lib/ics-exporter';

interface ScheduleViewProps {
  events: ExtractedEvent[];
  reminders?: ReminderRecord[];
  onOpenNotice: (noticeId: string) => void;
  onAddReminder?: () => void;
  onEditReminder?: (reminder: ReminderRecord) => void;
  onDeleteReminder?: (reminderId: string) => void;
  onToggleReminder?: (reminderId: string, completed: boolean) => void;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({ 
  events, 
  reminders = [],
  onOpenNotice,
  onAddReminder,
  onEditReminder,
  onDeleteReminder,
  onToggleReminder,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'agenda' | 'timeline'>('agenda');
  const [isExporting, setIsExporting] = useState(false);

  const categories: { id: string; label: string }[] = [
    { id: 'all', label: 'All Items' },
    { id: 'reminder', label: `Personal Reminders (${reminders.length})` },
    { id: 'exam', label: 'Exams & Tests' },
    { id: 'lecture', label: 'Lectures' },
    { id: 'deadline', label: 'Deadlines' },
    { id: 'meeting', label: 'Meetings' },
    { id: 'workshop', label: 'Workshops' },
    { id: 'job_interview', label: 'Interviews' },
    { id: 'task', label: 'Tasks' },
  ];

  // Normalized item structure
  type ScheduleItem = 
    | { type: 'event'; data: ExtractedEvent }
    | { type: 'reminder'; data: ReminderRecord };

  const allItems: ScheduleItem[] = [
    ...events.map(ev => ({ type: 'event' as const, data: ev })),
    ...reminders.map(rem => ({ type: 'reminder' as const, data: rem })),
  ];

  const filteredItems = allItems.filter(item => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'reminder') return item.type === 'reminder';
    if (item.type === 'event') {
      return item.data.category === selectedCategory;
    }
    return false;
  });

  // Group items by date
  const itemsByDate = filteredItems.reduce<Record<string, ScheduleItem[]>>((acc, item) => {
    const d = item.data.date;
    if (!acc[d]) acc[d] = [];
    acc[d].push(item);
    return acc;
  }, {});

  const sortedDates = Object.keys(itemsByDate).sort();

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
    <div className="space-y-8 animate-fade-in">
      
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Verified Commitments & Schedule</h1>
            <span className="text-[10px] font-semibold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
              RFC 5545 Ready
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Confirmed events from uploaded circulars and personal reminders with single-click universal calendar export.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onAddReminder && (
            <button
              onClick={onAddReminder}
              className="inline-flex items-center space-x-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-semibold px-4 py-2.5 rounded-xl text-xs transition"
            >
              <Plus className="w-4 h-4 text-indigo-600" />
              <span>Add Personal Reminder</span>
            </button>
          )}

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        
        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`text-xs px-3 py-1.5 rounded-xl font-medium transition ${
                selectedCategory === cat.id
                  ? 'bg-slate-900 text-white shadow-xs font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* View Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-medium self-start sm:self-auto">
          <button
            onClick={() => setViewMode('agenda')}
            className={`px-3 py-1.5 rounded-lg transition ${viewMode === 'agenda' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600'}`}
          >
            Agenda View
          </button>
          <button
            onClick={() => setViewMode('timeline')}
            className={`px-3 py-1.5 rounded-lg transition ${viewMode === 'timeline' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600'}`}
          >
            Timeline Scale
          </button>
        </div>

      </div>

      {/* Main Schedule Content */}
      {filteredItems.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-xl mx-auto space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900">No scheduled items found</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Upload circulars to extract events, or click "Add Personal Reminder" to create custom deadlines and tasks.
          </p>
          {onAddReminder && (
            <button
              onClick={onAddReminder}
              className="inline-flex items-center space-x-1.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-4 py-2 rounded-xl text-xs shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Create Your First Reminder</span>
            </button>
          )}
        </div>
      ) : viewMode === 'agenda' ? (
        /* Agenda View */
        <div className="space-y-6">
          {sortedDates.map((dateStr) => {
            const dateItems = itemsByDate[dateStr];

            return (
              <div key={dateStr} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
                
                {/* Date Header */}
                <div className="bg-slate-50/80 border-b border-slate-100 px-6 py-3.5 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CalendarIcon className="w-4 h-4 text-brand-600" />
                    <span className="font-bold text-slate-900 text-xs font-mono">{dateStr}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {dateItems.length} {dateItems.length === 1 ? 'item' : 'items'} scheduled
                  </span>
                </div>

                {/* Rows */}
                <div className="divide-y divide-slate-100">
                  {dateItems.map((item) => {
                    if (item.type === 'reminder') {
                      const rem = item.data;
                      return (
                        <div 
                          key={`rem-${rem.id}`} 
                          className={`p-5 hover:bg-indigo-50/30 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                            rem.isCompleted ? 'opacity-60 bg-slate-50/50' : ''
                          }`}
                        >
                          <div className="flex items-start space-x-3 min-w-0">
                            {onToggleReminder && (
                              <button
                                onClick={() => onToggleReminder(rem.id, !rem.isCompleted)}
                                className="mt-0.5 text-slate-400 hover:text-brand-600 transition shrink-0"
                                title={rem.isCompleted ? 'Mark incomplete' : 'Mark completed'}
                              >
                                {rem.isCompleted ? (
                                  <CheckSquare className="w-5 h-5 text-emerald-600" />
                                ) : (
                                  <Square className="w-5 h-5" />
                                )}
                              </button>
                            )}

                            <div className="space-y-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200/60 flex items-center space-x-1 shrink-0">
                                  <Bell className="w-3 h-3 text-indigo-600" />
                                  <span>Personal Reminder</span>
                                </span>
                                {rem.recurrence && rem.recurrence !== 'none' && (
                                  <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full flex items-center space-x-1">
                                    <Repeat className="w-2.5 h-2.5" />
                                    <span className="capitalize">{rem.recurrence}</span>
                                  </span>
                                )}
                                <h3 className={`font-bold text-slate-900 text-sm break-words ${rem.isCompleted ? 'line-through text-slate-500' : ''}`}>
                                  {rem.title}
                                </h3>
                              </div>

                              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                                <span className="flex items-center space-x-1 font-mono font-medium text-slate-700">
                                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                                  <span>
                                    {rem.deadlineTime 
                                      ? `Cut-off: ${format12Hour(rem.deadlineTime)}`
                                      : rem.startTime 
                                      ? `${format12Hour(rem.startTime)}${rem.endTime ? ` – ${format12Hour(rem.endTime)}` : ''}`
                                      : 'All Day'}
                                  </span>
                                </span>

                                {rem.location && (
                                  <span className="flex items-center space-x-1">
                                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                    <span>{rem.location}</span>
                                  </span>
                                )}

                                {rem.description && (
                                  <span className="text-slate-500 line-clamp-1 max-w-sm">
                                    {rem.description}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 shrink-0 self-start sm:self-auto">
                            {onEditReminder && (
                              <button
                                onClick={() => onEditReminder(rem)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                                title="Edit reminder"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}
                            {onDeleteReminder && (
                              <button
                                onClick={() => onDeleteReminder(rem.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                title="Delete reminder"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    }

                    // Extracted Event Row
                    const ev = item.data;
                    const isDeadline = ev.kind === 'deadline_point';

                    return (
                      <div key={`ev-${ev.id}`} className="p-5 hover:bg-slate-50/70 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              ev.category === 'exam' ? 'bg-red-100 text-red-800' :
                              ev.category === 'deadline' ? 'bg-amber-100 text-amber-800' :
                              ev.category === 'lecture' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {ev.category}
                            </span>
                            <h3 className="font-bold text-slate-900 text-sm break-words">{ev.title}</h3>
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
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
          <div className="text-xs text-slate-500 font-medium">
            Visualizing events & reminders on a chronological scale
          </div>

          <div className="space-y-4">
            {filteredItems.map((item) => {
              if (item.type === 'reminder') {
                const rem = item.data;
                return (
                  <div key={`timeline-rem-${rem.id}`} className="border border-indigo-100 bg-indigo-50/20 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded shrink-0">
                          {rem.date}
                        </span>
                        <span className="font-bold text-slate-900 text-sm break-words">{rem.title}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1 break-words">
                        {rem.deadlineTime ? `Cut-off at ${format12Hour(rem.deadlineTime)}` : rem.startTime ? `From ${format12Hour(rem.startTime)}` : 'All Day'} · {rem.location || 'Personal'}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2.5 py-1 rounded-full self-start sm:self-auto shrink-0 flex items-center space-x-1">
                      <Bell className="w-3 h-3" />
                      <span>REMINDER</span>
                    </span>
                  </div>
                );
              }

              const ev = item.data;
              return (
                <div key={`timeline-ev-${ev.id}`} className="border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded shrink-0">
                        {ev.date}
                      </span>
                      <span className="font-bold text-slate-900 text-sm break-words">{ev.title}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1 break-words">
                      {ev.kind === 'deadline_point'
                        ? `Deadline at ${format12Hour(ev.deadlineTime || ev.startTime)}`
                        : `From ${format12Hour(ev.startTime)} to ${format12Hour(ev.endTime)}`} · {ev.venue || 'Campus'}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-semibold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full self-start sm:self-auto shrink-0">
                    {ev.kind.toUpperCase()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};
