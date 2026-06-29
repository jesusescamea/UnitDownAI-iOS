import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Inbox, Plus, ChevronRight, CheckCircle, Clock, MapPin,
  AlertTriangle, Edit2, Trash2, ClipboardList, Upload,
  FileText, Copy, Camera, Calendar, Mail, Zap, RefreshCw,
  Check, SkipForward, GitMerge, ChevronDown,
} from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import type { ImportedJob, ProviderType } from './types';
import { PROVIDERS, CATEGORY_LABELS } from './providers/index';
import { parsePastedText, parseCSV } from './parsers';
import { useDispatchInbox } from './useDispatchInbox';

// ─── Sub-screens ──────────────────────────────────────────────────────────────
type Screen =
  | 'inbox'
  | 'sources'
  | 'paste'
  | 'csv'
  | 'review'
  | 'edit'
  | 'settings';

// ─── Priority config ──────────────────────────────────────────────────────────
const PRIORITY_CONFIG = {
  emergency: { label: 'Emergency', cls: 'bg-red-900/40 text-red-300 border-red-800' },
  high:      { label: 'High',      cls: 'bg-amber-900/40 text-amber-300 border-amber-800' },
  normal:    { label: 'Normal',    cls: 'bg-blue-900/40 text-blue-300 border-blue-800' },
  pm:        { label: 'PM',        cls: 'bg-gray-800 text-gray-300 border-gray-700' },
};

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: ImportedJob['status'] }) {
  if (status === 'accepted')
    return <span className="text-[9px] font-bold bg-green-900/40 text-green-400 border border-green-800/50 px-1.5 py-0.5 rounded-full">Accepted</span>;
  if (status === 'duplicate')
    return <span className="text-[9px] font-bold bg-amber-900/40 text-amber-400 border border-amber-800/50 px-1.5 py-0.5 rounded-full">Duplicate</span>;
  if (status === 'skipped')
    return <span className="text-[9px] font-bold bg-gray-700 text-gray-400 border border-gray-600 px-1.5 py-0.5 rounded-full">Skipped</span>;
  return <span className="text-[9px] font-bold bg-blue-900/40 text-blue-400 border border-blue-800/50 px-1.5 py-0.5 rounded-full">Pending</span>;
}

// ─── Provider icon ────────────────────────────────────────────────────────────
function ProviderIcon({ id, size = 18 }: { id: ProviderType; size?: number }) {
  const cls = `text-gray-300`;
  if (id === 'paste')            return <Copy size={size} className={cls} />;
  if (id === 'csv')              return <FileText size={size} className={cls} />;
  if (id === 'pdf')              return <FileText size={size} className="text-red-300" />;
  if (id === 'scan_ocr')         return <Camera size={size} className={cls} />;
  if (id === 'google_calendar')  return <Calendar size={size} className="text-blue-300" />;
  if (id === 'apple_calendar')   return <Calendar size={size} className="text-gray-300" />;
  if (id === 'outlook_calendar') return <Calendar size={size} className="text-blue-400" />;
  if (id === 'gmail')            return <Mail size={size} className="text-red-300" />;
  if (id === 'outlook_email')    return <Mail size={size} className="text-blue-400" />;
  if (id === 'manual')           return <Plus size={size} className="text-green-300" />;
  return <Zap size={size} className="text-purple-300" />;
}

// ─── Job card ─────────────────────────────────────────────────────────────────
function JobCard({
  job,
  onEdit,
  onDelete,
  onAccept,
  onSkip,
  onDupAction,
}: {
  job: ImportedJob;
  onEdit: () => void;
  onDelete: () => void;
  onAccept: () => void;
  onSkip: () => void;
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
      {/* Header row */}
      <div className="px-4 pt-3.5 pb-2 flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-white text-sm leading-tight truncate">
              {job.customer || 'Unknown Customer'}
            </span>
            <StatusBadge status={job.status} />
          </div>
          {job.jobNumber && (
            <div className="text-[10px] font-mono text-gray-500 mt-0.5">{job.jobNumber}</div>
          )}
        </div>
        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${pri.cls}`}>
          {pri.label}
        </span>
      </div>

      {/* Details */}
      <div className="px-4 pb-3 space-y-1.5">
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
        {job.address && (
          <div className="flex items-center gap-1.5">
            <MapPin size={11} className="text-gray-500 flex-shrink-0" />
            <span className="text-xs text-gray-400 truncate">{job.address}</span>
          </div>
        )}
        {job.equipment && (
          <div className="text-[10px] text-gray-500 font-mono truncate">{job.equipment}</div>
        )}

        {/* Source tag */}
        <div className="flex items-center gap-1 pt-0.5">
          <ProviderIcon id={job.source} size={10} />
          <span className="text-[9px] text-gray-600">{PROVIDERS.find(p => p.id === job.source)?.name ?? job.source}</span>
        </div>
      </div>

      {/* Duplicate resolution */}
      {job.status === 'duplicate' && (
        <div className="border-t border-gray-800 bg-amber-950/20 px-4 py-2.5">
          <button
            onClick={() => setDupOpen(o => !o)}
            className="w-full flex items-center justify-between"
          >
            <span className="text-[10px] font-semibold text-amber-400">Already imported — resolve?</span>
            <ChevronDown size={12} className={`text-amber-400 transition-transform ${dupOpen ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {dupOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="flex gap-2 pt-2">
                  <button onClick={() => onDupAction('skip')}
                    className="flex-1 flex items-center justify-center gap-1 bg-gray-800 border border-gray-700 rounded-xl py-2 text-xs text-gray-300">
                    <SkipForward size={11} /> Skip
                  </button>
                  <button onClick={() => onDupAction('replace')}
                    className="flex-1 flex items-center justify-center gap-1 bg-amber-900/40 border border-amber-800 rounded-xl py-2 text-xs text-amber-300">
                    <RefreshCw size={11} /> Replace
                  </button>
                  <button onClick={() => onDupAction('merge')}
                    className="flex-1 flex items-center justify-center gap-1 bg-blue-900/40 border border-blue-800 rounded-xl py-2 text-xs text-blue-300">
                    <GitMerge size={11} /> Merge
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Action row */}
      {job.status !== 'accepted' && job.status !== 'skipped' && (
        <div className="border-t border-gray-800 flex">
          <button onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs text-gray-400 active:bg-gray-800 transition-colors">
            <Edit2 size={12} /> Edit
          </button>
          <div className="w-px bg-gray-800" />
          <button onClick={onDelete}
            className="flex items-center justify-center gap-1.5 px-4 py-3 text-xs text-red-400 active:bg-gray-800 transition-colors">
            <Trash2 size={12} />
          </button>
          <div className="w-px bg-gray-800" />
          <button onClick={onAccept}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs text-green-400 font-semibold active:bg-gray-800 transition-colors">
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
      <div className="px-4 py-4 border-b border-gray-800 flex items-center gap-3">
        <button onClick={onBack} className="w-8 h-8 rounded-xl bg-gray-800 flex items-center justify-center">
          <X size={14} className="text-gray-400" />
        </button>
        <div>
          <div className="font-bold text-white text-sm">Paste Schedule</div>
          <div className="text-[10px] text-gray-500">AI extracts job details automatically</div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <div className="bg-blue-950/30 border border-blue-800/40 rounded-xl px-3 py-2.5">
          <p className="text-[10px] text-blue-300 leading-relaxed">
            Paste any dispatch text — email, text message, work order, or schedule.
            Include customer name, address, date/time, and complaint for best results.
          </p>
        </div>
        <textarea
          className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors resize-none"
          rows={12}
          placeholder={"Dispatch text — example:\n\nWO#: 4821\nCustomer: Riverfront Office\nAddress: 1200 River Rd, Dallas TX\nDate: 7/15/2026 · 9:00 AM\nEquipment: Carrier RTU-2\nSymptom: Unit not cooling, high pressure alarm\nTech: Self"}
          value={text}
          onChange={e => setText(e.target.value)}
          autoFocus
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
      <div className="px-4 pb-6 pt-2">
        <button onClick={handleParse}
          className="w-full bg-white text-gray-950 font-bold py-4 rounded-2xl text-sm active:scale-[0.98] transition-transform">
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
    if (!file.name.endsWith('.csv')) { setError('Please select a .csv file.'); return; }
    setLoading(true);
    setError('');
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
      <div className="px-4 py-4 border-b border-gray-800 flex items-center gap-3">
        <button onClick={onBack} className="w-8 h-8 rounded-xl bg-gray-800 flex items-center justify-center">
          <X size={14} className="text-gray-400" />
        </button>
        <div>
          <div className="font-bold text-white text-sm">Import CSV</div>
          <div className="text-[10px] text-gray-500">Upload a schedule from any dispatch platform</div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className="bg-blue-950/30 border border-blue-800/40 rounded-xl px-3 py-2.5">
          <p className="text-[10px] text-blue-300 leading-relaxed">
            Export a .csv from ServiceTitan, Housecall Pro, FieldEdge, or any scheduling tool.
            Common columns are detected automatically.
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
            {['Customer', 'Address', 'Date', 'Time', 'Job #', 'WO #', 'Tech', 'Unit', 'Complaint', 'Priority', 'Phone'].map(c => (
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

// ─── Edit job screen ──────────────────────────────────────────────────────────
function EditJobScreen({ job, onSave, onBack }: { job: ImportedJob; onSave: (j: ImportedJob) => void; onBack: () => void }) {
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
      <div className="px-4 py-4 border-b border-gray-800 flex items-center gap-3">
        <button onClick={onBack} className="w-8 h-8 rounded-xl bg-gray-800 flex items-center justify-center">
          <X size={14} className="text-gray-400" />
        </button>
        <div className="font-bold text-white text-sm">Edit Job</div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <Field label="Customer">
          <input className={inputCls} value={draft.customer} onChange={e => set('customer', e.target.value)} placeholder="Business or customer name" />
        </Field>
        <Field label="Job number">
          <input className={inputCls} value={draft.jobNumber} onChange={e => set('jobNumber', e.target.value)} placeholder="WO# or job ID" />
        </Field>
        <Field label="Address">
          <input className={inputCls} value={draft.address} onChange={e => set('address', e.target.value)} placeholder="Service address" />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Date">
            <input type="date" className={inputCls} value={draft.appointmentDate} onChange={e => set('appointmentDate', e.target.value)} />
          </Field>
          <Field label="Time">
            <input className={inputCls} value={draft.appointmentTime} onChange={e => set('appointmentTime', e.target.value)} placeholder="8:00 AM" />
          </Field>
        </div>
        <Field label="Priority">
          <select className={inputCls} value={draft.priority} onChange={e => set('priority', e.target.value as ImportedJob['priority'])}>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="emergency">Emergency</option>
            <option value="pm">PM</option>
          </select>
        </Field>
        <Field label="Equipment">
          <input className={inputCls} value={draft.equipment} onChange={e => set('equipment', e.target.value)} placeholder="Unit tag or model" />
        </Field>
        <Field label="Complaint">
          <textarea className={`${inputCls} resize-none`} rows={3} value={draft.complaint} onChange={e => set('complaint', e.target.value)} placeholder="Customer complaint or work to be done" />
        </Field>
        <Field label="Phone">
          <input className={inputCls} value={draft.phone} onChange={e => set('phone', e.target.value)} placeholder="Customer phone" />
        </Field>
        <Field label="Notes">
          <textarea className={`${inputCls} resize-none`} rows={2} value={draft.notes} onChange={e => set('notes', e.target.value)} placeholder="Dispatch notes" />
        </Field>
      </div>
      <div className="px-4 pb-6 pt-2">
        <button onClick={() => onSave(draft)}
          className="w-full bg-white text-gray-950 font-bold py-4 rounded-2xl text-sm active:scale-[0.98] transition-transform">
          Save Changes
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
      <div className="px-4 py-4 border-b border-gray-800 flex items-center gap-3">
        <button onClick={onBack} className="w-8 h-8 rounded-xl bg-gray-800 flex items-center justify-center">
          <X size={14} className="text-gray-400" />
        </button>
        <div>
          <div className="font-bold text-white text-sm">Import Schedule</div>
          <div className="text-[10px] text-gray-500">Choose a source</div>
        </div>
      </div>
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
                          ? 'border-gray-700 active:bg-gray-800'
                          : 'border-gray-800 opacity-50 cursor-default'
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
                        : <span className="text-[9px] text-gray-500 border border-gray-700 px-1.5 py-0.5 rounded-full flex-shrink-0">Soon</span>
                      }
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Future connector note */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3 mt-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">Coming in future releases</div>
          <div className="flex flex-wrap gap-1">
            {['ServiceTitan', 'FieldEdge', 'Successware', 'Service Fusion', 'Lennox Dispatch', 'Carrier ServiceBench', 'Trane', 'Daikin', 'Microsoft Graph', 'Google Workspace', 'SMS parsing'].map(f => (
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
  onClose: () => void;
  onStartJob: () => void;
}

export function DispatchInboxModal({ onClose, onStartJob }: Props) {
  const { user } = useUser();
  const techName = user?.fullName || user?.firstName || 'Me';
  const {
    jobs, pendingJobs, acceptedJobs, dupJobs,
    addJobs, updateStatus, removeJob, acceptAll, clearAccepted,
  } = useDispatchInbox();

  const [screen, setScreen] = useState<Screen>('inbox');
  const [editingJob, setEditingJob] = useState<ImportedJob | null>(null);
  const [inboxFilter, setInboxFilter] = useState<'all' | 'pending' | 'accepted'>('all');

  // ── After parsing, go to review ───────────────────────────────────────────
  function handleParsed(incoming: ImportedJob[]) {
    // Stamp technician
    const stamped = incoming.map(j => ({ ...j, technician: j.technician || techName }));
    addJobs(stamped);
    setScreen('inbox');
  }

  // ── Source selection ──────────────────────────────────────────────────────
  function handleSourceSelect(id: ProviderType) {
    if (id === 'paste')  { setScreen('paste');  return; }
    if (id === 'csv')    { setScreen('csv');    return; }
    if (id === 'manual') {
      // Create a blank job and open the edit screen
      const blank: ImportedJob = {
        id: `DI-${Date.now()}`,
        source: 'manual',
        jobNumber: '',
        customer: '',
        site: '',
        address: '',
        appointmentDate: new Date().toISOString().split('T')[0],
        appointmentTime: '',
        timeWindow: '',
        phone: '',
        technician: techName,
        jobType: 'Service Call',
        priority: 'normal',
        complaint: '',
        notes: '',
        equipment: '',
        attachments: [],
        rawData: '',
        importedAt: new Date().toISOString(),
        status: 'pending',
      };
      setEditingJob(blank);
      setScreen('edit');
      return;
    }
  }

  // ── Save edit ─────────────────────────────────────────────────────────────
  function handleSaveEdit(updated: ImportedJob) {
    // Check if this is a new job (not yet in inbox)
    const exists = jobs.some(j => j.id === updated.id);
    if (!exists) {
      addJobs([updated]);
    } else {
      // Update in place via addJobs will detect duplicate; use direct state update
      addJobs([{ ...updated, id: `DI-${Date.now()}` }]); // re-id to avoid dup detection collision
      removeJob(updated.id);
    }
    setEditingJob(null);
    setScreen('inbox');
  }

  // ── Displayed jobs ────────────────────────────────────────────────────────
  const displayJobs =
    inboxFilter === 'pending'  ? pendingJobs :
    inboxFilter === 'accepted' ? acceptedJobs :
    [...dupJobs, ...pendingJobs, ...acceptedJobs, ...jobs.filter(j => j.status === 'skipped')];

  const unreadCount = pendingJobs.length + dupJobs.length;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-gray-950"
    >
      {/* ── Paste screen ─────────────────────────────────────────────────── */}
      {screen === 'paste' && (
        <PasteScreen onParsed={handleParsed} onBack={() => setScreen('sources')} />
      )}

      {/* ── CSV screen ───────────────────────────────────────────────────── */}
      {screen === 'csv' && (
        <CSVScreen onParsed={handleParsed} onBack={() => setScreen('sources')} />
      )}

      {/* ── Sources screen ────────────────────────────────────────────────── */}
      {screen === 'sources' && (
        <SourcesScreen onSelect={handleSourceSelect} onBack={() => setScreen('inbox')} />
      )}

      {/* ── Edit screen ───────────────────────────────────────────────────── */}
      {screen === 'edit' && editingJob && (
        <EditJobScreen
          job={editingJob}
          onSave={handleSaveEdit}
          onBack={() => { setEditingJob(null); setScreen('inbox'); }}
        />
      )}

      {/* ── Inbox screen ─────────────────────────────────────────────────── */}
      {screen === 'inbox' && (
        <>
          {/* Header */}
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
                  <button onClick={clearAccepted}
                    className="text-[10px] text-gray-500 border border-gray-700 px-2 py-1 rounded-lg">
                    Clear done
                  </button>
                )}
                <button onClick={onClose}
                  className="w-8 h-8 rounded-xl bg-gray-800 flex items-center justify-center">
                  <X size={14} className="text-gray-400" />
                </button>
              </div>
            </div>

            {/* Filter tabs */}
            {jobs.length > 0 && (
              <div className="flex gap-1.5">
                {(['all', 'pending', 'accepted'] as const).map(f => (
                  <button key={f} onClick={() => setInboxFilter(f)}
                    className={`px-3 py-1 rounded-full text-[10px] font-semibold transition-colors ${
                      inboxFilter === f
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-400'
                    }`}>
                    {f === 'all' ? `All (${jobs.length})` : f === 'pending' ? `Pending (${pendingJobs.length + dupJobs.length})` : `Accepted (${acceptedJobs.length})`}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-4 py-4">

            {/* Accept all */}
            {pendingJobs.length > 1 && (
              <button onClick={acceptAll}
                className="w-full mb-3 flex items-center justify-center gap-2 bg-green-900/30 border border-green-800 rounded-2xl py-3 text-sm font-semibold text-green-300 active:bg-green-900/50 transition-colors">
                <CheckCircle size={15} />
                Accept All ({pendingJobs.length} jobs)
              </button>
            )}

            {/* Empty state */}
            {jobs.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center mb-4">
                  <Inbox size={28} className="text-gray-600" />
                </div>
                <div className="font-bold text-white text-base mb-1">No schedules imported yet</div>
                <div className="text-xs text-gray-500 mb-6 max-w-xs leading-relaxed">
                  Import your schedule from any source — paste dispatch text, upload a CSV, or enter jobs manually.
                </div>
                <div className="space-y-2 w-full max-w-xs">
                  <button onClick={() => setScreen('sources')}
                    className="w-full bg-white text-gray-950 font-bold py-4 rounded-2xl text-sm">
                    Import Schedule
                  </button>
                  <button onClick={() => handleSourceSelect('manual')}
                    className="w-full bg-gray-900 border border-gray-700 text-white font-semibold py-3.5 rounded-2xl text-sm">
                    Manual Job
                  </button>
                </div>
              </div>
            )}

            {/* Job list */}
            {jobs.length > 0 && (
              <div className="space-y-3">
                <AnimatePresence>
                  {displayJobs.map(job => (
                    <JobCard
                      key={job.id}
                      job={job}
                      onEdit={() => { setEditingJob(job); setScreen('edit'); }}
                      onDelete={() => removeJob(job.id)}
                      onAccept={() => updateStatus(job.id, 'accepted')}
                      onSkip={() => updateStatus(job.id, 'skipped')}
                      onDupAction={action => {
                        if (action === 'skip') updateStatus(job.id, 'skipped');
                        else if (action === 'replace' || action === 'merge') updateStatus(job.id, 'accepted');
                      }}
                    />
                  ))}
                </AnimatePresence>

                {/* No results for filter */}
                {displayJobs.length === 0 && (
                  <div className="text-center py-8 text-sm text-gray-500">
                    No {inboxFilter} jobs.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-800 px-4 py-4 flex gap-2 flex-shrink-0">
            <button onClick={() => setScreen('sources')}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-700 text-white font-bold py-3.5 rounded-2xl text-sm active:scale-[0.98] transition-transform">
              <Upload size={15} />
              Import Schedule
            </button>
            <button onClick={() => handleSourceSelect('manual')}
              className="flex items-center justify-center w-12 bg-gray-800 border border-gray-700 text-gray-300 rounded-2xl active:scale-[0.98] transition-transform">
              <Plus size={18} />
            </button>
          </div>
        </>
      )}

      {/* Accepted job — Start Job CTA */}
      {screen === 'inbox' && acceptedJobs.length > 0 && (
        <div className="border-t border-green-900/50 bg-green-950/20 px-4 py-3 flex-shrink-0">
          <button
            onClick={onStartJob}
            className="w-full flex items-center justify-between bg-green-700 text-white font-bold py-3.5 rounded-2xl px-4 active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-2">
              <ClipboardList size={16} />
              <span>Start Job ({acceptedJobs.length})</span>
            </div>
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </motion.div>
  );
}
