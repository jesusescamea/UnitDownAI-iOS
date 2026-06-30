import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Bell } from 'lucide-react';
import type { Reminder, ReminderType, ReminderPriority } from './useReminders';

const TYPE_OPTIONS: { value: ReminderType; label: string }[] = [
  { value: 'follow-up',  label: 'Follow-up' },
  { value: 'parts',      label: 'Parts' },
  { value: 'callback',   label: 'Callback' },
  { value: 'pm',         label: 'PM' },
  { value: 'note',       label: 'Personal note' },
];

const PRIORITY_OPTIONS: { value: ReminderPriority; label: string; color: string }[] = [
  { value: 'low',    label: 'Low',    color: 'bg-gray-700 text-gray-300' },
  { value: 'normal', label: 'Normal', color: 'bg-blue-800/60 text-blue-300' },
  { value: 'high',   label: 'High',   color: 'bg-red-900/60 text-red-300' },
];

interface Props {
  onSave: (data: Omit<Reminder, 'id' | 'status' | 'createdAt'>) => void;
  onCancel: () => void;
}

export function AddReminderModal({ onSave, onCancel }: Props) {
  const today = new Date().toISOString().split('T')[0];

  const [title,       setTitle]       = useState('');
  const [type,        setType]        = useState<ReminderType>('follow-up');
  const [priority,    setPriority]    = useState<ReminderPriority>('normal');
  const [dueDate,     setDueDate]     = useState(today);
  const [dueTime,     setDueTime]     = useState('');
  const [linkedUnit,  setLinkedUnit]  = useState('');
  const [notes,       setNotes]       = useState('');
  const [error,       setError]       = useState('');

  function handleSave() {
    if (!title.trim()) { setError('Reminder title is required.'); return; }
    if (!dueDate)       { setError('Due date is required.'); return; }
    onSave({
      title: title.trim(),
      type,
      priority,
      dueDate,
      dueTime:    dueTime    || undefined,
      linkedUnit: linkedUnit.trim() || undefined,
      notes:      notes.trim()      || undefined,
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 340, damping: 30 }}
        className="w-full max-w-md bg-gray-900 border border-gray-700 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-900/50 flex items-center justify-center">
              <Bell size={15} className="text-amber-400" />
            </div>
            <h2 className="text-base font-bold text-white">Add Reminder</h2>
          </div>
          <button onClick={onCancel} className="w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center">
            <X size={14} className="text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {error && (
            <div className="bg-red-950/60 border border-red-800 text-red-300 text-xs px-3 py-2 rounded-xl">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">
              Reminder title <span className="text-red-400">*</span>
            </label>
            <input
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-600"
              placeholder="e.g. Order dual capacitor for RTU-3"
              value={title}
              onChange={e => { setTitle(e.target.value); setError(''); }}
              autoFocus
            />
          </div>

          {/* Type + Priority side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">Type</label>
              <select
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-600"
                value={type}
                onChange={e => setType(e.target.value as ReminderType)}
              >
                {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">Priority</label>
              <select
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-600"
                value={priority}
                onChange={e => setPriority(e.target.value as ReminderPriority)}
              >
                {PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {/* Due date + time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">
                Due date <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-600 [color-scheme:dark]"
                value={dueDate}
                onChange={e => { setDueDate(e.target.value); setError(''); }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">
                Due time <span className="text-gray-600 normal-case font-normal">(optional)</span>
              </label>
              <input
                type="time"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-600 [color-scheme:dark]"
                value={dueTime}
                onChange={e => setDueTime(e.target.value)}
              />
            </div>
          </div>

          {/* Linked unit */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">
              Linked unit / customer <span className="text-gray-600 normal-case font-normal">(optional)</span>
            </label>
            <input
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-600"
              placeholder="e.g. Parkway Medical · RTU-3"
              value={linkedUnit}
              onChange={e => setLinkedUnit(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">
              Notes <span className="text-gray-600 normal-case font-normal">(optional)</span>
            </label>
            <textarea
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-600 resize-none"
              rows={3}
              placeholder="Any additional details..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-5 pb-6 pt-3 border-t border-gray-800 space-y-2 flex-shrink-0">
          <button
            onClick={handleSave}
            className="w-full bg-white text-gray-950 font-bold py-3.5 rounded-2xl text-sm"
          >
            Save Reminder
          </button>
          <button
            onClick={onCancel}
            className="w-full text-gray-500 text-sm py-2"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
