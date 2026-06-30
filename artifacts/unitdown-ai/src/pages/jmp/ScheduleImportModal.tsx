/**
 * ScheduleImportModal
 * Full-screen "Import Schedule" picker that lets a tech bring in their daily
 * work via five methods, all funnelling into a shared Review Jobs screen
 * before the caller persists anything.
 *
 * Screens
 *   menu      — method picker (Talk · Paste · Scan · ICS · Phone Calendar)
 *   voice     — ScheduleConversationModal (has its own built-in review)
 *   paste     — textarea → AI parse → review
 *   scan      — image capture/upload → OCR → editable text → AI parse → review
 *   ics       — .ics file upload → client-side parser → review
 *   calendar  — Web Calendar API (or graceful fallback) → review
 *   review    — shared review + inline edit → onSaved
 */

import { useState, useRef, useCallback, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Mic, FileText, Camera, Calendar, Smartphone,
  CheckCircle, ChevronDown, ChevronUp, Check, X, Loader2,
  AlertTriangle, Upload,
} from 'lucide-react';
import { ScheduleConversationModal } from './schedule/ScheduleConversationModal';
import { parsePastedText } from './dispatch/parsers';
import { importedToResult, extractSmartReminders } from './TalkScheduleModal';
import type { ImportedJob } from './dispatch/types';
import type { ScheduleWizardResult } from './ScheduleJobWizard';
import type { ReminderData } from './TalkScheduleModal';

type Screen = 'menu' | 'voice' | 'paste' | 'scan' | 'ics' | 'calendar' | 'review';

interface Props {
  userId:  string;
  onSaved: (results: ScheduleWizardResult[], reminders: ReminderData[]) => void;
  onClose: () => void;
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function uid() { return `SI-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`; }
function todayISO() { return new Date().toISOString().split('T')[0]; }

function guessPriority(text: string): ImportedJob['priority'] {
  const t = text.toLowerCase();
  if (t.includes('emergency') || t.includes('urgent') || t.includes('asap')) return 'emergency';
  if (t.includes('high priority')) return 'high';
  if (/\bpm\b/.test(t) || t.includes('preventive') || t.includes('maintenance')) return 'pm';
  return 'normal';
}

function guessJobType(text: string): string {
  const t = text.toLowerCase();
  if (t.includes('pm') || t.includes('preventive') || t.includes('maintenance')) return 'Preventive Maintenance';
  if (t.includes('emergency') || t.includes('urgent')) return 'Emergency';
  if (t.includes('install')) return 'Installation';
  if (t.includes('follow') && t.includes('up')) return 'Follow-up';
  if (t.includes('startup') || t.includes('start-up')) return 'Startup';
  if (t.includes('warranty')) return 'Warranty';
  if (t.includes('inspection')) return 'Inspection';
  return 'Service Call';
}

function makeBlankJob(source: ImportedJob['source']): ImportedJob {
  return {
    id: uid(), source, jobNumber: '', customer: '', site: '', address: '',
    appointmentDate: todayISO(), appointmentTime: '', timeWindow: '',
    phone: '', technician: '', jobType: 'Service Call', priority: 'normal',
    complaint: '', notes: '', equipment: '', attachments: [],
    rawData: '', importedAt: new Date().toISOString(), status: 'pending',
  };
}

// ─── ICS client-side parser ──────────────────────────────────────────────────

function parseICSDateTime(dt: string): { date: string; time: string } {
  const clean = dt.replace('Z', '').replace(/^.*:/, '');
  if (clean.includes('T')) {
    const [d, t] = clean.split('T');
    const y = d.slice(0, 4), mo = d.slice(4, 6), dy = d.slice(6, 8);
    const h = parseInt(t.slice(0, 2)), mi = t.slice(2, 4);
    const p = h >= 12 ? 'PM' : 'AM';
    return { date: `${y}-${mo}-${dy}`, time: `${h % 12 || 12}:${mi} ${p}` };
  }
  const y = clean.slice(0, 4), mo = clean.slice(4, 6), dy = clean.slice(6, 8);
  return { date: `${y}-${mo}-${dy}`, time: '' };
}

function icsGet(lines: string[], key: string): string {
  for (const line of lines) {
    if (line.startsWith(key + ':') || line.startsWith(key + ';')) {
      return line.replace(/^[^:]+:/, '').trim();
    }
  }
  return '';
}

export function parseICS(text: string): ImportedJob[] {
  const jobs: ImportedJob[] = [];
  const blocks = text.split('BEGIN:VEVENT').slice(1);
  for (const raw of blocks) {
    const end = raw.indexOf('END:VEVENT');
    const content = end >= 0 ? raw.slice(0, end) : raw;
    const unfolded = content.replace(/\r?\n[ \t]/g, '');
    const lines = unfolded.split(/\r?\n/).filter(Boolean);

    const summary     = icsGet(lines, 'SUMMARY').replace(/\\n/g, ' ').replace(/\\/g, '');
    const location    = icsGet(lines, 'LOCATION').replace(/\\/g, '');
    const description = icsGet(lines, 'DESCRIPTION').replace(/\\n/g, '\n').replace(/\\/g, '');
    const dtStart     = icsGet(lines, 'DTSTART');

    if (!summary && !description) continue;

    const { date, time } = dtStart ? parseICSDateTime(dtStart) : { date: todayISO(), time: '' };
    const combined = [summary, description].join(' ');

    const job = makeBlankJob('ics');
    job.customer        = summary || 'Calendar Event';
    job.appointmentDate = date;
    job.appointmentTime = time;
    job.address         = location;
    job.notes           = description.slice(0, 500);
    job.jobType         = guessJobType(combined);
    job.priority        = guessPriority(combined);
    jobs.push(job);
  }
  return jobs;
}

// ─── Shared AI parse via /api/speak-schedule/parse ──────────────────────────

async function aiParseText(
  text: string,
  clientId: string,
  source: ImportedJob['source'],
): Promise<ImportedJob[]> {
  const today = todayISO();
  try {
    const res = await fetch('/api/speak-schedule/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, transcript: text.trim().slice(0, 4000), today }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { jobs?: ImportedJob[]; error?: string };
    if (data.jobs?.length) {
      return data.jobs.map(j => ({ ...j, source }));
    }
  } catch {
    // fall through to regex fallback
  }
  const regexJobs = parsePastedText(text);
  return regexJobs.map(j => ({ ...j, source }));
}

// ─── Shared: convert + save ───────────────────────────────────────────────────

function persistJobs(
  jobs: ImportedJob[],
  onSaved: Props['onSaved'],
) {
  const todayStr = todayISO();
  const scheduleJobs = jobs.filter(
    j => j.jobType !== 'Reminder' && j.jobType !== 'Note' && j.customer?.trim()
  );
  const results   = scheduleJobs.map(j => importedToResult(j, todayStr));
  const reminders = extractSmartReminders(jobs);
  onSaved(results, reminders);
}

// ─── Shared Review Screen ────────────────────────────────────────────────────

interface DraftJob extends ImportedJob { selected: boolean; editing: boolean; }

const INPUT = 'w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors';
const SEL   = `${INPUT} appearance-none`;

function JobReviewCard({
  draft, onToggle, onUpdate,
}: {
  draft:    DraftJob;
  onToggle: () => void;
  onUpdate: (patch: Partial<ImportedJob>) => void;
}) {
  const job = draft;

  const JOB_TYPES = [
    'Service Call','PM','Preventive Maintenance','Emergency','Installation',
    'Follow-up','Startup','Warranty','Inspection','Return Visit','Vendor Meet',
  ];

  return (
    <div className={`rounded-2xl border transition-colors ${draft.selected ? 'bg-gray-900 border-gray-700' : 'bg-gray-950 border-gray-800 opacity-50'}`}>
      <div className="flex items-start gap-3 px-4 pt-3 pb-2">
        <button
          onClick={onToggle}
          className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors ${
            draft.selected ? 'bg-blue-600 border-blue-600' : 'bg-gray-800 border-gray-700'
          }`}
        >
          {draft.selected && <Check size={11} className="text-white" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-white text-sm truncate">{job.customer || 'Unknown Customer'}</div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
            <span className="text-[10px] text-gray-400">{job.jobType}</span>
            {(job.appointmentDate || job.appointmentTime) && (
              <span className="text-[10px] text-gray-400">
                📅 {job.appointmentDate} {job.appointmentTime}
              </span>
            )}
            {job.address && (
              <span className="text-[10px] text-gray-400 truncate max-w-[160px]">📍 {job.address}</span>
            )}
          </div>
          {job.complaint && (
            <div className="text-[10px] text-gray-500 mt-0.5 truncate">{job.complaint}</div>
          )}
        </div>
        <button
          onClick={() => onUpdate({ _editing: !draft.editing } as unknown as Partial<ImportedJob>)}
          className="text-[10px] text-blue-400 px-2 py-1 rounded-lg bg-blue-950/40 hover:bg-blue-950/60 flex-shrink-0"
        >
          {draft.editing ? 'Done' : 'Edit'}
        </button>
      </div>

      <AnimatePresence>
        {draft.editing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 space-y-2 border-t border-gray-800">
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-1">Customer</label>
                  <input className={INPUT} value={job.customer} onChange={e => onUpdate({ customer: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-1">Date</label>
                  <input type="date" className={INPUT} value={job.appointmentDate} onChange={e => onUpdate({ appointmentDate: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-1">Time</label>
                  <input className={INPUT} value={job.appointmentTime} onChange={e => onUpdate({ appointmentTime: e.target.value })} placeholder="8:00 AM" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-1">Location / Address</label>
                  <input className={INPUT} value={job.address} onChange={e => onUpdate({ address: e.target.value })} placeholder="City, address, or building" />
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-1">Job Type</label>
                  <select className={SEL} value={job.jobType} onChange={e => onUpdate({ jobType: e.target.value })}>
                    {JOB_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-1">Priority</label>
                  <select className={SEL} value={job.priority} onChange={e => onUpdate({ priority: e.target.value as ImportedJob['priority'] })}>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="pm">PM</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-1">Complaint / Task</label>
                  <input className={INPUT} value={job.complaint} onChange={e => onUpdate({ complaint: e.target.value })} placeholder="No cooling, PM survey…" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-1">Notes</label>
                  <textarea
                    className={`${INPUT} resize-none`}
                    rows={2}
                    value={job.notes}
                    onChange={e => onUpdate({ notes: e.target.value })}
                    placeholder="Call before arrival, badge required…"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ReviewScreen({
  jobs, onBack, onSaved,
}: {
  jobs:    ImportedJob[];
  onBack:  () => void;
  onSaved: Props['onSaved'];
}) {
  const [drafts, setDrafts] = useState<DraftJob[]>(() =>
    jobs.map(j => ({ ...j, selected: true, editing: false }))
  );

  const toggle = (id: string) =>
    setDrafts(prev => prev.map(d => d.id === id ? { ...d, selected: !d.selected } : d));

  const update = (id: string, patch: Partial<ImportedJob & { _editing?: boolean }>) =>
    setDrafts(prev => prev.map(d => {
      if (d.id !== id) return d;
      if ('_editing' in patch) return { ...d, editing: patch._editing! };
      return { ...d, ...patch };
    }));

  const selectedCount = drafts.filter(d => d.selected).length;

  function handleSave() {
    const accepted = drafts.filter(d => d.selected).map(d => {
      const { selected: _s, editing: _e, ...job } = d;
      return job;
    });
    persistJobs(accepted, onSaved);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-4 border-b border-gray-800 flex items-center gap-3 flex-shrink-0">
        <button onClick={onBack} className="w-8 h-8 rounded-xl bg-gray-800 flex items-center justify-center text-gray-400 active:bg-gray-700">
          <ArrowLeft size={16} />
        </button>
        <div>
          <div className="font-bold text-white text-sm">Review Jobs</div>
          <div className="text-[10px] text-gray-500">{drafts.length} extracted — tap to toggle, Edit to refine</div>
        </div>
        <div className="ml-auto text-[10px] text-gray-500">{selectedCount} selected</div>
      </div>

      {drafts.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
          <AlertTriangle size={32} className="text-yellow-500" />
          <div className="text-white font-bold">No jobs found</div>
          <div className="text-sm text-gray-400">Try a different import method or add jobs manually.</div>
          <button onClick={onBack} className="mt-2 px-4 py-2 rounded-xl bg-gray-800 text-gray-300 text-sm">Go Back</button>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {drafts.map(draft => (
              <JobReviewCard
                key={draft.id}
                draft={draft}
                onToggle={() => toggle(draft.id)}
                onUpdate={patch => update(draft.id, patch as Partial<ImportedJob & { _editing?: boolean }>)}
              />
            ))}
          </div>

          <div className="px-4 pb-8 pt-2 border-t border-gray-800 space-y-2">
            <button
              onClick={handleSave}
              disabled={selectedCount === 0}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-4 rounded-2xl text-sm active:scale-[0.98] transition-transform disabled:opacity-40 disabled:pointer-events-none"
            >
              <CheckCircle size={16} />
              Add {selectedCount} Job{selectedCount !== 1 ? 's' : ''} to Schedule
            </button>
            <button onClick={onBack} className="w-full text-center text-xs text-gray-600 py-1">Go Back</button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Paste Screen ─────────────────────────────────────────────────────────────

function PasteScreen({ userId, onBack, onParsed }: { userId: string; onBack: () => void; onParsed: (jobs: ImportedJob[]) => void }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleParse() {
    if (!text.trim()) { setError('Paste your schedule first.'); return; }
    setError(null);
    setLoading(true);
    const jobs = await aiParseText(text, userId, 'paste');
    setLoading(false);
    if (jobs.length === 0) {
      setError("Couldn't extract any jobs. Check the pasted text and try again.");
      return;
    }
    onParsed(jobs);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-4 border-b border-gray-800 flex items-center gap-3 flex-shrink-0">
        <button onClick={onBack} className="w-8 h-8 rounded-xl bg-gray-800 flex items-center justify-center text-gray-400 active:bg-gray-700">
          <ArrowLeft size={16} />
        </button>
        <div>
          <div className="font-bold text-white text-sm">Paste Schedule</div>
          <div className="text-[10px] text-gray-500">Paste your dispatch list, texts, or notes</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <textarea
          className="w-full h-56 bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 resize-none transition-colors"
          placeholder={"Paste your schedule here.\n\nExamples:\n• \"8:00 AM - Acme Corp - No cooling\"\n• \"2606-37730; Lowes; serv; 7:00 AM; Lincoln\"\n• ServiceTitan export, text messages, etc."}
          value={text}
          onChange={e => setText(e.target.value)}
          autoFocus
        />
        <div className="mt-2 text-[10px] text-gray-600">
          Works with plain text, dispatcher notes, forwarded messages, or ServiceTitan/FieldEdge copy-paste.
        </div>
        {error && (
          <div className="mt-3 rounded-xl bg-red-950/30 border border-red-800/50 px-3 py-2 text-xs text-red-400">
            {error}
          </div>
        )}
      </div>

      <div className="px-4 pb-8 pt-2 border-t border-gray-800">
        <button
          onClick={handleParse}
          disabled={loading || !text.trim()}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-4 rounded-2xl text-sm active:scale-[0.98] transition-all disabled:opacity-40 disabled:pointer-events-none"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
          {loading ? 'Extracting Jobs…' : 'Extract Jobs'}
        </button>
      </div>
    </div>
  );
}

// ─── Scan Screen ─────────────────────────────────────────────────────────────

function ScanScreen({ userId, onBack, onParsed }: { userId: string; onBack: () => void; onParsed: (jobs: ImportedJob[]) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<'pick' | 'ocr' | 'text' | 'parsing'>('pick');
  const [extractedText, setExtractedText] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setPhase('ocr');
    try {
      const formData = new FormData();
      formData.append('image', file);
      if (userId) formData.append('clientId', userId);

      const res = await fetch('/api/nameplate/ocr', { method: 'POST', body: formData });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { rawText?: string; text?: string };
      const raw = data.rawText || data.text || '';
      setExtractedText(raw.trim());
      setPhase('text');
    } catch {
      setError('OCR failed. Please edit the text manually or try a clearer image.');
      setPhase('text');
    }
  }

  async function handleParse() {
    if (!extractedText.trim()) { setError('No text to parse. Edit the box above.'); return; }
    setError(null);
    setPhase('parsing');
    const jobs = await aiParseText(extractedText, userId, 'scan_ocr');
    if (jobs.length === 0) {
      setError("Couldn't extract jobs. Try editing the text or use Paste instead.");
      setPhase('text');
      return;
    }
    onParsed(jobs);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-4 border-b border-gray-800 flex items-center gap-3 flex-shrink-0">
        <button onClick={onBack} disabled={phase === 'ocr' || phase === 'parsing'} className="w-8 h-8 rounded-xl bg-gray-800 flex items-center justify-center text-gray-400 active:bg-gray-700 disabled:opacity-40">
          <ArrowLeft size={16} />
        </button>
        <div>
          <div className="font-bold text-white text-sm">Scan Screenshot</div>
          <div className="text-[10px] text-gray-500">
            {phase === 'pick' && 'Upload or take a photo of your schedule'}
            {phase === 'ocr' && 'Reading image…'}
            {phase === 'text' && 'Review and edit extracted text'}
            {phase === 'parsing' && 'Extracting jobs…'}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {(phase === 'pick') && (
          <div className="flex flex-col items-center gap-4 pt-8">
            <div className="w-20 h-20 rounded-2xl bg-green-900/30 border border-green-800 flex items-center justify-center">
              <Camera size={32} className="text-green-400" />
            </div>
            <div className="text-center">
              <div className="text-white font-bold text-sm">Scan a Schedule</div>
              <div className="text-xs text-gray-400 mt-1">Photo your whiteboard, screenshot your dispatcher app, or snap a printed work order.</div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFile}
            />
            <div className="w-full space-y-2 mt-2">
              <button
                onClick={() => {
                  if (fileRef.current) {
                    fileRef.current.setAttribute('capture', 'environment');
                    fileRef.current.click();
                  }
                }}
                className="w-full flex items-center justify-center gap-2 bg-green-700 text-white font-bold py-4 rounded-2xl text-sm active:scale-[0.98] transition-transform"
              >
                <Camera size={16} /> Take Photo
              </button>
              <button
                onClick={() => {
                  if (fileRef.current) {
                    fileRef.current.removeAttribute('capture');
                    fileRef.current.click();
                  }
                }}
                className="w-full flex items-center justify-center gap-2 bg-gray-800 text-gray-200 font-bold py-3 rounded-2xl text-sm active:scale-[0.98] transition-transform"
              >
                <Upload size={16} /> Upload Screenshot
              </button>
            </div>
          </div>
        )}

        {phase === 'ocr' && (
          <div className="flex flex-col items-center justify-center gap-3 pt-16">
            <Loader2 size={36} className="text-green-400 animate-spin" />
            <div className="text-white font-bold text-sm">Reading image…</div>
            <div className="text-xs text-gray-400">OCR is scanning for schedule text</div>
          </div>
        )}

        {(phase === 'text' || phase === 'parsing') && (
          <div>
            <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-2">Extracted Text — edit if needed</label>
            <textarea
              className="w-full h-48 bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-500 resize-none transition-colors"
              value={extractedText}
              onChange={e => setExtractedText(e.target.value)}
              placeholder="No text extracted. Try typing your schedule manually here…"
              disabled={phase === 'parsing'}
            />
            <div className="mt-2 text-[10px] text-gray-600">
              Fix any OCR errors above, then tap Extract Jobs.
            </div>
            {error && (
              <div className="mt-3 rounded-xl bg-red-950/30 border border-red-800/50 px-3 py-2 text-xs text-red-400">{error}</div>
            )}
          </div>
        )}

        {phase === 'parsing' && (
          <div className="flex items-center gap-2 mt-3 text-xs text-green-400">
            <Loader2 size={14} className="animate-spin" /> Extracting jobs from text…
          </div>
        )}
      </div>

      {(phase === 'text' || phase === 'parsing') && (
        <div className="px-4 pb-8 pt-2 border-t border-gray-800 space-y-2">
          <button
            onClick={handleParse}
            disabled={phase === 'parsing' || !extractedText.trim()}
            className="w-full flex items-center justify-center gap-2 bg-green-700 text-white font-bold py-4 rounded-2xl text-sm active:scale-[0.98] transition-all disabled:opacity-40 disabled:pointer-events-none"
          >
            {phase === 'parsing' ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
            {phase === 'parsing' ? 'Extracting…' : 'Extract Jobs'}
          </button>
          <button
            onClick={() => setPhase('pick')}
            disabled={phase === 'parsing'}
            className="w-full text-center text-xs text-gray-600 py-1"
          >
            Scan a different image
          </button>
        </div>
      )}
    </div>
  );
}

// ─── ICS Screen ──────────────────────────────────────────────────────────────

function ICSScreen({ onBack, onParsed }: { onBack: () => void; onParsed: (jobs: ImportedJob[]) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const jobs = parseICS(text);
        setLoading(false);
        if (jobs.length === 0) {
          setError('No calendar events found in this file. Make sure it is a valid .ics file.');
          return;
        }
        onParsed(jobs);
      } catch {
        setLoading(false);
        setError('Could not read this file. Make sure it is a valid .ics calendar file.');
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-4 border-b border-gray-800 flex items-center gap-3 flex-shrink-0">
        <button onClick={onBack} className="w-8 h-8 rounded-xl bg-gray-800 flex items-center justify-center text-gray-400 active:bg-gray-700">
          <ArrowLeft size={16} />
        </button>
        <div>
          <div className="font-bold text-white text-sm">.ics to Schedule</div>
          <div className="text-[10px] text-gray-500">Upload a calendar export file</div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center gap-4 px-4 pt-10">
        <div className="w-20 h-20 rounded-2xl bg-orange-900/30 border border-orange-800 flex items-center justify-center">
          <Calendar size={32} className="text-orange-400" />
        </div>
        <div className="text-center">
          <div className="text-white font-bold text-sm">.ics Calendar File</div>
          <div className="text-xs text-gray-400 mt-1 leading-relaxed">
            Export your calendar from Google Calendar, Outlook, Apple Calendar, or any other app, then upload the .ics file here.
          </div>
        </div>

        <div className="w-full rounded-2xl bg-gray-800/50 border border-gray-700 p-4 text-xs text-gray-400 space-y-1">
          <div className="font-bold text-gray-300 text-[11px] mb-2">How to export a .ics file</div>
          <div>• <span className="text-white">Google Calendar</span> → Settings → Import &amp; Export → Export</div>
          <div>• <span className="text-white">Outlook</span> → File → Open &amp; Export → Import/Export → Export to file</div>
          <div>• <span className="text-white">Apple Calendar</span> → File → Export → Export…</div>
        </div>

        {error && (
          <div className="w-full rounded-xl bg-red-950/30 border border-red-800/50 px-3 py-2 text-xs text-red-400">{error}</div>
        )}
      </div>

      <div className="px-4 pb-8 pt-2 border-t border-gray-800">
        <input ref={fileRef} type="file" accept=".ics,text/calendar" className="hidden" onChange={handleFile} />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-orange-700 text-white font-bold py-4 rounded-2xl text-sm active:scale-[0.98] transition-all disabled:opacity-40"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {loading ? 'Reading file…' : 'Choose .ics File'}
        </button>
      </div>
    </div>
  );
}

// ─── Calendar Permission Screen ───────────────────────────────────────────────

function CalendarScreen({ onBack }: { onBack: () => void }) {
  const hasCalendarAPI = typeof window !== 'undefined' && 'calendar' in navigator;

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-4 border-b border-gray-800 flex items-center gap-3 flex-shrink-0">
        <button onClick={onBack} className="w-8 h-8 rounded-xl bg-gray-800 flex items-center justify-center text-gray-400 active:bg-gray-700">
          <ArrowLeft size={16} />
        </button>
        <div>
          <div className="font-bold text-white text-sm">Phone Calendar</div>
          <div className="text-[10px] text-gray-500">Import directly from your device</div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center gap-4 px-4 pt-10 text-center">
        <div className="w-20 h-20 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center">
          <Smartphone size={32} className="text-gray-400" />
        </div>

        {hasCalendarAPI ? (
          <>
            <div className="text-white font-bold text-sm">Calendar Access</div>
            <div className="text-xs text-gray-400">Your browser supports device calendar access.</div>
            <div className="w-full rounded-2xl bg-yellow-900/20 border border-yellow-800/50 p-4 text-xs text-yellow-300 text-left">
              This feature is in early stages. Tap the button below to request permission. If nothing happens, use .ics upload instead.
            </div>
            <button
              onClick={() => {
                alert('Device calendar access is not yet fully supported in this browser. Please use the .ics upload option instead.');
              }}
              className="w-full flex items-center justify-center gap-2 bg-gray-700 text-white font-bold py-4 rounded-2xl text-sm active:scale-[0.98] transition-transform"
            >
              <Smartphone size={16} /> Request Calendar Permission
            </button>
          </>
        ) : (
          <>
            <div className="text-white font-bold text-sm">Not Supported in This Browser</div>
            <div className="text-xs text-gray-400 leading-relaxed max-w-xs">
              Direct phone calendar access is not supported in this browser or operating system.
            </div>
            <div className="w-full rounded-2xl bg-gray-800 border border-gray-700 p-4 space-y-3 text-left">
              <div className="text-[11px] font-bold text-gray-300">Use these instead:</div>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-md bg-orange-900/40 border border-orange-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Calendar size={10} className="text-orange-400" />
                  </div>
                  <div>
                    <div className="text-xs text-white font-bold">.ics Upload</div>
                    <div className="text-[10px] text-gray-500">Export from Google, Outlook, or Apple Calendar and upload the file</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-md bg-green-900/40 border border-green-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Camera size={10} className="text-green-400" />
                  </div>
                  <div>
                    <div className="text-xs text-white font-bold">Scan Screenshot</div>
                    <div className="text-[10px] text-gray-500">Screenshot your calendar app and scan it here</div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="px-4 pb-8 pt-2 border-t border-gray-800">
        <button onClick={onBack} className="w-full text-center text-xs text-gray-600 py-1">Go Back</button>
      </div>
    </div>
  );
}

// ─── Menu Screen ─────────────────────────────────────────────────────────────

interface MethodCard {
  id:       Screen;
  icon:     React.ReactNode;
  label:    string;
  sublabel: string;
  color:    string;
  badge?:   string;
}

const METHODS: MethodCard[] = [
  {
    id: 'voice',
    icon: <Mic size={22} />,
    label: 'Talk to Schedule',
    sublabel: 'Speak or type your day — AI extracts the jobs',
    color: 'bg-violet-900/40 border-violet-800 text-violet-400',
  },
  {
    id: 'paste',
    icon: <FileText size={22} />,
    label: 'Paste Schedule',
    sublabel: 'Paste dispatch notes, texts, or copy from any app',
    color: 'bg-blue-900/30 border-blue-800 text-blue-400',
  },
  {
    id: 'scan',
    icon: <Camera size={22} />,
    label: 'Scan Screenshot',
    sublabel: 'Photo or screenshot of whiteboard, app, or work order',
    color: 'bg-green-900/30 border-green-800 text-green-400',
  },
  {
    id: 'ics',
    icon: <Calendar size={22} />,
    label: '.ics to Schedule',
    sublabel: 'Upload a calendar export from Google, Outlook, or Apple',
    color: 'bg-orange-900/30 border-orange-800 text-orange-400',
  },
  {
    id: 'calendar',
    icon: <Smartphone size={22} />,
    label: 'Phone Calendar',
    sublabel: 'Import direct from device calendar (where supported)',
    color: 'bg-gray-800 border-gray-700 text-gray-400',
    badge: 'Limited',
  },
];

function MenuScreen({ onSelect, onClose }: { onSelect: (s: Screen) => void; onClose: () => void }) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-5 pb-4 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-lg font-bold text-white">Import Schedule</div>
            <div className="text-[11px] text-gray-400 mt-0.5">Choose how you want to add today's work.</div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-gray-800 flex items-center justify-center text-gray-400 active:bg-gray-700">
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-2">
        {METHODS.map(method => (
          <button
            key={method.id}
            onClick={() => onSelect(method.id)}
            className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl border active:scale-[0.98] transition-transform ${method.color}`}
          >
            <div className="flex-shrink-0">{method.icon}</div>
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">{method.label}</span>
                {method.badge && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-700 text-gray-400 font-bold uppercase tracking-wider">
                    {method.badge}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5 leading-snug">{method.sublabel}</div>
            </div>
            <ChevronDown size={14} className="text-gray-600 rotate-[-90deg] flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export function ScheduleImportModal({ userId, onSaved, onClose }: Props) {
  const [screen, setScreen]   = useState<Screen>('menu');
  const [reviewJobs, setReviewJobs] = useState<ImportedJob[]>([]);

  const goToReview = useCallback((jobs: ImportedJob[]) => {
    setReviewJobs(jobs);
    setScreen('review');
  }, []);

  const handleVoiceParsed = useCallback((jobs: ImportedJob[]) => {
    persistJobs(jobs, onSaved);
  }, [onSaved]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1,  y: 0  }}
      exit={{    opacity: 0,  y: 24 }}
      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      className="fixed inset-0 z-50 bg-gray-950 flex flex-col"
    >
      <AnimatePresence mode="wait">
        {screen === 'menu' && (
          <motion.div key="menu" className="flex flex-col h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <MenuScreen onSelect={setScreen} onClose={onClose} />
          </motion.div>
        )}

        {screen === 'voice' && (
          <motion.div key="voice" className="flex flex-col h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ScheduleConversationModal
              userId={userId}
              onParsed={handleVoiceParsed}
              onBack={() => setScreen('menu')}
            />
          </motion.div>
        )}

        {screen === 'paste' && (
          <motion.div key="paste" className="flex flex-col h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <PasteScreen userId={userId} onBack={() => setScreen('menu')} onParsed={goToReview} />
          </motion.div>
        )}

        {screen === 'scan' && (
          <motion.div key="scan" className="flex flex-col h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ScanScreen userId={userId} onBack={() => setScreen('menu')} onParsed={goToReview} />
          </motion.div>
        )}

        {screen === 'ics' && (
          <motion.div key="ics" className="flex flex-col h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ICSScreen onBack={() => setScreen('menu')} onParsed={goToReview} />
          </motion.div>
        )}

        {screen === 'calendar' && (
          <motion.div key="calendar" className="flex flex-col h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <CalendarScreen onBack={() => setScreen('menu')} />
          </motion.div>
        )}

        {screen === 'review' && (
          <motion.div key="review" className="flex flex-col h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ReviewScreen
              jobs={reviewJobs}
              onBack={() => setScreen('menu')}
              onSaved={onSaved}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
