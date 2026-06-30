/**
 * TalkScheduleModal
 * Full-screen voice-to-schedule planner for solo technicians.
 *
 * Views:
 *   speak  — SpeakScheduleScreen (voice → AI parse → review cards → accept)
 *   manual — Simple form to add one job by hand ("Type Instead")
 *
 * On accept → converts ImportedJob[] → ScheduleWizardResult[] + extracts smart reminders
 *           → calls onSaved(results, reminders) → DashboardView persists both
 */

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { ScheduleConversationModal } from './schedule/ScheduleConversationModal';
import type { ImportedJob } from './dispatch/types';
import type { TodayJob } from './mockData';
import type { CalendarEvent } from './dashboardData';
import type { ScheduleWizardResult } from './ScheduleJobWizard';
import type { Reminder, ReminderType } from './reminders/useReminders';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReminderData = Omit<Reminder, 'id' | 'status' | 'createdAt'>;

interface Props {
  userId:  string;
  onSaved: (results: ScheduleWizardResult[], reminders: ReminderData[]) => void;
  onClose: () => void;
}

// ─── ImportedJob → ScheduleWizardResult ──────────────────────────────────────

function calTypeFromJob(jobType: string, priority: string): CalendarEvent['type'] {
  const t = (jobType ?? '').toLowerCase();
  if (priority === 'emergency' || t.includes('emergency')) return 'emergency';
  if (t.includes('pm') || t.includes('maintenance') || t.includes('preventive')) return 'pm';
  if (t.includes('follow')) return 'followup';
  return 'appointment';
}

function importedToResult(job: ImportedJob, todayStr: string): ScheduleWizardResult {
  const dateStr = job.appointmentDate || todayStr;
  let day = new Date().getDate();
  try { day = new Date(dateStr + 'T12:00:00').getDate(); } catch { /* use today */ }

  const todayJob: TodayJob = {
    id:            job.id,
    priority:      (job.priority as TodayJob['priority']) ?? 'normal',
    status:        'open',
    type:          job.jobType   || 'Service Call',
    customer:      job.customer  || 'New Customer',
    unitTag:       job.equipment || job.site || '',
    model:         job.equipmentModel ?? '',
    equipment:     job.equipment || '',
    address:       job.address   || job.site || '',
    symptom:       job.complaint || '',
    driveTime:     '',
    scheduledTime: job.appointmentTime || job.timeWindow || '',
    scheduledDate: dateStr,
    techNote:      job.notes || null,
    dispatchNotes: [],
    isPrototype:   false,
  };

  const calEvent: CalendarEvent = {
    day,
    type:  calTypeFromJob(job.jobType, job.priority),
    label: `${job.customer || 'Job'}${job.complaint ? ' — ' + job.complaint : ''}`,
  };

  return {
    job:         todayJob,
    calEvent,
    isToday:     dateStr === todayStr,
    scheduledMs: new Date(dateStr + 'T12:00:00').getTime(),
    title:       `${job.customer || 'New Job'} — ${job.jobType || 'Service Call'}`,
  };
}

// ─── Smart reminder extraction ────────────────────────────────────────────────

function extractSmartReminders(jobs: ImportedJob[]): ReminderData[] {
  const results: ReminderData[] = [];
  const seen    = new Set<string>();
  const today   = new Date().toISOString().split('T')[0];

  function add(r: ReminderData) {
    const key = r.title.toLowerCase().trim();
    if (!seen.has(key)) { seen.add(key); results.push(r); }
  }

  for (const job of jobs) {
    const dueDate = job.appointmentDate || today;
    const linked  = job.customer || undefined;

    // Structured arrays extracted by AI
    for (const part of job.partsNeeded ?? []) {
      if (part.trim()) add({ title: `Bring: ${part.trim()}`, type: 'parts', priority: 'normal', dueDate, linkedUnit: linked });
    }
    for (const tool of job.toolsNeeded ?? []) {
      if (tool.trim()) add({ title: `Bring: ${tool.trim()}`, type: 'parts', priority: 'normal', dueDate, linkedUnit: linked });
    }
    for (const rem of job.reminders ?? []) {
      if (!rem.trim()) continue;
      const type: ReminderType = /\bcall\b/i.test(rem) ? 'callback' : 'note';
      add({ title: rem.trim(), type, priority: 'normal', dueDate, linkedUnit: linked });
    }

    // Pattern-match free-text notes for "bring X", "pickup X", etc.
    const text = [job.notes, job.complaint].filter(Boolean).join(' ');
    const bringRx  = /\bbring\s+([^,.;!?\n]{2,50})/gi;
    const pickupRx = /\bpick(?:up|\s+up)\s+([^,.;!?\n]{2,50})/gi;
    for (const rx of [bringRx, pickupRx]) {
      let m: RegExpExecArray | null;
      while ((m = rx.exec(text)) !== null) {
        const item = m[1]?.trim();
        if (item) add({ title: `Bring: ${item}`, type: 'parts', priority: 'normal', dueDate, linkedUnit: linked });
      }
    }
    if (/call\s+(customer|them|before\s+arrival|before\s+coming|before\s+heading)/i.test(text)) {
      add({ title: 'Call customer before arrival', type: 'callback', priority: 'normal', dueDate, linkedUnit: linked });
    }
    if (/badge\s+required|roof\s+access\s+code|access\s+code|key\s+code/i.test(text)) {
      add({ title: 'Get access code / badge before arrival', type: 'note', priority: 'high', dueDate, linkedUnit: linked });
    }
  }

  return results;
}

// ─── Manual entry form ────────────────────────────────────────────────────────

interface ManualFormState {
  customer:  string;
  site:      string;
  address:   string;
  date:      string;
  time:      string;
  equipment: string;
  jobType:   string;
  complaint: string;
  priority:  ImportedJob['priority'];
  parts:     string;
  notes:     string;
}

function ManualEntryForm({
  onSaved, onCancel,
}: {
  onSaved:  (job: ImportedJob) => void;
  onCancel: () => void;
}) {
  const todayStr = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState<ManualFormState>({
    customer: '', site: '', address: '', date: todayStr, time: '',
    equipment: '', jobType: 'Service Call', complaint: '', priority: 'normal',
    parts: '', notes: '',
  });
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof ManualFormState>(k: K, v: ManualFormState[K]) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  function handleSubmit() {
    if (!form.customer.trim()) { setError('Customer name is required.'); return; }
    setError(null);
    const partsArr = form.parts.split(/[\n,;]+/).map(p => p.trim()).filter(Boolean);
    const job: ImportedJob = {
      id:              `manual_${Date.now()}`,
      source:          'manual',
      jobNumber:       '',
      customer:        form.customer.trim(),
      site:            form.site.trim(),
      address:         form.address.trim(),
      appointmentDate: form.date,
      appointmentTime: form.time.trim(),
      timeWindow:      '',
      phone:           '',
      technician:      '',
      jobType:         form.jobType,
      priority:        form.priority,
      complaint:       form.complaint.trim(),
      notes:           form.notes.trim(),
      equipment:       form.equipment.trim(),
      attachments:     [],
      rawData:         { manual: true },
      importedAt:      new Date().toISOString(),
      status:          'pending',
      partsNeeded:     partsArr,
      toolsNeeded:     [],
      reminders:       [],
    };
    onSaved(job);
  }

  const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors';

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-4 border-b border-gray-800 flex items-center gap-3 flex-shrink-0">
        <button
          onClick={onCancel}
          className="w-8 h-8 rounded-xl bg-gray-800 flex items-center justify-center text-gray-400 active:bg-gray-700"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <div className="font-bold text-white text-sm">Add Job Manually</div>
          <div className="text-[10px] text-gray-500">Enter job details by hand</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-1">Customer *</label>
            <input className={inputCls} value={form.customer} onChange={e => set('customer', e.target.value)} placeholder="Customer or business name" />
          </div>
          <div>
            <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-1">Site Name</label>
            <input className={inputCls} value={form.site} onChange={e => set('site', e.target.value)} placeholder="Building or site" />
          </div>
          <div>
            <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-1">City / Address</label>
            <input className={inputCls} value={form.address} onChange={e => set('address', e.target.value)} placeholder="Redding, CA" />
          </div>
          <div>
            <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-1">Date</label>
            <input type="date" className={inputCls} value={form.date} onChange={e => set('date', e.target.value)} />
          </div>
          <div>
            <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-1">Time</label>
            <input className={inputCls} value={form.time} onChange={e => set('time', e.target.value)} placeholder="8:00 AM" />
          </div>
          <div className="col-span-2">
            <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-1">Equipment / Unit</label>
            <input className={inputCls} value={form.equipment} onChange={e => set('equipment', e.target.value)} placeholder="Carrier RTU-3, Lennox AHU, Trane chiller…" />
          </div>
          <div>
            <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-1">Job Type</label>
            <select className={inputCls} value={form.jobType} onChange={e => set('jobType', e.target.value)}>
              <option>Service Call</option>
              <option>PM</option>
              <option>Maintenance</option>
              <option>Warranty</option>
              <option>Return Visit</option>
              <option>Vendor Meet</option>
              <option>Emergency</option>
              <option>Inspection</option>
              <option>Startup</option>
            </select>
          </div>
          <div>
            <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-1">Priority</label>
            <select className={inputCls} value={form.priority} onChange={e => set('priority', e.target.value as ImportedJob['priority'])}>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="pm">PM</option>
              <option value="emergency">Emergency</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-1">Complaint / Task</label>
            <input className={inputCls} value={form.complaint} onChange={e => set('complaint', e.target.value)} placeholder="No cooling, PM survey, compressor trips, etc." />
          </div>
          <div className="col-span-2">
            <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-1">Parts to Bring</label>
            <textarea
              className={`${inputCls} resize-none`}
              rows={2}
              value={form.parts}
              onChange={e => set('parts', e.target.value)}
              placeholder="Dual capacitor, Sealtite, nitrogen, filters…"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-1">Notes / Reminders</label>
            <textarea
              className={`${inputCls} resize-none`}
              rows={2}
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Call before arrival, badge required, bring ladder…"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-red-950/30 border border-red-800/50 px-3 py-2 text-xs text-red-400">{error}</div>
        )}
      </div>

      <div className="px-4 pb-8 pt-2 border-t border-gray-800 space-y-2">
        <button
          onClick={handleSubmit}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-4 rounded-2xl text-sm active:scale-[0.98] transition-transform"
        >
          <CheckCircle size={16} />
          Add to Schedule
        </button>
        <button onClick={onCancel} className="w-full text-center text-xs text-gray-600 py-1">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export function TalkScheduleModal({ userId, onSaved, onClose }: Props) {
  const todayStr = new Date().toISOString().split('T')[0];
  const [view, setView] = useState<'speak' | 'manual'>('speak');

  const handleParsed = useCallback((jobs: ImportedJob[]) => {
    // Reminder-only and note-only jobs (no customer) → skip adding to schedule results
    const scheduleJobs = jobs.filter(
      j => j.jobType !== 'Reminder' && j.jobType !== 'Note' && j.customer?.trim()
    );
    const results   = scheduleJobs.map(j => importedToResult(j, todayStr));
    const reminders = extractSmartReminders(jobs); // extract from ALL jobs (incl. reminders)
    onSaved(results, reminders);
  }, [onSaved, todayStr]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1,  y: 0  }}
      exit={{    opacity: 0,  y: 24 }}
      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      className="fixed inset-0 z-50 bg-gray-950 flex flex-col"
    >
      {view === 'speak' ? (
        <ScheduleConversationModal
          userId={userId}
          onParsed={handleParsed}
          onBack={onClose}
        />
      ) : (
        <ManualEntryForm
          onSaved={(job) => handleParsed([job])}
          onCancel={() => setView('speak')}
        />
      )}
    </motion.div>
  );
}
