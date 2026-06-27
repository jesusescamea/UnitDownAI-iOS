import { useState, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Search, Plus, Minus, ChevronRight, CheckCircle, AlertTriangle,
  XCircle, Sparkles, Package, ClipboardList, LayoutDashboard,
  Camera, Trash2, RefreshCw, Clock, History, ShoppingCart,
  TrendingUp, Info,
} from 'lucide-react';
import {
  INITIAL_INVENTORY, ALL_CATEGORIES, JOB_INFO, AI_STOCK_LIST,
  computeJobReadiness, computeOverallReadiness, itemStatus, aiRouteComparison,
  aiLearningNote, readinessBadge, itemHighestPriority,
  type InventoryItem, type ItemCategory, type ItemStatus, type ItemPriority,
} from './vanData';
import {
  INITIAL_TOOLS, computeToolsReadiness, toolReadinessBadge,
} from './toolData';

interface Props { onClose: () => void; onOpenTools?: () => void }
type Tab = 'overview' | 'inventory' | 'restock';

const TODAY_JOBS = ['summit', 'northgate', 'ridgeline'];

// ─── Van icon SVG ──────────────────────────────────────────────────────────────
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

// ─── Readiness ring ────────────────────────────────────────────────────────────
function ReadinessRing({ score }: { score: number }) {
  const r      = 52;
  const circ   = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  const badge  = readinessBadge(score);
  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg width="128" height="128" viewBox="0 0 128 128">
          <circle cx="64" cy="64" r={r} fill="none" stroke="#1f2937" strokeWidth="10" />
          <circle cx="64" cy="64" r={r} fill="none" stroke={badge.ring} strokeWidth="10"
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
            transform="rotate(-90 64 64)" style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-black text-white">{score}%</span>
        </div>
      </div>
      <div className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${badge.color}`}>{badge.label}</div>
      <div className="text-[9px] text-gray-500 mt-0.5 text-center px-4">{badge.sublabel}</div>
    </div>
  );
}

// ─── Priority pill ─────────────────────────────────────────────────────────────
function PriorityPill({ priority }: { priority: ItemPriority }) {
  if (priority === 'required')    return <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-red-900/60 text-red-300 border border-red-800">Required</span>;
  if (priority === 'recommended') return <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-yellow-900/60 text-yellow-300 border border-yellow-800">Recommended</span>;
  if (priority === 'nice')        return <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-blue-900/60 text-blue-300 border border-blue-800">Nice to Have</span>;
  return null;
}

// ─── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: ItemStatus }) {
  if (status === 'missing') return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-900/50 text-red-300 border border-red-800">OUT</span>;
  if (status === 'low')     return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-yellow-900/50 text-yellow-300 border border-yellow-800">LOW</span>;
  return                           <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-900/50 text-green-300 border border-green-800">GOOD</span>;
}

// ─── Priority border color ─────────────────────────────────────────────────────
function priorityBg(priority: ItemPriority): string {
  if (priority === 'required')    return 'bg-red-500';
  if (priority === 'recommended') return 'bg-yellow-500';
  if (priority === 'nice')        return 'bg-blue-500';
  return 'bg-gray-700';
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

// ─── Long-press hook ──────────────────────────────────────────────────────────
function useLongPress(callback: () => void, ms = 600) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const start = useCallback(() => {
    timerRef.current = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(50);
      callback();
    }, ms);
  }, [callback, ms]);

  const cancel = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }, []);

  return {
    onMouseDown:  start,
    onMouseUp:    cancel,
    onMouseLeave: cancel,
    onTouchStart: start,
    onTouchEnd:   cancel,
    onTouchMove:  cancel,
  };
}

// ─── Main component ───────────────────────────────────────────────────────────
export function MyVanModal({ onClose, onOpenTools }: Props) {
  const [tab,            setTab]           = useState<Tab>('overview');
  const [inventory,      setInventory]     = useState<InventoryItem[]>(
    () => INITIAL_INVENTORY.map(i => ({ ...i })),
  );
  const [restockSet,     setRestockSet]    = useState<Set<string>>(
    () => new Set(INITIAL_INVENTORY.filter(i => itemStatus(i) !== 'ready').map(i => i.id)),
  );
  const [search,         setSearch]        = useState('');
  const [catFilter,      setCatFilter]     = useState<ItemCategory | null>(null);
  const [priorityFilter, setPriorityFilter]= useState<ItemPriority | 'all'>('all');
  const [detailItem,     setDetailItem]    = useState<InventoryItem | null>(null);
  const [contextItem,    setContextItem]   = useState<InventoryItem | null>(null);
  const [markUsedItem,   setMarkUsedItem]  = useState<InventoryItem | null>(null);
  const [markUsedQty,    setMarkUsedQty]   = useState(1);
  const [historyItem,    setHistoryItem]   = useState<InventoryItem | null>(null);
  const [addOpen,        setAddOpen]       = useState(false);
  const [scanOpen,       setScanOpen]      = useState(false);
  const [toast,          setToast]         = useState<string | null>(null);
  const [stockOpen,      setStockOpen]     = useState(false);

  const score     = useMemo(() => computeOverallReadiness(inventory), [inventory]);
  const sumScore  = useMemo(() => computeJobReadiness(inventory, 'summit'),    [inventory]);
  const nthScore  = useMemo(() => computeJobReadiness(inventory, 'northgate'), [inventory]);
  const ridScore  = useMemo(() => computeJobReadiness(inventory, 'ridgeline'), [inventory]);
  const comparison = useMemo(() => aiRouteComparison(inventory), [inventory]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  function getLive(id: string): InventoryItem {
    return inventory.find(i => i.id === id) ?? INITIAL_INVENTORY.find(i => i.id === id)!;
  }

  function setQty(id: string, qty: number) {
    const clamped = Math.max(0, qty);
    setInventory(prev => prev.map(i => i.id === id ? { ...i, qty: clamped } : i));
    const item = inventory.find(i => i.id === id);
    if (item) {
      const newStatus = clamped === 0 ? 'missing' : clamped < item.minQty ? 'low' : 'ready';
      setRestockSet(prev => {
        const s = new Set(prev);
        if (newStatus !== 'ready') s.add(id); else s.delete(id);
        return s;
      });
    }
  }

  function markLoaded(id: string) {
    const item = inventory.find(i => i.id === id);
    if (!item) return;
    setQty(id, item.minQty);
    setRestockSet(prev => { const s = new Set(prev); s.delete(id); return s; });
    showToast(`${item.name} marked as loaded`);
  }

  function markUsedConfirm() {
    if (!markUsedItem) return;
    const item = getLive(markUsedItem.id);
    const newQty = Math.max(0, item.qty - markUsedQty);
    setQty(markUsedItem.id, newQty);
    showToast(`Used ${markUsedQty} × ${item.name} → ${newQty} remaining`);
    setMarkUsedItem(null);
    setMarkUsedQty(1);
    setContextItem(null);
  }

  function toggleRestock(id: string) {
    setRestockSet(prev => { const s = new Set(prev); if (s.has(id)) s.delete(id); else s.add(id); return s; });
  }

  // Filtered inventory
  const filteredInventory = useMemo(() => {
    let list = inventory;
    if (catFilter) list = list.filter(i => i.category === catFilter);
    if (priorityFilter !== 'all') {
      list = list.filter(i => itemHighestPriority(i, TODAY_JOBS) === priorityFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(i => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q));
    }
    return list;
  }, [inventory, catFilter, priorityFilter, search]);

  const missingItems  = filteredInventory.filter(i => itemStatus(i) === 'missing');
  const lowItems      = filteredInventory.filter(i => itemStatus(i) === 'low');
  const readyItems    = filteredInventory.filter(i => itemStatus(i) === 'ready');

  const restockItems        = inventory.filter(i => restockSet.has(i.id));
  const restockCritical     = restockItems.filter(i => i.requiredFor.some(j => TODAY_JOBS.includes(j)) && itemStatus(i) === 'missing');
  const restockNeededToday  = restockItems.filter(i => !restockCritical.includes(i) && (i.recommendedFor.some(j => TODAY_JOBS.includes(j)) || i.requiredFor.some(j => TODAY_JOBS.includes(j))));
  const restockRoutine      = restockItems.filter(i => !restockCritical.includes(i) && !restockNeededToday.includes(i));

  const jobScores = { summit: sumScore, northgate: nthScore, ridgeline: ridScore };
  const readyCount = Object.values(jobScores).filter(s => s >= 90).length;

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
            <h2 className="text-lg font-bold text-white">My Van — Parts</h2>
            <div className="text-[10px] text-gray-500">Marcus Rivera · Unit #47 · {inventory.length} parts</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onOpenTools && (
            <button onClick={onOpenTools}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-orange-900/40 border border-orange-700/60 rounded-xl text-[10px] font-bold text-orange-300">
              🔧 Tools
            </button>
          )}
          <div className={`px-2 py-1 rounded-full border text-xs font-bold ${
            score >= 90 ? 'bg-green-900/40 border-green-700 text-green-300' :
            score >= 75 ? 'bg-yellow-900/40 border-yellow-700 text-yellow-300' :
                          'bg-red-900/40 border-red-700 text-red-300'
          }`}>{score}%</div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center">
            <X size={18} className="text-gray-400" />
          </button>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────── */}
      <div className="flex border-b border-gray-800 bg-gray-900 flex-shrink-0">
        {([
          ['overview',   'Overview',   LayoutDashboard],
          ['inventory',  'Inventory',  Package],
          ['restock',    'Restock',    ClipboardList],
        ] as const).map(([t, label, Icon]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold border-b-2 transition-colors ${
              tab === t ? 'border-teal-400 text-teal-300' : 'border-transparent text-gray-500'
            }`}>
            <Icon size={13} />
            {label}
            {t === 'restock' && restockSet.size > 0 && (
              <span className="bg-red-600 text-white text-[9px] font-bold rounded-full px-1.5 py-0.5 ml-0.5">{restockSet.size}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Content ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">

          {/* ════ OVERVIEW ════════════════════════════════════════ */}
          {tab === 'overview' && (
            <motion.div key="ov" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
              className="px-4 py-5 space-y-4 pb-8">

              {/* Readiness ring */}
              <div className="bg-gray-900 border border-gray-800 rounded-3xl p-5">
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-4">Inventory Confidence Score</div>
                <div className="flex items-center gap-4">
                  <ReadinessRing score={score} />
                  <div className="flex-1 space-y-2.5">
                    {Object.entries(jobScores).map(([jid, s]) => {
                      const j = JOB_INFO[jid];
                      const badge = readinessBadge(s);
                      return (
                        <div key={jid}>
                          <div className="flex items-center justify-between mb-0.5">
                            <div className="flex items-center gap-1.5">
                              <div className={`w-1.5 h-1.5 rounded-full ${j.dotColor}`} />
                              <span className="text-[11px] text-gray-300 font-medium">{j.abbr}</span>
                            </div>
                            <span className={`text-[11px] font-bold ${badge.color}`}>{badge.dot} {s}%</span>
                          </div>
                          <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${s}%`, backgroundColor: badge.ring }} />
                          </div>
                        </div>
                      );
                    })}
                    <div className="text-[10px] text-gray-600 pt-1">
                      {readyCount} of 3 jobs fully supported
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Route Comparison — the flagship card */}
              <div className={`border rounded-2xl p-4 ${
                comparison.status === 'ready'     ? 'bg-green-950/30 border-green-800/50' :
                comparison.status === 'incomplete' ? 'bg-red-950/30 border-red-800/50' :
                                                     'bg-yellow-950/30 border-yellow-800/50'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={12} className={
                    comparison.status === 'ready' ? 'text-green-400' :
                    comparison.status === 'incomplete' ? 'text-red-400' : 'text-yellow-400'
                  } />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">AI Route Assessment</span>
                </div>
                <p className={`text-sm font-bold mb-2 ${
                  comparison.status === 'ready' ? 'text-green-300' :
                  comparison.status === 'incomplete' ? 'text-red-300' : 'text-yellow-300'
                }`}>{comparison.headline}</p>

                {/* Missing required items */}
                {comparison.missingRequired.length > 0 && (
                  <div className="mb-2">
                    <div className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">Missing — cannot complete job:</div>
                    {comparison.missingRequired.map(({ item, jobs }) => (
                      <div key={item.id} className="flex items-start gap-1.5 mb-1">
                        <XCircle size={11} className="text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="text-xs font-semibold text-red-300">{item.name}</span>
                          <span className="text-[10px] text-gray-600 ml-1.5">
                            {jobs.map(j => JOB_INFO[j]?.abbr ?? j).join(', ')}
                          </span>
                          {item.substitutes && item.substitutes.length > 0 && (
                            <div className="mt-0.5 ml-0.5 text-[9px] text-gray-500">
                              Substitute: {item.substitutes[0].name}
                              <span className={`ml-1 ${item.substitutes[0].compatible ? 'text-green-400' : 'text-red-400'}`}>
                                {item.substitutes[0].compatible ? '✓ compatible' : '✗ not compatible'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Low required */}
                {comparison.lowRequired.length > 0 && (
                  <div className="mb-2">
                    <div className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">Low stock — risk of shortage:</div>
                    {comparison.lowRequired.map(({ item, jobs }) => (
                      <div key={item.id} className="flex items-start gap-1.5 mb-1">
                        <AlertTriangle size={11} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                        <span className="text-xs text-yellow-300 font-semibold">{item.name}</span>
                        <span className="text-[10px] text-gray-600">{item.qty}/{item.minQty} {item.unit}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Missing recommended */}
                {comparison.missingRecommended.length > 0 && (
                  <div>
                    <div className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">Missing — recommended for today:</div>
                    {comparison.missingRecommended.map(({ item, jobs }) => (
                      <div key={item.id} className="flex items-start gap-1.5 mb-1">
                        <Minus size={11} className="text-gray-500 flex-shrink-0 mt-0.5" />
                        <span className="text-xs text-gray-400">{item.name}</span>
                      </div>
                    ))}
                  </div>
                )}

                {comparison.status === 'ready' && (
                  <p className="text-xs text-green-400/80">{comparison.body}</p>
                )}
              </div>

              {/* Inventory health bar */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3">Inventory Health</div>
                <div className="h-2 rounded-full bg-gray-800 overflow-hidden flex mb-2">
                  <div className="bg-green-500 h-full" style={{ width: `${inventory.filter(i => itemStatus(i) === 'ready').length / inventory.length * 100}%` }} />
                  <div className="bg-yellow-500 h-full" style={{ width: `${inventory.filter(i => itemStatus(i) === 'low').length / inventory.length * 100}%` }} />
                  <div className="bg-red-500 h-full"    style={{ width: `${inventory.filter(i => itemStatus(i) === 'missing').length / inventory.length * 100}%` }} />
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-green-400 font-semibold">{inventory.filter(i => itemStatus(i) === 'ready').length} Good</span>
                  <span className="text-yellow-400 font-semibold">{inventory.filter(i => itemStatus(i) === 'low').length} Low</span>
                  <span className="text-red-400 font-semibold">{inventory.filter(i => itemStatus(i) === 'missing').length} Out</span>
                  <span className="text-gray-600">{inventory.length} items total</span>
                </div>
              </div>

              {/* Job readiness cards — Parts + Tools split */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Per-Job Readiness</div>
                <div className="space-y-2">
                  {Object.entries(jobScores).map(([jid, partsScore]) => {
                    const j = JOB_INFO[jid];
                    const toolsScore  = computeToolsReadiness(INITIAL_TOOLS, jid);
                    const toolsBadge  = toolReadinessBadge(toolsScore);
                    const required    = inventory.filter(i => i.requiredFor.includes(jid));
                    const recommended = inventory.filter(i => i.recommendedFor.includes(jid));
                    const missingReq  = required.filter(i => itemStatus(i) === 'missing');
                    const missingTools = INITIAL_TOOLS.filter(t => t.requiredFor.includes(jid) && t.status === 'missing');
                    return (
                      <div key={jid} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                        {/* Job header */}
                        <div className="flex items-center gap-2 mb-3">
                          <div className={`w-2 h-2 rounded-full ${j.dotColor}`} />
                          <span className="text-sm font-bold text-white flex-1">{j.abbr}</span>
                        </div>
                        {/* Two readiness rows */}
                        <div className="space-y-1.5 mb-3">
                          {/* Parts row */}
                          <div>
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-[10px] text-gray-500 font-medium">Parts Readiness</span>
                              <span className={`text-[11px] font-bold ${readinessBadge(partsScore).color}`}>
                                {readinessBadge(partsScore).dot} {partsScore}%
                              </span>
                            </div>
                            <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${partsScore}%`, backgroundColor: readinessBadge(partsScore).ring }} />
                            </div>
                          </div>
                          {/* Tools row */}
                          <div>
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-[10px] text-gray-500 font-medium">Tools Readiness</span>
                              <span className={`text-[11px] font-bold ${toolsBadge.color}`}>
                                {toolsBadge.dot} {toolsScore}%
                              </span>
                            </div>
                            <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{
                                width: `${toolsScore}%`,
                                backgroundColor: toolsScore >= 85 ? '#22c55e' : toolsScore >= 65 ? '#eab308' : '#ef4444',
                              }} />
                            </div>
                          </div>
                        </div>
                        {/* Parts detail */}
                        {required.length > 0 && (
                          <div className="mb-2">
                            <div className="text-[9px] text-gray-600 uppercase tracking-wider mb-1">Parts</div>
                            {required.map(item => {
                              const st = itemStatus(item);
                              return (
                                <div key={item.id} className="flex items-center gap-2 text-xs mb-0.5">
                                  {st === 'ready'   && <CheckCircle size={10} className="text-green-400 flex-shrink-0" />}
                                  {st === 'low'     && <AlertTriangle size={10} className="text-yellow-400 flex-shrink-0" />}
                                  {st === 'missing' && <XCircle size={10} className="text-red-400 flex-shrink-0" />}
                                  <span className={st === 'missing' ? 'text-red-300' : st === 'low' ? 'text-yellow-300' : 'text-gray-400'}>
                                    {item.name}
                                    {st !== 'ready' && <span className="text-gray-600 ml-1.5">{item.qty}/{item.minQty} {item.unit}</span>}
                                  </span>
                                </div>
                              );
                            })}
                            {recommended.slice(0, 2).map(item => {
                              const st = itemStatus(item);
                              if (st === 'ready') return null;
                              return (
                                <div key={item.id} className="flex items-center gap-2 text-xs mb-0.5 opacity-60">
                                  <Minus size={9} className="text-gray-600 flex-shrink-0" />
                                  <span className="text-gray-500">{item.name}</span>
                                  <span className="text-[9px] text-gray-700">rec.</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {/* Tools detail */}
                        {(() => {
                          const reqTools = INITIAL_TOOLS.filter(t => t.requiredFor.includes(jid));
                          if (reqTools.length === 0) return null;
                          return (
                            <div>
                              <div className="text-[9px] text-gray-600 uppercase tracking-wider mb-1">Tools</div>
                              {reqTools.map(t => (
                                <div key={t.id} className="flex items-center gap-2 text-xs mb-0.5">
                                  {t.status === 'loaded'  && <CheckCircle size={10} className="text-green-400 flex-shrink-0" />}
                                  {t.status === 'missing' && <XCircle size={10} className="text-red-400 flex-shrink-0" />}
                                  {t.status === 'recommended' && <AlertTriangle size={10} className="text-yellow-400 flex-shrink-0" />}
                                  <span className={t.status === 'missing' ? 'text-red-300' : 'text-gray-400'}>{t.name}</span>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                        {missingReq.length === 0 && missingTools.length === 0 && (
                          <div className="flex items-center gap-1.5 text-xs text-green-400 font-semibold mt-2">
                            <CheckCircle size={11} /> Parts and tools loaded
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* AI Stock list (Day Brief integration) */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                <button onClick={() => setStockOpen(o => !o)}
                  className="w-full flex items-center justify-between px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <Sparkles size={13} className="text-blue-400" />
                    <span className="text-sm font-bold text-white">Van vs. Today's Jobs</span>
                  </div>
                  <ChevronRight size={14} className={`text-gray-500 transition-transform ${stockOpen ? 'rotate-90' : ''}`} />
                </button>
                <AnimatePresence>
                  {stockOpen && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                      <div className="px-4 pb-4 border-t border-gray-800 pt-3 space-y-2">
                        {AI_STOCK_LIST.map((s, i) => (
                          <div key={i} className="flex items-start gap-2">
                            {s.ok === 'ready'   && <CheckCircle size={12} className="text-green-400 flex-shrink-0 mt-0.5" />}
                            {s.ok === 'low'     && <AlertTriangle size={12} className="text-yellow-400 flex-shrink-0 mt-0.5" />}
                            {s.ok === 'missing' && <XCircle size={12} className="text-red-400 flex-shrink-0 mt-0.5" />}
                            <div>
                              <div className={`text-xs font-semibold ${s.ok === 'ready' ? 'text-gray-300' : s.ok === 'low' ? 'text-yellow-300' : 'text-red-300'}`}>{s.item}</div>
                              <div className="text-[10px] text-gray-600">{s.reason}</div>
                            </div>
                          </div>
                        ))}
                        <div className="flex gap-3 mt-2 text-[9px] text-gray-600">
                          <span className="flex items-center gap-1"><CheckCircle size={8} className="text-green-400" /> In van</span>
                          <span className="flex items-center gap-1"><AlertTriangle size={8} className="text-yellow-400" /> Low</span>
                          <span className="flex items-center gap-1"><XCircle size={8} className="text-red-400" /> Missing</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Offline sync note */}
              <div className="flex items-start gap-2 bg-gray-900/50 border border-gray-800 rounded-xl px-3 py-2.5">
                <RefreshCw size={12} className="text-gray-600 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-gray-600 leading-relaxed">
                  All changes save locally. Syncs automatically when connectivity returns. Works on rooftops and mechanical rooms.
                </p>
              </div>
            </motion.div>
          )}

          {/* ════ INVENTORY ═══════════════════════════════════════ */}
          {tab === 'inventory' && (
            <motion.div key="inv" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
              className="flex flex-col h-full">

              {/* Search + filters */}
              <div className="px-4 pt-4 flex-shrink-0 space-y-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search parts, filters, tools, refrigerant…"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-9 pr-8 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-teal-600" />
                  {search && (
                    <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                      <X size={13} className="text-gray-500" />
                    </button>
                  )}
                </div>
                {/* Priority filter */}
                <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
                  {(['all', 'required', 'recommended', 'nice'] as const).map(p => (
                    <button key={p} onClick={() => setPriorityFilter(p)}
                      className={`flex-shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full border transition-colors ${
                        priorityFilter === p
                          ? p === 'required'    ? 'bg-red-700 border-red-600 text-white'
                          : p === 'recommended' ? 'bg-yellow-600 border-yellow-500 text-white'
                          : p === 'nice'        ? 'bg-blue-700 border-blue-600 text-white'
                          :                       'bg-teal-700 border-teal-600 text-white'
                          : 'bg-gray-800 border-gray-700 text-gray-400'
                      }`}>
                      {p === 'all' ? 'All' : p === 'nice' ? 'Nice to Have' : p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>
                {/* Category filter chips */}
                <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
                  <button onClick={() => setCatFilter(null)}
                    className={`flex-shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                      !catFilter ? 'bg-gray-600 border-gray-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-500'
                    }`}>All Categories</button>
                  {ALL_CATEGORIES.map(cat => (
                    <button key={cat} onClick={() => setCatFilter(catFilter === cat ? null : cat)}
                      className={`flex-shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                        catFilter === cat ? 'bg-gray-600 border-gray-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-500'
                      }`}>{cat}</button>
                  ))}
                </div>
              </div>

              {/* Priority legend */}
              <div className="px-4 pb-2 flex gap-3 text-[9px] text-gray-600">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Required</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" /> Recommended</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Nice to Have</span>
                <span className="text-gray-700 ml-auto">Hold to get options</span>
              </div>

              {/* Items */}
              <div className="flex-1 overflow-y-auto px-4 pb-24">
                {filteredInventory.length === 0 && (
                  <div className="text-center py-12 text-gray-600 text-sm">No items match your filters</div>
                )}
                {missingItems.length > 0 && (
                  <ItemGroup label="Out of Stock" accent="red" items={missingItems}
                    inventory={inventory} onTap={setDetailItem} onLongPress={setContextItem} />
                )}
                {lowItems.length > 0 && (
                  <ItemGroup label="Low Stock" accent="yellow" items={lowItems}
                    inventory={inventory} onTap={setDetailItem} onLongPress={setContextItem} />
                )}
                {readyItems.length > 0 && (
                  <ItemGroup label="Well Stocked" accent="green" items={readyItems}
                    inventory={inventory} onTap={setDetailItem} onLongPress={setContextItem} />
                )}
              </div>

              {/* Action bar */}
              <div className="absolute bottom-0 left-0 right-0 bg-gray-950/95 border-t border-gray-800 px-4 py-3 flex gap-2">
                <button onClick={() => setAddOpen(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-teal-700 rounded-xl py-3 text-xs font-bold text-white">
                  <Plus size={14} /> Add Part
                </button>
                <button onClick={() => setScanOpen(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-gray-800 border border-gray-700 rounded-xl py-3 text-xs font-bold text-gray-300">
                  <Camera size={14} /> Scan
                </button>
              </div>
            </motion.div>
          )}

          {/* ════ RESTOCK ═════════════════════════════════════════ */}
          {tab === 'restock' && (
            <motion.div key="rs" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
              className="px-4 py-5 pb-28 space-y-4">

              {restockSet.size === 0 ? (
                <div className="flex flex-col items-center py-16 gap-3">
                  <CheckCircle size={40} className="text-green-500" />
                  <p className="text-white font-bold text-lg">Restock list is clear</p>
                  <p className="text-gray-500 text-sm text-center">All items at or above minimum stock.</p>
                </div>
              ) : (
                <>
                  {restockCritical.length > 0 && (
                    <RestockGroup label="Critical — Required for Today"
                      labelColor="text-red-400" borderColor="border-red-900/50" bgColor="bg-red-950/20"
                      items={restockCritical} inventory={inventory}
                      onMarkLoaded={markLoaded} onRemove={id => toggleRestock(id)} />
                  )}
                  {restockNeededToday.length > 0 && (
                    <RestockGroup label="Needed Today — Recommended"
                      labelColor="text-yellow-400" borderColor="border-yellow-900/40" bgColor="bg-yellow-950/10"
                      items={restockNeededToday} inventory={inventory}
                      onMarkLoaded={markLoaded} onRemove={id => toggleRestock(id)} />
                  )}
                  {restockRoutine.length > 0 && (
                    <RestockGroup label="Routine Restock"
                      labelColor="text-gray-400" borderColor="border-gray-800" bgColor="bg-gray-900"
                      items={restockRoutine} inventory={inventory}
                      onMarkLoaded={markLoaded} onRemove={id => toggleRestock(id)} />
                  )}
                </>
              )}

              {restockSet.size > 0 && (
                <button
                  onClick={() => {
                    const ids = [...restockSet];
                    ids.forEach(id => markLoaded(id));
                    showToast(`${ids.length} items marked as loaded`);
                  }}
                  className="w-full bg-teal-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2">
                  <CheckCircle size={16} /> Mark All Loaded ({restockSet.size})
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── Item Detail Sheet ──────────────────────────────────── */}
      <AnimatePresence>
        {detailItem && (() => {
          const live     = getLive(detailItem.id);
          const st       = itemStatus(live);
          const priority = itemHighestPriority(live, TODAY_JOBS);
          const learning = aiLearningNote(live);
          const inRestock = restockSet.has(live.id);
          return (
            <motion.div key="detail"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="absolute inset-x-0 bottom-0 bg-gray-900 border-t border-gray-700 rounded-t-3xl z-10 p-5 pb-8 max-h-[85%] overflow-y-auto">
              <div className="w-10 h-1 bg-gray-700 rounded-full mx-auto mb-4" />
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0 pr-3">
                  <div className="text-[10px] text-gray-500 mb-0.5">{live.category}</div>
                  <h3 className="text-base font-bold text-white">{live.name}</h3>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <StatusBadge status={st} />
                    <PriorityPill priority={priority} />
                  </div>
                </div>
                <button onClick={() => setDetailItem(null)}>
                  <X size={18} className="text-gray-500" />
                </button>
              </div>

              {/* Prominent quantity display */}
              <div className="bg-gray-800 rounded-2xl p-5 mb-4">
                <div className="text-center mb-4">
                  <div className={`text-5xl font-black ${live.qty === 0 ? 'text-red-400' : live.qty < live.minQty ? 'text-yellow-400' : 'text-white'}`}>
                    {live.qty}
                  </div>
                  <div className="text-sm text-gray-400 mt-1">{live.unit} available</div>
                  <div className="text-[10px] text-gray-600 mt-0.5">Min stock: {live.minQty} {live.unit}</div>
                </div>
                <div className="flex items-center gap-4 justify-center">
                  <button onClick={() => setQty(live.id, live.qty - 1)}
                    className="w-12 h-12 rounded-xl bg-gray-700 flex items-center justify-center active:scale-95 transition-transform">
                    <Minus size={20} className="text-white" />
                  </button>
                  <div className="text-gray-500 text-sm font-medium">Adjust</div>
                  <button onClick={() => setQty(live.id, live.qty + 1)}
                    className="w-12 h-12 rounded-xl bg-teal-700 flex items-center justify-center active:scale-95 transition-transform">
                    <Plus size={20} className="text-white" />
                  </button>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-1.5 mb-4">
                {live.lastUsed && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Last used</span>
                    <span className="text-gray-300 font-medium">{live.lastUsed}</span>
                  </div>
                )}
                {live.usagePattern && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Usage pattern</span>
                    <span className="text-gray-300 font-medium text-right ml-4 max-w-[60%]">{live.usagePattern}</span>
                  </div>
                )}
                {[...live.requiredFor, ...live.recommendedFor].length > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Today's jobs</span>
                    <span className="text-gray-300 font-medium text-right ml-4">
                      {[...live.requiredFor, ...live.recommendedFor].map(j => JOB_INFO[j]?.abbr ?? j).join(', ')}
                    </span>
                  </div>
                )}
              </div>

              {/* Behavioral learning note */}
              {learning && (
                <div className="bg-purple-950/40 border border-purple-800/40 rounded-xl px-3 py-2.5 mb-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingUp size={10} className="text-purple-400" />
                    <span className="text-[9px] font-bold uppercase tracking-wider text-purple-400">AI Learning</span>
                  </div>
                  <p className="text-[11px] text-purple-200/80 leading-relaxed">{learning}</p>
                </div>
              )}

              {/* AI rec */}
              {live.aiRec && (
                <div className="bg-blue-950/40 border border-blue-800/40 rounded-xl px-3 py-2.5 mb-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Sparkles size={10} className="text-blue-400" />
                    <span className="text-[9px] font-bold uppercase tracking-wider text-blue-400">AI Note</span>
                  </div>
                  <p className="text-[11px] text-blue-100/80 leading-relaxed">{live.aiRec}</p>
                </div>
              )}

              {/* Substitutes */}
              {live.substitutes && live.substitutes.length > 0 && (
                <div className="bg-gray-800/60 border border-gray-700 rounded-xl px-3 py-2.5 mb-4">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-2">Nearby Substitutes</div>
                  {live.substitutes.map((sub, i) => (
                    <div key={i} className="mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold ${sub.compatible ? 'text-green-400' : 'text-red-400'}`}>
                          {sub.compatible ? '✓' : '✗'}
                        </span>
                        <span className="text-xs text-white font-medium">{sub.name}</span>
                        <span className={`text-[9px] ml-auto ${sub.compatible ? 'text-green-400' : 'text-red-400'}`}>
                          {sub.compatible ? 'Compatible' : 'Not compatible'}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 ml-4 mt-0.5">{sub.note}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={() => { setMarkUsedItem(live); setDetailItem(null); }}
                  className="flex-1 bg-gray-800 border border-gray-700 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-1.5">
                  <Minus size={14} /> Mark Used
                </button>
                <button onClick={() => { setHistoryItem(live); setDetailItem(null); }}
                  className="flex-1 bg-gray-800 border border-gray-700 text-gray-300 font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-1.5">
                  <History size={14} /> History
                </button>
                {st !== 'ready' && (
                  <button onClick={() => { markLoaded(live.id); setDetailItem(null); }}
                    className="flex-1 bg-teal-700 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-1.5">
                    <CheckCircle size={14} /> Loaded
                  </button>
                )}
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ─── Long-press Context Menu ─────────────────────────────── */}
      <AnimatePresence>
        {contextItem && (() => {
          const live = getLive(contextItem.id);
          return (
            <motion.div key="ctx" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gray-950/80 z-20 flex items-end">
              <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 350, damping: 32 }}
                className="w-full bg-gray-900 border-t border-gray-700 rounded-t-3xl p-5 pb-8">
                <div className="w-10 h-1 bg-gray-700 rounded-full mx-auto mb-4" />
                <div className="mb-4">
                  <div className="text-[10px] text-gray-500">{live.category}</div>
                  <div className="text-base font-bold text-white">{live.name}</div>
                  <div className="text-sm text-gray-400 mt-0.5">
                    <span className={`font-bold text-lg ${live.qty === 0 ? 'text-red-400' : live.qty < live.minQty ? 'text-yellow-400' : 'text-white'}`}>{live.qty}</span>
                    <span className="text-gray-600 ml-1">{live.unit} available</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {[
                    { icon: <Plus size={16} className="text-teal-400" />,       label: 'Adjust Quantity',      action: () => { setDetailItem(contextItem); setContextItem(null); } },
                    { icon: <Minus size={16} className="text-orange-400" />,     label: 'Mark Used',            action: () => { setMarkUsedItem(live); setMarkUsedQty(1); setContextItem(null); } },
                    { icon: <CheckCircle size={16} className="text-green-400" />,label: 'Mark Restocked',       action: () => { markLoaded(live.id); setContextItem(null); } },
                    { icon: <ShoppingCart size={16} className="text-blue-400" />,label: 'Order More',           action: () => { showToast('Order More — coming soon'); setContextItem(null); } },
                    { icon: <History size={16} className="text-purple-400" />,   label: 'View Usage History',   action: () => { setHistoryItem(live); setContextItem(null); } },
                  ].map((item, i) => (
                    <button key={i} onClick={item.action}
                      className="w-full flex items-center gap-4 px-4 py-3.5 bg-gray-800 rounded-2xl active:scale-98 transition-transform">
                      <div className="w-8 flex items-center justify-center flex-shrink-0">{item.icon}</div>
                      <span className="text-sm font-semibold text-white">{item.label}</span>
                      <ChevronRight size={14} className="text-gray-600 ml-auto" />
                    </button>
                  ))}
                </div>
                <button onClick={() => setContextItem(null)}
                  className="w-full mt-3 py-3.5 text-sm text-gray-500 font-semibold text-center">Cancel</button>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ─── Mark Used Sheet ─────────────────────────────────────── */}
      <AnimatePresence>
        {markUsedItem && (() => {
          const live = getLive(markUsedItem.id);
          return (
            <motion.div key="markused"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="absolute inset-x-0 bottom-0 bg-gray-900 border-t border-gray-700 rounded-t-3xl z-20 p-5 pb-8">
              <div className="w-10 h-1 bg-gray-700 rounded-full mx-auto mb-4" />
              <div className="flex items-start justify-between mb-5">
                <div>
                  <div className="text-[10px] text-gray-500">{live.category}</div>
                  <h3 className="text-base font-bold text-white">{live.name}</h3>
                  <div className="text-sm text-gray-400 mt-0.5">
                    <span className="font-bold text-white">{live.qty}</span> {live.unit} currently on truck
                  </div>
                </div>
                <button onClick={() => setMarkUsedItem(null)}><X size={18} className="text-gray-500" /></button>
              </div>

              <div className="text-xs text-gray-500 text-center mb-4">How many did you use?</div>
              <div className="flex items-center justify-center gap-8 mb-6">
                <button onClick={() => setMarkUsedQty(q => Math.max(1, q - 1))}
                  className="w-14 h-14 rounded-2xl bg-gray-800 flex items-center justify-center active:scale-95 transition-transform">
                  <Minus size={24} className="text-white" />
                </button>
                <div className="text-center">
                  <div className="text-5xl font-black text-white">{markUsedQty}</div>
                  <div className="text-xs text-gray-500 mt-1">{live.unit}</div>
                </div>
                <button onClick={() => setMarkUsedQty(q => Math.min(live.qty, q + 1))}
                  className="w-14 h-14 rounded-2xl bg-teal-700 flex items-center justify-center active:scale-95 transition-transform">
                  <Plus size={24} className="text-white" />
                </button>
              </div>

              {/* Preview of result */}
              <div className="bg-gray-800 rounded-xl px-4 py-3 mb-4 flex justify-between items-center">
                <span className="text-xs text-gray-500">After marking used</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">{live.qty}</span>
                  <span className="text-gray-600">→</span>
                  <span className={`text-sm font-bold ${(live.qty - markUsedQty) <= 0 ? 'text-red-400' : (live.qty - markUsedQty) < live.minQty ? 'text-yellow-400' : 'text-white'}`}>
                    {Math.max(0, live.qty - markUsedQty)} {live.unit}
                  </span>
                  {live.qty - markUsedQty < live.minQty && live.qty - markUsedQty >= 0 && (
                    <span className="text-[9px] text-yellow-500 bg-yellow-900/40 px-1.5 py-0.5 rounded-full">Will go low</span>
                  )}
                  {live.qty - markUsedQty < 0 && (
                    <span className="text-[9px] text-red-500 bg-red-900/40 px-1.5 py-0.5 rounded-full">Out of stock</span>
                  )}
                </div>
              </div>

              <button onClick={markUsedConfirm}
                className="w-full bg-teal-700 text-white font-bold py-4 rounded-2xl text-base">
                Confirm — Used {markUsedQty} {live.unit}
              </button>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ─── Usage History Panel ─────────────────────────────────── */}
      <AnimatePresence>
        {historyItem && (() => {
          const live = getLive(historyItem.id);
          return (
            <motion.div key="history"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="absolute inset-x-0 bottom-0 bg-gray-900 border-t border-gray-700 rounded-t-3xl z-20 p-5 pb-8">
              <div className="w-10 h-1 bg-gray-700 rounded-full mx-auto mb-4" />
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-[10px] text-gray-500">{live.category}</div>
                  <h3 className="text-base font-bold text-white">{live.name}</h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Clock size={10} className="text-gray-500" />
                    <span className="text-[10px] text-gray-500">Usage History</span>
                  </div>
                </div>
                <button onClick={() => setHistoryItem(null)}><X size={18} className="text-gray-500" /></button>
              </div>

              {(!live.usageHistory || live.usageHistory.length === 0) ? (
                <div className="text-center py-8 text-gray-600">
                  <History size={28} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No usage history recorded</p>
                  <p className="text-[10px] mt-1">Usage will appear here as you mark items used.</p>
                </div>
              ) : (
                <>
                  {/* Usage summary */}
                  <div className="bg-gray-800 rounded-xl px-4 py-3 mb-4 flex justify-between">
                    <div className="text-center">
                      <div className="text-xl font-black text-white">
                        {live.usageHistory.reduce((s, r) => s + r.qty, 0)}
                      </div>
                      <div className="text-[10px] text-gray-500">total used</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-black text-white">{live.usageHistory.length}</div>
                      <div className="text-[10px] text-gray-500">visits</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-black text-white">
                        {(live.usageHistory.reduce((s, r) => s + r.qty, 0) / live.usageHistory.length).toFixed(1)}
                      </div>
                      <div className="text-[10px] text-gray-500">avg / visit</div>
                    </div>
                  </div>

                  {/* Learning note */}
                  {aiLearningNote(live) && (
                    <div className="bg-purple-950/40 border border-purple-800/40 rounded-xl px-3 py-2.5 mb-4">
                      <div className="flex items-center gap-1.5 mb-1">
                        <TrendingUp size={10} className="text-purple-400" />
                        <span className="text-[9px] font-bold uppercase tracking-wider text-purple-400">AI Learning</span>
                      </div>
                      <p className="text-[11px] text-purple-200/80 leading-relaxed">{aiLearningNote(live)}</p>
                    </div>
                  )}

                  {/* History list */}
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {live.usageHistory.map((record, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2.5 bg-gray-800 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-gray-700 flex items-center justify-center flex-shrink-0">
                            <span className="text-[10px] font-bold text-gray-400">{record.qty}</span>
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-white">{record.site}</div>
                            <div className="text-[10px] text-gray-500">{record.date}</div>
                          </div>
                        </div>
                        <span className="text-xs text-gray-500">{record.qty} {live.unit}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ─── Add Part Modal ───────────────────────────────────────── */}
      <AnimatePresence>
        {addOpen && (
          <AddPartModal inventory={inventory}
            onAdd={(id, qty) => {
              const item = inventory.find(i => i.id === id);
              if (!item) return;
              setQty(id, item.qty + qty);
              setAddOpen(false);
              showToast(`Added ${qty} × ${item.name}`);
            }}
            onClose={() => setAddOpen(false)} />
        )}
      </AnimatePresence>

      {/* ─── Scan Coming Soon ─────────────────────────────────────── */}
      <AnimatePresence>
        {scanOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gray-950/95 flex flex-col items-center justify-center z-20 px-8">
            <Camera size={48} className="text-gray-600 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Barcode Scanning</h3>
            <p className="text-gray-400 text-center text-sm leading-relaxed mb-6">
              Barcode scanning is coming soon. Select the part manually from the inventory list for this prototype.
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
      <AnimatePresence>{toast && <Toast msg={toast} />}</AnimatePresence>
    </motion.div>
  );
}

// ─── Item Group ───────────────────────────────────────────────────────────────
function ItemGroup({
  label, accent, items, inventory, onTap, onLongPress,
}: {
  label: string; accent: 'red' | 'yellow' | 'green';
  items: InventoryItem[]; inventory: InventoryItem[];
  onTap: (item: InventoryItem) => void;
  onLongPress: (item: InventoryItem) => void;
}) {
  const accentClass = accent === 'red' ? 'text-red-400' : accent === 'yellow' ? 'text-yellow-400' : 'text-green-400';
  return (
    <div className="mb-4">
      <div className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 ${accentClass}`}>
        {label} · {items.length}
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        {items.map((item, idx) => {
          const live     = inventory.find(i => i.id === item.id) ?? item;
          const st       = itemStatus(live);
          const priority = itemHighestPriority(live, TODAY_JOBS);
          return (
            <ItemRow key={item.id} item={live} status={st} priority={priority}
              isLast={idx === items.length - 1}
              onTap={() => onTap(live)} onLongPress={() => onLongPress(live)} />
          );
        })}
      </div>
    </div>
  );
}

// ─── Item Row ─────────────────────────────────────────────────────────────────
function ItemRow({
  item, status, priority, isLast, onTap, onLongPress,
}: {
  item: InventoryItem; status: ItemStatus; priority: ItemPriority;
  isLast: boolean; onTap: () => void; onLongPress: () => void;
}) {
  const lp = useLongPress(onLongPress);
  return (
    <button {...lp}
      onClick={onTap}
      className={`w-full text-left flex items-center gap-0 active:bg-gray-800 transition-colors select-none ${
        isLast ? '' : 'border-b border-gray-800'
      }`}>
      {/* Priority bar */}
      <div className={`w-1 self-stretch flex-shrink-0 ${priorityBg(priority)}`} />
      <div className="flex-1 flex items-center gap-3 px-4 py-3.5">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-white leading-tight truncate">{item.name}</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] text-gray-500">{item.category}</span>
            {item.lastUsed && <span className="text-[9px] text-gray-700">· {item.lastUsed}</span>}
          </div>
        </div>
        {/* Prominent quantity */}
        <div className="text-right flex-shrink-0 mr-2">
          <div className={`text-xl font-black leading-none ${
            status === 'missing' ? 'text-red-400' : status === 'low' ? 'text-yellow-400' : 'text-white'
          }`}>{item.qty}</div>
          <div className="text-[9px] text-gray-600">{item.unit}</div>
        </div>
        <StatusBadge status={status} />
        <ChevronRight size={12} className="text-gray-700 flex-shrink-0" />
      </div>
    </button>
  );
}

// ─── Restock Group ────────────────────────────────────────────────────────────
function RestockGroup({
  label, labelColor, borderColor, bgColor, items, inventory, onMarkLoaded, onRemove,
}: {
  label: string; labelColor: string; borderColor: string; bgColor: string;
  items: InventoryItem[]; inventory: InventoryItem[];
  onMarkLoaded: (id: string) => void; onRemove: (id: string) => void;
}) {
  return (
    <div>
      <div className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${labelColor}`}>{label}</div>
      <div className={`${bgColor} border ${borderColor} rounded-2xl overflow-hidden`}>
        {items.map((item, idx) => {
          const live    = inventory.find(i => i.id === item.id) ?? item;
          const needed  = Math.max(0, live.minQty - live.qty);
          const jobList = [...live.requiredFor, ...live.recommendedFor]
            .filter(j => ['summit', 'northgate', 'ridgeline'].includes(j))
            .map(j => JOB_INFO[j]?.abbr ?? j).join(', ');
          const sub = live.substitutes?.[0];
          return (
            <div key={item.id} className={`px-4 py-3.5 ${idx < items.length - 1 ? 'border-b border-gray-800' : ''}`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <div className="text-sm font-bold text-white leading-snug">{live.name}</div>
                    {needed > 0 && (
                      <span className="text-[9px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded-full flex-shrink-0">
                        Need {needed} more
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                    <span>{live.qty}/{live.minQty} {live.unit}</span>
                    {jobList && <><span>·</span><span>{jobList}</span></>}
                  </div>
                  {live.aiRec && <div className="text-[10px] text-blue-400/80 mt-1 leading-relaxed">{live.aiRec}</div>}
                  {/* Substitute suggestion */}
                  {sub && (
                    <div className={`mt-1.5 text-[9px] px-2 py-1 rounded-lg ${sub.compatible ? 'bg-green-950/40 text-green-400' : 'bg-gray-800 text-gray-500'}`}>
                      Sub: {sub.name} · {sub.compatible ? '✓ Compatible' : '✗ Not compatible'}
                    </div>
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
}: { inventory: InventoryItem[]; onAdd: (id: string, qty: number) => void; onClose: () => void }) {
  const [search,   setSearch]   = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [qty,      setQtyState] = useState(1);
  const filtered = inventory.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
  const selectedItem = inventory.find(i => i.id === selected);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 bg-gray-950 z-20 flex flex-col">
      <div className="bg-gray-900 border-b border-gray-800 px-4 pt-10 pb-3 flex items-center gap-3">
        <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        <h3 className="text-base font-bold text-white">Add Part to Van</h3>
      </div>
      <div className="px-4 pt-3">
        <div className="relative mb-2">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search inventory…"
            className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-8 pr-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {filtered.map(item => (
          <button key={item.id} onClick={() => setSelected(item.id)}
            className={`w-full text-left px-3 py-3 flex items-center justify-between border-b border-gray-800 ${selected === item.id ? 'bg-teal-900/30' : ''}`}>
            <div>
              <div className="text-xs font-semibold text-white">{item.name}</div>
              <div className="text-[10px] text-gray-500">{item.category} · <span className={`font-bold ${item.qty === 0 ? 'text-red-400' : 'text-white'}`}>{item.qty}</span> {item.unit} in van</div>
            </div>
            {selected === item.id && <CheckCircle size={14} className="text-teal-400" />}
          </button>
        ))}
      </div>
      {selectedItem && (
        <div className="px-4 py-4 bg-gray-900 border-t border-gray-800">
          <div className="text-xs text-gray-400 mb-3">Adding to: <span className="text-white font-semibold">{selectedItem.name}</span></div>
          <div className="flex items-center gap-4 mb-4">
            <button onClick={() => setQtyState(q => Math.max(1, q - 1))}
              className="w-11 h-11 bg-gray-800 rounded-xl flex items-center justify-center">
              <Minus size={18} className="text-white" />
            </button>
            <div className="flex-1 text-center">
              <div className="text-3xl font-black text-white">{qty}</div>
              <div className="text-[10px] text-gray-500">{selectedItem.unit}</div>
            </div>
            <button onClick={() => setQtyState(q => q + 1)}
              className="w-11 h-11 bg-teal-700 rounded-xl flex items-center justify-center">
              <Plus size={18} className="text-white" />
            </button>
          </div>
          <button onClick={() => onAdd(selected!, qty)}
            className="w-full bg-teal-700 text-white font-bold py-3.5 rounded-2xl">
            Add {qty} {selectedItem.unit} to Van
          </button>
        </div>
      )}
    </motion.div>
  );
}
