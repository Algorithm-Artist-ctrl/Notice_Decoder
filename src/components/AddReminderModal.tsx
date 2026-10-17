import React, { useState, useEffect } from 'react';
import { X, Bell, Calendar, Clock, MapPin, AlignLeft, Repeat, CheckCircle2, AlertCircle } from 'lucide-react';
import { ReminderRecord } from '../types';
import { apiClient } from '../lib/api-client';

interface AddReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (reminder: ReminderRecord) => void;
  initialData?: Partial<ReminderRecord> | null;
}

export const AddReminderModal: React.FC<AddReminderModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}) => {
  const isEditing = Boolean(initialData?.id);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [isDeadline, setIsDeadline] = useState(false);
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [deadlineTime, setDeadlineTime] = useState('17:00');
  const [location, setLocation] = useState('');
  const [reminderDateTime, setReminderDateTime] = useState('');
  const [recurrence, setRecurrence] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setDescription(initialData.description || '');
      setDate(initialData.date || new Date().toISOString().split('T')[0]);
      if (initialData.deadlineTime && !initialData.startTime) {
        setIsDeadline(true);
        setDeadlineTime(initialData.deadlineTime);
      } else {
        setIsDeadline(false);
        setStartTime(initialData.startTime || '10:00');
        setEndTime(initialData.endTime || '11:00');
      }
      setLocation(initialData.location || '');
      setReminderDateTime(initialData.reminderDateTime ? initialData.reminderDateTime.slice(0, 16) : '');
      setRecurrence(initialData.recurrence || 'none');
    } else {
      // Default new reminder
      const today = new Date().toISOString().split('T')[0];
      setTitle('');
      setDescription('');
      setDate(today);
      setIsDeadline(false);
      setStartTime('10:00');
      setEndTime('11:00');
      setDeadlineTime('17:00');
      setLocation('');
      setReminderDateTime('');
      setRecurrence('none');
    }
    setError(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Reminder title is required.');
      return;
    }

    if (!date) {
      setError('Date is required.');
      return;
    }

    if (!isDeadline && startTime && endTime && startTime >= endTime) {
      setError('Start time must be before end time.');
      return;
    }

    setLoading(true);

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      date,
      startTime: !isDeadline ? startTime : null,
      endTime: !isDeadline ? endTime : null,
      deadlineTime: isDeadline ? deadlineTime : null,
      location: location.trim() || null,
      reminderDateTime: reminderDateTime ? new Date(reminderDateTime).toISOString() : null,
      recurrence,
      isManual: true,
    };

    try {
      if (isEditing && initialData?.id) {
        const res = await apiClient.patch(`/api/reminders/${initialData.id}`, payload);
        if (res.success && res.data) {
          onSuccess(res.data);
          onClose();
        } else {
          throw new Error(res.error || 'Failed to update reminder.');
        }
      } else {
        const res = await apiClient.post('/api/reminders', payload);
        if (res.success && res.data) {
          onSuccess(res.data);
          onClose();
        } else {
          throw new Error(res.error || 'Failed to create reminder.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error saving reminder.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
      <div 
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh] animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {isEditing ? 'Edit Personal Reminder' : 'Add Personal Reminder'}
              </h2>
              <p className="text-xs text-slate-500">
                Custom task, follow-up, or deadline saved to your account
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Submit Hall Ticket Form or Team Sync"
              className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 outline-hidden transition-all"
            />
          </div>

          {/* Date & Type Switcher */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Date <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3 top-3 text-slate-400 pointer-events-none" />
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full text-xs font-medium pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 outline-hidden transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Event Format
              </label>
              <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setIsDeadline(false)}
                  className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
                    !isDeadline ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Timed Slot
                </button>
                <button
                  type="button"
                  onClick={() => setIsDeadline(true)}
                  className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
                    isDeadline ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Point Deadline
                </button>
              </div>
            </div>
          </div>

          {/* Time Fields */}
          {!isDeadline ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Start Time</label>
                <div className="relative">
                  <Clock className="w-4 h-4 absolute left-3 top-3 text-slate-400 pointer-events-none" />
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full text-xs font-medium pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 outline-hidden"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">End Time</label>
                <div className="relative">
                  <Clock className="w-4 h-4 absolute left-3 top-3 text-slate-400 pointer-events-none" />
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full text-xs font-medium pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 outline-hidden"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Cut-off Deadline Time</label>
              <div className="relative">
                <Clock className="w-4 h-4 absolute left-3 top-3 text-slate-400 pointer-events-none" />
                <input
                  type="time"
                  value={deadlineTime}
                  onChange={(e) => setDeadlineTime(e.target.value)}
                  className="w-full text-xs font-medium pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 outline-hidden"
                />
              </div>
            </div>
          )}

          {/* Location */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Venue / Location / Link</label>
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-3 top-3 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Room 302, Library, or Zoom URL"
                className="w-full text-xs font-medium pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 outline-hidden"
              />
            </div>
          </div>

          {/* Recurrence & Notification Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Recurrence</label>
              <div className="relative">
                <Repeat className="w-4 h-4 absolute left-3 top-3 text-slate-400 pointer-events-none" />
                <select
                  value={recurrence}
                  onChange={(e) => setRecurrence(e.target.value as any)}
                  className="w-full text-xs font-medium pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 outline-hidden bg-white"
                >
                  <option value="none">Does not repeat</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Alert Notification</label>
              <div className="relative">
                <Bell className="w-4 h-4 absolute left-3 top-3 text-slate-400 pointer-events-none" />
                <input
                  type="datetime-local"
                  value={reminderDateTime}
                  onChange={(e) => setReminderDateTime(e.target.value)}
                  className="w-full text-xs font-medium pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Instructions</label>
            <div className="relative">
              <AlignLeft className="w-4 h-4 absolute left-3 top-3 text-slate-400 pointer-events-none" />
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Bring printed hall ticket, 2 passport photos, and ID card."
                className="w-full text-xs font-medium pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 outline-hidden resize-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-xs hover:shadow-md transition-all flex items-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isEditing ? 'Save Changes' : 'Create Reminder'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
