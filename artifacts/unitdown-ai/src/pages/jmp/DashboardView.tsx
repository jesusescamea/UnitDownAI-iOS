import { useState, useEffect } from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight, ChevronLeft, X, Wrench, Calendar as CalIcon, Plus,
  AlertTriangle, MapPin, Clock, Search, Cpu, FileText,
  Zap, CheckCircle, Maximize2, User, Settings, LogOut, ChevronDown,
  TrendingUp, TrendingDown, Minus, Lightbulb, Sparkles,
} from 'lucide-react';
import { MOCK_HISTORY, MOCK_EQUIPMENT, type TodayJob } from './mockData';
import {
  EVENT_COLORS, EVENT_LABELS,
  type CalendarEvent, type EquipmentAttention,
} from './dashboardData';
import { useDashboardData } from './useDashboardData';
import { AiDiagnosticModal } from './AiDiagnosticModal';
import { MyVanModal } from './MyVanModal';
import { ToolChecklistModal } from './ToolChecklistModal';
import { ScheduleJobWizard, type ScheduleWizardResult } from './ScheduleJobWizard';
import {
  INITIAL_READINESS, INITIAL_INVENTORY, AI_STOCK_LIST,
  computeJobReadiness, readinessBadge, getJobVanId,
} from './vanData';
import {
  INITIAL_TOOLS, INITIAL_TOOLS_READINESS,
  computeToolsReadiness, toolReadinessBadge,
} from './toolData';
import { AppNav } from '../../components/AppNav';
import { NameplateWorkflowModal } from './NameplateWorkflowModal';
import { UnassignedScansModal }   from './UnassignedScansModal';
import { DispatchInboxModal } from './dispatch/DispatchInboxModal';
import { useDispatchInbox } from './dispatch/useDispatchInbox';
import { EquipmentSearchModal } from './EquipmentSearchModal';
import { JmpAiAssistantModal } from './JmpAiAssistantModal';

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

function buildEventMap(events: CalendarEvent[]) {
  const m = new Map<number, CalendarEvent[]>();
  events.forEach(e => {
    if (!m.has(e.day)) m.set(e.day, []);
    m.get(e.day)!.push(e);
  });
  return m;
}

function buildCells(firstDay: number, daysInMonth: number): (number | null)[] {
  const cells: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────
export function DashboardView({ onStartJob }: Props) {
  const { user: clerkUser } = useUser();
  const { signOut } = useClerk();
  const [, navigate] = useLocation();

  const displayName = clerkUser
    ? [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') ||
      clerkUser.emailAddresses[0]?.emailAddress ||
      'Field Tech'
    : 'Field Tech';
  const initials = (() => {
    if (!clerkUser) return 'UD';
    const fromName = [clerkUser.firstName, clerkUser.lastName]
      .filter(Boolean)
      .map(n => n![0].toUpperCase())
      .join('');
    if (fromName) return fromName;
    const email = clerkUser.emailAddresses[0]?.emailAddress ?? '';
    if (!email) return 'UD';
    const local = email.split('@')[0];
    const parts = local.split(/[._\-+]/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0]?.[0]?.toUpperCase() ?? 'UD';
  })();

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
  const [wizardOpen,      setWizardOpen]      = useState(false);
  const [userJobs,        setUserJobs]        = useState<TodayJob[]>([]);
  const [userCalEvents,   setUserCalEvents]   = useState<CalendarEvent[]>([]);
  const [schedToast,      setSchedToast]      = useState<string | null>(null);
  const [prefillDate,     setPrefillDate]      = useState<string | null>(null);
  const [nameplateOpen,   setNameplateOpen]    = useState(false);
  const [unassignedOpen,  setUnassignedOpen]   = useState(false);
  const [inboxOpen,       setInboxOpen]        = useState(false);
  const [searchOpen,      setSearchOpen]       = useState(false);
  const [assistantOpen,   setAssistantOpen]    = useState(false);
  const { pendingJobs, dupJobs } = useDispatchInbox();
  const inboxBadge = pendingJobs.length + dupJobs.length;

  const LS_KEY = 'unitdown_jmp_scheduled_jobs';

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const records = JSON.parse(raw) as Array<{ job: TodayJob; calEvent: CalendarEvent; scheduledDate?: string; isToday?: boolean }>;
      // Filter jobs whose scheduledDate matches today — also handles legacy records that used isToday
      setUserJobs(records.filter(r => {
        if (r.scheduledDate) return r.scheduledDate === todayStr;
        return r.isToday === true;
      }).map(r => r.job));
      setUserCalEvents(records.map(r => r.calEvent));
    } catch { /* ignore parse errors */ }
  }, []);

  function handleJobCreated(result: ScheduleWizardResult) {
    const scheduledDate = result.job.scheduledDate ?? todayStr;
    try {
      const raw = localStorage.getItem(LS_KEY);
      const records = raw
        ? (JSON.parse(raw) as Array<{ job: TodayJob; calEvent: CalendarEvent; scheduledDate?: string; isToday?: boolean }>)
        : [];
      records.push({ job: result.job, calEvent: result.calEvent, scheduledDate });
      localStorage.setItem(LS_KEY, JSON.stringify(records));
    } catch { /* ignore write errors */ }
    if (scheduledDate === todayStr) setUserJobs(prev => [...prev, result.job]);
    setUserCalEvents(prev => [...prev, result.calEvent]);
    setWizardOpen(false);
    const isToday = scheduledDate === todayStr;
    const dateLabel = isToday
      ? 'today'
      : new Date(scheduledDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    setSchedToast(`Job scheduled for ${dateLabel}`);
    setTimeout(() => setSchedToast(null), 3500);
  }

  function handleAddJobFromCalendar() {
    const today = new Date();
    const date = selectedDay
      ? new Date(today.getFullYear(), today.getMonth(), selectedDay.day).toISOString().split('T')[0]
      : today.toISOString().split('T')[0];
    setPrefillDate(date);
    setWizardOpen(true);
  }

  const { realJobs, realCalEvents, realStats, realEquipment, realActivity } = useDashboardData(clerkUser?.id ?? '');
  const allJobs = [...realJobs, ...userJobs];

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
      <AppNav active="dashboard" />
      <div className="max-w-2xl mx-auto">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-800/60">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-0.5">{greeting}</div>
            <h1 className="text-xl font-extrabold text-white leading-tight truncate">{displayName}</h1>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-gray-500 flex-wrap">
              <span>{now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
              <span className="text-gray-700">·</span>
              <span>{timeStr}</span>
              {allJobs.length > 0 && (
                <>
                  <span className="text-gray-700">·</span>
                  <span className="text-blue-400/90 font-semibold">{allJobs.length} job{allJobs.length !== 1 ? 's' : ''} today</span>
                </>
              )}
            </div>
          </div>
          <button onClick={() => setAccountOpen(true)}
            className="w-10 h-10 rounded-2xl bg-blue-700 flex items-center justify-center font-bold text-white text-sm flex-shrink-0 active:scale-95 transition-transform">
            {initials}
          </button>
        </div>
      </div>

      {/* ── AI Morning Brief ─────────────────────────────────────── */}
      <div className="px-4 pt-4">
        <AiDayBrief jobCount={allJobs.length} jobs={allJobs} />
      </div>

      {/* ── Calendar ─────────────────────────────────────────────── */}
      <div className="px-4 pt-4">
        <CalendarCard
          events={[...realCalEvents, ...userCalEvents]}
          currentDate={now}
          jobsToday={allJobs.length}
          onDayTap={(day, evts) => setSelectedDay({ day, events: evts })}
          onExpand={() => setCalFullScreen(true)}
          onAddJob={handleAddJobFromCalendar}
        />
      </div>

      {/* ── Overview tiles ───────────────────────────────────────── */}
      <div className="pt-4">
        <div className="px-4 mb-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Overview</span>
        </div>
        <div className="flex gap-2.5 overflow-x-auto px-4 pb-1 snap-x snap-mandatory">
          {realStats.map(s => (
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
        <SectionHeader title="Today's Jobs" count={allJobs.length} countLabel="jobs" />
        {allJobs.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 text-center">
            <div className="text-3xl mb-2">☀️</div>
            <div className="font-semibold text-white mb-1">No scheduled jobs today</div>
            <div className="text-xs text-gray-500">Check equipment follow-ups and messages below</div>
          </div>
        ) : (
          <div className="space-y-2">
            {allJobs.map((job, i) => {
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
                      <div className="text-[10px] text-gray-500 mt-0.5">{job.type}</div>
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

      {/* ── Start Work ───────────────────────────────────────────── */}
      <div className="px-4 pt-5">
        <SectionHeader title="Start Work" />
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
          {/* Dispatch Inbox tile */}
          <button onClick={() => setInboxOpen(true)}
            className="relative flex flex-col items-center gap-2 py-4 rounded-2xl border bg-blue-900/30 border-blue-800 active:scale-95 transition-transform">
            {inboxBadge > 0 && (
              <div className="absolute top-1.5 right-1.5 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-blue-600 text-white">
                {inboxBadge}
              </div>
            )}
            <FileText size={18} className="text-blue-400" />
            <div className="text-center">
              <div className="text-[10px] text-gray-200 font-bold leading-tight">Dispatch</div>
              <div className="text-[9px] text-blue-400/80">Inbox</div>
            </div>
          </button>
          {/* Search Equipment */}
          <button onClick={() => setSearchOpen(true)}
            className="flex flex-col items-center gap-2 py-4 rounded-2xl border bg-blue-900/20 border-blue-900/60 active:scale-95 transition-transform">
            <Search size={18} className="text-blue-400" />
            <div className="text-center">
              <div className="text-[10px] text-gray-200 font-bold leading-tight">Search</div>
              <div className="text-[9px] text-blue-400/80">Equipment</div>
            </div>
          </button>
          {/* Scan Nameplate */}
          <button onClick={() => setNameplateOpen(true)}
            className="flex flex-col items-center gap-2 py-4 rounded-2xl border bg-green-900/40 border-green-800 active:scale-95 transition-transform">
            <Zap size={18} className="text-green-400" />
            <div className="text-center">
              <div className="text-[10px] text-gray-200 font-bold leading-tight">Scan</div>
              <div className="text-[9px] text-green-400/80">Nameplate</div>
            </div>
          </button>
          {/* AI Assistant */}
          <button onClick={() => setAssistantOpen(true)}
            className="flex flex-col items-center gap-2 py-4 rounded-2xl border bg-purple-900/40 border-purple-800 active:scale-95 transition-transform">
            <Cpu size={18} className="text-purple-400" />
            <div className="text-center">
              <div className="text-[10px] text-gray-200 font-bold leading-tight">AI</div>
              <div className="text-[9px] text-purple-400/80">Assistant</div>
            </div>
          </button>
        </div>
      </div>

      {/* ── Equipment Intelligence ───────────────────────────────── */}
      <div className="px-4 pt-5">
        <SectionHeader title="Equipment" subtitle="AI-assisted pattern analysis" />
        {realEquipment.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 text-center">
            <div className="text-2xl mb-2">🔍</div>
            <div className="font-semibold text-white mb-1">No equipment patterns detected yet</div>
            <div className="text-xs text-gray-500">Patterns will appear as you log diagnostics on saved equipment.</div>
          </div>
        ) : (
        <div className="space-y-3">
          {realEquipment.map((eq, i) => {
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
        )}
      </div>

      {/* ── Office Messages ──────────────────────────────────────── */}
      <div className="px-4 pt-5">
        <SectionHeader title="Messages" countLabel="unread" />
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 text-center">
          <div className="text-2xl mb-2">💬</div>
          <div className="font-semibold text-white mb-1">No office messages connected yet</div>
          <div className="text-xs text-gray-500">Dispatcher messages will appear here once connected.</div>
        </div>
      </div>

      {/* ── Recent Activity ──────────────────────────────────────── */}
      <div className="px-4 pt-5">
        <SectionHeader title="Recent Activity" subtitle="Field history" />
        {realActivity.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 text-center">
            <div className="text-2xl mb-2">📋</div>
            <div className="font-semibold text-white mb-1">No recent activity yet</div>
            <div className="text-xs text-gray-500">Diagnostic logs and completed jobs will appear here.</div>
          </div>
        ) : (
        <div className="relative">
          <div className="absolute left-[11px] top-0 bottom-0 w-px bg-gray-800" />
          <div className="space-y-0">
            {realActivity.map((a, i) => (
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
        )}
      </div>

      {/* ═══ Modals ════════════════════════════════════════════════ */}

      <AnimatePresence>
        {calFullScreen && (
          <FullScreenCalendar
            events={[...realCalEvents, ...userCalEvents]} currentDate={now}
            onClose={() => setCalFullScreen(false)}
            onDayTap={(d, e) => { setCalFullScreen(false); setSelectedDay({ day: d, events: e }); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {accountOpen && (
          <AccountDashboard
            onClose={() => setAccountOpen(false)}
            displayName={displayName}
            initials={initials}
            onNavigate={(path) => { setAccountOpen(false); navigate(path); }}
            onLogout={() => { signOut().then(() => navigate('/')); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {overviewFilter && (
          <OverviewFilterSheet
            filterId={overviewFilter}
            jobs={allJobs}
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
        {inboxOpen && (
          <DispatchInboxModal
            onClose={() => setInboxOpen(false)}
            onStartJob={() => { setInboxOpen(false); onStartJob(); }}
            onJobAccepted={handleJobCreated}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {searchOpen && (
          <EquipmentSearchModal onClose={() => setSearchOpen(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {assistantOpen && (
          <JmpAiAssistantModal onClose={() => setAssistantOpen(false)} />
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

      {/* ── Schedule Job Wizard ───────────────────────────────────── */}
      <AnimatePresence>
        {wizardOpen && (
          <ScheduleJobWizard
            onClose={() => { setWizardOpen(false); setPrefillDate(null); }}
            onCreate={handleJobCreated}
            defaultDate={prefillDate ?? undefined}
          />
        )}
      </AnimatePresence>

      {/* ── "Job scheduled" toast ─────────────────────────────────── */}
      <AnimatePresence>
        {schedToast && (
          <motion.div
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-gray-800 border border-gray-700 rounded-2xl px-5 py-3 flex items-center gap-2 shadow-xl"
          >
            <CheckCircle size={15} className="text-blue-400 flex-shrink-0" />
            <span className="text-sm font-semibold text-white">{schedToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Nameplate Workflow ─────────────────────────────────────── */}
      <AnimatePresence>
        {nameplateOpen && (
          <NameplateWorkflowModal
            onClose={() => setNameplateOpen(false)}
            onViewUnassigned={() => setUnassignedOpen(true)}
          />
        )}
      </AnimatePresence>

      {/* ── Unassigned Scans Inbox ─────────────────────────────────── */}
      <AnimatePresence>
        {unassignedOpen && (
          <UnassignedScansModal onClose={() => setUnassignedOpen(false)} />
        )}
      </AnimatePresence>
      </div>{/* /max-w-2xl */}
    </div>
  );
}

// ─── AI Day Brief ─────────────────────────────────────────────────────────────

function AiDayBrief({ jobCount = 0, jobs = [] }: { jobCount?: number; jobs?: TodayJob[] }) {
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
          <span className="text-[9px] bg-blue-700/50 text-blue-300 px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0">{jobCount} {jobCount === 1 ? 'Job' : 'Jobs'}</span>
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

              {/* Route — real jobs */}
              <div>
                <div className="text-[9px] font-bold uppercase tracking-widest text-blue-400/70 mb-2">Route Order</div>
                {jobs.length === 0 ? (
                  <div className="bg-blue-950/30 border border-blue-800/30 rounded-xl px-3 py-3 text-center">
                    <div className="text-[11px] text-blue-300/60">No jobs scheduled today</div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {jobs.map((job, i) => {
                      const style = PRIORITY_STYLE[job.priority];
                      return (
                        <div key={job.id} className="bg-blue-950/40 border border-blue-800/30 rounded-xl p-3">
                          <div className="flex items-start gap-2.5">
                            <div className="w-5 h-5 rounded-full bg-blue-700/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-[10px] font-bold text-blue-200">{i + 1}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                <span className="font-bold text-white text-sm leading-tight">{job.customer}</span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${style.badge}`}>{style.label}</span>
                                <span className="text-[9px] text-blue-400/60 ml-auto flex-shrink-0">{job.scheduledTime}</span>
                              </div>
                              <div className="text-[10px] text-blue-300/70 mb-0.5">{job.unitTag}</div>
                              <div className="text-xs text-gray-400 leading-snug">{job.symptom}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
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

              {/* Dispatch notes from real jobs */}
              {jobs.some(j => j.dispatchNotes && j.dispatchNotes.length > 0) && (
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-widest text-blue-400/70 mb-2">Dispatch Notes</div>
                  <div className="space-y-2">
                    {jobs.filter(j => j.dispatchNotes && j.dispatchNotes.length > 0).map(j => (
                      <div key={j.id} className="bg-gray-800/60 rounded-xl px-3 py-2.5">
                        <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">{j.customer}</div>
                        {(j.dispatchNotes ?? []).map((note, ni) => (
                          <div key={ni} className="text-[11px] text-gray-300 leading-relaxed">{note}</div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Compact Calendar Card ─────────────────────────────────────────────────────
const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function CalendarCard({ events, currentDate, jobsToday, onDayTap, onExpand, onAddJob }: {
  events: CalendarEvent[]; currentDate: Date; jobsToday: number;
  onDayTap: (day: number, events: CalendarEvent[]) => void;
  onExpand: () => void;
  onAddJob: () => void;
}) {
  const today = currentDate.getDate();
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const monthYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const eventMap = buildEventMap(events);
  const cells = buildCells(firstDay, daysInMonth);
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  const pmsThisWeek = events.filter(e => e.type === 'pm' && e.day >= today && e.day <= today + 7).length;
  const followups = events.filter(e => e.type === 'followup').length;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <CalIcon size={12} className="text-blue-400" />
          <span className="text-xs font-bold text-white tracking-wide">{monthYear}</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onAddJob} className="flex items-center gap-1 text-[10px] font-semibold text-blue-400 hover:text-blue-300 active:scale-95 transition-all">
            <Plus size={11} /><span>Add Job</span>
          </button>
          <div className="w-px h-3 bg-gray-700" />
          <button onClick={onExpand} className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-300 transition-colors">
            <Maximize2 size={11} /><span>Expand</span>
          </button>
        </div>
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
function FullScreenCalendar({ events, currentDate, onClose, onDayTap }: {
  events: CalendarEvent[]; currentDate: Date;
  onClose: () => void;
  onDayTap: (day: number, evts: CalendarEvent[]) => void;
}) {
  const today = currentDate.getDate();
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const monthYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const [activeDay, setActiveDay] = useState<number | null>(today);
  const eventMap = buildEventMap(events);
  const cells = buildCells(firstDay, daysInMonth);
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  const activeDayEvents = activeDay ? (eventMap.get(activeDay) ?? []) : [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-gray-950 z-50 flex flex-col overflow-hidden">
      <div className="px-4 pt-12 pb-4 border-b border-gray-800 flex items-center justify-between flex-shrink-0">
        <div>
          <div className="text-xs text-gray-500 mb-0.5">Full Calendar</div>
          <h2 className="text-xl font-bold">{monthYear}</h2>
        </div>
        <button onClick={onClose} className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center">
          <X size={18} className="text-gray-400" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3">
          <button className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center"><ChevronLeft size={16} className="text-gray-400" /></button>
          <span className="text-sm font-bold text-white">{monthYear}</span>
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
            <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">{monthYear} {activeDay}</div>
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
function AccountDashboard({
  onClose, displayName, initials, onNavigate, onLogout,
}: {
  onClose: () => void;
  displayName: string;
  initials: string;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}) {
  const MENU_SECTIONS = [
    {
      items: [
        { icon: <User size={15} />,        label: 'My Account',    path: '/account' },
        { icon: <CheckCircle size={15} />, label: 'Subscription',  path: '/account', badge: 'Pro' },
      ],
    },
    {
      title: "Today's Performance",
      items: [
        { label: 'Completed Jobs',      value: '0 of 3' },
        { label: 'Active Jobs',         value: '0' },
        { label: 'Follow-ups Pending',  value: '2' },
      ],
    },
    {
      title: 'Field Tools',
      items: [
        { icon: <Cpu size={15} />,      label: 'Saved Equipment',  path: '/records' },
        { icon: <Wrench size={15} />,   label: 'Inventory',        path: '/account' },
        { icon: <FileText size={15} />, label: 'Service Records',  path: '/records' },
      ],
    },
    {
      title: 'System',
      items: [
        { icon: <Settings size={15} />,    label: 'Settings',      path: '/account' },
        { icon: <Zap size={15} />,         label: 'Offline Mode',  badge: 'Ready' },
        { icon: <Lightbulb size={15} />,   label: 'Help & Support', path: '/account' },
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
            <div className="w-14 h-14 rounded-2xl bg-blue-700 flex items-center justify-center font-bold text-white text-xl">{initials}</div>
            <div>
              <div className="font-bold text-white text-lg leading-tight">{displayName}</div>
              <div className="text-sm text-gray-400">UnitDown Field Tech</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[9px] bg-blue-700/50 text-blue-300 px-1.5 py-0.5 rounded-full font-bold">PRO</span>
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
                  <button
                    key={ii}
                    onClick={() => { if ('path' in item && item.path) onNavigate(item.path); }}
                    className={`w-full flex items-center justify-between px-4 py-3.5 text-left ${ii < section.items.length - 1 ? 'border-b border-gray-700' : ''} ${'path' in item && item.path ? 'active:bg-gray-700' : 'cursor-default'}`}>
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
                      {'path' in item && item.path && <ChevronRight size={14} className="text-gray-600" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}

          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 bg-red-950/30 border border-red-900/50 rounded-2xl px-4 py-3.5 active:bg-red-950/50">
            <LogOut size={15} className="text-red-400" />
            <span className="text-sm font-semibold text-red-400">Logout</span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Overview Filter Sheet ─────────────────────────────────────────────────────
function OverviewFilterSheet({ filterId, jobs, onClose, onSelectJob }: {
  filterId: string;
  jobs: TodayJob[];
  onClose: () => void;
  onSelectJob: (job: TodayJob) => void;
}) {
  const config: Record<string, { title: string; subtitle: string; content: React.ReactNode }> = {
    jobs: {
      title: "Today's Jobs",
      subtitle: jobs.length === 0 ? 'none today' : `${jobs.length} assigned`,
      content: jobs.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-3xl mb-3">☀️</div>
          <div className="font-semibold text-white mb-1">No jobs scheduled today</div>
          <div className="text-xs text-gray-500">Jobs created via Job Mode will appear here.</div>
        </div>
      ) : (
        <div className="space-y-2">
          {jobs.map(job => {
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
                <div className="text-[10px] text-gray-500 mt-0.5">{job.type}</div>
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
      subtitle: jobs.filter(j => j.priority === 'pm').length === 0 ? 'none scheduled' : `${jobs.filter(j => j.priority === 'pm').length} due`,
      content: jobs.filter(j => j.priority === 'pm').length === 0 ? (
        <div className="text-center py-8">
          <div className="text-3xl mb-3">📅</div>
          <div className="font-semibold text-white mb-1">No PMs scheduled this week</div>
          <div className="text-xs text-gray-500">Preventive maintenance jobs will appear here.</div>
        </div>
      ) : (
        <div className="space-y-2">
          {jobs.filter(j => j.priority === 'pm').map(job => (
            <button key={job.id} onClick={() => onSelectJob(job)}
              className="w-full text-left bg-gray-800 border-l-4 border-l-blue-500 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-gray-700 text-gray-300">PM DUE</span>
                <span className="text-[10px] text-gray-500 ml-auto">{job.scheduledTime}</span>
              </div>
              <div className="font-bold text-white text-sm">{job.customer}</div>
              <div className="text-[10px] text-blue-300/70">{job.unitTag}</div>
              <div className="text-[10px] text-gray-500 mt-0.5">{job.type}</div>
              <div className="text-xs text-gray-400 mt-0.5">{job.symptom}</div>
            </button>
          ))}
        </div>
      ),
    },
    followups: {
      title: 'Follow-Ups',
      subtitle: 'callbacks, quoted repairs, approvals',
      content: (
        <div className="text-center py-8">
          <div className="text-3xl mb-3">🔁</div>
          <div className="font-semibold text-white mb-1">No follow-ups yet</div>
          <div className="text-xs text-gray-500">Follow-up items from completed jobs will appear here.</div>
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
