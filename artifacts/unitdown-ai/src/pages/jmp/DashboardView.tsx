import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight, ChevronLeft, X, Wrench, Calendar as CalIcon,
  MessageSquare, AlertTriangle, MapPin, Clock, Phone,
  Search, Cpu, FileText, Zap, CheckCircle,
} from 'lucide-react';
import { TODAY_JOBS, MOCK_HISTORY, MOCK_EQUIPMENT, type TodayJob } from './mockData';
import {
  JUNE_EVENTS, EVENT_COLORS, EQUIPMENT_ATTENTION, OFFICE_MESSAGES,
  RECENT_ACTIVITY, DASHBOARD_STATS, type CalendarEvent,
} from './dashboardData';

interface Props {
  onStartJob: () => void;
}

const PRIORITY_STYLE = {
  emergency: { border: 'border-l-red-500',   badge: 'bg-red-500 text-white',          label: 'EMERGENCY' },
  high:      { border: 'border-l-amber-500', badge: 'bg-amber-500 text-white',         label: 'HIGH PRIORITY' },
  normal:    { border: 'border-l-blue-500',  badge: 'bg-blue-600/30 text-blue-300',    label: 'SERVICE' },
  pm:        { border: 'border-l-gray-600',  badge: 'bg-gray-700 text-gray-300',       label: 'PM DUE' },
};

const SEV_STYLE = {
  high:   { ring: 'border-red-800',   bg: 'bg-red-950/30',   dot: 'bg-red-500',   label: 'text-red-400',   badge: 'HIGH' },
  medium: { ring: 'border-amber-800', bg: 'bg-amber-950/30', dot: 'bg-amber-500', label: 'text-amber-400', badge: 'WATCH' },
  low:    { ring: 'border-gray-700',  bg: 'bg-gray-900',     dot: 'bg-gray-500',  label: 'text-gray-400',  badge: 'INFO' },
};

// ─── Main Dashboard ────────────────────────────────────────────────────────────
export function DashboardView({ onStartJob }: Props) {
  const [selectedJob, setSelectedJob] = useState<TodayJob | null>(null);
  const [selectedDay, setSelectedDay] = useState<{ day: number; events: CalendarEvent[] } | null>(null);
  const [calExpanded, setCalExpanded] = useState(false);
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  return (
    <div className="min-h-screen bg-gray-950 text-white overflow-y-auto pb-24">
      {/* ── Header ─────────────────────────────────────────────── */}
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
          <div className="w-12 h-12 rounded-2xl bg-blue-700 flex items-center justify-center font-bold text-white text-lg flex-shrink-0">
            MR
          </div>
        </div>
        {/* Weather */}
        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
          <span>🌤 91°F · Partly Cloudy</span>
          <span className="text-gray-700">·</span>
          <span>💧 Humidity 62%</span>
          <span className="text-gray-700">·</span>
          <span>🌬 SW 8 mph</span>
        </div>
      </div>

      {/* ── Calendar Widget ─────────────────────────────────────── */}
      <div className="px-4 pt-4">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <button
            onClick={() => setCalExpanded(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 border-b border-gray-800"
          >
            <div className="flex items-center gap-2">
              <CalIcon size={13} className="text-blue-400" />
              <span className="text-xs font-bold uppercase tracking-widest text-gray-400">June 2026</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-gray-600 uppercase">{calExpanded ? 'collapse' : 'expand'}</span>
              <ChevronRight size={14} className={`text-gray-600 transition-transform ${calExpanded ? 'rotate-90' : ''}`} />
            </div>
          </button>
          <MiniCalendar
            expanded={calExpanded}
            events={JUNE_EVENTS}
            today={27}
            onDaySelect={day => {
              const evts = JUNE_EVENTS.filter(e => e.day === day);
              if (evts.length) setSelectedDay({ day, events: evts });
            }}
          />
        </div>
      </div>

      {/* ── Stat Cards horizontal scroll ────────────────────────── */}
      <div className="pt-4">
        <div className="px-4 mb-2.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Overview</span>
        </div>
        <div className="flex gap-2.5 overflow-x-auto px-4 pb-1 scrollbar-hide snap-x snap-mandatory">
          {DASHBOARD_STATS.map(s => (
            <div
              key={s.id}
              className={`flex-shrink-0 w-[88px] rounded-2xl border ${s.borderColor} ${s.color} p-3 snap-start`}
            >
              <div className="text-xl mb-1">{s.icon}</div>
              <div className={`text-2xl font-bold ${s.urgent ? 'text-amber-400' : 'text-white'}`}>{s.value}</div>
              <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wide leading-tight mt-0.5">{s.label}</div>
              <div className="text-[9px] text-gray-600 mt-0.5 leading-tight">{s.subtitle}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Today's Jobs ────────────────────────────────────────── */}
      <div className="px-4 pt-5">
        <SectionHeader title="Today's Jobs" count={TODAY_JOBS.length} />
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
                <motion.button
                  key={job.id}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  onClick={() => setSelectedJob(job)}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full bg-gray-900 border border-gray-800 border-l-4 ${style.border} rounded-r-2xl rounded-bl-2xl p-4 text-left`}
                >
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

      {/* ── Equipment Requiring Attention ────────────────────────── */}
      <div className="px-4 pt-5">
        <SectionHeader title="Equipment Intelligence" subtitle="Needs attention" />
        <div className="space-y-3">
          {EQUIPMENT_ATTENTION.map((eq, i) => {
            const sev = SEV_STYLE[eq.severity];
            return (
              <motion.div
                key={eq.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                className={`${sev.bg} border ${sev.ring} rounded-2xl p-4`}
              >
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
              <div className="flex-shrink-0 mt-0.5">
                <div className={`w-2 h-2 rounded-full mt-1 ${msg.unread ? 'bg-blue-500' : 'bg-transparent'}`} />
              </div>
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
          <div className="space-y-1">
            {RECENT_ACTIVITY.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                className="flex items-start gap-3 pl-1"
              >
                <div className="w-5 h-5 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] z-10">
                  {a.icon}
                </div>
                <div className="flex-1 min-w-0 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-semibold text-white leading-snug">{a.summary}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">{a.customer} · {a.equipment}</div>
                    </div>
                    <div className="text-[9px] text-gray-600 flex-shrink-0 mt-0.5 font-mono">{a.timeLabel}</div>
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
            { icon: <Phone size={18} />,     label: 'Emergency\nCall',        color: 'bg-red-900/40 border-red-800',      iconColor: 'text-red-400' },
            { icon: <Search size={18} />,    label: 'Search\nEquipment',      color: 'bg-blue-900/40 border-blue-800',    iconColor: 'text-blue-400' },
            { icon: <Zap size={18} />,       label: 'Scan\nNameplate',        color: 'bg-green-900/40 border-green-800',  iconColor: 'text-green-400' },
            { icon: <Cpu size={18} />,       label: 'AI\nAssistant',          color: 'bg-purple-900/40 border-purple-800',iconColor: 'text-purple-400' },
            { icon: <FileText size={18} />,  label: 'Service\nRecords',       color: 'bg-gray-800 border-gray-700',       iconColor: 'text-gray-300' },
            { icon: <CheckCircle size={18} />,label: 'Resume\nLast Job',      color: 'bg-amber-900/40 border-amber-800',  iconColor: 'text-amber-400' },
          ].map((a, i) => (
            <button key={i} className={`flex flex-col items-center gap-2 py-4 rounded-2xl border ${a.color}`}>
              <div className={a.iconColor}>{a.icon}</div>
              <span className="text-[10px] text-gray-300 font-medium text-center leading-tight whitespace-pre-line">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Emergency button ────────────────────────────────────── */}
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

      {/* ── Day Detail Sheet ──────────────────────────────────────── */}
      <AnimatePresence>
        {selectedDay && (
          <Sheet onClose={() => setSelectedDay(null)}>
            <div className="px-5 pt-5 pb-4 border-b border-gray-800 flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500 font-mono mb-1">June {selectedDay.day}, 2026</div>
                <h2 className="text-lg font-bold text-white">{selectedDay.events.length} event{selectedDay.events.length !== 1 ? 's' : ''}</h2>
              </div>
              <SheetClose onClose={() => setSelectedDay(null)} />
            </div>
            <div className="px-5 py-4 space-y-3">
              {selectedDay.events.map((e, i) => (
                <div key={i} className="flex items-start gap-3 bg-gray-800 rounded-2xl p-4">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5 ${EVENT_COLORS[e.type]}`} />
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-0.5">{e.type}</div>
                    <div className="text-sm text-white font-medium">{e.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </Sheet>
        )}
      </AnimatePresence>

      {/* ── Job Detail Sheet ──────────────────────────────────────── */}
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

// ─── Mini Calendar ─────────────────────────────────────────────────────────────
const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function MiniCalendar({
  expanded, events, today, onDaySelect,
}: { expanded: boolean; events: CalendarEvent[]; today: number; onDaySelect: (d: number) => void }) {
  // June 2026: starts on Sunday (firstDay = 0), 30 days
  const firstDay = 0;
  const daysInMonth = 30;
  const eventMap = new Map<number, CalendarEvent[]>();
  events.forEach(e => {
    if (!eventMap.has(e.day)) eventMap.set(e.day, []);
    eventMap.get(e.day)!.push(e);
  });

  // Build grid: leading empty + days
  const cells: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const rows = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  return (
    <div className="px-3 pb-3 pt-2">
      {/* Compact always-visible row: month dots summary */}
      {!expanded && (
        <div className="flex items-center gap-1.5 py-1">
          {events.map((e, i) => (
            <button key={i} onClick={() => onDaySelect(e.day)}
              className={`flex-shrink-0 w-5 h-1.5 rounded-full ${EVENT_COLORS[e.type]} opacity-80`}
              title={`Jun ${e.day}: ${e.type}`}
            />
          ))}
          <span className="text-[9px] text-gray-600 ml-1">{events.length} events this month</span>
        </div>
      )}

      {/* Full month calendar when expanded */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            {/* Navigation row */}
            <div className="flex items-center justify-between mb-2 pt-1">
              <button className="w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center">
                <ChevronLeft size={14} className="text-gray-400" />
              </button>
              <span className="text-xs font-bold text-white">June 2026</span>
              <button className="w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center">
                <ChevronRight size={14} className="text-gray-400" />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {DAY_LABELS.map(d => (
                <div key={d} className="text-[9px] font-bold text-gray-600 text-center py-1">{d}</div>
              ))}
            </div>

            {/* Day grid */}
            {rows.map((row, ri) => (
              <div key={ri} className="grid grid-cols-7">
                {row.map((day, ci) => {
                  if (day === null) return <div key={ci} />;
                  const dayEvents = eventMap.get(day) ?? [];
                  const isToday = day === today;
                  const isPast = day < today;
                  return (
                    <button
                      key={ci}
                      onClick={() => dayEvents.length > 0 && onDaySelect(day)}
                      className={`flex flex-col items-center py-1.5 rounded-xl ${dayEvents.length > 0 ? 'cursor-pointer' : 'cursor-default'} ${isToday ? 'bg-white/10' : ''}`}
                    >
                      <span className={`text-xs font-semibold leading-none ${isToday ? 'text-white font-bold' : isPast ? 'text-gray-600' : 'text-gray-300'}`}>
                        {isToday ? (
                          <span className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-[10px] font-bold text-white inline-flex">
                            {day}
                          </span>
                        ) : day}
                      </span>
                      <div className="flex gap-0.5 mt-1 h-1.5">
                        {dayEvents.slice(0, 3).map((e, i) => (
                          <div key={i} className={`w-1 h-1 rounded-full ${EVENT_COLORS[e.type]}`} />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}

            {/* Legend */}
            <div className="flex flex-wrap gap-2.5 mt-3 pt-3 border-t border-gray-800">
              {([['pm','PM'], ['training','Training'], ['emergency','Emergency'], ['followup','Follow-up'], ['vacation','Vacation'], ['completed','Completed']] as const).map(([type, label]) => (
                <div key={type} className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${EVENT_COLORS[type]}`} />
                  <span className="text-[9px] text-gray-500">{label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Shared UI helpers ─────────────────────────────────────────────────────────
function SectionHeader({ title, subtitle, count, countLabel = 'items' }: { title: string; subtitle?: string; count?: number; countLabel?: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">{title}</h2>
        {subtitle && <div className="text-[9px] text-gray-600">{subtitle}</div>}
      </div>
      {count !== undefined && (
        <span className="text-xs text-gray-600">{count} {countLabel}</span>
      )}
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
        onClick={e => e.stopPropagation()}
      >
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
