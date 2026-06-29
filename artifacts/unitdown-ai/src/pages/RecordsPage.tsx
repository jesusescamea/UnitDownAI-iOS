/**
 * RecordsPage — UnitDown 2.0 Equipment Records
 * Route: /records  (signed-in only)
 *
 * Clean equipment list with search, type filter, and health status.
 * All dashboard-mode content (KPI cards, calendar, Priority Center, Active Work)
 * now lives in /dashboard (FieldHubDashboard). This page is equipment CRUD only.
 */

import { useState, useEffect, useCallback, useMemo, type MouseEvent } from "react";
import { useLocation } from "wouter";
import { useUser } from "@clerk/clerk-react";
import {
  Building2, Search, Plus, ChevronRight, Star,
  MapPin, AlertCircle, CircleDot, CheckCircle2,
  Calendar, Package, Phone, Clock, X, Filter,
} from "lucide-react";
import RtuIcon from "@/components/RtuIcon";
import { AppNav } from "@/components/AppNav";

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
  status: string;
  timestamp: number;
}

type UnitStatus =
  | "critical"
  | "follow-up"
  | "monitoring"
  | "operational"
  | "archived";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getClientId(): string {
  try { return localStorage.getItem("unitdown_client_id") ?? ""; } catch { return ""; }
}

function formatDate(ts: string | number): string {
  const d = typeof ts === "number" ? new Date(ts) : new Date(ts);
  const diff = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return `${diff}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const ACTIVE_STATUSES = new Set([
  "unresolved", "monitoring", "waiting-on-parts", "return-visit", "customer-callback",
]);
const CRITICAL_STATUSES = new Set(["unresolved", "waiting-on-parts", "return-visit", "customer-callback"]);

function computeHealthScore(unitId: string, logs: DiagnosticLog[]): number {
  const unitLogs = logs.filter((l) => l.unitId === unitId).slice(0, 5);
  if (unitLogs.length === 0) return 100;
  let score = 100;
  for (const l of unitLogs) {
    if (CRITICAL_STATUSES.has(l.status)) score = Math.min(score, 45);
    else if (l.status === "monitoring") score = Math.min(score, 72);
  }
  return score;
}

function computeUnitStatus(unit: UnitRecord, logs: DiagnosticLog[]): UnitStatus {
  if (unit.isArchived) return "archived";
  const unitLogs = logs.filter((l) => l.unitId === unit.id);
  const active = unitLogs.filter((l) => ACTIVE_STATUSES.has(l.status));
  if (active.some((l) => CRITICAL_STATUSES.has(l.status))) return "critical";
  if (active.some((l) => l.status === "return-visit")) return "follow-up";
  if (active.some((l) => l.status === "monitoring")) return "monitoring";
  if (active.length > 0) return "follow-up";
  return "operational";
}

function statusConfig(status: UnitStatus) {
  switch (status) {
    case "critical":     return { label: "Needs Service", Icon: AlertCircle,   bg: "bg-red-50 dark:bg-red-950/40",     text: "text-red-700 dark:text-red-400",     border: "border-red-200 dark:border-red-800",     dot: "bg-red-500" };
    case "follow-up":   return { label: "Follow-Up",     Icon: Calendar,      bg: "bg-amber-50 dark:bg-amber-950/40",  text: "text-amber-700 dark:text-amber-400", border: "border-amber-200 dark:border-amber-800",  dot: "bg-amber-500" };
    case "monitoring":  return { label: "Monitoring",    Icon: CircleDot,     bg: "bg-blue-50 dark:bg-blue-950/40",    text: "text-blue-700 dark:text-blue-400",   border: "border-blue-200 dark:border-blue-800",   dot: "bg-blue-500" };
    case "archived":    return { label: "Archived",      Icon: Package,       bg: "bg-slate-100 dark:bg-slate-800",    text: "text-slate-500 dark:text-slate-400", border: "border-slate-200 dark:border-slate-700", dot: "bg-slate-400" };
    default:            return { label: "Operational",   Icon: CheckCircle2,  bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-800", dot: "bg-emerald-500" };
  }
}

function matchesSearch(q: string, unit: UnitRecord): boolean {
  const needle = q.toLowerCase();
  return [
    unit.nickname, unit.siteCustomerName, unit.location,
    unit.manufacturer, unit.modelNumber, unit.equipmentType, unit.systemType,
  ].some((v) => v?.toLowerCase().includes(needle));
}

const EQUIPMENT_TYPES = ["RTU", "Split", "Chiller", "AHU", "Boiler", "Heat Pump", "VRF"];

// ─── Unit Card ────────────────────────────────────────────────────────────────

function UnitCard({
  unit, status, onClick, onToggleFavorite,
}: {
  unit: UnitRecord;
  status: UnitStatus;
  onClick: () => void;
  onToggleFavorite: (e: MouseEvent) => void;
}) {
  const sc = statusConfig(status);
  const showBadge = status !== "operational";
  const eqType = (unit.equipmentType ?? "").toLowerCase();
  const isRooftop = eqType.includes("rtu") || eqType.includes("rooftop") ||
    eqType.includes("package") || eqType.includes("make-up");

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800
        rounded-2xl px-4 py-4 shadow-sm
        hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md
        hover:scale-[1.005] transition-all duration-150 ease-out active:scale-[0.99]"
    >
      <div className="flex items-start gap-3">
        {/* Equipment avatar */}
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border mt-0.5 ${sc.bg} ${sc.border}`}>
          {isRooftop
            ? <RtuIcon className={`w-[18px] h-[18px] ${sc.text}`} style={{ width: "18px", height: "18px" }} />
            : <span className={`w-2.5 h-2.5 rounded-full ${sc.dot}`} />
          }
        </div>

        {/* Main content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <span className="font-extrabold text-slate-900 dark:text-white text-sm leading-snug truncate block">
                {unit.nickname ?? unit.modelNumber ?? "Unnamed Unit"}
              </span>
              {unit.siteCustomerName && (
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate">
                  {unit.siteCustomerName}
                </p>
              )}
              {unit.location && (
                <p className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-0.5 mt-0.5">
                  <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                  {unit.location}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={onToggleFavorite}
                className={`p-1 rounded-lg transition-colors ${
                  unit.isFavorite
                    ? "text-yellow-500"
                    : "text-slate-300 dark:text-slate-600 hover:text-yellow-400"
                }`}
              >
                <Star className={`w-3.5 h-3.5 ${unit.isFavorite ? "fill-yellow-400" : ""}`} />
              </button>
              <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600" />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
            {unit.equipmentType && (
              <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full font-bold">
                {unit.equipmentType}
              </span>
            )}
            {unit.manufacturer && (
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                {unit.manufacturer}
              </span>
            )}
            {showBadge ? (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ml-auto ${sc.bg} ${sc.text} ${sc.border}`}>
                {sc.label}
              </span>
            ) : (
              <span className="text-[10px] text-slate-300 dark:text-slate-600 ml-auto flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5" />
                {formatDate(unit.updatedAt)}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RecordsPage() {
  const [, navigate] = useLocation();
  const { user: clerkUser, isLoaded } = useUser();

  const clientId = clerkUser?.id ?? getClientId();
  const isLoggedIn = isLoaded && !!clerkUser;

  // State
  const [units, setUnits] = useState<UnitRecord[]>([]);
  const [logs, setLogs] = useState<DiagnosticLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [viewTab, setViewTab] = useState<"all" | "favorites">("all");
  const [showAll, setShowAll] = useState(false);

  // ─── Data load ───────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!isLoggedIn) return;
    setLoading(true);
    setError(null);
    try {
      const cid = encodeURIComponent(clientId);
      const [uRes, lRes] = await Promise.all([
        fetch(`/api/units?clientId=${cid}`),
        fetch(`/api/diagnostic-logs?clientId=${cid}`),
      ]);
      const uData = await uRes.json() as { units?: UnitRecord[] };
      const lData = await lRes.json() as { logs?: DiagnosticLog[] };
      setUnits(uData.units ?? []);
      setLogs(lData.logs ?? []);
    } catch {
      setError("Failed to load equipment.");
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn, clientId]);

  useEffect(() => {
    if (isLoggedIn) void loadData();
  }, [isLoggedIn, loadData]);

  // ─── Favorite toggle ─────────────────────────────────────────────────────

  const toggleFavorite = useCallback(async (unit: UnitRecord, e: MouseEvent) => {
    e.stopPropagation();
    const next = !unit.isFavorite;
    setUnits((prev) => prev.map((u) => u.id === unit.id ? { ...u, isFavorite: next } : u));
    try {
      await fetch(`/api/units/${unit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, unit: { isFavorite: next } }),
      });
    } catch {
      setUnits((prev) => prev.map((u) => u.id === unit.id ? unit : u));
    }
  }, [clientId]);

  // ─── Derived data ────────────────────────────────────────────────────────

  const unitStatusMap = useMemo(() => {
    const m: Record<string, UnitStatus> = {};
    for (const u of units) m[u.id] = computeUnitStatus(u, logs);
    return m;
  }, [units, logs]);

  const healthScoreMap = useMemo(() => {
    const m: Record<string, number> = {};
    for (const u of units) m[u.id] = computeHealthScore(u.id, logs);
    return m;
  }, [units, logs]);

  const activeUnits = useMemo(() => units.filter((u) => !u.isArchived), [units]);
  const issueCount = useMemo(() =>
    activeUnits.filter((u) => unitStatusMap[u.id] === "critical" || unitStatusMap[u.id] === "follow-up").length,
  [activeUnits, unitStatusMap]);

  const filteredUnits = useMemo(() => {
    let list = viewTab === "favorites"
      ? units.filter((u) => u.isFavorite)
      : units.filter((u) => !u.isArchived);

    if (typeFilter) {
      list = list.filter((u) =>
        (u.equipmentType ?? "").toLowerCase().includes(typeFilter.toLowerCase()),
      );
    }
    if (q) {
      list = list.filter((u) => matchesSearch(q, u));
    }
    // Sort: critical first, then by updatedAt desc
    list = [...list].sort((a, b) => {
      const sa = unitStatusMap[a.id] ?? "operational";
      const sb = unitStatusMap[b.id] ?? "operational";
      const priority = { critical: 0, "follow-up": 1, monitoring: 2, operational: 3, archived: 4 };
      const pa = priority[sa] ?? 3;
      const pb = priority[sb] ?? 3;
      if (pa !== pb) return pa - pb;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
    return list;
  }, [units, viewTab, typeFilter, q, unitStatusMap]);

  const displayedUnits = showAll ? filteredUnits : filteredUnits.slice(0, 8);

  // ─── Auth guard ──────────────────────────────────────────────────────────

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 bg-blue-50 dark:bg-blue-950 rounded-2xl flex items-center justify-center mb-4">
          <Building2 className="w-7 h-7 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mb-2">
          Sign in to view equipment
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 max-w-xs">
          Equipment records are saved to your account.
        </p>
        <button
          onClick={() => navigate("/login")}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-6 py-3 text-sm transition-colors"
        >
          Sign In
        </button>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 pb-16">
      <AppNav active="records" />

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5">

        {/* ── Page header ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Equipment
            </h1>
            {!loading && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {activeUnits.length} unit{activeUnits.length !== 1 ? "s" : ""}
                {issueCount > 0 && (
                  <span className="ml-2 text-amber-600 dark:text-amber-400 font-semibold">
                    · {issueCount} need{issueCount === 1 ? "s" : ""} attention
                  </span>
                )}
              </p>
            )}
          </div>
          <button
            onClick={() => navigate("/records/new")}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2.5 rounded-xl transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Unit
          </button>
        </div>

        {/* ── Search + view tabs ───────────────────────────────────────────── */}
        <div className="space-y-2.5">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
            <input
              type="search"
              placeholder="Search units, customers, models…"
              value={q}
              onChange={(e) => { setQ(e.target.value); setShowAll(false); }}
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-gray-700
                bg-white dark:bg-gray-900 text-slate-900 dark:text-white
                placeholder:text-slate-400 dark:placeholder:text-slate-500
                focus:outline-none focus:border-blue-400 dark:focus:border-blue-600 transition-colors"
            />
            {q && (
              <button
                onClick={() => { setQ(""); setShowAll(false); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* View tabs + type filter */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* All / Favorites tabs */}
            <div className="flex rounded-lg border border-slate-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900 flex-shrink-0">
              {(["all", "favorites"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => { setViewTab(tab); setShowAll(false); }}
                  className={`px-3 py-1.5 text-xs font-semibold transition-colors capitalize ${
                    viewTab === tab
                      ? "bg-blue-600 text-white"
                      : "text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                  }`}
                >
                  {tab === "favorites" ? "★ Saved" : "All"}
                </button>
              ))}
            </div>

            {/* Type filter chips */}
            <div className="flex gap-1.5 flex-wrap">
              {EQUIPMENT_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setTypeFilter((prev) => prev === type ? "" : type);
                    setShowAll(false);
                  }}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-colors ${
                    typeFilter === type
                      ? "bg-blue-600 text-white border-blue-600"
                      : "text-slate-600 dark:text-slate-400 border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-blue-400 dark:hover:border-blue-600"
                  }`}
                >
                  {type}
                </button>
              ))}
              {typeFilter && (
                <button
                  onClick={() => setTypeFilter("")}
                  className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
                >
                  <X className="w-2.5 h-2.5" />
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Active filter indicator */}
          {(q || typeFilter) && (
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-3 h-3 text-blue-500" />
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {filteredUnits.length} result{filteredUnits.length !== 1 ? "s" : ""}
                {q && <> for "<span className="font-semibold text-slate-700 dark:text-slate-300">{q}</span>"</>}
                {typeFilter && <> · type: <span className="font-semibold text-blue-600 dark:text-blue-400">{typeFilter}</span></>}
              </span>
            </div>
          )}
        </div>

        {/* ── Error ────────────────────────────────────────────────────────── */}
        {error && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-400 flex items-center justify-between">
            {error}
            <button onClick={() => void loadData()} className="font-bold hover:underline ml-3">
              Retry
            </button>
          </div>
        )}

        {/* ── Loading ──────────────────────────────────────────────────────── */}
        {loading && (
          <div className="space-y-2.5">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[76px] bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl animate-pulse"
              />
            ))}
          </div>
        )}

        {/* ── Unit list ────────────────────────────────────────────────────── */}
        {!loading && filteredUnits.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 border border-dashed border-slate-200 dark:border-gray-700 rounded-2xl px-6 py-12 text-center">
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-6 h-6 text-blue-400 dark:text-blue-500" />
            </div>
            {units.length === 0 ? (
              <>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">No equipment yet</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-5 max-w-xs mx-auto">
                  Add your first unit to start tracking service history and diagnostics.
                </p>
                <button
                  onClick={() => navigate("/records/new")}
                  className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add First Unit
                </button>
              </>
            ) : viewTab === "favorites" ? (
              <>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">No saved units</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Star a unit to add it to your saved list.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">No matches</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
                  {typeFilter ? `No ${typeFilter} units found.` : `No results for "${q}"`}
                </p>
                <button
                  onClick={() => { setQ(""); setTypeFilter(""); }}
                  className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline"
                >
                  Clear filters
                </button>
              </>
            )}
          </div>
        ) : !loading && (
          <div className="space-y-2.5">
            {displayedUnits.map((unit) => (
              <UnitCard
                key={unit.id}
                unit={unit}
                status={unitStatusMap[unit.id] ?? "operational"}
                onClick={() => navigate(`/records/${unit.id}`)}
                onToggleFavorite={(e) => void toggleFavorite(unit, e)}
              />
            ))}

            {!showAll && filteredUnits.length > 8 && (
              <button
                onClick={() => setShowAll(true)}
                className="w-full text-center text-xs font-bold text-blue-600 dark:text-blue-400 py-3
                  border border-dashed border-blue-200 dark:border-blue-900 rounded-2xl
                  hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
              >
                Show all {filteredUnits.length} units
              </button>
            )}
          </div>
        )}

        {/* ── Bottom quick-add prompt ──────────────────────────────────────── */}
        {!loading && units.length > 0 && (
          <div className="flex items-center justify-center pt-2">
            <button
              onClick={() => navigate("/records/new")}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 dark:text-slate-600 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add another unit
            </button>
          </div>
        )}

      </main>
    </div>
  );
}
