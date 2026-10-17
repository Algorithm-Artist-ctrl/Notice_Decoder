import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  MapPin, 
  Tag, 
  Save, 
  Trash2, 
  Plus, 
  ArrowLeft, 
  Sparkles,
  ShieldAlert,
  Info,
  Calendar,
  CheckSquare,
  Phone,
  ListChecks
} from 'lucide-react';
import { NoticeRecord, ExtractedEvent, EventCategory, EventKind } from '../types';
import { detectConflicts, format12Hour } from '../lib/conflict-engine';
import { apiClient } from '../lib/api-client';

interface ReviewViewProps {
  notice: NoticeRecord;
  initialEvents: ExtractedEvent[];
  onConfirm: (confirmedEvents: ExtractedEvent[]) => void;
  onCancel: () => void;
}

export const ReviewView: React.FC<ReviewViewProps> = ({
  notice,
  initialEvents,
  onConfirm,
  onCancel,
}) => {
  const [events, setEvents] = useState<ExtractedEvent[]>(initialEvents);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(
    initialEvents.length > 0 ? initialEvents[0].id : null
  );
  const [isSaving, setIsSaving] = useState(false);

  // Re-run conflict engine whenever editable events change!
  const liveConflictAnalysis = useMemo(() => {
    return detectConflicts(events);
  }, [events]);

  const selectedEvent = events.find(e => e.id === selectedEventId) || events[0];

  const updateField = (id: string, field: keyof ExtractedEvent, value: any) => {
    setEvents(prev => prev.map(ev => {
      if (ev.id !== id) return ev;
      const updated = { ...ev, [field]: value };
      
      // Auto-clear review required if user fixed start and end times
      if (updated.kind === 'timed_event' && updated.startTime && updated.endTime) {
        updated.reviewRequired = false;
        updated.reviewReasons = [];
      }
      return updated;
    }));
  };

  const handleAddNewEvent = () => {
    const newId = `ev-manual-${Date.now()}`;
    const newEvent: ExtractedEvent = {
      id: newId,
      noticeId: notice.id,
      title: 'New Action Item',
      category: 'task',
      kind: 'timed_event',
      date: events[0]?.date || new Date().toISOString().split('T')[0],
      startTime: '10:00',
      endTime: '11:00',
      deadlineTime: null,
      venue: 'Office / Campus',
      departmentOrAudience: 'All Participants',
      sourceTextEvidence: 'Manually added by user',
      confidence: 1.0,
      reviewRequired: false,
      reviewReasons: [],
      isConfirmed: true,
      timezone: 'Asia/Kolkata',
    };
    setEvents([...events, newEvent]);
    setSelectedEventId(newId);
  };

  const handleDeleteEvent = (id: string) => {
    const filtered = events.filter(e => e.id !== id);
    setEvents(filtered);
    if (selectedEventId === id && filtered.length > 0) {
      setSelectedEventId(filtered[0].id);
    }
  };

  const handleSaveAndConfirm = async () => {
    setIsSaving(true);
    try {
      // 1. Send patched events to server
      for (const ev of events) {
        await apiClient.patch(`/api/events/${ev.id}`, ev);
      }

      // 2. Mark notice as confirmed
      const result = await apiClient.post(`/api/notices/${notice.id}/confirm`);
      if (!result.success) throw new Error(result.error || 'Failed to confirm events');

      onConfirm(events);
    } catch (err: any) {
      alert(`Save error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Action Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={onCancel}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center space-x-1 mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Review & Verify Extracted Information</h1>
            {notice.documentDomain && (
              <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-0.5 rounded-full">
                {notice.documentDomain}
              </span>
            )}
            {notice.documentType && (
              <span className="text-[10px] font-bold uppercase tracking-wider bg-brand-50 text-brand-700 border border-brand-200 px-2.5 py-0.5 rounded-full">
                {notice.documentType.replace(/_/g, ' ')}
              </span>
            )}
            {notice.analysisCase && (
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                notice.analysisCase === 'A' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                notice.analysisCase === 'B' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                notice.analysisCase === 'C' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                notice.analysisCase === 'D' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                'bg-slate-100 text-slate-700 border-slate-200'
              }`}>
                Case {notice.analysisCase}: {
                  notice.analysisCase === 'A' ? 'Timed Schedule' :
                  notice.analysisCase === 'B' ? 'Deadlines & Tasks' :
                  notice.analysisCase === 'C' ? 'Directives & Guidance' :
                  notice.analysisCase === 'D' ? 'Mixed Content' :
                  'Informational'
                }
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Human-in-the-loop review gate: Verify every field against source evidence before scheduling.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleAddNewEvent}
            className="inline-flex items-center space-x-1.5 text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 transition"
          >
            <Plus className="w-3.5 h-3.5 text-slate-600" />
            <span>Add Event</span>
          </button>

          <button
            onClick={handleSaveAndConfirm}
            disabled={isSaving}
            className="inline-flex items-center space-x-2 text-xs font-bold px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : events.length === 0 ? 'Confirm & Save Document' : 'Confirm & Save Schedule'}</span>
          </button>
        </div>
      </div>

      {/* Live Conflict Warning Pill if edits created or resolved conflicts */}
      {liveConflictAnalysis.hasConflicts && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2 text-red-900">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>
              <strong>Deterministic Check:</strong> {liveConflictAnalysis.hardOverlapsCount} hard overlaps & {liveConflictAnalysis.deadlineWarningsCount} deadline alerts detected in current review.
            </span>
          </div>
          <span className="text-red-700 font-mono font-semibold">
            Real-time recalculated
          </span>
        </div>
      )}

      {/* Dual Pane Layout: Left = Document Evidence, Right = Editable Event Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Pane: Original Notice Evidence */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4 sticky top-24">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
              <FileText className="w-4 h-4 text-brand-600" />
              <span>Source Document Evidence</span>
            </h2>
            <span className="text-[11px] font-mono text-slate-500">
              {notice.fileType.toUpperCase()} {notice.fileSize ? `· ${(notice.fileSize / 1024).toFixed(0)} KB` : ''}
            </span>
          </div>

          {/* AI Executive Summary if available */}
          {notice.summary && (
            <div className="bg-brand-50/60 border border-brand-200/70 rounded-xl p-3.5 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-800 flex items-center space-x-1">
                <Sparkles className="w-3 h-3 text-brand-600" />
                <span>Executive Summary</span>
              </span>
              <p className="text-xs text-slate-700 leading-relaxed">
                {notice.summary}
              </p>
            </div>
          )}

          {/* Key Takeaways & Information Points if available */}
          {notice.keyInformation && notice.keyInformation.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1">
                <Info className="w-3 h-3 text-slate-500" />
                <span>Key Directives & Instructions ({notice.keyInformation.length})</span>
              </span>
              <ul className="text-xs text-slate-600 space-y-1.5 pl-1">
                {notice.keyInformation.map((item, idx) => (
                  <li key={idx} className="flex items-start space-x-2">
                    <span className="text-brand-600 font-bold">•</span>
                    <span className="leading-snug">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Directives & Policies if distinct */}
          {notice.directives && notice.directives.length > 0 && (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center space-x-1">
                <ListChecks className="w-3.5 h-3.5 text-emerald-600" />
                <span>Directives & Policies ({notice.directives.length})</span>
              </span>
              <ul className="text-xs text-emerald-950 space-y-1.5 pl-1">
                {notice.directives.map((dir, idx) => (
                  <li key={idx} className="flex items-start space-x-2">
                    <span className="text-emerald-600 font-bold">•</span>
                    <span className="leading-snug">{dir}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Tasks & Requirements */}
          {notice.requiredActions && notice.requiredActions.length > 0 && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 flex items-center space-x-1">
                <CheckSquare className="w-3.5 h-3.5 text-amber-600" />
                <span>Action Tasks & Requirements ({notice.requiredActions.length})</span>
              </span>
              <div className="space-y-2">
                {notice.requiredActions.map((act, idx) => (
                  <div key={idx} className="bg-white/80 border border-amber-100 rounded-lg p-2 text-xs text-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900">{act.action || act.task}</span>
                      {act.priority && (
                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          act.priority === 'high' ? 'bg-red-100 text-red-700' :
                          act.priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {act.priority}
                        </span>
                      )}
                    </div>
                    {(act.assigneeOrTarget || act.deadline || act.dueDate) && (
                      <div className="flex items-center space-x-3 text-[11px] text-slate-500">
                        {act.assigneeOrTarget && <span>Target: {act.assigneeOrTarget}</span>}
                        {(act.deadline || act.dueDate) && <span>Due: {act.deadline || act.dueDate}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contacts & References */}
          {notice.contactsOrReferences && notice.contactsOrReferences.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                <span>Contacts & References ({notice.contactsOrReferences.length})</span>
              </span>
              <ul className="text-xs text-slate-600 space-y-1 pl-1 font-mono text-[11px]">
                {notice.contactsOrReferences.map((ref, idx) => (
                  <li key={idx} className="flex items-center space-x-1.5">
                    <span className="text-slate-400">#</span>
                    <span>{ref}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-mono leading-relaxed text-slate-800 space-y-3">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {notice.title}
            </div>
            <div className="whitespace-pre-wrap max-h-60 overflow-y-auto">
              {notice.rawText}
            </div>
          </div>

          {/* Selected Evidence Highlight Box */}
          {selectedEvent && (
            <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-brand-900 font-bold uppercase tracking-wider">
                <span>Supporting Source Evidence:</span>
                <span className="bg-brand-200 text-brand-800 px-1.5 py-0.5 rounded font-mono">
                  {(selectedEvent.confidence * 100).toFixed(0)}% confidence
                </span>
              </div>
              <blockquote className="text-xs text-brand-950 font-medium italic border-l-2 border-brand-400 pl-3 py-1">
                "{selectedEvent.sourceTextEvidence}"
              </blockquote>
              {selectedEvent.reviewRequired && (
                <div className="flex items-center space-x-1 text-[11px] text-amber-700 font-semibold pt-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Review Required: {selectedEvent.reviewReasons.join(', ')}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Pane: Editable Event Cards */}
        <div className="lg:col-span-7 space-y-4">
          
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>
                {notice.analysisCase === 'B' 
                  ? `Extracted Deadlines & Action Tasks (${events.length})` 
                  : notice.analysisCase === 'A'
                  ? `Extracted Timed Events (${events.length})`
                  : notice.analysisCase === 'D'
                  ? `Extracted Schedules & Tasks (${events.length})`
                  : `Extracted Items & Corrections (${events.length})`}
              </span>
            </h2>
            <span className="text-[11px] text-slate-500">
              {events.length > 0 ? 'Click any card to edit its properties' : 'Zero-date document'}
            </span>
          </div>

          {events.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4 shadow-xs">
              <div className="w-12 h-12 bg-blue-50 text-brand-600 rounded-2xl flex items-center justify-center mx-auto">
                <Info className="w-6 h-6" />
              </div>
              <div className="space-y-1.5 max-w-md mx-auto">
                <span className="inline-block text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full mb-1">
                  {notice.analysisCase === 'E' 
                    ? 'Informational Notice — No Action Required' 
                    : 'Reference & Policy Document (Zero-Date)'}
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  {notice.analysisCase === 'E' 
                    ? 'Purely Informational Document' 
                    : 'Directives & Guidance (No Scheduled Dates)'}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {notice.analysisCase === 'E'
                    ? 'This document has been analyzed as an informational circular or announcement with zero calendar commitments or mandatory tasks.'
                    : 'This document contains policy directives, general instructions, or regulations without calendar deadlines or scheduled time slots.'}
                </p>
              </div>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleAddNewEvent}
                  className="inline-flex items-center space-x-1.5 text-xs font-medium px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Manual Event</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveAndConfirm}
                  disabled={isSaving}
                  className="inline-flex items-center space-x-1.5 text-xs font-bold px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Saving...' : 'Save & Confirm Document'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((ev, index) => {
                const isSelected = selectedEventId === ev.id;

                return (
                  <div
                    key={ev.id}
                    onClick={() => setSelectedEventId(ev.id)}
                    className={`bg-white rounded-2xl border transition p-5 shadow-xs cursor-pointer ${
                      isSelected 
                        ? 'border-brand-500 ring-2 ring-brand-100' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 text-xs font-mono font-bold flex items-center justify-center">
                          {index + 1}
                        </span>
                        <select
                          aria-label="Event category"
                          value={ev.category}
                          onChange={(e) => updateField(ev.id, 'category', e.target.value as EventCategory)}
                          className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-800"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value="exam">Exam / Test</option>
                          <option value="lecture">Lecture / Seminar</option>
                          <option value="deadline">Submission / Deadline</option>
                          <option value="meeting">Meeting</option>
                          <option value="workshop">Workshop</option>
                          <option value="job_interview">Job Interview / Placement</option>
                          <option value="conference">Conference</option>
                          <option value="public_filing">Public Notice / Filing</option>
                          <option value="task">Action Task</option>
                          <option value="other">Other</option>
                        </select>

                        <select
                          aria-label="Event kind"
                          value={ev.kind}
                          onChange={(e) => updateField(ev.id, 'kind', e.target.value as EventKind)}
                          className="text-xs px-2 py-1 rounded-lg border border-slate-200 bg-white text-slate-600"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value="timed_event">Timed Event (Duration)</option>
                          <option value="deadline_point">Discrete Deadline Point</option>
                          <option value="action_task">Action Task</option>
                          <option value="info_point">Informational Point</option>
                        </select>
                      </div>

                    <button
                      type="button"
                      aria-label="Delete this event candidate"
                      onClick={(e) => { e.stopPropagation(); handleDeleteEvent(ev.id); }}
                      className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition"
                      title="Delete this event candidate"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Title Input */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Event Title</label>
                      <input
                        type="text"
                        value={ev.title}
                        onChange={(e) => updateField(ev.id, 'title', e.target.value)}
                        className="w-full text-sm font-semibold text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>

                    {/* Date and Times Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Date (YYYY-MM-DD)</label>
                        <input
                          type="date"
                          value={ev.date}
                          onChange={(e) => updateField(ev.id, 'date', e.target.value)}
                          className="w-full text-xs font-mono px-3 py-1.5 rounded-lg border border-slate-200"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>

                      {ev.kind === 'deadline_point' ? (
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Deadline Time (24h HH:mm)</label>
                          <input
                            type="time"
                            value={ev.deadlineTime || ev.startTime || ''}
                            onChange={(e) => {
                              updateField(ev.id, 'deadlineTime', e.target.value);
                              updateField(ev.id, 'startTime', e.target.value);
                            }}
                            className="w-full text-xs font-mono px-3 py-1.5 rounded-lg border border-slate-200"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      ) : (
                        <>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Start Time (HH:mm)</label>
                            <input
                              type="time"
                              value={ev.startTime || ''}
                              onChange={(e) => updateField(ev.id, 'startTime', e.target.value)}
                              className="w-full text-xs font-mono px-3 py-1.5 rounded-lg border border-slate-200"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">End Time (HH:mm)</label>
                            <input
                              type="time"
                              value={ev.endTime || ''}
                              onChange={(e) => updateField(ev.id, 'endTime', e.target.value)}
                              className="w-full text-xs font-mono px-3 py-1.5 rounded-lg border border-slate-200"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </>
                      )}
                    </div>

                    {/* Venue & Audience */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Venue / Location</label>
                        <input
                          type="text"
                          placeholder="e.g. Room 204 or Seminar Hall"
                          value={ev.venue || ''}
                          onChange={(e) => updateField(ev.id, 'venue', e.target.value)}
                          className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Department / Audience</label>
                        <input
                          type="text"
                          placeholder="e.g. III-year CSE"
                          value={ev.departmentOrAudience || ''}
                          onChange={(e) => updateField(ev.id, 'departmentOrAudience', e.target.value)}
                          className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>

                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>

      </div>

    </div>
  );
};
