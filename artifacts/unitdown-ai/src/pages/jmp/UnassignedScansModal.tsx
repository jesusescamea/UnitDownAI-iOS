import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Inbox, Search, Link2, Trash2, Edit2, CheckCircle,
  Package, Loader2, ChevronRight, AlertTriangle, Clock,
} from 'lucide-react';
import { useUnassignedScans, type UnassignedScan, type NameplateFields } from './useUnassignedScans';

// ─── Auth helper ──────────────────────────────────────────────────────────────
function getClientId(): string {
  try { return localStorage.getItem('unitdown_client_id') ?? ''; } catch { return ''; }
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface UnitResult {
  id:                string;
  nickname?:         string | null;
  siteCustomerName?: string | null;
  modelNumber?:      string | null;
  equipmentType?:    string | null;
}

// ─── Format date ──────────────────────────────────────────────────────────────
function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins < 2)    return 'just now';
  if (mins < 60)   return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  if (days < 7)    return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Fields summary line ──────────────────────────────────────────────────────
function fieldSummary(f: NameplateFields): string {
  return [f.manufacturer, f.modelNumber, f.serialNumber, f.equipmentType]
    .filter(Boolean).join(' · ') || 'No OCR data';
}

// ─── Unit search (inline, single-use) ─────────────────────────────────────────
function UnitSearchInline({ scanId, onLinked }: { scanId: string; onLinked: () => void }) {
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState<UnitResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [saving,  setSaving]  = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { scans, markLinked } = useUnassignedScans();
  const scan = scans.find(s => s.id === scanId);

  async function search(q: string) {
    setQuery(q);
    if (timer.current) clearTimeout(timer.current);
    if (!q.trim()) { setResults([]); return; }
    timer.current = setTimeout(async () => {
      setLoading(true); setError('');
      try {
        const clientId = getClientId();
        const res = await fetch(`/api/units?clientId=${encodeURIComponent(clientId)}&q=${encodeURIComponent(q)}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setResults(data.units ?? []);
      } catch { setError('Search unavailable'); }
      finally { setLoading(false); }
    }, 300);
  }

  async function handleLink(unit: UnitResult) {
    if (!scan) return;
    setSaving(true); setError('');
    try {
      const clientId = getClientId();
      const f = scan.fields;
      const res = await fetch(`/api/units/${unit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          unit: {
            manufacturer:    f.manufacturer    ?? undefined,
            modelNumber:     f.modelNumber     ?? undefined,
            serialNumber:    f.serialNumber    ?? undefined,
            equipmentType:   f.equipmentType   ?? undefined,
            systemType:      f.systemType      ?? undefined,
            refrigerantType: f.refrigerantType ?? undefined,
            voltage:         f.voltage         ?? undefined,
            phase:           f.phase           ?? undefined,
            mca:             f.mca             ?? undefined,
            mocp:            f.mocp            ?? undefined,
            rla:             f.rla             ?? undefined,
            capacityTons:    f.capacityTons    ?? undefined,
            manufactureDate: f.manufactureDate ?? undefined,
          },
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      markLinked(scanId);
      onLinked();
    } catch { setError('Failed to link — try again'); }
    finally { setSaving(false); }
  }

  return (
    <div className="pt-2 space-y-2">
      <div className="relative">
        <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
          placeholder="Search equipment records…"
          value={query}
          onChange={e => search(e.target.value)}
          autoFocus
        />
      </div>
      {loading && <div className="flex items-center gap-2 text-gray-500 text-xs py-1"><Loader2 size={10} className="animate-spin" />Searching…</div>}
      {error && <p className="text-[10px] text-red-400">{error}</p>}
      {results.length > 0 && (
        <div className="space-y-1">
          {results.slice(0, 5).map(unit => (
            <button key={unit.id} onClick={() => handleLink(unit)} disabled={saving}
              className="w-full flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-left active:bg-gray-800">
              <Package size={11} className="text-blue-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-white truncate">{unit.siteCustomerName || 'Unknown'}</div>
                <div className="text-[9px] text-gray-500 truncate">{unit.nickname || unit.equipmentType || '—'}</div>
              </div>
              {saving ? <Loader2 size={10} className="animate-spin text-blue-400" /> : <Link2 size={10} className="text-blue-400 flex-shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Single scan card ─────────────────────────────────────────────────────────
function ScanCard({ scan }: { scan: UnassignedScan }) {
  const { updateNote, removeScan } = useUnassignedScans();
  const [expanded,   setExpanded]   = useState(false);
  const [editNote,   setEditNote]   = useState(false);
  const [note,       setNote]       = useState(scan.note);
  const [linking,    setLinking]    = useState(false);
  const [linked,     setLinked]     = useState(!scan.pendingSync);
  const [confirming, setConfirming] = useState(false);

  function saveNote() { updateNote(scan.id, note); setEditNote(false); }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`bg-gray-900 border rounded-2xl overflow-hidden ${linked ? 'border-green-800/40' : 'border-gray-800'}`}
    >
      {/* Header row */}
      <button onClick={() => setExpanded(e => !e)} className="w-full px-4 pt-3.5 pb-3 text-left">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-white text-sm leading-tight">{scan.fields.manufacturer || 'Unknown Manufacturer'}</span>
              {linked
                ? <span className="text-[9px] font-bold bg-green-900/40 text-green-400 border border-green-800/50 px-1.5 py-0.5 rounded-full">Linked</span>
                : <span className="text-[9px] font-bold bg-amber-900/40 text-amber-400 border border-amber-800/50 px-1.5 py-0.5 rounded-full flex items-center gap-1"><AlertTriangle size={7} />Unassigned</span>}
            </div>
            <div className="text-[10px] text-gray-500 mt-0.5 truncate">{fieldSummary(scan.fields)}</div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[9px] text-gray-600 flex items-center gap-1"><Clock size={9} />{formatRelative(scan.scannedAt)}</span>
          </div>
        </div>

        {scan.note && (
          <div className="mt-1.5 text-[10px] text-gray-400 italic truncate">"{scan.note}"</div>
        )}
      </button>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-gray-800">
            <div className="px-4 py-3 space-y-2">
              {/* Key fields */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                {[
                  ['Model',       scan.fields.modelNumber],
                  ['Serial',      scan.fields.serialNumber],
                  ['Type',        scan.fields.equipmentType],
                  ['Voltage',     scan.fields.voltage],
                  ['Refrigerant', scan.fields.refrigerantType],
                  ['Capacity',    scan.fields.capacityTons ? `${scan.fields.capacityTons} Tons` : null],
                ].map(([label, value]) => (
                  <div key={label as string}>
                    <div className="text-[9px] text-gray-600 uppercase tracking-wider">{label}</div>
                    <div className="text-[10px] text-gray-300 font-medium">{value || '—'}</div>
                  </div>
                ))}
              </div>

              {/* Note section */}
              {editNote ? (
                <div className="space-y-2">
                  <textarea
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 resize-none"
                    rows={2} value={note} onChange={e => setNote(e.target.value)}
                    placeholder="Add a note…" autoFocus
                  />
                  <div className="flex gap-2">
                    <button onClick={saveNote} className="flex-1 bg-blue-600 text-white text-xs font-semibold py-2 rounded-xl">Save Note</button>
                    <button onClick={() => { setNote(scan.note); setEditNote(false); }} className="flex-1 bg-gray-800 text-gray-300 text-xs font-semibold py-2 rounded-xl">Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setEditNote(true)} className="flex items-center gap-1.5 text-xs text-gray-500 active:text-gray-300">
                  <Edit2 size={10} /> {scan.note ? 'Edit note' : 'Add note'}
                </button>
              )}

              {/* Link search */}
              {!linked && linking && (
                <UnitSearchInline scanId={scan.id} onLinked={() => { setLinking(false); setLinked(true); }} />
              )}

              {/* Confirmation dialog */}
              {confirming && (
                <div className="bg-red-950/30 border border-red-800/40 rounded-xl px-3 py-2.5 space-y-2">
                  <p className="text-xs text-red-300 font-semibold">Delete this scan?</p>
                  <div className="flex gap-2">
                    <button onClick={() => removeScan(scan.id)} className="flex-1 bg-red-700 text-white text-xs font-bold py-2 rounded-xl">Delete</button>
                    <button onClick={() => setConfirming(false)} className="flex-1 bg-gray-800 text-gray-300 text-xs font-semibold py-2 rounded-xl">Cancel</button>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            {!confirming && !linking && (
              <div className="border-t border-gray-800 flex">
                {!linked ? (
                  <button onClick={() => setLinking(l => !l)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs text-blue-400 font-semibold active:bg-gray-800">
                    <Link2 size={12} /> Link to Unit
                  </button>
                ) : (
                  <div className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs text-green-500">
                    <CheckCircle size={12} /> Linked
                  </div>
                )}
                <div className="w-px bg-gray-800" />
                <button onClick={() => setConfirming(true)}
                  className="flex items-center justify-center gap-1.5 px-4 py-3 text-xs text-red-400 active:bg-gray-800">
                  <Trash2 size={12} />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────
interface Props {
  onClose: () => void;
}

export function UnassignedScansModal({ onClose }: Props) {
  const { scans, pendingCount } = useUnassignedScans();
  const [filter, setFilter] = useState<'all' | 'pending' | 'linked'>('all');

  const displayed =
    filter === 'pending' ? scans.filter(s => s.pendingSync) :
    filter === 'linked'  ? scans.filter(s => !s.pendingSync) :
    scans;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-gray-950"
    >
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 pt-12 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Inbox size={16} className="text-purple-400" />
            <span className="font-bold text-white text-base">Unassigned Scans</span>
            {pendingCount > 0 && (
              <span className="text-[9px] font-black bg-amber-600 text-white px-1.5 py-0.5 rounded-full">{pendingCount}</span>
            )}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-gray-800 flex items-center justify-center">
            <X size={14} className="text-gray-400" />
          </button>
        </div>

        {scans.length > 0 && (
          <div className="flex gap-1.5">
            {(['all', 'pending', 'linked'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-full text-[10px] font-semibold transition-colors ${
                  filter === f ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400'
                }`}>
                {f === 'all' ? `All (${scans.length})` : f === 'pending' ? `Pending (${pendingCount})` : `Linked (${scans.length - pendingCount})`}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Storage note */}
      {scans.length > 0 && (
        <div className="mx-4 mt-3 bg-gray-900 border border-gray-800 rounded-xl px-3 py-2">
          <p className="text-[9px] text-gray-600 leading-relaxed">
            Unassigned scans are stored locally on this device only. Tap a scan to link it to an equipment record.
          </p>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {scans.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center">
              <Inbox size={28} className="text-gray-600" />
            </div>
            <div>
              <div className="font-bold text-white text-base mb-1">No unassigned scans</div>
              <div className="text-xs text-gray-500 max-w-xs leading-relaxed">
                When you scan a nameplate and choose "Save as Unassigned," it appears here.
              </div>
            </div>
            <button onClick={onClose}
              className="bg-gray-800 border border-gray-700 text-white font-semibold px-6 py-3 rounded-2xl text-sm">
              Close
            </button>
          </div>
        )}

        {displayed.length === 0 && scans.length > 0 && (
          <div className="text-center py-8 text-gray-500 text-xs">No scans matching this filter.</div>
        )}

        <AnimatePresence>
          {displayed.map(scan => <ScanCard key={scan.id} scan={scan} />)}
        </AnimatePresence>
      </div>

      {/* Footer CTA */}
      {scans.length > 0 && (
        <div className="px-4 pb-8 pt-2 border-t border-gray-800">
          <div className="flex items-center gap-1.5 justify-center text-[9px] text-gray-600">
            <AlertTriangle size={9} />
            Scans are device-local. Clearing browser data removes them. Link to equipment to persist permanently.
          </div>
        </div>
      )}
    </motion.div>
  );
}
