import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Inbox, Plus, ChevronRight, CheckCircle, Clock, MapPin,
  AlertTriangle, Edit2, Trash2, ClipboardList, Upload,
  FileText, Copy, Camera, Calendar, Mail, Zap, RefreshCw,
  Check, SkipForward, GitMerge, ChevronDown, FileUp,
  AlertCircle, Settings, WifiOff,
} from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import type { ImportedJob, ProviderType } from './types';
import type { ScheduleWizardResult } from '../ScheduleJobWizard';
import type { TodayJob } from '../mockData';
import type { CalendarEvent } from '../dashboardData';
import { PROVIDERS, CATEGORY_LABELS } from './providers/index';
import { parsePastedText, parseCSV, parseICS, calendarEventToImportedJob, emailToImportedJob } from './parsers';
import { useDispatchInbox } from './useDispatchInbox';
import { useOAuthIntegration, getMailSubject, getMailSnippet, getMailFrom } from './useOAuthIntegration';

// ─── Screen types ─────────────────────────────────────────────────────────────
type Screen =
  | 'inbox'
  | 'sources'
  | 'paste'
  | 'csv'
  | 'ics'
  | 'calendar_alt'
  | 'pdf'
  | 'scan'
  | 'email_alt'
  | 'dispatch_alt'
  | 'custom_api'
  | 'edit'
  | 'outlook_connect'
  | 'google_connect';

type CalendarProvider  = 'google_calendar' | 'apple_calendar' | 'outlook_calendar';
type EmailProvider     = 'gmail' | 'outlook_email';
type DispatchPlatform  = 'servicetitan' | 'fieldedge' | 'housecall_pro';

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

// ─── Reusable fallback option button ─────────────────────────────────────────
function FallbackBtn({
  icon, iconColor, title, sub, onClick,
}: {
  icon: React.ReactNode;
  iconColor: string;
  title: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3.5 text-left active:bg-gray-800 transition-colors"
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconColor}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-white">{title}</div>
        <div className="text-[10px] text-gray-500">{sub}</div>
      </div>
      <ChevronRight size={14} className="text-gray-600" />
    </button>
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
              { app: 'Apple Calendar',  step: 'File → Export → Export…' },
              { app: 'Outlook',         step: 'Event → … → Forward as iCalendar' },
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

// ─── PDF screen ───────────────────────────────────────────────────────────────
// Attempts text extraction from the binary PDF. Works for text-based PDFs;
// falls back gracefully for image/scanned PDFs.

function extractTextFromPDF(bytes: ArrayBuffer): string {
  const uint8 = new Uint8Array(bytes);
  const chars: string[] = [];
  for (let i = 0; i < uint8.length; i++) {
    const c = uint8[i];
    if ((c >= 32 && c <= 126) || c === 9 || c === 10 || c === 13) {
      chars.push(String.fromCharCode(c));
    } else {
      chars.push(' ');
    }
  }
  const raw = chars.join('');
  const segments = raw.match(/[ -~\t\n\r]{6,}/g) ?? [];
  return segments
    .map(s => s.trim())
    .filter(s => s.length >= 5 && /[a-zA-Z]{2,}/.test(s))
    .join('\n');
}

function PDFScreen({
  onParsed, onBack, onSelectPaste, onSelectCSV, onSelectICS, onSelectManual,
}: {
  onParsed:      (jobs: ImportedJob[]) => void;
  onBack:        () => void;
  onSelectPaste:  () => void;
  onSelectCSV:    () => void;
  onSelectICS:    () => void;
  onSelectManual: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showFallback, setShowFallback] = useState(false);

  function handleFile(file: File) {
    const name = file.name.toLowerCase();
    if (!name.endsWith('.pdf') && file.type !== 'application/pdf') {
      setError('Please select a .pdf file.'); return;
    }
    setLoading(true); setError('');
    const reader = new FileReader();
    reader.onload = e => {
      const bytes = e.target?.result as ArrayBuffer;
      const text = extractTextFromPDF(bytes);
      setLoading(false);
      if (text.length > 150) {
        const parsed = parsePastedText(text);
        if (parsed.length > 0) { onParsed(parsed); return; }
      }
      setShowFallback(true);
    };
    reader.onerror = () => { setLoading(false); setShowFallback(true); };
    reader.readAsArrayBuffer(file);
  }

  return (
    <div className="flex flex-col h-full">
      <ScreenHeader title="Import PDF" subtitle="Upload a schedule or work order PDF" onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {!showFallback ? (
          <>
            <div className="bg-red-950/20 border border-red-800/30 rounded-xl px-3 py-2.5">
              <p className="text-[10px] text-red-300 leading-relaxed">
                Upload a PDF schedule, work order, or dispatch sheet. Text-based PDFs are extracted automatically. Image-based or scanned PDFs will prompt you to use an alternative method.
              </p>
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-700 rounded-2xl py-12 flex flex-col items-center gap-3 active:border-red-500 transition-colors"
            >
              <FileText size={32} className="text-red-400" />
              <div className="text-sm font-semibold text-gray-400">Tap to select PDF file</div>
              <div className="text-[10px] text-gray-600">Text-based PDFs recommended</div>
            </button>
            <input ref={fileRef} type="file" accept=".pdf,application/pdf" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            {loading && <p className="text-xs text-blue-400 text-center">Extracting text from PDF…</p>}
            {error && <p className="text-xs text-red-400">{error}</p>}
          </>
        ) : (
          <>
            <div className="bg-amber-950/25 border border-amber-800/40 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle size={14} className="text-amber-400 flex-shrink-0" />
                <p className="text-xs font-semibold text-amber-400">This PDF can't be read automatically</p>
              </div>
              <p className="text-[10px] text-gray-400 leading-relaxed">
                Scanned, image-based, or encrypted PDFs require OCR which isn't available in this version. Use one of these methods to import your schedule now — all will get your jobs into the inbox today.
              </p>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Choose an alternative:</p>
            <div className="space-y-2">
              <FallbackBtn icon={<Copy size={16} className="text-blue-300" />} iconColor="bg-blue-900/30" title="Paste Schedule" sub="Copy text from the PDF and paste it here" onClick={onSelectPaste} />
              <FallbackBtn icon={<FileText size={16} className="text-gray-300" />} iconColor="bg-gray-800" title="Import CSV" sub="If you have a CSV export from your platform" onClick={onSelectCSV} />
              <FallbackBtn icon={<FileUp size={16} className="text-purple-300" />} iconColor="bg-purple-900/30" title="Calendar File (.ics)" sub="Export from calendar app instead" onClick={onSelectICS} />
              <FallbackBtn icon={<Plus size={16} className="text-green-300" />} iconColor="bg-green-900/30" title="Manual Entry" sub="Enter job details by hand" onClick={onSelectManual} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Scan screen ──────────────────────────────────────────────────────────────
// Accepts a photo, shows preview. OCR is not available client-side —
// explains clearly and offers productive alternatives.

function ScanScreen({
  onBack, onSelectPaste, onSelectCSV, onSelectICS, onSelectManual,
}: {
  onBack:         () => void;
  onSelectPaste:  () => void;
  onSelectCSV:    () => void;
  onSelectICS:    () => void;
  onSelectManual: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  function handleFile(file: File) {
    const url = URL.createObjectURL(file);
    setPreview(url);
  }

  return (
    <div className="flex flex-col h-full">
      <ScreenHeader title="Scan Schedule" subtitle="Photograph a printed dispatch sheet" onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className="bg-amber-950/25 border border-amber-800/40 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <WifiOff size={13} className="text-amber-400 flex-shrink-0" />
            <p className="text-xs font-semibold text-amber-400">OCR not available in this version</p>
          </div>
          <p className="text-[10px] text-gray-400 leading-relaxed">
            Automatic text recognition from photos requires an AI service that isn't configured. You can photograph the schedule for reference, then use one of the methods below to import jobs today.
          </p>
        </div>

        <button
          onClick={() => fileRef.current?.click()}
          className="w-full border-2 border-dashed border-gray-700 rounded-2xl py-8 flex flex-col items-center gap-3 active:border-gray-500 transition-colors"
        >
          <Camera size={28} className="text-gray-500" />
          <div className="text-sm font-semibold text-gray-400">
            {preview ? 'Tap to retake' : 'Take or upload a photo'}
          </div>
          <div className="text-[10px] text-gray-600">For your reference — not auto-processed</div>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />

        {preview && (
          <div className="rounded-xl overflow-hidden border border-gray-700">
            <img src={preview} alt="Schedule" className="w-full object-contain max-h-48" />
          </div>
        )}

        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Import the schedule using:</p>
        <div className="space-y-2">
          <FallbackBtn icon={<Copy size={16} className="text-blue-300" />} iconColor="bg-blue-900/30" title="Paste Schedule" sub="Type or copy text from the schedule" onClick={onSelectPaste} />
          <FallbackBtn icon={<FileText size={16} className="text-gray-300" />} iconColor="bg-gray-800" title="Import CSV" sub="If you have a digital version of this schedule" onClick={onSelectCSV} />
          <FallbackBtn icon={<FileUp size={16} className="text-purple-300" />} iconColor="bg-purple-900/30" title="Calendar File (.ics)" sub="Export from your calendar app" onClick={onSelectICS} />
          <FallbackBtn icon={<Plus size={16} className="text-green-300" />} iconColor="bg-green-900/30" title="Manual Entry" sub="Enter job details from the printed sheet" onClick={onSelectManual} />
        </div>
      </div>
    </div>
  );
}

// ─── Calendar alternative screen ──────────────────────────────────────────────

const CALENDAR_INFO: Record<'apple_calendar', {
  name: string;
  authNote: string;
  instructions: string;
}> = {
  apple_calendar: {
    name: 'Apple Calendar',
    authNote: 'Apple Calendar does not support direct web sync. Tap the event in the Calendar app to export or copy it.',
    instructions: 'Open Calendar → tap the event → tap Edit → tap Share → Save .ics to Files. Or copy event details and paste below.',
  },
};

function CalendarAltScreen({
  provider, onSelectICS, onSelectPaste, onSelectManual, onBack,
}: {
  provider:       'apple_calendar';
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
        <div className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle size={13} className="text-gray-400 flex-shrink-0" />
            <p className="text-xs font-semibold text-gray-300">Direct sync not available</p>
          </div>
          <p className="text-[10px] text-gray-500 leading-relaxed">{info.authNote}</p>
        </div>

        <div className="bg-blue-950/20 border border-blue-800/30 rounded-xl px-4 py-3">
          <p className="text-[10px] text-blue-300 font-semibold mb-1">How to export from {info.name}</p>
          <p className="text-[10px] text-gray-400 leading-relaxed">{info.instructions}</p>
        </div>

        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Import your schedule today:</p>
        <div className="space-y-2">
          <FallbackBtn icon={<FileUp size={18} className="text-purple-300" />} iconColor="bg-purple-900/30" title="Upload .ics File" sub="Export from calendar app, then upload here" onClick={onSelectICS} />
          <FallbackBtn icon={<Copy size={18} className="text-blue-300" />} iconColor="bg-blue-900/30" title="Paste Event Text" sub="Open event, copy details, paste into UnitDown" onClick={onSelectPaste} />
          <FallbackBtn icon={<Plus size={18} className="text-green-300" />} iconColor="bg-green-900/30" title="Enter Manually" sub="Type job details by hand" onClick={onSelectManual} />
        </div>
      </div>
    </div>
  );
}

// ─── Email alternative screen ─────────────────────────────────────────────────

const EMAIL_INFO: Record<EmailProvider, {
  name: string;
  authNote: string;
  pasteHint: string;
}> = {
  gmail: {
    name: 'Gmail',
    authNote: 'Direct Gmail inbox access requires Google OAuth, which is not configured. To connect Gmail sync, contact UnitDown support.',
    pasteHint: 'Open the dispatch email in Gmail → select all → copy → paste into UnitDown.',
  },
  outlook_email: {
    name: 'Outlook Email',
    authNote: 'Outlook inbox access requires Microsoft Graph API authentication, which is not configured. Full email sync requires Microsoft credentials.',
    pasteHint: 'Open the dispatch email in Outlook → Ctrl+A → Ctrl+C → paste into UnitDown. Or forward as iCalendar and upload the .ics file.',
  },
};

function EmailAltScreen({
  provider, onSelectPaste, onSelectICS, onSelectManual, onBack,
}: {
  provider:      EmailProvider;
  onSelectPaste:  () => void;
  onSelectICS:    () => void;
  onSelectManual: () => void;
  onBack:         () => void;
}) {
  const info = EMAIL_INFO[provider];

  return (
    <div className="flex flex-col h-full">
      <ScreenHeader title={`Import from ${info.name}`} onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle size={13} className="text-gray-400 flex-shrink-0" />
            <p className="text-xs font-semibold text-gray-300">Direct sync requires setup</p>
          </div>
          <p className="text-[10px] text-gray-500 leading-relaxed">{info.authNote}</p>
        </div>

        <div className="bg-blue-950/20 border border-blue-800/30 rounded-xl px-4 py-3">
          <p className="text-[10px] text-blue-300 font-semibold mb-1">Import dispatch emails today</p>
          <p className="text-[10px] text-gray-400 leading-relaxed">{info.pasteHint}</p>
        </div>

        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Get jobs into the inbox now:</p>
        <div className="space-y-2">
          <FallbackBtn icon={<Copy size={18} className="text-blue-300" />} iconColor="bg-blue-900/30" title="Paste Dispatch Email" sub="Copy email text, paste here — AI extracts jobs" onClick={onSelectPaste} />
          <FallbackBtn icon={<FileUp size={18} className="text-purple-300" />} iconColor="bg-purple-900/30" title="Calendar File (.ics)" sub="If the email has a calendar attachment" onClick={onSelectICS} />
          <FallbackBtn icon={<Plus size={18} className="text-green-300" />} iconColor="bg-green-900/30" title="Manual Entry" sub="Enter job details from the email" onClick={onSelectManual} />
        </div>
      </div>
    </div>
  );
}

// ─── OAuth Connect Screen (Outlook + Google) ──────────────────────────────────

function OAuthConnectScreen({
  provider,
  importType,
  userId,
  onParsed,
  onBack,
  onSelectICS,
  onSelectPaste,
  onSelectManual,
}: {
  provider:       'outlook' | 'google';
  importType:     'calendar' | 'email';
  userId:         string | undefined;
  onParsed:       (jobs: ImportedJob[]) => void;
  onBack:         () => void;
  onSelectICS:    () => void;
  onSelectPaste:  () => void;
  onSelectManual: () => void;
}) {
  const {
    status, statusLoading, events, messages, dataLoading, connecting, error,
    connect, disconnect, fetchCalendarEvents, fetchEmails,
  } = useOAuthIntegration(provider, userId);

  const label = provider === 'outlook' ? 'Outlook' : 'Google';
  const dataLoaded = importType === 'calendar' ? events.length > 0 : messages.length > 0;

  useEffect(() => {
    if (status.connected) {
      if (importType === 'calendar') fetchCalendarEvents();
      else fetchEmails();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.connected]);

  function handleImportEvent(ev: unknown) {
    const source: ProviderType = provider === 'outlook' ? 'outlook_calendar' : 'google_calendar';
    const job = calendarEventToImportedJob(ev as Parameters<typeof calendarEventToImportedJob>[0], source);
    onParsed([job]);
  }

  function handleImportEmail(msg: unknown) {
    const source: ProviderType = provider === 'outlook' ? 'outlook_email' : 'gmail';
    const job = emailToImportedJob(msg as Parameters<typeof emailToImportedJob>[0], source);
    onParsed([job]);
  }

  const title = `${label} ${importType === 'calendar' ? 'Calendar' : 'Email'}`;

  if (statusLoading) {
    return (
      <div className="flex flex-col h-full">
        <ScreenHeader title={title} onBack={onBack} />
        <div className="flex-1 flex items-center justify-center">
          <span className="text-sm text-gray-500">Checking connection…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ScreenHeader title={title} onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* ── Not configured (env vars missing) ─────────────────────────────── */}
        {!status.configured && (
          <div className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle size={13} className="text-gray-400 flex-shrink-0" />
              <p className="text-xs font-semibold text-gray-300">Direct sync requires setup</p>
            </div>
            <p className="text-[10px] text-gray-500 leading-relaxed">
              {label} sync needs OAuth credentials configured on the server. Import another way today using the options below — full {label} sync will be available once set up.
            </p>
          </div>
        )}

        {/* ── Configured, not yet connected ─────────────────────────────────── */}
        {status.configured && !status.connected && (
          <>
            <div className="bg-blue-950/30 border border-blue-800/40 rounded-xl px-4 py-3">
              <p className="text-[10px] text-blue-300 leading-relaxed">
                Sign in to {label} to pull your {importType === 'calendar' ? 'calendar events' : 'dispatch emails'} directly into the inbox. Takes about 30 seconds.
              </p>
            </div>
            <button
              onClick={connect}
              disabled={connecting}
              className="w-full bg-white text-gray-950 font-bold py-4 rounded-2xl text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-60"
            >
              {connecting
                ? <RefreshCw size={16} className="animate-spin" />
                : <Zap size={16} />}
              {connecting ? 'Connecting…' : `Connect ${label}`}
            </button>
          </>
        )}

        {/* ── Connected ─────────────────────────────────────────────────────── */}
        {status.connected && (
          <div className="flex items-center justify-between bg-green-950/20 border border-green-800/40 rounded-xl px-3 py-2">
            <div className="flex items-center gap-2">
              <CheckCircle size={13} className="text-green-400" />
              <span className="text-xs font-semibold text-green-300">{label} connected</span>
            </div>
            <button onClick={disconnect} className="text-[10px] text-gray-500 border border-gray-700 px-2 py-1 rounded-lg">
              Disconnect
            </button>
          </div>
        )}

        {/* ── Error ─────────────────────────────────────────────────────────── */}
        {!!error && (
          <p className="text-[10px] text-red-400 bg-red-950/20 border border-red-800/30 rounded-lg px-3 py-2">{error}</p>
        )}

        {/* ── Fetch button (connected, no data yet) ─────────────────────────── */}
        {status.connected && !dataLoaded && !dataLoading && (
          <button
            onClick={importType === 'calendar' ? fetchCalendarEvents : fetchEmails}
            className="w-full flex items-center justify-center gap-2 bg-gray-800 border border-gray-700 rounded-2xl py-3 text-sm font-semibold text-white active:bg-gray-700 transition-colors"
          >
            <RefreshCw size={14} />
            {importType === 'calendar' ? 'Load Calendar Events' : 'Load Recent Emails'}
          </button>
        )}
        {status.connected && dataLoading && (
          <div className="flex items-center justify-center gap-2 py-6">
            <RefreshCw size={14} className="animate-spin text-gray-500" />
            <span className="text-sm text-gray-500">Loading…</span>
          </div>
        )}

        {/* ── Calendar events list ───────────────────────────────────────────── */}
        {status.connected && importType === 'calendar' && events.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Upcoming Events ({events.length})</p>
              <button onClick={fetchCalendarEvents} className="text-[10px] text-gray-500 flex items-center gap-1">
                <RefreshCw size={10} /> Refresh
              </button>
            </div>
            <div className="space-y-2">
              {(events as unknown as Record<string, unknown>[]).map((ev, i) => {
                const subject     = (ev.subject ?? ev.summary ?? 'Calendar Event') as string;
                const startDT     = ((ev.start as Record<string, string> | undefined)?.dateTime ?? (ev.start as Record<string, string> | undefined)?.date ?? '') as string;
                const locRaw      = ev.location;
                const loc         = typeof locRaw === 'string' ? locRaw : (locRaw as Record<string, string> | undefined)?.displayName ?? '';
                const parsedStart = startDT ? new Date(startDT) : null;
                return (
                  <div key={(ev.id as string) ?? i} className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white leading-tight truncate">{subject}</div>
                      {parsedStart && (
                        <div className="text-[10px] text-blue-400 mt-0.5">
                          {parsedStart.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                          {startDT.includes('T') && ` · ${parsedStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                        </div>
                      )}
                      {loc && <div className="text-[10px] text-gray-500 truncate mt-0.5">{loc}</div>}
                    </div>
                    <button
                      onClick={() => handleImportEvent(ev)}
                      className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-blue-900/40 border border-blue-700/60 rounded-xl text-[10px] font-bold text-blue-300 active:bg-blue-900/60"
                    >
                      <Plus size={10} /> Import
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
        {status.connected && importType === 'calendar' && events.length === 0 && !dataLoading && dataLoaded && (
          <p className="text-center text-[10px] text-gray-500 py-4">No upcoming events found in the next 30 days.</p>
        )}

        {/* ── Email list ────────────────────────────────────────────────────── */}
        {status.connected && importType === 'email' && messages.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Recent Emails ({messages.length})</p>
              <button onClick={fetchEmails} className="text-[10px] text-gray-500 flex items-center gap-1">
                <RefreshCw size={10} /> Refresh
              </button>
            </div>
            <div className="space-y-2">
              {messages.map((msg, i) => (
                <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white leading-tight truncate">{getMailSubject(msg)}</div>
                    {getMailFrom(msg) && <div className="text-[10px] text-gray-500 truncate mt-0.5">{getMailFrom(msg)}</div>}
                    {getMailSnippet(msg) && <div className="text-[10px] text-gray-600 mt-0.5 line-clamp-2">{getMailSnippet(msg)}</div>}
                  </div>
                  <button
                    onClick={() => handleImportEmail(msg)}
                    className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-blue-900/40 border border-blue-700/60 rounded-xl text-[10px] font-bold text-blue-300 active:bg-blue-900/60"
                  >
                    <Plus size={10} /> Import
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
        {status.connected && importType === 'email' && messages.length === 0 && !dataLoading && dataLoaded && (
          <p className="text-center text-[10px] text-gray-500 py-4">No emails found in the past 7 days.</p>
        )}

        {/* ── Always-visible alternatives ───────────────────────────────────── */}
        <div className="border-t border-gray-800 pt-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Import another way today:</p>
          <div className="space-y-2">
            {importType === 'calendar' && (
              <FallbackBtn icon={<FileUp size={16} className="text-purple-300" />} iconColor="bg-purple-900/30" title="Calendar File (.ics)" sub="Export from calendar app, then upload" onClick={onSelectICS} />
            )}
            <FallbackBtn icon={<Copy size={16} className="text-blue-300" />} iconColor="bg-blue-900/30" title="Paste Schedule" sub="Copy and paste dispatch text or email" onClick={onSelectPaste} />
            <FallbackBtn icon={<Plus size={16} className="text-green-300" />} iconColor="bg-green-900/30" title="Manual Entry" sub="Enter job details by hand" onClick={onSelectManual} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Dispatch platform alternative screen ─────────────────────────────────────

const DISPATCH_INFO: Record<DispatchPlatform, {
  name:          string;
  apiNote:       string;
  csvExportPath: string;
  pasteHint:     string;
}> = {
  servicetitan: {
    name:          'ServiceTitan',
    apiNote:       'ServiceTitan API integration requires OAuth 2.0 credentials and a ServiceTitan developer account. Contact UnitDown support to set up direct sync.',
    csvExportPath: 'ServiceTitan: Reports → Schedule → select date range → Export as CSV',
    pasteHint:     'Copy job details from the dispatch board or email and paste them.',
  },
  fieldedge: {
    name:          'FieldEdge',
    apiNote:       'FieldEdge API integration requires API credentials from your FieldEdge account manager. Contact UnitDown support to configure.',
    csvExportPath: 'FieldEdge: Schedule tab → select jobs → Export to CSV',
    pasteHint:     'Copy job details from FieldEdge dispatch and paste them.',
  },
  housecall_pro: {
    name:          'Housecall Pro',
    apiNote:       'Housecall Pro API requires an active subscription and API key from Settings → Integrations. Contact UnitDown support to set up.',
    csvExportPath: 'Housecall Pro: Reporting → Jobs → set date filter → Export CSV',
    pasteHint:     'Copy job details from Housecall Pro and paste them.',
  },
};

function DispatchAltScreen({
  platform, onSelectCSV, onSelectPaste, onSelectManual, onBack,
}: {
  platform:       DispatchPlatform;
  onSelectCSV:    () => void;
  onSelectPaste:  () => void;
  onSelectManual: () => void;
  onBack:         () => void;
}) {
  const info = DISPATCH_INFO[platform];

  return (
    <div className="flex flex-col h-full">
      <ScreenHeader title={`Import from ${info.name}`} onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle size={13} className="text-gray-400 flex-shrink-0" />
            <p className="text-xs font-semibold text-gray-300">API setup required for live sync</p>
          </div>
          <p className="text-[10px] text-gray-500 leading-relaxed">{info.apiNote}</p>
        </div>

        <div className="bg-blue-950/20 border border-blue-800/30 rounded-xl px-4 py-3 space-y-2">
          <p className="text-[10px] text-blue-300 font-semibold">Export jobs from {info.name} today</p>
          <div className="flex items-start gap-2">
            <FileText size={11} className="text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-gray-400 leading-relaxed">{info.csvExportPath}</p>
          </div>
          <div className="flex items-start gap-2">
            <Copy size={11} className="text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-gray-400 leading-relaxed">{info.pasteHint}</p>
          </div>
        </div>

        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Import jobs now:</p>
        <div className="space-y-2">
          <FallbackBtn icon={<FileText size={18} className="text-gray-300" />} iconColor="bg-gray-800" title="Import CSV" sub={`Export from ${info.name}, upload here`} onClick={onSelectCSV} />
          <FallbackBtn icon={<Copy size={18} className="text-blue-300" />} iconColor="bg-blue-900/30" title="Paste Dispatch Text" sub="Copy from dispatch email or board, paste here" onClick={onSelectPaste} />
          <FallbackBtn icon={<Plus size={18} className="text-green-300" />} iconColor="bg-green-900/30" title="Manual Entry" sub="Enter job details by hand" onClick={onSelectManual} />
        </div>
      </div>
    </div>
  );
}

// ─── Custom API setup wizard ──────────────────────────────────────────────────

interface CustomAPIConfig {
  name:         string;
  baseUrl:      string;
  token:        string;
  authType:     'bearer' | 'apikey' | 'basic';
  jobsEndpoint: string;
  savedAt:      string;
}

function CustomAPIScreen({ onBack, onSelectCSV, onSelectPaste, onSelectManual }: {
  onBack:         () => void;
  onSelectCSV:    () => void;
  onSelectPaste:  () => void;
  onSelectManual: () => void;
}) {
  const [name,         setName]         = useState('');
  const [baseUrl,      setBaseUrl]      = useState('https://');
  const [token,        setToken]        = useState('');
  const [authType,     setAuthType]     = useState<'bearer' | 'apikey' | 'basic'>('bearer');
  const [jobsEndpoint, setJobsEndpoint] = useState('/jobs');
  const [saved,        setSaved]        = useState(false);
  const [testing,      setTesting]      = useState(false);
  const [testMsg,      setTestMsg]      = useState('');

  const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors';

  function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">{label}</label>
        {children}
      </div>
    );
  }

  async function handleTest() {
    if (!baseUrl || !jobsEndpoint) { setTestMsg('Enter a base URL and endpoint first.'); return; }
    setTesting(true); setTestMsg('');
    try {
      const url = baseUrl.replace(/\/$/, '') + jobsEndpoint;
      const headers: Record<string, string> = {};
      if (authType === 'bearer') headers['Authorization'] = `Bearer ${token}`;
      else if (authType === 'apikey') headers['X-API-Key'] = token;
      else if (authType === 'basic') headers['Authorization'] = `Basic ${btoa(token)}`;
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        setTestMsg(`✓ Connected — HTTP ${res.status}`);
      } else {
        setTestMsg(`✗ HTTP ${res.status} — check credentials`);
      }
    } catch {
      setTestMsg('✗ Connection failed — check URL and network');
    } finally {
      setTesting(false);
    }
  }

  function handleSave() {
    const config: CustomAPIConfig = {
      name: name || 'Custom API',
      baseUrl, token, authType, jobsEndpoint,
      savedAt: new Date().toISOString(),
    };
    try {
      const existing: CustomAPIConfig[] = JSON.parse(localStorage.getItem('unitdown_custom_apis') ?? '[]');
      existing.push(config);
      localStorage.setItem('unitdown_custom_apis', JSON.stringify(existing));
    } catch { /* localStorage unavailable */ }
    setSaved(true);
  }

  return (
    <div className="flex flex-col h-full">
      <ScreenHeader title="Custom API" subtitle="Connect any dispatch system via REST" onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <div className="bg-purple-950/20 border border-purple-800/30 rounded-xl px-3 py-2.5">
          <p className="text-[10px] text-purple-300 leading-relaxed">
            Configure a REST API connection to any scheduling system. Configuration is saved locally. Full backend activation requires UnitDown support.
          </p>
        </div>

        {saved ? (
          <div className="bg-green-950/20 border border-green-800/40 rounded-xl px-4 py-5 text-center">
            <CheckCircle size={24} className="text-green-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-green-300 mb-1">Configuration saved locally</p>
            <p className="text-[10px] text-gray-500 leading-relaxed">
              Your API config is stored on this device. Share it with the UnitDown team to activate live sync. Use the options below to import jobs in the meantime.
            </p>
          </div>
        ) : (
          <>
            <Field label="Integration Name">
              <input className={inputCls} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Our Dispatch System" />
            </Field>
            <Field label="Base URL">
              <input className={inputCls} value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder="https://api.example.com" />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Auth Type">
                <select className={inputCls} value={authType} onChange={e => setAuthType(e.target.value as 'bearer' | 'apikey' | 'basic')}>
                  <option value="bearer">Bearer Token</option>
                  <option value="apikey">API Key</option>
                  <option value="basic">Basic Auth</option>
                </select>
              </Field>
              <Field label="Jobs Endpoint">
                <input className={inputCls} value={jobsEndpoint} onChange={e => setJobsEndpoint(e.target.value)} placeholder="/jobs" />
              </Field>
            </div>
            <Field label="API Token / Key">
              <input className={inputCls} type="password" value={token} onChange={e => setToken(e.target.value)} placeholder="Paste your token or key" />
            </Field>

            {testMsg && (
              <p className={`text-[10px] font-semibold ${testMsg.startsWith('✓') ? 'text-green-400' : 'text-red-400'}`}>
                {testMsg}
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleTest}
                disabled={testing}
                className="flex-1 flex items-center justify-center gap-2 bg-gray-800 border border-gray-700 rounded-xl py-2.5 text-xs font-semibold text-gray-300 active:bg-gray-700 transition-colors disabled:opacity-50"
              >
                <Settings size={13} className={testing ? 'animate-spin' : ''} />
                {testing ? 'Testing…' : 'Test Connection'}
              </button>
              <button
                onClick={handleSave}
                disabled={!name.trim() && !baseUrl.trim()}
                className="flex-1 bg-white text-gray-950 font-bold rounded-xl py-2.5 text-xs active:scale-[0.98] transition-transform disabled:opacity-40"
              >
                Save Config
              </button>
            </div>
          </>
        )}

        <div className="border-t border-gray-800 pt-4 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Import jobs while you set this up:</p>
          <FallbackBtn icon={<FileText size={16} className="text-gray-300" />} iconColor="bg-gray-800" title="Import CSV" sub="Export a CSV from your scheduling system" onClick={onSelectCSV} />
          <FallbackBtn icon={<Copy size={16} className="text-blue-300" />} iconColor="bg-blue-900/30" title="Paste Schedule" sub="Copy and paste your dispatch text" onClick={onSelectPaste} />
          <FallbackBtn icon={<Plus size={16} className="text-green-300" />} iconColor="bg-green-900/30" title="Manual Entry" sub="Enter job details by hand" onClick={onSelectManual} />
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
                {catProviders.map(p => (
                  <button
                    key={p.id}
                    onClick={() => onSelect(p.id)}
                    className="w-full flex items-center gap-3 bg-gray-900 border border-gray-700 rounded-2xl px-4 py-3 text-left active:bg-gray-800 transition-colors cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-xl bg-gray-800 flex items-center justify-center flex-shrink-0">
                      <ProviderIcon id={p.id} size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white">{p.name}</div>
                      <div className="text-[10px] text-gray-500">{p.tagline}</div>
                    </div>
                    <ChevronRight size={14} className="text-gray-600 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          );
        })}

        <div className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">On the roadmap</div>
          <div className="flex flex-wrap gap-1">
            {['Successware', 'Service Fusion', 'Lennox Dispatch', 'Carrier ServiceBench', 'Trane TechAssist', 'SMS parsing', 'Daikin Connect'].map(f => (
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
  onClose:        () => void;
  onStartJob:     () => void;
  onJobAccepted?: (result: ScheduleWizardResult) => void;
}

export function DispatchInboxModal({ onClose, onStartJob, onJobAccepted }: Props) {
  const { user } = useUser();
  const techName = user?.fullName || user?.firstName || 'Me';

  const {
    jobs, pendingJobs, acceptedJobs, dupJobs,
    addJobs, updateJob, updateStatus, removeJob, acceptAll, clearAccepted,
  } = useDispatchInbox();

  const [screen,           setScreen]          = useState<Screen>('inbox');
  const [editingJob,       setEditingJob]       = useState<ImportedJob | null>(null);
  const [isNewJob,         setIsNewJob]         = useState(false);
  const [calendarFor,      setCalendarFor]      = useState<'apple_calendar'>('apple_calendar');
  const [emailFor,         setEmailFor]         = useState<EmailProvider>('gmail');
  const [dispatchPlatform, setDispatchPlatform] = useState<DispatchPlatform>('servicetitan');
  const [inboxFilter,      setInboxFilter]      = useState<'all' | 'pending' | 'accepted'>('all');
  const [connectImportType, setConnectImportType] = useState<'calendar' | 'email'>('calendar');

  // ── Accept a single job ────────────────────────────────────────────────────
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
    if (id === 'paste')    { setScreen('paste');  return; }
    if (id === 'csv')      { setScreen('csv');    return; }
    if (id === 'ics')      { setScreen('ics');    return; }
    if (id === 'pdf')      { setScreen('pdf');    return; }
    if (id === 'scan_ocr') { setScreen('scan');   return; }
    if (id === 'google_calendar')  { setConnectImportType('calendar'); setScreen('google_connect');  return; }
    if (id === 'gmail')            { setConnectImportType('email');    setScreen('google_connect');  return; }
    if (id === 'outlook_calendar') { setConnectImportType('calendar'); setScreen('outlook_connect'); return; }
    if (id === 'outlook_email')    { setConnectImportType('email');    setScreen('outlook_connect'); return; }
    if (id === 'apple_calendar')   { setCalendarFor('apple_calendar'); setScreen('calendar_alt');   return; }
    if (id === 'servicetitan')  { setDispatchPlatform('servicetitan');  setScreen('dispatch_alt'); return; }
    if (id === 'fieldedge')     { setDispatchPlatform('fieldedge');     setScreen('dispatch_alt'); return; }
    if (id === 'housecall_pro') { setDispatchPlatform('housecall_pro'); setScreen('dispatch_alt'); return; }
    if (id === 'custom_api')    { setScreen('custom_api'); return; }
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

  // ── Shared navigation callbacks for fallback screens ──────────────────────
  const goCSV     = () => setScreen('csv');
  const goPaste   = () => setScreen('paste');
  const goICS     = () => setScreen('ics');
  const goManual  = () => handleSourceSelect('manual');
  const goSources = () => setScreen('sources');

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-gray-950"
    >
      {/* ── Paste ─────────────────────────────────────────────────────────── */}
      {screen === 'paste' && <PasteScreen onParsed={handleParsed} onBack={goSources} />}

      {/* ── CSV ───────────────────────────────────────────────────────────── */}
      {screen === 'csv' && <CSVScreen onParsed={handleParsed} onBack={goSources} />}

      {/* ── ICS ───────────────────────────────────────────────────────────── */}
      {screen === 'ics' && <ICSScreen onParsed={handleParsed} onBack={goSources} />}

      {/* ── PDF ───────────────────────────────────────────────────────────── */}
      {screen === 'pdf' && (
        <PDFScreen
          onParsed={handleParsed}
          onBack={goSources}
          onSelectPaste={goPaste}
          onSelectCSV={goCSV}
          onSelectICS={goICS}
          onSelectManual={goManual}
        />
      )}

      {/* ── Scan ──────────────────────────────────────────────────────────── */}
      {screen === 'scan' && (
        <ScanScreen
          onBack={goSources}
          onSelectPaste={goPaste}
          onSelectCSV={goCSV}
          onSelectICS={goICS}
          onSelectManual={goManual}
        />
      )}

      {/* ── Calendar alt (Apple Calendar only) ───────────────────────────── */}
      {screen === 'calendar_alt' && (
        <CalendarAltScreen
          provider={calendarFor}
          onSelectICS={goICS}
          onSelectPaste={goPaste}
          onSelectManual={goManual}
          onBack={goSources}
        />
      )}

      {/* ── Email alt (legacy fallback, may not be reached) ───────────────── */}
      {screen === 'email_alt' && (
        <EmailAltScreen
          provider={emailFor}
          onSelectPaste={goPaste}
          onSelectICS={goICS}
          onSelectManual={goManual}
          onBack={goSources}
        />
      )}

      {/* ── Outlook connect ───────────────────────────────────────────────── */}
      {screen === 'outlook_connect' && (
        <OAuthConnectScreen
          provider="outlook"
          importType={connectImportType}
          userId={user?.id}
          onParsed={handleParsed}
          onBack={goSources}
          onSelectICS={goICS}
          onSelectPaste={goPaste}
          onSelectManual={goManual}
        />
      )}

      {/* ── Google connect ────────────────────────────────────────────────── */}
      {screen === 'google_connect' && (
        <OAuthConnectScreen
          provider="google"
          importType={connectImportType}
          userId={user?.id}
          onParsed={handleParsed}
          onBack={goSources}
          onSelectICS={goICS}
          onSelectPaste={goPaste}
          onSelectManual={goManual}
        />
      )}

      {/* ── Dispatch alt ──────────────────────────────────────────────────── */}
      {screen === 'dispatch_alt' && (
        <DispatchAltScreen
          platform={dispatchPlatform}
          onSelectCSV={goCSV}
          onSelectPaste={goPaste}
          onSelectManual={goManual}
          onBack={goSources}
        />
      )}

      {/* ── Custom API ────────────────────────────────────────────────────── */}
      {screen === 'custom_api' && (
        <CustomAPIScreen
          onBack={goSources}
          onSelectCSV={goCSV}
          onSelectPaste={goPaste}
          onSelectManual={goManual}
        />
      )}

      {/* ── Sources ───────────────────────────────────────────────────────── */}
      {screen === 'sources' && <SourcesScreen onSelect={handleSourceSelect} onBack={() => setScreen('inbox')} />}

      {/* ── Edit / Manual ─────────────────────────────────────────────────── */}
      {screen === 'edit' && editingJob && (
        <EditJobScreen
          job={editingJob}
          isNew={isNewJob}
          onSave={handleSaveEdit}
          onBack={() => { setEditingJob(null); setIsNewJob(false); setScreen(isNewJob ? 'sources' : 'inbox'); }}
        />
      )}

      {/* ── Inbox ─────────────────────────────────────────────────────────── */}
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
