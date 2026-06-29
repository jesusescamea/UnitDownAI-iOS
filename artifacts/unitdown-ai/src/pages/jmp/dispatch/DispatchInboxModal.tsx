import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Inbox, Plus, ChevronRight, CheckCircle, Clock, MapPin,
  AlertTriangle, Edit2, Trash2, ClipboardList, Upload,
  FileText, Copy, Camera, Calendar, Mail, Zap, RefreshCw,
  Check, SkipForward, GitMerge, ChevronDown, FileUp,
} from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import type { ImportedJob, ProviderType } from './types';
import type { ScheduleWizardResult } from '../ScheduleJobWizard';
import type { TodayJob } from '../mockData';
import type { CalendarEvent } from '../dashboardData';
import { PROVIDERS, CATEGORY_LABELS } from './providers/index';
import { parsePastedText, parseCSV, parseICS } from './parsers';
import { useDispatchInbox } from './useDispatchInbox';

// ─── Screen types ─────────────────────────────────────────────────────────────
type Screen =
  | 'inbox'
  | 'sources'
  | 'paste'
  | 'csv'
  | 'ics'
  | 'calendar_alt'
  | 'edit';

// ─── Priority config ──────────────────────────────────────────────────────────
const PRIORITY_CONFIG = {
  emergency: { label: 'Emergency', cls: 'bg-red-900/40 text-red-300 border-red-800' },
  high:      { label: 'High',      cls: 'bg-amber-900/40 text-amber-300 border-amber-800' },
  normal:    { label: 'Normal',    cls: 'bg-blue-900/40 text-blue-300 border-blue-800' },
  pm:        { label: 'PM',        cls: 'bg-gray-800 text-gray-300 border-gray-700' },
};

// ─── Convert ImportedJob → ScheduleWizardResult ────────────────────────────────
function importedJobToResult(job: ImportedJob, techName: string): ScheduleWizardResult {
  const scheduledDate = job.appointmentDate || new Date().toISOString().split('T')[0];
  const todayStr      = new Date().toISOString().split('T')[0];
  const isToday       = scheduledDate === todayStr;
  const scheduledMs   = new Date(scheduledDate + 'T00:00:00').getTime();

  const todayJob: TodayJob = {
    id:            job.id,
    priority:      job.priority,
    status:        'open',
    type:          job.jobType || 'Service Call',
    customer:      job.customer || 'Unknown Customer',
    unitTag:       [job.site, job.equipment].filter(Boolean).join(' · ') || '—',
    model:         job.equipment || '—',
    equipment:     job.equipment || '—',
    address:       job.address   || '—',
    symptom:       job.complaint || '—',
    driveTime:     '—',
    scheduledTime: job.timeWindow || job.appointmentTime || '—',
    scheduledDate,
    techNote:      job.notes || null,
    dispatchNotes: [
      job.phone     ? `Contact: ${job.phone}`   : '',
      job.jobNumber ? `Job #: ${job.jobNumber}` : '',
      job.technician && job.technician !== techName ? `Tech: ${job.technician}` : '',
    ].filter(Boolean),
    isPrototype:   false,
  };

  const calEventType: CalendarEvent['type'] =
    job.priority === 'emergency'                              ? 'emergency' :
    (job.jobType?.toLowerCase().includes('pm') ||
     job.jobType?.toLowerCase().includes('preventive'))       ? 'pm'        :
    job.jobType === 'Follow-up'                               ? 'followup'  : 'appointment';

  const title    = `${job.customer} — ${job.jobType || 'Service Call'}`;
  const dayNum   = new Date(scheduledDate + 'T00:00:00').getDate();

  const calEvent: CalendarEvent = { day: dayNum, type: calEventType, label: title };

  return { job: todayJob, calEvent, isToday, scheduledMs, title };
}

// ─── Needs-review checker ─────────────────────────────────────────────────────
function needsReview(job: ImportedJob): boolean {
  return !job.customer || !job.appointmentDate;
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ job }: { job: ImportedJob }) {
  if (needsReview(job) && job.status === 'pending')
    return <span className="text-[9px] font-bold bg-amber-900/40 text-amber-400 border border-amber-800/50 px-1.5 py-0.5 rounded-full">Needs Review</span>;
  if (job.status === 'accepted')
    return <span className="text-[9px] font-bold bg-green-900/40 text-green-400 border border-green-800/50 px-1.5 py-0.5 rounded-full">Accepted</span>;
  if (job.status === 'duplicate')
    return <span className="text-[9px] font-bold bg-amber-900/40 text-amber-400 border border-amber-800/50 px-1.5 py-0.5 rounded-full">Duplicate</span>;
  if (job.status === 'skipped')
    return <span className="text-[9px] font-bold bg-gray-700 text-gray-400 border border-gray-600 px-1.5 py-0.5 rounded-full">Skipped</span>;
  return <span className="text-[9px] font-bold bg-blue-900/40 text-blue-400 border border-blue-800/50 px-1.5 py-0.5 rounded-full">Pending</span>;
}

// ─── Provider icon ────────────────────────────────────────────────────────────
function ProviderIcon({ id, size = 18 }: { id: ProviderType; size?: number }) {
  if (id === 'paste')            return <Copy     size={size} className="text-gray-300" />;
  if (id === 'csv')              return <FileText size={size} className="text-gray-300" />;
  if (id === 'ics')              return <FileUp   size={size} className="text-purple-300" />;
  if (id === 'pdf')              return <FileText size={size} className="text-red-300" />;
  if (id === 'scan_ocr')         return <Camera   size={size} className="text-gray-300" />;
  if (id === 'google_calendar')  return <Calendar size={size} className="text-blue-300" />;
  if (id === 'apple_calendar')   return <Calendar size={size} className="text-gray-300" />;
  if (id === 'outlook_calendar') return <Calendar size={size} className="text-blue-400" />;
  if (id === 'gmail')            return <Mail     size={size} className="text-red-300" />;
  if (id === 'outlook_email')    return <Mail     size={size} className="text-blue-400" />;
  if (id === 'manual')           return <Plus     size={size} className="text-green-300" />;
  return <Zap size={size} className="text-purple-300" />;
}

// ─── Shared back header ───────────────────────────────────────────────────────
function ScreenHeader({ title, subtitle, onBack }: { title: string; subtitle?: string; onBack: () => void }) {
  return (
    <div className="px-4 py-4 border-b border-gray-800 flex items-center gap-3 flex-shrink-0">
      <button onClick={onBack} className="w-8 h-8 rounded-xl bg-gray-800 flex items-center justify-center">
        <X size={14} className="text-gray-400" />
      </button>
      <div>
        <div className="font-bold text-white text-sm">{title}</div>
        {subtitle && <div className="text-[10px] text-gray-500">{subtitle}</div>}
      </div>
    </div>
  );
}

// ─── Job card ─────────────────────────────────────────────────────────────────
function JobCard({
  job, onEdit, onDelete, onAccept, onSkip, onDupAction,
}: {
  job:        ImportedJob;
  onEdit:     () => void;
  onDelete:   () => void;
  onAccept:   () => void;
  onSkip:     () => void;
  onDupAction: (action: 'skip' | 'replace' | 'merge') => void;
}) {
  const [dupOpen, setDupOpen] = useState(false);
  const pri = PRIORITY_CONFIG[job.priority] ?? PRIORITY_CONFIG.normal;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden"
    >
      <div className="px-4 pt-3.5 pb-2 flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-white text-sm leading-tight truncate">
              {job.customer || 'Unknown Customer'}
            </span>
            <StatusBadge job={job} />
          </div>
          {job.jobNumber && (
            <div className="text-[10px] font-mono text-gray-500 mt-0.5">{job.jobNumber}</div>
          )}
        </div>
        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${pri.cls}`}>
          {pri.label}
        </span>
      </div>

      <div className="px-4 pb-3 space-y-1.5">
        {job.jobType && job.jobType !== 'Service Call' && (
          <div className="text-[10px] text-blue-400 font-semibold">{job.jobType}</div>
        )}
        {job.complaint && (
          <div className="flex items-start gap-1.5">
            <AlertTriangle size={11} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <span className="text-xs text-gray-300 leading-snug">{job.complaint}</span>
          </div>
        )}
        {(job.appointmentDate || job.appointmentTime || job.timeWindow) && (
          <div className="flex items-center gap-1.5">
            <Clock size={11} className="text-blue-400 flex-shrink-0" />
            <span className="text-xs text-gray-400">
              {[job.appointmentDate, job.timeWindow || job.appointmentTime].filter(Boolean).join(' · ')}
            </span>
          </div>
        )}
        {(job.address || job.site) && (
          <div className="flex items-center gap-1.5">
            <MapPin size={11} className="text-gray-500 flex-shrink-0" />
            <span className="text-xs text-gray-400 truncate">{job.address || job.site}</span>
          </div>
        )}
        {job.phone && (
          <div className="text-[10px] text-gray-500 font-mono">{job.phone}</div>
        )}

        <div className="flex items-center gap-1 pt-0.5">
          <ProviderIcon id={job.source} size={10} />
          <span className="text-[9px] text-gray-600">{PROVIDERS.find(p => p.id === job.source)?.name ?? job.source}</span>
        </div>
      </div>

      {job.status === 'duplicate' && (
        <div className="border-t border-gray-800 bg-amber-950/20 px-4 py-2.5">
          <button onClick={() => setDupOpen(o => !o)} className="w-full flex items-center justify-between">
            <span className="text-[10px] font-semibold text-amber-400">Already imported — resolve?</span>
            <ChevronDown size={12} className={`text-amber-400 transition-transform ${dupOpen ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {dupOpen && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="flex gap-2 pt-2">
                  <button onClick={() => onDupAction('skip')} className="flex-1 flex items-center justify-center gap-1 bg-gray-800 border border-gray-700 rounded-xl py-2 text-xs text-gray-300">
                    <SkipForward size={11} /> Skip
                  </button>
                  <button onClick={() => onDupAction('replace')} className="flex-1 flex items-center justify-center gap-1 bg-amber-900/40 border border-amber-800 rounded-xl py-2 text-xs text-amber-300">
                    <RefreshCw size={11} /> Replace
                  </button>
                  <button onClick={() => onDupAction('merge')} className="flex-1 flex items-center justify-center gap-1 bg-blue-900/40 border border-blue-800 rounded-xl py-2 text-xs text-blue-300">
                    <GitMerge size={11} /> Merge
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {job.status !== 'accepted' && job.status !== 'skipped' && (
        <div className="border-t border-gray-800 flex">
          <button onClick={onEdit} className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs text-gray-400 active:bg-gray-800 transition-colors">
            <Edit2 size={12} /> Edit
          </button>
          <div className="w-px bg-gray-800" />
          <button onClick={onDelete} className="flex items-center justify-center gap-1.5 px-4 py-3 text-xs text-red-400 active:bg-gray-800 transition-colors">
            <Trash2 size={12} />
          </button>
          <div className="w-px bg-gray-800" />
          <button onClick={onAccept} className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs text-green-400 font-semibold active:bg-gray-800 transition-colors">
            <Check size={12} /> Accept
          </button>
        </div>
      )}
    </motion.div>
  );
}

// ─── Paste screen ─────────────────────────────────────────────────────────────
function PasteScreen({ onParsed, onBack }: { onParsed: (jobs: ImportedJob[]) => void; onBack: () => void }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  function handleParse() {
    setError('');
    if (!text.trim()) { setError('Paste schedule text above.'); return; }
    const parsed = parsePastedText(text);
    if (!parsed.length) { setError('No jobs detected. Check the format and try again.'); return; }
    onParsed(parsed);
  }

  return (
    <div className="flex flex-col h-full">
      <ScreenHeader title="Paste Schedule" subtitle="AI extracts job details automatically" onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <div className="bg-blue-950/30 border border-blue-800/40 rounded-xl px-3 py-2.5">
          <p className="text-[10px] text-blue-300 leading-relaxed font-semibold mb-1">Supported formats</p>
          <p className="text-[10px] text-blue-300 leading-relaxed">
            Paste dispatch emails, text messages, or schedule exports. Also accepts semicolon-delimited format:{' '}
            <span className="font-mono text-blue-200">2606-37730 ; Lowes; serv; 7:00 AM; Lincoln</span>
          </p>
        </div>
        <textarea
          className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors resize-none"
          rows={12}
          placeholder={"Dispatch text — examples:\n\n2606-37730 ; Lowes; serv; 7:00 AM; Lincoln; Vendor meet 10 am; POC 510-472-1230\n2606-07588 ; Best Buy; PM survey; 7:30 AM; North Sac\n\n— or —\n\nWO#: 4821\nCustomer: Riverfront Office\nAddress: 1200 River Rd, Dallas TX\nDate: 7/15/2026 · 9:00 AM\nSymptom: Unit not cooling, high pressure alarm"}
          value={text}
          onChange={e => setText(e.target.value)}
          autoFocus
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
      <div className="px-4 pb-6 pt-2">
        <button onClick={handleParse} className="w-full bg-white text-gray-950 font-bold py-4 rounded-2xl text-sm active:scale-[0.98] transition-transform">
          Extract Jobs
        </button>
      </div>
    </div>
  );
}

// ─── CSV screen ───────────────────────────────────────────────────────────────
function CSVScreen({ onParsed, onBack }: { onParsed: (jobs: ImportedJob[]) => void; onBack: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
      setError('Please select a .csv file.'); return;
    }
    setLoading(true); setError('');
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      setLoading(false);
      if (!parsed.length) { setError('No jobs found. Ensure the file has a header row and data rows.'); return; }
      onParsed(parsed);
    };
    reader.onerror = () => { setLoading(false); setError('Failed to read file.'); };
    reader.readAsText(file);
  }

  return (
    <div className="flex flex-col h-full">
      <ScreenHeader title="Import CSV" subtitle="Upload a schedule from any dispatch platform" onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className="bg-blue-950/30 border border-blue-800/40 rounded-xl px-3 py-2.5">
          <p className="text-[10px] text-blue-300 leading-relaxed">
            Export a .csv from ServiceTitan, Housecall Pro, FieldEdge, or any scheduling tool. Common columns detected automatically.
          </p>
        </div>

        <button
          onClick={() => fileRef.current?.click()}
          className="w-full border-2 border-dashed border-gray-700 rounded-2xl py-10 flex flex-col items-center gap-3 active:border-blue-500 transition-colors"
        >
          <Upload size={28} className="text-gray-500" />
          <div className="text-sm font-semibold text-gray-400">Tap to select .csv file</div>
          <div className="text-[10px] text-gray-600">Exported from any scheduling platform</div>
        </button>
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

        <div className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-2.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Recognized column names</div>
          <div className="flex flex-wrap gap-1">
            {['Customer', 'Address', 'Location', 'Date', 'Start', 'End', 'Time', 'Job #', 'WO #', 'Type', 'Priority', 'Complaint', 'Phone', 'Notes'].map(c => (
              <span key={c} className="text-[9px] bg-gray-800 border border-gray-700 text-gray-400 px-1.5 py-0.5 rounded">{c}</span>
            ))}
          </div>
        </div>

        {loading && <p className="text-xs text-blue-400 text-center">Reading file…</p>}
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    </div>
  );
}

// ─── ICS screen ───────────────────────────────────────────────────────────────
function ICSScreen({ onParsed, onBack }: { onParsed: (jobs: ImportedJob[]) => void; onBack: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleFile(file: File) {
    const name = file.name.toLowerCase();
    if (!name.endsWith('.ics') && !name.endsWith('.ical')) {
      setError('Please select a .ics calendar file.'); return;
    }
    setLoading(true); setError('');
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      const parsed = parseICS(text);
      setLoading(false);
      if (!parsed.length) { setError('No calendar events found in this file.'); return; }
      onParsed(parsed);
    };
    reader.onerror = () => { setLoading(false); setError('Failed to read file.'); };
    reader.readAsText(file);
  }

  return (
    <div className="flex flex-col h-full">
      <ScreenHeader title="Import Calendar File (.ics)" subtitle="Upload from Google, Apple, or Outlook" onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className="bg-purple-950/30 border border-purple-800/40 rounded-xl px-3 py-2.5 space-y-2">
          <p className="text-[10px] text-purple-300 font-semibold">How to export from your calendar app</p>
          <div className="space-y-1.5">
            {[
              { app: 'Google Calendar', step: 'Event → ⋮ → Export → .ics' },
              { app: 'Apple Calendar', step: 'File → Export → Export…' },
              { app: 'Outlook',        step: 'Event → … → Forward as iCalendar' },
            ].map(({ app, step }) => (
              <div key={app} className="flex items-start gap-2">
                <Calendar size={10} className="text-purple-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] text-gray-300 font-semibold">{app}: </span>
                  <span className="text-[10px] text-gray-500">{step}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => fileRef.current?.click()}
          className="w-full border-2 border-dashed border-purple-800/60 rounded-2xl py-10 flex flex-col items-center gap-3 active:border-purple-500 transition-colors"
        >
          <FileUp size={28} className="text-purple-400" />
          <div className="text-sm font-semibold text-gray-400">Tap to select .ics file</div>
          <div className="text-[10px] text-gray-600">.ics or .ical format</div>
        </button>
        <input ref={fileRef} type="file" accept=".ics,.ical,text/calendar" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

        {loading && <p className="text-xs text-purple-400 text-center">Reading calendar file…</p>}
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    </div>
  );
}

// ─── Calendar alternative screen ──────────────────────────────────────────────
// Shown when user taps Google/Apple/Outlook Calendar.
// Explains no direct sync, offers: ICS upload, Paste, or Manual Job.

type CalendarProvider = 'google_calendar' | 'apple_calendar' | 'outlook_calendar';

const CALENDAR_INFO: Record<CalendarProvider, { name: string; instructions: string }> = {
  google_calendar: {
    name: 'Google Calendar',
    instructions: 'Open the event → tap ⋮ → Export → Download .ics file. Or copy event text and paste below.',
  },
  apple_calendar: {
    name: 'Apple Calendar',
    instructions: 'Open Calendar app → tap the event → tap Edit → tap Share → Save .ics to Files. Or copy event text and paste below.',
  },
  outlook_calendar: {
    name: 'Outlook Calendar',
    instructions: 'Open the event → tap … → Forward as iCalendar. Or open event, copy all details, and paste below.',
  },
};

function CalendarAltScreen({
  provider,
  onSelectICS,
  onSelectPaste,
  onSelectManual,
  onBack,
}: {
  provider:       CalendarProvider;
  onSelectICS:    () => void;
  onSelectPaste:  () => void;
  onSelectManual: () => void;
  onBack:         () => void;
}) {
  const info = CALENDAR_INFO[provider];

  return (
    <div className="flex flex-col h-full">
      <ScreenHeader title={`Import from ${info.name}`} onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className="bg-amber-950/25 border border-amber-800/40 rounded-xl px-4 py-3">
          <p className="text-xs font-semibold text-amber-400 mb-1">Direct sync not connected yet</p>
          <p className="text-[10px] text-gray-400 leading-relaxed">
            Live {info.name} sync is coming soon. For now, import your jobs using one of these methods:
          </p>
        </div>

        <div className="bg-blue-950/20 border border-blue-800/30 rounded-xl px-4 py-3">
          <p className="text-[10px] text-blue-300 font-semibold mb-1">How to export from {info.name}</p>
          <p className="text-[10px] text-gray-400 leading-relaxed">{info.instructions}</p>
        </div>

        <div className="space-y-2">
          <button
            onClick={onSelectICS}
            className="w-full flex items-center gap-4 bg-gray-900 border border-purple-800/50 rounded-2xl px-4 py-4 text-left active:bg-gray-800 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-900/40 flex items-center justify-center flex-shrink-0">
              <FileUp size={18} className="text-purple-300" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-white">Upload .ics File</div>
              <div className="text-[10px] text-gray-500">Export from calendar app, then upload here</div>
            </div>
            <ChevronRight size={14} className="text-gray-600" />
          </button>

          <button
            onClick={onSelectPaste}
            className="w-full flex items-center gap-4 bg-gray-900 border border-blue-800/50 rounded-2xl px-4 py-4 text-left active:bg-gray-800 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-900/40 flex items-center justify-center flex-shrink-0">
              <Copy size={18} className="text-blue-300" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-white">Paste Event Text</div>
              <div className="text-[10px] text-gray-500">Open event, copy details, paste into UnitDown</div>
            </div>
            <ChevronRight size={14} className="text-gray-600" />
          </button>

          <button
            onClick={onSelectManual}
            className="w-full flex items-center gap-4 bg-gray-900 border border-green-800/50 rounded-2xl px-4 py-4 text-left active:bg-gray-800 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-green-900/40 flex items-center justify-center flex-shrink-0">
              <Plus size={18} className="text-green-300" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-white">Enter Manually</div>
              <div className="text-[10px] text-gray-500">Type job details by hand</div>
            </div>
            <ChevronRight size={14} className="text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit / Manual job screen ─────────────────────────────────────────────────
function EditJobScreen({ job, isNew, onSave, onBack }: { job: ImportedJob; isNew: boolean; onSave: (j: ImportedJob) => void; onBack: () => void }) {
  const [draft, setDraft] = useState<ImportedJob>({ ...job });

  function set<K extends keyof ImportedJob>(k: K, v: ImportedJob[K]) {
    setDraft(prev => ({ ...prev, [k]: v }));
  }

  const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors';

  function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">{label}</label>
        {children}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ScreenHeader
        title={isNew ? 'Manual Job' : 'Edit Job'}
        subtitle={isNew ? 'Enter job details — assigned to you' : undefined}
        onBack={onBack}
      />
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <Field label="Customer *">
          <input className={inputCls} value={draft.customer} onChange={e => set('customer', e.target.value)} placeholder="Business or customer name" autoFocus={isNew} />
        </Field>
        <Field label="Job Number / WO#">
          <input className={inputCls} value={draft.jobNumber} onChange={e => set('jobNumber', e.target.value)} placeholder="e.g. 2606-37730" />
        </Field>
        <Field label="Site / Building">
          <input className={inputCls} value={draft.site} onChange={e => set('site', e.target.value)} placeholder="Building or site name" />
        </Field>
        <Field label="Address">
          <input className={inputCls} value={draft.address} onChange={e => set('address', e.target.value)} placeholder="Service address" />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Date *">
            <input type="date" className={inputCls} value={draft.appointmentDate} onChange={e => set('appointmentDate', e.target.value)} />
          </Field>
          <Field label="Time">
            <input className={inputCls} value={draft.appointmentTime} onChange={e => set('appointmentTime', e.target.value)} placeholder="8:00 AM" />
          </Field>
        </div>
        <Field label="Time Window">
          <input className={inputCls} value={draft.timeWindow} onChange={e => set('timeWindow', e.target.value)} placeholder="8:00 AM – 10:00 AM" />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Job Type">
            <select className={inputCls} value={draft.jobType} onChange={e => set('jobType', e.target.value)}>
              <option>Service Call</option>
              <option>Preventive Maintenance</option>
              <option>PM Survey</option>
              <option>Installation</option>
              <option>Startup</option>
              <option>Warranty</option>
              <option>Inspection</option>
              <option>Follow-up</option>
              <option>Emergency</option>
            </select>
          </Field>
          <Field label="Priority">
            <select className={inputCls} value={draft.priority} onChange={e => set('priority', e.target.value as ImportedJob['priority'])}>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="emergency">Emergency</option>
              <option value="pm">PM</option>
            </select>
          </Field>
        </div>
        <Field label="Equipment / Unit Tag">
          <input className={inputCls} value={draft.equipment} onChange={e => set('equipment', e.target.value)} placeholder="RTU-1, AHU-2, etc." />
        </Field>
        <Field label="Complaint / Task">
          <textarea className={`${inputCls} resize-none`} rows={3} value={draft.complaint} onChange={e => set('complaint', e.target.value)} placeholder="Customer complaint or work to be done" />
        </Field>
        <Field label="Phone">
          <input className={inputCls} value={draft.phone} onChange={e => set('phone', e.target.value)} placeholder="Customer or POC phone" />
        </Field>
        <Field label="Dispatch Notes">
          <textarea className={`${inputCls} resize-none`} rows={2} value={draft.notes} onChange={e => set('notes', e.target.value)} placeholder="Internal notes" />
        </Field>
      </div>
      <div className="px-4 pb-6 pt-2 space-y-2">
        {isNew && !draft.customer && (
          <p className="text-[10px] text-amber-400 text-center">Customer name is required</p>
        )}
        <button
          onClick={() => { if (isNew && !draft.customer.trim()) return; onSave(draft); }}
          disabled={isNew && !draft.customer.trim()}
          className="w-full bg-white text-gray-950 font-bold py-4 rounded-2xl text-sm active:scale-[0.98] transition-transform disabled:opacity-40 disabled:scale-100"
        >
          {isNew ? 'Add to Inbox' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

// ─── Sources screen ───────────────────────────────────────────────────────────
function SourcesScreen({ onSelect, onBack }: { onSelect: (id: ProviderType) => void; onBack: () => void }) {
  const categories = Array.from(new Set(PROVIDERS.map(p => p.category)));

  return (
    <div className="flex flex-col h-full">
      <ScreenHeader title="Import Schedule" subtitle="Choose a source" onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {categories.map(cat => {
          const catProviders = PROVIDERS.filter(p => p.category === cat);
          return (
            <div key={cat}>
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">
                {CATEGORY_LABELS[cat] ?? cat}
              </div>
              <div className="space-y-1.5">
                {catProviders.map(p => {
                  const isAvailable = p.status === 'available';
                  return (
                    <button
                      key={p.id}
                      disabled={!isAvailable}
                      onClick={() => isAvailable && onSelect(p.id)}
                      className={`w-full flex items-center gap-3 bg-gray-900 border rounded-2xl px-4 py-3 text-left transition-colors ${
                        isAvailable
                          ? 'border-gray-700 active:bg-gray-800 cursor-pointer'
                          : 'border-gray-800 opacity-40 cursor-not-allowed'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-xl bg-gray-800 flex items-center justify-center flex-shrink-0">
                        <ProviderIcon id={p.id} size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-white">{p.name}</div>
                        <div className="text-[10px] text-gray-500">{p.tagline}</div>
                      </div>
                      {isAvailable
                        ? <ChevronRight size={14} className="text-gray-600 flex-shrink-0" />
                        : <span className="text-[9px] text-gray-600 border border-gray-700 px-1.5 py-0.5 rounded-full flex-shrink-0">Soon</span>
                      }
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3 mt-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">Coming in future releases</div>
          <div className="flex flex-wrap gap-1">
            {['ServiceTitan', 'FieldEdge', 'Successware', 'Service Fusion', 'Lennox Dispatch', 'Carrier ServiceBench', 'Trane', 'Daikin', 'Gmail sync', 'Outlook Email sync', 'SMS parsing'].map(f => (
              <span key={f} className="text-[9px] bg-gray-800 text-gray-500 border border-gray-700 px-1.5 py-0.5 rounded">{f}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────
interface Props {
  onClose:       () => void;
  onStartJob:    () => void;
  onJobAccepted?: (result: ScheduleWizardResult) => void;
}

export function DispatchInboxModal({ onClose, onStartJob, onJobAccepted }: Props) {
  const { user } = useUser();
  const techName = user?.fullName || user?.firstName || 'Me';

  const {
    jobs, pendingJobs, acceptedJobs, dupJobs,
    addJobs, updateJob, updateStatus, removeJob, acceptAll, clearAccepted,
  } = useDispatchInbox();

  const [screen,        setScreen]        = useState<Screen>('inbox');
  const [editingJob,    setEditingJob]    = useState<ImportedJob | null>(null);
  const [isNewJob,      setIsNewJob]      = useState(false);
  const [calendarFor,   setCalendarFor]   = useState<CalendarProvider>('google_calendar');
  const [inboxFilter,   setInboxFilter]   = useState<'all' | 'pending' | 'accepted'>('all');

  // ── Accept a single job — marks in inbox + fires schedule callback ──────────
  function handleAccept(job: ImportedJob) {
    updateStatus(job.id, 'accepted');
    onJobAccepted?.(importedJobToResult(job, techName));
  }

  // ── Accept all pending jobs ────────────────────────────────────────────────
  function handleAcceptAll() {
    const snapshot = [...pendingJobs];
    acceptAll();
    snapshot.forEach(job => onJobAccepted?.(importedJobToResult(job, techName)));
  }

  // ── After parsing any source, stamp tech + add to inbox ───────────────────
  function handleParsed(incoming: ImportedJob[]) {
    const stamped = incoming.map(j => ({ ...j, technician: j.technician || techName }));
    addJobs(stamped);
    setScreen('inbox');
  }

  // ── Source selection ───────────────────────────────────────────────────────
  function handleSourceSelect(id: ProviderType) {
    if (id === 'paste')  { setScreen('paste');  return; }
    if (id === 'csv')    { setScreen('csv');    return; }
    if (id === 'ics')    { setScreen('ics');    return; }
    if (id === 'google_calendar')  { setCalendarFor('google_calendar');  setScreen('calendar_alt'); return; }
    if (id === 'apple_calendar')   { setCalendarFor('apple_calendar');   setScreen('calendar_alt'); return; }
    if (id === 'outlook_calendar') { setCalendarFor('outlook_calendar'); setScreen('calendar_alt'); return; }
    if (id === 'manual') {
      const blank: ImportedJob = {
        id:              `DI-${Date.now()}`,
        source:          'manual',
        jobNumber:       '',
        customer:        '',
        site:            '',
        address:         '',
        appointmentDate: new Date().toISOString().split('T')[0],
        appointmentTime: '',
        timeWindow:      '',
        phone:           '',
        technician:      techName,
        jobType:         'Service Call',
        priority:        'normal',
        complaint:       '',
        notes:           '',
        equipment:       '',
        attachments:     [],
        rawData:         '',
        importedAt:      new Date().toISOString(),
        status:          'pending',
      };
      setEditingJob(blank);
      setIsNewJob(true);
      setScreen('edit');
    }
  }

  // ── Save edit (new or existing) ────────────────────────────────────────────
  function handleSaveEdit(updated: ImportedJob) {
    updateJob(updated);
    setEditingJob(null);
    setIsNewJob(false);
    setScreen('inbox');
  }

  // ── Display filter ────────────────────────────────────────────────────────
  const displayJobs =
    inboxFilter === 'pending'  ? [...dupJobs, ...pendingJobs] :
    inboxFilter === 'accepted' ? acceptedJobs :
    [...dupJobs, ...pendingJobs, ...acceptedJobs, ...jobs.filter(j => j.status === 'skipped')];

  const unreadCount = pendingJobs.length + dupJobs.length;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-gray-950"
    >
      {/* ── Paste ────────────────────────────────────────────────────────── */}
      {screen === 'paste' && <PasteScreen onParsed={handleParsed} onBack={() => setScreen('sources')} />}

      {/* ── CSV ──────────────────────────────────────────────────────────── */}
      {screen === 'csv' && <CSVScreen onParsed={handleParsed} onBack={() => setScreen('sources')} />}

      {/* ── ICS ──────────────────────────────────────────────────────────── */}
      {screen === 'ics' && <ICSScreen onParsed={handleParsed} onBack={() => setScreen('sources')} />}

      {/* ── Calendar alt ─────────────────────────────────────────────────── */}
      {screen === 'calendar_alt' && (
        <CalendarAltScreen
          provider={calendarFor}
          onSelectICS={() => setScreen('ics')}
          onSelectPaste={() => setScreen('paste')}
          onSelectManual={() => handleSourceSelect('manual')}
          onBack={() => setScreen('sources')}
        />
      )}

      {/* ── Sources ──────────────────────────────────────────────────────── */}
      {screen === 'sources' && <SourcesScreen onSelect={handleSourceSelect} onBack={() => setScreen('inbox')} />}

      {/* ── Edit / Manual ────────────────────────────────────────────────── */}
      {screen === 'edit' && editingJob && (
        <EditJobScreen
          job={editingJob}
          isNew={isNewJob}
          onSave={handleSaveEdit}
          onBack={() => { setEditingJob(null); setIsNewJob(false); setScreen(isNewJob ? 'sources' : 'inbox'); }}
        />
      )}

      {/* ── Inbox ────────────────────────────────────────────────────────── */}
      {screen === 'inbox' && (
        <>
          <div className="bg-gray-900 border-b border-gray-800 px-4 pt-12 pb-3 flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Inbox size={16} className="text-blue-400" />
                <span className="font-bold text-white text-base">Dispatch Inbox</span>
                {unreadCount > 0 && (
                  <span className="text-[9px] font-black bg-blue-600 text-white px-1.5 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {acceptedJobs.length > 0 && (
                  <button onClick={clearAccepted} className="text-[10px] text-gray-500 border border-gray-700 px-2 py-1 rounded-lg">
                    Clear done
                  </button>
                )}
                <button onClick={onClose} className="w-8 h-8 rounded-xl bg-gray-800 flex items-center justify-center">
                  <X size={14} className="text-gray-400" />
                </button>
              </div>
            </div>

            {jobs.length > 0 && (
              <div className="flex gap-1.5">
                {(['all', 'pending', 'accepted'] as const).map(f => (
                  <button key={f} onClick={() => setInboxFilter(f)}
                    className={`px-3 py-1 rounded-full text-[10px] font-semibold transition-colors ${
                      inboxFilter === f ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'
                    }`}>
                    {f === 'all'
                      ? `All (${jobs.length})`
                      : f === 'pending'
                      ? `Pending (${pendingJobs.length + dupJobs.length})`
                      : `Accepted (${acceptedJobs.length})`}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            {pendingJobs.length > 1 && (
              <button onClick={handleAcceptAll}
                className="w-full mb-3 flex items-center justify-center gap-2 bg-green-900/30 border border-green-800 rounded-2xl py-3 text-sm font-semibold text-green-300 active:bg-green-900/50 transition-colors">
                <CheckCircle size={15} />
                Accept All ({pendingJobs.length} jobs)
              </button>
            )}

            {jobs.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center mb-4">
                  <Inbox size={28} className="text-gray-600" />
                </div>
                <div className="font-bold text-white text-base mb-1">No schedules imported yet</div>
                <div className="text-xs text-gray-500 mb-6 max-w-xs leading-relaxed">
                  Import from any source — paste dispatch text, upload a CSV or .ics file, or enter a job manually.
                </div>
                <div className="space-y-2 w-full max-w-xs">
                  <button onClick={() => setScreen('sources')} className="w-full bg-white text-gray-950 font-bold py-4 rounded-2xl text-sm">
                    Import Schedule
                  </button>
                  <button onClick={() => handleSourceSelect('manual')} className="w-full bg-gray-900 border border-gray-700 text-white font-semibold py-3.5 rounded-2xl text-sm">
                    Manual Job
                  </button>
                </div>
              </div>
            )}

            {jobs.length > 0 && (
              <div className="space-y-3">
                <AnimatePresence>
                  {displayJobs.map(job => (
                    <JobCard
                      key={job.id}
                      job={job}
                      onEdit={() => { setEditingJob(job); setIsNewJob(false); setScreen('edit'); }}
                      onDelete={() => removeJob(job.id)}
                      onAccept={() => handleAccept(job)}
                      onSkip={() => updateStatus(job.id, 'skipped')}
                      onDupAction={action => {
                        if (action === 'skip')    updateStatus(job.id, 'skipped');
                        if (action === 'replace') handleAccept({ ...job, status: 'pending' });
                        if (action === 'merge')   handleAccept(job);
                      }}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          <div className="px-4 pb-8 pt-2 border-t border-gray-800">
            <button onClick={() => setScreen('sources')}
              className="w-full flex items-center justify-center gap-2 bg-gray-900 border border-gray-700 rounded-2xl py-3.5 text-sm font-semibold text-white active:bg-gray-800 transition-colors">
              <ClipboardList size={15} />
              Import Schedule
            </button>
          </div>
        </>
      )}
    </motion.div>
  );
}
