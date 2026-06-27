import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight, ChevronLeft, X, Wrench, Calendar as CalIcon,
  AlertTriangle, MapPin, Clock, Phone,
  Search, Cpu, FileText, Zap, CheckCircle, Maximize2,
} from 'lucide-react';
import { TODAY_JOBS, MOCK_HISTORY, MOCK_EQUIPMENT, type TodayJob } from './mockData';
import {
  JUNE_EVENTS, EVENT_COLORS, EVENT_LABELS, EQUIPMENT_ATTENTION, OFFICE_MESSAGES,
  RECENT_ACTIVITY, DASHBOARD_STATS, type CalendarEvent,
} from './dashboardData';

interface Props { onStartJob: () => void }

const PRIORITY_STYLE = {
  emergency: { border: 'border-l-red-500',   badge: 'bg-red-500 text-white',       label: 'EMERGENCY' },
  high:      { border: 'border-l-amber-500', badge: 'bg-amber-500 text-white',      label: 'HIGH PRIORITY' },
  normal:    { border: 'border-l-blue-500',  badge: 'bg-blue-600/30 text-blue-300', label: 'SERVICE' },
  pm:        { border: 'border-l-gray-600',  badge: 'bg-gray-700 text-gray-300',    label: 'PM DUE' },
};

const SEV_STYLE = {
  high:   { ring: 'border-red-800',   bg: 'bg-red-950/30',   dot: 'bg-red-500',   label: 'text-red-400',   badge: 'HIGH' },
  medium: { ring: 'border-amber-800', bg: 'bg-amber-950/30', dot: 'bg-amber-500', label: 'text-amber-400', badge: 'WATCH' },
  low:    { ring: 'border-gray-700',  bg: 'bg-gray-900',     dot: 'bg-gray-500',  label: 'text-gray-400',  badge: 'INFO' },
};

// June 2026 constants
const CAL_YEAR = 2026;
const CAL_MONTH = 6;   // 1-indexed
const CAL_FIRST_DAY = 0;   // Sunday
const CAL_DAYS = 30;
const TODAY_DAY = 27;  // June 27

function buildEventMap(events: CalendarEvent[]) {
  const m = new Map<number, CalendarEvent[]>();
  events.forEach(e => {
    if (!m.has(e.day)) m.set(e.day, []);
    m.get(e.day)!.push(e);
  });
  return m;
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────
export function DashboardView({ onStartJob }: Props) {
  const [selectedJob, setSelectedJob]       = useState<TodayJob | null>(null);
  const [selectedDay, setSelectedDay]       = useState<{ day: number; events: CalendarEvent[] } | null>(null);
  const [calFullScreen, setCalFullScreen]   = useState(false);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  function handleDayTap(day: number, events: CalendarEvent[]) {
    setSelectedDay({ day, events });
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
          <div className="w-12 h-12 rounded-2xl bg-blue-700 flex items-center justify-center font-bold text-white text-lg flex-shrink-0">MR</div>
        </div>
        <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
          <span>🌤 91°F · Partly Cloudy</span>
          <span className="text-gray-700">·</span>
          <span>💧 62%</span>
          <span className="text-gray-700">·</span>
          <span>🌬 SW 8 mph</span>
        </div>
      </div>

      {/* ── Calendar Widget ──────────────────────────────────────── */}
      <div className="px-4 pt-4">
        <CalendarCard
          events={JUNE_EVENTS}
          today={TODAY_DAY}
          onDayTap={handleDayTap}
          onExpand={() => setCalFullScreen(true)}
        />
      </div>

      {/* ── Overview stat tiles ─────────────────────────────────── */}
      <div className="pt-4">
        <div className="px-4 mb-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Overview</span>
        </div>
        <div className="flex gap-2.5 overflow-x-auto px-4 pb-1 snap-x snap-mandatory">
          {DASHBOARD_STATS.map(s => (
            <div key={s.id}
              className={`flex-shrink-0 w-[86px] rounded-2xl border ${s.borderColor} ${s.color} p-3 snap-start`}>
              <div className="text-xl mb-1">{s.icon}</div>
              <div className={`text-2xl font-bold leading-none ${s.urgent ? 'text-amber-400' : 'text-white'}`}>{s.value}</div>
              <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mt-1 leading-tight">{s.label}</div>
              <div className="text-[9px] text-gray-600 mt-0.5 leading-tight">{s.subtitle}</div>
            </div>
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
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full flex-shrink-0 ${style.badge}`}>{style.label}</span>
                        <span className="text-[10px] font-mono text-gray-600">{job.id}</span>
                        <span className="text-[10px] text-gray-600 ml-auto">{job.scheduledTime}</span>
                      </div>
                      <div className="font-bold text-white text-sm leading-snug">{job.equipment}</div>
                      <div className="text-xs text-gray-400 truncate">{job.customer}</div>
                      <div className="text-xs text-gray-500 mt-1 leading-snug">{job.symptom}</div>
                      {job.techNote && (
                        <div className="mt-1.5 text-[10px] text-amber-300/80 bg-amber-950/30 rounded-lg px-2 py-1 border border-amber-900/30">
                          💡 {job.techNote}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <ChevronRight size={16} className="text-gray-600" />
                      <div className="flex items-center gap-0.5 text-[10px] text-gray-500">
                        <MapPin size={9} /><span>{job.driveTime}</span>
                      </div>
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
        <SectionHeader title="Equipment Intelligence" subtitle="Needs attention" />
        <div className="space-y-3">
          {EQUIPMENT_ATTENTION.map((eq, i) => {
            const sev = SEV_STYLE[eq.severity];
            return (
              <motion.div key={eq.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                className={`${sev.bg} border ${sev.ring} rounded-2xl p-4`}>
                <div className="flex items-start gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${sev.dot} flex-shrink-0 mt-1.5`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-bold text-white text-sm leading-snug">{eq.unit}</div>
                        <div className="text-[10px] text-gray-500">{eq.customer} · {eq.location}</div>
                      </div>
                      <span className={`text-[9px] font-bold uppercase tracking-wider flex-shrink-0 mt-0.5 ${sev.label}`}>{sev.badge}</span>
                    </div>
                    <div className="mt-2 bg-black/20 rounded-xl px-3 py-2">
                      <div className="text-xs font-semibold text-white">{eq.issue}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">{eq.detail}</div>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-600">
                      <span>{eq.visits} visit{eq.visits !== 1 ? 's' : ''} / {eq.period}</span>
                      <span>·</span>
                      <span>Last: {eq.lastService}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
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

      {/* ── Recent Activity Timeline ─────────────────────────────── */}
      <div className="px-4 pt-5">
        <SectionHeader title="Recent Activity" subtitle="Your field history" />
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
          {[
            { icon: <Phone size={18} />,      label: 'Emergency\nCall',   color: 'bg-red-900/40 border-red-800',       iconColor: 'text-red-400' },
            { icon: <Search size={18} />,     label: 'Search\nEquipment', color: 'bg-blue-900/40 border-blue-800',     iconColor: 'text-blue-400' },
            { icon: <Zap size={18} />,        label: 'Scan\nNameplate',   color: 'bg-green-900/40 border-green-800',   iconColor: 'text-green-400' },
            { icon: <Cpu size={18} />,        label: 'AI\nAssistant',     color: 'bg-purple-900/40 border-purple-800', iconColor: 'text-purple-400' },
            { icon: <FileText size={18} />,   label: 'Service\nRecords',  color: 'bg-gray-800 border-gray-700',        iconColor: 'text-gray-300' },
            { icon: <CheckCircle size={18} />,label: 'Resume\nLast Job',  color: 'bg-amber-900/40 border-amber-800',   iconColor: 'text-amber-400' },
          ].map((a, i) => (
            <button key={i} className={`flex flex-col items-center gap-2 py-4 rounded-2xl border ${a.color}`}>
              <div className={a.iconColor}>{a.icon}</div>
              <span className="text-[10px] text-gray-300 font-medium text-center leading-tight whitespace-pre-line">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Emergency call strip ─────────────────────────────────── */}
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

      {/* ─── Full-screen calendar modal ──────────────────────────── */}
      <AnimatePresence>
        {calFullScreen && (
          <FullScreenCalendar
            events={JUNE_EVENTS}
            today={TODAY_DAY}
            onClose={() => setCalFullScreen(false)}
            onDayTap={handleDayTap}
          />
        )}
      </AnimatePresence>

      {/* ─── Day schedule sheet ──────────────────────────────────── */}
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
                    { icon: <Phone size={16} className="text-red-400" />,    label: 'Create Emergency Call',  bg: 'bg-red-950/40 border-red-900' },
                    { icon: <Search size={16} className="text-blue-400" />,  label: 'Browse Equipment',       bg: 'bg-blue-950/40 border-blue-900' },
                    { icon: <FileText size={16} className="text-gray-300" />,label: 'View Service Records',   bg: 'bg-gray-800 border-gray-700' },
                    { icon: <Cpu size={16} className="text-purple-400" />,   label: 'AI Assistant',           bg: 'bg-purple-950/40 border-purple-900' },
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

      {/* ─── Job detail sheet ────────────────────────────────────── */}
      <AnimatePresence>
        {selectedJob && (
          <Sheet onClose={() => setSelectedJob(null)}>
            <div className="px-5 pt-5 pb-4 border-b border-gray-800 flex items-start justify-between">
              <div>
                <div className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full inline-flex mb-2 ${PRIORITY_STYLE[selectedJob.priority].badge}`}>
                  {PRIORITY_STYLE[selectedJob.priority].label}
                </div>
                <div className="text-xs font-mono text-gray-500 mb-1">{selectedJob.id}</div>
                <h2 className="text-lg font-bold text-white leading-tight">{selectedJob.equipment}</h2>
                <div className="text-sm text-gray-400">{selectedJob.customer}</div>
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
              {selectedJob.isPrototype ? (
                <button onClick={onStartJob}
                  className="w-full bg-white text-gray-950 font-bold text-lg py-5 rounded-2xl flex items-center justify-center gap-2">
                  <span>Start Job</span><ChevronRight size={20} />
                </button>
              ) : (
                <div className="w-full bg-gray-800 text-gray-500 font-semibold py-5 rounded-2xl text-center text-sm">
                  Full prototype workflow: JM-2026-0047 only
                </div>
              )}
            </div>
          </Sheet>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Compact Calendar Card (always-visible month grid) ─────────────────────────
const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAME = 'June 2026';

function buildCells(): (number | null)[] {
  const cells: (number | null)[] = Array(CAL_FIRST_DAY).fill(null);
  for (let d = 1; d <= CAL_DAYS; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

interface CalendarCardProps {
  events: CalendarEvent[];
  today: number;
  onDayTap: (day: number, events: CalendarEvent[]) => void;
  onExpand: () => void;
}

function CalendarCard({ events, today, onDayTap, onExpand }: CalendarCardProps) {
  const eventMap = buildEventMap(events);
  const cells = buildCells();
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  // Summary stats
  const todayEvents = eventMap.get(today) ?? [];
  const jobsToday = TODAY_JOBS.length;
  const pmsThisWeek = events.filter(e => e.type === 'pm' && e.day >= today && e.day <= today + 7).length + 2;
  const followups = events.filter(e => e.type === 'followup').length;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <CalIcon size={12} className="text-blue-400" />
          <span className="text-xs font-bold text-white tracking-wide">{MONTH_NAME}</span>
        </div>
        <button onClick={onExpand}
          className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-300 transition-colors">
          <Maximize2 size={11} />
          <span>Expand</span>
        </button>
      </div>

      {/* Day-of-week labels */}
      <div className="grid grid-cols-7 px-2 pt-2 pb-0.5">
        {DAY_LABELS.map(d => (
          <div key={d} className="text-[9px] font-bold text-gray-600 text-center">{d}</div>
        ))}
      </div>

      {/* Day grid */}
      <div className="px-1 pb-2">
        {rows.map((row, ri) => (
          <div key={ri} className="grid grid-cols-7">
            {row.map((day, ci) => {
              if (day === null) return <div key={ci} className="py-1" />;
              const dayEvents = eventMap.get(day) ?? [];
              const isToday = day === today;
              const isPast = day < today;
              const hasTap = dayEvents.length > 0;

              return (
                <button
                  key={ci}
                  onClick={() => onDayTap(day, dayEvents)}
                  className={`flex flex-col items-center py-1 rounded-xl ${hasTap ? 'cursor-pointer active:bg-gray-800' : 'cursor-default'}`}
                >
                  {/* Day number */}
                  <div className={`w-6 h-6 flex items-center justify-center rounded-full text-[11px] font-semibold ${
                    isToday
                      ? 'bg-blue-500 text-white font-bold'
                      : isPast
                        ? 'text-gray-600'
                        : 'text-gray-300'
                  }`}>
                    {day}
                  </div>
                  {/* Event dots — up to 2 */}
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

      {/* Color legend */}
      <div className="px-3 py-2 border-t border-gray-800 flex flex-wrap gap-x-3 gap-y-1">
        {([['appointment','orange-500','Service Call'],['pm','blue-500','PM'],['emergency','red-500','Emergency'],['completed','green-500','Completed'],['followup','yellow-400','Follow-up']] as const).map(([type, _color, label]) => (
          <div key={type} className="flex items-center gap-1">
            <div className={`w-1.5 h-1.5 rounded-full ${EVENT_COLORS[type]}`} />
            <span className="text-[9px] text-gray-600">{label}</span>
          </div>
        ))}
      </div>

      {/* Summary strip */}
      <div className="px-3 py-2.5 border-t border-gray-800 bg-gray-950/50 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] flex-wrap">
          <span className="text-amber-400 font-bold">{jobsToday} Job{jobsToday !== 1 ? 's' : ''} Today</span>
          <span className="text-gray-700">·</span>
          <span className="text-blue-400 font-semibold">{pmsThisWeek} PMs This Week</span>
          <span className="text-gray-700">·</span>
          <span className="text-yellow-400 font-semibold">{followups} Follow-up{followups !== 1 ? 's' : ''}</span>
        </div>
        {todayEvents.length > 0 && (
          <button onClick={() => onDayTap(today, todayEvents)}
            className="text-[9px] text-blue-400 font-semibold flex-shrink-0">
            Today →
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Full-Screen Calendar Modal ────────────────────────────────────────────────
function FullScreenCalendar({
  events, today, onClose, onDayTap,
}: { events: CalendarEvent[]; today: number; onClose: () => void; onDayTap: (day: number, evts: CalendarEvent[]) => void }) {
  const [activeDay, setActiveDay] = useState<number | null>(today);
  const eventMap = buildEventMap(events);
  const cells = buildCells();
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  const activeDayEvents = activeDay ? (eventMap.get(activeDay) ?? []) : [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-gray-950 z-50 flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 pt-12 pb-4 border-b border-gray-800 flex items-center justify-between flex-shrink-0">
        <div>
          <div className="text-xs text-gray-500 mb-0.5">Full Calendar</div>
          <h2 className="text-xl font-bold">{MONTH_NAME}</h2>
        </div>
        <button onClick={onClose} className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center">
          <X size={18} className="text-gray-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Nav row */}
        <div className="flex items-center justify-between px-4 py-3">
          <button className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center">
            <ChevronLeft size={16} className="text-gray-400" />
          </button>
          <span className="text-sm font-bold text-white">{MONTH_NAME}</span>
          <button className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center">
            <ChevronRight size={16} className="text-gray-400" />
          </button>
        </div>

        {/* Day labels */}
        <div className="grid grid-cols-7 px-3 mb-1">
          {DAY_LABELS.map(d => (
            <div key={d} className="text-[10px] font-bold text-gray-600 text-center">{d}</div>
          ))}
        </div>

        {/* Large grid */}
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
                  <button key={ci}
                    onClick={() => { setActiveDay(day); }}
                    className={`flex flex-col items-center py-2 rounded-2xl transition-colors ${isActive ? 'bg-gray-800' : ''}`}
                  >
                    <div className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-semibold ${
                      isToday ? 'bg-blue-500 text-white font-bold'
                      : isActive ? 'text-white'
                      : isPast ? 'text-gray-600'
                      : 'text-gray-200'
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

        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-4 py-3 border-t border-gray-800 mt-2">
          {Object.entries(EVENT_LABELS).map(([type, label]) => (
            <div key={type} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${EVENT_COLORS[type as CalendarEvent['type']]}`} />
              <span className="text-[10px] text-gray-500">{label}</span>
            </div>
          ))}
        </div>

        {/* Selected day events */}
        {activeDay !== null && (
          <div className="px-4 pb-8">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
              June {activeDay}
            </div>
            {activeDayEvents.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
                <div className="text-gray-500 text-sm">No scheduled work</div>
                <button
                  onClick={() => { onClose(); onDayTap(activeDay, []); }}
                  className="mt-3 text-xs text-blue-400 font-semibold">
                  View options →
                </button>
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
                <button
                  onClick={() => { onClose(); onDayTap(activeDay, activeDayEvents); }}
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
