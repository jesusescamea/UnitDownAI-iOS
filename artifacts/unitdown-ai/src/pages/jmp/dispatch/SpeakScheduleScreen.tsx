/**
 * SpeakScheduleScreen — Speak your daily schedule, AI extracts the jobs.
 *
 * Phases:
 *   idle        → mic button + paste fallback
 *   recording   → live transcript, stop button
 *   transcribed → transcript shown, "Extract Jobs" button
 *   parsing     → loading spinner
 *   review      → draft job cards (edit / accept / delete)
 *
 * On accept → calls onParsed(jobs) → DispatchInboxModal adds to inbox.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, MicOff, Loader2, CheckCircle, Trash2, Edit2,
  ChevronDown, ChevronUp, RotateCcw, ClipboardList, WifiOff, Zap,
} from 'lucide-react';
import type { ImportedJob } from './types';
import { parsePastedText } from './parsers';

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = 'idle' | 'recording' | 'transcribed' | 'parsing' | 'review';

interface DraftJob extends ImportedJob {
  expanded: boolean;
  selected: boolean;
}

interface Props {
  onParsed: (jobs: ImportedJob[]) => void;
  onBack:   () => void;
  onSelectPaste:  () => void;
  onSelectManual: () => void;
  clientId?: string;
}

function getSpeechRecognition() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

/**
 * Collapse immediately-repeated words / short phrases produced by the
 * Web Speech API when continuous mode is used without interimResults:false.
 * Runs multiple passes to catch cascades ("a a a" → "a" in two passes).
 * Safe on HVAC schedule text — genuine repetitions are extremely rare.
 */
function cleanTranscript(raw: string): string {
  let s = raw.replace(/\s+/g, ' ').trim();
  for (let pass = 0; pass < 3; pass++) {
    // 1-word repeats: "there's there's" → "there's"
    s = s.replace(/\b(\w+)\s+\1\b/gi, '$1');
    // 2-word repeats: "service call service call" → "service call"
    s = s.replace(/\b(\w+ \w+)\s+\1\b/gi, '$1');
    // 3-word repeats: "a service call a service call" → "a service call"
    s = s.replace(/\b(\w+ \w+ \w+)\s+\1\b/gi, '$1');
    // 4-word repeats
    s = s.replace(/\b(\w+ \w+ \w+ \w+)\s+\1\b/gi, '$1');
    s = s.replace(/\s{2,}/g, ' ').trim();
  }
  return s;
}

// ─── Priority badge ───────────────────────────────────────────────────────────

const PRIORITY_CLS: Record<string, string> = {
  emergency: 'bg-red-900/40 text-red-300 border-red-800',
  high:      'bg-amber-900/40 text-amber-300 border-amber-800',
  normal:    'bg-blue-900/40 text-blue-300 border-blue-800',
  pm:        'bg-gray-800 text-gray-300 border-gray-700',
};

// ─── Inline edit form for a draft job ────────────────────────────────────────

function JobEditForm({ job, onChange }: { job: DraftJob; onChange: (updated: DraftJob) => void }) {
  const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors';

  function set<K extends keyof DraftJob>(k: K, v: DraftJob[K]) {
    onChange({ ...job, [k]: v });
  }

  return (
    <div className="space-y-2.5 mt-3 border-t border-gray-800 pt-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-1">Customer</label>
          <input className={inputCls} value={job.customer} onChange={e => set('customer', e.target.value)} placeholder="Customer name" />
        </div>
        <div>
          <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-1">Job #</label>
          <input className={inputCls} value={job.jobNumber} onChange={e => set('jobNumber', e.target.value)} placeholder="2606-37730" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-1">Date</label>
          <input type="date" className={inputCls} value={job.appointmentDate} onChange={e => set('appointmentDate', e.target.value)} />
        </div>
        <div>
          <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-1">Time</label>
          <input className={inputCls} value={job.appointmentTime} onChange={e => set('appointmentTime', e.target.value)} placeholder="7:00 AM" />
        </div>
      </div>
      <div>
        <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-1">Location</label>
        <input className={inputCls} value={job.address} onChange={e => set('address', e.target.value)} placeholder="City or address" />
      </div>
      <div>
        <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-1">Task / Complaint</label>
        <input className={inputCls} value={job.complaint} onChange={e => set('complaint', e.target.value)} placeholder="What needs to be done" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-1">Job Type</label>
          <select className={inputCls} value={job.jobType} onChange={e => set('jobType', e.target.value)}>
            <option>Service Call</option>
            <option>PM</option>
            <option>Maintenance</option>
            <option>Warranty</option>
            <option>Return Visit</option>
            <option>Vendor Meet</option>
            <option>Emergency</option>
            <option>Inspection</option>
          </select>
        </div>
        <div>
          <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-1">Priority</label>
          <select className={inputCls} value={job.priority} onChange={e => set('priority', e.target.value as DraftJob['priority'])}>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="emergency">Emergency</option>
            <option value="pm">PM</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-1">Phone / POC</label>
        <input className={inputCls} value={job.phone} onChange={e => set('phone', e.target.value)} placeholder="510-472-1230" />
      </div>
      <div>
        <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-1">Notes</label>
        <textarea className={`${inputCls} resize-none`} rows={2} value={job.notes} onChange={e => set('notes', e.target.value)} placeholder="Additional notes" />
      </div>
    </div>
  );
}

// ─── Draft job card ───────────────────────────────────────────────────────────

function DraftJobCard({
  job, index, onChange, onRemove,
}: {
  job:      DraftJob;
  index:    number;
  onChange: (j: DraftJob) => void;
  onRemove: () => void;
}) {
  const priCls  = PRIORITY_CLS[job.priority] ?? PRIORITY_CLS.normal;
  const timeStr = job.timeWindow || job.appointmentTime || '—';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`rounded-2xl border transition-all ${
        job.selected
          ? 'bg-gray-900 border-blue-700/60'
          : 'bg-gray-900 border-gray-800 opacity-60'
      }`}
    >
      {/* Card header row */}
      <div className="px-4 pt-3.5 pb-2 flex items-start gap-3">
        {/* Select checkbox */}
        <button
          onClick={() => onChange({ ...job, selected: !job.selected })}
          className={`flex-shrink-0 w-5 h-5 rounded-full border-2 mt-0.5 transition-colors flex items-center justify-center ${
            job.selected ? 'border-blue-500 bg-blue-500' : 'border-gray-600 bg-transparent'
          }`}
          aria-label={job.selected ? 'Deselect' : 'Select'}
        >
          {job.selected && <CheckCircle size={12} className="text-white" />}
        </button>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[9px] font-bold text-gray-600">#{index + 1}</span>
            <span className="font-bold text-white text-sm leading-tight truncate">
              {job.customer || 'Unknown Customer'}
            </span>
            <span className={`text-[9px] font-bold border px-1.5 py-0.5 rounded-full ${priCls}`}>
              {job.priority === 'pm' ? 'PM' : job.priority.charAt(0).toUpperCase() + job.priority.slice(1)}
            </span>
          </div>
          {job.jobNumber && (
            <div className="text-[10px] font-mono text-gray-500 mt-0.5">{job.jobNumber}</div>
          )}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5">
            {timeStr !== '—' && (
              <span className="text-[10px] text-gray-400">{timeStr}</span>
            )}
            {job.appointmentDate && (
              <span className="text-[10px] text-gray-500">{job.appointmentDate}</span>
            )}
            {job.address && (
              <span className="text-[10px] text-gray-500 truncate max-w-[120px]">{job.address}</span>
            )}
          </div>
          {job.complaint && (
            <div className="text-[10px] text-gray-400 mt-1 line-clamp-1">{job.complaint}</div>
          )}
          {job.phone && (
            <div className="text-[10px] text-blue-400 mt-0.5">{job.phone}</div>
          )}
          {((job.partsNeeded?.length ?? 0) + (job.toolsNeeded?.length ?? 0)) > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {[...(job.partsNeeded ?? []), ...(job.toolsNeeded ?? [])].slice(0, 4).map((p, i) => (
                <span key={i} className="text-[9px] font-semibold bg-amber-900/40 text-amber-300 border border-amber-800/50 px-1.5 py-0.5 rounded-full">
                  Bring: {p}
                </span>
              ))}
              {(job.partsNeeded?.length ?? 0) + (job.toolsNeeded?.length ?? 0) > 4 && (
                <span className="text-[9px] text-gray-500">+more</span>
              )}
            </div>
          )}
          {(job.reminders?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {(job.reminders ?? []).slice(0, 2).map((r, i) => (
                <span key={i} className="text-[9px] font-semibold bg-blue-900/40 text-blue-300 border border-blue-800/50 px-1.5 py-0.5 rounded-full">
                  {r}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onChange({ ...job, expanded: !job.expanded })}
            className="w-7 h-7 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400 active:bg-gray-700"
            aria-label="Edit"
          >
            <Edit2 size={12} />
          </button>
          <button
            onClick={onRemove}
            className="w-7 h-7 rounded-lg bg-gray-800 flex items-center justify-center text-gray-500 active:bg-gray-700"
            aria-label="Delete"
          >
            <Trash2 size={12} />
          </button>
          <button
            onClick={() => onChange({ ...job, expanded: !job.expanded })}
            className="w-7 h-7 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400 active:bg-gray-700"
            aria-label={job.expanded ? 'Collapse' : 'Expand'}
          >
            {job.expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
      </div>

      {/* Expandable edit form */}
      {job.expanded && (
        <div className="px-4 pb-4">
          <JobEditForm job={job} onChange={onChange} />
        </div>
      )}
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SpeakScheduleScreen({
  onParsed, onBack, onSelectPaste, onSelectManual, clientId,
}: Props) {
  const SpeechRec = getSpeechRecognition();
  const speechSupported = !!SpeechRec;

  const [phase, setPhase]         = useState<Phase>('idle');
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [draftJobs, setDraftJobs] = useState<DraftJob[]>([]);
  const [error, setError]         = useState<string | null>(null);
  const [isOnline, setIsOnline]   = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [recordSecs, setRecordSecs] = useState(0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef   = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const up   = () => setIsOnline(true);
    const down = () => setIsOnline(false);
    window.addEventListener('online',  up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);

  // ── Recording timer ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase === 'recording') {
      setRecordSecs(0);
      timerRef.current = setInterval(() => setRecordSecs(s => s + 1), 1000);
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  // ── Unmount cleanup — stop any live recognizer when the component unmounts ───
  useEffect(() => {
    return () => {
      if (recRef.current) {
        try { recRef.current.stop(); } catch { /* ignore */ }
        recRef.current = null;
      }
    };
  }, []);

  // ── Start recording ──────────────────────────────────────────────────────────
  const startRecording = useCallback(() => {
    if (!SpeechRec) return;

    // Guard: never spawn a second recognizer on top of a live one.
    // On mobile a double-tap can call this twice before React re-renders.
    if (recRef.current) return;

    setError(null);
    setTranscript('');
    setInterimText('');

    const rec = new SpeechRec();
    rec.continuous      = true;
    rec.interimResults  = true;
    rec.lang            = 'en-US';

    let finalAccum = '';

    // Track which result indices we have already accumulated as final.
    //
    // WHY: Chrome's Web Speech API (continuous mode) re-emits previously
    // finalized results in later onresult events — sometimes with the same
    // resultIndex. Starting the loop from e.resultIndex is necessary but not
    // sufficient: Chrome can fire a new event where resultIndex still points
    // back to an already-finalized slot, causing each phrase to accumulate
    // again and producing output like "I have 1:00 p.m. I have 1:00 p.m. ..."
    //
    // The Set approach is the definitive fix: once index i is accumulated as
    // final, it is never accumulated again regardless of future events.
    const finalizedIndices = new Set<number>();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      let interim = '';
      // Start from e.resultIndex so we skip old slots that are already
      // accounted for in the cumulative e.results list — but the Set
      // provides the real guard against double-accumulation.
      for (let i = (e.resultIndex as number); i < e.results.length; i++) {
        const result = e.results[i];
        if (!result) continue;
        const isFinal: boolean = result.isFinal;
        const text: string     = result[0]?.transcript ?? '';
        if (isFinal) {
          if (!finalizedIndices.has(i)) {
            finalizedIndices.add(i);
            finalAccum = cleanTranscript(
              finalAccum + (finalAccum ? ' ' : '') + text,
            );
          }
        } else {
          interim = text;
        }
      }
      setTranscript(finalAccum);
      setInterimText(interim);
    };

    rec.onerror = (e: { error: string }) => {
      if (e.error === 'not-allowed') {
        setError('Microphone access was denied. Please allow mic access and try again.');
      } else if (e.error === 'no-speech') {
        setError('No speech detected. Try speaking closer to the microphone.');
      } else if (e.error !== 'aborted') {
        setError('Voice recording stopped unexpectedly. Your transcript is ready below.');
      }
      stopRecording();
    };

    rec.onend = () => {
      // Null the ref first so stopRecording's guard doesn't double-stop.
      recRef.current = null;
      const cleaned = cleanTranscript(finalAccum);
      setTranscript(t => t || cleaned);
      setPhase(prev => prev === 'recording' ? 'transcribed' : prev);
    };

    recRef.current = rec;
    rec.start();
    setPhase('recording');
  }, [SpeechRec]);

  const stopRecording = useCallback(() => {
    if (!recRef.current) return;
    recRef.current.stop();   // triggers onend asynchronously; onend nulls the ref
    setPhase('transcribed');
  }, []);

  // ── Parse transcript ─────────────────────────────────────────────────────────
  const parseTranscript = useCallback(async (text: string) => {
    if (!text.trim()) { setError('Please record or paste your schedule first.'); return; }
    setError(null);
    setPhase('parsing');

    // Offline fallback: use client-side regex parser
    if (!isOnline || !clientId) {
      const regexJobs = parsePastedText(text);
      if (regexJobs.length > 0) {
        const drafts: DraftJob[] = regexJobs.map((j, i) => ({
          ...j,
          id:       j.id || `voice_${Date.now()}_${i}`,
          source:   'voice' as const,
          expanded: false,
          selected: true,
        }));
        setDraftJobs(drafts);
        setPhase('review');
      } else {
        setError('Could not extract jobs. Try pasting your schedule instead.');
        setPhase('transcribed');
      }
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch('/api/speak-schedule/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, transcript: text.trim(), today }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = (await res.json()) as { jobs?: ImportedJob[]; error?: string };

      if (!data.jobs?.length) {
        // Fallback to client-side parser
        const regexJobs = parsePastedText(text);
        if (regexJobs.length > 0) {
          const drafts: DraftJob[] = regexJobs.map((j, i) => ({
            ...j,
            id:       j.id || `voice_${Date.now()}_${i}`,
            source:   'voice' as const,
            expanded: false,
            selected: true,
          }));
          setDraftJobs(drafts);
          setPhase('review');
          return;
        }
        setError("Couldn't extract jobs from your schedule. Edit your transcript and try again, or add jobs manually.");
        setPhase('transcribed');
        return;
      }

      const drafts: DraftJob[] = data.jobs.map(j => ({ ...j, expanded: false, selected: true }));
      setDraftJobs(drafts);
      setPhase('review');
    } catch {
      // Network failure → try client-side
      const regexJobs = parsePastedText(text);
      if (regexJobs.length > 0) {
        const drafts: DraftJob[] = regexJobs.map((j, i) => ({
          ...j,
          id:       j.id || `voice_${Date.now()}_${i}`,
          source:   'voice' as const,
          expanded: false,
          selected: true,
        }));
        setDraftJobs(drafts);
        setPhase('review');
      } else {
        setError('Connection lost. Try pasting your schedule for offline parsing.');
        setPhase('transcribed');
      }
    }
  }, [clientId, isOnline]);

  // ── Accept selected jobs ─────────────────────────────────────────────────────
  function handleAcceptSelected() {
    const accepted = draftJobs
      .filter(j => j.selected)
      .map(({ expanded: _e, selected: _s, ...rest }) => rest as ImportedJob);
    if (accepted.length === 0) { setError('Select at least one job to import.'); return; }
    onParsed(accepted);
  }

  function updateJob(id: string, updated: DraftJob) {
    setDraftJobs(prev => prev.map(j => j.id === id ? updated : j));
  }

  function removeJob(id: string) {
    setDraftJobs(prev => prev.filter(j => j.id !== id));
  }

  const selectedCount = draftJobs.filter(j => j.selected).length;
  const fmtSecs = `${Math.floor(recordSecs / 60)}:${String(recordSecs % 60).padStart(2, '0')}`;

  // ─── Shared header ─────────────────────────────────────────────────────────
  function Header({ title, subtitle }: { title: string; subtitle?: string }) {
    return (
      <div className="px-4 py-4 border-b border-gray-800 flex items-center gap-3 flex-shrink-0">
        <button
          onClick={phase === 'review' ? () => setPhase('transcribed') : onBack}
          className="w-8 h-8 rounded-xl bg-gray-800 flex items-center justify-center flex-shrink-0"
        >
          <span className="text-gray-400 text-sm font-bold">←</span>
        </button>
        <div>
          <div className="font-bold text-white text-sm">{title}</div>
          {subtitle && <div className="text-[10px] text-gray-500">{subtitle}</div>}
        </div>
        {!isOnline && (
          <div className="ml-auto flex items-center gap-1 text-amber-400">
            <WifiOff size={12} />
            <span className="text-[9px] font-semibold">Offline</span>
          </div>
        )}
      </div>
    );
  }

  // ─── PHASE: review ────────────────────────────────────────────────────────
  if (phase === 'review') {
    return (
      <div className="flex flex-col h-full">
        <Header
          title={`Review Jobs (${draftJobs.length})`}
          subtitle="Check each job before adding to your schedule"
        />

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {/* Tips */}
          <div className="bg-blue-950/20 border border-blue-800/30 rounded-xl px-3 py-2">
            <p className="text-[10px] text-blue-300 leading-relaxed">
              Tap ✎ to edit any job. Uncheck jobs to skip them. Missing details can be added later.
            </p>
          </div>

          {/* Select all / none */}
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] text-gray-500">{selectedCount} of {draftJobs.length} selected</span>
            <div className="flex gap-3">
              <button
                onClick={() => setDraftJobs(prev => prev.map(j => ({ ...j, selected: true })))}
                className="text-[10px] font-semibold text-blue-400"
              >
                Select all
              </button>
              <button
                onClick={() => setDraftJobs(prev => prev.map(j => ({ ...j, selected: false })))}
                className="text-[10px] font-semibold text-gray-500"
              >
                None
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-red-950/30 border border-red-800/50 px-3 py-2 text-xs text-red-400">{error}</div>
          )}

          <AnimatePresence>
            {draftJobs.map((job, i) => (
              <DraftJobCard
                key={job.id}
                job={job}
                index={i}
                onChange={updated => updateJob(job.id, updated)}
                onRemove={() => removeJob(job.id)}
              />
            ))}
          </AnimatePresence>

          {draftJobs.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500">All jobs removed.</p>
              <button onClick={() => setPhase('transcribed')} className="text-xs text-blue-400 mt-2">
                ← Back to transcript
              </button>
            </div>
          )}

          {/* Re-record / paste fallbacks */}
          <div className="border-t border-gray-800 pt-3 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-600">Not what you expected?</p>
            <div className="flex gap-2">
              <button
                onClick={() => { setPhase('idle'); setTranscript(''); setDraftJobs([]); }}
                className="flex-1 flex items-center justify-center gap-2 bg-gray-900 border border-gray-700 rounded-xl py-2.5 text-xs font-semibold text-gray-300 active:bg-gray-800"
              >
                <RotateCcw size={12} />
                Re-record
              </button>
              <button
                onClick={onSelectPaste}
                className="flex-1 flex items-center justify-center gap-2 bg-gray-900 border border-gray-700 rounded-xl py-2.5 text-xs font-semibold text-gray-300 active:bg-gray-800"
              >
                <ClipboardList size={12} />
                Paste instead
              </button>
            </div>
          </div>
        </div>

        {/* Accept footer */}
        <div className="px-4 pb-8 pt-2 space-y-2 border-t border-gray-800">
          <button
            onClick={handleAcceptSelected}
            disabled={selectedCount === 0}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl text-sm transition-colors disabled:opacity-40 active:scale-[0.98]"
          >
            <CheckCircle size={16} />
            {selectedCount === draftJobs.length
              ? `Add All ${selectedCount} Jobs to Schedule`
              : `Add ${selectedCount} Selected Jobs`}
          </button>
          <button
            onClick={onSelectManual}
            className="w-full text-center text-xs text-gray-600 py-1"
          >
            Add a job manually instead
          </button>
        </div>
      </div>
    );
  }

  // ─── PHASE: parsing ───────────────────────────────────────────────────────
  if (phase === 'parsing') {
    return (
      <div className="flex flex-col h-full">
        <Header title="Extracting Jobs…" subtitle="AI is reading your schedule" />
        <div className="flex-1 flex flex-col items-center justify-center gap-5 px-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-950/40 border border-blue-800/40 flex items-center justify-center">
            <Loader2 size={28} className="text-blue-400 animate-spin" />
          </div>
          <div>
            <p className="text-white font-bold text-base">Reading your schedule</p>
            <p className="text-gray-500 text-sm mt-1">Extracting jobs, times, and locations…</p>
          </div>
        </div>
      </div>
    );
  }

  // ─── PHASE: idle / recording / transcribed ────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      <Header
        title="Talk Schedule"
        subtitle={
          phase === 'recording'
            ? `Recording ${fmtSecs} — speak each job clearly`
            : phase === 'transcribed'
            ? 'Review and extract jobs'
            : 'Tell me your schedule naturally'
        }
      />

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5">

        {/* Speech not supported warning */}
        {!speechSupported && (
          <div className="bg-amber-950/20 border border-amber-800/30 rounded-xl px-4 py-3">
            <p className="text-xs text-amber-300 font-semibold mb-1">Voice entry unavailable on this browser</p>
            <p className="text-[10px] text-gray-500 leading-relaxed">
              Voice schedule entry is unavailable on this device. Paste your schedule instead.
            </p>
          </div>
        )}

        {/* Recording / mic area */}
        {speechSupported && phase !== 'transcribed' && (
          <div className="flex flex-col items-center gap-4">
            {/* Big mic button */}
            <button
              onClick={phase === 'idle' ? startRecording : stopRecording}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg active:scale-95 ${
                phase === 'recording'
                  ? 'bg-red-600 animate-pulse shadow-red-500/40'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30'
              }`}
              aria-label={phase === 'recording' ? 'Stop recording' : 'Start recording'}
            >
              {phase === 'recording'
                ? <MicOff size={32} className="text-white" />
                : <Mic size={32} className="text-white" />}
            </button>

            {phase === 'recording' && (
              <p className="text-sm font-bold text-red-400">{fmtSecs} — Tap to stop</p>
            )}
            {phase === 'idle' && (
              <p className="text-sm text-gray-500">Tap the mic and speak your day</p>
            )}
          </div>
        )}

        {/* Live interim transcript bubble */}
        {phase === 'recording' && (transcript || interimText) && (
          <div className="bg-gray-900 border border-gray-700 rounded-2xl px-4 py-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-gray-600 mb-1.5">Live transcript</p>
            <p className="text-sm text-gray-200 leading-relaxed">
              {transcript}
              {interimText && <span className="text-gray-500 italic">{interimText}</span>}
            </p>
          </div>
        )}

        {/* Transcript area (idle = paste fallback, transcribed = editable) */}
        {(phase === 'idle' || phase === 'transcribed') && (
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">
              {phase === 'transcribed' ? 'Transcript — edit if needed' : 'Or paste your schedule'}
            </label>
            <textarea
              value={transcript}
              onChange={e => setTranscript(e.target.value)}
              rows={8}
              placeholder={
                `Example:\n"Tomorrow at 8 AM I have a PM at Survey in Redding. Bring Sealtite. Then at 11 AM I have a no-cool at ABC Manufacturing — compressor starts then trips. Bring nitrogen. Last job around 3 PM at Mercy Hospital. Trane RTU. Economizer not opening."`
              }
              className="w-full bg-gray-900 border border-gray-700 rounded-2xl px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-600 resize-none leading-relaxed transition-colors"
            />
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-950/30 border border-red-800/50 px-3 py-2.5 text-xs text-red-400 leading-snug">
            {error}
          </div>
        )}

        {/* Extract button — shown when there's text to parse */}
        {(phase === 'transcribed' || (phase === 'idle' && transcript.trim())) && (
          <button
            onClick={() => parseTranscript(transcript)}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl text-sm transition-colors active:scale-[0.98]"
          >
            <Zap size={16} />
            Extract Jobs from Schedule
          </button>
        )}

        {/* Fallback options */}
        <div className="space-y-2">
          {phase === 'idle' && (
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-600">Other options</p>
          )}
          {phase === 'transcribed' && (
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-600">Alternatives</p>
          )}
          <button
            onClick={onSelectPaste}
            className="w-full flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3 text-left active:bg-gray-800 transition-colors"
          >
            <div className="w-8 h-8 rounded-xl bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <ClipboardList size={15} className="text-blue-300" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Paste Schedule</div>
              <div className="text-[10px] text-gray-500">Copy and paste dispatch text or email</div>
            </div>
          </button>
          <button
            onClick={onSelectManual}
            className="w-full flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3 text-left active:bg-gray-800 transition-colors"
          >
            <div className="w-8 h-8 rounded-xl bg-green-900/30 flex items-center justify-center flex-shrink-0">
              <Edit2 size={15} className="text-green-300" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Manual Job</div>
              <div className="text-[10px] text-gray-500">Enter job details by hand</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
