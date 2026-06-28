import { useState, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Search, Plus, Minus, ChevronRight, CheckCircle, AlertTriangle,
  XCircle, Sparkles, Package, ClipboardList, LayoutDashboard,
  Camera, Trash2, RefreshCw, Clock, History, ShoppingCart,
  TrendingUp, ChevronDown, ChevronUp, Truck, Sun,
  MessageSquare, Tag, Radio, Star, Building2,
} from 'lucide-react';
import {
  INITIAL_INVENTORY, ALL_CATEGORIES, JOB_INFO, AI_STOCK_LIST,
  computeJobReadiness, computeOverallReadiness, itemStatus, aiRouteComparison,
  aiLearningNote, readinessBadge, itemHighestPriority,
  computeFirstVisitLikelihood, computeReturnTripRisk, returnTripRiskStyle,
  generateRestockSections, generateMorningBrief, NEARBY_TECHS,
  type InventoryItem, type ItemCategory, type ItemStatus, type ItemPriority,
} from './vanData';
import {
  INITIAL_TOOLS, computeToolsReadiness,
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
      <path d="M1 7 L25 7" />
      <path d="M8 2 L8 7" />
      <path d="M16 2 L16 7" />
      <rect x="3" y="9" width="4" height="3" rx="0.5" />
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

// ─── AI Tag pill ───────────────────────────────────────────────────────────────
function AITagPill({ tag }: { tag: string }) {
  const colors: Record<string, string> = {
    'Fast Moving':              'bg-blue-950/50 text-blue-400 border-blue-800/50',
    'High Failure Item':        'bg-orange-950/50 text-orange-400 border-orange-800/50',
    'Critical Spare':           'bg-red-950/50 text-red-400 border-red-800/50',
    'OEM Only':                 'bg-purple-950/50 text-purple-400 border-purple-800/50',
    'Long Lead Time':           'bg-amber-950/50 text-amber-400 border-amber-800/50',
    'Universal Part':           'bg-teal-950/50 text-teal-400 border-teal-800/50',
    'High Value':               'bg-yellow-950/50 text-yellow-400 border-yellow-800/50',
    'Large Item':               'bg-gray-800 text-gray-400 border-gray-700',
    'Seasonal':                 'bg-green-950/50 text-green-400 border-green-800/50',
    'Requires EPA Certification':'bg-red-950/50 text-red-400 border-red-800/50',
    'Rarely Used':              'bg-gray-800 text-gray-500 border-gray-700',
  };
  return (
    <span className={`inline-flex items-center gap-0.5 text-[8px] font-bold px-1.5 py-0.5 rounded-full border ${colors[tag] ?? 'bg-gray-800 text-gray-400 border-gray-700'}`}>
      <Tag size={7} />
      {tag}
    </span>
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
  const [receiptOpen,    setReceiptOpen]   = useState(false);
  const [shelfOpen,      setShelfOpen]     = useState(false);
  const [toast,          setToast]         = useState<string | null>(null);
  const [stockOpen,      setStockOpen]     = useState(false);
  const [briefOpen,      setBriefOpen]     = useState(true);
  const [borrowOpen,     setBorrowOpen]    = useState(false);

  // ── Tools readiness (memoized — tools don't change in prototype) ──────────
  const toolsReadiness = useMemo(() => ({
    summit:    computeToolsReadiness(INITIAL_TOOLS, 'summit'),
    northgate: computeToolsReadiness(INITIAL_TOOLS, 'northgate'),
    ridgeline: computeToolsReadiness(INITIAL_TOOLS, 'ridgeline'),
  }), []);

  // ── Parts readiness ────────────────────────────────────────────────────────
  const sumScore  = useMemo(() => computeJobReadiness(inventory, 'summit'),    [inventory]);
  const nthScore  = useMemo(() => computeJobReadiness(inventory, 'northgate'), [inventory]);
  const ridScore  = useMemo(() => computeJobReadiness(inventory, 'ridgeline'), [inventory]);
  const score     = useMemo(() => computeOverallReadiness(inventory), [inventory]);
  const comparison = useMemo(() => aiRouteComparison(inventory), [inventory]);

  // ── First Visit Likelihood + Return Trip Risk ─────────────────────────────
  const sumLikelihood = useMemo(
    () => computeFirstVisitLikelihood(inventory, toolsReadiness.summit,    'summit'),
    [inventory, toolsReadiness],
  );
  const nthLikelihood = useMemo(
    () => computeFirstVisitLikelihood(inventory, toolsReadiness.northgate, 'northgate'),
    [inventory, toolsReadiness],
  );
  const ridLikelihood = useMemo(
    () => computeFirstVisitLikelihood(inventory, toolsReadiness.ridgeline, 'ridgeline'),
    [inventory, toolsReadiness],
  );
  const sumRisk = useMemo(() => computeReturnTripRisk(sumLikelihood), [sumLikelihood]);
  const nthRisk = useMemo(() => computeReturnTripRisk(nthLikelihood), [nthLikelihood]);
  const ridRisk = useMemo(() => computeReturnTripRisk(ridLikelihood), [ridLikelihood]);
  const todaysReadiness = useMemo(
    () => Math.round((sumLikelihood + nthLikelihood + ridLikelihood) / 3),
    [sumLikelihood, nthLikelihood, ridLikelihood],
  );

  // ── Morning Brief + Smart Restock ─────────────────────────────────────────
  const morningBrief    = useMemo(() => generateMorningBrief(inventory, toolsReadiness),   [inventory, toolsReadiness]);
  const restockSections = useMemo(() => generateRestockSections(inventory), [inventory]);

  // ── Job scores map ────────────────────────────────────────────────────────
  const jobScores = { summit: sumScore, northgate: nthScore, ridgeline: ridScore };
  const jobLikelihoods = { summit: sumLikelihood, northgate: nthLikelihood, ridgeline: ridLikelihood };
  const jobRisks = { summit: sumRisk, northgate: nthRisk, ridgeline: ridRisk };
  const readyCount = Object.values(jobScores).filter(s => s >= 90).length;

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

  // ── Filtered inventory ────────────────────────────────────────────────────
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

  const missingItems = filteredInventory.filter(i => itemStatus(i) === 'missing');
  const lowItems     = filteredInventory.filter(i => itemStatus(i) === 'low');
  const readyItems   = filteredInventory.filter(i => itemStatus(i) === 'ready');

  const allRestockItems = inventory.filter(i => restockSet.has(i.id));

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
            todaysReadiness >= 85 ? 'bg-green-900/40 border-green-700 text-green-300' :
            todaysReadiness >= 70 ? 'bg-yellow-900/40 border-yellow-700 text-yellow-300' :
                                    'bg-red-900/40 border-red-700 text-red-300'
          }`}>{todaysReadiness}%</div>
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
            {t === 'restock' && allRestockItems.length > 0 && (
              <span className="bg-red-600 text-white text-[9px] font-bold rounded-full px-1.5 py-0.5 ml-0.5">{allRestockItems.length}</span>
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

              {/* ── 1. Morning AI Brief ──────────────────────────── */}
              <div className="bg-gray-900 border border-gray-700 rounded-3xl overflow-hidden">
                <button onClick={() => setBriefOpen(o => !o)}
                  className="w-full flex items-center justify-between px-4 py-4 active:bg-gray-800 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-orange-900/40 border border-orange-700/40 flex items-center justify-center flex-shrink-0">
                      <Sun size={14} className="text-orange-300" />
                    </div>
                    <div className="text-left">
                      <div className="text-[9px] font-bold uppercase tracking-wider text-orange-400">Morning AI Brief</div>
                      <div className="text-sm font-bold text-white">Good morning, {morningBrief.techName}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      todaysReadiness >= 85 ? 'bg-green-900/30 border-green-800 text-green-400' :
                      todaysReadiness >= 70 ? 'bg-yellow-900/30 border-yellow-800 text-yellow-400' :
                                              'bg-red-900/30 border-red-800 text-red-400'
                    }`}>{todaysReadiness}% ready</span>
                    {briefOpen
                      ? <ChevronUp size={14} className="text-gray-500" />
                      : <ChevronDown size={14} className="text-gray-500" />}
                  </div>
                </button>

                <AnimatePresence>
                  {briefOpen && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                      className="overflow-hidden">
                      <div className="px-4 pb-5 border-t border-gray-800 pt-4 space-y-4">

                        {/* Stats row */}
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-gray-800/60 rounded-xl p-2.5 text-center">
                            <div className="text-xl font-black text-white">{morningBrief.jobCount}</div>
                            <div className="text-[9px] text-gray-500">Jobs Today</div>
                          </div>
                          <div className="bg-gray-800/60 rounded-xl p-2.5 text-center">
                            <div className={`text-xl font-black ${
                              todaysReadiness >= 85 ? 'text-green-400' :
                              todaysReadiness >= 70 ? 'text-yellow-400' : 'text-red-400'
                            }`}>{todaysReadiness}%</div>
                            <div className="text-[9px] text-gray-500">Readiness</div>
                          </div>
                          <div className="bg-gray-800/60 rounded-xl p-2.5 text-center">
                            <div className="text-xl font-black text-orange-400">46m</div>
                            <div className="text-[9px] text-gray-500">Drive Time</div>
                          </div>
                        </div>

                        {/* Highest risk */}
                        {(() => {
                          const rStyle = returnTripRiskStyle(morningBrief.highestRisk);
                          return (
                            <div className={`${rStyle.bg} border ${rStyle.border} rounded-xl px-3 py-3`}>
                              <div className="flex items-center justify-between mb-1">
                                <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Highest Risk Job</div>
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border bg-black/20 ${rStyle.text} ${rStyle.border}`}>
                                  {rStyle.label} RISK
                                </span>
                              </div>
                              <div className="text-sm font-bold text-white">{morningBrief.highestRiskJob}</div>
                            </div>
                          );
                        })()}

                        {/* Weather */}
                        <div className="flex items-center gap-2.5 bg-orange-950/20 border border-orange-900/40 rounded-xl px-3 py-2.5">
                          <Sun size={12} className="text-orange-400 flex-shrink-0" />
                          <div>
                            <div className="text-xs font-bold text-orange-300">{morningBrief.weatherNote}</div>
                            <div className="text-[10px] text-orange-400/70 mt-0.5">Expect elevated head pressures today.</div>
                          </div>
                        </div>

                        {/* Must grab */}
                        {morningBrief.mustGrab.length > 0 && (
                          <div>
                            <div className="text-[9px] font-bold uppercase tracking-wider text-red-400 mb-2">⚠ Must Grab Before Leaving</div>
                            <div className="space-y-1.5">
                              {morningBrief.mustGrab.map((item, i) => (
                                <div key={i} className="bg-red-950/20 border border-red-900/30 rounded-xl px-3 py-2">
                                  <div className="text-xs font-bold text-white">{item.name}</div>
                                  <div className="text-[10px] text-red-400/70 leading-relaxed mt-0.5 line-clamp-2">{item.reason}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Leave behind */}
                        {morningBrief.leaveBehind.length > 0 && (
                          <div>
                            <div className="text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-2">Leave Behind — Not Needed Today</div>
                            <div className="space-y-1">
                              {morningBrief.leaveBehind.map((item, i) => (
                                <div key={i} className="text-[10px] text-gray-500 flex items-center gap-2">
                                  <span className="w-1 h-1 rounded-full bg-gray-600 flex-shrink-0" />
                                  <span className="text-gray-400 font-medium">{item.name}</span>
                                  <span className="text-gray-600">— not needed today</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* AI Insights */}
                        <div>
                          <div className="flex items-center gap-1.5 mb-2">
                            <Sparkles size={10} className="text-purple-400" />
                            <div className="text-[9px] font-bold uppercase tracking-wider text-purple-400">AI Field Insights</div>
                          </div>
                          <div className="space-y-1.5">
                            {morningBrief.aiInsights.map((insight, i) => (
                              <div key={i} className="flex items-start gap-2">
                                <div className="w-4 h-4 rounded-full bg-purple-900/40 border border-purple-800/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <span className="text-[8px] font-bold text-purple-400">{i + 1}</span>
                                </div>
                                <p className="text-[11px] text-gray-400 leading-relaxed">{insight}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ── 2. Today's Readiness ─────────────────────────── */}
              <div className="bg-gray-900 border border-gray-800 rounded-3xl p-5">
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Today's Readiness</div>
                <div className="text-[10px] text-gray-600 mb-4">
                  {todaysReadiness}% probability of completing all scheduled work without returning
                </div>
                <div className="flex items-center gap-4">
                  <ReadinessRing score={score} />
                  <div className="flex-1 space-y-2.5">
                    {Object.entries(jobScores).map(([jid, s]) => {
                      const j = JOB_INFO[jid];
                      const badge = readinessBadge(s);
                      const tScore = toolsReadiness[jid as keyof typeof toolsReadiness];
                      return (
                        <div key={jid}>
                          <div className="flex items-center justify-between mb-0.5">
                            <div className="flex items-center gap-1.5">
                              <div className={`w-1.5 h-1.5 rounded-full ${j.dotColor}`} />
                              <span className="text-[11px] text-gray-300 font-medium">{j.abbr}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] text-gray-600">Parts</span>
                              <span className={`text-[11px] font-bold ${badge.color}`}>{s}%</span>
                            </div>
                          </div>
                          <div className="h-1 bg-gray-800 rounded-full overflow-hidden mb-0.5">
                            <div className="h-full rounded-full transition-all" style={{ width: `${s}%`, backgroundColor: badge.ring }} />
                          </div>
                          <div className="flex justify-between">
                            <div className="h-1 bg-gray-800 rounded-full overflow-hidden flex-1 mr-0">
                              <div className="h-full rounded-full bg-orange-600 transition-all" style={{ width: `${tScore}%` }} />
                            </div>
                            <span className="text-[9px] text-gray-600 ml-1.5">Tools {tScore}%</span>
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

              {/* ── 3. AI Field Advisor ──────────────────────────── */}
              <div className={`border rounded-2xl p-4 ${
                comparison.status === 'ready'      ? 'bg-green-950/30 border-green-800/50' :
                comparison.status === 'incomplete'  ? 'bg-red-950/30 border-red-800/50' :
                                                      'bg-yellow-950/30 border-yellow-800/50'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={12} className={
                    comparison.status === 'ready' ? 'text-green-400' :
                    comparison.status === 'incomplete' ? 'text-red-400' : 'text-yellow-400'
                  } />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">AI Field Advisor</span>
                </div>
                <p className={`text-sm font-bold mb-2 ${
                  comparison.status === 'ready' ? 'text-green-300' :
                  comparison.status === 'incomplete' ? 'text-red-300' : 'text-yellow-300'
                }`}>{comparison.headline}</p>

                {/* Missing required items */}
                {comparison.missingRequired.length > 0 && (
                  <div className="mb-2">
                    <div className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">Cannot complete job without these:</div>
                    {comparison.missingRequired.map(({ item, jobs }, i) => (
                      <div key={i} className="flex items-start gap-2 mb-1">
                        <XCircle size={10} className="text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="text-xs text-red-300 font-semibold">{item.name}</span>
                          <span className="text-[10px] text-gray-600 ml-1.5">
                            {jobs.map(j => JOB_INFO[j]?.abbr ?? j).join(', ')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Low required items */}
                {comparison.lowRequired.length > 0 && (
                  <div className="mb-2">
                    <div className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">Running low — replenish before dispatch:</div>
                    {comparison.lowRequired.map(({ item, jobs }, i) => (
                      <div key={i} className="flex items-start gap-2 mb-1">
                        <AlertTriangle size={10} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="text-xs text-yellow-300 font-semibold">{item.name}</span>
                          <span className="text-[10px] text-gray-600 ml-1.5">
                            {jobs.map(j => JOB_INFO[j]?.abbr ?? j).join(', ')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Missing recommended — technician language */}
                {comparison.missingRecommended.length > 0 && (
                  <div className="mb-2">
                    <div className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">Prevents return trips — frequently replaced with today's failures:</div>
                    {comparison.missingRecommended.map(({ item, jobs }, i) => (
                      <div key={i} className="flex items-start gap-2 mb-1">
                        <AlertTriangle size={10} className="text-blue-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="text-xs text-blue-300 font-semibold">{item.name}</span>
                          <span className="text-[10px] text-gray-600 ml-1.5">
                            {jobs.map(j => JOB_INFO[j]?.abbr ?? j).join(', ')}
                          </span>
                          {item.aiRec && (
                            <div className="text-[9px] text-gray-600 leading-relaxed mt-0.5">{item.aiRec}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {comparison.body && (
                  <p className="text-[11px] text-gray-400 leading-relaxed mb-3">{comparison.body}</p>
                )}

                {/* Inventory Health (collapsible) */}
                <div className="border-t border-gray-700/50 mt-3 pt-3">
                  <button onClick={() => setStockOpen(o => !o)}
                    className="w-full flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-400">Inventory Health Check</span>
                    {stockOpen ? <ChevronUp size={12} className="text-gray-600" /> : <ChevronDown size={12} className="text-gray-600" />}
                  </button>
                  <AnimatePresence>
                    {stockOpen && (
                      <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                        <div className="pt-3 space-y-2">
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
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* ── 4. Return Trip Risk — Per Job ────────────────── */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3">Return Trip Risk — Today's Jobs</div>
                <div className="space-y-2">
                  {(['summit', 'northgate', 'ridgeline'] as const).map(jobId => {
                    const j         = JOB_INFO[jobId];
                    const likelihood = jobLikelihoods[jobId];
                    const risk       = jobRisks[jobId];
                    const partScore  = jobScores[jobId];
                    const toolScore  = toolsReadiness[jobId];
                    const rStyle     = returnTripRiskStyle(risk);
                    const missingReq = comparison.missingRequired.filter(m => m.jobs.includes(jobId));
                    const lowReq     = comparison.lowRequired.filter(m => m.jobs.includes(jobId));
                    return (
                      <div key={jobId} className={`${rStyle.bg} border ${rStyle.border} rounded-2xl p-4`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${j.dotColor}`} />
                            <span className="text-sm font-bold text-white">{j.name}</span>
                          </div>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border bg-black/20 ${rStyle.text} ${rStyle.border}`}>
                            {rStyle.label} RISK
                          </span>
                        </div>

                        {/* First visit likelihood */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className="text-[10px] text-gray-400">
                            First Visit: <span className={`font-bold text-sm ${rStyle.text}`}>{likelihood}%</span>
                          </div>
                          <div className="flex-1 h-1.5 bg-black/20 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{
                              width: `${likelihood}%`,
                              backgroundColor: risk === 'Very Low' || risk === 'Low' ? '#22c55e' :
                                               risk === 'Medium' ? '#eab308' :
                                               risk === 'High' ? '#f97316' : '#ef4444',
                            }} />
                          </div>
                        </div>

                        {/* Parts + Tools mini bars */}
                        <div className="space-y-1 mb-3">
                          <div className="flex items-center gap-2">
                            <div className="text-[9px] text-gray-500 w-10 flex-shrink-0">Parts</div>
                            <div className="flex-1 h-1 bg-black/20 rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${partScore}%` }} />
                            </div>
                            <div className="text-[9px] text-gray-400 font-bold w-8 text-right">{partScore}%</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-[9px] text-gray-500 w-10 flex-shrink-0">Tools</div>
                            <div className="flex-1 h-1 bg-black/20 rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${toolScore}%` }} />
                            </div>
                            <div className="text-[9px] text-gray-400 font-bold w-8 text-right">{toolScore}%</div>
                          </div>
                        </div>

                        {/* Critical missing */}
                        {missingReq.length > 0 && (
                          <div className="bg-black/10 rounded-xl px-3 py-2">
                            <div className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">Missing — will block job:</div>
                            {missingReq.map(({ item }, i) => (
                              <div key={i} className="flex items-center gap-1.5 mb-0.5">
                                <XCircle size={9} className="text-red-400 flex-shrink-0" />
                                <span className="text-[10px] text-red-300 font-semibold">{item.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {lowReq.length > 0 && missingReq.length === 0 && (
                          <div className="bg-black/10 rounded-xl px-3 py-2">
                            <div className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">Running low:</div>
                            {lowReq.map(({ item }, i) => (
                              <div key={i} className="flex items-center gap-1.5 mb-0.5">
                                <AlertTriangle size={9} className="text-yellow-400 flex-shrink-0" />
                                <span className="text-[10px] text-yellow-300 font-semibold">{item.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {missingReq.length === 0 && lowReq.length === 0 && (
                          <div className="flex items-center gap-1.5">
                            <CheckCircle size={10} className="text-green-400" />
                            <span className="text-[10px] text-green-400 font-semibold">All required parts accounted for</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── 5. Borrow From Another Van ───────────────────── */}
              <div>
                <button onClick={() => setBorrowOpen(o => !o)}
                  className="w-full flex items-center justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Borrow From Another Van</div>
                      <span className="text-[8px] bg-purple-900/30 text-purple-400 border border-purple-800/40 px-1.5 py-0.5 rounded-full font-bold">FUTURE</span>
                    </div>
                    <div className="text-[10px] text-gray-600 mt-0.5 text-left">{NEARBY_TECHS.length} nearby techs · architecture preview</div>
                  </div>
                  {borrowOpen ? <ChevronUp size={14} className="text-gray-600" /> : <ChevronDown size={14} className="text-gray-600" />}
                </button>

                <AnimatePresence>
                  {borrowOpen && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                      <div className="space-y-3 pb-1">
                        {NEARBY_TECHS.map(tech => (
                          <div key={tech.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-blue-900/40 border border-blue-700/40 flex items-center justify-center">
                                  <span className="text-xs font-black text-blue-300">{tech.initials}</span>
                                </div>
                                <div>
                                  <div className="text-sm font-bold text-white">{tech.name}</div>
                                  <div className="text-[10px] text-gray-500">{tech.vanId} · {tech.distanceMi} mi · ~{tech.etaMin} min ETA</div>
                                </div>
                              </div>
                              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border ${
                                tech.status === 'available'  ? 'bg-green-900/40 text-green-400 border-green-800'  :
                                tech.status === 'on-call'    ? 'bg-yellow-900/40 text-yellow-400 border-yellow-800' :
                                                               'bg-blue-900/40 text-blue-400 border-blue-800'
                              }`}>{tech.status.replace('-', ' ').toUpperCase()}</span>
                            </div>

                            <div className="flex flex-wrap gap-1.5 mb-3">
                              {tech.availItems.map(item => (
                                <span key={item.id}
                                  className="text-[9px] font-semibold bg-gray-800 border border-gray-700 text-gray-300 px-2 py-0.5 rounded-lg">
                                  {item.qty}× {item.name}
                                </span>
                              ))}
                            </div>

                            <div className="flex gap-1.5">
                              <button onClick={() => showToast('Transfer request — coming soon')}
                                className="flex-1 bg-gray-800 border border-gray-700 text-[10px] font-bold text-gray-300 py-2 rounded-xl flex items-center justify-center gap-1">
                                <Truck size={10} /> Transfer
                              </button>
                              <button onClick={() => showToast('Reserve — coming soon')}
                                className="flex-1 bg-gray-800 border border-gray-700 text-[10px] font-bold text-gray-300 py-2 rounded-xl flex items-center justify-center gap-1">
                                <Star size={10} /> Reserve
                              </button>
                              <button onClick={() => showToast('Message sent to ' + tech.name)}
                                className="flex-1 bg-gray-800 border border-gray-700 text-[10px] font-bold text-gray-300 py-2 rounded-xl flex items-center justify-center gap-1">
                                <MessageSquare size={10} /> Message
                              </button>
                            </div>
                          </div>
                        ))}

                        <div className="bg-purple-950/20 border border-purple-800/30 rounded-xl px-3 py-2.5 flex items-center gap-2">
                          <Radio size={10} className="text-purple-400 flex-shrink-0" />
                          <p className="text-[10px] text-purple-400/70 leading-relaxed">
                            Van-to-van transfer, real-time availability, and inventory reservation ship in a future release.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ── 6. Offline sync note ─────────────────────────── */}
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
                    placeholder="Search parts, filters, refrigerant…"
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
                  <ShoppingCart size={13} /> Add Part
                </button>
                <button onClick={() => setReceiptOpen(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-gray-800 border border-gray-700 rounded-xl py-3 text-xs font-bold text-gray-300">
                  <Camera size={13} /> Scan Receipt
                </button>
                <button onClick={() => setShelfOpen(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-gray-800 border border-gray-700 rounded-xl py-3 text-xs font-bold text-gray-300">
                  <Building2 size={13} /> Shelf Scan
                </button>
              </div>
            </motion.div>
          )}

          {/* ════ RESTOCK ═════════════════════════════════════════ */}
          {tab === 'restock' && (
            <motion.div key="rs" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
              className="px-4 py-5 pb-28 space-y-5">

              {restockSections.length === 0 ? (
                <div className="flex flex-col items-center py-16 gap-3">
                  <CheckCircle size={40} className="text-green-500" />
                  <p className="text-white font-bold text-lg">Van is fully stocked</p>
                  <p className="text-gray-500 text-sm text-center">All items at or above minimum for today's jobs.</p>
                </div>
              ) : (
                restockSections.map(section => (
                  <SmartRestockSection
                    key={section.category}
                    section={section}
                    inventory={inventory}
                    onMarkLoaded={markLoaded}
                    onRemove={id => toggleRestock(id)}
                    onShowToast={showToast}
                  />
                ))
              )}

              {allRestockItems.length > 0 && (
                <button
                  onClick={() => {
                    const ids = [...allRestockItems.map(i => i.id)];
                    ids.forEach(id => markLoaded(id));
                    showToast(`${ids.length} items marked as loaded`);
                  }}
                  className="w-full bg-teal-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2">
                  <CheckCircle size={16} /> Mark All Loaded ({allRestockItems.length})
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
              className="absolute inset-x-0 bottom-0 bg-gray-900 border-t border-gray-700 rounded-t-3xl z-10 p-5 pb-8 max-h-[90%] overflow-y-auto">
              <div className="w-10 h-1 bg-gray-700 rounded-full mx-auto mb-4" />
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0 pr-3">
                  <div className="text-[10px] text-gray-500 mb-0.5">{live.category}</div>
                  <h3 className="text-base font-bold text-white">{live.name}</h3>
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <StatusBadge status={st} />
                    <PriorityPill priority={priority} />
                  </div>
                  {/* AI Tags */}
                  {live.aiTags && live.aiTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {live.aiTags.map(tag => <AITagPill key={tag} tag={tag} />)}
                    </div>
                  )}
                </div>
                <button onClick={() => setDetailItem(null)}>
                  <X size={18} className="text-gray-500" />
                </button>
              </div>

              {/* Quantity display */}
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

              {/* AI Learning note */}
              {learning && (
                <div className="bg-purple-950/40 border border-purple-800/40 rounded-xl px-3 py-2.5 mb-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingUp size={10} className="text-purple-400" />
                    <span className="text-[9px] font-bold uppercase tracking-wider text-purple-400">AI Learning</span>
                  </div>
                  <p className="text-[11px] text-purple-200/80 leading-relaxed">{learning}</p>
                </div>
              )}

              {/* Supply House (if data available) */}
              {live.supplierName ? (
                <div className="bg-gray-800/60 border border-gray-700 rounded-xl px-3 py-3 mb-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Building2 size={10} className="text-blue-400" />
                    <span className="text-[9px] font-bold uppercase tracking-wider text-blue-400">Nearest Supply House</span>
                  </div>
                  <div className="flex items-start justify-between mb-1.5">
                    <span className="text-xs font-bold text-white">{live.supplierName}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                      live.supplierAvailability === 'In Stock'      ? 'bg-green-900/50 text-green-400 border border-green-800' :
                      live.supplierAvailability === 'Low Stock'     ? 'bg-yellow-900/50 text-yellow-400 border border-yellow-800' :
                      live.supplierAvailability === 'Special Order' ? 'bg-red-900/50 text-red-400 border border-red-800' :
                                                                       'bg-gray-800 text-gray-400 border border-gray-700'
                    }`}>{live.supplierAvailability}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    {live.supplierPrice !== undefined && (
                      <div><span className="text-gray-500">Price</span> <span className="text-gray-300 font-bold">${live.supplierPrice.toFixed(2)}</span></div>
                    )}
                    {live.pickupTimeMin !== undefined && (
                      <div><span className="text-gray-500">Pickup</span> <span className="text-gray-300 font-bold">~{live.pickupTimeMin} min</span></div>
                    )}
                    {live.oemPartNumber && (
                      <div className="col-span-2"><span className="text-gray-500">OEM #</span> <span className="text-gray-300 font-bold font-mono">{live.oemPartNumber}</span></div>
                    )}
                    {live.universalAlternative && (
                      <div className="col-span-2"><span className="text-gray-500">Universal</span> <span className="text-teal-400 font-bold">{live.universalAlternative}</span></div>
                    )}
                  </div>
                  <button onClick={() => showToast('Supply house integration — coming soon')}
                    className="mt-2 w-full bg-blue-900/30 border border-blue-800/50 text-blue-300 text-[10px] font-bold py-2 rounded-xl flex items-center justify-center gap-1.5">
                    <ShoppingCart size={10} /> Order Now — Coming Soon
                  </button>
                </div>
              ) : (
                <div className="bg-gray-800/40 border border-gray-800 rounded-xl px-3 py-2.5 mb-4">
                  <div className="flex items-center gap-1.5">
                    <Building2 size={10} className="text-gray-600" />
                    <span className="text-[9px] font-bold uppercase tracking-wider text-gray-600">Supply House</span>
                    <span className="text-[8px] text-gray-700 ml-auto">Not configured</span>
                  </div>
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

              {!inRestock && st !== 'ready' && (
                <button onClick={() => { toggleRestock(live.id); showToast(`${live.name} added to restock`); setDetailItem(null); }}
                  className="w-full mt-2 bg-gray-800 border border-gray-700 text-gray-300 font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-1.5">
                  <ShoppingCart size={14} /> Add to Restock List
                </button>
              )}
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
                    { icon: <Minus size={16} className="text-orange-400" />,    label: 'Mark Used',            action: () => { setMarkUsedItem(live); setMarkUsedQty(1); setContextItem(null); } },
                    { icon: <CheckCircle size={16} className="text-green-400" />,label: 'Mark Restocked',      action: () => { markLoaded(live.id); setContextItem(null); } },
                    { icon: <ShoppingCart size={16} className="text-blue-400" />,label: 'Add to Restock List', action: () => { toggleRestock(live.id); showToast(`${live.name} added to restock`); setContextItem(null); } },
                    { icon: <History size={16} className="text-purple-400" />,  label: 'View Usage History',   action: () => { setHistoryItem(live); setContextItem(null); } },
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

      {/* ─── Mark Used Sheet ──────────────────────────────────────── */}
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
                    <span className={`font-bold ${live.qty === 0 ? 'text-red-400' : live.qty < live.minQty ? 'text-yellow-400' : 'text-white'}`}>{live.qty}</span>
                    <span className="text-gray-600 ml-1">{live.unit} in van</span>
                  </div>
                </div>
                <button onClick={() => { setMarkUsedItem(null); setMarkUsedQty(1); }}><X size={18} className="text-gray-500" /></button>
              </div>
              <div className="text-xs text-gray-400 mb-3 font-semibold">How many did you use?</div>
              <div className="flex items-center gap-4 justify-center mb-6">
                <button onClick={() => setMarkUsedQty(q => Math.max(1, q - 1))}
                  className="w-14 h-14 rounded-xl bg-gray-800 flex items-center justify-center active:scale-95 transition-transform">
                  <Minus size={22} className="text-white" />
                </button>
                <div className="text-center">
                  <div className="text-5xl font-black text-white">{markUsedQty}</div>
                  <div className="text-[10px] text-gray-500 mt-1">{live.unit} used</div>
                </div>
                <button onClick={() => setMarkUsedQty(q => Math.min(q + 1, live.qty))}
                  className="w-14 h-14 rounded-xl bg-teal-700 flex items-center justify-center active:scale-95 transition-transform">
                  <Plus size={22} className="text-white" />
                </button>
              </div>
              <button onClick={markUsedConfirm}
                className="w-full bg-orange-700 text-white font-bold py-4 rounded-2xl text-base flex items-center justify-center gap-2">
                <Minus size={16} /> Confirm — Used {markUsedQty} {live.unit}
              </button>
              <div className="text-center text-[10px] text-gray-600 mt-2">
                {live.qty - markUsedQty >= 0 ? `${live.qty - markUsedQty} ${live.unit} will remain in van` : 'Quantity would go below zero'}
              </div>
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

                  {aiLearningNote(live) && (
                    <div className="bg-purple-950/40 border border-purple-800/40 rounded-xl px-3 py-2.5 mb-4">
                      <div className="flex items-center gap-1.5 mb-1">
                        <TrendingUp size={10} className="text-purple-400" />
                        <span className="text-[9px] font-bold uppercase tracking-wider text-purple-400">AI Learning</span>
                      </div>
                      <p className="text-[11px] text-purple-200/80 leading-relaxed">{aiLearningNote(live)}</p>
                    </div>
                  )}

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
              <button onClick={() => { setMarkUsedItem(live); setHistoryItem(null); }}
                className="w-full mt-4 bg-gray-800 border border-gray-700 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2">
                <Minus size={14} /> Mark Used Now
              </button>
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

      {/* ─── Scan Receipt Placeholder ─────────────────────────────── */}
      <AnimatePresence>
        {receiptOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gray-950 z-20 flex flex-col">
            <div className="bg-gray-900 border-b border-gray-800 px-4 pt-10 pb-3 flex items-center gap-3">
              <button onClick={() => setReceiptOpen(false)}><X size={20} className="text-gray-400" /></button>
              <h3 className="text-base font-bold text-white">Scan Receipt</h3>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center px-8">
              {/* Camera viewfinder mockup */}
              <div className="w-64 h-44 bg-gray-900 border-2 border-dashed border-gray-700 rounded-2xl flex items-center justify-center mb-6 relative">
                <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-teal-500 rounded-tl" />
                <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-teal-500 rounded-tr" />
                <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-teal-500 rounded-bl" />
                <div className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-teal-500 rounded-br" />
                <Camera size={32} className="text-gray-600" />
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-teal-400 mb-2">Coming Soon</div>
              <h3 className="text-xl font-bold text-white mb-2 text-center">AI Receipt Scanning</h3>
              <div className="space-y-2 mb-6 w-full max-w-xs">
                {[
                  'Take a photo of your supply house receipt',
                  'AI reads every line item automatically',
                  'Inventory updates with quantities and prices',
                  'Supply house records sync for future orders',
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-teal-900/50 border border-teal-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-[9px] font-black text-teal-400">{i + 1}</span>
                    </div>
                    <p className="text-sm text-gray-400">{step}</p>
                  </div>
                ))}
              </div>
              <button onClick={() => { setReceiptOpen(false); showToast('Scan Receipt — coming soon'); }}
                className="w-full max-w-xs bg-teal-700/40 border border-teal-700 text-teal-200 font-bold px-6 py-3 rounded-2xl">
                Notify Me When Available
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Shelf Scan Placeholder ───────────────────────────────── */}
      <AnimatePresence>
        {shelfOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gray-950 z-20 flex flex-col">
            <div className="bg-gray-900 border-b border-gray-800 px-4 pt-10 pb-3 flex items-center gap-3">
              <button onClick={() => setShelfOpen(false)}><X size={20} className="text-gray-400" /></button>
              <h3 className="text-base font-bold text-white">Shelf Scan</h3>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center px-8">
              <div className="w-64 h-44 bg-gray-900 border-2 border-dashed border-gray-700 rounded-2xl flex items-center justify-center mb-6 relative">
                <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-purple-500 rounded-tl" />
                <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-purple-500 rounded-tr" />
                <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-purple-500 rounded-bl" />
                <div className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-purple-500 rounded-br" />
                <Building2 size={32} className="text-gray-600" />
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-2">Future Feature</div>
              <h3 className="text-xl font-bold text-white mb-2 text-center">AI Shelf Scanner</h3>
              <div className="space-y-2 mb-6 w-full max-w-xs">
                {[
                  'Scan your truck shelves with your phone camera',
                  'AI detects every part visible on the shelves',
                  'Missing, misplaced, or duplicate items flagged',
                  'Inventory updates automatically — no manual entry',
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-purple-900/50 border border-purple-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-[9px] font-black text-purple-400">{i + 1}</span>
                    </div>
                    <p className="text-sm text-gray-400">{step}</p>
                  </div>
                ))}
              </div>
              <button onClick={() => { setShelfOpen(false); showToast('Shelf Scan — coming soon'); }}
                className="w-full max-w-xs bg-purple-700/40 border border-purple-700 text-purple-200 font-bold px-6 py-3 rounded-2xl">
                Notify Me When Available
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Toast ───────────────────────────────────────────────── */}
      <AnimatePresence>{toast && <Toast msg={toast} />}</AnimatePresence>
    </motion.div>
  );
}

// ─── Smart Restock Section ────────────────────────────────────────────────────
const CATEGORY_STYLES: Record<string, { labelColor: string; border: string; bg: string; icon: string }> = {
  'Critical Today':           { labelColor: 'text-red-400',    border: 'border-red-900/50',    bg: 'bg-red-950/20',    icon: '🔴' },
  'Likely Today':             { labelColor: 'text-orange-400', border: 'border-orange-900/40', bg: 'bg-orange-950/10', icon: '🟠' },
  'Recommended This Week':    { labelColor: 'text-blue-400',   border: 'border-blue-900/40',   bg: 'bg-blue-950/10',   icon: '🔵' },
  'Shop Stock':               { labelColor: 'text-gray-400',   border: 'border-gray-800',      bg: 'bg-gray-900',      icon: '⚪' },
  'Seasonal':                 { labelColor: 'text-green-400',  border: 'border-green-900/40',  bg: 'bg-green-950/10',  icon: '☀️' },
};

function SmartRestockSection({
  section, inventory, onMarkLoaded, onRemove, onShowToast,
}: {
  section: import('./vanData').RestockSection;
  inventory: InventoryItem[];
  onMarkLoaded: (id: string) => void;
  onRemove:    (id: string) => void;
  onShowToast: (msg: string) => void;
}) {
  const style = CATEGORY_STYLES[section.category] ?? CATEGORY_STYLES['Shop Stock'];
  return (
    <div>
      <div className="mb-2">
        <div className={`text-[10px] font-bold uppercase tracking-widest mb-0.5 ${style.labelColor}`}>
          {style.icon} {section.category} · {section.items.length}
        </div>
        <div className="text-[10px] text-gray-600">{section.description}</div>
      </div>
      {/* WHY explanation */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-xl px-3 py-2 mb-2 flex items-start gap-2">
        <Sparkles size={10} className="text-gray-600 flex-shrink-0 mt-0.5" />
        <p className="text-[10px] text-gray-600 leading-relaxed">{section.why}</p>
      </div>
      <div className={`${style.bg} border ${style.border} rounded-2xl overflow-hidden`}>
        {section.items.map((item, idx) => {
          const live    = inventory.find(i => i.id === item.id) ?? item;
          const needed  = Math.max(0, live.minQty - live.qty);
          const jobList = [...live.requiredFor, ...live.recommendedFor]
            .filter(j => ['summit', 'northgate', 'ridgeline'].includes(j))
            .map(j => JOB_INFO[j]?.abbr ?? j).join(', ');
          const sub = live.substitutes?.[0];
          return (
            <div key={item.id} className={`px-4 py-3.5 ${idx < section.items.length - 1 ? 'border-b border-gray-800' : ''}`}>
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <div className="text-sm font-bold text-white leading-snug">{live.name}</div>
                    {needed > 0 && (
                      <span className="text-[9px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded-full flex-shrink-0">
                        Need {needed}+
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                    <span>{live.qty}/{live.minQty} {live.unit}</span>
                    {jobList && <><span>·</span><span>{jobList}</span></>}
                  </div>
                  {/* AI reason (technician language) */}
                  {live.aiRec && (
                    <div className="text-[10px] text-blue-400/80 mt-1 leading-relaxed">{live.aiRec}</div>
                  )}
                  {/* AI Tags */}
                  {live.aiTags && live.aiTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {live.aiTags.slice(0, 3).map(tag => <AITagPill key={tag} tag={tag} />)}
                    </div>
                  )}
                  {/* Supply house */}
                  {live.supplierName && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-[9px]">
                      <Building2 size={8} className="text-blue-500" />
                      <span className="text-blue-400">{live.supplierName}</span>
                      <span className="text-gray-600">·</span>
                      <span className={`font-bold ${
                        live.supplierAvailability === 'In Stock'      ? 'text-green-400' :
                        live.supplierAvailability === 'Low Stock'     ? 'text-yellow-400' :
                        live.supplierAvailability === 'Special Order' ? 'text-red-400' : 'text-gray-400'
                      }`}>{live.supplierAvailability}</span>
                      {live.supplierPrice !== undefined && <span className="text-gray-600">${live.supplierPrice.toFixed(2)}</span>}
                      {live.pickupTimeMin !== undefined && <span className="text-gray-600">~{live.pickupTimeMin}m</span>}
                    </div>
                  )}
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
              <div className="flex gap-1.5 mt-2">
                <button onClick={() => onMarkLoaded(item.id)}
                  className="flex-1 bg-teal-800/60 border border-teal-700/50 text-teal-200 font-bold text-xs py-2 rounded-xl flex items-center justify-center gap-1.5">
                  <CheckCircle size={12} /> Mark Loaded
                </button>
                {live.supplierName && (
                  <button onClick={() => onShowToast('Order Now — supply house integration coming soon')}
                    className="flex-1 bg-blue-900/30 border border-blue-800/50 text-blue-300 font-bold text-xs py-2 rounded-xl flex items-center justify-center gap-1.5">
                    <ShoppingCart size={12} /> Order Now
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
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
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className="text-[10px] text-gray-500">{item.category}</span>
            {item.lastUsed && <span className="text-[9px] text-gray-700">· {item.lastUsed}</span>}
            {/* AI Tags (first 2 only in row) */}
            {item.aiTags && item.aiTags.slice(0, 2).map(tag => <AITagPill key={tag} tag={tag} />)}
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
