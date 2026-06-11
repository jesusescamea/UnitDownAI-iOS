import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useUser } from "@clerk/clerk-react";
import {
  Building2, Search, Plus, ChevronRight, Wrench, Calendar,
  Archive, History, ThermometerSnowflake, CheckCircle2,
  AlertCircle, Clock, CircleDot, X, Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

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
  timestamp: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getClientId(): string {
  try { return localStorage.getItem("unitdown_client_id") ?? ""; } catch { return ""; }
}

function statusConfig(status: string) {
  switch (status) {
    case "resolved":   return { label: "Resolved",   Icon: CheckCircle2,  className: "bg-emerald-100 text-emerald-800 border-emerald-200" };
    case "monitoring": return { label: "Monitoring", Icon: CircleDot,     className: "bg-blue-100 text-blue-800 border-blue-200" };
    default:           return { label: "Unresolved", Icon: AlertCircle,   className: "bg-amber-100 text-amber-800 border-amber-200" };
  }
}

function formatDate(ts: number | string) {
  const d = typeof ts === "number" ? new Date(ts) : new Date(ts);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// ─── Unit Card ────────────────────────────────────────────────────────────────

function UnitCard({ unit, onClick }: { unit: UnitRecord; onClick: () => void }) {
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
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">{unit.manufacturer}</span>
            )}
            {unit.equipmentType && (
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">{unit.equipmentType}</span>
            )}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" />
      </div>
    </button>
  );
}

// ─── Log Card ─────────────────────────────────────────────────────────────────

function LogCard({ log, unitMap, onClick }: { log: DiagnosticLog; unitMap: Record<string, UnitRecord>; onClick: () => void }) {
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {unit && (
            <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full truncate max-w-[140px]">
              {unit.nickname ?? unit.modelNumber ?? "Unit"}
            </span>
          )}
          {log.confidencePercent != null && (
            <span className="text-xs text-slate-400">{log.confidencePercent}% match</span>
          )}
        </div>
        <span className="text-xs text-slate-400 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatDate(log.timestamp)}
        </span>
      </div>
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RecordsPage() {
  const [, navigate] = useLocation();
  const { user: clerkUser, isLoaded } = useUser();

  const [activeTab, setActiveTab] = useState<"units" | "history">("units");
  const [units, setUnits] = useState<UnitRecord[]>([]);
  const [logs, setLogs] = useState<DiagnosticLog[]>([]);
  const [unitMap, setUnitMap] = useState<Record<string, UnitRecord>>({});
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientId = getClientId();
  const isLoggedIn = isLoaded && !!clerkUser && clientId.startsWith("user_");

  const loadUnits = useCallback(async () => {
    if (!isLoggedIn) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/units?clientId=${encodeURIComponent(clientId)}`);
      const d = await r.json();
      const list: UnitRecord[] = d.units ?? [];
      setUnits(list);
      const map: Record<string, UnitRecord> = {};
      list.forEach((u) => { map[u.id] = u; });
      setUnitMap(map);
    } catch { setError("Failed to load units"); }
    finally { setLoading(false); }
  }, [isLoggedIn, clientId]);

  const loadLogs = useCallback(async () => {
    if (!isLoggedIn) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/diagnostic-logs?clientId=${encodeURIComponent(clientId)}`);
      const d = await r.json();
      setLogs(d.logs ?? []);
    } catch { setError("Failed to load history"); }
    finally { setLoading(false); }
  }, [isLoggedIn, clientId]);

  useEffect(() => {
    if (isLoggedIn) { loadUnits(); loadLogs(); }
  }, [isLoggedIn, loadUnits, loadLogs]);

  const filteredUnits = units.filter((u) => {
    if (!q) return true;
    const lower = q.toLowerCase();
    return [u.nickname, u.siteCustomerName, u.location, u.manufacturer, u.modelNumber, u.serialNumber]
      .some((f) => f?.toLowerCase().includes(lower));
  });

  const filteredLogs = logs.filter((l) => {
    const matchQ = !q || [l.symptoms, l.diagnosisTitle, l.technicianNotes].some((f) => f?.toLowerCase().includes(q.toLowerCase()));
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    return matchQ && matchStatus;
  });

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
        <h2 className="text-xl font-extrabold text-slate-900 mb-2">Sign in to access Records</h2>
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

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
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
              <span className="font-extrabold text-slate-900 text-sm">Records</span>
            </div>
          </div>
          {activeTab === "units" && (
            <Button
              onClick={() => navigate("/records/new")}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl h-9 px-3 text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              New Unit
            </Button>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-4 flex">
          {(["units", "history"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setQ(""); setStatusFilter("all"); }}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab === "units" ? <Wrench className="w-4 h-4" /> : <History className="w-4 h-4" />}
              {tab === "units" ? "Saved Units" : "Diagnostic History"}
              {tab === "units" && units.length > 0 && (
                <span className="bg-slate-100 text-slate-600 text-xs font-bold px-1.5 py-0.5 rounded-full">{units.length}</span>
              )}
              {tab === "history" && logs.length > 0 && (
                <span className="bg-slate-100 text-slate-600 text-xs font-bold px-1.5 py-0.5 rounded-full">{logs.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">

        {/* Search + filter bar */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={activeTab === "units" ? "Search units…" : "Search history…"}
              className="pl-9 bg-white rounded-xl border-slate-200 h-10 text-sm"
            />
            {q && (
              <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5 text-slate-400" />
              </button>
            )}
          </div>
          {activeTab === "history" && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 px-3 font-medium"
            >
              <option value="all">All</option>
              <option value="unresolved">Unresolved</option>
              <option value="monitoring">Monitoring</option>
              <option value="resolved">Resolved</option>
            </select>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm mb-4">{error}</div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-1/2 mb-2" />
                <div className="h-3 bg-slate-100 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : activeTab === "units" ? (
          filteredUnits.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Building2 className="w-7 h-7 text-slate-400" />
              </div>
              <p className="font-bold text-slate-500 mb-1">{q ? "No units match your search" : "No saved units yet"}</p>
              <p className="text-sm text-slate-400 mb-4">{q ? "Try a different search term" : "Save unit info to attach diagnoses and track history."}</p>
              {!q && (
                <Button onClick={() => navigate("/records/new")} className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl">
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Unit
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredUnits.map((u) => (
                <UnitCard key={u.id} unit={u} onClick={() => navigate(`/records/${u.id}`)} />
              ))}
            </div>
          )
        ) : (
          filteredLogs.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <History className="w-7 h-7 text-slate-400" />
              </div>
              <p className="font-bold text-slate-500 mb-1">{q || statusFilter !== "all" ? "No matching logs" : "No diagnostic history yet"}</p>
              <p className="text-sm text-slate-400 mb-4">
                {q || statusFilter !== "all" ? "Try clearing filters" : "Run a diagnosis and results will appear here."}
              </p>
              {!q && statusFilter === "all" && (
                <Button onClick={() => navigate("/")} className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl">
                  Start Diagnosis
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((l) => (
                <LogCard key={l.id} log={l} unitMap={unitMap} onClick={() => navigate(`/logs/${l.id}`)} />
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
