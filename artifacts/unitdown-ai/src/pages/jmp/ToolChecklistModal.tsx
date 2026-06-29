import { useState, useMemo, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertTriangle, XCircle, ChevronRight } from 'lucide-react';
import {
  INITIAL_TOOLS, ALL_TOOL_CATEGORIES,
  computeOverallToolsReadiness, toolReadinessBadge,
  type ToolItem, type ToolCategory, type ToolStatus,
} from './toolData';

const CATEGORY_ICONS: Record<ToolCategory, string> = {
  Electrical:   '⚡',
  Refrigeration:'❄️',
  Airflow:      '💨',
  Combustion:   '🔥',
  General:      '🔧',
};

interface Props { onClose: () => void }

function StatusIcon({ status }: { status: ToolStatus }) {
  if (status === 'loaded')      return <CheckCircle size={16} className="text-green-400 flex-shrink-0" />;
  if (status === 'recommended') return <AlertTriangle size={16} className="text-yellow-400 flex-shrink-0" />;
  return                               <XCircle size={16} className="text-red-400 flex-shrink-0" />;
}

function StatusPill({ status, onCycle }: { status: ToolStatus; onCycle: () => void }) {
  const styles: Record<ToolStatus, string> = {
    loaded:      'bg-green-900/60 border-green-700 text-green-300',
    recommended: 'bg-yellow-900/60 border-yellow-700 text-yellow-300',
    missing:     'bg-red-900/60 border-red-700 text-red-300',
  };
  const labels: Record<ToolStatus, string> = {
    loaded: '✓ Loaded', recommended: '⚠ Recommended', missing: '✕ Missing',
  };
  return (
    <button onClick={e => { e.stopPropagation(); onCycle(); }}
      className={`text-[9px] font-bold px-2 py-0.5 rounded-full border transition-colors ${styles[status]}`}>
      {labels[status]}
    </button>
  );
}

function ReadinessRing({ score, label }: { score: number; label: string }) {
  const r    = 44;
  const circ = 2 * Math.PI * r;
  const off  = circ * (1 - score / 100);
  const badge = toolReadinessBadge(score);
  const ring  = score >= 85 ? '#22c55e' : score >= 65 ? '#eab308' : '#ef4444';
  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg width="106" height="106" viewBox="0 0 106 106">
          <circle cx="53" cy="53" r={r} fill="none" stroke="#1f2937" strokeWidth="9" />
          <circle cx="53" cy="53" r={r} fill="none" stroke={ring} strokeWidth="9"
            strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
            transform="rotate(-90 53 53)" style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-white">{score}%</span>
        </div>
      </div>
      <div className={`text-[9px] font-bold uppercase tracking-widest mt-1 ${badge.color}`}>{badge.label}</div>
      <div className="text-[9px] text-gray-600 mt-0.5">{label}</div>
    </div>
  );
}

export function ToolChecklistModal({ onClose }: Props) {
  const [tools,    setTools]   = useState<ToolItem[]>(() => INITIAL_TOOLS.map(t => ({ ...t })));
  const [expanded, setExpanded] = useState<ToolCategory | null>(null);

  const { user } = useUser();
  const overallScore = useMemo(() => computeOverallToolsReadiness(tools), [tools]);

  // Load persisted tool statuses on mount
  useEffect(() => {
    const uid = user?.id;
    if (!uid) return;
    (async () => {
      try {
        const resp = await fetch(`/api/van/tools?clientId=${encodeURIComponent(uid)}`);
        if (!resp.ok) return;
        const { items } = await resp.json() as { items: Array<{ id: string; hasItem: boolean }> };
        if (items.length === 0) {
          await fetch('/api/van/tools/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clientId: uid,
              items: INITIAL_TOOLS.map(t => ({
                id: t.id,
                toolName: t.name,
                category: t.category,
                hasItem: t.status === 'loaded',
              })),
            }),
          });
        } else {
          const byId = Object.fromEntries(items.map(i => [i.id, i.hasItem]));
          setTools(prev => prev.map(t => {
            if (!Object.prototype.hasOwnProperty.call(byId, t.id)) return t;
            return { ...t, status: byId[t.id] ? 'loaded' : t.status === 'loaded' ? 'missing' : t.status };
          }));
        }
      } catch { /* offline */ }
    })();
  }, [user?.id]);

  function cycleStatus(id: string) {
    const uid = user?.id;
    setTools(prev => prev.map(t => {
      if (t.id !== id) return t;
      const next: ToolStatus = t.status === 'loaded' ? 'missing' : t.status === 'missing' ? 'recommended' : 'loaded';
      if (uid) {
        fetch(`/api/van/tools/${encodeURIComponent(id)}?clientId=${encodeURIComponent(uid)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hasItem: next === 'loaded' }),
        }).catch(() => {});
      }
      return { ...t, status: next };
    }));
  }

  function markAllLoaded() {
    setTools(prev => prev.map(t => ({ ...t, status: 'loaded' })));
    const uid = user?.id;
    if (uid) {
      tools.forEach(t => {
        fetch(`/api/van/tools/${encodeURIComponent(t.id)}?clientId=${encodeURIComponent(uid)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hasItem: true }),
        }).catch(() => {});
      });
    }
  }

  const missingCount = tools.filter(t => t.status === 'missing').length;
  const loadedCount  = tools.filter(t => t.status === 'loaded').length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-gray-950 z-[56] flex flex-col overflow-hidden">

      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 pt-12 pb-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-900/50 border border-orange-700/50 flex items-center justify-center text-lg">
            🔧
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">Tool Checklist</h2>
            </div>
            <div className="text-[10px] text-gray-500">Synced to your account</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`px-2 py-1 rounded-full border text-xs font-bold ${
            overallScore >= 90 ? 'bg-green-900/40 border-green-700 text-green-300' :
            overallScore >= 70 ? 'bg-yellow-900/40 border-yellow-700 text-yellow-300' :
                                 'bg-red-900/40 border-red-700 text-red-300'
          }`}>{overallScore}%</div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center">
            <X size={18} className="text-gray-400" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-5 space-y-4 pb-28">

          {/* Readiness rings */}
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-5">
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-4">Tools Readiness</div>
            <div className="flex flex-col items-center gap-3">
              <ReadinessRing score={overallScore} label="Overall" />
              <p className="text-[11px] text-gray-500 text-center">
                Assign jobs to see per-job tool readiness.
              </p>
            </div>
          </div>

          {/* Missing tools alert */}
          {missingCount > 0 && (
            <div className="bg-red-950/30 border border-red-800/50 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <XCircle size={13} className="text-red-400" />
                <span className="text-xs font-bold text-red-300">
                  {missingCount} tool{missingCount !== 1 ? 's' : ''} not loaded
                </span>
              </div>
              {tools.filter(t => t.status === 'missing').map(t => (
                <div key={t.id} className="flex items-center gap-1.5 text-xs text-red-300/80 mb-0.5 pl-1">
                  <XCircle size={10} className="flex-shrink-0" />
                  <span>{t.name}</span>
                </div>
              ))}
            </div>
          )}

          {/* Per-category checklists */}
          {ALL_TOOL_CATEGORIES.map(cat => {
            const catTools = tools.filter(t => t.category === cat);
            const loaded   = catTools.filter(t => t.status === 'loaded').length;
            const isOpen   = expanded === cat;
            const hasMissing = catTools.some(t => t.status === 'missing');
            const hasWarn    = catTools.some(t => t.status === 'recommended');
            return (
              <div key={cat} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                <button onClick={() => setExpanded(isOpen ? null : cat)}
                  className="w-full flex items-center justify-between px-4 py-4 active:bg-gray-800">
                  <div className="flex items-center gap-3">
                    <span className="text-xl leading-none">{CATEGORY_ICONS[cat]}</span>
                    <div>
                      <div className="text-sm font-bold text-white text-left">{cat}</div>
                      <div className="text-[10px] text-gray-500 text-left">{loaded}/{catTools.length} loaded</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasMissing && <XCircle size={14} className="text-red-400" />}
                    {!hasMissing && hasWarn && <AlertTriangle size={14} className="text-yellow-400" />}
                    {!hasMissing && !hasWarn && <CheckCircle size={14} className="text-green-400" />}
                    <div className={`text-xs font-bold ${loaded === catTools.length ? 'text-green-400' : hasMissing ? 'text-red-400' : 'text-yellow-400'}`}>
                      {loaded}/{catTools.length}
                    </div>
                    <ChevronRight size={14} className={`text-gray-600 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                  </div>
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                      <div className="border-t border-gray-800">
                        {catTools.map((tool, idx) => (
                          <div key={tool.id}
                            className={`px-4 py-3.5 flex items-start gap-3 ${idx < catTools.length - 1 ? 'border-b border-gray-800' : ''}`}>
                            <StatusIcon status={tool.status} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-semibold text-white leading-snug">{tool.name}</div>
                                  {tool.note && (
                                    <div className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">{tool.note}</div>
                                  )}
                                </div>
                                <StatusPill status={tool.status} onCycle={() => cycleStatus(tool.id)} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

          {/* Mark all loaded CTA */}
          {missingCount > 0 ? (
            <button onClick={markAllLoaded}
              className="w-full bg-orange-700/80 border border-orange-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2">
              <CheckCircle size={16} /> Mark All Tools as Loaded
            </button>
          ) : (
            <div className="flex items-center justify-center gap-2 py-4 text-green-400">
              <CheckCircle size={18} />
              <span className="text-sm font-bold">All tools verified loaded</span>
            </div>
          )}

          {/* Tap hint */}
          <div className="text-center text-[10px] text-gray-700">
            Tap any status badge to cycle: Loaded → Missing → Recommended
          </div>
        </div>
      </div>
    </motion.div>
  );
}

