import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight, ChevronLeft, X, Wrench, Calendar as CalIcon,
  AlertTriangle, MapPin, Clock, Phone, Search, Cpu, FileText,
  Zap, CheckCircle, Maximize2, User, Settings, LogOut, ChevronDown,
  TrendingUp, TrendingDown, Minus, Lightbulb, Sparkles,
} from 'lucide-react';
import { TODAY_JOBS, MOCK_HISTORY, MOCK_EQUIPMENT, FOLLOW_UP_ITEMS, type TodayJob } from './mockData';
import {
  JUNE_EVENTS, EVENT_COLORS, EVENT_LABELS, EQUIPMENT_ATTENTION, OFFICE_MESSAGES,
  RECENT_ACTIVITY, DASHBOARD_STATS, type CalendarEvent, type EquipmentAttention,
} from './dashboardData';
import { AiDiagnosticModal } from './AiDiagnosticModal';
import { MyVanModal } from './MyVanModal';
import { ToolChecklistModal } from './ToolChecklistModal';
import {
  INITIAL_READINESS, INITIAL_INVENTORY, AI_STOCK_LIST,
  computeJobReadiness, readinessBadge, getJobVanId,
} from './vanData';
import {
  INITIAL_TOOLS, INITIAL_TOOLS_READINESS,
  computeToolsReadiness, toolReadinessBadge,
} from './toolData';

interface Props { onStartJob: () => void }

const PRIORITY_STYLE = {
  emergency: { border: 'border-l-red-500',   badge: 'bg-red-500 text-white',       label: 'EMERGENCY' },
  high:      { border: 'border-l-amber-500', badge: 'bg-amber-500 text-white',      label: 'HIGH PRIORITY' },
  normal:    { border: 'border-l-blue-500',  badge: 'bg-blue-600/30 text-blue-300', label: 'SERVICE' },
  pm:        { border: 'border-l-gray-600',  badge: 'bg-gray-700 text-gray-300',    label: 'PM DUE' },
};

const SEV_STYLE = {
  high:   { ring: 'border-red-800',   bg: 'bg-red-950/30',   dot: 'bg-red-500',   label: 'text-red-400',   badge: 'HIGH',  badgeBg: 'bg-red-900/50 text-red-400' },
  medium: { ring: 'border-amber-800', bg: 'bg-amber-950/30', dot: 'bg-amber-500', label: 'text-amber-400', badge: 'WATCH', badgeBg: 'bg-amber-900/50 text-amber-400' },
  low:    { ring: 'border-gray-700',  bg: 'bg-gray-900',     dot: 'bg-gray-500',  label: 'text-gray-400',  badge: 'INFO',  badgeBg: 'bg-gray-800 text-gray-400' },
};

const CAL_FIRST_DAY = 0;
const CAL_DAYS = 30;
const TODAY_DAY = 27;

function buildEventMap(events: CalendarEvent[]) {
  const m = new Map<number, CalendarEvent[]>();
  events.forEach(e => {
    if (!m.has(e.day)) m.set(e.day, []);
    m.get(e.day)!.push(e);
  });
  return m;
}

function buildCells(): (number | null)[] {
  const cells: (number | null)[] = Array(CAL_FIRST_DAY).fill(null);
  for (let d = 1; d <= CAL_DAYS; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────
export function DashboardView({ onStartJob }: Props) {
  const [selectedJob,     setSelectedJob]     = useState<TodayJob | null>(null);
  const [selectedDay,     setSelectedDay]     = useState<{ day: number; events: CalendarEvent[] } | null>(null);
  const [calFullScreen,   setCalFullScreen]   = useState(false);
  const [accountOpen,     setAccountOpen]     = useState(false);
  const [overviewFilter,  setOverviewFilter]  = useState<string | null>(null);
  const [equipmentDetail, setEquipmentDetail] = useState<EquipmentAttention | null>(null);
  const [diagEquipment,   setDiagEquipment]   = useState<EquipmentAttention | null>(null);
  const [jobBriefFor,     setJobBriefFor]     = useState<TodayJob | null>(null);
  const [vanOpen,         setVanOpen]         = useState(false);
  const [toolsOpen,       setToolsOpen]       = useState(false);
  const [briefsSeen,      setBriefsSeen]      = useState<Set<string>>(new Set());

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  function handleStartJob(job: TodayJob) {
    setSelectedJob(null);
    const hasNotes = job.dispatchNotes && job.dispatchNotes.length > 0;
    const alreadySeen = briefsSeen.has(job.id);
    if (hasNotes && !alreadySeen) {
      setJobBriefFor(job);
    } else {
      onStartJob();
    }
  }

  function handleBriefContinue() {
    if (jobBriefFor) {
      setBriefsSeen(prev => new Set(prev).add(jobBriefFor!.id));
      const isPrototype = jobBriefFor.isPrototype;
      setJobBriefFor(null);
      if (isPrototype) onStartJob();
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white overflow-y-auto pb-24">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 pt-12 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-gray-500 text-xs mb-0.5">{greeting},</div>
            <h1 className="text-2xl font-bold leading-tight">Marcus Rivera</h1>
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
              <span>{now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
              <span className="text-gray-700">·</span>
              <span>{timeStr}</span>
            </div>
          </div>
          <button onClick={() => setAccountOpen(true)}
            className="w-12 h-12 rounded-2xl bg-blue-700 flex items-center justify-center font-bold text-white text-lg flex-shrink-0 active:scale-95 transition-transform">
            MR
          </button>
        </div>
        <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
          <span>🌤 91°F · Partly Cloudy</span>
          <span className="text-gray-700">·</span>
          <span>💧 62%</span>
          <span className="text-gray-700">·</span>
          <span>🌬 SW 8 mph</span>
        </div>
      </div>

      {/* ── AI Morning Brief ─────────────────────────────────────── */}
      <div className="px-4 pt-4">
        <AiDayBrief />
      </div>

      {/* ── Calendar ─────────────────────────────────────────────── */}
      <div className="px-4 pt-4">
        <CalendarCard
          events={JUNE_EVENTS}
          today={TODAY_DAY}
          onDayTap={(day, evts) => setSelectedDay({ day, events: evts })}
          onExpand={() => setCalFullScreen(true)}
        />
      </div>

      {/* ── Overview tiles ───────────────────────────────────────── */}
      <div className="pt-4">
        <div className="px-4 mb-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Overview</span>
        </div>
        <div className="flex gap-2.5 overflow-x-auto px-4 pb-1 snap-x snap-mandatory">
          {DASHBOARD_STATS.map(s => (
            <button key={s.id}
              onClick={() => setOverviewFilter(s.id)}
              className={`flex-shrink-0 w-[86px] rounded-2xl border ${s.borderColor} ${s.color} p-3 snap-start text-left active:scale-95 transition-transform`}>
              <div className="text-xl mb-1">{s.icon}</div>
              <div className={`text-2xl font-bold leading-none ${s.urgent ? 'text-amber-400' : 'text-white'}`}>{s.value}</div>
              <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mt-1 leading-tight">{s.label}</div>
              <div className="text-[9px] text-gray-600 mt-0.5 leading-tight">{s.subtitle}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Today's Jobs ─────────────────────────────────────────── */}
      <div className="px-4 pt-5">
        <SectionHeader title="Today's Jobs" count={TODAY_JOBS.length} countLabel="jobs" />
        {TODAY_JOBS.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 text-center">
            <div className="text-3xl mb-2">☀️</div>
            <div className="font-semibold text-white mb-1">No scheduled jobs today</div>
            <div className="text-xs text-gray-500">Check equipment follow-ups and messages below</div>
          </div>
        ) : (
          <div className="space-y-2">
            {TODAY_JOBS.map((job, i) => {
              const style = PRIORITY_STYLE[job.priority];
              return (
                <motion.button key={job.id}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  onClick={() => setSelectedJob(job)} whileTap={{ scale: 0.98 }}
                  className={`w-full bg-gray-900 border border-gray-800 border-l-4 ${style.border} rounded-r-2xl rounded-bl-2xl p-4 text-left`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full flex-shrink-0 ${style.badge}`}>{style.label}</span>
                        <span className="text-[10px] font-mono text-gray-600">{job.id}</span>
                        <span className="text-[10px] text-gray-600 ml-auto">{job.scheduledTime}</span>
                      </div>
                      {/* Location-first hierarchy */}
                      <div className="font-bold text-white text-base leading-snug">{job.customer}</div>
                      <div className="text-xs text-blue-300/80 mt-0.5">{job.unitTag}</div>
                      <div className="text-[10px] text-gray-600 font-mono mt-0.5">{job.model}</div>
                      <div className="text-xs text-gray-400 mt-1.5 leading-snug">{job.symptom}</div>
                      {job.techNote && (
                        <div className="mt-1.5 text-[10px] text-amber-300/80 bg-amber-950/30 rounded-lg px-2 py-1 border border-amber-900/30">
                          💡 {job.techNote}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <ChevronRight size={16} className="text-gray-600" />
                      {(() => {
                        const vanJobId = getJobVanId(job.id);
                        const ps = computeJobReadiness(INITIAL_INVENTORY, vanJobId);
                        const ts = computeToolsReadiness(INITIAL_TOOLS, vanJobId);
                        const pb = readinessBadge(ps);
                        const tb = toolReadinessBadge(ts);
                        return (
                          <div className="flex flex-col items-end gap-0.5">
                            <div className={`text-[9px] font-bold ${pb.color}`}>{pb.dot} {ps}% <span className="text-gray-600 font-normal">parts</span></div>
                            <div className={`text-[9px] font-bold ${tb.color}`}>{tb.dot} {ts}% <span className="text-gray-600 font-normal">tools</span></div>
                          </div>
                        );
                      })()}
                      <div className="flex items-center gap-0.5 text-[10px] text-gray-500">
                        <MapPin size={9} /><span>{job.driveTime}</span>
                      </div>
                      {job.dispatchNotes && (
                        <div className="text-[9px] bg-blue-900/40 text-blue-400 px-1.5 py-0.5 rounded-full border border-blue-800/60">
                          Brief
                        </div>
                      )}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Equipment Intelligence ───────────────────────────────── */}
      <div className="px-4 pt-5">
        <SectionHeader title="Equipment Intelligence" subtitle="AI-assisted pattern analysis" />
        <div className="space-y-3">
          {EQUIPMENT_ATTENTION.map((eq, i) => {
            const sev = SEV_STYLE[eq.severity];
            return (
              <motion.button key={eq.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                onClick={() => setEquipmentDetail(eq)} whileTap={{ scale: 0.98 }}
                className={`w-full text-left ${sev.bg} border ${sev.ring} rounded-2xl p-4`}>
                <div className="flex items-start gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${sev.dot} flex-shrink-0 mt-1.5`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <div className="font-bold text-white text-sm leading-snug">{eq.unit}</div>
                        <div className="text-[10px] text-blue-300/70">{eq.unitTag}</div>
                        <div className="text-[9px] font-mono text-gray-600">{eq.model}</div>
                      </div>
                      <span className={`text-[9px] font-bold uppercase tracking-wider flex-shrink-0 mt-0.5 px-1.5 py-0.5 rounded-full ${sev.badgeBg}`}>{sev.badge}</span>
                    </div>

                    {/* Pattern + stats */}
                    <div className="bg-black/20 rounded-xl px-3 py-2.5 mb-2">
                      <div className="text-xs font-bold text-white mb-1">{eq.aiInsight.pattern}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {eq.aiInsight.stats.map((s, si) => (
                          <span key={si} className="text-[9px] bg-white/10 text-gray-300 px-1.5 py-0.5 rounded-full">{s}</span>
                        ))}
                      </div>
                    </div>

                    {/* AI Insight */}
                    <div className="bg-blue-950/40 border border-blue-800/40 rounded-xl px-3 py-2.5 mb-2">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Sparkles size={10} className="text-blue-400 flex-shrink-0" />
                        <span className="text-[9px] font-bold uppercase tracking-wider text-blue-400">AI Insight</span>
                      </div>
                      <p className="text-[10px] text-blue-100/80 leading-relaxed mb-2">{eq.aiInsight.analysis}</p>
                      <div className="space-y-0.5">
                        {eq.aiInsight.rootCauses.slice(0, 3).map((rc, ri) => (
                          <div key={ri} className="flex items-start gap-1.5 text-[10px] text-gray-300">
                            <span className="text-blue-500 flex-shrink-0 mt-0.5">•</span>
                            <span>{rc}</span>
                          </div>
                        ))}
                        {eq.aiInsight.rootCauses.length > 3 && (
                          <div className="text-[9px] text-blue-400 mt-1">+{eq.aiInsight.rootCauses.length - 3} more root causes</div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-[9px] text-gray-600">
                        <span>{eq.visits} visit{eq.visits !== 1 ? 's' : ''} / {eq.period}</span>
                        <span>·</span>
                        <span>Last: {eq.lastService}</span>
                      </div>
                      <span className="text-[9px] text-blue-400 font-semibold flex items-center gap-0.5">
                        Full history <ChevronRight size={10} />
                      </span>
                    </div>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ── Office Messages ──────────────────────────────────────── */}
      <div className="px-4 pt-5">
        <SectionHeader title="Messages" count={OFFICE_MESSAGES.filter(m => m.unread).length} countLabel="unread" />
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          {OFFICE_MESSAGES.map((msg, i) => (
            <div key={msg.id} className={`flex items-start gap-3 px-4 py-3.5 ${i < OFFICE_MESSAGES.length - 1 ? 'border-b border-gray-800' : ''}`}>
              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${msg.unread ? 'bg-blue-500' : 'bg-transparent'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-xs font-semibold ${msg.unread ? 'text-white' : 'text-gray-400'}`}>{msg.from}</span>
                  <span className="text-[10px] text-gray-600 ml-auto flex-shrink-0">{msg.time}</span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">{msg.preview}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Recent Activity ──────────────────────────────────────── */}
      <div className="px-4 pt-5">
        <SectionHeader title="Recent Activity" subtitle="Field history" />
        <div className="relative">
          <div className="absolute left-[11px] top-0 bottom-0 w-px bg-gray-800" />
          <div className="space-y-0">
            {RECENT_ACTIVITY.map((a, i) => (
              <motion.div key={a.id}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                className="flex items-start gap-3 pl-1">
                <div className="w-5 h-5 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center flex-shrink-0 mt-0.5 text-[9px] z-10">
                  {a.icon}
                </div>
                <div className="flex-1 min-w-0 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-semibold text-white leading-snug">{a.summary}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">{a.customer} · {a.equipment}</div>
                    </div>
                    <div className="text-[9px] text-gray-600 flex-shrink-0 mt-0.5 font-mono text-right">{a.timeLabel}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Quick Actions ────────────────────────────────────────── */}
      <div className="px-4 pt-5">
        <SectionHeader title="Quick Actions" />
        <div className="grid grid-cols-3 gap-2">
          {/* My Van — parts tile */}
          <button onClick={() => setVanOpen(true)}
            className="relative flex flex-col items-center gap-2 py-4 rounded-2xl border bg-teal-900/40 border-teal-700 active:scale-95 transition-transform">
            <div className={`absolute top-1.5 right-1.5 text-[9px] font-black px-1.5 py-0.5 rounded-full ${
              INITIAL_READINESS >= 90 ? 'bg-green-600 text-white' :
              INITIAL_READINESS >= 75 ? 'bg-yellow-500 text-gray-900' :
                                        'bg-red-600 text-white'
            }`}>{INITIAL_READINESS}%</div>
            <svg width="20" height="15" viewBox="0 0 28 21" fill="none"
              stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
              className="text-teal-300">
              <path d="M1 14 L1 7 L8 2 L25 2 L27 7 L27 14 Z" />
              <line x1="8" y1="2" x2="8" y2="14" />
              <rect x="9.5" y="3.5" width="6" height="4.5" rx="0.6" />
              <circle cx="6.5" cy="17" r="2.5" />
              <circle cx="21.5" cy="17" r="2.5" />
              <path d="M1 14 L4 14 M9 14 L19 14 M24 14 L27 14" />
            </svg>
            <div className="text-center">
              <div className="text-[10px] text-gray-200 font-bold leading-tight">My Van</div>
              <div className="text-[9px] text-teal-400/80">Parts</div>
            </div>
          </button>
          {/* Tool Checklist tile */}
          <button onClick={() => setToolsOpen(true)}
            className="relative flex flex-col items-center gap-2 py-4 rounded-2xl border bg-orange-900/40 border-orange-800 active:scale-95 transition-transform">
            <div className={`absolute top-1.5 right-1.5 text-[9px] font-black px-1.5 py-0.5 rounded-full ${
              INITIAL_TOOLS_READINESS >= 90 ? 'bg-green-600 text-white' :
              INITIAL_TOOLS_READINESS >= 75 ? 'bg-yellow-500 text-gray-900' :
                                              'bg-red-600 text-white'
            }`}>{INITIAL_TOOLS_READINESS}%</div>
            <Wrench size={18} className="text-orange-400" />
            <div className="text-center">
              <div className="text-[10px] text-gray-200 font-bold leading-tight">Tool</div>
              <div className="text-[9px] text-orange-400/80">Checklist</div>
            </div>
          </button>
          {[
            { icon: <Phone size={18} />,  label: 'Emergency\nCall',   color: 'bg-red-900/40 border-red-800',       iconColor: 'text-red-400' },
            { icon: <Search size={18} />, label: 'Search\nEquipment', color: 'bg-blue-900/40 border-blue-800',     iconColor: 'text-blue-400' },
            { icon: <Zap size={18} />,    label: 'Scan\nNameplate',   color: 'bg-green-900/40 border-green-800',   iconColor: 'text-green-400' },
            { icon: <Cpu size={18} />,    label: 'AI\nAssistant',     color: 'bg-purple-900/40 border-purple-800', iconColor: 'text-purple-400' },
          ].map((a, i) => (
            <button key={i} className={`flex flex-col items-center gap-2 py-4 rounded-2xl border ${a.color} active:scale-95 transition-transform`}>
              <div className={a.iconColor}>{a.icon}</div>
              <span className="text-[10px] text-gray-300 font-medium text-center leading-tight whitespace-pre-line">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Emergency strip ──────────────────────────────────────── */}
      <div className="px-4 pt-3 pb-2">
        <button className="w-full flex items-center justify-between bg-red-950/30 border border-red-900 rounded-2xl px-4 py-3.5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-700 rounded-xl flex items-center justify-center flex-shrink-0">
              <Phone size={15} className="text-white" />
            </div>
            <div className="text-left">
              <div className="font-bold text-sm text-white">Start Emergency Call</div>
              <div className="text-[10px] text-red-400/70">Unscheduled urgent service</div>
            </div>
          </div>
          <ChevronRight size={16} className="text-red-600" />
        </button>
      </div>

      {/* ═══ Modals ════════════════════════════════════════════════ */}

      <AnimatePresence>
        {calFullScreen && (
          <FullScreenCalendar
            events={JUNE_EVENTS} today={TODAY_DAY}
            onClose={() => setCalFullScreen(false)}
            onDayTap={(d, e) => { setCalFullScreen(false); setSelectedDay({ day: d, events: e }); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {accountOpen && <AccountDashboard onClose={() => setAccountOpen(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {overviewFilter && (
          <OverviewFilterSheet
            filterId={overviewFilter}
            onClose={() => setOverviewFilter(null)}
            onSelectJob={job => { setOverviewFilter(null); setSelectedJob(job); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {equipmentDetail && (
          <EquipmentDetailModal
            eq={equipmentDetail}
            onClose={() => setEquipmentDetail(null)}
            onLaunchDiagnostic={eq => { setEquipmentDetail(null); setDiagEquipment(eq); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {diagEquipment && (
          <AiDiagnosticModal
            eq={diagEquipment}
            onClose={() => setDiagEquipment(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {vanOpen && (
          <MyVanModal
            onClose={() => setVanOpen(false)}
            onOpenTools={() => { setVanOpen(false); setToolsOpen(true); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toolsOpen && (
          <ToolChecklistModal onClose={() => setToolsOpen(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedDay && (
          <Sheet onClose={() => setSelectedDay(null)}>
            <div className="px-5 pt-5 pb-4 border-b border-gray-800 flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500 font-mono mb-1">June {selectedDay.day}, 2026</div>
                <h2 className="text-lg font-bold text-white">
                  {selectedDay.events.length === 0 ? 'No scheduled work' : `${selectedDay.events.length} event${selectedDay.events.length !== 1 ? 's' : ''}`}
                </h2>
              </div>
              <SheetClose onClose={() => setSelectedDay(null)} />
            </div>
            <div className="px-5 py-4 space-y-3">
              {selectedDay.events.length === 0 ? (
                <>
                  <p className="text-sm text-gray-400 mb-4">Nothing scheduled for this day.</p>
                  {[
                    { icon: <Phone size={16} className="text-red-400" />,     label: 'Create Emergency Call',  bg: 'bg-red-950/40 border-red-900' },
                    { icon: <Search size={16} className="text-blue-400" />,   label: 'Browse Equipment',       bg: 'bg-blue-950/40 border-blue-900' },
                    { icon: <FileText size={16} className="text-gray-300" />, label: 'View Service Records',   bg: 'bg-gray-800 border-gray-700' },
                    { icon: <Cpu size={16} className="text-purple-400" />,    label: 'AI Assistant',           bg: 'bg-purple-950/40 border-purple-900' },
                  ].map((a, i) => (
                    <button key={i} className={`w-full flex items-center gap-3 ${a.bg} border rounded-2xl px-4 py-3.5`}>
                      {a.icon}
                      <span className="font-semibold text-white text-sm">{a.label}</span>
                      <ChevronRight size={14} className="text-gray-600 ml-auto" />
                    </button>
                  ))}
                </>
              ) : (
                selectedDay.events.map((e, i) => (
                  <div key={i} className="flex items-start gap-3 bg-gray-800 rounded-2xl p-4">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-0.5 ${EVENT_COLORS[e.type]}`} />
                    <div>
                      <div className="text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-0.5">{EVENT_LABELS[e.type]}</div>
                      <div className="text-sm text-white font-medium leading-relaxed">{e.label}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Sheet>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedJob && (
          <Sheet onClose={() => setSelectedJob(null)}>
            <div className="px-5 pt-5 pb-4 border-b border-gray-800 flex items-start justify-between">
              <div>
                <div className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full inline-flex mb-2 ${PRIORITY_STYLE[selectedJob.priority].badge}`}>
                  {PRIORITY_STYLE[selectedJob.priority].label}
                </div>
                <div className="text-xs font-mono text-gray-500 mb-1">{selectedJob.id}</div>
                {/* Location-first in detail too */}
                <h2 className="text-lg font-bold text-white leading-tight">{selectedJob.customer}</h2>
                <div className="text-sm text-blue-300/80">{selectedJob.unitTag}</div>
                <div className="text-xs font-mono text-gray-600 mt-0.5">{selectedJob.model}</div>
              </div>
              <SheetClose onClose={() => setSelectedJob(null)} />
            </div>
            <div className="px-5 py-4 space-y-4">
              <div className="space-y-2.5">
                <SheetRow icon={<AlertTriangle size={13} className="text-amber-400" />} label="Symptom"   value={selectedJob.symptom} />
                <SheetRow icon={<MapPin size={13} className="text-blue-400" />}         label="Address"   value={selectedJob.address} />
                <SheetRow icon={<Clock size={13} className="text-gray-400" />}          label="Scheduled" value={selectedJob.scheduledTime} />
                <SheetRow icon={<MapPin size={13} className="text-green-400" />}        label="Drive"     value={selectedJob.driveTime} />
              </div>
              {selectedJob.isPrototype && (
                <>
                  <div className="bg-gray-800 rounded-2xl p-4">
                    <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
                      <Wrench size={12} /> Equipment
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {[['Model', MOCK_EQUIPMENT.model],['Serial', MOCK_EQUIPMENT.serial],['Refrigerant', MOCK_EQUIPMENT.refrigerant],['Capacity', MOCK_EQUIPMENT.capacity]].map(([l,v]) => (
                        <div key={l}><div className="text-gray-500">{l}</div><div className="font-mono font-semibold text-white">{v}</div></div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-gray-800 rounded-2xl p-4">
                    <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
                      <CalIcon size={12} /> Service History
                    </div>
                    <div className="space-y-2">
                      {MOCK_HISTORY.map((h, i) => (
                        <div key={i} className="flex gap-2 text-xs">
                          <span className="text-gray-500 flex-shrink-0 w-16">{h.date}</span>
                          <span className="text-gray-300 leading-relaxed">{h.summary}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
              {selectedJob.techNote && (
                <div className="bg-amber-950/30 border border-amber-800 rounded-2xl p-3 text-sm text-amber-200">
                  💡 {selectedJob.techNote}
                </div>
              )}
              {selectedJob.dispatchNotes && (
                <div className="bg-blue-950/30 border border-blue-800/60 rounded-2xl p-3">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-blue-400 mb-2 flex items-center gap-1.5">
                    <Lightbulb size={10} /> Dispatch Notes
                  </div>
                  <div className="space-y-1.5">
                    {selectedJob.dispatchNotes.map((n, ni) => (
                      <div key={ni} className="flex items-start gap-2 text-xs text-blue-200/80">
                        <span className="text-blue-500 flex-shrink-0">•</span>
                        <span>{n}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {selectedJob.isPrototype ? (
                <button onClick={() => handleStartJob(selectedJob)}
                  className="w-full bg-white text-gray-950 font-bold text-lg py-5 rounded-2xl flex items-center justify-center gap-2">
                  <span>Start Job</span><ChevronRight size={20} />
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  <button onClick={() => handleStartJob(selectedJob)}
                    className="w-full bg-blue-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2">
                    Start Job <ChevronRight size={16} />
                  </button>
                  <div className="text-center text-[10px] text-gray-600">Full workflow prototype: JM-2026-0047 only</div>
                </div>
              )}
            </div>
          </Sheet>
        )}
      </AnimatePresence>

      {/* ── Job Brief Modal ──────────────────────────────────────── */}
      <AnimatePresence>
        {jobBriefFor && (
          <JobBriefModal
            job={jobBriefFor}
            onContinue={handleBriefContinue}
            onCancel={() => setJobBriefFor(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── AI Day Brief ─────────────────────────────────────────────────────────────
const DAY_ROUTE = [
  {
    stop: 1,
    customer: 'Summit Medical Plaza',
    unitTag: 'North Roof · RTU-3',
    model: 'Carrier 50XCQ006',
    time: '8:00 AM',
    priority: 'high' as const,
    badge: 'HIGH PRIORITY',
    badgeColor: 'bg-amber-500 text-white',
    risk: 'Code 82 history — 3 lockouts in 12 months',
    driveFromPrev: null,
    driveTo: '12 min from shop',
  },
  {
    stop: 2,
    customer: 'Northgate Data Center',
    unitTag: 'Server Room B · CRAC-1',
    model: 'Liebert DS150',
    time: '1:00 PM',
    priority: 'pm' as const,
    badge: 'PM DUE',
    badgeColor: 'bg-gray-700 text-gray-300',
    risk: null,
    driveFromPrev: '~22 min from Summit',
    driveTo: null,
  },
  {
    stop: 3,
    customer: 'Ridgeline Office Park',
    unitTag: 'Rooftop · RTU-7',
    model: 'Trane YCD150',
    time: '3:30 PM',
    priority: 'pm' as const,
    badge: 'PM DUE',
    badgeColor: 'bg-gray-700 text-gray-300',
    risk: null,
    driveFromPrev: '~18 min from Northgate',
    driveTo: null,
  },
];


const DAY_NOTES = [
  { job: 'Summit Medical', note: 'Recurring Code 82 — condenser cleaning alone has not resolved. Investigate fan performance and refrigerant circuit.' },
  { job: 'Northgate',      note: 'Time shifted to 1:00 PM per customer. Badge required at security gate.' },
];

function AiDayBrief() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-gradient-to-br from-blue-950/60 to-indigo-950/60 border border-blue-800/50 rounded-2xl overflow-hidden">
      {/* Collapsed header — always visible */}
      <button onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-blue-600/40 flex items-center justify-center flex-shrink-0">
            <Sparkles size={12} className="text-blue-300" />
          </div>
          <span className="text-xs font-bold text-blue-200 tracking-wide">AI Day Brief</span>
          <span className="text-[9px] bg-blue-700/50 text-blue-300 px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0">3 Jobs</span>
          <span className="text-[9px] text-blue-400/60 truncate">· 8:00 AM – ~5:00 PM</span>
        </div>
        <ChevronDown size={14} className={`text-blue-400 transition-transform flex-shrink-0 ${expanded ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}>
            <div className="px-4 pb-4 space-y-4 border-t border-blue-800/30 pt-3">

              {/* Day window stat */}
              <div className="flex gap-2">
                <div className="flex-1 bg-blue-950/50 rounded-xl px-3 py-2">
                  <div className="text-[9px] text-blue-400 uppercase tracking-wider mb-0.5">🗓 Projected Day Window</div>
                  <div className="text-sm font-bold text-white">8:00 AM – ~5:00 PM</div>
                </div>
                <div className="flex-1 bg-blue-950/50 rounded-xl px-3 py-2">
                  <div className="text-[9px] text-blue-400 uppercase tracking-wider mb-0.5">🚗 Total Drive Time</div>
                  <div className="text-sm font-bold text-white">~52 min</div>
                </div>
              </div>

              {/* Route */}
              <div>
                <div className="text-[9px] font-bold uppercase tracking-widest text-blue-400/70 mb-2">Route Order</div>
                <div className="space-y-0">
                  {DAY_ROUTE.map((stop, i) => (
                    <div key={i}>
                      {/* Drive indicator between stops */}
                      {stop.driveFromPrev && (
                        <div className="flex items-center gap-2 pl-4 py-1">
                          <div className="w-px h-3 bg-blue-800/50 mx-1.5" />
                          <span className="text-[9px] text-blue-400/50">{stop.driveFromPrev}</span>
                        </div>
                      )}
                      <div className="bg-blue-950/40 border border-blue-800/30 rounded-xl p-3">
                        <div className="flex items-start gap-2.5">
                          <div className="w-5 h-5 rounded-full bg-blue-700/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-[10px] font-bold text-blue-200">{stop.stop}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                              <span className="font-bold text-white text-sm leading-tight">{stop.customer}</span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${stop.badgeColor}`}>{stop.badge}</span>
                              <span className="text-[9px] text-blue-400/60 ml-auto flex-shrink-0">{stop.time}</span>
                            </div>
                            <div className="text-[10px] text-blue-300/70 mb-0.5">{stop.unitTag}</div>
                            <div className="text-[9px] font-mono text-gray-600">{stop.model}</div>
                            {stop.risk && (
                              <div className="mt-1.5 flex items-start gap-1.5 text-[10px] text-amber-300/80 bg-amber-950/30 rounded-lg px-2 py-1">
                                <span className="flex-shrink-0">⚠️</span>
                                <span>{stop.risk}</span>
                              </div>
                            )}
                            {stop.driveTo && (
                              <div className="mt-1 text-[9px] text-blue-400/50">{stop.driveTo}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Highest risk callout */}
              <div className="bg-red-950/40 border border-red-800/40 rounded-xl px-3 py-2.5">
                <div className="text-[9px] font-bold uppercase tracking-wider text-red-400 mb-1">⚠️ Highest Risk Today</div>
                <div className="text-sm font-bold text-white">Summit Medical Plaza · RTU-3</div>
                <div className="text-[10px] text-red-200/70 mt-0.5">Code 82 repeated 3× in 12 months. Condenser cleaning has not resolved the fault — expect deeper diagnostics today.</div>
              </div>

              {/* Truck stock — live van inventory status */}
              <div>
                <div className="text-[9px] font-bold uppercase tracking-widest text-blue-400/70 mb-2">Van Inventory vs. Today's Jobs</div>
                <div className="bg-blue-950/30 border border-blue-800/30 rounded-xl p-3 space-y-2">
                  {AI_STOCK_LIST.map((s, i) => (
                    <div key={i} className="flex items-start gap-2">
                      {s.ok === 'ready'   && <CheckCircle  size={11} className="text-green-400  flex-shrink-0 mt-0.5" />}
                      {s.ok === 'low'     && <AlertTriangle size={11} className="text-yellow-400 flex-shrink-0 mt-0.5" />}
                      {s.ok === 'missing' && <Minus         size={11} className="text-red-400    flex-shrink-0 mt-0.5" />}
                      <div className="min-w-0">
                        <span className={`text-[11px] font-semibold ${
                          s.ok === 'ready' ? 'text-white' : s.ok === 'low' ? 'text-yellow-200' : 'text-red-300'
                        }`}>{s.item}</span>
                        <span className="text-[10px] text-gray-500"> — {s.reason}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 mt-2 px-1 text-[9px] text-gray-600">
                  <span className="flex items-center gap-1"><CheckCircle size={8} className="text-green-400" /> In van</span>
                  <span className="flex items-center gap-1"><AlertTriangle size={8} className="text-yellow-400" /> Low stock</span>
                  <span className="flex items-center gap-1"><Minus size={8} className="text-red-400" /> Missing</span>
                </div>
              </div>

              {/* Important notes */}
              <div>
                <div className="text-[9px] font-bold uppercase tracking-widest text-blue-400/70 mb-2">Important Notes</div>
                <div className="space-y-2">
                  {DAY_NOTES.map((n, i) => (
                    <div key={i} className="flex items-start gap-2.5 bg-gray-800/60 rounded-xl px-3 py-2.5">
                      <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider flex-shrink-0 mt-0.5 w-14 leading-snug">{n.job}</span>
                      <span className="text-[11px] text-gray-300 leading-relaxed">{n.note}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Compact Calendar Card ─────────────────────────────────────────────────────
const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function CalendarCard({ events, today, onDayTap, onExpand }: {
  events: CalendarEvent[]; today: number;
  onDayTap: (day: number, events: CalendarEvent[]) => void;
  onExpand: () => void;
}) {
  const eventMap = buildEventMap(events);
  const cells = buildCells();
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  const jobsToday = TODAY_JOBS.length;
  const pmsThisWeek = events.filter(e => e.type === 'pm' && e.day >= today && e.day <= today + 7).length + 2;
  const followups = events.filter(e => e.type === 'followup').length;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <CalIcon size={12} className="text-blue-400" />
          <span className="text-xs font-bold text-white tracking-wide">June 2026</span>
        </div>
        <button onClick={onExpand} className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-300 transition-colors">
          <Maximize2 size={11} /><span>Expand</span>
        </button>
      </div>

      <div className="grid grid-cols-7 px-2 pt-2 pb-0.5">
        {DAY_LABELS.map(d => <div key={d} className="text-[9px] font-bold text-gray-600 text-center">{d}</div>)}
      </div>

      <div className="px-1 pb-2">
        {rows.map((row, ri) => (
          <div key={ri} className="grid grid-cols-7">
            {row.map((day, ci) => {
              if (day === null) return <div key={ci} className="py-1" />;
              const dayEvents = eventMap.get(day) ?? [];
              const isToday = day === today;
              const isPast = day < today;
              return (
                <button key={ci}
                  onClick={() => onDayTap(day, dayEvents)}
                  className={`flex flex-col items-center py-1 rounded-xl ${dayEvents.length > 0 ? 'cursor-pointer active:bg-gray-800' : 'cursor-default'}`}>
                  <div className={`w-6 h-6 flex items-center justify-center rounded-full text-[11px] font-semibold ${
                    isToday ? 'bg-blue-500 text-white font-bold' : isPast ? 'text-gray-600' : 'text-gray-300'
                  }`}>{day}</div>
                  <div className="flex gap-0.5 mt-0.5 h-1.5 items-center">
                    {dayEvents.slice(0, 2).map((e, i) => (
                      <div key={i} className={`w-1 h-1 rounded-full ${EVENT_COLORS[e.type]}`} />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="px-3 py-2 border-t border-gray-800 flex flex-wrap gap-x-3 gap-y-1">
        {(['appointment','pm','emergency','completed','followup'] as const).map(type => (
          <div key={type} className="flex items-center gap-1">
            <div className={`w-1.5 h-1.5 rounded-full ${EVENT_COLORS[type]}`} />
            <span className="text-[9px] text-gray-600">{EVENT_LABELS[type]}</span>
          </div>
        ))}
      </div>

      <div className="px-3 py-2.5 border-t border-gray-800 bg-gray-950/50 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px]">
          <span className="text-amber-400 font-bold">{jobsToday} Jobs Today</span>
          <span className="text-gray-700">·</span>
          <span className="text-blue-400 font-semibold">{pmsThisWeek} PMs This Week</span>
          <span className="text-gray-700">·</span>
          <span className="text-yellow-400 font-semibold">{followups} Follow-up{followups !== 1 ? 's' : ''}</span>
        </div>
        <button onClick={() => onDayTap(today, eventMap.get(today) ?? [])}
          className="text-[9px] text-blue-400 font-semibold flex-shrink-0">Today →</button>
      </div>
    </div>
  );
}

// ─── Full-Screen Calendar Modal ────────────────────────────────────────────────
function FullScreenCalendar({ events, today, onClose, onDayTap }: {
  events: CalendarEvent[]; today: number;
  onClose: () => void;
  onDayTap: (day: number, evts: CalendarEvent[]) => void;
}) {
  const [activeDay, setActiveDay] = useState<number | null>(today);
  const eventMap = buildEventMap(events);
  const cells = buildCells();
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  const activeDayEvents = activeDay ? (eventMap.get(activeDay) ?? []) : [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-gray-950 z-50 flex flex-col overflow-hidden">
      <div className="px-4 pt-12 pb-4 border-b border-gray-800 flex items-center justify-between flex-shrink-0">
        <div>
          <div className="text-xs text-gray-500 mb-0.5">Full Calendar</div>
          <h2 className="text-xl font-bold">June 2026</h2>
        </div>
        <button onClick={onClose} className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center">
          <X size={18} className="text-gray-400" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3">
          <button className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center"><ChevronLeft size={16} className="text-gray-400" /></button>
          <span className="text-sm font-bold text-white">June 2026</span>
          <button className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center"><ChevronRight size={16} className="text-gray-400" /></button>
        </div>
        <div className="grid grid-cols-7 px-3 mb-1">
          {DAY_LABELS.map(d => <div key={d} className="text-[10px] font-bold text-gray-600 text-center">{d}</div>)}
        </div>
        <div className="px-2">
          {rows.map((row, ri) => (
            <div key={ri} className="grid grid-cols-7 mb-1">
              {row.map((day, ci) => {
                if (day === null) return <div key={ci} />;
                const dayEvents = eventMap.get(day) ?? [];
                const isToday = day === today;
                const isActive = day === activeDay;
                const isPast = day < today;
                return (
                  <button key={ci} onClick={() => setActiveDay(day)}
                    className={`flex flex-col items-center py-2 rounded-2xl transition-colors ${isActive ? 'bg-gray-800' : ''}`}>
                    <div className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-semibold ${
                      isToday ? 'bg-blue-500 text-white' : isActive ? 'text-white' : isPast ? 'text-gray-600' : 'text-gray-200'
                    }`}>{day}</div>
                    <div className="flex gap-0.5 mt-1 h-2 items-center">
                      {dayEvents.slice(0, 2).map((e, i) => (
                        <div key={i} className={`w-1.5 h-1.5 rounded-full ${EVENT_COLORS[e.type]}`} />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-4 py-3 border-t border-gray-800 mt-2">
          {Object.entries(EVENT_LABELS).map(([type, label]) => (
            <div key={type} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${EVENT_COLORS[type as CalendarEvent['type']]}`} />
              <span className="text-[10px] text-gray-500">{label}</span>
            </div>
          ))}
        </div>
        {activeDay !== null && (
          <div className="px-4 pb-8">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">June {activeDay}</div>
            {activeDayEvents.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
                <div className="text-gray-500 text-sm">No scheduled work</div>
                <button onClick={() => { onClose(); onDayTap(activeDay, []); }}
                  className="mt-3 text-xs text-blue-400 font-semibold">View options →</button>
              </div>
            ) : (
              <div className="space-y-2">
                {activeDayEvents.map((e, i) => (
                  <div key={i} className="flex items-start gap-3 bg-gray-900 border border-gray-800 rounded-2xl p-4">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-0.5 ${EVENT_COLORS[e.type]}`} />
                    <div>
                      <div className="text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-0.5">{EVENT_LABELS[e.type]}</div>
                      <div className="text-sm text-white font-medium leading-relaxed">{e.label}</div>
                    </div>
                  </div>
                ))}
                <button onClick={() => { onClose(); onDayTap(activeDay, activeDayEvents); }}
                  className="w-full bg-blue-700 text-white font-bold py-3.5 rounded-2xl text-sm mt-1">
                  Open Day Schedule
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Account Dashboard ─────────────────────────────────────────────────────────
function AccountDashboard({ onClose }: { onClose: () => void }) {
  const MENU_SECTIONS = [
    {
      items: [
        { icon: <User size={15} />,        label: 'Profile' },
        { icon: <Settings size={15} />,    label: 'My Account' },
        { icon: <CheckCircle size={15} />, label: 'Subscription', badge: 'Pro' },
      ],
    },
    {
      title: "Today's Performance",
      items: [
        { label: 'Hours Worked',        value: '6h 22min' },
        { label: 'Completed Jobs',      value: '0 of 3' },
        { label: 'Active Jobs',         value: '0' },
        { label: 'PM Completion',       value: '—' },
        { label: 'Follow-ups Pending',  value: '2' },
      ],
    },
    {
      title: 'Field Tools',
      items: [
        { icon: <Cpu size={15} />,      label: 'Saved Equipment' },
        { icon: <Wrench size={15} />,   label: 'Inventory' },
        { icon: <FileText size={15} />, label: 'Service Records' },
      ],
    },
    {
      title: 'System',
      items: [
        { icon: <Settings size={15} />,    label: 'Settings' },
        { icon: <Zap size={15} />,         label: 'Offline Mode', badge: 'Ready' },
        { icon: <Lightbulb size={15} />,   label: 'Help & Support' },
      ],
    },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 z-40 flex items-end" onClick={onClose}>
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 35 }}
        className="w-full bg-gray-900 rounded-t-3xl border-t border-gray-800 max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        {/* Profile header */}
        <div className="px-5 pt-5 pb-4 border-b border-gray-800">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-700 flex items-center justify-center font-bold text-white text-xl">MR</div>
            <div>
              <div className="font-bold text-white text-lg leading-tight">Marcus Rivera</div>
              <div className="text-sm text-gray-400">Rivera HVAC Service</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[9px] bg-blue-700/50 text-blue-300 px-1.5 py-0.5 rounded-full font-bold">PRO</span>
                <span className="text-[10px] text-gray-600">Tech ID: MR-042</span>
              </div>
            </div>
          </div>
        </div>

        {/* Menu sections */}
        <div className="px-4 py-4 space-y-5">
          {MENU_SECTIONS.map((section, si) => (
            <div key={si}>
              {section.title && (
                <div className="text-[9px] font-bold uppercase tracking-widest text-gray-600 mb-2 px-1">{section.title}</div>
              )}
              <div className="bg-gray-800 rounded-2xl overflow-hidden">
                {section.items.map((item, ii) => (
                  <div key={ii} className={`flex items-center justify-between px-4 py-3.5 ${ii < section.items.length - 1 ? 'border-b border-gray-700' : ''}`}>
                    <div className="flex items-center gap-3">
                      {'icon' in item && item.icon && <span className="text-gray-400">{item.icon}</span>}
                      <span className={`text-sm ${'value' in item ? 'text-gray-400' : 'text-white'}`}>{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {'badge' in item && item.badge && (
                        <span className="text-[9px] bg-blue-700/50 text-blue-300 px-1.5 py-0.5 rounded-full font-bold">{item.badge}</span>
                      )}
                      {'value' in item && item.value && (
                        <span className="text-sm font-semibold text-white">{item.value}</span>
                      )}
                      {'icon' in item && <ChevronRight size={14} className="text-gray-600" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <button className="w-full flex items-center gap-3 bg-red-950/30 border border-red-900/50 rounded-2xl px-4 py-3.5">
            <LogOut size={15} className="text-red-400" />
            <span className="text-sm font-semibold text-red-400">Logout</span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Overview Filter Sheet ─────────────────────────────────────────────────────
function OverviewFilterSheet({ filterId, onClose, onSelectJob }: {
  filterId: string;
  onClose: () => void;
  onSelectJob: (job: TodayJob) => void;
}) {
  const config: Record<string, { title: string; subtitle: string; content: React.ReactNode }> = {
    jobs: {
      title: "Today's Jobs",
      subtitle: `${TODAY_JOBS.length} assigned`,
      content: (
        <div className="space-y-2">
          {TODAY_JOBS.map(job => {
            const style = PRIORITY_STYLE[job.priority];
            return (
              <button key={job.id} onClick={() => onSelectJob(job)}
                className={`w-full text-left bg-gray-800 border-l-4 ${style.border} rounded-xl p-3`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${style.badge}`}>{style.label}</span>
                  <span className="text-[10px] text-gray-500 ml-auto">{job.scheduledTime}</span>
                </div>
                <div className="font-bold text-white text-sm">{job.customer}</div>
                <div className="text-[10px] text-blue-300/70">{job.unitTag}</div>
                <div className="text-xs text-gray-400 mt-0.5 leading-snug">{job.symptom}</div>
              </button>
            );
          })}
        </div>
      ),
    },
    progress: {
      title: 'In Progress',
      subtitle: '0 active jobs',
      content: (
        <div className="text-center py-8">
          <div className="text-3xl mb-3">▶</div>
          <div className="font-semibold text-white mb-1">No jobs in progress</div>
          <div className="text-xs text-gray-500">Start a job from Today's Jobs to see it here</div>
        </div>
      ),
    },
    pms: {
      title: 'PMs Due This Week',
      subtitle: '2 preventive maintenance calls',
      content: (
        <div className="space-y-2">
          {TODAY_JOBS.filter(j => j.priority === 'pm').map(job => (
            <button key={job.id} onClick={() => onSelectJob(job)}
              className="w-full text-left bg-gray-800 border-l-4 border-l-blue-500 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-gray-700 text-gray-300">PM DUE</span>
                <span className="text-[10px] text-gray-500 ml-auto">{job.scheduledTime}</span>
              </div>
              <div className="font-bold text-white text-sm">{job.customer}</div>
              <div className="text-[10px] text-blue-300/70">{job.unitTag}</div>
              <div className="text-xs text-gray-400 mt-0.5">{job.symptom}</div>
            </button>
          ))}
        </div>
      ),
    },
    followups: {
      title: 'Follow-Ups',
      subtitle: '2 pending — callbacks, quoted repairs, approvals',
      content: (
        <div className="space-y-2">
          {FOLLOW_UP_ITEMS.map((f, i) => (
            <div key={i} className={`bg-gray-800 rounded-xl p-3 border-l-4 ${f.priority === 'high' ? 'border-l-amber-500' : 'border-l-gray-600'}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${f.priority === 'high' ? 'bg-amber-900/50 text-amber-400' : 'bg-gray-700 text-gray-400'}`}>
                  {f.priority === 'high' ? 'HIGH' : 'MEDIUM'}
                </span>
                <span className="text-[10px] text-gray-500 ml-auto">Due {f.dueDate}</span>
              </div>
              <div className="font-bold text-white text-sm">{f.customer}</div>
              <div className="text-[10px] text-gray-500">{f.equipment}</div>
              <div className="text-xs text-gray-400 mt-0.5 leading-snug">{f.issue}</div>
              <div className="text-[10px] text-amber-400 mt-1">{f.daysDue} days until due</div>
            </div>
          ))}
        </div>
      ),
    },
  };

  const c = config[filterId] ?? config['jobs'];

  return (
    <Sheet onClose={onClose}>
      <div className="px-5 pt-5 pb-4 border-b border-gray-800 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">{c.title}</h2>
          <div className="text-xs text-gray-500 mt-0.5">{c.subtitle}</div>
        </div>
        <SheetClose onClose={onClose} />
      </div>
      <div className="px-5 py-4">{c.content}</div>
    </Sheet>
  );
}

// ─── Equipment Detail Modal ────────────────────────────────────────────────────
function EquipmentDetailModal({ eq, onClose, onLaunchDiagnostic }: {
  eq: EquipmentAttention;
  onClose: () => void;
  onLaunchDiagnostic: (eq: EquipmentAttention) => void;
}) {
  const sev = SEV_STYLE[eq.severity];
  const TREND_ICON = { up: TrendingUp, down: TrendingDown, stable: Minus };
  const TREND_COLOR = { up: 'text-red-400', down: 'text-green-400', stable: 'text-gray-400' };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-gray-950 z-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className={`px-4 pt-12 pb-4 border-b ${sev.ring} flex items-start justify-between flex-shrink-0 ${sev.bg}`}>
        <div>
          <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${sev.badgeBg} inline-block mb-2`}>{sev.badge}</span>
          <h2 className="text-xl font-bold text-white leading-tight">{eq.unit}</h2>
          <div className="text-sm text-blue-300/80">{eq.unitTag}</div>
          <div className="text-xs font-mono text-gray-500 mt-0.5">{eq.model} · {eq.location}</div>
        </div>
        <button onClick={onClose} className="w-9 h-9 rounded-full bg-gray-800/80 flex items-center justify-center flex-shrink-0 mt-1">
          <X size={18} className="text-gray-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* AI Insight */}
        <div className="px-4 pt-4">
          <div className="bg-blue-950/40 border border-blue-800/50 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={14} className="text-blue-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400">AI Insight</span>
            </div>
            <div className="text-sm font-bold text-white mb-1">{eq.aiInsight.pattern}</div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {eq.aiInsight.stats.map((s, i) => (
                <span key={i} className="text-[10px] bg-blue-800/30 text-blue-200 px-2 py-0.5 rounded-full">{s}</span>
              ))}
            </div>
            <p className="text-sm text-blue-100/80 leading-relaxed mb-3">{eq.aiInsight.analysis}</p>
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-blue-400 mb-1">Possible Root Causes</div>
              {eq.aiInsight.rootCauses.map((rc, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-gray-200">
                  <span className="text-blue-400 flex-shrink-0 mt-0.5">•</span>
                  <span>{rc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Measurements */}
        {eq.measurements && (
          <div className="px-4 pt-4">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Measurements — Last Visit</div>
            <div className="grid grid-cols-2 gap-2">
              {eq.measurements.map((m, i) => {
                const TrendIcon = m.trend ? TREND_ICON[m.trend] : Minus;
                const trendColor = m.trend ? TREND_COLOR[m.trend] : 'text-gray-400';
                return (
                  <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-2.5">
                    <div className="text-[9px] text-gray-500 uppercase tracking-wider mb-0.5">{m.label}</div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">{m.value}</span>
                      <TrendIcon size={12} className={trendColor} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Suggested Parts */}
        <div className="px-4 pt-4">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Suggested Parts</div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-3 flex flex-wrap gap-1.5">
            {eq.aiInsight.suggestedParts.map((p, i) => (
              <div key={i} className="flex items-center gap-1 bg-gray-800 rounded-full px-2 py-1">
                <Wrench size={9} className="text-gray-400" />
                <span className="text-[10px] text-gray-300">{p}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Service History */}
        <div className="px-4 pt-4">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Service History</div>
          <div className="relative">
            <div className="absolute left-[11px] top-0 bottom-0 w-px bg-gray-800" />
            <div className="space-y-0">
              {eq.serviceHistory.map((h, i) => (
                <div key={i} className="flex items-start gap-3 pl-1 pb-4">
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5 z-10 ${h.type === 'Emergency' ? 'bg-red-900 border-red-700' : h.type === 'PM' ? 'bg-blue-900 border-blue-700' : 'bg-gray-800 border-gray-700'}`}>
                    <span className="text-[8px]">{h.type === 'Emergency' ? '🚨' : h.type === 'PM' ? '✅' : '🔧'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-bold text-white">{h.type}</div>
                        <div className="text-[10px] text-gray-500">{h.date} · {h.tech}</div>
                        <div className="text-xs text-gray-300 mt-1 leading-relaxed">{h.summary}</div>
                        {h.alarms && h.alarms.map((a, ai) => (
                          <span key={ai} className="inline-block mt-1 text-[9px] bg-red-900/40 text-red-400 border border-red-800/50 px-1.5 py-0.5 rounded-full mr-1">{a}</span>
                        ))}
                        {h.parts && h.parts.map((p, pi) => (
                          <span key={pi} className="inline-block mt-1 text-[9px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded-full mr-1">{p}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Launch Diagnostic */}
        <div className="px-4 pb-8 pt-2">
          <button
            onClick={() => onLaunchDiagnostic(eq)}
            className="w-full bg-white text-gray-950 font-bold py-5 rounded-2xl text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
            <Zap size={18} />
            Launch Diagnostic
          </button>
          <div className="text-center text-[10px] text-gray-600 mt-2">AI will preload all known history — no re-entry required</div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Job Brief Modal ───────────────────────────────────────────────────────────
function JobBriefModal({ job, onContinue, onCancel }: {
  job: TodayJob;
  onContinue: () => void;
  onCancel: () => void;
}) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center px-4">
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        className="w-full max-w-sm bg-gray-900 border border-gray-700 rounded-3xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gray-800 px-5 pt-6 pb-4 border-b border-gray-700">
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Before you leave...</div>
          <h2 className="text-xl font-bold text-white">Dispatch Notes</h2>
          <div className="text-sm text-blue-300/80 mt-0.5">{job.customer} · {job.unitTag}</div>
        </div>

        {/* Notes */}
        <div className="px-5 py-4 space-y-2.5">
          {job.dispatchNotes!.map((note, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 + i * 0.06 }}
              className="flex items-start gap-3 bg-gray-800/60 rounded-xl px-3 py-2.5">
              <div className="w-5 h-5 rounded-full bg-blue-700/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-blue-300">{i + 1}</span>
              </div>
              <span className="text-sm text-gray-200 leading-snug">{note}</span>
            </motion.div>
          ))}
        </div>

        {/* Actions */}
        <div className="px-5 pb-6 space-y-2">
          <button onClick={onContinue}
            className="w-full bg-white text-gray-950 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 text-base">
            <CheckCircle size={18} />
            Got it — Continue
          </button>
          <button onClick={onCancel}
            className="w-full text-gray-500 text-sm py-2">
            Back to Dashboard
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Shared helpers ────────────────────────────────────────────────────────────
function SectionHeader({ title, subtitle, count, countLabel = 'items' }: {
  title: string; subtitle?: string; count?: number; countLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">{title}</h2>
        {subtitle && <div className="text-[9px] text-gray-600">{subtitle}</div>}
      </div>
      {count !== undefined && <span className="text-xs text-gray-600">{count} {countLabel}</span>}
    </div>
  );
}

function Sheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 z-40 flex items-end" onClick={onClose}>
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 35 }}
        className="w-full bg-gray-900 rounded-t-3xl border-t border-gray-800 max-h-[88vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        {children}
      </motion.div>
    </motion.div>
  );
}

function SheetClose({ onClose }: { onClose: () => void }) {
  return (
    <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0">
      <X size={16} className="text-gray-400" />
    </button>
  );
}

function SheetRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 flex-shrink-0">{icon}</div>
      <div>
        <div className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">{label}</div>
        <div className="text-sm text-white leading-snug">{value}</div>
      </div>
    </div>
  );
}
