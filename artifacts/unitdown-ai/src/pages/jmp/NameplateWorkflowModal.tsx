import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Camera, CheckCircle, AlertTriangle, RefreshCw, Edit2,
  ChevronRight, Search, Plus, Inbox, Loader2,
  Zap, Link2, Package, UserPlus, Save, Copy, ChevronDown, ChevronUp,
  Wrench,
} from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import NameplateScannerModal from '../../components/NameplateScannerModal';
import { useUnassignedScans, type NameplateFields } from './useUnassignedScans';

// ─── Parts lookup types (mirror server-side PartsLookupResult) ────────────────
interface PartsLookupResult {
  filterSize:    string | null;
  filterQty:     string | null;
  beltSize:      string | null;
  beltQty:       string | null;
  beltType:      string | null;
  beltNotes:     string | null;
  oemFilterPart: string | null;
  oemBeltPart:   string | null;
  confidence:    'high' | 'medium' | 'verify_required';
  source:        string | null;
  notes:         string | null;
}

interface ConfirmedParts {
  filterSize: string | null;
  filterQty:  string | null;
  beltSize:   string | null;
  beltQty:    string | null;
  beltNotes:  string | null;
  maintenanceVerifiedAt: string;
}

// ─── Auth helper ──────────────────────────────────────────────────────────────
function getClientId(): string {
  try { return localStorage.getItem('unitdown_client_id') ?? ''; } catch { return ''; }
}

// ─── Screen types ─────────────────────────────────────────────────────────────
type Screen =
  | 'scanning'
  | 'ocr_loading'
  | 'ocr_result'
  | 'ocr_failed'
  | 'manual_entry'
  | 'choose_action'
  | 'link_existing'
  | 'customer_search'
  | 'new_unit_form'
  | 'create_new'
  | 'save_unassigned'
  | 'success';

// ─── Unit search result type ──────────────────────────────────────────────────
interface UnitResult {
  id: string;
  nickname?: string | null;
  siteCustomerName?: string | null;
  location?: string | null;
  manufacturer?: string | null;
  modelNumber?: string | null;
  serialNumber?: string | null;
  equipmentType?: string | null;
}

// ─── Shared field display ─────────────────────────────────────────────────────
interface FieldRowProps {
  label:   string;
  value:   string | null | undefined;
  review?: boolean;
  missing?: boolean;
}

function FieldRow({ label, value, review, missing }: FieldRowProps) {
  if (!value && !missing) return null;
  return (
    <div className="flex items-start justify-between gap-2 py-1.5 border-b border-gray-800/50 last:border-0">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 flex-shrink-0 w-28">{label}</span>
      <div className="flex items-center gap-1.5 flex-1 justify-end">
        {value
          ? <span className="text-xs text-right text-white font-medium">{value}</span>
          : <span className="text-[10px] text-gray-600 italic">Not detected</span>}
        {review && value && <span className="text-[8px] bg-amber-900/50 text-amber-400 border border-amber-800/50 px-1 py-0.5 rounded flex-shrink-0">Review</span>}
        {missing && !value && <span className="text-[8px] bg-gray-800 text-gray-600 border border-gray-700 px-1 py-0.5 rounded flex-shrink-0">Missing</span>}
      </div>
    </div>
  );
}

// ─── Confidence bar ───────────────────────────────────────────────────────────
function ConfidenceBar({ confidence }: { confidence: number }) {
  const pct  = Math.min(100, Math.max(0, Math.round(confidence)));
  const cls  = pct >= 75 ? 'bg-green-500'  : pct >= 45 ? 'bg-amber-500' : 'bg-red-500';
  const text = pct >= 75 ? 'text-green-400' : pct >= 45 ? 'text-amber-400' : 'text-red-400';
  const label = pct >= 75 ? 'High confidence' : pct >= 45 ? 'Medium — review flagged fields' : 'Low — verify all fields';
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-500 font-semibold">OCR Confidence</span>
        <span className={`text-[10px] font-bold ${text}`}>{pct}% — {label}</span>
      </div>
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: 'easeOut' }} className={`h-full rounded-full ${cls}`} />
      </div>
    </div>
  );
}

// ─── Screen header ─────────────────────────────────────────────────────────────
function ScreenHeader({ title, subtitle, onBack, onClose }: { title: string; subtitle?: string; onBack?: () => void; onClose?: () => void }) {
  return (
    <div className="px-4 py-4 border-b border-gray-800 flex items-center gap-3 flex-shrink-0">
      {onBack && (
        <button onClick={onBack} className="w-8 h-8 rounded-xl bg-gray-800 flex items-center justify-center flex-shrink-0">
          <X size={14} className="text-gray-400" />
        </button>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-bold text-white text-sm">{title}</div>
        {subtitle && <div className="text-[10px] text-gray-500">{subtitle}</div>}
      </div>
      {onClose && (
        <button onClick={onClose} className="w-8 h-8 rounded-xl bg-gray-800 flex items-center justify-center flex-shrink-0">
          <X size={14} className="text-gray-400" />
        </button>
      )}
    </div>
  );
}

// ─── Extracted fields panel ────────────────────────────────────────────────────
function ExtractedFieldsPanel({ fields }: { fields: NameplateFields }) {
  const review  = new Set(fields.reviewFields ?? []);
  const missing = new Set(fields.missing_fields ?? []);
  const f       = fields;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3">
      <FieldRow label="Manufacturer"  value={f.manufacturer}     review={review.has('manufacturer')}  missing={missing.has('manufacturer')} />
      <FieldRow label="Model"         value={f.modelNumber}      review={review.has('modelNumber')}   missing={missing.has('modelNumber')} />
      <FieldRow label="Serial"        value={f.serialNumber}     review={review.has('serialNumber')}  missing={missing.has('serialNumber')} />
      {f.manufactureDate && <FieldRow label="Mfg Date"     value={f.manufactureDate} review={review.has('manufactureDate')} />}
      <FieldRow label="Equip Type"    value={f.equipmentType}    review={review.has('equipmentType')} missing={missing.has('equipmentType')} />
      <FieldRow label="System"        value={f.systemType}       review={review.has('systemType')}    />
      {f.capacityTons && <FieldRow label="Cooling Tons"  value={`${f.capacityTons} Tons`} review={review.has('capacityTons')} />}
      {f.coolingCapacity && <FieldRow label="Cooling BTUH" value={f.coolingCapacity} />}
      {f.heatingCapacity && <FieldRow label="Heating BTUH" value={f.heatingCapacity} />}
      {f.gasType && <FieldRow label="Gas Type"     value={f.gasType}    />}
      <FieldRow label="Refrigerant"   value={f.refrigerantType}  review={review.has('refrigerantType')} missing={missing.has('refrigerantType')} />
      {f.refrigerantCharge && <FieldRow label="Ref Charge"   value={f.refrigerantCharge} />}
      <FieldRow label="Voltage"       value={f.voltage}          review={review.has('voltage')}       missing={missing.has('voltage')} />
      {(f.phase || f.hertz) && <FieldRow label="Phase / Hz"   value={[f.phase ? `${f.phase}Ø` : null, f.hertz ? `${f.hertz}Hz` : null].filter(Boolean).join(' / ')} />}
      {f.mca   && <FieldRow label="MCA"          value={`${f.mca}A`}  />}
      {f.mocp  && <FieldRow label="MOCP"         value={`${f.mocp}A`} />}
      {f.rla   && <FieldRow label="RLA / FLA"    value={`${f.rla}A`}  />}
      {f.lra   && <FieldRow label="LRA"          value={`${f.lra}A`}  />}
    </div>
  );
}

// ─── Vendor app copy formatter ─────────────────────────────────────────────────
function formatForVendorApp(f: NameplateFields): string {
  const row = (label: string, value: string | null | undefined) =>
    value ? `${label}: ${value}` : null;

  const voltLine = [f.voltage, f.phase ? `${f.phase}Ø` : null, f.hertz ? `${f.hertz}Hz` : null]
    .filter(Boolean).join(' / ');

  return [
    row('Manufacturer',  f.manufacturer),
    row('Model',         f.modelNumber),
    row('Serial',        f.serialNumber),
    row('Year',          f.manufactureDate),
    row('Equipment Type',f.equipmentType),
    row('System Type',   f.systemType),
    f.capacityTons ? `Cooling Tons: ${f.capacityTons}T` : null,
    row('Cooling BTUH',  f.coolingCapacity),
    voltLine ? `Voltage: ${voltLine}` : null,
    row('Refrigerant',   f.refrigerantType ? `${f.refrigerantType}${f.refrigerantCharge ? ' — ' + f.refrigerantCharge : ''}` : null),
    row('Heat Type',     f.systemType?.includes('heat') || f.systemType?.includes('pump') ? f.systemType : null),
    row('Heat BTUH',     f.heatingCapacity),
    row('Gas',           f.gasType),
    row('MCA',           f.mca ? `${f.mca}A` : null),
    row('MOCP',          f.mocp ? `${f.mocp}A` : null),
    row('RLA / FLA',     f.rla  ? `${f.rla}A`  : null),
    row('LRA',           f.lra  ? `${f.lra}A`  : null),
  ].filter(Boolean).join('\n');
}

// ─── Unit search hook ─────────────────────────────────────────────────────────
function useUnitSearch() {
  const [query,    setQuery]   = useState('');
  const [results,  setResults] = useState<UnitResult[]>([]);
  const [loading,  setLoading] = useState(false);
  const [error,    setError]   = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    setQuery(q);
    if (timer.current) clearTimeout(timer.current);
    if (!q.trim()) { setResults([]); setLoading(false); return; }
    timer.current = setTimeout(async () => {
      setLoading(true); setError('');
      try {
        const clientId = getClientId();
        const url = `/api/units?clientId=${encodeURIComponent(clientId)}&q=${encodeURIComponent(q)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Search failed');
        const data = await res.json();
        setResults(data.units ?? []);
      } catch { setError('Search unavailable offline'); }
      finally { setLoading(false); }
    }, 300);
  }, []);

  return { query, results, loading, error, search };
}

// ─── Manual entry form ────────────────────────────────────────────────────────
function ManualEntryScreen({
  initial, onSave, onBack,
}: { initial: NameplateFields; onSave: (f: NameplateFields) => void; onBack: () => void }) {
  const [f, setF] = useState<NameplateFields>({ ...initial });
  const set = <K extends keyof NameplateFields>(k: K, v: string) => setF(p => ({ ...p, [k]: v || null }));
  const inp = 'w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors';

  function Label({ children }: { children: React.ReactNode }) {
    return <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">{children}</label>;
  }

  return (
    <div className="flex flex-col h-full">
      <ScreenHeader title="Enter Nameplate Data" subtitle="Fill in what you can read" onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Manufacturer</Label><input className={inp} value={f.manufacturer ?? ''} onChange={e => set('manufacturer', e.target.value)} placeholder="Lennox, Carrier…" /></div>
          <div><Label>Equipment Type</Label><input className={inp} value={f.equipmentType ?? ''} onChange={e => set('equipmentType', e.target.value)} placeholder="RTU, Split…" /></div>
        </div>
        <div><Label>Model Number</Label><input className={inp} value={f.modelNumber ?? ''} onChange={e => set('modelNumber', e.target.value)} placeholder="Model / Catalog #" /></div>
        <div><Label>Serial Number</Label><input className={inp} value={f.serialNumber ?? ''} onChange={e => set('serialNumber', e.target.value)} placeholder="Serial #" /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Voltage</Label><input className={inp} value={f.voltage ?? ''} onChange={e => set('voltage', e.target.value)} placeholder="208/230" /></div>
          <div><Label>Phase</Label><input className={inp} value={f.phase ?? ''} onChange={e => set('phase', e.target.value)} placeholder="1 or 3" /></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Refrigerant</Label><input className={inp} value={f.refrigerantType ?? ''} onChange={e => set('refrigerantType', e.target.value)} placeholder="R-410A" /></div>
          <div><Label>Capacity Tons</Label><input className={inp} value={f.capacityTons ?? ''} onChange={e => set('capacityTons', e.target.value)} placeholder="5.0" /></div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div><Label>MCA</Label><input className={inp} value={f.mca ?? ''} onChange={e => set('mca', e.target.value)} placeholder="amps" /></div>
          <div><Label>MOCP</Label><input className={inp} value={f.mocp ?? ''} onChange={e => set('mocp', e.target.value)} placeholder="amps" /></div>
          <div><Label>RLA</Label><input className={inp} value={f.rla ?? ''} onChange={e => set('rla', e.target.value)} placeholder="amps" /></div>
        </div>
        <div><Label>Manufacture Date</Label><input className={inp} value={f.manufactureDate ?? ''} onChange={e => set('manufactureDate', e.target.value)} placeholder="Jan 2018" /></div>
      </div>
      <div className="px-4 pb-6 pt-2">
        <button onClick={() => onSave(f)} className="w-full bg-white text-gray-950 font-bold py-4 rounded-2xl text-sm active:scale-[0.98] transition-transform">
          Save &amp; Continue
        </button>
      </div>
    </div>
  );
}

// ─── Link existing unit screen ────────────────────────────────────────────────
function LinkExistingScreen({
  fields, confirmedParts, onLinked, onBack,
}: { fields: NameplateFields; confirmedParts?: ConfirmedParts | null; onLinked: () => void; onBack: () => void }) {
  const { query, results, loading, error, search } = useUnitSearch();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [selected, setSelected] = useState<UnitResult | null>(null);

  async function handleLink() {
    if (!selected) return;
    setSaving(true); setSaveError('');
    try {
      const clientId = getClientId();
      const res = await fetch(`/api/units/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          unit: {
            manufacturer:    fields.manufacturer    ?? undefined,
            modelNumber:     fields.modelNumber     ?? undefined,
            serialNumber:    fields.serialNumber    ?? undefined,
            equipmentType:   fields.equipmentType   ?? undefined,
            systemType:      fields.systemType      ?? undefined,
            refrigerantType: fields.refrigerantType ?? undefined,
            voltage:         fields.voltage         ?? undefined,
            phase:           fields.phase           ?? undefined,
            mca:             fields.mca             ?? undefined,
            mocp:            fields.mocp            ?? undefined,
            rla:             fields.rla             ?? undefined,
            lra:             fields.lra             ?? undefined,
            capacityTons:    fields.capacityTons    ?? undefined,
            manufactureDate: fields.manufactureDate ?? undefined,
            ...(confirmedParts ? {
              filterSize:            confirmedParts.filterSize,
              filterQty:             confirmedParts.filterQty,
              beltSize:              confirmedParts.beltSize,
              beltQty:               confirmedParts.beltQty,
              beltNotes:             confirmedParts.beltNotes,
              maintenanceVerifiedAt: confirmedParts.maintenanceVerifiedAt,
            } : {}),
          },
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as { error?: string }).error ?? 'Save failed');
      }
      onLinked();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
    } finally { setSaving(false); }
  }

  return (
    <div className="flex flex-col h-full">
      <ScreenHeader title="Link to Existing Unit" subtitle="Search your equipment records" onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
            placeholder="Search by customer, model, serial, tag…"
            value={query}
            onChange={e => search(e.target.value)}
            autoFocus
          />
        </div>

        {selected && (
          <div className="bg-blue-950/40 border border-blue-700 rounded-2xl px-4 py-3">
            <div className="text-[10px] font-bold text-blue-400 mb-1">Selected</div>
            <div className="text-sm font-bold text-white">{selected.siteCustomerName || 'Unknown Customer'}</div>
            <div className="text-xs text-gray-400">{selected.nickname || selected.equipmentType || 'Equipment'}</div>
            {selected.modelNumber && <div className="text-[10px] text-gray-500 font-mono">{selected.modelNumber}</div>}
            {saveError && <p className="text-xs text-red-400 mt-1">{saveError}</p>}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center gap-2 py-6 text-gray-500">
            <Loader2 size={14} className="animate-spin" />
            <span className="text-xs">Searching…</span>
          </div>
        )}
        {error && <p className="text-xs text-red-400">{error}</p>}

        {!loading && results.length > 0 && (
          <div className="space-y-1.5">
            {results.map(unit => (
              <button
                key={unit.id}
                onClick={() => setSelected(unit)}
                className={`w-full flex items-start gap-3 rounded-2xl px-4 py-3 text-left border transition-colors ${
                  selected?.id === unit.id
                    ? 'bg-blue-900/30 border-blue-700'
                    : 'bg-gray-900 border-gray-800 active:bg-gray-800'
                }`}
              >
                <Package size={14} className="text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{unit.siteCustomerName || 'Unknown Customer'}</div>
                  <div className="text-xs text-gray-400 truncate">{unit.nickname || unit.equipmentType || '—'}</div>
                  {unit.modelNumber && <div className="text-[10px] font-mono text-gray-600 truncate">{unit.modelNumber}</div>}
                </div>
              </button>
            ))}
          </div>
        )}

        {!loading && query && results.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-xs">No units found — try a different search</div>
        )}

        {!query && (
          <div className="text-center py-8 text-gray-600 text-[11px]">Search by customer name, model, or serial number</div>
        )}
      </div>

      {selected && (
        <div className="px-4 pb-6 pt-2">
          <button
            onClick={handleLink}
            disabled={saving}
            className="w-full bg-white text-gray-950 font-bold py-4 rounded-2xl text-sm active:scale-[0.98] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Link2 size={14} /> Link Nameplate to This Unit</>}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Customer search + new unit form ──────────────────────────────────────────
function CustomerSearchScreen({
  fields, confirmedParts, onCreated, onBack,
}: { fields: NameplateFields; confirmedParts?: ConfirmedParts | null; onCreated: () => void; onBack: () => void }) {
  const { query, results, loading, search } = useUnitSearch();
  const [customerName, setCustomerName] = useState('');
  const [phase2, setPhase2] = useState(false); // when true, show new unit form

  // Extract distinct customer names from results
  const customers = Array.from(new Set(results.map(u => u.siteCustomerName).filter(Boolean) as string[]));

  function pickCustomer(name: string) {
    setCustomerName(name);
    setPhase2(true);
  }

  if (phase2) {
    return <NewUnitFormScreen customerName={customerName} fields={fields} confirmedParts={confirmedParts} onCreated={onCreated} onBack={() => setPhase2(false)} />;
  }

  return (
    <div className="flex flex-col h-full">
      <ScreenHeader title="Select Customer" subtitle="Search existing or type a new name" onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
            placeholder="Search customers…"
            value={query}
            onChange={e => { search(e.target.value); setCustomerName(e.target.value); }}
            autoFocus
          />
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-4 text-gray-500">
            <Loader2 size={14} className="animate-spin" />
            <span className="text-xs">Searching…</span>
          </div>
        )}

        {/* Exact or new customer entry */}
        {query.trim() && (
          <button
            onClick={() => pickCustomer(query.trim())}
            className="w-full flex items-center gap-3 bg-green-900/20 border border-green-800/50 rounded-2xl px-4 py-3 text-left active:bg-green-900/30"
          >
            <Plus size={14} className="text-green-400 flex-shrink-0" />
            <div>
              <div className="text-sm font-semibold text-white">Use "{query.trim()}"</div>
              <div className="text-[10px] text-gray-500">Add a new unit under this customer</div>
            </div>
          </button>
        )}

        {customers.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Existing Customers</div>
            {customers.slice(0, 10).map(name => (
              <button
                key={name}
                onClick={() => pickCustomer(name)}
                className="w-full flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3 text-left active:bg-gray-800"
              >
                <UserPlus size={14} className="text-blue-400 flex-shrink-0" />
                <span className="text-sm text-white">{name}</span>
                <ChevronRight size={12} className="text-gray-600 ml-auto" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── New unit form ─────────────────────────────────────────────────────────────
function NewUnitFormScreen({
  customerName, fields, confirmedParts, onCreated, onBack,
}: { customerName: string; fields: NameplateFields; confirmedParts?: ConfirmedParts | null; onCreated: () => void; onBack: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [nickname, setNickname] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  const inp = 'w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500';

  async function handleCreate() {
    setSaving(true); setError('');
    try {
      const clientId = getClientId();
      const res = await fetch('/api/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          unit: {
            siteCustomerName: customerName,
            nickname:         nickname.trim() || null,
            location:         location.trim() || null,
            manufacturer:     fields.manufacturer    ?? null,
            modelNumber:      fields.modelNumber     ?? null,
            serialNumber:     fields.serialNumber    ?? null,
            equipmentType:    fields.equipmentType   ?? null,
            systemType:       fields.systemType      ?? null,
            refrigerantType:  fields.refrigerantType ?? null,
            voltage:          fields.voltage         ?? null,
            phase:            fields.phase           ?? null,
            mca:              fields.mca             ?? null,
            mocp:             fields.mocp            ?? null,
            rla:              fields.rla             ?? null,
            lra:              fields.lra             ?? null,
            capacityTons:     fields.capacityTons    ?? null,
            manufactureDate:  fields.manufactureDate ?? null,
            notes:            notes.trim()           || null,
            ...(confirmedParts ? {
              filterSize:            confirmedParts.filterSize,
              filterQty:             confirmedParts.filterQty,
              beltSize:              confirmedParts.beltSize,
              beltQty:               confirmedParts.beltQty,
              beltNotes:             confirmedParts.beltNotes,
              maintenanceVerifiedAt: confirmedParts.maintenanceVerifiedAt,
            } : {}),
          },
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as { error?: string }).error ?? 'Failed to create unit');
      }
      onCreated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally { setSaving(false); }
  }

  return (
    <div className="flex flex-col h-full">
      <ScreenHeader title="New Unit" subtitle={`Customer: ${customerName}`} onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <div className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-2">
          <div className="text-[10px] text-gray-500 font-semibold">Prefilled from nameplate scan</div>
          <div className="text-xs text-gray-300 mt-0.5">
            {[fields.manufacturer, fields.modelNumber, fields.equipmentType].filter(Boolean).join(' · ') || 'No OCR data'}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Unit Tag / Nickname</label>
          <input className={inp} value={nickname} onChange={e => setNickname(e.target.value)} placeholder="RTU-1, AHU-3, Rooftop East…" autoFocus />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Location / Site</label>
          <input className={inp} value={location} onChange={e => setLocation(e.target.value)} placeholder="Building, floor, or area" />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Notes</label>
          <textarea className={`${inp} resize-none`} rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Tech notes" />
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
      <div className="px-4 pb-6 pt-2">
        <button
          onClick={handleCreate}
          disabled={saving}
          className="w-full bg-white text-gray-950 font-bold py-4 rounded-2xl text-sm active:scale-[0.98] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? <><Loader2 size={14} className="animate-spin" /> Creating…</> : <><Plus size={14} /> Create Unit</>}
        </button>
      </div>
    </div>
  );
}

// ─── Create new customer + unit ────────────────────────────────────────────────
function CreateNewScreen({
  fields, confirmedParts, onCreated, onBack,
}: { fields: NameplateFields; confirmedParts?: ConfirmedParts | null; onCreated: () => void; onBack: () => void }) {
  const [customerName, setCustomerName] = useState('');
  const [phase2, setPhase2] = useState(false);

  if (phase2 && customerName.trim()) {
    return <NewUnitFormScreen customerName={customerName.trim()} fields={fields} confirmedParts={confirmedParts} onCreated={onCreated} onBack={() => setPhase2(false)} />;
  }

  const inp = 'w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500';

  return (
    <div className="flex flex-col h-full">
      <ScreenHeader title="New Customer + Unit" subtitle="Create customer and equipment record" onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <div className="bg-blue-950/30 border border-blue-800/40 rounded-xl px-3 py-2.5">
          <p className="text-[10px] text-blue-300">Enter the customer name. You'll add unit details next.</p>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Customer / Account Name *</label>
          <input
            className={inp}
            value={customerName}
            onChange={e => setCustomerName(e.target.value)}
            placeholder="Business or site name"
            autoFocus
          />
        </div>
      </div>
      <div className="px-4 pb-6 pt-2">
        <button
          onClick={() => { if (customerName.trim()) setPhase2(true); }}
          disabled={!customerName.trim()}
          className="w-full bg-white text-gray-950 font-bold py-4 rounded-2xl text-sm active:scale-[0.98] transition-transform disabled:opacity-40"
        >
          Next — Unit Details
        </button>
      </div>
    </div>
  );
}

// ─── Save unassigned screen ────────────────────────────────────────────────────
function SaveUnassignedScreen({
  fields, onSaved, onBack,
}: { fields: NameplateFields; onSaved: () => void; onBack: () => void }) {
  const { addScan } = useUnassignedScans();
  const [note, setNote] = useState('');

  function handleSave() {
    addScan(fields, note.trim());
    onSaved();
  }

  return (
    <div className="flex flex-col h-full">
      <ScreenHeader title="Save as Unassigned" subtitle="Link to a customer later" onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <div className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-2.5 space-y-1">
          <div className="text-[10px] font-semibold text-gray-500">Nameplate data saved</div>
          <div className="text-xs text-gray-300">
            {[fields.manufacturer, fields.modelNumber, fields.equipmentType].filter(Boolean).join(' · ') || 'Manually entered data'}
          </div>
        </div>

        <div className="bg-amber-950/25 border border-amber-800/40 rounded-xl px-3 py-2.5">
          <p className="text-[10px] text-amber-400 font-semibold">Stored locally</p>
          <p className="text-[10px] text-gray-400 leading-relaxed mt-0.5">
            This scan is saved on your device only. Link it to an equipment record when ready — from Unassigned Scans in the menu.
          </p>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Technician Note (optional)</label>
          <textarea
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 resize-none"
            rows={3}
            placeholder='e.g. "Back office RTU — need customer match later"'
            value={note}
            onChange={e => setNote(e.target.value)}
            autoFocus
          />
        </div>
      </div>
      <div className="px-4 pb-6 pt-2">
        <button onClick={handleSave} className="w-full bg-white text-gray-950 font-bold py-4 rounded-2xl text-sm active:scale-[0.98] transition-transform">
          <span className="flex items-center justify-center gap-2"><Save size={14} /> Save Unassigned Scan</span>
        </button>
      </div>
    </div>
  );
}

// ─── Parts lookup card (shown on ocr_result screen) ───────────────────────────
function PartsLookupCard({
  result, loading, confirmed, onConfirm, onClear,
}: {
  result:    PartsLookupResult | null;
  loading:   boolean;
  confirmed: ConfirmedParts | null;
  onConfirm: (p: ConfirmedParts) => void;
  onClear:   () => void;
}) {
  const [open,       setOpen]       = useState(true);
  const [editing,    setEditing]    = useState(false);
  const [filterSize, setFilterSize] = useState('');
  const [filterQty,  setFilterQty]  = useState('');
  const [beltSize,   setBeltSize]   = useState('');
  const [beltQty,    setBeltQty]    = useState('');
  const [beltNotes,  setBeltNotes]  = useState('');

  // Sync editable state when lookup result arrives
  useEffect(() => {
    if (!result) return;
    setFilterSize(result.filterSize ?? '');
    setFilterQty(result.filterQty ?? '');
    setBeltSize(result.beltSize ?? '');
    setBeltQty(result.beltQty ?? '');
    setBeltNotes(result.beltNotes ?? '');
    // Auto-enter edit mode when verify required so tech sees empty fields immediately
    setEditing(result.confidence === 'verify_required');
  }, [result]);

  // Sync editable state when confirmed parts are set externally
  useEffect(() => {
    if (!confirmed) return;
    setFilterSize(confirmed.filterSize ?? '');
    setFilterQty(confirmed.filterQty ?? '');
    setBeltSize(confirmed.beltSize ?? '');
    setBeltQty(confirmed.beltQty ?? '');
    setBeltNotes(confirmed.beltNotes ?? '');
  }, [confirmed]);

  const inp = 'w-full bg-gray-700 border border-gray-600 rounded-lg px-2.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors';

  const badge =
    !result    ? null :
    result.confidence === 'high'             ? { cls: 'bg-green-900/40 text-green-400 border-green-800/50',  label: 'Match Found' } :
    result.confidence === 'medium'           ? { cls: 'bg-amber-900/40 text-amber-400 border-amber-800/50', label: 'Verify Recommended' } :
                                               { cls: 'bg-red-900/30  text-red-400   border-red-800/40',    label: 'Verify Required' };

  function handleConfirm() {
    const cp: ConfirmedParts = {
      filterSize: filterSize.trim() || null,
      filterQty:  filterQty.trim()  || null,
      beltSize:   beltSize.trim()   || null,
      beltQty:    beltQty.trim()    || null,
      beltNotes:  beltNotes.trim()  || null,
      maintenanceVerifiedAt: new Date().toISOString().slice(0, 10),
    };
    onConfirm(cp);
    setEditing(false);
  }

  const isEditing = editing || (!confirmed && !loading && !!result);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <Wrench size={12} className="text-blue-400 flex-shrink-0" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Maintenance Parts</span>
          {confirmed && !editing && (
            <span className="text-[8px] bg-green-900/40 text-green-400 border border-green-800/50 px-1.5 py-0.5 rounded font-bold">CONFIRMED</span>
          )}
          {!confirmed && badge && (
            <span className={`text-[8px] border px-1.5 py-0.5 rounded font-bold ${badge.cls}`}>{badge.label}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {loading && <Loader2 size={10} className="animate-spin text-gray-500" />}
          {open ? <ChevronUp size={12} className="text-gray-600" /> : <ChevronDown size={12} className="text-gray-600" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">

          {/* Loading state */}
          {loading && (
            <div className="flex items-center gap-2 py-1 text-gray-500">
              <Loader2 size={12} className="animate-spin" />
              <span className="text-xs">Looking up parts data…</span>
            </div>
          )}

          {/* Source note */}
          {!loading && result?.source && (
            <div className="text-[10px] text-gray-600">Source: {result.source}</div>
          )}

          {/* Guidance note */}
          {!loading && result?.notes && (
            <div className="bg-gray-800/60 rounded-xl px-3 py-2">
              <p className="text-[10px] text-gray-400 leading-relaxed">{result.notes}</p>
            </div>
          )}

          {/* Belt notes (IOM reminder) */}
          {!loading && result?.beltNotes && !isEditing && (
            <div className="bg-amber-950/20 border border-amber-900/40 rounded-xl px-3 py-2">
              <p className="text-[10px] text-amber-400 leading-relaxed">{result.beltNotes}</p>
            </div>
          )}

          {/* Confirmed read-only view */}
          {confirmed && !editing && !loading && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-800/60 rounded-xl px-3 py-2">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Filter Size</div>
                  <div className="text-xs text-white font-medium mt-0.5">{confirmed.filterSize || '—'}</div>
                </div>
                <div className="bg-gray-800/60 rounded-xl px-3 py-2">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Filter Qty</div>
                  <div className="text-xs text-white font-medium mt-0.5">{confirmed.filterQty || '—'}</div>
                </div>
                <div className="bg-gray-800/60 rounded-xl px-3 py-2">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Belt Size</div>
                  <div className="text-xs text-white font-medium mt-0.5">{confirmed.beltSize || '—'}</div>
                </div>
                <div className="bg-gray-800/60 rounded-xl px-3 py-2">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Belt Qty</div>
                  <div className="text-xs text-white font-medium mt-0.5">{confirmed.beltQty || '—'}</div>
                </div>
              </div>
              {confirmed.beltNotes && (
                <div className="bg-gray-800/60 rounded-xl px-3 py-2">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-0.5">Belt Notes</div>
                  <div className="text-[10px] text-gray-400 leading-relaxed">{confirmed.beltNotes}</div>
                </div>
              )}
              <div className="text-[10px] text-gray-600">Verified: {confirmed.maintenanceVerifiedAt}</div>
              <div className="flex gap-2">
                <button onClick={() => setEditing(true)}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-xl py-2 text-xs font-semibold text-gray-300 active:bg-gray-700">
                  Edit
                </button>
                <button onClick={onClear}
                  className="px-3 bg-gray-800 border border-gray-700 rounded-xl py-2 text-xs text-gray-500 active:bg-gray-700">
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Edit / entry form */}
          {!loading && isEditing && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-1">Filter Size</label>
                  <input className={inp} value={filterSize} onChange={e => setFilterSize(e.target.value)} placeholder="e.g. 20×25×2" />
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-1">Filter Qty</label>
                  <input className={inp} value={filterQty} onChange={e => setFilterQty(e.target.value)} placeholder="e.g. 4" />
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-1">Belt Size</label>
                  <input className={inp} value={beltSize} onChange={e => setBeltSize(e.target.value)} placeholder="e.g. B55" />
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-1">Belt Qty</label>
                  <input className={inp} value={beltQty} onChange={e => setBeltQty(e.target.value)} placeholder="e.g. 1" />
                </div>
              </div>
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-1">Belt Notes</label>
                <input className={inp} value={beltNotes} onChange={e => setBeltNotes(e.target.value)} placeholder="e.g. B-section, verify with IOM" />
              </div>
              <button onClick={handleConfirm}
                className="w-full bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs active:bg-blue-600 transition-colors flex items-center justify-center gap-1.5">
                <CheckCircle size={12} /> Confirm &amp; Save to Unit Record
              </button>
              {confirmed && (
                <button onClick={() => setEditing(false)}
                  className="w-full bg-gray-800 border border-gray-700 text-gray-300 font-semibold py-2 rounded-xl text-xs active:bg-gray-700">
                  Cancel
                </button>
              )}
            </div>
          )}

          {/* Empty state — no result and not loading */}
          {!loading && !result && (
            <div className="text-[10px] text-gray-600 py-1">
              Enter manufacturer and model number to look up filter and belt data.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────
interface Props {
  onClose: () => void;
  onViewUnassigned?: () => void;
}

export function NameplateWorkflowModal({ onClose, onViewUnassigned }: Props) {
  useUser(); // ensure Clerk context is loaded
  const { pendingCount } = useUnassignedScans();

  const [screen,        setScreen]        = useState<Screen>('scanning');
  const [scannerOpen,   setScannerOpen]   = useState(true);
  const [fields,        setFields]        = useState<NameplateFields>({});
  const [previewUrl,    setPreviewUrl]    = useState<string | null>(null);
  const [ocrLoading,    setOcrLoading]    = useState(false);
  const [ocrError,      setOcrError]      = useState('');
  const [successMsg,    setSuccessMsg]    = useState('');
  const [rawExpanded,   setRawExpanded]   = useState(false);
  const [copyToast,     setCopyToast]     = useState(false);
  const [partsResult,   setPartsResult]   = useState<PartsLookupResult | null>(null);
  const [partsLoading,  setPartsLoading]  = useState(false);
  const [confirmedParts, setConfirmedParts] = useState<ConfirmedParts | null>(null);

  // ── Auto-fetch parts lookup when OCR result is ready ──────────────────────
  useEffect(() => {
    if (screen !== 'ocr_result') return;
    if (!fields.manufacturer && !fields.modelNumber) return;
    let cancelled = false;
    setPartsLoading(true);
    setPartsResult(null);
    fetch('/api/nameplate/parts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ manufacturer: fields.manufacturer, modelNumber: fields.modelNumber }),
    })
      .then(r => r.json())
      .then(d => { if (!cancelled) setPartsResult((d as { parts: PartsLookupResult }).parts ?? null); })
      .catch(() => { /* silent fail — parts lookup is best-effort */ })
      .finally(() => { if (!cancelled) setPartsLoading(false); });
    return () => { cancelled = true; };
  }, [screen, fields.manufacturer, fields.modelNumber]);

  // ── Camera capture → run OCR ───────────────────────────────────────────────
  const handleCapture = useCallback(async (blob: Blob, capturedPreviewUrl: string) => {
    setScannerOpen(false);
    setScreen('ocr_loading');
    setOcrLoading(true);
    setOcrError('');
    setPreviewUrl(capturedPreviewUrl);
    setRawExpanded(false);

    try {
      const fd = new FormData();
      fd.append('file', blob, 'nameplate.jpg');
      const res = await fetch('/api/nameplate/ocr', { method: 'POST', body: fd });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as { error?: string }).error ?? 'OCR request failed');
      }
      const data = await res.json();
      const ext  = (data.extracted ?? {}) as NameplateFields & { error?: string };

      if (typeof ext.error === 'string') throw new Error(ext.error);

      // Count meaningful fields
      const coreFields = ['manufacturer','modelNumber','serialNumber','equipmentType','refrigerantType','voltage'];
      const filled = coreFields.filter(k => ext[k as keyof NameplateFields]);
      if (filled.length === 0 && !ext.rawText) throw new Error('no_fields');

      setFields(ext);
      setPartsResult(null);
      setConfirmedParts(null);
      setScreen('ocr_result');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'OCR failed';
      setOcrError(msg === 'no_fields'
        ? 'No readable nameplate data could be extracted. Retake closer to the data plate, or enter manually.'
        : msg);
      setScreen('ocr_failed');
    } finally { setOcrLoading(false); }
  }, []);

  // ── Scanner closed by user (X) ─────────────────────────────────────────────
  function handleScannerClose() {
    setScannerOpen(false);
    // if OCR hasn't run yet, close the whole workflow
    if (screen === 'scanning') onClose();
  }

  // ── Choose action ──────────────────────────────────────────────────────────
  const ACTIONS = [
    { id: 'link_existing',   icon: Link2,     label: 'Link to Existing Unit',       sub: 'Search your equipment records and attach nameplate',  color: 'border-blue-800/50  bg-blue-950/20'  },
    { id: 'customer_search', icon: UserPlus,  label: 'Add to Customer as New Unit', sub: 'Select an existing customer and create a new unit',    color: 'border-purple-800/50 bg-purple-950/20' },
    { id: 'create_new',      icon: Plus,      label: 'New Customer + Unit',         sub: 'Create a brand-new customer and equipment record',     color: 'border-green-800/50  bg-green-950/20'  },
    { id: 'save_unassigned', icon: Inbox,     label: 'Save as Unassigned',          sub: 'Add a note and link to customer later',                color: 'border-gray-700      bg-gray-900'       },
  ] as const;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Scanner (renders on top, z-[60]) ─────────────────────────────── */}
      {scannerOpen && (
        <div className="fixed inset-0 z-[60]">
          <NameplateScannerModal
            onClose={handleScannerClose}
            onCapture={handleCapture}
          />
        </div>
      )}

      {/* ── Workflow modal ────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex flex-col bg-gray-950"
      >
        {/* ── OCR Loading ──────────────────────────────────────────────── */}
        {(screen === 'scanning' || screen === 'ocr_loading') && (
          <div className="flex flex-col items-center justify-center h-full gap-5 px-8 text-center">
            {ocrLoading || screen === 'ocr_loading' ? (
              <>
                <div className="w-16 h-16 rounded-2xl bg-blue-900/30 border border-blue-800 flex items-center justify-center">
                  <Loader2 size={28} className="text-blue-400 animate-spin" />
                </div>
                <div>
                  <div className="font-bold text-white text-base">Reading nameplate…</div>
                  <div className="text-xs text-gray-500 mt-1">Extracting equipment data with AI</div>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center">
                  <Camera size={28} className="text-gray-500" />
                </div>
                <div>
                  <div className="font-bold text-white text-base">Opening camera…</div>
                  <div className="text-xs text-gray-500 mt-1">Point at the equipment data plate</div>
                </div>
                <button onClick={onClose} className="text-xs text-gray-500 border border-gray-700 px-4 py-2 rounded-xl">Cancel</button>
              </>
            )}
          </div>
        )}

        {/* ── OCR Result ───────────────────────────────────────────────── */}
        {screen === 'ocr_result' && (
          <div className="flex flex-col h-full">
            <ScreenHeader title="Nameplate Scan Result" onClose={onClose} />
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">

              {/* Image preview thumbnail */}
              {previewUrl && (
                <div className="rounded-2xl overflow-hidden border border-gray-800 bg-gray-900">
                  <img
                    src={previewUrl}
                    alt="Captured nameplate"
                    className="w-full object-contain max-h-36"
                    style={{ imageRendering: 'crisp-edges' }}
                  />
                </div>
              )}

              {typeof fields.confidence === 'number' && <ConfidenceBar confidence={fields.confidence} />}

              {(fields.reviewFields?.length ?? 0) > 0 && (
                <div className="bg-amber-950/25 border border-amber-800/40 rounded-xl px-3 py-2">
                  <p className="text-[10px] text-amber-400 font-semibold">
                    {fields.reviewFields?.length} field{(fields.reviewFields?.length ?? 0) !== 1 ? 's' : ''} marked "Review" — verify before saving
                  </p>
                </div>
              )}

              <ExtractedFieldsPanel fields={fields} />

              {/* Parts lookup card */}
              <PartsLookupCard
                result={partsResult}
                loading={partsLoading}
                confirmed={confirmedParts}
                onConfirm={setConfirmedParts}
                onClear={() => setConfirmedParts(null)}
              />

              {/* Raw OCR text (collapsible) */}
              {fields.rawText && (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                  <button
                    onClick={() => setRawExpanded(e => !e)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Raw OCR Text</span>
                    {rawExpanded ? <ChevronUp size={12} className="text-gray-600" /> : <ChevronDown size={12} className="text-gray-600" />}
                  </button>
                  {rawExpanded && (
                    <div className="px-4 pb-4">
                      <pre className="text-[10px] text-gray-400 font-mono whitespace-pre-wrap leading-relaxed break-all">
                        {fields.rawText}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-4 pb-6 pt-2 space-y-2 border-t border-gray-800">
              {/* Copy toast feedback */}
              <AnimatePresence>
                {copyToast && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="text-center text-xs text-green-400 font-semibold py-1"
                  >
                    Copied to clipboard ✓
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action row: Retake / Edit / Copy */}
              <div className="flex gap-2">
                <button
                  onClick={() => { setScannerOpen(true); setScreen('scanning'); setPreviewUrl(null); setPartsResult(null); setConfirmedParts(null); }}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-gray-800 border border-gray-700 rounded-2xl py-3 text-xs font-semibold text-gray-300 active:bg-gray-700"
                >
                  <RefreshCw size={12} /> Retake
                </button>
                <button
                  onClick={() => setScreen('manual_entry')}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-gray-800 border border-gray-700 rounded-2xl py-3 text-xs font-semibold text-gray-300 active:bg-gray-700"
                >
                  <Edit2 size={12} /> Edit
                </button>
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(formatForVendorApp(fields));
                      setCopyToast(true);
                      setTimeout(() => setCopyToast(false), 2500);
                    } catch { /* clipboard blocked */ }
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-gray-800 border border-gray-700 rounded-2xl py-3 text-xs font-semibold text-gray-300 active:bg-gray-700"
                >
                  <Copy size={12} /> Copy
                </button>
              </div>

              <button onClick={() => setScreen('choose_action')}
                className="w-full bg-white text-gray-950 font-bold py-4 rounded-2xl text-sm active:scale-[0.98] transition-transform">
                Save to Equipment
              </button>
            </div>
          </div>
        )}

        {/* ── OCR Failed ───────────────────────────────────────────────── */}
        {screen === 'ocr_failed' && (
          <div className="flex flex-col h-full">
            <ScreenHeader title="Scan Incomplete" onClose={onClose} />
            <div className="flex-1 overflow-y-auto px-4 py-8 flex flex-col items-center gap-5 text-center">
              <div className="w-16 h-16 rounded-2xl bg-red-900/20 border border-red-800/40 flex items-center justify-center">
                <AlertTriangle size={28} className="text-red-400" />
              </div>
              <div>
                <div className="font-bold text-white text-base mb-1">Could not extract nameplate data</div>
                <div className="text-xs text-gray-400 max-w-xs leading-relaxed">{ocrError || 'No readable nameplate found. Try again closer to the data plate.'}</div>
              </div>
              <div className="w-full max-w-xs space-y-2">
                <button onClick={() => { setOcrError(''); setScannerOpen(true); setScreen('scanning'); setPartsResult(null); setConfirmedParts(null); }}
                  className="w-full flex items-center justify-center gap-2 bg-blue-700 text-white font-bold py-4 rounded-2xl text-sm">
                  <Camera size={15} /> Retake Photo
                </button>
                <button onClick={() => setScreen('manual_entry')}
                  className="w-full flex items-center justify-center gap-2 bg-gray-800 border border-gray-700 text-white font-semibold py-3.5 rounded-2xl text-sm">
                  <Edit2 size={14} /> Enter Manually
                </button>
                <button onClick={() => setScreen('save_unassigned')}
                  className="w-full flex items-center justify-center gap-2 bg-gray-900 border border-gray-700 text-gray-300 font-semibold py-3.5 rounded-2xl text-sm">
                  <Save size={14} /> Save with Note — Link Later
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Manual Entry ─────────────────────────────────────────────── */}
        {screen === 'manual_entry' && (
          <ManualEntryScreen
            initial={fields}
            onSave={f => { setFields(f); setScreen('choose_action'); }}
            onBack={() => setScreen(ocrError ? 'ocr_failed' : 'ocr_result')}
          />
        )}

        {/* ── Choose Action ─────────────────────────────────────────────── */}
        {screen === 'choose_action' && (
          <div className="flex flex-col h-full">
            <ScreenHeader title="What to do with this scan?" onClose={onClose} />
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
              <div className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 mb-3">
                <div className="text-[10px] text-gray-500">Scanned equipment</div>
                <div className="text-xs text-white font-semibold mt-0.5">
                  {[fields.manufacturer, fields.modelNumber, fields.equipmentType].filter(Boolean).join(' · ') || 'Manual entry'}
                </div>
              </div>

              {ACTIONS.map(({ id, icon: Icon, label, sub, color }) => (
                <button
                  key={id}
                  onClick={() => setScreen(id)}
                  className={`w-full flex items-center gap-4 border rounded-2xl px-4 py-4 text-left active:opacity-80 transition-opacity ${color}`}
                >
                  <div className="w-10 h-10 rounded-xl bg-gray-800/60 flex items-center justify-center flex-shrink-0">
                    <Icon size={18} className="text-gray-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white">{label}</div>
                    <div className="text-[10px] text-gray-500 leading-snug mt-0.5">{sub}</div>
                  </div>
                  <ChevronRight size={14} className="text-gray-600 flex-shrink-0" />
                </button>
              ))}

              {pendingCount > 0 && (
                <button
                  onClick={() => { onClose(); onViewUnassigned?.(); }}
                  className="w-full flex items-center justify-center gap-2 mt-2 py-2.5 text-xs text-gray-500 border border-gray-800 rounded-2xl"
                >
                  <Inbox size={12} />
                  View {pendingCount} unassigned scan{pendingCount !== 1 ? 's' : ''}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Link Existing ─────────────────────────────────────────────── */}
        {screen === 'link_existing' && (
          <LinkExistingScreen
            fields={fields}
            confirmedParts={confirmedParts}
            onLinked={() => { setSuccessMsg('Nameplate linked to existing unit.'); setScreen('success'); }}
            onBack={() => setScreen('choose_action')}
          />
        )}

        {/* ── Customer Search ───────────────────────────────────────────── */}
        {screen === 'customer_search' && (
          <CustomerSearchScreen
            fields={fields}
            confirmedParts={confirmedParts}
            onCreated={() => { setSuccessMsg('New unit created successfully.'); setScreen('success'); }}
            onBack={() => setScreen('choose_action')}
          />
        )}

        {/* ── Create New ────────────────────────────────────────────────── */}
        {screen === 'create_new' && (
          <CreateNewScreen
            fields={fields}
            confirmedParts={confirmedParts}
            onCreated={() => { setSuccessMsg('New customer and unit created.'); setScreen('success'); }}
            onBack={() => setScreen('choose_action')}
          />
        )}

        {/* ── Save Unassigned ───────────────────────────────────────────── */}
        {screen === 'save_unassigned' && (
          <SaveUnassignedScreen
            fields={fields}
            onSaved={() => { setSuccessMsg('Saved to Unassigned Scans. Link to a unit when ready.'); setScreen('success'); }}
            onBack={() => setScreen(ocrError ? 'ocr_failed' : 'choose_action')}
          />
        )}

        {/* ── Success ───────────────────────────────────────────────────── */}
        {screen === 'success' && (
          <div className="flex flex-col items-center justify-center h-full gap-5 px-8 text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              className="w-16 h-16 rounded-2xl bg-green-900/30 border border-green-800 flex items-center justify-center">
              <CheckCircle size={28} className="text-green-400" />
            </motion.div>
            <div>
              <div className="font-bold text-white text-base mb-1">Saved</div>
              <div className="text-xs text-gray-400 leading-relaxed max-w-xs">{successMsg}</div>
            </div>
            <div className="w-full max-w-xs space-y-2">
              <button onClick={() => { setScannerOpen(true); setScreen('scanning'); setFields({}); setSuccessMsg(''); setOcrError(''); }}
                className="w-full flex items-center justify-center gap-2 bg-gray-800 border border-gray-700 text-white font-semibold py-3.5 rounded-2xl text-sm">
                <Camera size={14} /> Scan Another
              </button>
              <button onClick={onClose}
                className="w-full bg-white text-gray-950 font-bold py-4 rounded-2xl text-sm active:scale-[0.98] transition-transform">
                Done
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </>
  );
}
