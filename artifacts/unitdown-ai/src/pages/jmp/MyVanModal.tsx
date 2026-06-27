import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Search, Plus, Minus, ChevronRight, CheckCircle, AlertTriangle,
  XCircle, Sparkles, Package, ClipboardList, LayoutDashboard,
  Camera, Trash2, RefreshCw,
} from 'lucide-react';
import {
  INITIAL_INVENTORY, ALL_CATEGORIES, JOB_INFO, AI_STOCK_LIST,
  computeJobReadiness, computeOverallReadiness, itemStatus, aiVanSummary,
  type InventoryItem, type ItemCategory, type ItemStatus,
} from './vanData';

interface Props { onClose: () => void }

type Tab = 'overview' | 'inventory' | 'restock';

// ─── Van icon (cargo van side-profile SVG) ─────────────────────────────────────
function VanIcon({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={Math.round(size * 0.75)} viewBox="0 0 28 21" fill="none"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
      className={className}>
      <path d="M1 14 L1 7 L8 2 L25 2 L27 7 L27 14 Z" />
      <line x1="8" y1="2" x2="8" y2="14" />
      <rect x="9.5" y="3.5" width="6" height="4.5" rx="0.6" />
      <circle cx="6.5" cy="17" r="2.5" />
      <circle cx="21.5" cy="17" r="2.5" />
      <path d="M1 14 L4 14 M9 14 L19 14 M24 14 L27 14" />
    </svg>
  );
}

// ─── Circular readiness ring ───────────────────────────────────────────────────
function ReadinessRing({ score }: { score: number }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  const color = score >= 90 ? '#22c55e' : score >= 75 ? '#eab308' : score >= 50 ? '#f97316' : '#ef4444';
  const label = score >= 90 ? 'READY' : score >= 75 ? 'MOSTLY READY' : score >= 50 ? 'RISK OF RETURN TRIP' : 'NOT READY';
  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg width="128" height="128" viewBox="0 0 128 128">
          <circle cx="64" cy="64" r={r} fill="none" stroke="#1f2937" strokeWidth="10" />
          <circle cx="64" cy="64" r={r} fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round" transform="rotate(-90 64 64)"
            style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-black text-white">{score}%</span>
        </div>
      </div>
      <div className="text-xs font-bold uppercase tracking-widest mt-1" style={{ color }}>{label}</div>
    </div>
  );
}

// ─── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: ItemStatus }) {
  if (status === 'missing') return (
    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-red-900/50 text-red-300 border border-red-800">OUT</span>
  );
  if (status === 'low') return (
    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-yellow-900/50 text-yellow-300 border border-yellow-800">LOW</span>
  );
  return (
    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-green-900/50 text-green-300 border border-green-800">GOOD</span>
  );
}

// ─── Job readiness mini-score ──────────────────────────────────────────────────
function JobScore({ score }: { score: number }) {
  const c = score >= 90 ? 'text-green-400' : score >= 75 ? 'text-yellow-400' : 'text-red-400';
  const dot = score >= 90 ? '🟢' : score >= 75 ? '🟡' : '🔴';
  return <span className={`text-xs font-bold ${c}`}>{dot} {score}%</span>;
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg }: { msg: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
      className="fixed top-14 left-1/2 -translate-x-1/2 z-[90] bg-gray-800 border border-gray-600
        text-white text-sm font-semibold px-4 py-2.5 rounded-2xl shadow-xl whitespace-nowrap flex items-center gap-2">
      <CheckCircle size={14} className="text-green-400 flex-shrink-0" />
      {msg}
    </motion.div>
  );
}

// ─── Initial restock list (items that start low or missing) ───────────────────
function initRestockSet(inv: InventoryItem[]): Set<string> {
  return new Set(inv.filter(i => itemStatus(i) !== 'ready').map(i => i.id));
}

// ─── Main component ───────────────────────────────────────────────────────────
export function MyVanModal({ onClose }: Props) {
  const [tab,             setTab]           = useState<Tab>('overview');
  const [inventory,       setInventory]     = useState<InventoryItem[]>(
    () => INITIAL_INVENTORY.map(i => ({ ...i })),
  );
  const [restockSet,      setRestockSet]    = useState<Set<string>>(() => initRestockSet(INITIAL_INVENTORY));
  const [search,          setSearch]        = useState('');
  const [catFilter,       setCatFilter]     = useState<ItemCategory | null>(null);
  const [selectedItem,    setSelectedItem]  = useState<InventoryItem | null>(null);
  const [addPartOpen,     setAddPartOpen]   = useState(false);
  const [removePartOpen,  setRemovePartOpen]= useState(false);
  const [scanOpen,        setScanOpen]      = useState(false);
  const [toast,           setToast]         = useState<string | null>(null);
  const [aiStockOpen,     setAiStockOpen]   = useState(false);

  const score    = useMemo(() => computeOverallReadiness(inventory), [inventory]);
  const sumScore = useMemo(() => computeJobReadiness(inventory, 'summit'),    [inventory]);
  const nthScore = useMemo(() => computeJobReadiness(inventory, 'northgate'), [inventory]);
  const ridScore = useMemo(() => computeJobReadiness(inventory, 'ridgeline'), [inventory]);
  const aiSummary = useMemo(() => aiVanSummary(inventory), [inventory]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  function setQty(id: string, qty: number) {
    setInventory(prev => prev.map(i => i.id === id ? { ...i, qty: Math.max(0, qty) } : i));
    const item = inventory.find(i => i.id === id);
    if (item) {
      const newStatus = qty === 0 ? 'missing' : qty < item.minQty ? 'low' : 'ready';
      if (newStatus !== 'ready') {
        setRestockSet(prev => new Set([...prev, id]));
      } else {
        setRestockSet(prev => { const s = new Set(prev); s.delete(id); return s; });
      }
    }
  }

  function markLoaded(id: string) {
    const item = inventory.find(i => i.id === id);
    if (!item) return;
    setInventory(prev => prev.map(i => i.id === id ? { ...i, qty: i.minQty } : i));
    setRestockSet(prev => { const s = new Set(prev); s.delete(id); return s; });
    setSelectedItem(null);
    showToast(`${item.name} marked as loaded`);
  }

  function toggleRestock(id: string) {
    setRestockSet(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  }

  // Filtered inventory for Inventory tab
  const filteredInventory = useMemo(() => {
    let list = inventory;
    if (catFilter) list = list.filter(i => i.category === catFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(i =>
        i.name.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q) ||
        i.unit.toLowerCase().includes(q),
      );
    }
    return list;
  }, [inventory, catFilter, search]);

  // Group by status for Inventory tab
  const missing = filteredInventory.filter(i => itemStatus(i) === 'missing');
  const low     = filteredInventory.filter(i => itemStatus(i) === 'low');
  const ready   = filteredInventory.filter(i => itemStatus(i) === 'ready');

  // Restock grouping
  const restockItems = inventory.filter(i => restockSet.has(i.id));
  const restockCritical    = restockItems.filter(i => i.requiredFor.length > 0 && itemStatus(i) === 'missing');
  const restockNeededToday = restockItems.filter(i =>
    !restockCritical.includes(i) &&
    (i.requiredFor.length > 0 || i.recommendedFor.length > 0) &&
    itemStatus(i) !== 'ready',
  );
  const restockLowStock    = restockItems.filter(i =>
    !restockCritical.includes(i) && !restockNeededToday.includes(i),
  );

  const jobScores = { summit: sumScore, northgate: nthScore, ridgeline: ridScore };

  const readyJobCount = [sumScore, nthScore, ridScore].filter(s => s >= 90).length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-gray-950 z-[55] flex flex-col overflow-hidden">

      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 pt-12 pb-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-900/50 border border-teal-700/50 flex items-center justify-center">
            <VanIcon size={20} className="text-teal-300" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white leading-tight">My Van</h2>
            <div className="text-[10px] text-gray-500 font-mono">Marcus Rivera · Unit #47</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`px-2 py-1 rounded-full border text-xs font-bold ${
            score >= 90 ? 'bg-green-900/40 border-green-700 text-green-300' :
            score >= 75 ? 'bg-yellow-900/40 border-yellow-700 text-yellow-300' :
                          'bg-red-900/40 border-red-700 text-red-300'
          }`}>{score}%</div>
          <button onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center">
            <X size={18} className="text-gray-400" />
          </button>
        </div>
      </div>

      {/* ── Tab bar ──────────────────────────────────────────────── */}
      <div className="flex border-b border-gray-800 bg-gray-900 flex-shrink-0">
        {([['overview', 'Overview', LayoutDashboard], ['inventory', 'Inventory', Package], ['restock', 'Restock', ClipboardList]] as const).map(([t, label, Icon]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold border-b-2 transition-colors ${
              tab === t ? 'border-teal-400 text-teal-300' : 'border-transparent text-gray-500'
            }`}>
            <Icon size={13} />
            {label}
            {t === 'restock' && restockSet.size > 0 && (
              <span className="bg-red-600 text-white text-[9px] font-bold rounded-full px-1.5 py-0.5 ml-0.5">
                {restockSet.size}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Content ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">

          {/* ════ OVERVIEW ════════════════════════════════════════ */}
          {tab === 'overview' && (
            <motion.div key="overview"
              initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
              className="px-4 py-5 space-y-5 pb-8">

              {/* Readiness ring card */}
              <div className="bg-gray-900 border border-gray-800 rounded-3xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Truck Readiness</div>
                    <div className="text-sm text-gray-300">
                      Ready for <span className="text-white font-bold">{readyJobCount} of 3</span> jobs today
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <ReadinessRing score={score} />
                  <div className="flex-1 space-y-2">
                    {Object.entries(jobScores).map(([jid, s]) => {
                      const j = JOB_INFO[jid];
                      return (
                        <div key={jid} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${j.dotColor}`} />
                            <span className="text-xs text-gray-300 font-medium">{j.abbr}</span>
                          </div>
                          <JobScore score={s} />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* AI summary */}
                <div className="mt-4 bg-blue-950/40 border border-blue-800/40 rounded-2xl p-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Sparkles size={10} className="text-blue-400" />
                    <span className="text-[9px] font-bold uppercase tracking-wider text-blue-400">AI Summary</span>
                  </div>
                  <p className="text-xs text-blue-100/80 leading-relaxed">{aiSummary}</p>
                </div>
              </div>

              {/* Inventory health bar */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3">Inventory Health</div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1 h-2 rounded-full bg-gray-800 overflow-hidden">
                    <div className="flex h-full">
                      <div className="bg-green-500 transition-all" style={{ width: `${Math.round(inventory.filter(i => itemStatus(i) === 'ready').length / inventory.length * 100)}%` }} />
                      <div className="bg-yellow-500 transition-all" style={{ width: `${Math.round(inventory.filter(i => itemStatus(i) === 'low').length / inventory.length * 100)}%` }} />
                      <div className="bg-red-500 transition-all" style={{ width: `${Math.round(inventory.filter(i => itemStatus(i) === 'missing').length / inventory.length * 100)}%` }} />
                    </div>
                  </div>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-green-400 font-semibold">{inventory.filter(i => itemStatus(i) === 'ready').length} Good</span>
                  <span className="text-yellow-400 font-semibold">{inventory.filter(i => itemStatus(i) === 'low').length} Low</span>
                  <span className="text-red-400 font-semibold">{inventory.filter(i => itemStatus(i) === 'missing').length} Out</span>
                  <span className="text-gray-500">{inventory.length} total items</span>
                </div>
              </div>

              {/* Job readiness cards */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Job Readiness</div>
                <div className="space-y-2">
                  {Object.entries(jobScores).map(([jid, s]) => {
                    const j = JOB_INFO[jid];
                    const jobRequired     = inventory.filter(i => i.requiredFor.includes(jid));
                    const jobRecommended  = inventory.filter(i => i.recommendedFor.includes(jid));
                    const missing         = jobRequired.filter(i => itemStatus(i) === 'missing');
                    const low             = [...jobRequired, ...jobRecommended].filter(i => itemStatus(i) === 'low');
                    return (
                      <div key={jid} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${j.dotColor}`} />
                            <span className="text-sm font-bold text-white">{j.abbr}</span>
                          </div>
                          <JobScore score={s} />
                        </div>

                        {/* Required items status */}
                        {jobRequired.length > 0 && (
                          <div className="space-y-1 mb-2">
                            <div className="text-[9px] text-gray-600 uppercase tracking-wider mb-1">Required</div>
                            {jobRequired.map(item => {
                              const st = itemStatus(item);
                              return (
                                <div key={item.id} className="flex items-center gap-2 text-xs">
                                  {st === 'ready'   && <CheckCircle size={11} className="text-green-400 flex-shrink-0" />}
                                  {st === 'low'     && <AlertTriangle size={11} className="text-yellow-400 flex-shrink-0" />}
                                  {st === 'missing' && <XCircle size={11} className="text-red-400 flex-shrink-0" />}
                                  <span className={st === 'missing' ? 'text-red-300' : st === 'low' ? 'text-yellow-300' : 'text-gray-300'}>
                                    {item.name}
                                    {st !== 'ready' && <span className="text-gray-600 ml-1">({item.qty}/{item.minQty} {item.unit})</span>}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Recommended items */}
                        {jobRecommended.length > 0 && (
                          <div className="space-y-1">
                            <div className="text-[9px] text-gray-600 uppercase tracking-wider mb-1">Recommended</div>
                            {jobRecommended.map(item => {
                              const st = itemStatus(item);
                              return (
                                <div key={item.id} className="flex items-center gap-2 text-xs">
                                  {st === 'ready'   && <CheckCircle size={11} className="text-green-400/60 flex-shrink-0" />}
                                  {st === 'low'     && <AlertTriangle size={11} className="text-yellow-400 flex-shrink-0" />}
                                  {st === 'missing' && <XCircle size={11} className="text-red-400/70 flex-shrink-0" />}
                                  <span className={st === 'missing' ? 'text-red-300/80' : st === 'low' ? 'text-yellow-300' : 'text-gray-500'}>
                                    {item.name}
                                    {st !== 'ready' && <span className="text-gray-600 ml-1">({item.qty}/{item.minQty})</span>}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {missing.length === 0 && low.length === 0 && (
                          <div className="flex items-center gap-1.5 text-xs text-green-400 font-semibold">
                            <CheckCircle size={13} />
                            Everything loaded — ready to go
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* AI Truck Stock (Day Brief integration) */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                <button onClick={() => setAiStockOpen(o => !o)}
                  className="w-full flex items-center justify-between px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <Sparkles size={13} className="text-blue-400" />
                    <span className="text-sm font-bold text-white">AI Stock Recommendations</span>
                  </div>
                  <ChevronRight size={14} className={`text-gray-500 transition-transform ${aiStockOpen ? 'rotate-90' : ''}`} />
                </button>
                <AnimatePresence>
                  {aiStockOpen && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                      className="overflow-hidden">
                      <div className="px-4 pb-4 space-y-2">
                        <p className="text-xs text-gray-500 mb-3">Based on today's route — Summit Medical, Northgate, Ridgeline</p>
                        {AI_STOCK_LIST.map((s, i) => (
                          <div key={i} className="flex items-start gap-2">
                            {s.ok === 'ready'   && <CheckCircle size={13} className="text-green-400 flex-shrink-0 mt-0.5" />}
                            {s.ok === 'low'     && <AlertTriangle size={13} className="text-yellow-400 flex-shrink-0 mt-0.5" />}
                            {s.ok === 'missing' && <XCircle size={13} className="text-red-400 flex-shrink-0 mt-0.5" />}
                            <div className="min-w-0">
                              <div className={`text-xs font-semibold ${
                                s.ok === 'ready' ? 'text-gray-300' : s.ok === 'low' ? 'text-yellow-300' : 'text-red-300'
                              }`}>{s.item}</div>
                              <div className="text-[10px] text-gray-600">{s.reason}</div>
                            </div>
                          </div>
                        ))}
                        <div className="mt-3 flex gap-2 text-[9px] text-gray-600">
                          <span className="flex items-center gap-1"><CheckCircle size={9} className="text-green-400" /> In van</span>
                          <span className="flex items-center gap-1"><AlertTriangle size={9} className="text-yellow-400" /> Low stock</span>
                          <span className="flex items-center gap-1"><XCircle size={9} className="text-red-400" /> Missing</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Offline note */}
              <div className="flex items-start gap-2 bg-gray-900/50 border border-gray-800 rounded-xl px-3 py-2.5">
                <RefreshCw size={12} className="text-gray-600 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-gray-600 leading-relaxed">
                  Inventory updates save locally and automatically sync when service returns. Works on rooftops, mechanical rooms, and remote sites.
                </p>
              </div>
            </motion.div>
          )}

          {/* ════ INVENTORY ═══════════════════════════════════════ */}
          {tab === 'inventory' && (
            <motion.div key="inventory"
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
              className="flex flex-col h-full">

              {/* Search + filter */}
              <div className="px-4 pt-4 pb-0 flex-shrink-0">
                <div className="relative mb-3">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search parts, belts, filters, refrigerant, tools…"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-teal-600"
                  />
                  {search && (
                    <button onClick={() => setSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2">
                      <X size={13} className="text-gray-500" />
                    </button>
                  )}
                </div>
                {/* Category filter chips */}
                <div className="flex gap-1.5 overflow-x-auto pb-3 scrollbar-hide">
                  <button onClick={() => setCatFilter(null)}
                    className={`flex-shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                      !catFilter ? 'bg-teal-700 border-teal-600 text-white' : 'bg-gray-800 border-gray-700 text-gray-400'
                    }`}>All</button>
                  {ALL_CATEGORIES.map(cat => (
                    <button key={cat} onClick={() => setCatFilter(catFilter === cat ? null : cat)}
                      className={`flex-shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                        catFilter === cat ? 'bg-teal-700 border-teal-600 text-white' : 'bg-gray-800 border-gray-700 text-gray-400'
                      }`}>{cat}</button>
                  ))}
                </div>
              </div>

              {/* Items list */}
              <div className="flex-1 overflow-y-auto px-4 pb-24">
                {filteredInventory.length === 0 && (
                  <div className="text-center text-gray-600 py-12 text-sm">No items found</div>
                )}

                {/* MISSING group */}
                {missing.length > 0 && (
                  <InventoryGroup label="Out of Stock" items={missing} accent="red"
                    onTap={item => setSelectedItem({ ...item })}
                    getStatus={i => itemStatus(inventory.find(x => x.id === i.id) ?? i)} />
                )}
                {/* LOW group */}
                {low.length > 0 && (
                  <InventoryGroup label="Low Stock" items={low} accent="yellow"
                    onTap={item => setSelectedItem({ ...item })}
                    getStatus={i => itemStatus(inventory.find(x => x.id === i.id) ?? i)} />
                )}
                {/* READY group */}
                {ready.length > 0 && (
                  <InventoryGroup label="Well Stocked" items={ready} accent="green"
                    onTap={item => setSelectedItem({ ...item })}
                    getStatus={i => itemStatus(inventory.find(x => x.id === i.id) ?? i)} />
                )}
              </div>

              {/* Quick actions bar */}
              <div className="absolute bottom-0 left-0 right-0 bg-gray-950/95 border-t border-gray-800 px-4 py-3 flex gap-2">
                <button onClick={() => setAddPartOpen(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-teal-700 rounded-xl py-3 text-xs font-bold text-white">
                  <Plus size={14} /> Add Part
                </button>
                <button onClick={() => setRemovePartOpen(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-gray-800 border border-gray-700 rounded-xl py-3 text-xs font-bold text-gray-300">
                  <Minus size={14} /> Remove Part
                </button>
                <button onClick={() => setScanOpen(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-gray-800 border border-gray-700 rounded-xl py-3 text-xs font-bold text-gray-300">
                  <Camera size={14} /> Scan Part
                </button>
              </div>
            </motion.div>
          )}

          {/* ════ RESTOCK ═════════════════════════════════════════ */}
          {tab === 'restock' && (
            <motion.div key="restock"
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
              className="px-4 py-5 pb-28 space-y-5">

              {restockSet.size === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <CheckCircle size={40} className="text-green-500" />
                  <p className="text-white font-bold text-lg">Restock list is clear</p>
                  <p className="text-gray-500 text-sm text-center">All items are at minimum stock levels.</p>
                </div>
              ) : (
                <>
                  {restockCritical.length > 0 && (
                    <RestockGroup
                      label="Critical" labelColor="text-red-400" borderColor="border-red-900/50" bgColor="bg-red-950/20"
                      items={restockCritical} inventory={inventory}
                      onMarkLoaded={markLoaded} onRemove={id => toggleRestock(id)} />
                  )}
                  {restockNeededToday.length > 0 && (
                    <RestockGroup
                      label="Needed Today" labelColor="text-yellow-400" borderColor="border-yellow-900/50" bgColor="bg-yellow-950/10"
                      items={restockNeededToday} inventory={inventory}
                      onMarkLoaded={markLoaded} onRemove={id => toggleRestock(id)} />
                  )}
                  {restockLowStock.length > 0 && (
                    <RestockGroup
                      label="Low Stock" labelColor="text-gray-400" borderColor="border-gray-800" bgColor="bg-gray-900"
                      items={restockLowStock} inventory={inventory}
                      onMarkLoaded={markLoaded} onRemove={id => toggleRestock(id)} />
                  )}
                </>
              )}

              {/* Mark All Loaded button */}
              {restockSet.size > 0 && (
                <button
                  onClick={() => {
                    const ids = [...restockSet];
                    ids.forEach(id => markLoaded(id));
                    showToast(`${ids.length} items marked as loaded`);
                  }}
                  className="w-full bg-teal-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2">
                  <CheckCircle size={16} />
                  Mark All Loaded ({restockSet.size} items)
                </button>
              )}

              <div className="flex items-start gap-2 bg-gray-900/50 border border-gray-800 rounded-xl px-3 py-2.5">
                <RefreshCw size={12} className="text-gray-600 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-gray-600 leading-relaxed">
                  Restock list updates automatically when you mark items as loaded or when inventory drops below minimum.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── Item Detail Sheet ──────────────────────────────────── */}
      <AnimatePresence>
        {selectedItem && (() => {
          const live = inventory.find(i => i.id === selectedItem.id) ?? selectedItem;
          const st   = itemStatus(live);
          const inRestock = restockSet.has(live.id);
          return (
            <motion.div key="item-detail"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="absolute inset-x-0 bottom-0 bg-gray-900 border-t border-gray-700 rounded-t-3xl z-10 p-5 pb-8">
              <div className="w-10 h-1 bg-gray-700 rounded-full mx-auto mb-4" />
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0 pr-3">
                  <div className="text-[10px] text-gray-500 font-medium mb-0.5">{live.category}</div>
                  <h3 className="text-base font-bold text-white leading-snug">{live.name}</h3>
                </div>
                <StatusBadge status={st} />
              </div>

              {/* Qty control */}
              <div className="bg-gray-800 rounded-2xl p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400">Quantity on truck</span>
                  <span className="text-xs text-gray-500">Min: {live.minQty} {live.unit}</span>
                </div>
                <div className="flex items-center gap-4 justify-center">
                  <button onClick={() => setQty(live.id, live.qty - 1)}
                    className="w-11 h-11 rounded-xl bg-gray-700 flex items-center justify-center active:scale-95 transition-transform">
                    <Minus size={18} className="text-white" />
                  </button>
                  <div className="text-center">
                    <div className="text-2xl font-black text-white">{live.qty}</div>
                    <div className="text-[10px] text-gray-500">{live.unit}</div>
                  </div>
                  <button onClick={() => setQty(live.id, live.qty + 1)}
                    className="w-11 h-11 rounded-xl bg-teal-700 flex items-center justify-center active:scale-95 transition-transform">
                    <Plus size={18} className="text-white" />
                  </button>
                </div>
              </div>

              {/* Detail rows */}
              <div className="space-y-1.5 mb-4">
                {live.lastUsed && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Last used</span>
                    <span className="text-gray-300 font-medium">{live.lastUsed}</span>
                  </div>
                )}
                {live.usagePattern && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Pattern</span>
                    <span className="text-gray-300 font-medium text-right ml-4">{live.usagePattern}</span>
                  </div>
                )}
                {(live.requiredFor.length > 0 || live.recommendedFor.length > 0) && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Today's use</span>
                    <span className="text-right ml-4 text-gray-300 font-medium">
                      {[
                        ...live.requiredFor.map(j => JOB_INFO[j]?.abbr ?? j),
                        ...live.recommendedFor.map(j => JOB_INFO[j]?.abbr ?? j),
                      ].join(', ')}
                    </span>
                  </div>
                )}
              </div>

              {/* AI rec */}
              {live.aiRec && (
                <div className="bg-blue-950/40 border border-blue-800/40 rounded-xl px-3 py-2.5 mb-4">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Sparkles size={10} className="text-blue-400" />
                    <span className="text-[9px] font-bold uppercase tracking-wider text-blue-400">AI Note</span>
                  </div>
                  <p className="text-[11px] text-blue-100/80 leading-relaxed">{live.aiRec}</p>
                </div>
              )}

              <div className="flex gap-2">
                {st !== 'ready' && (
                  <button onClick={() => markLoaded(live.id)}
                    className="flex-1 bg-teal-700 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-1.5">
                    <CheckCircle size={14} /> Mark Loaded
                  </button>
                )}
                <button onClick={() => toggleRestock(live.id)}
                  className={`flex-1 font-semibold py-3 rounded-xl text-sm border flex items-center justify-center gap-1.5 ${
                    inRestock ? 'bg-gray-800 border-gray-600 text-gray-300' : 'bg-gray-800 border-gray-700 text-gray-400'
                  }`}>
                  <ClipboardList size={14} />
                  {inRestock ? 'In Restock List' : 'Add to Restock'}
                </button>
                <button onClick={() => setSelectedItem(null)}
                  className="w-12 bg-gray-800 border border-gray-700 rounded-xl flex items-center justify-center">
                  <X size={16} className="text-gray-400" />
                </button>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ─── Add Part Modal ──────────────────────────────────────── */}
      <AnimatePresence>
        {addPartOpen && (
          <AddPartModal
            inventory={inventory}
            onAdd={(id, qty) => {
              const item = inventory.find(i => i.id === id);
              if (!item) return;
              setQty(id, item.qty + qty);
              setAddPartOpen(false);
              showToast(`Added ${qty} × ${item.name}`);
            }}
            onClose={() => setAddPartOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ─── Remove Part Sheet ───────────────────────────────────── */}
      <AnimatePresence>
        {removePartOpen && (
          <RemovePartSheet
            inventory={inventory.filter(i => i.qty > 0)}
            onRemove={(id) => {
              const item = inventory.find(i => i.id === id);
              if (!item) return;
              setQty(id, item.qty - 1);
              setRemovePartOpen(false);
              showToast(`Removed 1 × ${item.name}`);
            }}
            onClose={() => setRemovePartOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ─── Scan Coming Soon ────────────────────────────────────── */}
      <AnimatePresence>
        {scanOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gray-950/95 flex flex-col items-center justify-center z-20 px-8">
            <Camera size={48} className="text-gray-600 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Barcode Scanning</h3>
            <p className="text-gray-400 text-center text-sm leading-relaxed mb-6">
              Barcode scanning is coming soon.{'\n'}Select the part manually from the inventory list for this prototype.
            </p>
            <button onClick={() => { setScanOpen(false); setTab('inventory'); }}
              className="bg-teal-700 text-white font-bold px-6 py-3 rounded-2xl flex items-center gap-2">
              <Package size={16} /> Browse Inventory
            </button>
            <button onClick={() => setScanOpen(false)} className="mt-3 text-gray-600 text-sm">Close</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Toast ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && <Toast msg={toast} />}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Inventory Group ──────────────────────────────────────────────────────────
function InventoryGroup({
  label, items, accent, onTap, getStatus,
}: {
  label: string;
  items: InventoryItem[];
  accent: 'red' | 'yellow' | 'green';
  onTap: (item: InventoryItem) => void;
  getStatus: (item: InventoryItem) => ItemStatus;
}) {
  const accentClass = accent === 'red' ? 'text-red-400' : accent === 'yellow' ? 'text-yellow-400' : 'text-green-400';
  return (
    <div className="mb-4">
      <div className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 ${accentClass}`}>
        {label} · {items.length}
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        {items.map((item, idx) => {
          const st = getStatus(item);
          return (
            <button key={item.id} onClick={() => onTap(item)}
              className={`w-full text-left px-4 py-3 flex items-center gap-3 active:bg-gray-800 transition-colors ${
                idx < items.length - 1 ? 'border-b border-gray-800' : ''
              }`}>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-white leading-snug truncate">{item.name}</div>
                <div className="text-[10px] text-gray-500">{item.category} · {item.lastUsed ?? '—'}</div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="text-right">
                  <div className="text-xs font-bold text-white">{item.qty} <span className="text-gray-600 font-normal">/ {item.minQty}</span></div>
                  <div className="text-[9px] text-gray-600">{item.unit}</div>
                </div>
                <StatusBadge status={st} />
                <ChevronRight size={12} className="text-gray-600" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Restock Group ────────────────────────────────────────────────────────────
function RestockGroup({
  label, labelColor, borderColor, bgColor, items, inventory, onMarkLoaded, onRemove,
}: {
  label: string; labelColor: string; borderColor: string; bgColor: string;
  items: InventoryItem[]; inventory: InventoryItem[];
  onMarkLoaded: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div>
      <div className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${labelColor}`}>{label}</div>
      <div className={`${bgColor} border ${borderColor} rounded-2xl overflow-hidden`}>
        {items.map((item, idx) => {
          const live = inventory.find(i => i.id === item.id) ?? item;
          const needed = live.minQty - live.qty;
          const jobList = [...live.requiredFor, ...live.recommendedFor]
            .map(j => JOB_INFO[j]?.abbr ?? j).join(', ');
          return (
            <div key={item.id} className={`px-4 py-3.5 ${idx < items.length - 1 ? 'border-b border-gray-800' : ''}`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-white leading-snug">{live.name}</div>
                  {needed > 0 && (
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      Need {needed} more {live.unit} · {live.qty}/{live.minQty} on truck
                    </div>
                  )}
                  {jobList && (
                    <div className="text-[10px] text-gray-600 mt-0.5">For: {jobList}</div>
                  )}
                  {live.aiRec && (
                    <div className="text-[10px] text-blue-400/80 mt-1 leading-relaxed">{live.aiRec}</div>
                  )}
                </div>
                <button onClick={() => onRemove(item.id)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-800 flex-shrink-0">
                  <Trash2 size={11} className="text-gray-500" />
                </button>
              </div>
              <button onClick={() => onMarkLoaded(item.id)}
                className="w-full bg-teal-800/60 border border-teal-700/50 text-teal-200 font-bold text-xs py-2 rounded-xl flex items-center justify-center gap-1.5">
                <CheckCircle size={12} /> Mark Loaded
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Add Part Modal ───────────────────────────────────────────────────────────
function AddPartModal({
  inventory, onAdd, onClose,
}: {
  inventory: InventoryItem[];
  onAdd: (id: string, qty: number) => void;
  onClose: () => void;
}) {
  const [search, setSearch]   = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [qty, setQtyState]    = useState(1);

  const filtered = inventory.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()),
  );
  const selectedItem = inventory.find(i => i.id === selected);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 bg-gray-950/95 z-20 flex flex-col">
      <div className="bg-gray-900 border-b border-gray-800 px-4 pt-10 pb-3 flex items-center gap-3">
        <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        <h3 className="text-base font-bold text-white">Add Part to Van</h3>
      </div>
      <div className="px-4 pt-4">
        <div className="relative mb-3">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search inventory…"
            className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-8 pr-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {filtered.map((item, idx) => (
          <button key={item.id} onClick={() => setSelected(item.id)}
            className={`w-full text-left px-3 py-3 flex items-center justify-between border-b border-gray-800 ${
              selected === item.id ? 'bg-teal-900/30' : ''
            }`}>
            <div>
              <div className="text-xs font-semibold text-white">{item.name}</div>
              <div className="text-[10px] text-gray-500">{item.category} · {item.qty} in van</div>
            </div>
            {selected === item.id && <CheckCircle size={14} className="text-teal-400" />}
          </button>
        ))}
      </div>
      {selectedItem && (
        <div className="px-4 py-4 bg-gray-900 border-t border-gray-800">
          <div className="text-xs text-gray-400 mb-3 font-medium">Adding: <span className="text-white">{selectedItem.name}</span></div>
          <div className="flex items-center gap-4 mb-4">
            <button onClick={() => setQtyState(q => Math.max(1, q - 1))}
              className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center">
              <Minus size={16} className="text-white" />
            </button>
            <div className="flex-1 text-center">
              <div className="text-2xl font-black text-white">{qty}</div>
              <div className="text-[10px] text-gray-500">{selectedItem.unit}</div>
            </div>
            <button onClick={() => setQtyState(q => q + 1)}
              className="w-10 h-10 bg-teal-700 rounded-xl flex items-center justify-center">
              <Plus size={16} className="text-white" />
            </button>
          </div>
          <button onClick={() => onAdd(selected!, qty)}
            className="w-full bg-teal-700 text-white font-bold py-3.5 rounded-2xl">
            Add {qty} {selectedItem.unit}
          </button>
        </div>
      )}
    </motion.div>
  );
}

// ─── Remove Part Sheet ────────────────────────────────────────────────────────
function RemovePartSheet({
  inventory, onRemove, onClose,
}: {
  inventory: InventoryItem[];
  onRemove: (id: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const filtered = inventory.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="absolute inset-x-0 bottom-0 bg-gray-900 border-t border-gray-700 rounded-t-3xl z-20"
      style={{ maxHeight: '80%' }}>
      <div className="px-4 pt-4 pb-2">
        <div className="w-10 h-1 bg-gray-700 rounded-full mx-auto mb-3" />
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-white">Remove Part</h3>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="relative mb-3">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search…"
            className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-8 pr-3 py-2 text-sm text-white placeholder-gray-600 outline-none" />
        </div>
      </div>
      <div className="overflow-y-auto px-4 pb-6" style={{ maxHeight: '50vh' }}>
        {filtered.map((item, idx) => (
          <button key={item.id} onClick={() => onRemove(item.id)}
            className={`w-full text-left px-3 py-3 flex items-center justify-between border-b border-gray-800 active:bg-gray-800 transition-colors`}>
            <div>
              <div className="text-xs font-semibold text-white">{item.name}</div>
              <div className="text-[10px] text-gray-500">{item.qty} {item.unit} in van</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">{item.qty}</span>
              <div className="w-7 h-7 bg-red-900/50 rounded-lg flex items-center justify-center">
                <Minus size={12} className="text-red-400" />
              </div>
            </div>
          </button>
        ))}
      </div>
    </motion.div>
  );
}
