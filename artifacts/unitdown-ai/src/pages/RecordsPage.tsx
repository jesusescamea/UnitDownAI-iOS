import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useLocation } from "wouter";
import { useUser } from "@clerk/clerk-react";
import {
  Building2, Search, Plus, ChevronRight, Wrench,
  History, ThermometerSnowflake, CheckCircle2,
  AlertCircle, Clock, CircleDot, X, Star, Package,
  Phone, Calendar, Filter, Bell, Activity,
  TrendingUp, CheckCheck, ChevronLeft, ChevronDown,
  Zap, Shield, ArrowRight, BarChart3, Target,
  MapPin, Users, LayoutList, CalendarDays, ListOrdered,
  Layers,
} from "lucide-react";
import RtuIcon from "@/components/RtuIcon";
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

type FilteredView =
  | "active-jobs"
  | "on-parts"
  | "return-visits"
  | "pm-due"
  | "unresolved"
  | "monitoring"
  | "completed"
  | "saved-units"
  | null;

type CalendarMode = "week" | "month" | "agenda";

interface SiteGroup {
  site: string;
  units: UnitRecord[];
}

interface LocationGroup {
  customer: string;
  sites: SiteGroup[];
  totalUnits: number;
  activeCount: number;
  criticalCount: number;
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

const DAY_LABELS_SHORT = ["M", "T", "W", "T", "F", "S", "S"];
const DAY_LABELS_MED   = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getClientId(): string {
  try { return localStorage.getItem("unitdown_client_id") ?? ""; } catch { return ""; }
}

function getRecentlyViewedIds(): string[] {
  try { return JSON.parse(localStorage.getItem("unitdown_recently_viewed") ?? "[]"); } catch { return []; }
}

function statusConfig(status: string) {
  switch (status) {
    case "resolved":          return { label: "Resolved",         Icon: CheckCircle2, cls: "bg-emerald-100 text-emerald-800 border-emerald-200", dot: "bg-emerald-500" };
    case "monitoring":        return { label: "Monitoring",       Icon: CircleDot,    cls: "bg-blue-100 text-blue-800 border-blue-200",          dot: "bg-blue-500" };
    case "waiting-on-parts":  return { label: "Waiting on Parts", Icon: Package,      cls: "bg-purple-100 text-purple-800 border-purple-200",    dot: "bg-purple-500" };
    case "return-visit":      return { label: "Return Visit",     Icon: Calendar,     cls: "bg-orange-100 text-orange-800 border-orange-200",    dot: "bg-orange-500" };
    case "customer-callback": return { label: "Callback",         Icon: Phone,        cls: "bg-rose-100 text-rose-800 border-rose-200",          dot: "bg-rose-500" };
    default:                  return { label: "Unresolved",       Icon: AlertCircle,  cls: "bg-amber-100 text-amber-800 border-amber-200",       dot: "bg-red-500" };
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
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const eventDay = new Date(d); eventDay.setHours(0, 0, 0, 0);
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

// ─── Equipment Lifecycle Status ────────────────────────────────────────────────

type UnitStatus = "operational" | "monitoring" | "needs-follow-up" | "critical" | "archived";

function computeUnitStatus(unit: UnitRecord, logs: DiagnosticLog[]): UnitStatus {
  if (unit.isArchived) return "archived";
  const ul = logs.filter((l) => l.unitId === unit.id);
  if (ul.some((l) => l.status === "unresolved")) return "critical";
  if (ul.some((l) => l.status === "waiting-on-parts")) return "needs-follow-up";
  if (ul.some((l) => l.status === "return-visit" || l.status === "customer-callback")) return "needs-follow-up";
  if (ul.some((l) => l.status === "monitoring")) return "monitoring";
  return "operational";
}

function unitStatusConfig(status: UnitStatus) {
  switch (status) {
    case "operational":     return { dot: "bg-emerald-500", label: "Operational", textCls: "text-emerald-700", bgCls: "bg-emerald-50",  borderCls: "border-emerald-200" };
    case "monitoring":      return { dot: "bg-blue-500",    label: "Monitoring",  textCls: "text-blue-700",    bgCls: "bg-blue-50",    borderCls: "border-blue-200"   };
    case "needs-follow-up": return { dot: "bg-amber-500",   label: "Follow-up",   textCls: "text-amber-700",   bgCls: "bg-amber-50",   borderCls: "border-amber-200"  };
    case "critical":        return { dot: "bg-red-500",     label: "Critical",    textCls: "text-red-700",     bgCls: "bg-red-50",     borderCls: "border-red-200"    };
    case "archived":        return { dot: "bg-slate-400",   label: "Archived",    textCls: "text-slate-500",   bgCls: "bg-slate-100",  borderCls: "border-slate-200"  };
  }
}

// Equipment type filter chips
const EQUIP_TYPE_CHIPS: { label: string; match: string }[] = [
  { label: "RTU",       match: "rooftop" },
  { label: "Split",     match: "split"   },
  { label: "Chiller",   match: "chiller" },
  { label: "AHU",       match: "air handler" },
  { label: "Boiler",    match: "boiler"  },
  { label: "Heat Pump", match: "heat pump" },
  { label: "VRF",       match: "vrf"     },
];

function getResolutionCategory(log: DiagnosticLog): string {
  const text = ((log.diagnosisTitle ?? "") + " " + (log.resolutionNotes ?? "")).toLowerCase();
  for (const cat of RESOLUTION_CATEGORIES) {
    if (cat.keywords.some((kw) => text.includes(kw))) return cat.key;
  }
  return "other";
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
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

function getMonthDates(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7;
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function getEventsForDay(day: Date, events: ScheduledEvent[]): ScheduledEvent[] {
  return events.filter((e) => isSameDay(new Date(e.scheduledDate), day));
}

function matchesSearch(q: string, unit: UnitRecord): boolean {
  const lower = q.toLowerCase();
  return [
    unit.nickname, unit.siteCustomerName, unit.location, unit.manufacturer,
    unit.modelNumber, unit.serialNumber, unit.equipmentType, unit.systemType,
  ].some((f) => f?.toLowerCase().includes(lower));
}

function matchesLogSearch(q: string, log: DiagnosticLog): boolean {
  const lower = q.toLowerCase();
  return [
    log.diagnosisTitle, log.symptoms, log.technicianNotes, log.resolutionNotes,
  ].some((f) => f?.toLowerCase().includes(lower));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KPICard({
  value, label, Icon, colorClass, accentIcon, onClick, onMouseEnter, onMouseLeave, active,
}: {
  value: number | string;
  label: string;
  Icon: React.ElementType;
  colorClass: string;
  accentIcon: string;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`relative flex flex-col justify-between p-3 rounded-2xl border text-left
        transition-all duration-150 ease-out active:scale-[0.96]
        hover:scale-[1.03] hover:shadow-md
        ${active ? "ring-2 ring-blue-400 ring-offset-1" : ""}
        ${colorClass}`}
    >
      <div className={`w-6 h-6 rounded-lg flex items-center justify-center mb-2 ${accentIcon}`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <span className="text-xl font-extrabold leading-none block">{value}</span>
      <span className="text-[11px] font-semibold mt-1 opacity-70 leading-tight block">{label}</span>
      {onClick && (
        <ArrowRight className="absolute bottom-2.5 right-2.5 w-3 h-3 opacity-30 group-hover:opacity-70 transition-opacity" />
      )}
    </button>
  );
}

function KpiHoverPreview({
  kpi, logs, scheduledEvents, units, unitMap, onNavigate,
}: {
  kpi: string;
  logs: DiagnosticLog[];
  scheduledEvents: ScheduledEvent[];
  units: UnitRecord[];
  unitMap: Record<string, UnitRecord>;
  onNavigate: (id: string) => void;
}) {
  const items = useMemo(() => {
    switch (kpi) {
      case "active-jobs": return logs.filter((l) => ACTIVE_STATUSES.has(l.status)).slice(0, 3);
      case "on-parts":    return logs.filter((l) => l.status === "waiting-on-parts").slice(0, 3);
      case "return-visits": return logs.filter((l) => l.status === "return-visit" || l.status === "customer-callback").slice(0, 3);
      case "unresolved":  return logs.filter((l) => l.status === "unresolved").slice(0, 3);
      case "monitoring":  return logs.filter((l) => l.status === "monitoring").slice(0, 3);
      case "completed": {
        const cutoff = Date.now() - 7 * 86400000;
        return logs.filter((l) => l.status === "resolved" && l.timestamp > cutoff).slice(0, 3);
      }
      default: return [];
    }
  }, [kpi, logs]);

  const eventItems = useMemo(() => {
    if (kpi === "pm-due") return scheduledEvents.filter((e) => e.eventType === "pm-due").slice(0, 3);
    return [];
  }, [kpi, scheduledEvents]);

  const unitItems = useMemo(() => {
    if (kpi === "saved-units") return units.slice(0, 3);
    return [];
  }, [kpi, units]);

  if (items.length === 0 && eventItems.length === 0 && unitItems.length === 0) {
    return (
      <div className="text-center py-3">
        <p className="text-xs text-slate-400">Nothing here yet</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {items.map((log) => {
        const cfg = statusConfig(log.status);
        const unit = log.unitId ? unitMap[log.unitId] : null;
        return (
          <button
            key={log.id}
            onClick={() => onNavigate(`/records/log/${log.id}`)}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left"
          >
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-800 line-clamp-1">{log.diagnosisTitle ?? "Diagnosis"}</p>
              {unit && <p className="text-[11px] text-slate-400 truncate">{unit.nickname ?? unit.siteCustomerName ?? "Unit"}</p>}
            </div>
            <span className="text-[11px] text-slate-400 flex-shrink-0">{formatDate(log.timestamp)}</span>
          </button>
        );
      })}
      {eventItems.map((ev) => {
        const cfg = scheduledEventTypeConfig(ev.eventType);
        const unit = ev.unitId ? unitMap[ev.unitId] : null;
        return (
          <div key={ev.id} className="flex items-center gap-2.5 px-4 py-2.5">
            <cfg.Icon className={`w-3.5 h-3.5 flex-shrink-0 ${cfg.color}`} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-800 line-clamp-1">{ev.title}</p>
              {unit && <p className="text-[11px] text-slate-400 truncate">{unit.nickname ?? unit.siteCustomerName ?? "Unit"}</p>}
            </div>
            <span className={`text-[11px] font-semibold flex-shrink-0 ${ev.scheduledDate < Date.now() ? "text-red-500" : "text-slate-400"}`}>
              {formatScheduleDate(ev.scheduledDate)}
            </span>
          </div>
        );
      })}
      {unitItems.map((u) => (
        <button
          key={u.id}
          onClick={() => onNavigate(`/records/unit/${u.id}`)}
          className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left"
        >
          <div className="w-6 h-6 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <Wrench className="w-3 h-3 text-blue-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-800 line-clamp-1">{u.nickname ?? u.modelNumber ?? "Unit"}</p>
            {u.siteCustomerName && <p className="text-[11px] text-slate-400 truncate">{u.siteCustomerName}</p>}
          </div>
        </button>
      ))}
    </div>
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
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ml-1 ${open ? "" : "-rotate-90"}`} />
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
      className="w-full text-left bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm
        hover:border-blue-300 hover:shadow-md hover:scale-[1.01]
        transition-all duration-150 ease-out active:scale-[0.98]"
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
            {unit.equipmentType && (
              <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full font-medium">{unit.equipmentType}</span>
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
  unit, unitStatus, onClick, onToggleFavorite,
}: {
  unit: UnitRecord;
  unitStatus?: UnitStatus;
  onClick: () => void;
  onToggleFavorite?: (e: React.MouseEvent) => void;
}) {
  const status = unitStatus ?? "operational";
  const sc = unitStatusConfig(status);
  const showBadge = status !== "operational" && status !== "archived";

  const eqType = (unit.equipmentType ?? "").toLowerCase();
  const isRooftop = eqType.includes("rtu") || eqType.includes("rooftop") || eqType.includes("package") || eqType.includes("make-up") || eqType.includes("makeup");

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border border-slate-200 rounded-2xl px-4 py-4 shadow-sm
        hover:border-blue-300 hover:shadow-md hover:scale-[1.01]
        transition-all duration-150 ease-out active:scale-[0.98]"
    >
      <div className="flex items-start gap-3">
        {/* Equipment-type avatar — RTU icon or generic dot */}
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border mt-0.5 ${sc.bgCls} ${sc.borderCls}`}>
          {isRooftop
            ? <RtuIcon className={`w-4.5 h-4.5 ${sc.textCls}`} style={{ width: "18px", height: "18px" }} />
            : <span className={`w-2.5 h-2.5 rounded-full ${sc.dot}`} />
          }
        </div>

        {/* Main content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <span className="font-extrabold text-slate-900 text-sm leading-snug truncate block">
                {unit.nickname ?? unit.modelNumber ?? "Unnamed Unit"}
              </span>
              {unit.siteCustomerName && (
                <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">{unit.siteCustomerName}</p>
              )}
              {unit.location && (
                <p className="text-[10px] text-slate-400 flex items-center gap-0.5 mt-0.5">
                  <MapPin className="w-2.5 h-2.5 flex-shrink-0" />{unit.location}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {onToggleFavorite && (
                <button
                  onClick={onToggleFavorite}
                  className={`p-1 rounded-lg transition-colors ${unit.isFavorite ? "text-yellow-500" : "text-slate-300 hover:text-yellow-400"}`}
                >
                  <Star className={`w-3.5 h-3.5 ${unit.isFavorite ? "fill-yellow-400" : ""}`} />
                </button>
              )}
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
            {unit.equipmentType && (
              <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                {unit.equipmentType}
              </span>
            )}
            {unit.manufacturer && (
              <span className="text-[10px] text-slate-500 font-medium">
                {unit.manufacturer}
              </span>
            )}
            {showBadge && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ml-auto ${sc.bgCls} ${sc.textCls} ${sc.borderCls}`}>
                {sc.label}
              </span>
            )}
            {!showBadge && (
              <span className="text-[10px] text-slate-300 ml-auto">{formatDate(unit.updatedAt)}</span>
            )}
          </div>
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
      className="w-full text-left bg-white border border-slate-200 rounded-2xl p-4 shadow-sm
        hover:border-blue-300 hover:shadow-md hover:scale-[1.01]
        transition-all duration-150 ease-out active:scale-[0.98]"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-sm font-bold text-slate-900 line-clamp-1 flex-1">{log.diagnosisTitle ?? "Diagnosis"}</span>
        <Badge className={`text-xs border flex-shrink-0 flex items-center gap-1 ${cfg.cls}`}>
          <cfg.Icon className="w-3 h-3" />
          {cfg.label}
        </Badge>
      </div>
      <p className="text-xs text-slate-500 line-clamp-2 mb-2">{log.symptoms}</p>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          {unit && (
            <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full truncate max-w-[140px]">
              {unit.nickname ?? unit.siteCustomerName ?? unit.modelNumber ?? "Unit"}
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
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {unit && <span className="text-xs text-blue-600 font-medium truncate">{unit.nickname ?? unit.siteCustomerName ?? "Unit"}</span>}
          {isOverdue && <span className="text-xs text-red-500 font-semibold">Overdue</span>}
          {event.recurrence && <span className="text-xs text-slate-400">↻ {event.recurrence}</span>}
        </div>
      </div>
      <button
        onClick={onMarkDone}
        className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl px-2 py-1 font-semibold
          hover:bg-emerald-100 transition-colors whitespace-nowrap flex-shrink-0"
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
    const first = days[0]; const last = days[6];
    if (first.getMonth() === last.getMonth())
      return `${MONTH_NAMES[first.getMonth()]} ${first.getFullYear()}`;
    return `${MONTH_NAMES[first.getMonth()].slice(0,3)} – ${MONTH_NAMES[last.getMonth()].slice(0,3)} ${last.getFullYear()}`;
  }, [days]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => onWeekChange(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-bold text-slate-600">{monthLabel}</span>
        <button onClick={() => onWeekChange(1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
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
              className={`flex flex-col items-center py-1.5 px-0.5 rounded-xl transition-all duration-150 ${
                isSelected ? "bg-blue-600 text-white" : isToday ? "bg-blue-50" : "hover:bg-slate-50"
              }`}
            >
              <span className={`text-[10px] font-bold uppercase tracking-wide mb-1 ${
                isSelected ? "text-blue-100" : isPast ? "text-slate-300" : "text-slate-400"
              }`}>{DAY_LABELS_SHORT[i]}</span>
              <span className={`text-sm font-extrabold leading-none w-7 h-7 flex items-center justify-center rounded-full ${
                isSelected ? "text-white" : isToday ? "text-blue-700" : isPast ? "text-slate-300" : "text-slate-800"
              }`}>{day.getDate()}</span>
              <div className="flex gap-0.5 mt-1.5 min-h-[6px]">
                {dayEvents.slice(0, 3).map((ev, di) => (
                  <span key={di} className={`w-1.5 h-1.5 rounded-full ${
                    isSelected ? "bg-white opacity-80" : (EVENT_TYPE_DOT_COLOR[ev.eventType] ?? "bg-slate-400")
                  }`} />
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MonthCalendar({
  scheduledEvents, monthOffset, onMonthChange, selectedDay, onSelectDay,
}: {
  scheduledEvents: ScheduledEvent[];
  monthOffset: number;
  onMonthChange: (dir: -1 | 1) => void;
  selectedDay: Date | null;
  onSelectDay: (day: Date | null) => void;
}) {
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const { year, month } = useMemo(() => {
    const base = new Date();
    base.setDate(1);
    base.setMonth(base.getMonth() + monthOffset);
    return { year: base.getFullYear(), month: base.getMonth() };
  }, [monthOffset]);

  const cells = useMemo(() => getMonthDates(year, month), [year, month]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => onMonthChange(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-bold text-slate-700">{MONTH_NAMES[month]} {year}</span>
        <button onClick={() => onMonthChange(1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS_MED.map((d, i) => (
          <span key={i} className="text-[10px] font-bold text-slate-400 uppercase text-center py-1">{d.slice(0,1)}</span>
        ))}
      </div>
      {/* Date cells */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((date, i) => {
          if (!date) return <div key={i} />;
          const dayEvents = getEventsForDay(date, scheduledEvents);
          const isToday = isSameDay(date, today);
          const isSelected = selectedDay ? isSameDay(date, selectedDay) : false;
          return (
            <button
              key={i}
              onClick={() => onSelectDay(isSelected ? null : date)}
              className={`flex flex-col items-center py-1 rounded-xl transition-all duration-150 ${
                isSelected ? "bg-blue-600" : isToday ? "bg-blue-50" : "hover:bg-slate-50"
              }`}
            >
              <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                isSelected ? "text-white" : isToday ? "text-blue-700 font-extrabold" : "text-slate-700"
              }`}>{date.getDate()}</span>
              <div className="flex gap-0.5 mt-0.5 min-h-[5px]">
                {dayEvents.slice(0, 2).map((ev, di) => (
                  <span key={di} className={`w-1 h-1 rounded-full ${
                    isSelected ? "bg-white opacity-80" : (EVENT_TYPE_DOT_COLOR[ev.eventType] ?? "bg-slate-400")
                  }`} />
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LocationGroupCard({
  group, healthScoreMap, expanded, onToggle, onUnitClick, onToggleFavorite,
}: {
  group: LocationGroup;
  healthScoreMap: Record<string, number>;
  expanded: boolean;
  onToggle: () => void;
  onUnitClick: (id: string) => void;
  onToggleFavorite: (unit: UnitRecord, e: React.MouseEvent) => void;
}) {
  return (
    <div className={`bg-white border rounded-2xl shadow-sm transition-all duration-150 overflow-hidden ${
      expanded ? "border-blue-300" : "border-slate-200"
    }`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Users className="w-4.5 h-4.5 text-slate-600" style={{ width: "18px", height: "18px" }} />
          </div>
          <div className="min-w-0 text-left">
            <p className="font-bold text-slate-900 text-sm truncate">{group.customer}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-xs text-slate-500 font-medium">{group.totalUnits} unit{group.totalUnits !== 1 ? "s" : ""}</span>
              {group.activeCount > 0 && (
                <span className="text-xs text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200">
                  {group.activeCount} active
                </span>
              )}
              {group.criticalCount > 0 && (
                <span className="text-xs text-red-700 font-semibold bg-red-50 px-1.5 py-0.5 rounded-full border border-red-200">
                  {group.criticalCount} critical
                </span>
              )}
            </div>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-150 ${expanded ? "" : "-rotate-90"}`} />
      </button>

      {expanded && (
        <div className="border-t border-slate-100">
          {group.sites.map(({ site, units }) => (
            <div key={site}>
              {group.sites.length > 1 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border-b border-slate-100">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">{site}</span>
                  <span className="text-xs text-slate-400">({units.length})</span>
                </div>
              )}
              <div className="p-3 space-y-2">
                {units.map((u) => (
                  <CompactUnitCard
                    key={u.id}
                    unit={u}
                    healthScore={healthScoreMap[u.id]}
                    onClick={() => onUnitClick(u.id)}
                    onToggleFavorite={(e) => onToggleFavorite(u, e)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Filtered View Components ─────────────────────────────────────────────────

function FilteredViewHeader({
  title, count, onBack, action,
}: {
  title: string;
  count?: number;
  onBack: () => void;
  action?: React.ReactNode;
}) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-blue-600 font-semibold text-sm hover:text-blue-800 transition-colors flex-shrink-0"
        >
          <ChevronLeft className="w-4 h-4" />
          Dashboard
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-extrabold text-slate-900 text-sm truncate">{title}</span>
          {count !== undefined && (
            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0">{count}</span>
          )}
        </div>
        <div className="flex-shrink-0">{action}</div>
      </div>
    </header>
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

  // Navigation
  const [filteredBy, setFilteredBy] = useState<FilteredView>(null);

  // Calendar state
  const [calendarMode, setCalendarMode] = useState<CalendarMode>("week");
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // KPI hover preview (desktop only)
  const [hoveredKpi, setHoveredKpi] = useState<string | null>(null);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Location browse
  const [locationViewOpen, setLocationViewOpen] = useState(false);
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set());

  // Section collapse
  const [unitsOpen, setUnitsOpen] = useState(true);
  const [diagOpen, setDiagOpen] = useState(true);
  const [libOpen, setLibOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [healthOpen, setHealthOpen] = useState(true);
  const [activeWorkOpen, setActiveWorkOpen] = useState(true);
  const [priorityOpen, setPriorityOpen] = useState(true);

  // Expand-all
  const [showAllActive, setShowAllActive] = useState(false);
  const [showAllDiags, setShowAllDiags] = useState(false);
  const [showAllUnits, setShowAllUnits] = useState(false);

  // Modals
  const [showAddEvent, setShowAddEvent] = useState(false);

  // Search + filters
  const [q, setQ] = useState("");
  const [mfgFilter, setMfgFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

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

  // ─── KPI hover handlers ───────────────────────────────────────────────────

  const handleKpiEnter = useCallback((kpi: string) => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    setHoveredKpi(kpi);
  }, []);

  const handleKpiLeave = useCallback(() => {
    hoverTimeout.current = setTimeout(() => setHoveredKpi(null), 150);
  }, []);

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
  const unresolvedLogs = useMemo(() => logs.filter((l) => l.status === "unresolved"), [logs]);
  const monitoringLogs = useMemo(() => logs.filter((l) => l.status === "monitoring"), [logs]);
  const returnVisitLogs = useMemo(() => logs.filter((l) => l.status === "return-visit" || l.status === "customer-callback"), [logs]);

  const unresolvedCount = unresolvedLogs.length;
  const monitoringCount = monitoringLogs.length;
  const returnVisitCount = returnVisitLogs.length;

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
    const sorted = [...units].sort((a, b) => {
      const an = a.siteCustomerName?.trim() ?? "";
      const bn = b.siteCustomerName?.trim() ?? "";
      if (an && !bn) return -1; if (!an && bn) return 1;
      const nc = an.localeCompare(bn, undefined, { sensitivity: "base" });
      return nc !== 0 ? nc : (a.nickname ?? "").localeCompare(b.nickname ?? "", undefined, { sensitivity: "base" });
    });
    return sorted.filter((u) => {
      if (mfgFilter && u.manufacturer !== mfgFilter) return false;
      if (typeFilter && !(u.equipmentType ?? "").toLowerCase().includes(typeFilter)) return false;
      if (!q) return true;
      return matchesSearch(q, u);
    });
  }, [units, q, mfgFilter, typeFilter]);

  // Smart search results (units + diagnostics)
  const isSearching = q.trim().length >= 2;
  const smartSearchResults = useMemo(() => {
    if (!isSearching) return null;
    const matchedLogs = logs.filter((l) => matchesLogSearch(q, l));
    return { units: filteredUnits, diagnostics: matchedLogs };
  }, [isSearching, q, filteredUnits, logs]);

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

  const unitStatusMap = useMemo(() => {
    const map: Record<string, UnitStatus> = {};
    units.forEach((u) => { map[u.id] = computeUnitStatus(u, logs); });
    return map;
  }, [units, logs]);

  const healthSnapshot = useMemo(() => {
    const critical: UnitRecord[] = [], watchlist: UnitRecord[] = [], healthy: UnitRecord[] = [], noActivity: UnitRecord[] = [];
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

  const locationGroups = useMemo((): LocationGroup[] => {
    const customerMap: Record<string, UnitRecord[]> = {};
    units.forEach((u) => {
      const customer = u.siteCustomerName?.trim() || "Uncategorized";
      if (!customerMap[customer]) customerMap[customer] = [];
      customerMap[customer].push(u);
    });
    return Object.entries(customerMap)
      .map(([customer, custUnits]) => {
        const siteMap: Record<string, UnitRecord[]> = {};
        custUnits.forEach((u) => {
          const site = u.location?.trim() || "Main";
          if (!siteMap[site]) siteMap[site] = [];
          siteMap[site].push(u);
        });
        const activeCount = custUnits.filter((u) => logs.some((l) => l.unitId === u.id && ACTIVE_STATUSES.has(l.status))).length;
        const criticalCount = custUnits.filter((u) => (healthScoreMap[u.id] ?? 100) < 60).length;
        return {
          customer,
          sites: Object.entries(siteMap).map(([site, siteUnits]) => ({ site, units: siteUnits })),
          totalUnits: custUnits.length,
          activeCount,
          criticalCount,
        };
      })
      .sort((a, b) => {
        if (a.customer === "Uncategorized") return 1;
        if (b.customer === "Uncategorized") return -1;
        return b.totalUnits - a.totalUnits;
      });
  }, [units, logs, healthScoreMap]);

  const briefingSummary = useMemo(() => {
    const parts: string[] = [];
    if (unresolvedCount > 0) parts.push(`${unresolvedCount} unresolved`);
    if (partsWaiting.length > 0) parts.push(`${partsWaiting.length} waiting on parts`);
    if (returnVisitCount > 0) parts.push(`${returnVisitCount} return visit${returnVisitCount !== 1 ? "s" : ""}`);
    if (pmDueCount > 0) parts.push(`${pmDueCount} PM due`);
    const overdueCount = scheduledEvents.filter((e) => e.scheduledDate < Date.now()).length;
    if (overdueCount > 0) parts.push(`${overdueCount} overdue`);
    if (parts.length === 0 && activeWork.length === 0) return "All clear — nothing urgent today.";
    if (parts.length === 0) return `${activeWork.length} active job${activeWork.length !== 1 ? "s" : ""} in progress.`;
    return parts.join(" · ");
  }, [activeWork, unresolvedCount, partsWaiting, returnVisitCount, pmDueCount, scheduledEvents]);

  const priorityItems = useMemo(() => {
    type PItem = { type: "log"; item: DiagnosticLog } | { type: "event"; item: ScheduledEvent };
    const items: PItem[] = [];
    unresolvedLogs.slice(0, 3).forEach((l) => items.push({ type: "log", item: l }));
    scheduledEvents.filter((e) => e.scheduledDate < Date.now()).slice(0, 2).forEach((e) => items.push({ type: "event", item: e }));
    returnVisitLogs.slice(0, 2).forEach((l) => items.push({ type: "log", item: l }));
    logs.filter((l) => l.status === "customer-callback").slice(0, 1).forEach((l) => items.push({ type: "log", item: l }));
    return items.slice(0, 5);
  }, [unresolvedLogs, scheduledEvents, returnVisitLogs, logs]);

  const activeByStatus = useMemo(() => {
    const order = ["unresolved", "waiting-on-parts", "monitoring", "return-visit", "customer-callback"];
    const groups: Record<string, DiagnosticLog[]> = {};
    for (const s of order) groups[s] = [];
    activeWork.forEach((l) => { if (groups[l.status]) groups[l.status].push(l); });
    return order.map((s) => ({ status: s, logs: groups[s] })).filter((g) => g.logs.length > 0);
  }, [activeWork]);

  // Agenda
  const agendaDays = useMemo(() => {
    if (selectedDay) {
      return [{ date: selectedDay, events: getEventsForDay(selectedDay, scheduledEvents) }];
    }
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return Array.from({ length: 3 }, (_, i) => {
      const d = new Date(today); d.setDate(today.getDate() + i);
      return { date: d, events: getEventsForDay(d, scheduledEvents) };
    }).filter((day) => day.events.length > 0 || isSameDay(day.date, today));
  }, [selectedDay, scheduledEvents]);

  const agendaHasEvents = useMemo(() => agendaDays.some((d) => d.events.length > 0), [agendaDays]);

  // Agenda sorted list (for "agenda" calendar mode)
  const allEventsSorted = useMemo(() => {
    return [...scheduledEvents].sort((a, b) => a.scheduledDate - b.scheduledDate);
  }, [scheduledEvents]);

  const agendaGrouped = useMemo(() => {
    const groups: { label: string; events: ScheduledEvent[] }[] = [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const map = new Map<string, ScheduledEvent[]>();
    for (const ev of allEventsSorted) {
      const d = new Date(ev.scheduledDate); d.setHours(0, 0, 0, 0);
      const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
      let label: string;
      if (diff < -1) label = `${Math.abs(diff)} days overdue`;
      else if (diff === -1) label = "Yesterday";
      else if (diff === 0) label = "Today";
      else if (diff === 1) label = "Tomorrow";
      else if (diff < 7) label = d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
      else label = d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(ev);
    }
    for (const [label, events] of map.entries()) groups.push({ label, events });
    return groups;
  }, [allEventsSorted]);

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
        <Button onClick={() => navigate("/login")} className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-6">Sign In</Button>
        <button onClick={() => navigate("/")} className="mt-4 text-sm text-slate-400 hover:text-slate-600">Back to Diagnostics</button>
      </div>
    );
  }

  // ─── Filtered Drill-down Views ─────────────────────────────────────────────

  if (filteredBy !== null) {
    let title = "";
    let content: React.ReactNode = null;

    const renderLogList = (items: DiagnosticLog[], empty: string) => (
      items.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
          <p className="font-semibold text-slate-500">{empty}</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((l) => (
            <LogCard key={l.id} log={l} unitMap={unitMap} onClick={() => navigate(`/records/log/${l.id}`)} />
          ))}
        </div>
      )
    );

    switch (filteredBy) {
      case "active-jobs":
        title = "Active Jobs";
        content = (
          <div className="space-y-5">
            {activeByStatus.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                <p className="font-semibold text-slate-500">All clear — no active jobs</p>
              </div>
            ) : (
              activeByStatus.map(({ status, logs: sl }) => {
                const cfg = statusConfig(status);
                return (
                  <div key={status}>
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                      <span className="text-xs font-extrabold uppercase tracking-widest text-slate-500">{cfg.label}</span>
                      <span className="text-xs text-slate-400">({sl.length})</span>
                    </div>
                    <div className="space-y-2.5">{sl.map((l) => (
                      <LogCard key={l.id} log={l} unitMap={unitMap} onClick={() => navigate(`/records/log/${l.id}`)} />
                    ))}</div>
                  </div>
                );
              })
            )}
          </div>
        );
        break;

      case "on-parts":
        title = "Waiting on Parts";
        content = renderLogList(partsWaiting, "No jobs waiting on parts");
        break;

      case "return-visits":
        title = "Return Visits";
        content = renderLogList(returnVisitLogs, "No return visits scheduled");
        break;

      case "unresolved":
        title = "Unresolved";
        content = renderLogList(
          unresolvedLogs.sort((a, b) => (b.confidencePercent ?? 0) - (a.confidencePercent ?? 0)),
          "No unresolved diagnostics"
        );
        break;

      case "monitoring":
        title = "Monitoring";
        content = renderLogList(monitoringLogs, "No units in monitoring");
        break;

      case "completed":
        title = "Completed This Week";
        content = renderLogList(
          resolvedLogs.filter((l) => l.timestamp > Date.now() - 7 * 86400000),
          "No completed jobs this week"
        );
        break;

      case "pm-due": {
        const pmEvents = scheduledEvents.filter((e) => e.eventType === "pm-due");
        title = "PM Due";
        content = pmEvents.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
            <Wrench className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-500">No PM events scheduled</p>
            <button onClick={() => setShowAddEvent(true)} className="mt-4 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-xl px-3 py-2 font-semibold hover:bg-blue-100 transition-colors">
              + Schedule PM
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {pmEvents.map((ev) => {
              const cfg = scheduledEventTypeConfig(ev.eventType);
              const unit = ev.unitId ? unitMap[ev.unitId] : null;
              return (
                <div key={ev.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                      <cfg.Icon className={`w-4 h-4 ${cfg.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 text-sm">{ev.title}</p>
                      {unit && <p className="text-xs text-blue-600 font-medium mt-0.5 truncate">{unit.nickname ?? unit.siteCustomerName ?? "Unit"}</p>}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className={`text-xs font-semibold ${ev.scheduledDate < Date.now() ? "text-red-600" : "text-slate-500"}`}>
                          {formatScheduleDate(ev.scheduledDate)}
                        </span>
                        {ev.recurrence && <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">↻ {ev.recurrence}</span>}
                      </div>
                    </div>
                    <button onClick={() => markEventDone(ev.id)} className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl px-2.5 py-1 font-semibold hover:bg-emerald-100 transition-colors whitespace-nowrap flex-shrink-0">
                      ✓ Done
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        );
        break;
      }

      case "saved-units":
        title = "All Equipment";
        content = (
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search units, customers, models…"
                  className="pl-8 rounded-xl border-slate-200 text-sm h-9"
                />
                {q && <button onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400"><X className="w-3.5 h-3.5" /></button>}
              </div>
              {manufacturers.length > 1 && (
                <div className="relative">
                  <select value={mfgFilter} onChange={(e) => setMfgFilter(e.target.value)} className="h-9 appearance-none text-xs text-slate-700 bg-white border border-slate-200 rounded-xl pl-3 pr-7 cursor-pointer font-semibold">
                    <option value="">All</option>
                    {manufacturers.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <Filter className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                </div>
              )}
            </div>
            {filteredUnits.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">{q ? `No matches for "${q}"` : "No units saved yet."}</p>
            ) : (
              <div className="space-y-2.5">
                {filteredUnits.map((u) => (
                  <UnitCard
                    key={u.id}
                    unit={u}
                    unitStatus={unitStatusMap[u.id]}
                    onClick={() => navigate(`/records/unit/${u.id}`)}
                    onToggleFavorite={(e) => toggleFavorite(u, e)}
                  />
                ))}
              </div>
            )}
          </div>
        );
        break;
    }

    const filteredCount = {
      "active-jobs": activeWork.length,
      "on-parts": partsWaiting.length,
      "return-visits": returnVisitLogs.length,
      "unresolved": unresolvedCount,
      "monitoring": monitoringCount,
      "completed": resolvedLogs.filter((l) => l.timestamp > Date.now() - 7 * 86400000).length,
      "pm-due": scheduledEvents.filter((e) => e.eventType === "pm-due").length,
      "saved-units": units.length,
    }[filteredBy] ?? 0;

    return (
      <div className="min-h-screen bg-slate-50">
        <FilteredViewHeader
          title={title}
          count={filteredCount}
          onBack={() => setFilteredBy(null)}
          action={
            filteredBy === "pm-due" ? (
              <button onClick={() => setShowAddEvent(true)} className="text-xs bg-blue-600 text-white rounded-xl px-3 py-1.5 font-bold hover:bg-blue-700 transition-colors">
                + Add
              </button>
            ) : undefined
          }
        />
        <div className="max-w-2xl mx-auto px-4 py-5">
          {content}
        </div>
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

  // ─── Dashboard Render ──────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Sticky Header ──────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button onClick={() => navigate("/")} className="text-slate-400 hover:text-slate-700 transition-colors p-1 flex-shrink-0">
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
                <Layers className="w-4 h-4 text-white" />
              </div>
              <span className="font-extrabold text-slate-900 text-sm hidden sm:block">Equipment Library</span>
            </div>
            {/* Global search in header */}
            <div className="relative flex-1 max-w-xs ml-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search…"
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-100 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-300 transition-all"
              />
              {q && (
                <button onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowAddEvent(true)}
              className="w-8 h-8 flex items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-300 transition-colors"
              title="Add Reminder"
            >
              <Bell className="w-4 h-4" />
            </button>
            <Button onClick={() => navigate("/records/new")} className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl h-9 px-3 text-xs">
              <Plus className="w-3.5 h-3.5 mr-1" />
              New Unit
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
          </div>
        )}

        {/* ── Smart Search Results ─────────────────────────────────────────── */}
        {isSearching && smartSearchResults && (
          <section aria-label="Search Results">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-blue-500" />
                <span className="font-bold text-slate-900 text-sm">Search Results</span>
              </div>
              <span className="text-xs text-slate-400">
                {smartSearchResults.units.length + smartSearchResults.diagnostics.length} found
              </span>
            </div>

            {smartSearchResults.units.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-2">
                  Equipment ({smartSearchResults.units.length})
                </p>
                <div className="space-y-2.5">
                  {smartSearchResults.units.slice(0, 5).map((u) => (
                    <UnitCard key={u.id} unit={u} unitStatus={unitStatusMap[u.id]}
                      onClick={() => navigate(`/records/unit/${u.id}`)}
                      onToggleFavorite={(e) => toggleFavorite(u, e)}
                    />
                  ))}
                  {smartSearchResults.units.length > 5 && (
                    <p className="text-xs text-slate-400 text-center py-1">+{smartSearchResults.units.length - 5} more</p>
                  )}
                </div>
              </div>
            )}

            {smartSearchResults.diagnostics.length > 0 && (
              <div>
                <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-2">
                  Diagnostics ({smartSearchResults.diagnostics.length})
                </p>
                <div className="space-y-2.5">
                  {smartSearchResults.diagnostics.slice(0, 5).map((l) => (
                    <LogCard key={l.id} log={l} unitMap={unitMap} onClick={() => navigate(`/records/log/${l.id}`)} />
                  ))}
                  {smartSearchResults.diagnostics.length > 5 && (
                    <p className="text-xs text-slate-400 text-center py-1">+{smartSearchResults.diagnostics.length - 5} more</p>
                  )}
                </div>
              </div>
            )}

            {smartSearchResults.units.length === 0 && smartSearchResults.diagnostics.length === 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
                <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-500">No results for "{q}"</p>
                <p className="text-xs text-slate-400 mt-1">Try customer name, model, or diagnosis type</p>
              </div>
            )}
          </section>
        )}

        {!isSearching && !loading && (
          <>
            {/* ── Hero / Daily Briefing ──────────────────────────────────────── */}
            <section>
              <div className="bg-gradient-to-br from-blue-600 via-blue-600 to-blue-700 rounded-2xl p-5 text-white shadow-lg shadow-blue-200/60">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <p className="text-blue-200 text-xs font-semibold uppercase tracking-wider mb-0.5">
                      {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
                    </p>
                    <p className="text-2xl font-extrabold leading-tight text-white">
                      {getGreeting(clerkUser?.firstName)}
                    </p>
                    <p className="text-sm text-blue-100 mt-1.5 font-medium leading-snug">{briefingSummary}</p>
                  </div>
                  <div className="w-11 h-11 bg-white/15 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Diagnose", onClick: () => navigate("/") },
                    { label: "New Unit", onClick: () => navigate("/records/new") },
                    { label: "Reminder", onClick: () => setShowAddEvent(true) },
                  ].map(({ label, onClick }) => (
                    <button
                      key={label}
                      onClick={onClick}
                      className="bg-white/15 hover:bg-white/25 active:bg-white/35 text-white text-xs font-bold rounded-xl py-2.5 transition-all duration-150 active:scale-95"
                    >
                      + {label}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* ── Equipment Library ────────────────────────────────────────────── */}
            <section aria-label="Equipment Library">
              {/* Section header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-blue-50 rounded-xl flex items-center justify-center">
                    <Layers className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <h2 className="font-extrabold text-slate-900 text-sm">Equipment Library</h2>
                  {units.length > 0 && (
                    <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                      {units.length}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => navigate("/records/new")}
                  className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl transition-colors"
                >
                  <Plus className="w-3 h-3" /> Add Unit
                </button>
              </div>

              {/* Search row */}
              <div className="relative mb-2.5">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search units, customers, locations, models, or serials…"
                  className="pl-9 pr-8 rounded-xl border-slate-200 text-sm h-10"
                />
                {q && (
                  <button onClick={() => setQ("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Type filter chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 mb-3 scrollbar-hide">
                <button
                  onClick={() => setTypeFilter("")}
                  className={`flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${
                    typeFilter === ""
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600"
                  }`}
                >
                  All
                </button>
                {EQUIP_TYPE_CHIPS.filter((chip) =>
                  units.some((u) => (u.equipmentType ?? "").toLowerCase().includes(chip.match))
                ).map((chip) => (
                  <button
                    key={chip.label}
                    onClick={() => setTypeFilter(typeFilter === chip.match ? "" : chip.match)}
                    className={`flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${
                      typeFilter === chip.match
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600"
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
                {units.some((u) => unitStatusMap[u.id] === "critical") && (
                  <span className="flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-full border bg-red-50 text-red-600 border-red-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full inline-block" />
                    {units.filter((u) => unitStatusMap[u.id] === "critical").length} Critical
                  </span>
                )}
              </div>

              {/* Equipment list */}
              {units.length === 0 ? (
                <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-8 text-center">
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Layers className="w-6 h-6 text-blue-400" />
                  </div>
                  <p className="text-sm font-bold text-slate-700">No equipment yet</p>
                  <p className="text-xs text-slate-400 mt-1 mb-4">Add your first unit to start tracking service history and diagnostics.</p>
                  <Button onClick={() => navigate("/records/new")} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add First Unit
                  </Button>
                </div>
              ) : filteredUnits.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center">
                  <Search className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-500">No matches</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {typeFilter ? "Try a different equipment type or clear the filter." : `No results for "${q}"`}
                  </p>
                  {typeFilter && (
                    <button onClick={() => setTypeFilter("")} className="mt-3 text-xs text-blue-600 font-bold hover:underline">
                      Clear filter
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="space-y-2.5">
                    {(showAllUnits ? filteredUnits : filteredUnits.slice(0, 6)).map((u) => (
                      <UnitCard key={u.id} unit={u} unitStatus={unitStatusMap[u.id]}
                        onClick={() => navigate(`/records/unit/${u.id}`)} onToggleFavorite={(e) => toggleFavorite(u, e)} />
                    ))}
                  </div>
                  {filteredUnits.length > 6 && !showAllUnits && (
                    <button
                      onClick={() => setShowAllUnits(true)}
                      className="mt-2.5 w-full flex items-center justify-center gap-1 text-xs text-blue-600 font-bold py-2.5 border border-dashed border-blue-200 rounded-2xl hover:bg-blue-50 transition-colors"
                    >
                      Show all {filteredUnits.length} units <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </>
              )}
            </section>

            {/* ── KPI Cards (4×2) ───────────────────────────────────────────── */}
            <section aria-label="Key metrics">
              <div className="grid grid-cols-4 gap-2">
                {[
                  { key: "active-jobs",   label: "Active Jobs",   Icon: Zap,          value: activeWork.length,   active: activeWork.length > 0,   colorOn: "bg-amber-50 text-amber-900 border-amber-200",   colorOff: "bg-slate-50 text-slate-500 border-slate-200", accent: "bg-amber-100 text-amber-600" },
                  { key: "on-parts",      label: "On Parts",      Icon: Package,      value: partsWaiting.length, active: partsWaiting.length > 0, colorOn: "bg-purple-50 text-purple-900 border-purple-200", colorOff: "bg-slate-50 text-slate-500 border-slate-200", accent: "bg-purple-100 text-purple-600" },
                  { key: "return-visits", label: "Return Visits", Icon: Calendar,     value: returnVisitCount,    active: returnVisitCount > 0,    colorOn: "bg-orange-50 text-orange-900 border-orange-200", colorOff: "bg-slate-50 text-slate-500 border-slate-200", accent: "bg-orange-100 text-orange-600" },
                  { key: "pm-due",        label: "PM Due",        Icon: Wrench,       value: pmDueCount,          active: pmDueCount > 0,          colorOn: "bg-emerald-50 text-emerald-900 border-emerald-200", colorOff: "bg-slate-50 text-slate-500 border-slate-200", accent: "bg-emerald-100 text-emerald-600" },
                  { key: "unresolved",    label: "Unresolved",    Icon: AlertCircle,  value: unresolvedCount,     active: unresolvedCount > 0,     colorOn: "bg-red-50 text-red-900 border-red-200",         colorOff: "bg-slate-50 text-slate-500 border-slate-200", accent: "bg-red-100 text-red-600" },
                  { key: "monitoring",    label: "Monitoring",    Icon: CircleDot,    value: monitoringCount,     active: monitoringCount > 0,     colorOn: "bg-blue-50 text-blue-900 border-blue-200",      colorOff: "bg-slate-50 text-slate-500 border-slate-200", accent: "bg-blue-100 text-blue-600" },
                  { key: "completed",     label: "Done / Week",   Icon: CheckCircle2, value: resolvedThisWeek,    active: resolvedThisWeek > 0,    colorOn: "bg-emerald-50 text-emerald-900 border-emerald-200", colorOff: "bg-slate-50 text-slate-500 border-slate-200", accent: "bg-emerald-100 text-emerald-600" },
                  { key: "saved-units",   label: "Equipment",     Icon: Building2,    value: units.length,        active: false,                   colorOn: "bg-slate-100 text-slate-700 border-slate-300",   colorOff: "bg-slate-50 text-slate-500 border-slate-200", accent: "bg-slate-200 text-slate-500" },
                ].map(({ key, label, Icon, value, active, colorOn, colorOff, accent }) => (
                  <KPICard
                    key={key}
                    value={value}
                    label={label}
                    Icon={Icon}
                    colorClass={active ? colorOn : colorOff}
                    accentIcon={active ? accent : "bg-slate-100 text-slate-400"}
                    active={hoveredKpi === key}
                    onClick={() => setFilteredBy(key as FilteredView)}
                    onMouseEnter={() => handleKpiEnter(key)}
                    onMouseLeave={handleKpiLeave}
                  />
                ))}
              </div>

              {/* Desktop-only hover preview panel */}
              <div
                onMouseEnter={() => { if (hoverTimeout.current) clearTimeout(hoverTimeout.current); }}
                onMouseLeave={handleKpiLeave}
                className={`hidden md:block mt-2 bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden transition-all duration-200 ${
                  hoveredKpi ? "max-h-60 opacity-100" : "max-h-0 opacity-0 pointer-events-none"
                }`}
              >
                {hoveredKpi && (
                  <>
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                        {hoveredKpi.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </span>
                      <button
                        onClick={() => setFilteredBy(hoveredKpi as FilteredView)}
                        className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1"
                      >
                        View all <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                    <KpiHoverPreview
                      kpi={hoveredKpi}
                      logs={logs}
                      scheduledEvents={scheduledEvents}
                      units={units}
                      unitMap={unitMap}
                      onNavigate={(path) => navigate(path)}
                    />
                  </>
                )}
              </div>
            </section>

            {/* ── Calendar + Agenda ────────────────────────────────────────────── */}
            <section aria-label="Calendar">
              {/* Calendar mode tabs */}
              <div className="flex gap-1 mb-2 bg-slate-100 p-1 rounded-xl">
                {(["week", "month", "agenda"] as const).map((mode) => {
                  const icons = { week: LayoutList, month: CalendarDays, agenda: ListOrdered };
                  const Icon = icons[mode];
                  return (
                    <button
                      key={mode}
                      onClick={() => { setCalendarMode(mode); setSelectedDay(null); }}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 ${
                        calendarMode === mode
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </button>
                  );
                })}
              </div>

              {calendarMode === "week" && (
                <WeekCalendar
                  scheduledEvents={scheduledEvents}
                  weekOffset={weekOffset}
                  onWeekChange={(dir) => { setWeekOffset((v) => v + dir); setSelectedDay(null); }}
                  selectedDay={selectedDay}
                  onSelectDay={setSelectedDay}
                />
              )}

              {calendarMode === "month" && (
                <MonthCalendar
                  scheduledEvents={scheduledEvents}
                  monthOffset={monthOffset}
                  onMonthChange={(dir) => { setMonthOffset((v) => v + dir); setSelectedDay(null); }}
                  selectedDay={selectedDay}
                  onSelectDay={setSelectedDay}
                />
              )}

              {calendarMode === "agenda" ? (
                /* Agenda view: full event list grouped by date */
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <ListOrdered className="w-3.5 h-3.5 text-blue-500" />
                      <span className="text-xs font-bold text-slate-700">All Upcoming Events</span>
                    </div>
                    <button onClick={() => setShowAddEvent(true)} className="text-xs text-blue-600 font-semibold flex items-center gap-1">
                      <Plus className="w-3 h-3" />Add
                    </button>
                  </div>
                  {agendaGrouped.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-400">No scheduled events</p>
                      <button onClick={() => setShowAddEvent(true)} className="mt-2 text-xs text-blue-600 font-semibold hover:underline">+ Add Reminder</button>
                    </div>
                  ) : (
                    <div className="px-4 py-2">
                      {agendaGrouped.map(({ label, events }) => (
                        <div key={label} className="py-2">
                          <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                          {events.map((ev) => (
                            <AgendaEventRow key={ev.id} event={ev} unitMap={unitMap}
                              onMarkDone={() => markEventDone(ev.id)} onDelete={() => deleteEvent(ev.id)} />
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Week/Month: show agenda panel below */
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
                    <button onClick={() => setShowAddEvent(true)} className="text-xs text-blue-600 font-semibold flex items-center gap-1">
                      <Plus className="w-3 h-3" />Add
                    </button>
                  </div>
                  <div className="px-4 py-1">
                    {!agendaHasEvents ? (
                      <div className="py-4 text-center">
                        <p className="text-xs font-semibold text-slate-400">No scheduled work</p>
                        <button onClick={() => setShowAddEvent(true)} className="mt-2 text-xs text-blue-600 font-semibold hover:underline">+ Add Reminder</button>
                      </div>
                    ) : (
                      agendaDays.map(({ date, events }) => {
                        if (events.length === 0) return null;
                        const today = new Date(); today.setHours(0, 0, 0, 0);
                        const diff = Math.round((date.getTime() - today.getTime()) / 86400000);
                        const dayLabel = diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : date.toLocaleDateString(undefined, { weekday: "long" });
                        return (
                          <div key={date.toISOString()} className="py-2">
                            <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">{dayLabel}</p>
                            {events.map((ev) => (
                              <AgendaEventRow key={ev.id} event={ev} unitMap={unitMap}
                                onMarkDone={() => markEventDone(ev.id)} onDelete={() => deleteEvent(ev.id)} />
                            ))}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* ── Priority Center ──────────────────────────────────────────────── */}
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
                              className={`w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50 transition-colors ${idx < priorityItems.length - 1 ? "border-b border-slate-100" : ""}`}
                            >
                              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-slate-900 line-clamp-1">{log.diagnosisTitle ?? "Unresolved Issue"}</p>
                                {unit && <p className="text-xs text-slate-500 mt-0.5 truncate">{unit.nickname ?? unit.siteCustomerName ?? "Unit"}</p>}
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {log.confidencePercent != null && <span className="text-xs text-slate-400">{log.confidencePercent}%</span>}
                                <Badge className={`text-xs border ${cfg.cls}`}>{cfg.label}</Badge>
                              </div>
                            </button>
                          );
                        } else {
                          const ev = item.item as ScheduledEvent;
                          const cfg = scheduledEventTypeConfig(ev.eventType);
                          const unit = ev.unitId ? unitMap[ev.unitId] : null;
                          return (
                            <div key={ev.id} className={`flex items-center gap-3 px-4 py-3.5 ${idx < priorityItems.length - 1 ? "border-b border-slate-100" : ""}`}>
                              <div className="w-2 h-2 rounded-full flex-shrink-0 bg-red-500" />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-slate-900 line-clamp-1">{ev.title}</p>
                                {unit && <p className="text-xs text-slate-500 mt-0.5 truncate">{unit.nickname ?? unit.siteCustomerName ?? "Unit"}</p>}
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
                          onClick={() => setFilteredBy("active-jobs")}
                          className="w-full flex items-center justify-center gap-1 text-xs text-blue-600 font-bold py-3 border-t border-slate-100 hover:bg-blue-50 transition-colors"
                        >
                          View all {activeWork.length} active jobs <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* ── Active Work ──────────────────────────────────────────────────── */}
            <section aria-label="Active Work">
              <SectionHeader
                title="Active Work"
                count={activeWork.length}
                open={activeWorkOpen}
                onToggle={() => setActiveWorkOpen((v) => !v)}
                icon={Activity}
                accent={activeWork.length > 0}
                action={
                  activeWork.length > 0 ? (
                    <button
                      onClick={() => setFilteredBy("active-jobs")}
                      className="text-xs text-blue-600 font-semibold flex items-center gap-1 hover:underline"
                    >
                      View all <ArrowRight className="w-3 h-3" />
                    </button>
                  ) : undefined
                }
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
                      {activeByStatus.map(({ status, logs: sl }) => {
                        const cfg = statusConfig(status);
                        const displayLogs = showAllActive ? sl : sl.slice(0, 3);
                        return (
                          <div key={status}>
                            <div className="flex items-center gap-2 mb-2">
                              <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                              <span className="text-xs font-extrabold uppercase tracking-widest text-slate-500">{cfg.label}</span>
                              <span className="text-xs text-slate-400">({sl.length})</span>
                              {sl.length > 3 && !showAllActive && (
                                <button onClick={() => setFilteredBy(
                                  status === "waiting-on-parts" ? "on-parts" :
                                  status === "return-visit" ? "return-visits" :
                                  status as FilteredView
                                )} className="text-xs text-blue-600 font-semibold ml-auto hover:underline">
                                  All {sl.length} →
                                </button>
                              )}
                            </div>
                            <div className="space-y-2">
                              {displayLogs.map((l) => (
                                <LogCard key={l.id} log={l} unitMap={unitMap} onClick={() => navigate(`/records/log/${l.id}`)} />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                      {!showAllActive && activeWork.length > 9 && (
                        <button
                          onClick={() => setShowAllActive(true)}
                          className="w-full flex items-center justify-center gap-1 text-xs text-blue-600 font-bold py-2.5 border border-dashed border-blue-200 rounded-2xl hover:bg-blue-50 transition-colors"
                        >
                          Show all {activeWork.length} <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* ── Weekly Progress ──────────────────────────────────────────────── */}
            <section aria-label="Weekly Progress">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-500" />
                    <span className="font-bold text-slate-900 text-sm">Weekly Progress</span>
                  </div>
                  <span className="text-xs text-slate-400 font-semibold">This week</span>
                </div>
                {(resolvedThisWeek + activeWork.length) > 0 ? (
                  <>
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.round((resolvedThisWeek / Math.max(1, resolvedThisWeek + activeWork.length)) * 100))}%` }}
                        />
                      </div>
                      <span className="text-xs font-extrabold text-slate-600 flex-shrink-0">
                        {resolvedThisWeek}/{resolvedThisWeek + activeWork.length}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mb-3">{resolvedThisWeek} resolved this week</p>
                  </>
                ) : (
                  <div className="bg-slate-50 rounded-xl p-3 text-center mb-3">
                    <p className="text-xs text-slate-400">No activity yet this week</p>
                  </div>
                )}
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

            {/* ── Equipment Health Snapshot ────────────────────────────────────── */}
            {units.length > 0 && (
              <section aria-label="Equipment Health">
                <SectionHeader title="Equipment Health" open={healthOpen} onToggle={() => setHealthOpen((v) => !v)} icon={Shield} />
                {healthOpen && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {[
                      { label: "Critical",    count: healthSnapshot.critical.length,    Icon: AlertCircle,  bg: healthSnapshot.critical.length > 0 ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200",       icon: healthSnapshot.critical.length > 0 ? "bg-red-100" : "bg-slate-100",     text: healthSnapshot.critical.length > 0 ? "text-red-700" : "text-slate-400",     iconColor: healthSnapshot.critical.length > 0 ? "text-red-600" : "text-slate-400" },
                      { label: "Watchlist",   count: healthSnapshot.watchlist.length,   Icon: CircleDot,    bg: healthSnapshot.watchlist.length > 0 ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-200",   icon: healthSnapshot.watchlist.length > 0 ? "bg-amber-100" : "bg-slate-100",   text: healthSnapshot.watchlist.length > 0 ? "text-amber-700" : "text-slate-400",  iconColor: healthSnapshot.watchlist.length > 0 ? "text-amber-600" : "text-slate-400" },
                      { label: "Healthy",     count: healthSnapshot.healthy.length,     Icon: CheckCircle2, bg: "bg-emerald-50 border-emerald-200",                                                                         icon: "bg-emerald-100",                                                         text: "text-emerald-700",                                                         iconColor: "text-emerald-600" },
                      { label: "No Activity", count: healthSnapshot.noActivity.length,  Icon: Clock,        bg: "bg-slate-50 border-slate-200",                                                                             icon: "bg-slate-100",                                                           text: "text-slate-500",                                                           iconColor: "text-slate-400" },
                    ].map(({ label, count, Icon, bg, icon, text, iconColor }) => (
                      <div key={label} className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all duration-150 hover:scale-[1.02] ${bg}`}>
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${icon}`}>
                          <Icon className={`w-4 h-4 ${iconColor}`} />
                        </div>
                        <div>
                          <p className={`text-xl font-extrabold leading-none ${text}`}>{count}</p>
                          <p className="text-[11px] font-semibold text-slate-500 mt-0.5">{label}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* ── Location Browse ──────────────────────────────────────────────── */}
            {locationGroups.length > 0 && (
              <section aria-label="Browse by Customer">
                <SectionHeader
                  title="Browse by Customer"
                  count={locationGroups.length}
                  open={locationViewOpen}
                  onToggle={() => setLocationViewOpen((v) => !v)}
                  icon={MapPin}
                />
                {locationViewOpen && (
                  <div className="mt-3 space-y-2.5">
                    {locationGroups.map((group) => (
                      <LocationGroupCard
                        key={group.customer}
                        group={group}
                        healthScoreMap={healthScoreMap}
                        expanded={expandedLocations.has(group.customer)}
                        onToggle={() => {
                          setExpandedLocations((prev) => {
                            const next = new Set(prev);
                            next.has(group.customer) ? next.delete(group.customer) : next.add(group.customer);
                            return next;
                          });
                        }}
                        onUnitClick={(id) => navigate(`/records/unit/${id}`)}
                        onToggleFavorite={toggleFavorite}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* ── Favorites ────────────────────────────────────────────────────── */}
            {favorites.length > 0 && (
              <section aria-label="Favorites">
                <div className="flex items-center gap-2 mb-3">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-400" />
                  <h2 className="font-bold text-slate-900 text-sm">Favorites</h2>
                  <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-1.5 py-0.5 rounded-full">{favorites.length}</span>
                </div>
                <div className="space-y-2">
                  {favorites.map((u) => (
                    <CompactUnitCard key={u.id} unit={u} healthScore={healthScoreMap[u.id]}
                      onClick={() => navigate(`/records/unit/${u.id}`)} onToggleFavorite={(e) => toggleFavorite(u, e)} />
                  ))}
                </div>
              </section>
            )}

            {/* ── Recently Viewed ──────────────────────────────────────────────── */}
            {recentlyViewed.length > 0 && (
              <section aria-label="Recently Viewed">
                <div className="flex items-center gap-2 mb-3">
                  <History className="w-4 h-4 text-slate-400" />
                  <h2 className="font-bold text-slate-900 text-sm">Recently Viewed</h2>
                </div>
                <div className="space-y-2">
                  {recentlyViewed.map((u) => (
                    <CompactUnitCard key={u.id} unit={u} healthScore={healthScoreMap[u.id]}
                      onClick={() => navigate(`/records/unit/${u.id}`)} />
                  ))}
                </div>
              </section>
            )}

            {/* ── Recent Diagnostics ───────────────────────────────────────────── */}
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
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2.5">
                        {(showAllDiags ? logs : logs.slice(0, 5)).map((l) => (
                          <LogCard key={l.id} log={l} unitMap={unitMap} onClick={() => navigate(`/records/log/${l.id}`)} />
                        ))}
                      </div>
                      {logs.length > 5 && !showAllDiags && (
                        <button onClick={() => setShowAllDiags(true)} className="mt-2.5 w-full flex items-center justify-center gap-1 text-xs text-blue-600 font-bold py-2.5 border border-dashed border-blue-200 rounded-2xl hover:bg-blue-50 transition-colors">
                          View all {logs.length} diagnostics <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </section>

            {/* ── My Stats ─────────────────────────────────────────────────────── */}
            <section aria-label="My Stats">
              <SectionHeader title="My Stats" open={statsOpen} onToggle={() => setStatsOpen((v) => !v)} icon={TrendingUp} />
              {statsOpen && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {[
                    { value: logs.length,                                                    label: "Total Diagnoses",      color: "text-slate-900" },
                    { value: resolvedThisWeek,                                               label: "Resolved This Week",  color: "text-emerald-700" },
                    { value: avgConfidence != null ? `${avgConfidence}%` : "—",             label: "Avg. AI Confidence",  color: "text-blue-700" },
                    { value: resolvedLogs.length,                                            label: "Total Resolved",      color: "text-slate-900" },
                  ].map(({ value, label, color }) => (
                    <div key={label} className="bg-white border border-slate-200 rounded-2xl p-4">
                      <span className={`text-2xl font-extrabold leading-none ${color}`}>{value}</span>
                      <p className="text-xs font-semibold text-slate-400 mt-1.5">{label}</p>
                    </div>
                  ))}
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

            {/* ── Resolution Library ───────────────────────────────────────────── */}
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
                        {Object.entries(resolutionGroups).sort((a, b) => b[1].length - a[1].length).map(([key, items]) => {
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
                          <LogCard key={l.id} log={l} unitMap={unitMap} onClick={() => navigate(`/records/log/${l.id}`)} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            <div className="h-6" />
          </>
        )}

        {loading && (
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 animate-pulse h-16" />
            ))}
          </div>
        )}
      </div>

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
