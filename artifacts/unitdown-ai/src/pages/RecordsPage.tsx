import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { useUser } from "@clerk/clerk-react";
import {
  Building2, Search, Plus, ChevronRight, Wrench,
  History, ThermometerSnowflake, CheckCircle2,
  AlertCircle, Clock, CircleDot, X, Star, Package,
  Phone, Calendar, Filter, Bell, Activity,
  TrendingUp, CheckCheck, ChevronLeft, ChevronDown,
  Zap, Shield, ArrowRight, BarChart3, Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import ScheduledEventModal, { type ScheduledEvent } from "@/components/ScheduledEventModal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UnitRecord {
  id: string;
  siteCustomerName: string | null;
  nickname: string | null;
  location: string | null;
  manufacturer: string | null;
  modelNumber: string | null;
  serialNumber: string | null;
  equipmentType: string | null;
  systemType: string | null;
  manufactureDate: string | null;
  isArchived: boolean;
  isFavorite: boolean;
  updatedAt: string;
  createdAt: string;
}

interface DiagnosticLog {
  id: string;
  unitId: string | null;
  symptoms: string;
  diagnosisTitle: string | null;
  diagnosisId: string | null;
  confidencePercent: number | null;
  status: string;
  technicianNotes: string | null;
  resolutionNotes: string | null;
  timestamp: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ACTIVE_STATUSES = new Set([
  "unresolved", "monitoring", "waiting-on-parts", "return-visit", "customer-callback",
]);

const RESOLUTION_CATEGORIES = [
  { key: "ignition",    label: "Ignition",        keywords: ["ignit", "flame", "pilot"] },
  { key: "contactor",   label: "Contactor",       keywords: ["contactor"] },
  { key: "refrigerant", label: "Refrigerant",     keywords: ["refrigerant", "charge", "leak", "freon"] },
  { key: "pressure",    label: "Pressure Switch", keywords: ["pressure switch", "high pressure", "low pressure"] },
  { key: "blower",      label: "Blower / Fan",    keywords: ["blower", "fan motor", "supply fan"] },
  { key: "economizer",  label: "Economizer",      keywords: ["economizer"] },
  { key: "vfd",         label: "VFD",             keywords: ["vfd", "variable freq", "drive"] },
  { key: "capacitor",   label: "Capacitor",       keywords: ["capacitor"] },
  { key: "controls",    label: "Controls",        keywords: ["control board", "thermostat", "controls"] },
];

const EVENT_TYPE_DOT_COLOR: Record<string, string> = {
  "return-visit":   "bg-orange-500",
  "pm-due":         "bg-emerald-500",
  "callback":       "bg-rose-500",
  "inspection":     "bg-blue-500",
  "parts-followup": "bg-purple-500",
  "reminder":       "bg-slate-400",
};

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getClientId(): string {
  try { return localStorage.getItem("unitdown_client_id") ?? ""; } catch { return ""; }
}

function getRecentlyViewedIds(): string[] {
  try { return JSON.parse(localStorage.getItem("unitdown_recently_viewed") ?? "[]"); } catch { return []; }
}

function statusConfig(status: string) {
  switch (status) {
    case "resolved":          return { label: "Resolved",         Icon: CheckCircle2, className: "bg-emerald-100 text-emerald-800 border-emerald-200" };
    case "monitoring":        return { label: "Monitoring",       Icon: CircleDot,    className: "bg-blue-100 text-blue-800 border-blue-200" };
    case "waiting-on-parts":  return { label: "Waiting on Parts", Icon: Package,      className: "bg-purple-100 text-purple-800 border-purple-200" };
    case "return-visit":      return { label: "Return Visit",     Icon: Calendar,     className: "bg-orange-100 text-orange-800 border-orange-200" };
    case "customer-callback": return { label: "Callback",         Icon: Phone,        className: "bg-rose-100 text-rose-800 border-rose-200" };
    default:                  return { label: "Unresolved",       Icon: AlertCircle,  className: "bg-amber-100 text-amber-800 border-amber-200" };
  }
}

function scheduledEventTypeConfig(eventType: string) {
  switch (eventType) {
    case "return-visit":   return { label: "Return Visit",    Icon: Calendar,   bg: "bg-orange-50",  color: "text-orange-600",  border: "border-orange-200" };
    case "pm-due":         return { label: "PM Due",          Icon: Wrench,     bg: "bg-emerald-50", color: "text-emerald-600", border: "border-emerald-200" };
    case "callback":       return { label: "Callback",        Icon: Phone,      bg: "bg-rose-50",    color: "text-rose-600",    border: "border-rose-200" };
    case "inspection":     return { label: "Inspection",      Icon: Search,     bg: "bg-blue-50",    color: "text-blue-600",    border: "border-blue-200" };
    case "parts-followup": return { label: "Parts Follow-Up", Icon: Package,    bg: "bg-purple-50",  color: "text-purple-600",  border: "border-purple-200" };
    default:               return { label: "Reminder",        Icon: Bell,       bg: "bg-slate-50",   color: "text-slate-600",   border: "border-slate-200" };
  }
}

function getGreeting(firstName?: string | null): string {
  const h = new Date().getHours();
  const greet = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return firstName ? `${greet}, ${firstName}` : greet;
}

function formatDate(ts: number | string) {
  const d = typeof ts === "number" ? new Date(ts) : new Date(ts);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatScheduleDate(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventDay = new Date(d);
  eventDay.setHours(0, 0, 0, 0);
  const diff = Math.round((eventDay.getTime() - today.getTime()) / 86400000);
  if (diff < -1) return `${Math.abs(diff)}d overdue`;
  if (diff === -1) return "Yesterday";
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff < 7) return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function computeHealthScore(unitId: string, logs: DiagnosticLog[]): number {
  const ul = logs.filter((l) => l.unitId === unitId);
  if (ul.length === 0) return 100;
  let score = 100;
  score -= ul.filter((l) => l.status === "unresolved").length * 25;
  score -= ul.filter((l) => l.status === "monitoring").length * 12;
  score -= ul.filter((l) => l.status === "waiting-on-parts").length * 18;
  score -= ul.filter((l) => l.status === "return-visit").length * 10;
  score -= ul.filter((l) => l.status === "customer-callback").length * 8;
  return Math.max(0, Math.min(100, score));
}

function healthColor(score: number) {
  if (score >= 80) return { text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" };
  if (score >= 60) return { text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" };
  return { text: "text-red-700", bg: "bg-red-50", border: "border-red-200" };
}

function getResolutionCategory(log: DiagnosticLog): string {
  const text = ((log.diagnosisTitle ?? "") + " " + (log.resolutionNotes ?? "")).toLowerCase();
  for (const cat of RESOLUTION_CATEGORIES) {
    if (cat.keywords.some((kw) => text.includes(kw))) return cat.key;
  }
  return "other";
}

function getWeekDays(offset = 0): Date[] {
  const today = new Date();
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dow + 6) % 7) + offset * 7);
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function getEventsForDay(day: Date, events: ScheduledEvent[]): ScheduledEvent[] {
  return events.filter((e) => isSameDay(new Date(e.scheduledDate), day));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KPICard({
  value, label, Icon, colorClass, accentClass, onClick,
}: {
  value: number | string;
  label: string;
  Icon: React.ElementType;
  colorClass: string;
  accentClass: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col justify-between p-3 rounded-2xl border transition-all active:scale-95 text-left ${colorClass}`}
    >
      <div className={`w-6 h-6 rounded-lg flex items-center justify-center mb-2 ${accentClass}`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <span className="text-xl font-extrabold leading-none block">{value}</span>
      <span className="text-[11px] font-semibold mt-1 opacity-70 leading-tight block">{label}</span>
    </button>
  );
}

function SectionHeader({
  title, count, open, onToggle, icon: Icon, accent, action,
}: {
  title: string;
  count?: number;
  open: boolean;
  onToggle: () => void;
  icon: React.ElementType;
  accent?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <button onClick={onToggle} className="flex items-center gap-2 group flex-1 py-1">
        <Icon className={`w-4 h-4 ${accent ? "text-blue-500" : "text-slate-400"}`} />
        <span className="font-bold text-slate-900 text-sm">{title}</span>
        {count !== undefined && count > 0 && (
          <span className="bg-slate-100 text-slate-600 text-xs font-bold px-1.5 py-0.5 rounded-full">{count}</span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ml-1 ${open ? "" : "-rotate-90"}`} />
      </button>
      {action}
    </div>
  );
}

function CompactUnitCard({
  unit, healthScore, onClick, onToggleFavorite,
}: {
  unit: UnitRecord;
  healthScore?: number;
  onClick: () => void;
  onToggleFavorite?: (e: React.MouseEvent) => void;
}) {
  const hs = healthScore ?? 100;
  const hc = healthColor(hs);
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm hover:border-blue-300 hover:shadow-md transition-all active:scale-[0.98]"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span className="font-bold text-slate-900 text-sm truncate block">
            {unit.nickname ?? unit.modelNumber ?? "Unnamed Unit"}
          </span>
          {unit.siteCustomerName && (
            <p className="text-xs text-slate-500 truncate mt-0.5">{unit.siteCustomerName}</p>
          )}
          <div className="flex flex-wrap gap-1 mt-1.5 items-center">
            {unit.manufacturer && (
              <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full font-medium">{unit.manufacturer}</span>
            )}
            {hs < 100 && (
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full border ${hc.bg} ${hc.text} ${hc.border}`}>{hs}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {onToggleFavorite && (
            <button
              onClick={onToggleFavorite}
              className={`p-1.5 rounded-xl transition-colors ${unit.isFavorite ? "text-yellow-500" : "text-slate-300 hover:text-yellow-400"}`}
            >
              <Star className={`w-3.5 h-3.5 ${unit.isFavorite ? "fill-yellow-400" : ""}`} />
            </button>
          )}
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>
      </div>
    </button>
  );
}

function UnitCard({
  unit, healthScore, onClick, onToggleFavorite,
}: {
  unit: UnitRecord;
  healthScore?: number;
  onClick: () => void;
  onToggleFavorite?: (e: React.MouseEvent) => void;
}) {
  const hs = healthScore ?? 100;
  const hc = healthColor(hs);
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-blue-300 hover:shadow-md transition-all active:scale-[0.98]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <Wrench className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <span className="font-bold text-slate-900 text-sm truncate">
              {unit.nickname ?? unit.modelNumber ?? "Unnamed Unit"}
            </span>
          </div>
          {unit.siteCustomerName && <p className="text-xs text-slate-500 font-medium ml-9">{unit.siteCustomerName}</p>}
          {unit.location && <p className="text-xs text-slate-400 ml-9 mt-0.5">{unit.location}</p>}
          <div className="flex flex-wrap gap-1.5 mt-2 ml-9 items-center">
            {unit.manufacturer && (
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">{unit.manufacturer}</span>
            )}
            {unit.equipmentType && (
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">{unit.equipmentType}</span>
            )}
            <span className="text-xs text-slate-400">{formatDate(unit.updatedAt)}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0 mt-0.5">
          <div className="flex items-center gap-0.5">
            {onToggleFavorite && (
              <button
                onClick={onToggleFavorite}
                className={`p-1.5 rounded-xl transition-colors ${unit.isFavorite ? "text-yellow-500" : "text-slate-300 hover:text-yellow-400"}`}
              >
                <Star className={`w-3.5 h-3.5 ${unit.isFavorite ? "fill-yellow-400" : ""}`} />
              </button>
            )}
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>
          {hs < 100 && (
            <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full border ${hc.bg} ${hc.text} ${hc.border}`}>{hs}</span>
          )}
        </div>
      </div>
    </button>
  );
}

function LogCard({ log, unitMap, onClick }: { log: DiagnosticLog; unitMap: Record<string, UnitRecord>; onClick: () => void }) {
  const cfg = statusConfig(log.status);
  const unit = log.unitId ? unitMap[log.unitId] : null;
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-blue-300 hover:shadow-md transition-all active:scale-[0.98]"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-sm font-bold text-slate-900 line-clamp-1 flex-1">{log.diagnosisTitle ?? "Diagnosis"}</span>
        <Badge className={`text-xs border flex-shrink-0 flex items-center gap-1 ${cfg.className}`}>
          <cfg.Icon className="w-3 h-3" />
          {cfg.label}
        </Badge>
      </div>
      <p className="text-xs text-slate-500 line-clamp-2 mb-2">{log.symptoms}</p>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          {unit && (
            <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full truncate max-w-[140px]">
              {unit.nickname ?? unit.modelNumber ?? "Unit"}
            </span>
          )}
          {log.confidencePercent != null && (
            <span className="text-xs text-slate-400">{log.confidencePercent}% match</span>
          )}
        </div>
        <span className="text-xs text-slate-400 flex items-center gap-1 flex-shrink-0">
          <Clock className="w-3 h-3" />
          {formatDate(log.timestamp)}
        </span>
      </div>
    </button>
  );
}

function AgendaEventRow({
  event, unitMap, onMarkDone, onDelete,
}: {
  event: ScheduledEvent;
  unitMap: Record<string, UnitRecord>;
  onMarkDone: () => void;
  onDelete: () => void;
}) {
  const cfg = scheduledEventTypeConfig(event.eventType);
  const unit = event.unitId ? unitMap[event.unitId] : null;
  const isOverdue = event.scheduledDate < Date.now();
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
        <cfg.Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900 line-clamp-1">{event.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {unit && <span className="text-xs text-blue-600 font-medium truncate">{unit.nickname ?? unit.modelNumber ?? "Unit"}</span>}
          {isOverdue && <span className="text-xs text-red-500 font-semibold">Overdue</span>}
          {event.recurrence && <span className="text-xs text-slate-400">↻ {event.recurrence}</span>}
        </div>
      </div>
      <button
        onClick={onMarkDone}
        className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl px-2 py-1 font-semibold hover:bg-emerald-100 transition-colors whitespace-nowrap flex-shrink-0"
      >
        ✓
      </button>
    </div>
  );
}

function WeekCalendar({
  scheduledEvents, weekOffset, onWeekChange, selectedDay, onSelectDay,
}: {
  scheduledEvents: ScheduledEvent[];
  weekOffset: number;
  onWeekChange: (dir: -1 | 1) => void;
  selectedDay: Date | null;
  onSelectDay: (day: Date | null) => void;
}) {
  const days = useMemo(() => getWeekDays(weekOffset), [weekOffset]);
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);

  const monthLabel = useMemo(() => {
    const first = days[0];
    const last = days[6];
    if (first.getMonth() === last.getMonth()) {
      return first.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    }
    return `${first.toLocaleDateString(undefined, { month: "short" })} – ${last.toLocaleDateString(undefined, { month: "short", year: "numeric" })}`;
  }, [days]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
      {/* Calendar header */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => onWeekChange(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-bold text-slate-600">{monthLabel}</span>
        <button onClick={() => onWeekChange(1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day columns */}
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((day, i) => {
          const dayEvents = getEventsForDay(day, scheduledEvents);
          const isToday = isSameDay(day, today);
          const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
          const isPast = day < today && !isToday;

          return (
            <button
              key={i}
              onClick={() => onSelectDay(isSelected ? null : day)}
              className={`flex flex-col items-center py-1.5 px-0.5 rounded-xl transition-all ${
                isSelected
                  ? "bg-blue-600 text-white"
                  : isToday
                  ? "bg-blue-50"
                  : "hover:bg-slate-50"
              }`}
            >
              {/* Day label */}
              <span className={`text-[10px] font-bold uppercase tracking-wide mb-1 ${
                isSelected ? "text-blue-100" : isPast ? "text-slate-300" : "text-slate-400"
              }`}>
                {DAY_LABELS[i]}
              </span>

              {/* Date number */}
              <span className={`text-sm font-extrabold leading-none w-7 h-7 flex items-center justify-center rounded-full ${
                isSelected
                  ? "text-white"
                  : isToday
                  ? "text-blue-700"
                  : isPast
                  ? "text-slate-300"
                  : "text-slate-800"
              }`}>
                {day.getDate()}
              </span>

              {/* Event dots */}
              <div className="flex gap-0.5 mt-1.5 min-h-[6px]">
                {dayEvents.length === 0 ? null :
                  dayEvents.slice(0, 3).map((ev, di) => (
                    <span
                      key={di}
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSelected ? "bg-white opacity-80" : (EVENT_TYPE_DOT_COLOR[ev.eventType] ?? "bg-slate-400")
                      }`}
                    />
                  ))
                }
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function RecordsPage() {
  const [, navigate] = useLocation();
  const { user: clerkUser, isLoaded } = useUser();

  // Data
  const [units, setUnits] = useState<UnitRecord[]>([]);
  const [logs, setLogs] = useState<DiagnosticLog[]>([]);
  const [scheduledEvents, setScheduledEvents] = useState<ScheduledEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calendar state
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // Section collapse
  const [unitsOpen, setUnitsOpen] = useState(true);
  const [diagOpen, setDiagOpen] = useState(true);
  const [libOpen, setLibOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [healthOpen, setHealthOpen] = useState(true);
  const [activeWorkOpen, setActiveWorkOpen] = useState(true);
  const [priorityOpen, setPriorityOpen] = useState(true);

  // Expand-all states
  const [showAllActive, setShowAllActive] = useState(false);
  const [showAllDiags, setShowAllDiags] = useState(false);
  const [showAllUnits, setShowAllUnits] = useState(false);

  // Modals
  const [showAddEvent, setShowAddEvent] = useState(false);

  // Filters
  const [q, setQ] = useState("");
  const [mfgFilter, setMfgFilter] = useState("");

  const clientId = getClientId();
  const isLoggedIn = isLoaded && !!clerkUser && clientId.startsWith("user_");

  // ─── Data loading ─────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!isLoggedIn) return;
    setLoading(true);
    try {
      const cid = encodeURIComponent(clientId);
      const [uRes, lRes, seRes] = await Promise.all([
        fetch(`/api/units?clientId=${cid}`),
        fetch(`/api/diagnostic-logs?clientId=${cid}`),
        fetch(`/api/scheduled-events?clientId=${cid}&upcoming=true`),
      ]);
      const [uData, lData, seData] = await Promise.all([uRes.json(), lRes.json(), seRes.json()]);
      setUnits(uData.units ?? []);
      setLogs(lData.logs ?? []);
      setScheduledEvents(seData.events ?? []);
    } catch {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn, clientId]);

  useEffect(() => {
    if (isLoggedIn) loadData();
  }, [isLoggedIn, loadData]);

  // ─── Favorite toggle ──────────────────────────────────────────────────────

  const toggleFavorite = useCallback(async (unit: UnitRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    const newVal = !unit.isFavorite;
    setUnits((prev) => prev.map((u) => (u.id === unit.id ? { ...u, isFavorite: newVal } : u)));
    try {
      await fetch(`/api/units/${unit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, unit: { isFavorite: newVal } }),
      });
    } catch {
      setUnits((prev) => prev.map((u) => (u.id === unit.id ? unit : u)));
    }
  }, [clientId]);

  // ─── Scheduled event actions ──────────────────────────────────────────────

  const markEventDone = useCallback(async (eventId: string) => {
    setScheduledEvents((prev) => prev.filter((e) => e.id !== eventId));
    try {
      await fetch(`/api/scheduled-events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, isCompleted: true }),
      });
    } catch { loadData(); }
  }, [clientId, loadData]);

  const deleteEvent = useCallback(async (eventId: string) => {
    setScheduledEvents((prev) => prev.filter((e) => e.id !== eventId));
    try {
      await fetch(`/api/scheduled-events/${eventId}?clientId=${encodeURIComponent(clientId)}`, { method: "DELETE" });
    } catch { loadData(); }
  }, [clientId, loadData]);

  // ─── Derived data ─────────────────────────────────────────────────────────

  const unitMap = useMemo(() => {
    const map: Record<string, UnitRecord> = {};
    units.forEach((u) => { map[u.id] = u; });
    return map;
  }, [units]);

  const favorites = useMemo(() => units.filter((u) => u.isFavorite), [units]);

  const recentlyViewed = useMemo(() => {
    const ids = getRecentlyViewedIds();
    return ids.slice(0, 5).map((id) => unitMap[id]).filter(Boolean) as UnitRecord[];
  }, [unitMap]);

  const activeWork = useMemo(() => logs.filter((l) => ACTIVE_STATUSES.has(l.status)), [logs]);
  const partsWaiting = useMemo(() => logs.filter((l) => l.status === "waiting-on-parts"), [logs]);
  const unresolvedCount = useMemo(() => logs.filter((l) => l.status === "unresolved").length, [logs]);
  const monitoringCount = useMemo(() => logs.filter((l) => l.status === "monitoring").length, [logs]);
  const returnVisitCount = useMemo(() => logs.filter((l) => l.status === "return-visit" || l.status === "customer-callback").length, [logs]);

  const resolvedThisWeek = useMemo(() => {
    const cutoff = Date.now() - 7 * 86400000;
    return logs.filter((l) => l.status === "resolved" && l.timestamp > cutoff).length;
  }, [logs]);

  const resolvedLogs = useMemo(() => logs.filter((l) => l.status === "resolved"), [logs]);

  const manufacturers = useMemo(() => {
    const set = new Set<string>();
    units.forEach((u) => { if (u.manufacturer) set.add(u.manufacturer); });
    return Array.from(set).sort();
  }, [units]);

  const filteredUnits = useMemo(() => {
    return units
      .filter((u) => {
        if (mfgFilter && u.manufacturer !== mfgFilter) return false;
        if (!q) return true;
        const lower = q.toLowerCase();
        return [u.nickname, u.siteCustomerName, u.location, u.manufacturer, u.modelNumber, u.serialNumber]
          .some((f) => f?.toLowerCase().includes(lower));
      })
      .sort((a, b) => {
        const aName = a.siteCustomerName?.trim() ?? "";
        const bName = b.siteCustomerName?.trim() ?? "";
        if (aName && !bName) return -1;
        if (!aName && bName) return 1;
        const nc = aName.localeCompare(bName, undefined, { sensitivity: "base" });
        if (nc !== 0) return nc;
        return (a.nickname ?? "").localeCompare(b.nickname ?? "", undefined, { sensitivity: "base" });
      });
  }, [units, q, mfgFilter]);

  const resolutionGroups = useMemo(() => {
    const groups: Record<string, DiagnosticLog[]> = {};
    for (const log of resolvedLogs) {
      const cat = getResolutionCategory(log);
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(log);
    }
    return groups;
  }, [resolvedLogs]);

  const avgConfidence = useMemo(() => {
    const withConf = logs.filter((l) => l.confidencePercent != null);
    if (!withConf.length) return null;
    return Math.round(withConf.reduce((s, l) => s + (l.confidencePercent ?? 0), 0) / withConf.length);
  }, [logs]);

  const topDiagnosis = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const l of logs) {
      if (l.diagnosisTitle) counts[l.diagnosisTitle] = (counts[l.diagnosisTitle] ?? 0) + 1;
    }
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return entries[0] ?? null;
  }, [logs]);

  const healthScoreMap = useMemo(() => {
    const map: Record<string, number> = {};
    units.forEach((u) => { map[u.id] = computeHealthScore(u.id, logs); });
    return map;
  }, [units, logs]);

  const healthSnapshot = useMemo(() => {
    const critical: UnitRecord[] = [];
    const watchlist: UnitRecord[] = [];
    const healthy: UnitRecord[] = [];
    const noActivity: UnitRecord[] = [];
    units.forEach((u) => {
      const score = healthScoreMap[u.id] ?? 100;
      const hasLogs = logs.some((l) => l.unitId === u.id);
      if (score < 60) critical.push(u);
      else if (score < 80) watchlist.push(u);
      else if (hasLogs) healthy.push(u);
      else noActivity.push(u);
    });
    return { critical, watchlist, healthy, noActivity };
  }, [units, healthScoreMap, logs]);

  const pmDueCount = useMemo(() => scheduledEvents.filter((e) => e.eventType === "pm-due").length, [scheduledEvents]);

  // Daily briefing summary
  const briefingSummary = useMemo(() => {
    const parts: string[] = [];
    if (unresolvedCount > 0) parts.push(`${unresolvedCount} unresolved`);
    if (partsWaiting.length > 0) parts.push(`${partsWaiting.length} waiting on parts`);
    if (returnVisitCount > 0) parts.push(`${returnVisitCount} return visit${returnVisitCount !== 1 ? "s" : ""}`);
    if (pmDueCount > 0) parts.push(`${pmDueCount} PM due`);
    const overdueCount = scheduledEvents.filter((e) => e.scheduledDate < Date.now()).length;
    if (overdueCount > 0) parts.push(`${overdueCount} overdue`);
    if (parts.length === 0 && activeWork.length === 0) return "All clear — nothing urgent today. 🟢";
    if (parts.length === 0) return `${activeWork.length} active job${activeWork.length !== 1 ? "s" : ""} in progress.`;
    return parts.join(" · ");
  }, [activeWork, unresolvedCount, partsWaiting, returnVisitCount, pmDueCount, scheduledEvents]);

  // Priority center items
  const priorityItems = useMemo(() => {
    type PItem = { type: "log"; item: DiagnosticLog } | { type: "event"; item: ScheduledEvent };
    const items: PItem[] = [];
    logs.filter((l) => l.status === "unresolved").slice(0, 3).forEach((l) => items.push({ type: "log", item: l }));
    scheduledEvents.filter((e) => e.scheduledDate < Date.now()).slice(0, 2).forEach((e) => items.push({ type: "event", item: e }));
    logs.filter((l) => l.status === "return-visit").slice(0, 2).forEach((l) => items.push({ type: "log", item: l }));
    logs.filter((l) => l.status === "customer-callback").slice(0, 1).forEach((l) => items.push({ type: "log", item: l }));
    return items.slice(0, 5);
  }, [logs, scheduledEvents]);

  // Active work grouped by status
  const activeByStatus = useMemo(() => {
    const order = ["unresolved", "waiting-on-parts", "monitoring", "return-visit", "customer-callback"];
    const groups: Record<string, DiagnosticLog[]> = {};
    for (const s of order) groups[s] = [];
    activeWork.forEach((l) => { if (groups[l.status]) groups[l.status].push(l); });
    return order.map((s) => ({ status: s, logs: groups[s] })).filter((g) => g.logs.length > 0);
  }, [activeWork]);

  // Agenda for selected day or next 3 days
  const agendaDays = useMemo(() => {
    if (selectedDay) {
      const evs = getEventsForDay(selectedDay, scheduledEvents);
      return [{ date: selectedDay, events: evs }];
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Array.from({ length: 3 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      return { date: d, events: getEventsForDay(d, scheduledEvents) };
    }).filter((day) => day.events.length > 0 || day.date.getTime() === today.getTime());
  }, [selectedDay, scheduledEvents]);

  const agendaHasEvents = useMemo(() => agendaDays.some((d) => d.events.length > 0), [agendaDays]);

  // ─── Auth guards ───────────────────────────────────────────────────────────

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
          <Building2 className="w-7 h-7 text-blue-600" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-900 mb-2">Sign in to access Field Hub</h2>
        <p className="text-slate-500 text-sm mb-6 max-w-xs">Unit records and diagnostic history are saved to your account.</p>
        <Button onClick={() => navigate("/login")} className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-6">
          Sign In
        </Button>
        <button onClick={() => navigate("/")} className="mt-4 text-sm text-slate-400 hover:text-slate-600">
          Back to Diagnostics
        </button>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── 1. Sticky Header ─────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/")} className="text-slate-400 hover:text-slate-700 transition-colors p-1">
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
                <ThermometerSnowflake className="w-4 h-4 text-white" />
              </div>
              <span className="font-extrabold text-slate-900 text-sm">Field Hub</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddEvent(true)}
              className="w-8 h-8 flex items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-300 transition-colors"
              title="Add Reminder"
            >
              <Bell className="w-4 h-4" />
            </button>
            <Button
              onClick={() => navigate("/records/new")}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl h-9 px-3 text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              New Unit
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 animate-pulse h-16" />
            ))}
          </div>
        ) : (
          <>
            {/* ── 2. Daily Briefing ─────────────────────────────────────────────── */}
            <section>
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-4 text-white shadow-lg shadow-blue-200">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-blue-100 text-xs font-semibold uppercase tracking-wider mb-1">
                      {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
                    </p>
                    <p className="text-xl font-extrabold leading-tight text-white">
                      {getGreeting(clerkUser?.firstName)}
                    </p>
                    <p className="text-sm text-blue-100 mt-1.5 font-medium leading-snug">
                      {briefingSummary}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                </div>
                {/* Quick action strip */}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => navigate("/")}
                    className="flex-1 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-xl py-2 transition-colors"
                  >
                    + Diagnose
                  </button>
                  <button
                    onClick={() => navigate("/records/new")}
                    className="flex-1 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-xl py-2 transition-colors"
                  >
                    + New Unit
                  </button>
                  <button
                    onClick={() => setShowAddEvent(true)}
                    className="flex-1 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-xl py-2 transition-colors"
                  >
                    + Reminder
                  </button>
                </div>
              </div>
            </section>

            {/* ── 3. KPI Cards ──────────────────────────────────────────────────── */}
            <section aria-label="Key metrics">
              <div className="grid grid-cols-4 gap-2">
                <KPICard
                  value={activeWork.length}
                  label="Active Jobs"
                  Icon={Zap}
                  colorClass={activeWork.length > 0 ? "bg-amber-50 text-amber-900 border-amber-200" : "bg-slate-50 text-slate-500 border-slate-200"}
                  accentClass={activeWork.length > 0 ? "bg-amber-100" : "bg-slate-100"}
                />
                <KPICard
                  value={partsWaiting.length}
                  label="On Parts"
                  Icon={Package}
                  colorClass={partsWaiting.length > 0 ? "bg-purple-50 text-purple-900 border-purple-200" : "bg-slate-50 text-slate-500 border-slate-200"}
                  accentClass={partsWaiting.length > 0 ? "bg-purple-100" : "bg-slate-100"}
                />
                <KPICard
                  value={returnVisitCount}
                  label="Return Visits"
                  Icon={Calendar}
                  colorClass={returnVisitCount > 0 ? "bg-orange-50 text-orange-900 border-orange-200" : "bg-slate-50 text-slate-500 border-slate-200"}
                  accentClass={returnVisitCount > 0 ? "bg-orange-100" : "bg-slate-100"}
                />
                <KPICard
                  value={pmDueCount}
                  label="PM Due"
                  Icon={Wrench}
                  colorClass={pmDueCount > 0 ? "bg-emerald-50 text-emerald-900 border-emerald-200" : "bg-slate-50 text-slate-500 border-slate-200"}
                  accentClass={pmDueCount > 0 ? "bg-emerald-100" : "bg-slate-100"}
                />
                <KPICard
                  value={unresolvedCount}
                  label="Unresolved"
                  Icon={AlertCircle}
                  colorClass={unresolvedCount > 0 ? "bg-red-50 text-red-900 border-red-200" : "bg-slate-50 text-slate-500 border-slate-200"}
                  accentClass={unresolvedCount > 0 ? "bg-red-100" : "bg-slate-100"}
                />
                <KPICard
                  value={monitoringCount}
                  label="Monitoring"
                  Icon={CircleDot}
                  colorClass={monitoringCount > 0 ? "bg-blue-50 text-blue-900 border-blue-200" : "bg-slate-50 text-slate-500 border-slate-200"}
                  accentClass={monitoringCount > 0 ? "bg-blue-100" : "bg-slate-100"}
                />
                <KPICard
                  value={resolvedThisWeek}
                  label="Done / Week"
                  Icon={CheckCircle2}
                  colorClass={resolvedThisWeek > 0 ? "bg-emerald-50 text-emerald-900 border-emerald-200" : "bg-slate-50 text-slate-500 border-slate-200"}
                  accentClass={resolvedThisWeek > 0 ? "bg-emerald-100" : "bg-slate-100"}
                />
                <KPICard
                  value={units.length}
                  label="Saved Units"
                  Icon={Building2}
                  colorClass="bg-slate-50 text-slate-700 border-slate-200"
                  accentClass="bg-slate-100"
                />
              </div>
            </section>

            {/* ── 4. Compact Calendar + Agenda ──────────────────────────────────── */}
            <section aria-label="Calendar">
              <WeekCalendar
                scheduledEvents={scheduledEvents}
                weekOffset={weekOffset}
                onWeekChange={(dir) => setWeekOffset((v) => v + dir)}
                selectedDay={selectedDay}
                onSelectDay={setSelectedDay}
              />

              {/* Agenda */}
              <div className="mt-2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-xs font-bold text-slate-700">
                      {selectedDay
                        ? selectedDay.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })
                        : "Next 3 Days"}
                    </span>
                    {selectedDay && (
                      <button onClick={() => setSelectedDay(null)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => setShowAddEvent(true)}
                    className="text-xs text-blue-600 font-semibold hover:text-blue-800 transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Add
                  </button>
                </div>

                <div className="px-4 py-1">
                  {!agendaHasEvents ? (
                    <div className="py-4 text-center">
                      <p className="text-xs font-semibold text-slate-400">No scheduled work</p>
                      <button
                        onClick={() => setShowAddEvent(true)}
                        className="mt-2 text-xs text-blue-600 font-semibold hover:underline"
                      >
                        + Add Reminder
                      </button>
                    </div>
                  ) : (
                    agendaDays.map(({ date, events }) => {
                      if (events.length === 0) return null;
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const diff = Math.round((date.getTime() - today.getTime()) / 86400000);
                      const dayLabel = diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : date.toLocaleDateString(undefined, { weekday: "long" });
                      return (
                        <div key={date.toISOString()} className="py-2">
                          <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">{dayLabel}</p>
                          {events.map((ev) => (
                            <AgendaEventRow
                              key={ev.id}
                              event={ev}
                              unitMap={unitMap}
                              onMarkDone={() => markEventDone(ev.id)}
                              onDelete={() => deleteEvent(ev.id)}
                            />
                          ))}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </section>

            {/* ── 5. Priority Center ────────────────────────────────────────────── */}
            <section aria-label="Priority Center">
              <SectionHeader
                title="Priority Center"
                count={priorityItems.length}
                open={priorityOpen}
                onToggle={() => setPriorityOpen((v) => !v)}
                icon={AlertCircle}
                accent
              />
              {priorityOpen && (
                <div className="mt-3">
                  {priorityItems.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 text-center">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-500">Nothing urgent right now</p>
                      <p className="text-xs text-slate-400 mt-1">You're all caught up.</p>
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                      {priorityItems.map((item, idx) => {
                        if (item.type === "log") {
                          const log = item.item as DiagnosticLog;
                          const cfg = statusConfig(log.status);
                          const unit = log.unitId ? unitMap[log.unitId] : null;
                          return (
                            <button
                              key={log.id}
                              onClick={() => navigate(`/records/log/${log.id}`)}
                              className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors ${idx < priorityItems.length - 1 ? "border-b border-slate-100" : ""}`}
                            >
                              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                log.status === "unresolved" ? "bg-red-500" :
                                log.status === "return-visit" ? "bg-orange-500" :
                                log.status === "customer-callback" ? "bg-rose-500" : "bg-amber-500"
                              }`} />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-slate-900 line-clamp-1">{log.diagnosisTitle ?? "Unresolved Issue"}</p>
                                {unit && <p className="text-xs text-slate-500 mt-0.5 truncate">{unit.nickname ?? unit.modelNumber ?? "Unit"}</p>}
                              </div>
                              <Badge className={`text-xs border flex-shrink-0 ${cfg.className}`}>{cfg.label}</Badge>
                            </button>
                          );
                        } else {
                          const ev = item.item as ScheduledEvent;
                          const cfg = scheduledEventTypeConfig(ev.eventType);
                          const unit = ev.unitId ? unitMap[ev.unitId] : null;
                          return (
                            <div
                              key={ev.id}
                              className={`flex items-center gap-3 px-4 py-3 ${idx < priorityItems.length - 1 ? "border-b border-slate-100" : ""}`}
                            >
                              <div className="w-2 h-2 rounded-full flex-shrink-0 bg-red-500" />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-slate-900 line-clamp-1">{ev.title}</p>
                                {unit && <p className="text-xs text-slate-500 mt-0.5 truncate">{unit.nickname ?? unit.modelNumber ?? "Unit"}</p>}
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                                <span className="text-xs text-red-500 font-bold">{formatScheduleDate(ev.scheduledDate)}</span>
                              </div>
                            </div>
                          );
                        }
                      })}
                      {activeWork.length > 5 && (
                        <button
                          onClick={() => { setPriorityOpen(false); setActiveWorkOpen(true); }}
                          className="w-full flex items-center justify-center gap-1 text-xs text-blue-600 font-bold py-3 border-t border-slate-100 hover:bg-blue-50 transition-colors"
                        >
                          View All {activeWork.length} active jobs
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* ── 6. Active Work ────────────────────────────────────────────────── */}
            <section aria-label="Active Work">
              <SectionHeader
                title="Active Work"
                count={activeWork.length}
                open={activeWorkOpen}
                onToggle={() => setActiveWorkOpen((v) => !v)}
                icon={Activity}
                accent={activeWork.length > 0}
              />
              {activeWorkOpen && (
                <div className="mt-3">
                  {activeWork.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 text-center">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-500">All clear</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {activeByStatus.map(({ status, logs: statusLogs }) => {
                        const cfg = statusConfig(status);
                        const displayLogs = showAllActive ? statusLogs : statusLogs.slice(0, 3);
                        return (
                          <div key={status}>
                            <div className="flex items-center gap-2 mb-2">
                              <cfg.Icon className="w-3.5 h-3.5" style={{ color: "inherit" }} />
                              <span className={`text-xs font-extrabold uppercase tracking-wide ${
                                status === "unresolved" ? "text-red-600" :
                                status === "waiting-on-parts" ? "text-purple-600" :
                                status === "monitoring" ? "text-blue-600" :
                                status === "return-visit" ? "text-orange-600" : "text-rose-600"
                              }`}>
                                {cfg.label}
                              </span>
                              <span className="text-xs text-slate-400 font-semibold">{statusLogs.length}</span>
                            </div>
                            <div className="space-y-2">
                              {displayLogs.map((l) => (
                                <LogCard
                                  key={l.id}
                                  log={l}
                                  unitMap={unitMap}
                                  onClick={() => navigate(`/records/log/${l.id}`)}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                      {activeWork.length > 9 && !showAllActive && (
                        <button
                          onClick={() => setShowAllActive(true)}
                          className="w-full flex items-center justify-center gap-1 text-xs text-blue-600 font-bold py-2.5 border border-dashed border-blue-200 rounded-2xl hover:bg-blue-50 transition-colors"
                        >
                          View all {activeWork.length} active jobs
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* ── 7. Weekly Progress ────────────────────────────────────────────── */}
            <section aria-label="Weekly Progress">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-500" />
                    <span className="font-bold text-slate-900 text-sm">Weekly Progress</span>
                  </div>
                  <span className="text-xs text-slate-400 font-semibold">This week</span>
                </div>

                {/* Progress bar */}
                {(resolvedThisWeek + activeWork.length) > 0 ? (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, Math.round((resolvedThisWeek / Math.max(1, resolvedThisWeek + activeWork.length)) * 100))}%`
                          }}
                        />
                      </div>
                      <span className="text-xs font-extrabold text-slate-600 flex-shrink-0">
                        {resolvedThisWeek}/{resolvedThisWeek + activeWork.length}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mb-3">
                      {resolvedThisWeek} resolved this week
                    </p>
                  </>
                ) : (
                  <div className="bg-slate-50 rounded-xl p-3 text-center mb-3">
                    <p className="text-xs text-slate-400">No activity yet this week</p>
                  </div>
                )}

                {/* Stats row */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "Completed", value: resolvedThisWeek, color: "text-emerald-700" },
                    { label: "Open", value: activeWork.length, color: "text-amber-700" },
                    { label: "On Parts", value: partsWaiting.length, color: "text-purple-700" },
                    { label: "Follow-ups", value: returnVisitCount, color: "text-orange-700" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="text-center">
                      <p className={`text-lg font-extrabold leading-none ${color}`}>{value}</p>
                      <p className="text-[10px] text-slate-400 font-semibold mt-1">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* ── 8. Equipment Health Snapshot ──────────────────────────────────── */}
            {units.length > 0 && (
              <section aria-label="Equipment Health">
                <SectionHeader
                  title="Equipment Health"
                  open={healthOpen}
                  onToggle={() => setHealthOpen((v) => !v)}
                  icon={Shield}
                />
                {healthOpen && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {}}
                      className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all ${
                        healthSnapshot.critical.length > 0
                          ? "bg-red-50 border-red-200"
                          : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${healthSnapshot.critical.length > 0 ? "bg-red-100" : "bg-slate-100"}`}>
                        <AlertCircle className={`w-4 h-4 ${healthSnapshot.critical.length > 0 ? "text-red-600" : "text-slate-400"}`} />
                      </div>
                      <div>
                        <p className={`text-xl font-extrabold leading-none ${healthSnapshot.critical.length > 0 ? "text-red-700" : "text-slate-400"}`}>
                          {healthSnapshot.critical.length}
                        </p>
                        <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Critical</p>
                      </div>
                    </button>

                    <button
                      onClick={() => {}}
                      className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left ${
                        healthSnapshot.watchlist.length > 0
                          ? "bg-amber-50 border-amber-200"
                          : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${healthSnapshot.watchlist.length > 0 ? "bg-amber-100" : "bg-slate-100"}`}>
                        <CircleDot className={`w-4 h-4 ${healthSnapshot.watchlist.length > 0 ? "text-amber-600" : "text-slate-400"}`} />
                      </div>
                      <div>
                        <p className={`text-xl font-extrabold leading-none ${healthSnapshot.watchlist.length > 0 ? "text-amber-700" : "text-slate-400"}`}>
                          {healthSnapshot.watchlist.length}
                        </p>
                        <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Watchlist</p>
                      </div>
                    </button>

                    <button
                      onClick={() => {}}
                      className="flex items-center gap-3 p-3.5 rounded-2xl border bg-emerald-50 border-emerald-200 text-left"
                    >
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-xl font-extrabold leading-none text-emerald-700">{healthSnapshot.healthy.length}</p>
                        <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Healthy</p>
                      </div>
                    </button>

                    <button
                      onClick={() => {}}
                      className="flex items-center gap-3 p-3.5 rounded-2xl border bg-slate-50 border-slate-200 text-left"
                    >
                      <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <Clock className="w-4 h-4 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-xl font-extrabold leading-none text-slate-500">{healthSnapshot.noActivity.length}</p>
                        <p className="text-[11px] font-semibold text-slate-500 mt-0.5">No Activity</p>
                      </div>
                    </button>
                  </div>
                )}
              </section>
            )}

            {/* ── 9. Favorites ──────────────────────────────────────────────────── */}
            {favorites.length > 0 && (
              <section aria-label="Favorites">
                <div className="flex items-center gap-2 mb-3">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-400" />
                  <h2 className="font-bold text-slate-900 text-sm">Favorites</h2>
                  <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-1.5 py-0.5 rounded-full">{favorites.length}</span>
                </div>
                <div className="space-y-2">
                  {favorites.map((u) => (
                    <CompactUnitCard
                      key={u.id}
                      unit={u}
                      healthScore={healthScoreMap[u.id]}
                      onClick={() => navigate(`/records/unit/${u.id}`)}
                      onToggleFavorite={(e) => toggleFavorite(u, e)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* ── 10. Recently Viewed ───────────────────────────────────────────── */}
            {recentlyViewed.length > 0 && (
              <section aria-label="Recently Viewed">
                <div className="flex items-center gap-2 mb-3">
                  <History className="w-4 h-4 text-slate-400" />
                  <h2 className="font-bold text-slate-900 text-sm">Recently Viewed</h2>
                </div>
                <div className="space-y-2">
                  {recentlyViewed.map((u) => (
                    <CompactUnitCard
                      key={u.id}
                      unit={u}
                      healthScore={healthScoreMap[u.id]}
                      onClick={() => navigate(`/records/unit/${u.id}`)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* ── 11. Saved Units ───────────────────────────────────────────────── */}
            <section aria-label="Saved Units">
              <SectionHeader
                title="Saved Units"
                count={units.length}
                open={unitsOpen}
                onToggle={() => setUnitsOpen((v) => !v)}
                icon={Building2}
              />
              {unitsOpen && (
                <div className="mt-3 space-y-3">
                  {/* Search + filter */}
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <Input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Search units, customers, models…"
                        className="pl-8 rounded-xl border-slate-200 text-sm h-9"
                      />
                      {q && (
                        <button onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    {manufacturers.length > 1 && (
                      <div className="relative">
                        <select
                          value={mfgFilter}
                          onChange={(e) => setMfgFilter(e.target.value)}
                          className="h-9 appearance-none text-xs text-slate-700 bg-white border border-slate-200 rounded-xl pl-3 pr-7 cursor-pointer font-semibold"
                        >
                          <option value="">All</option>
                          {manufacturers.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <Filter className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                      </div>
                    )}
                  </div>

                  {units.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center">
                      <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-500">No units saved yet</p>
                      <p className="text-xs text-slate-400 mt-1 mb-4">Save units to track service history.</p>
                      <Button onClick={() => navigate("/records/new")} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl">
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        Add First Unit
                      </Button>
                    </div>
                  ) : filteredUnits.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">No matches for "{q}"</p>
                  ) : (
                    <>
                      <div className="space-y-2.5">
                        {(showAllUnits ? filteredUnits : filteredUnits.slice(0, 5)).map((u) => (
                          <UnitCard
                            key={u.id}
                            unit={u}
                            healthScore={healthScoreMap[u.id]}
                            onClick={() => navigate(`/records/unit/${u.id}`)}
                            onToggleFavorite={(e) => toggleFavorite(u, e)}
                          />
                        ))}
                      </div>
                      {filteredUnits.length > 5 && !showAllUnits && (
                        <button
                          onClick={() => setShowAllUnits(true)}
                          className="w-full flex items-center justify-center gap-1 text-xs text-blue-600 font-bold py-2.5 border border-dashed border-blue-200 rounded-2xl hover:bg-blue-50 transition-colors"
                        >
                          View all {filteredUnits.length} units
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </section>

            {/* ── 12. Recent Diagnostics ────────────────────────────────────────── */}
            <section aria-label="Recent Diagnostics">
              <SectionHeader
                title="Recent Diagnostics"
                count={logs.length}
                open={diagOpen}
                onToggle={() => setDiagOpen((v) => !v)}
                icon={Activity}
              />
              {diagOpen && (
                <div className="mt-3">
                  {logs.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center">
                      <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-500">No diagnostics yet</p>
                      <p className="text-xs text-slate-400 mt-1">Run a diagnosis to see results here.</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2.5">
                        {(showAllDiags ? logs : logs.slice(0, 5)).map((l) => (
                          <LogCard
                            key={l.id}
                            log={l}
                            unitMap={unitMap}
                            onClick={() => navigate(`/records/log/${l.id}`)}
                          />
                        ))}
                      </div>
                      {logs.length > 5 && !showAllDiags && (
                        <button
                          onClick={() => setShowAllDiags(true)}
                          className="mt-2.5 w-full flex items-center justify-center gap-1 text-xs text-blue-600 font-bold py-2.5 border border-dashed border-blue-200 rounded-2xl hover:bg-blue-50 transition-colors"
                        >
                          View all {logs.length} diagnostics
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </section>

            {/* ── 13. My Stats ──────────────────────────────────────────────────── */}
            <section aria-label="My Stats">
              <SectionHeader
                title="My Stats"
                open={statsOpen}
                onToggle={() => setStatsOpen((v) => !v)}
                icon={TrendingUp}
              />
              {statsOpen && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="bg-white border border-slate-200 rounded-2xl p-4">
                    <span className="text-2xl font-extrabold text-slate-900 leading-none">{logs.length}</span>
                    <p className="text-xs font-semibold text-slate-400 mt-1.5">Total Diagnoses</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-4">
                    <span className="text-2xl font-extrabold text-emerald-700 leading-none">{resolvedThisWeek}</span>
                    <p className="text-xs font-semibold text-slate-400 mt-1.5">Resolved This Week</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-4">
                    <span className="text-2xl font-extrabold text-blue-700 leading-none">
                      {avgConfidence != null ? `${avgConfidence}%` : "—"}
                    </span>
                    <p className="text-xs font-semibold text-slate-400 mt-1.5">Avg. AI Confidence</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-4">
                    <span className="text-2xl font-extrabold text-slate-900 leading-none">{resolvedLogs.length}</span>
                    <p className="text-xs font-semibold text-slate-400 mt-1.5">Total Resolved</p>
                  </div>
                  {topDiagnosis && (
                    <div className="col-span-2 bg-white border border-slate-200 rounded-2xl p-4">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Top Diagnosis</p>
                      <p className="text-sm font-bold text-slate-900 line-clamp-1">{topDiagnosis[0]}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{topDiagnosis[1]}× diagnosed</p>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* ── 14. Resolution Library ────────────────────────────────────────── */}
            <section aria-label="Resolution Library">
              <SectionHeader
                title="Resolution Library"
                count={resolvedLogs.length}
                open={libOpen}
                onToggle={() => setLibOpen((v) => !v)}
                icon={CheckCheck}
              />
              {libOpen && (
                <div className="mt-3">
                  {resolvedLogs.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center">
                      <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-500">No resolved cases yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(resolutionGroups)
                          .sort((a, b) => b[1].length - a[1].length)
                          .map(([key, items]) => {
                            const cat = RESOLUTION_CATEGORIES.find((c) => c.key === key);
                            return (
                              <span key={key} className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full font-semibold">
                                {cat?.label ?? "Other"} ({items.length})
                              </span>
                            );
                          })}
                      </div>
                      <div className="space-y-2.5">
                        {resolvedLogs.slice(0, 10).map((l) => (
                          <LogCard
                            key={l.id}
                            log={l}
                            unitMap={unitMap}
                            onClick={() => navigate(`/records/log/${l.id}`)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Bottom spacer */}
            <div className="h-4" />
          </>
        )}
      </div>

      {/* ── Add Reminder Modal ───────────────────────────────────────────────── */}
      {showAddEvent && (
        <ScheduledEventModal
          clientId={clientId}
          onClose={() => setShowAddEvent(false)}
          onCreated={(ev) => {
            setScheduledEvents((prev) => [...prev, ev].sort((a, b) => a.scheduledDate - b.scheduledDate));
            setShowAddEvent(false);
          }}
        />
      )}
    </div>
  );
}
