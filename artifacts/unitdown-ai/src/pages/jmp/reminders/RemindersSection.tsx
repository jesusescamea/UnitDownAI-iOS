import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Plus, Check, Trash2, ChevronRight } from 'lucide-react';
import { useReminders } from './useReminders';
import type { Reminder, ReminderPriority, ReminderType } from './useReminders';
import { AddReminderModal } from './AddReminderModal';

// ─── Display helpers ──────────────────────────────────────────────────────────

const TYPE_LABEL: Record<ReminderType, string> = {
  'follow-up': 'Follow-up',
  'parts':     'Parts',
  'callback':  'Callback',
  'pm':        'PM',
  'note':      'Personal note',
};

const TYPE_COLOR: Record<ReminderType, string> = {
  'follow-up': 'bg-blue-900/50 text-blue-300',
  'parts':     'bg-amber-900/50 text-amber-300',
  'callback':  'bg-purple-900/50 text-purple-300',
  'pm':        'bg-green-900/50 text-green-300',
  'note':      'bg-gray-800 text-gray-400',
};

const PRIORITY_COLOR: Record<ReminderPriority, string> = {
  'low':    'bg-gray-800 text-gray-400',
  'normal': 'bg-blue-800/40 text-blue-300',
  'high':   'bg-red-900/50 text-red-300',
};

const PRIORITY_LABEL: Record<ReminderPriority, string> = {
  'low':    'Low',
  'normal': 'Normal',
  'high':   'High',
};

const PRIORITY_ORDER: Record<ReminderPriority, number> = { high: 0, normal: 1, low: 2 };

function formatDue(dueDate: string, dueTime?: string): { label: string; overdue: boolean } {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const overdue = dueDate < today;

  let dateLabel: string;
  if (dueDate === today)    dateLabel = 'Today';
  else if (dueDate === tomorrow) dateLabel = 'Tomorrow';
  else {
    const d = new Date(dueDate + 'T00:00:00');
    dateLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  const label = dueTime ? `${dateLabel} at ${formatTime(dueTime)}` : dateLabel;
  return { label, overdue };
}

function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

// ─── Single reminder card ─────────────────────────────────────────────────────

function ReminderCard({
  reminder, onDone, onDelete,
}: {
  reminder: Reminder;
  onDone: () => void;
  onDelete: () => void;
}) {
  const { label: dueLabel, overdue } = formatDue(reminder.dueDate, reminder.dueTime);
  const done = reminder.status === 'done';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: done ? 0.45 : 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      className={`bg-gray-900 border rounded-2xl px-4 py-3.5 ${
        done
          ? 'border-gray-800'
          : overdue
          ? 'border-red-900/60'
          : 'border-gray-800'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Done toggle */}
        <button
          onClick={onDone}
          disabled={done}
          className={`mt-0.5 w-5 h-5 rounded-full border flex-shrink-0 flex items-center justify-center transition-colors ${
            done
              ? 'bg-green-700 border-green-600'
              : 'border-gray-600 hover:border-green-500'
          }`}
        >
          {done && <Check size={11} className="text-white" />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-semibold leading-snug ${done ? 'line-through text-gray-500' : 'text-white'}`}>
            {reminder.title}
          </div>
          {reminder.linkedUnit && (
            <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
              <ChevronRight size={10} className="text-gray-600" />
              {reminder.linkedUnit}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${TYPE_COLOR[reminder.type]}`}>
              {TYPE_LABEL[reminder.type]}
            </span>
            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${PRIORITY_COLOR[reminder.priority]}`}>
              {PRIORITY_LABEL[reminder.priority]}
            </span>
            <span className={`text-[9px] font-mono ml-auto flex-shrink-0 ${
              done ? 'text-gray-600' : overdue ? 'text-red-400 font-semibold' : 'text-gray-500'
            }`}>
              {overdue && !done ? '⚠ ' : ''}{dueLabel}
            </span>
          </div>
          {reminder.notes && !done && (
            <div className="text-[11px] text-gray-500 mt-1.5 leading-snug line-clamp-2">
              {reminder.notes}
            </div>
          )}
        </div>

        {/* Delete */}
        <button
          onClick={onDelete}
          className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-700 hover:text-red-400 hover:bg-red-950/40 transition-colors flex-shrink-0 mt-0.5"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

interface Props {
  userId: string;
}

export function RemindersSection({ userId }: Props) {
  const { reminders, addReminder, markDone, deleteReminder } = useReminders(userId);
  const [modalOpen, setModalOpen] = useState(false);

  const sorted = [...reminders].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'open' ? -1 : 1;
    if (PRIORITY_ORDER[a.priority] !== PRIORITY_ORDER[b.priority])
      return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    return a.dueDate.localeCompare(b.dueDate);
  });

  const openCount = reminders.filter(r => r.status === 'open').length;

  return (
    <>
      <div className="px-4 pt-5">
        {/* Section header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">Important Reminders</h2>
                {openCount > 0 && (
                  <span className="text-[9px] font-bold bg-amber-900/50 text-amber-300 px-1.5 py-0.5 rounded-full">
                    {openCount}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">
                Follow-ups, parts, callbacks, and work you cannot forget.
              </div>
            </div>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1 text-[10px] font-semibold text-blue-400 bg-blue-950/40 border border-blue-800/40 px-2.5 py-1.5 rounded-xl hover:bg-blue-950/70 transition-colors flex-shrink-0"
          >
            <Plus size={11} />
            Add
          </button>
        </div>

        {/* Cards or empty state */}
        {sorted.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 text-center">
            <div className="w-10 h-10 rounded-2xl bg-amber-900/30 flex items-center justify-center mx-auto mb-3">
              <Bell size={18} className="text-amber-400/70" />
            </div>
            <div className="font-semibold text-white mb-1">No important reminders yet.</div>
            <div className="text-xs text-gray-500 mb-4 leading-relaxed">
              Add follow-ups, parts reminders, callbacks, or notes you do not want to lose.
            </div>
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors"
            >
              <Plus size={13} />
              Add Reminder
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {sorted.map(r => (
                <ReminderCard
                  key={r.id}
                  reminder={r}
                  onDone={() => markDone(r.id)}
                  onDelete={() => deleteReminder(r.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <AnimatePresence>
        {modalOpen && (
          <AddReminderModal
            onSave={(data) => { addReminder(data); setModalOpen(false); }}
            onCancel={() => setModalOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
