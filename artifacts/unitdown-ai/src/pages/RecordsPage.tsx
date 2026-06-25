import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { useUser } from "@clerk/clerk-react";
import {
  Building2, Search, Plus, ChevronRight, Wrench,
  History, ThermometerSnowflake, CheckCircle2,
  AlertCircle, Clock, CircleDot, X, Star, Package,
  Phone, Calendar, Filter, Bell, Activity, Settings,
  TrendingUp, CheckCheck,
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatChip({
  value, label, active, color, dimColor, onClick,
}: {
  value: number;
  label: string;
  active: boolean;
  color: string;
  dimColor: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center px-4 py-3 rounded-2xl border flex-shrink-0 min-w-[82px] transition-all active:scale-95 ${
        active ? color : dimColor
      }`}
    >
      <span className="text-xl font-extrabold leading-none">{value}</span>
      <span className="text-[11px] font-semibold mt-1 opacity-80 whitespace-nowrap">{label}</span>
    </button>
  );
}

function SectionHeader({
  title, count, open, onToggle, icon: Icon, accent,
}: {
  title: string;
  count?: number;
  open: boolean;
  onToggle: () => void;
  icon: React.ElementType;
  accent?: boolean;
}) {
  return (
    <button onClick={onToggle} className="w-full flex items-center justify-between py-1 group">
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${accent ? "text-blue-500" : "text-slate-400"}`} />
        <span className="font-bold text-slate-900 text-sm">{title}</span>
        {count !== undefined && count > 0 && (
          <span className="bg-slate-100 text-slate-600 text-xs font-bold px-1.5 py-0.5 rounded-full">{count}</span>
        )}
      </div>
      <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${open ? "rotate-90" : ""}`} />
    </button>
  );
}

function ScheduleCard({
  event, unitMap, onMarkDone, onDelete,
}: {
  event: ScheduledEvent;
  unitMap: Record<string, UnitRecord>;
  onMarkDone: () => void;
  onDelete: () => void;
}) {
  const unit = event.unitId ? unitMap[event.unitId] : null;
  const cfg = scheduledEventTypeConfig(event.eventType);
  const dateLabel = formatScheduleDate(event.scheduledDate);
  const isOverdue = event.scheduledDate < Date.now();

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
          <cfg.Icon className={`w-4 h-4 ${cfg.color}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-slate-900 text-sm line-clamp-1">{event.title}</p>
          {unit && (
            <p className="text-xs text-blue-600 font-medium mt-0.5 truncate">
              {unit.nickname ?? unit.modelNumber ?? "Unit"}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`text-xs font-semibold ${isOverdue ? "text-red-600" : "text-slate-500"}`}>
              {dateLabel}
            </span>
            {event.recurrence && (
              <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">
                ↻ {event.recurrence}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1.5 flex-shrink-0">
          <button
            onClick={onMarkDone}
            className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl px-2.5 py-1 font-semibold hover:bg-emerald-100 transition-colors whitespace-nowrap"
          >
            ✓ Done
          </button>
          <button
            onClick={onDelete}
            className="text-xs text-slate-400 hover:text-red-500 rounded-xl px-2.5 py-1 font-semibold transition-colors text-center"
          >
            Delete
          </button>
        </div>
      </div>
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
              <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full font-medium">
                {unit.manufacturer}
              </span>
            )}
            {unit.equipmentType && (
              <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full font-medium">
                {unit.equipmentType}
              </span>
            )}
            {hs < 100 && (
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full border ${hc.bg} ${hc.text} ${hc.border}`}>
                {hs}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {onToggleFavorite && (
            <button
              onClick={onToggleFavorite}
              className={`p-1.5 rounded-xl transition-colors ${unit.isFavorite ? "text-yellow-500" : "text-slate-300 hover:text-yellow-400"}`}
              aria-label={unit.isFavorite ? "Remove from favorites" : "Add to favorites"}
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
          {unit.siteCustomerName && (
            <p className="text-xs text-slate-500 font-medium ml-9">{unit.siteCustomerName}</p>
          )}
          {unit.location && (
            <p className="text-xs text-slate-400 ml-9 mt-0.5">{unit.location}</p>
          )}
          <div className="flex flex-wrap gap-1.5 mt-2 ml-9 items-center">
            {unit.manufacturer && (
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                {unit.manufacturer}
              </span>
            )}
            {unit.equipmentType && (
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                {unit.equipmentType}
              </span>
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
                aria-label={unit.isFavorite ? "Remove from favorites" : "Add to favorites"}
              >
                <Star className={`w-3.5 h-3.5 ${unit.isFavorite ? "fill-yellow-400" : ""}`} />
              </button>
            )}
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>
          {hs < 100 && (
            <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full border ${hc.bg} ${hc.text} ${hc.border}`}>
              {hs}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function LogCard({
  log, unitMap, onClick,
}: {
  log: DiagnosticLog;
  unitMap: Record<string, UnitRecord>;
  onClick: () => void;
}) {
  const cfg = statusConfig(log.status);
  const unit = log.unitId ? unitMap[log.unitId] : null;
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-blue-300 hover:shadow-md transition-all active:scale-[0.98]"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-sm font-bold text-slate-900 line-clamp-1 flex-1">
          {log.diagnosisTitle ?? "Diagnosis"}
        </span>
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

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function RecordsPage() {
  const [, navigate] = useLocation();
  const { user: clerkUser, isLoaded } = useUser();

  const [units, setUnits] = useState<UnitRecord[]>([]);
  const [logs, setLogs] = useState<DiagnosticLog[]>([]);
  const [scheduledEvents, setScheduledEvents] = useState<ScheduledEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Section collapse state
  const [scheduleOpen, setScheduleOpen] = useState(true);
  const [unitsOpen, setUnitsOpen] = useState(true);
  const [diagOpen, setDiagOpen] = useState(true);
  const [libOpen, setLibOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);

  // Modals
  const [showAddEvent, setShowAddEvent] = useState(false);

  // Saved Units filters
  const [q, setQ] = useState("");
  const [mfgFilter, setMfgFilter] = useState("");

  const clientId = getClientId();
  const isLoggedIn = isLoaded && !!clerkUser && clientId.startsWith("user_");

  // ─── Data loading ────────────────────────────────────────────────────────────

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

  // ─── Favorite toggle ─────────────────────────────────────────────────────────

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

  // ─── Schedule event actions ───────────────────────────────────────────────────

  const markEventDone = useCallback(async (eventId: string) => {
    setScheduledEvents((prev) => prev.filter((e) => e.id !== eventId));
    try {
      await fetch(`/api/scheduled-events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, isCompleted: true }),
      });
    } catch {
      loadData();
    }
  }, [clientId, loadData]);

  const deleteEvent = useCallback(async (eventId: string) => {
    setScheduledEvents((prev) => prev.filter((e) => e.id !== eventId));
    try {
      await fetch(`/api/scheduled-events/${eventId}?clientId=${encodeURIComponent(clientId)}`, {
        method: "DELETE",
      });
    } catch {
      loadData();
    }
  }, [clientId, loadData]);

  // ─── Derived data ─────────────────────────────────────────────────────────────

  const unitMap = useMemo(() => {
    const map: Record<string, UnitRecord> = {};
    units.forEach((u) => { map[u.id] = u; });
    return map;
  }, [units]);

  const favorites = useMemo(() => units.filter((u) => u.isFavorite), [units]);

  const recentlyViewed = useMemo(() => {
    const ids = getRecentlyViewedIds();
    return ids.map((id) => unitMap[id]).filter(Boolean) as UnitRecord[];
  }, [unitMap]);

  const activeWork = useMemo(() =>
    logs.filter((l) => ACTIVE_STATUSES.has(l.status)),
  [logs]);

  const partsWaiting = useMemo(() =>
    logs.filter((l) => l.status === "waiting-on-parts"),
  [logs]);

  const unresolvedCount = useMemo(() =>
    logs.filter((l) => l.status === "unresolved").length,
  [logs]);

  const monitoringCount = useMemo(() =>
    logs.filter((l) => l.status === "monitoring").length,
  [logs]);

  const returnVisitCount = useMemo(() =>
    logs.filter((l) => l.status === "return-visit" || l.status === "customer-callback").length,
  [logs]);

  const resolvedThisWeek = useMemo(() => {
    const cutoff = Date.now() - 7 * 86400000;
    return logs.filter((l) => l.status === "resolved" && l.timestamp > cutoff).length;
  }, [logs]);

  const recentDiags = useMemo(() => logs.slice(0, 10), [logs]);

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

  // Stats
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

  // Health score map
  const healthScoreMap = useMemo(() => {
    const map: Record<string, number> = {};
    units.forEach((u) => { map[u.id] = computeHealthScore(u.id, logs); });
    return map;
  }, [units, logs]);

  // ─── Auth guards ──────────────────────────────────────────────────────────────

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
        <p className="text-slate-500 text-sm mb-6 max-w-xs">
          Unit records and diagnostic history are saved to your account.
        </p>
        <Button
          onClick={() => navigate("/login")}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-6"
        >
          Sign In
        </Button>
        <button onClick={() => navigate("/")} className="mt-4 text-sm text-slate-400 hover:text-slate-600">
          Back to Diagnostics
        </button>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  const activeJobCount = activeWork.length;
  const scheduleCount = scheduledEvents.length;

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Sticky Header ────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/")}
              className="text-slate-400 hover:text-slate-700 transition-colors p-1"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
                <ThermometerSnowflake className="w-4 h-4 text-white" />
              </div>
              <span className="font-extrabold text-slate-900 text-sm">Field Hub</span>
            </div>
          </div>
          <Button
            onClick={() => navigate("/records/new")}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl h-9 px-3 text-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            New Unit
          </Button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-7">

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

            {/* ── Greeting ─────────────────────────────────────────────────────── */}
            <section>
              <p className="text-xl font-extrabold text-slate-900 leading-tight">
                {getGreeting(clerkUser?.firstName)}
              </p>
              <p className="text-sm text-slate-500 mt-0.5">
                {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
              </p>
            </section>

            {/* ── Stats Strip ──────────────────────────────────────────────────── */}
            <section aria-label="Dashboard summary">
              <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
                <StatChip
                  value={activeJobCount}
                  label="Active Jobs"
                  active={activeJobCount > 0}
                  color="bg-amber-50 text-amber-800 border-amber-200"
                  dimColor="bg-slate-50 text-slate-500 border-slate-200"
                />
                <StatChip
                  value={partsWaiting.length}
                  label="On Parts"
                  active={partsWaiting.length > 0}
                  color="bg-purple-50 text-purple-800 border-purple-200"
                  dimColor="bg-slate-50 text-slate-500 border-slate-200"
                />
                <StatChip
                  value={monitoringCount}
                  label="Monitoring"
                  active={monitoringCount > 0}
                  color="bg-blue-50 text-blue-800 border-blue-200"
                  dimColor="bg-slate-50 text-slate-500 border-slate-200"
                />
                <StatChip
                  value={returnVisitCount}
                  label="Return Visits"
                  active={returnVisitCount > 0}
                  color="bg-orange-50 text-orange-800 border-orange-200"
                  dimColor="bg-slate-50 text-slate-500 border-slate-200"
                />
                <StatChip
                  value={resolvedThisWeek}
                  label="Done / Week"
                  active={resolvedThisWeek > 0}
                  color="bg-emerald-50 text-emerald-800 border-emerald-200"
                  dimColor="bg-slate-50 text-slate-500 border-slate-200"
                />
                <StatChip
                  value={units.length}
                  label="Units"
                  active={false}
                  color="bg-blue-50 text-blue-800 border-blue-200"
                  dimColor="bg-slate-50 text-slate-500 border-slate-200"
                />
                <StatChip
                  value={scheduleCount}
                  label="Scheduled"
                  active={scheduleCount > 0}
                  color="bg-indigo-50 text-indigo-800 border-indigo-200"
                  dimColor="bg-slate-50 text-slate-500 border-slate-200"
                />
              </div>
            </section>

            {/* ── 1. Upcoming Schedule ─────────────────────────────────────────── */}
            <section aria-label="Upcoming Schedule">
              <SectionHeader
                title="Schedule"
                count={scheduleCount}
                open={scheduleOpen}
                onToggle={() => setScheduleOpen((v) => !v)}
                icon={Calendar}
                accent
              />
              {scheduleOpen && (
                <div className="mt-3 space-y-2.5">
                  {scheduledEvents.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center">
                      <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-500">No upcoming reminders</p>
                      <p className="text-xs text-slate-400 mt-1 mb-4">
                        Add reminders from any unit page or here.
                      </p>
                      <button
                        onClick={() => setShowAddEvent(true)}
                        className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-xl px-3 py-1.5 font-semibold hover:bg-blue-100 transition-colors"
                      >
                        <Plus className="w-3 h-3 inline mr-1" />
                        Add Reminder
                      </button>
                    </div>
                  ) : (
                    <>
                      {scheduledEvents.map((ev) => (
                        <ScheduleCard
                          key={ev.id}
                          event={ev}
                          unitMap={unitMap}
                          onMarkDone={() => markEventDone(ev.id)}
                          onDelete={() => deleteEvent(ev.id)}
                        />
                      ))}
                      <button
                        onClick={() => setShowAddEvent(true)}
                        className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 py-2 border border-dashed border-slate-200 rounded-2xl hover:border-blue-300 transition-colors font-semibold"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Reminder
                      </button>
                    </>
                  )}
                </div>
              )}
            </section>

            {/* ── 2. Active Work ───────────────────────────────────────────────── */}
            <section aria-label="Active Work">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className={`w-4 h-4 ${activeJobCount > 0 ? "text-amber-500" : "text-slate-400"}`} />
                <h2 className="font-bold text-slate-900 text-sm">Active Work</h2>
                {activeJobCount > 0 && (
                  <span className="bg-amber-100 text-amber-800 text-xs font-bold px-1.5 py-0.5 rounded-full">
                    {activeJobCount}
                  </span>
                )}
              </div>
              {activeWork.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-500">All clear</p>
                  <p className="text-xs text-slate-400 mt-1">No active follow-ups.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {partsWaiting.length > 0 && (
                    <div className="bg-purple-50 border border-purple-200 rounded-2xl px-4 py-2.5 flex items-center gap-2">
                      <Package className="w-3.5 h-3.5 text-purple-600" />
                      <span className="text-xs font-bold text-purple-800">
                        {partsWaiting.length} job{partsWaiting.length !== 1 ? "s" : ""} waiting on parts
                      </span>
                    </div>
                  )}
                  {activeWork
                    .filter((l) => l.status !== "waiting-on-parts")
                    .slice(0, 6)
                    .map((l) => (
                      <LogCard
                        key={l.id}
                        log={l}
                        unitMap={unitMap}
                        onClick={() => navigate(`/records/log/${l.id}`)}
                      />
                    ))}
                  {partsWaiting.slice(0, 3).map((l) => (
                    <LogCard
                      key={l.id}
                      log={l}
                      unitMap={unitMap}
                      onClick={() => navigate(`/records/log/${l.id}`)}
                    />
                  ))}
                  {activeWork.length > 9 && (
                    <p className="text-xs text-center text-slate-400 py-1">
                      +{activeWork.length - 9} more · scroll below to view all
                    </p>
                  )}
                </div>
              )}
            </section>

            {/* ── 3. Favorites ─────────────────────────────────────────────────── */}
            {favorites.length > 0 && (
              <section aria-label="Favorites">
                <div className="flex items-center gap-2 mb-3">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-400" />
                  <h2 className="font-bold text-slate-900 text-sm">Favorites</h2>
                  <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-1.5 py-0.5 rounded-full">
                    {favorites.length}
                  </span>
                </div>
                <div className="space-y-2.5">
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

            {/* ── 4. Recently Viewed ───────────────────────────────────────────── */}
            {recentlyViewed.length > 0 && (
              <section aria-label="Recently Viewed">
                <div className="flex items-center gap-2 mb-3">
                  <History className="w-4 h-4 text-slate-400" />
                  <h2 className="font-bold text-slate-900 text-sm">Recently Viewed</h2>
                </div>
                <div className="space-y-2.5">
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

            {/* ── 5. Saved Units ───────────────────────────────────────────────── */}
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
                      <p className="text-xs text-slate-400 mt-1 mb-4">
                        Save units to track service history.
                      </p>
                      <Button
                        onClick={() => navigate("/records/new")}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        Add First Unit
                      </Button>
                    </div>
                  ) : filteredUnits.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">No matches for "{q}"</p>
                  ) : (
                    <div className="space-y-2.5">
                      {filteredUnits.map((u) => (
                        <UnitCard
                          key={u.id}
                          unit={u}
                          healthScore={healthScoreMap[u.id]}
                          onClick={() => navigate(`/records/unit/${u.id}`)}
                          onToggleFavorite={(e) => toggleFavorite(u, e)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* ── 6. Recent Diagnostics ─────────────────────────────────────────── */}
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
                  {recentDiags.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center">
                      <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-500">No diagnostics yet</p>
                      <p className="text-xs text-slate-400 mt-1">Run a diagnosis to see results here.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {recentDiags.map((l) => (
                        <LogCard
                          key={l.id}
                          log={l}
                          unitMap={unitMap}
                          onClick={() => navigate(`/records/log/${l.id}`)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* ── 7. My Stats ──────────────────────────────────────────────────── */}
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

            {/* ── 8. Resolution Library ─────────────────────────────────────────── */}
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
                      {/* Category chips */}
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

          </>
        )}
      </div>

      {/* ── Add Reminder Modal ───────────────────────────────────────────────── */}
      {showAddEvent && (
        <ScheduledEventModal
          clientId={clientId}
          onClose={() => setShowAddEvent(false)}
          onCreated={(ev) => setScheduledEvents((prev) => [ev, ...prev])}
        />
      )}
    </div>
  );
}
