import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertTriangle, XCircle, ChevronRight } from 'lucide-react';
import {
  INITIAL_TOOLS, ALL_TOOL_CATEGORIES,
  computeToolsReadiness, computeOverallToolsReadiness, toolReadinessBadge,
  type ToolItem, type ToolCategory, type ToolStatus,
} from './toolData';

// Re-export job info for tools (job IDs match vanData JOB_INFO)
const JOB_IDS = ['summit', 'northgate', 'ridgeline'];
const JOB_META: Record<string, { abbr: string; dotColor: string }> = {
  summit:    { abbr: 'Summit Medical', dotColor: 'bg-red-500'   },
  northgate: { abbr: 'Northgate',      dotColor: 'bg-blue-500'  },
  ridgeline: { abbr: 'Ridgeline',      dotColor: 'bg-green-500' },
};

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
  const [jobDetail, setJobDetail] = useState<string | null>(null);

  const overallScore = useMemo(() => computeOverallToolsReadiness(tools), [tools]);
  const jobScores    = useMemo(() => ({
    summit:    computeToolsReadiness(tools, 'summit'),
    northgate: computeToolsReadiness(tools, 'northgate'),
    ridgeline: computeToolsReadiness(tools, 'ridgeline'),
  }), [tools]);

  function cycleStatus(id: string) {
    setTools(prev => prev.map(t => {
      if (t.id !== id) return t;
      const next: ToolStatus = t.status === 'loaded' ? 'missing' : t.status === 'missing' ? 'recommended' : 'loaded';
      return { ...t, status: next };
    }));
  }

  function markAllLoaded() {
    setTools(prev => prev.map(t => ({ ...t, status: 'loaded' })));
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
            <h2 className="text-lg font-bold text-white">Tool Checklist</h2>
            <div className="text-[10px] text-gray-500">Marcus Rivera · {tools.length} tools · {loadedCount} loaded</div>
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
            <div className="flex items-center justify-center gap-2">
              <ReadinessRing score={overallScore} label="Overall" />
              <div className="flex-1 space-y-2.5 pl-2">
                {Object.entries(jobScores).map(([jid, s]) => {
                  const j = JOB_META[jid];
                  const b = toolReadinessBadge(s);
                  const ring = s >= 85 ? '#22c55e' : s >= 65 ? '#eab308' : '#ef4444';
                  return (
                    <div key={jid}>
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${j.dotColor}`} />
                          <span className="text-[11px] text-gray-300 font-medium">{j.abbr}</span>
                        </div>
                        <span className={`text-[11px] font-bold ${b.color}`}>{b.dot} {s}%</span>
                      </div>
                      <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${s}%`, backgroundColor: ring }} />
                      </div>
                    </div>
                  );
                })}
              </div>
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
              {tools.filter(t => t.status === 'missing').map(t => {
                const reqJobs = JOB_IDS.filter(j => t.requiredFor.includes(j));
                return (
                  <div key={t.id} className="flex items-center gap-1.5 text-xs text-red-300/80 mb-0.5 pl-1">
                    <XCircle size={10} className="flex-shrink-0" />
                    <span>{t.name}</span>
                    {reqJobs.length > 0 && (
                      <span className="text-red-600 ml-1">— required for {reqJobs.map(j => JOB_META[j]?.abbr).join(', ')}</span>
                    )}
                  </div>
                );
              })}
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
                        {catTools.map((tool, idx) => {
                          const reqJobs = JOB_IDS.filter(j => tool.requiredFor.includes(j));
                          const recJobs = JOB_IDS.filter(j => tool.recommendedFor.includes(j));
                          return (
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
                                    {(reqJobs.length > 0 || recJobs.length > 0) && (
                                      <div className="flex flex-wrap gap-1 mt-1.5">
                                        {reqJobs.map(j => (
                                          <span key={j} className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-red-900/40 text-red-300 border border-red-800">
                                            Req · {JOB_META[j]?.abbr}
                                          </span>
                                        ))}
                                        {recJobs.map(j => (
                                          <span key={j} className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-yellow-900/40 text-yellow-300 border border-yellow-800">
                                            Rec · {JOB_META[j]?.abbr}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <StatusPill status={tool.status} onCycle={() => cycleStatus(tool.id)} />
                                </div>
                              </div>
                            </div>
                          );
                        })}
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

