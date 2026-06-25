import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { useUser } from "@clerk/clerk-react";
import {
  Building2, Search, Plus, ChevronRight, Wrench,
  History, ThermometerSnowflake, CheckCircle2,
  AlertCircle, Clock, CircleDot, X, Star, Package,
  Phone, Calendar, Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

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

function formatDate(ts: number | string) {
  const d = typeof ts === "number" ? new Date(ts) : new Date(ts);
  const now = Date.now();
  const diff = now - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getResolutionCategory(log: DiagnosticLog): string {
  const text = ((log.diagnosisTitle ?? "") + " " + (log.resolutionNotes ?? "")).toLowerCase();
  for (const cat of RESOLUTION_CATEGORIES) {
    if (cat.keywords.some((kw) => text.includes(kw))) return cat.key;
  }
  return "other";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function OverviewCard({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className={`${color} rounded-2xl p-4 flex flex-col`}>
      <span className="text-2xl font-extrabold leading-none">{value}</span>
      <span className="text-xs font-semibold mt-1.5 opacity-70">{label}</span>
    </div>
  );
}

function SectionHeader({
  title, count, open, onToggle, icon: Icon,
}: {
  title: string;
  count?: number;
  open: boolean;
  onToggle: () => void;
  icon: React.ElementType;
}) {
  return (
    <button onClick={onToggle} className="w-full flex items-center justify-between py-1 group">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-slate-400" />
        <span className="font-bold text-slate-900 text-sm">{title}</span>
        {count !== undefined && count > 0 && (
          <span className="bg-slate-100 text-slate-600 text-xs font-bold px-1.5 py-0.5 rounded-full">{count}</span>
        )}
      </div>
      <ChevronRight
        className={`w-4 h-4 text-slate-400 transition-transform ${open ? "rotate-90" : ""}`}
      />
    </button>
  );
}

function CompactUnitCard({
  unit, onClick, onToggleFavorite,
}: {
  unit: UnitRecord;
  onClick: () => void;
  onToggleFavorite?: (e: React.MouseEvent) => void;
}) {
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
          <div className="flex flex-wrap gap-1 mt-1.5">
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
  unit, onClick, onToggleFavorite,
}: {
  unit: UnitRecord;
  onClick: () => void;
  onToggleFavorite?: (e: React.MouseEvent) => void;
}) {
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
          <div className="flex flex-wrap gap-1.5 mt-2 ml-9">
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
        <div className="flex items-center gap-0.5 flex-shrink-0 mt-0.5">
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Section collapse state
  const [unitsOpen, setUnitsOpen] = useState(true);
  const [diagOpen, setDiagOpen] = useState(true);
  const [libOpen, setLibOpen] = useState(false);

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
      const [uRes, lRes] = await Promise.all([
        fetch(`/api/units?clientId=${cid}`),
        fetch(`/api/diagnostic-logs?clientId=${cid}`),
      ]);
      const [uData, lData] = await Promise.all([uRes.json(), lRes.json()]);
      setUnits(uData.units ?? []);
      setLogs(lData.logs ?? []);
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
    logs.filter((l) => ACTIVE_STATUSES.has(l.status)).slice(0, 8),
  [logs]);

  const unresolvedCount = useMemo(() =>
    logs.filter((l) => ACTIVE_STATUSES.has(l.status)).length,
  [logs]);

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

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Sticky Header ──────────────────────────────────────────────────────── */}
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
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{error}</div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 animate-pulse h-16" />
            ))}
          </div>
        ) : (
          <>

            {/* ── 1. Overview ──────────────────────────────────────────────────── */}
            <section aria-label="Overview">
              <div className="grid grid-cols-2 gap-3">
                <OverviewCard
                  value={units.length}
                  label="Saved Units"
                  color="bg-blue-50 text-blue-900"
                />
                <OverviewCard
                  value={logs.length}
                  label="Diagnostics"
                  color="bg-slate-100 text-slate-800"
                />
                <OverviewCard
                  value={unresolvedCount}
                  label="Unresolved"
                  color={unresolvedCount > 0 ? "bg-amber-50 text-amber-900" : "bg-slate-100 text-slate-700"}
                />
                <OverviewCard
                  value={favorites.length}
                  label="Favorites"
                  color={favorites.length > 0 ? "bg-yellow-50 text-yellow-900" : "bg-slate-100 text-slate-700"}
                />
              </div>
            </section>

            {/* ── 2. Active Work ───────────────────────────────────────────────── */}
            <section aria-label="Active Work">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className={`w-4 h-4 ${unresolvedCount > 0 ? "text-amber-500" : "text-slate-400"}`} />
                <h2 className="font-bold text-slate-900 text-sm">Active Work</h2>
                {activeWork.length > 0 && (
                  <span className="bg-amber-100 text-amber-800 text-xs font-bold px-1.5 py-0.5 rounded-full">
                    {activeWork.length}
                  </span>
                )}
              </div>
              {activeWork.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-500">No active follow-ups</p>
                  <p className="text-xs text-slate-400 mt-1">Unresolved diagnostics will appear here.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {activeWork.map((l) => (
                    <LogCard key={l.id} log={l} unitMap={unitMap} onClick={() => navigate(`/logs/${l.id}`)} />
                  ))}
                </div>
              )}
            </section>

            {/* ── 3. Favorites ─────────────────────────────────────────────────── */}
            <section aria-label="Favorites">
              <div className="flex items-center gap-2 mb-3">
                <Star className={`w-4 h-4 ${favorites.length > 0 ? "text-yellow-500 fill-yellow-400" : "text-slate-400"}`} />
                <h2 className="font-bold text-slate-900 text-sm">Favorites</h2>
                {favorites.length > 0 && (
                  <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-1.5 py-0.5 rounded-full">
                    {favorites.length}
                  </span>
                )}
              </div>
              {favorites.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-5 text-center">
                  <Star className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-400">No favorites yet</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Tap the ★ on any unit card or the unit detail page to pin it here.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {favorites.map((u) => (
                    <CompactUnitCard
                      key={u.id}
                      unit={u}
                      onClick={() => navigate(`/records/${u.id}`)}
                      onToggleFavorite={(e) => toggleFavorite(u, e)}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* ── 4. Recently Viewed ───────────────────────────────────────────── */}
            {recentlyViewed.length > 0 && (
              <section aria-label="Recently Viewed">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <h2 className="font-bold text-slate-900 text-sm">Recently Viewed</h2>
                </div>
                <div className="space-y-2.5">
                  {recentlyViewed.map((u) => (
                    <CompactUnitCard
                      key={u.id}
                      unit={u}
                      onClick={() => navigate(`/records/${u.id}`)}
                      onToggleFavorite={(e) => toggleFavorite(u, e)}
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
                icon={Wrench}
              />
              {unitsOpen && (
                <div className="mt-3 space-y-3">
                  {/* Search + brand filter */}
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Search units…"
                        className="pl-9 bg-white rounded-xl border-slate-200 h-10 text-sm"
                      />
                      {q && (
                        <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                          <X className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                      )}
                    </div>
                    {manufacturers.length > 1 && (
                      <div className="relative">
                        <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                        <select
                          value={mfgFilter}
                          onChange={(e) => setMfgFilter(e.target.value)}
                          className="h-10 pl-8 pr-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 font-medium appearance-none max-w-[120px]"
                        >
                          <option value="">All</option>
                          {manufacturers.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                    )}
                  </div>

                  {filteredUnits.length === 0 ? (
                    <div className="text-center py-10">
                      <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-bold text-slate-400 text-sm">
                        {q || mfgFilter ? "No units match" : "No saved units yet"}
                      </p>
                      {!q && !mfgFilter && (
                        <>
                          <p className="text-xs text-slate-400 mt-1">
                            Scan a nameplate or add a unit manually.
                          </p>
                          <Button
                            onClick={() => navigate("/records/new")}
                            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl"
                            size="sm"
                          >
                            <Plus className="w-4 h-4 mr-1.5" />
                            Add First Unit
                          </Button>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {filteredUnits.map((u) => (
                        <UnitCard
                          key={u.id}
                          unit={u}
                          onClick={() => navigate(`/records/${u.id}`)}
                          onToggleFavorite={(e) => toggleFavorite(u, e)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* ── 6. Recent Diagnostics ────────────────────────────────────────── */}
            <section aria-label="Recent Diagnostics">
              <SectionHeader
                title="Recent Diagnostics"
                count={logs.length}
                open={diagOpen}
                onToggle={() => setDiagOpen((v) => !v)}
                icon={History}
              />
              {diagOpen && (
                <div className="mt-3">
                  {recentDiags.length === 0 ? (
                    <div className="text-center py-10">
                      <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-bold text-slate-400 text-sm">No diagnostic history yet</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Run a diagnosis and results will appear here.
                      </p>
                      <Button
                        onClick={() => navigate("/")}
                        className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl"
                        size="sm"
                      >
                        Start Diagnosis
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {recentDiags.map((l) => (
                        <LogCard key={l.id} log={l} unitMap={unitMap} onClick={() => navigate(`/logs/${l.id}`)} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* ── 7. Resolution Library ────────────────────────────────────────── */}
            <section aria-label="Resolution Library">
              <SectionHeader
                title="Resolution Library"
                count={resolvedLogs.length}
                open={libOpen}
                onToggle={() => setLibOpen((v) => !v)}
                icon={CheckCircle2}
              />
              {libOpen && (
                <div className="mt-3">
                  {resolvedLogs.length === 0 ? (
                    <div className="text-center py-10">
                      <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-bold text-slate-400 text-sm">No resolved repairs yet</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Resolved diagnostics will appear here after you close out issues.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Category chips */}
                      <div className="flex flex-wrap gap-2">
                        {RESOLUTION_CATEGORIES.filter((c) => resolutionGroups[c.key]?.length).map((cat) => (
                          <span
                            key={cat.key}
                            className="bg-emerald-50 text-emerald-800 text-xs font-semibold px-2.5 py-1 rounded-full border border-emerald-200"
                          >
                            {cat.label} ({resolutionGroups[cat.key].length})
                          </span>
                        ))}
                        {resolutionGroups["other"]?.length ? (
                          <span className="bg-slate-100 text-slate-600 text-xs font-semibold px-2.5 py-1 rounded-full border border-slate-200">
                            Other ({resolutionGroups["other"].length})
                          </span>
                        ) : null}
                      </div>
                      {/* Log list */}
                      <div className="space-y-2.5">
                        {resolvedLogs.slice(0, 10).map((l) => (
                          <LogCard key={l.id} log={l} unitMap={unitMap} onClick={() => navigate(`/logs/${l.id}`)} />
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

      <div className="h-10" />
    </div>
  );
}
