/**
 * ScheduleConversationModal
 *
 * Replaces the old one-shot voice-dump SpeakScheduleScreen with a guided,
 * step-by-step conversational scheduler.  Each step records exactly ONE answer
 * (via useStepVoice with continuous=false) so the transcript can never
 * accumulate stale text from previous questions.
 *
 * Flow summary:
 *   INTENT → (schedule_job) → NEW_OR_EXISTING → customer → service → schedule → CONFIRM
 *   INTENT → (reminder)     → REMINDER_TEXT  → REMINDER_DATE → CONFIRM
 *   INTENT → (note)         → NOTE_TEXT → CONFIRM
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Mic, Square, RotateCcw, CheckCircle,
  Calendar, Clock, FileText, Bell, ChevronRight, Search, X,
} from 'lucide-react';
import type { ImportedJob } from '../dispatch/types';
import { useStepVoice }              from './useStepVoice';
import { useScheduleConversation }   from './useScheduleConversation';
import { SERVICE_TYPES, QUICK_TIMES, parseVoiceDate, parseVoiceTime, todayStr, tomorrowStr } from './constants';
import { STEP_LABEL }                from './types';
import type { ConversationData, CustomerMatch } from './types';

// ─── Shared styles ────────────────────────────────────────────────────────────

const INPUT  = 'w-full bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3.5 text-base text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors';
const BTN_LG = 'w-full flex items-center gap-4 bg-gray-900 border border-gray-800 rounded-2xl px-5 py-5 text-left active:bg-gray-800 active:scale-[0.98] transition-all';
const BTN_SM = 'flex-1 bg-gray-800 border border-gray-700 rounded-2xl px-3 py-3 text-sm text-white text-center active:bg-gray-700 transition-colors font-medium';

// ─── Fade-slide transition for steps ─────────────────────────────────────────

const stepVariants = {
  initial:  { opacity: 0, x: 24 },
  animate:  { opacity: 1, x: 0  },
  exit:     { opacity: 0, x: -24 },
};

// ─── Mic button ───────────────────────────────────────────────────────────────

function MicButton({
  status, onStart, onStop,
}: {
  status:  'idle' | 'listening' | 'done' | 'error' | 'unsupported';
  onStart: () => void;
  onStop:  () => void;
}) {
  const listening = status === 'listening';
  return (
    <button
      onPointerDown={e => { e.preventDefault(); listening ? onStop() : onStart(); }}
      disabled={status === 'unsupported'}
      className={[
        'w-20 h-20 rounded-full flex items-center justify-center mx-auto transition-all duration-200',
        listening
          ? 'bg-red-600 shadow-lg shadow-red-900/50 scale-110'
          : status === 'done'
          ? 'bg-green-700 shadow-lg shadow-green-900/50'
          : status === 'unsupported'
          ? 'bg-gray-800 opacity-40 cursor-not-allowed'
          : 'bg-blue-600 shadow-lg shadow-blue-900/50 active:scale-[0.95]',
      ].join(' ')}
      aria-label={listening ? 'Stop recording' : 'Start recording'}
    >
      {listening
        ? <Square size={28} className="text-white" />
        : <Mic    size={28} className="text-white" />}
    </button>
  );
}

// ─── Generic voice + text input step ─────────────────────────────────────────

function VoiceTextStep({
  question,
  placeholder,
  initialValue = '',
  multiline = false,
  transform,
  onNext,
  skipLabel,
  hint,
}: {
  question:     string;
  placeholder:  string;
  initialValue?: string;
  multiline?:   boolean;
  transform?:   (v: string) => string;
  onNext:       (value: string) => void;
  skipLabel?:   string;
  hint?:        string;
}) {
  const voice = useStepVoice();
  const [value, setValue] = useState(initialValue);

  // When voice finishes, populate the input (user can still edit it)
  useEffect(() => {
    if (voice.status === 'done' && voice.transcript) {
      const t = transform ? transform(voice.transcript) : voice.transcript;
      setValue(t);
    }
  }, [voice.status, voice.transcript]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNext = () => {
    const v = value.trim();
    onNext(v);
  };

  return (
    <div className="flex flex-col items-center px-5 pt-8 gap-6 w-full">
      <h2 className="text-xl font-bold text-white text-center leading-tight">{question}</h2>
      {hint && <p className="text-sm text-gray-500 text-center -mt-3">{hint}</p>}

      {/* Mic */}
      <div className="flex flex-col items-center gap-2">
        <MicButton status={voice.status} onStart={voice.start} onStop={voice.stop} />
        <span className="text-xs text-gray-500">
          {voice.status === 'listening' ? 'Listening…' : voice.status === 'unsupported' ? 'Voice not supported' : 'Tap to speak'}
        </span>
        {voice.interim && (
          <p className="text-sm text-blue-400 italic text-center max-w-xs">{voice.interim}</p>
        )}
        {voice.error && (
          <p className="text-xs text-red-400 text-center">{voice.error}</p>
        )}
      </div>

      {/* Text input */}
      {multiline ? (
        <textarea
          className={`${INPUT} resize-none`}
          rows={3}
          placeholder={placeholder}
          value={value}
          onChange={e => setValue(e.target.value)}
        />
      ) : (
        <input
          className={INPUT}
          placeholder={placeholder}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && value.trim()) handleNext(); }}
        />
      )}

      {/* Actions */}
      <div className="w-full space-y-2">
        <button
          onClick={handleNext}
          disabled={!value.trim()}
          className="w-full bg-blue-600 disabled:bg-gray-800 disabled:text-gray-600 text-white font-bold py-4 rounded-2xl text-base active:scale-[0.98] transition-all"
        >
          Next →
        </button>
        {skipLabel && (
          <button
            onClick={() => onNext('')}
            className="w-full text-center text-sm text-gray-600 py-2"
          >
            {skipLabel}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── INTENT step ─────────────────────────────────────────────────────────────

function IntentStep({ onChoose }: { onChoose: (intent: ConversationData['intent']) => void }) {
  const options: { label: string; sub: string; value: ConversationData['intent']; icon: React.ReactNode }[] = [
    { label: 'Schedule a job',   sub: 'Book a service call, PM, or visit', value: 'schedule_job', icon: <Calendar size={22} className="text-blue-400" /> },
    { label: 'Add a reminder',   sub: 'Parts, tools, calls to make',       value: 'reminder',     icon: <Bell     size={22} className="text-amber-400" /> },
    { label: 'Add a note',       sub: 'Quick note for later',              value: 'note',         icon: <FileText size={22} className="text-green-400" /> },
    { label: 'Other',            sub: 'Freeform entry',                    value: 'other',        icon: <ChevronRight size={22} className="text-gray-400" /> },
  ];

  return (
    <div className="flex flex-col px-5 pt-8 gap-4 w-full">
      <h2 className="text-xl font-bold text-white text-center mb-2">What do you want to do?</h2>
      {options.map(o => (
        <button key={o.value} className={BTN_LG} onClick={() => onChoose(o.value)}>
          <span className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center flex-shrink-0">
            {o.icon}
          </span>
          <div>
            <div className="text-white font-bold text-base">{o.label}</div>
            <div className="text-gray-500 text-sm">{o.sub}</div>
          </div>
          <ChevronRight size={16} className="text-gray-600 ml-auto flex-shrink-0" />
        </button>
      ))}
    </div>
  );
}

// ─── NEW_OR_EXISTING step ─────────────────────────────────────────────────────

function NewOrExistingStep({ onChoose }: { onChoose: (t: ConversationData['customerType']) => void }) {
  return (
    <div className="flex flex-col px-5 pt-8 gap-4 w-full">
      <h2 className="text-xl font-bold text-white text-center mb-2">Is this an existing or new customer?</h2>
      <button className={BTN_LG} onClick={() => onChoose('existing')}>
        <span className="w-10 h-10 rounded-xl bg-blue-900/50 flex items-center justify-center flex-shrink-0">
          <Search size={20} className="text-blue-400" />
        </span>
        <div>
          <div className="text-white font-bold text-base">Existing customer</div>
          <div className="text-gray-500 text-sm">Search your saved customers &amp; sites</div>
        </div>
        <ChevronRight size={16} className="text-gray-600 ml-auto flex-shrink-0" />
      </button>
      <button className={BTN_LG} onClick={() => onChoose('new')}>
        <span className="w-10 h-10 rounded-xl bg-green-900/50 flex items-center justify-center flex-shrink-0">
          <FileText size={20} className="text-green-400" />
        </span>
        <div>
          <div className="text-white font-bold text-base">New customer</div>
          <div className="text-gray-500 text-sm">Enter name, site, and contact info</div>
        </div>
        <ChevronRight size={16} className="text-gray-600 ml-auto flex-shrink-0" />
      </button>
    </div>
  );
}

// ─── CUSTOMER_SEARCH step ─────────────────────────────────────────────────────

function CustomerSearchStep({
  clientId,
  onSelect,
  onCreateNew,
}: {
  clientId:    string;
  onSelect:    (match: CustomerMatch) => void;
  onCreateNew: () => void;
}) {
  const voice   = useStepVoice();
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState<CustomerMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef           = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Populate query from voice
  useEffect(() => {
    if (voice.status === 'done' && voice.transcript) {
      setQuery(voice.transcript);
    }
  }, [voice.status, voice.transcript]);

  // Debounced API search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); return; }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/schedule/customers?clientId=${encodeURIComponent(clientId)}&q=${encodeURIComponent(query.trim())}`
        );
        if (res.ok) {
          const data = await res.json() as { customers: { name: string }[] };
          setResults((data.customers ?? []).map(c => ({ name: c.name })));
        }
      } catch { /* offline — show no results */ }
      finally { setLoading(false); }
    }, 400);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, clientId]);

  return (
    <div className="flex flex-col px-5 pt-8 gap-5 w-full">
      <h2 className="text-xl font-bold text-white text-center">Search for the customer</h2>

      <div className="flex flex-col items-center gap-2">
        <MicButton status={voice.status} onStart={voice.start} onStop={voice.stop} />
        <span className="text-xs text-gray-500">
          {voice.status === 'listening' ? 'Listening…' : 'Tap to say the customer name'}
        </span>
        {voice.interim && (
          <p className="text-sm text-blue-400 italic text-center">{voice.interim}</p>
        )}
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          className={`${INPUT} pl-10`}
          placeholder="Type customer or business name…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
            <X size={14} />
          </button>
        )}
      </div>

      {loading && <p className="text-center text-sm text-gray-500">Searching…</p>}

      {!loading && results.length > 0 && (
        <div className="space-y-2">
          {results.map(r => (
            <button
              key={r.name}
              className={BTN_LG}
              onClick={() => onSelect(r)}
            >
              <span className="w-9 h-9 rounded-xl bg-blue-900/40 flex items-center justify-center flex-shrink-0 text-blue-300 font-bold text-sm">
                {r.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <div className="text-white font-semibold text-sm truncate">{r.name}</div>
                {r.site && <div className="text-gray-500 text-xs truncate">{r.site}</div>}
              </div>
              <ChevronRight size={14} className="text-gray-600 ml-auto flex-shrink-0" />
            </button>
          ))}
        </div>
      )}

      {!loading && query.trim() && results.length === 0 && (
        <p className="text-center text-sm text-gray-600">No matches found.</p>
      )}

      <button
        onClick={onCreateNew}
        className="w-full text-center text-sm text-blue-400 py-2 border border-blue-900/50 rounded-2xl"
      >
        + Create new customer instead
      </button>
    </div>
  );
}

// ─── SERVICE_TYPE step ────────────────────────────────────────────────────────

function ServiceTypeStep({ onChoose }: { onChoose: (type: string) => void }) {
  return (
    <div className="flex flex-col px-5 pt-8 gap-4 w-full">
      <h2 className="text-xl font-bold text-white text-center mb-2">What type of service?</h2>
      <div className="grid grid-cols-2 gap-2.5">
        {SERVICE_TYPES.map(t => (
          <button
            key={t}
            onClick={() => onChoose(t)}
            className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-4 text-white font-semibold text-sm text-center active:bg-gray-800 active:scale-[0.97] transition-all"
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── DATE step ────────────────────────────────────────────────────────────────

function DateStep({ onNext }: { onNext: (date: string) => void }) {
  const voice = useStepVoice();
  const [value, setValue] = useState('');

  useEffect(() => {
    if (voice.status === 'done' && voice.transcript) {
      const parsed = parseVoiceDate(voice.transcript);
      setValue(parsed);
    }
  }, [voice.status, voice.transcript]); // eslint-disable-line

  const today    = todayStr();
  const tomorrow = tomorrowStr();
  const nextWeek = (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().split('T')[0]; })();

  return (
    <div className="flex flex-col items-center px-5 pt-8 gap-6 w-full">
      <h2 className="text-xl font-bold text-white text-center">When is this scheduled?</h2>

      {/* Quick buttons */}
      <div className="flex gap-2 w-full">
        {[
          { label: 'Today',     value: today    },
          { label: 'Tomorrow',  value: tomorrow },
          { label: 'Next week', value: nextWeek },
        ].map(q => (
          <button key={q.label} className={BTN_SM} onClick={() => onNext(q.value)}>
            {q.label}
          </button>
        ))}
      </div>

      <div className="w-full flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-800" />
        <span className="text-xs text-gray-600">or pick a date</span>
        <div className="flex-1 h-px bg-gray-800" />
      </div>

      {/* Date picker */}
      <input
        type="date"
        className={INPUT}
        value={value}
        onChange={e => setValue(e.target.value)}
        min={today}
      />

      <div className="flex flex-col items-center gap-2 w-full">
        <p className="text-sm text-gray-500">Or speak the date</p>
        <MicButton status={voice.status} onStart={voice.start} onStop={voice.stop} />
        {voice.interim && <p className="text-sm text-blue-400 italic">{voice.interim}</p>}
        {voice.error   && <p className="text-xs text-red-400">{voice.error}</p>}
      </div>

      <div className="w-full space-y-2">
        <button
          onClick={() => value && onNext(value)}
          disabled={!value}
          className="w-full bg-blue-600 disabled:bg-gray-800 disabled:text-gray-600 text-white font-bold py-4 rounded-2xl active:scale-[0.98] transition-all"
        >
          Next →
        </button>
        <button onClick={() => onNext(today)} className="w-full text-center text-sm text-gray-600 py-2">
          Skip (use today)
        </button>
      </div>
    </div>
  );
}

// ─── TIME step ────────────────────────────────────────────────────────────────

function TimeStep({ onNext }: { onNext: (time: string) => void }) {
  const voice = useStepVoice();
  const [value, setValue] = useState('');

  useEffect(() => {
    if (voice.status === 'done' && voice.transcript) {
      setValue(parseVoiceTime(voice.transcript));
    }
  }, [voice.status, voice.transcript]); // eslint-disable-line

  return (
    <div className="flex flex-col items-center px-5 pt-8 gap-6 w-full">
      <h2 className="text-xl font-bold text-white text-center">What time?</h2>

      {/* Quick time chips */}
      <div className="flex flex-wrap gap-2 w-full justify-center">
        {QUICK_TIMES.map(t => (
          <button
            key={t}
            onClick={() => onNext(t)}
            className="bg-gray-900 border border-gray-800 rounded-xl px-3.5 py-2 text-sm text-white font-medium active:bg-gray-800 transition-colors"
          >
            {t}
          </button>
        ))}
      </div>

      <input
        className={INPUT}
        placeholder="e.g. 8:00 AM or 1400"
        value={value}
        onChange={e => setValue(e.target.value)}
      />

      <div className="flex flex-col items-center gap-2">
        <p className="text-sm text-gray-500">Or speak the time</p>
        <MicButton status={voice.status} onStart={voice.start} onStop={voice.stop} />
        {voice.interim && <p className="text-sm text-blue-400 italic">{voice.interim}</p>}
        {voice.error   && <p className="text-xs text-red-400">{voice.error}</p>}
      </div>

      <div className="w-full space-y-2">
        <button
          onClick={() => value && onNext(value)}
          disabled={!value}
          className="w-full bg-blue-600 disabled:bg-gray-800 disabled:text-gray-600 text-white font-bold py-4 rounded-2xl active:scale-[0.98] transition-all"
        >
          Next →
        </button>
        <button onClick={() => onNext('TBD')} className="w-full text-center text-sm text-gray-600 py-2">
          Skip (TBD)
        </button>
      </div>
    </div>
  );
}

// ─── REMINDER_DATE step ───────────────────────────────────────────────────────

function ReminderDateStep({ onNext }: { onNext: (date: string) => void }) {
  const [value, setValue] = useState('');
  const today    = todayStr();
  const tomorrow = tomorrowStr();

  return (
    <div className="flex flex-col items-center px-5 pt-8 gap-6 w-full">
      <h2 className="text-xl font-bold text-white text-center">When do you need this reminder?</h2>

      <div className="flex gap-2 w-full">
        {[
          { label: 'Today',    value: today    },
          { label: 'Tomorrow', value: tomorrow },
        ].map(q => (
          <button key={q.label} className={BTN_SM} onClick={() => onNext(q.value)}>
            {q.label}
          </button>
        ))}
      </div>

      <input
        type="date"
        className={INPUT}
        value={value}
        onChange={e => setValue(e.target.value)}
        min={today}
      />
      <button
        onClick={() => value && onNext(value)}
        disabled={!value}
        className="w-full bg-blue-600 disabled:bg-gray-800 disabled:text-gray-600 text-white font-bold py-4 rounded-2xl active:scale-[0.98] transition-all"
      >
        Next →
      </button>
    </div>
  );
}

// ─── CONFIRM step ─────────────────────────────────────────────────────────────

function ConfirmStep({
  data,
  onConfirm,
  onEdit,
  onRestart,
}: {
  data:      ConversationData;
  onConfirm: () => void;
  onEdit:    () => void;
  onRestart: () => void;
}) {
  const isReminder = data.intent === 'reminder';
  const isNote     = data.intent === 'note';

  const rows: { label: string; value: string }[] = isReminder
    ? [
        { label: 'Reminder', value: data.reminderText },
        { label: 'Due date', value: data.reminderDate },
      ]
    : isNote
    ? [
        { label: 'Note', value: data.noteText },
      ]
    : [
        { label: 'Customer',     value: data.customerName },
        { label: 'Site',         value: data.siteName || data.selectedCustomer?.site || '—' },
        { label: 'Address',      value: data.address  || data.selectedCustomer?.address || '—' },
        { label: 'Service type', value: data.serviceType === 'Other' ? (data.serviceOtherDesc || 'Other') : data.serviceType },
        { label: 'Date',         value: data.date || '—' },
        { label: 'Time',         value: data.time || '—' },
        { label: 'Notes',        value: data.notes || '—' },
      ];

  return (
    <div className="flex flex-col px-5 pt-6 gap-5 w-full">
      <h2 className="text-xl font-bold text-white text-center">Confirm</h2>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        {rows.map((r, i) => (
          <div key={r.label} className={`flex gap-3 px-4 py-3.5 ${i > 0 ? 'border-t border-gray-800' : ''}`}>
            <span className="text-xs text-gray-500 w-24 flex-shrink-0 pt-0.5 font-medium uppercase tracking-wide">{r.label}</span>
            <span className="text-sm text-white font-medium break-words flex-1">{r.value || '—'}</span>
          </div>
        ))}
      </div>

      <div className="space-y-2.5">
        <button
          onClick={onConfirm}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-4.5 py-4 rounded-2xl text-base active:scale-[0.98] transition-all"
        >
          <CheckCircle size={18} />
          Confirm Schedule
        </button>
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="flex-1 bg-gray-800 text-gray-300 font-semibold py-3.5 rounded-2xl text-sm active:bg-gray-700 transition-colors"
          >
            ✏️ Edit
          </button>
          <button
            onClick={onRestart}
            className="flex-1 bg-gray-800 text-gray-300 font-semibold py-3.5 rounded-2xl text-sm active:bg-gray-700 transition-colors flex items-center justify-center gap-1.5"
          >
            <RotateCcw size={14} />
            Start Over
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 flex-1 min-w-0">
      <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-blue-500 rounded-full"
          initial={false}
          animate={{ width: `${(current / total) * 100}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      </div>
      <span className="text-xs text-gray-500 flex-shrink-0">
        {current} / {total}
      </span>
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

interface Props {
  userId:   string;
  onParsed: (jobs: ImportedJob[]) => void;
  onBack:   () => void;
}

export function ScheduleConversationModal({ userId, onParsed, onBack }: Props) {
  const conv = useScheduleConversation();
  const { step, data, path, stepIndex, next, back, restart, selectCustomer } = conv;

  const today = todayStr();

  function buildImportedJob(): ImportedJob {
    const isReminder = data.intent === 'reminder';
    const isNote     = data.intent === 'note' || data.intent === 'other';
    const serviceDesc = data.serviceType === 'Other' ? (data.serviceOtherDesc || 'Other') : data.serviceType;

    if (isReminder) {
      return {
        id: `reminder_${Date.now()}`,
        source: 'voice', jobNumber: '',
        customer: '', site: '', address: '',
        appointmentDate: data.reminderDate || today,
        appointmentTime: '', timeWindow: '', phone: '',
        technician: '', jobType: 'Reminder', priority: 'normal',
        complaint: data.reminderText, notes: data.reminderText,
        equipment: '', attachments: [],
        rawData: { via: 'schedule_conversation', intent: 'reminder' },
        importedAt: new Date().toISOString(), status: 'pending',
        reminders: [data.reminderText],
      };
    }
    if (isNote) {
      return {
        id: `note_${Date.now()}`,
        source: 'voice', jobNumber: '',
        customer: '', site: '', address: '',
        appointmentDate: today,
        appointmentTime: '', timeWindow: '', phone: '',
        technician: '', jobType: 'Note', priority: 'normal',
        complaint: data.noteText, notes: data.noteText,
        equipment: '', attachments: [],
        rawData: { via: 'schedule_conversation', intent: 'note' },
        importedAt: new Date().toISOString(), status: 'pending',
        reminders: [data.noteText],
      };
    }
    return {
      id: `schedule_${Date.now()}`,
      source: 'voice', jobNumber: '',
      customer:        data.customerName || data.selectedCustomer?.name || '',
      site:            data.siteName     || data.selectedCustomer?.site || '',
      address:         data.address      || data.selectedCustomer?.address || '',
      appointmentDate: data.date || today,
      appointmentTime: data.time,
      timeWindow:      data.time,
      phone: '', technician: '',
      jobType:   serviceDesc,
      priority: 'normal',
      complaint: data.serviceOtherDesc || serviceDesc,
      notes:     data.notes,
      equipment: '', attachments: [],
      rawData: { via: 'schedule_conversation', intent: 'schedule_job' },
      importedAt: new Date().toISOString(), status: 'pending',
    };
  }

  function handleBack() {
    if (stepIndex === 0) {
      onBack();
    } else {
      back();
    }
  }

  function handleConfirm() {
    onParsed([buildImportedJob()]);
  }

  // ── Render the current step ────────────────────────────────────────────────

  function renderStep() {
    switch (step) {

      case 'INTENT':
        return (
          <IntentStep
            key="INTENT"
            onChoose={intent => next({ intent })}
          />
        );

      case 'NEW_OR_EXISTING':
        return (
          <NewOrExistingStep
            key="NEW_OR_EXISTING"
            onChoose={customerType => next({ customerType })}
          />
        );

      case 'CUSTOMER_SEARCH':
        return (
          <CustomerSearchStep
            key="CUSTOMER_SEARCH"
            clientId={userId}
            onSelect={match => selectCustomer(match)}
            onCreateNew={() => next({ customerType: 'new' })}
          />
        );

      case 'CUSTOMER_NAME':
        return (
          <VoiceTextStep
            key="CUSTOMER_NAME"
            question="Customer or business name?"
            placeholder="e.g. Oakridge Elementary School"
            onNext={v => next({ customerName: v })}
          />
        );

      case 'SITE_NAME':
        return (
          <VoiceTextStep
            key="SITE_NAME"
            question="Site or location name?"
            placeholder="e.g. Building A, North Campus"
            hint="Building, suite, or site label. City or address works too."
            onNext={v => next({ siteName: v })}
            skipLabel="Skip"
          />
        );

      case 'SERVICE_TYPE':
        return (
          <ServiceTypeStep
            key="SERVICE_TYPE"
            onChoose={serviceType => next({ serviceType })}
          />
        );

      case 'SERVICE_OTHER':
        return (
          <VoiceTextStep
            key="SERVICE_OTHER"
            question="Describe the reason for the visit"
            placeholder="e.g. Compressor won't start, water leak above ceiling, annual PM…"
            multiline
            onNext={v => next({ serviceOtherDesc: v })}
          />
        );

      case 'DATE':
        return (
          <DateStep
            key="DATE"
            onNext={date => next({ date })}
          />
        );

      case 'TIME':
        return (
          <TimeStep
            key="TIME"
            onNext={time => next({ time })}
          />
        );

      case 'NOTES':
        return (
          <VoiceTextStep
            key="NOTES"
            question="Any notes or special instructions?"
            placeholder="Access code, badge required, call before arrival, bring parts…"
            multiline
            onNext={v => next({ notes: v })}
            skipLabel="No notes — continue"
          />
        );

      case 'REMINDER_TEXT':
        return (
          <VoiceTextStep
            key="REMINDER_TEXT"
            question="What's the reminder?"
            placeholder="e.g. Bring 10-ton capacitor, call Mrs. Garza before arrival…"
            onNext={v => next({ reminderText: v })}
          />
        );

      case 'REMINDER_DATE':
        return (
          <ReminderDateStep
            key="REMINDER_DATE"
            onNext={date => next({ reminderDate: date })}
          />
        );

      case 'NOTE_TEXT':
        return (
          <VoiceTextStep
            key="NOTE_TEXT"
            question="What's the note?"
            placeholder="Type or speak your note…"
            multiline
            onNext={v => next({ noteText: v })}
          />
        );

      case 'CONFIRM':
        return (
          <ConfirmStep
            key="CONFIRM"
            data={data}
            onConfirm={handleConfirm}
            onEdit={back}
            onRestart={restart}
          />
        );

      default:
        return null;
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{    opacity: 0, y: 24 }}
      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      className="fixed inset-0 z-50 bg-gray-950 flex flex-col"
    >
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-800 flex-shrink-0">
        <button
          onClick={handleBack}
          className="w-9 h-9 rounded-xl bg-gray-800 flex items-center justify-center flex-shrink-0 active:bg-gray-700 transition-colors"
          aria-label="Back"
        >
          <ArrowLeft size={16} className="text-gray-300" />
        </button>
        <div className="flex flex-col flex-1 min-w-0 gap-1.5">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            {STEP_LABEL[step]}
          </span>
          <ProgressBar current={stepIndex + 1} total={path.length} />
        </div>
      </div>

      {/* ── Step content ── */}
      <div className="flex-1 overflow-y-auto pb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="flex flex-col items-stretch w-full"
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
