import { useState, useEffect, useCallback } from "react";
import { useLocation, useParams } from "wouter";
import { useUser } from "@clerk/clerk-react";
import {
  ChevronRight, Wrench, ThermometerSnowflake, Edit2, Trash2,
  Plus, History, CheckCircle2, AlertCircle, CircleDot, Clock,
  Zap, Thermometer, Hash, MapPin, Building2, Activity, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
  refrigerantType: string | null;
  voltage: string | null;
  phase: string | null;
  mca: string | null;
  mocp: string | null;
  rla: string | null;
  lra: string | null;
  capacityTons: string | null;
  manufactureDate: string | null;
  notes: string | null;
  nameplateImageUrl: string | null;
  isArchived: boolean;
  updatedAt: string;
}

interface DiagnosticLog {
  id: string;
  unitId: string | null;
  symptoms: string;
  diagnosisTitle: string | null;
  confidencePercent: number | null;
  status: string;
  timestamp: number;
  technicianNotes: string | null;
}

function getClientId(): string {
  try { return localStorage.getItem("unitdown_client_id") ?? ""; } catch { return ""; }
}

function statusConfig(status: string) {
  switch (status) {
    case "resolved":   return { label: "Resolved",   Icon: CheckCircle2, className: "bg-emerald-100 text-emerald-800 border-emerald-200" };
    case "monitoring": return { label: "Monitoring", Icon: CircleDot,    className: "bg-blue-100 text-blue-800 border-blue-200" };
    default:           return { label: "Unresolved", Icon: AlertCircle,  className: "bg-amber-100 text-amber-800 border-amber-200" };
  }
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 py-2 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-400 font-semibold w-28 flex-shrink-0 mt-0.5">{label}</span>
      <span className="text-xs text-slate-800 font-medium">{value}</span>
    </div>
  );
}

export default function UnitDetailPage() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const { user: clerkUser, isLoaded } = useUser();

  const [unit, setUnit] = useState<UnitRecord | null>(null);
  const [logs, setLogs] = useState<DiagnosticLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientId = getClientId();
  const isLoggedIn = isLoaded && !!clerkUser && clientId.startsWith("user_");

  useEffect(() => {
    if (!isLoggedIn || !params.id) return;
    const cid = encodeURIComponent(clientId);

    Promise.all([
      fetch(`/api/units/${params.id}?clientId=${cid}`).then((r) => r.json()),
      fetch(`/api/diagnostic-logs?clientId=${cid}&unitId=${encodeURIComponent(params.id)}`).then((r) => r.json()),
    ])
      .then(([uData, lData]) => {
        if (uData.unit) setUnit(uData.unit);
        else setError("Unit not found");
        setLogs(lData.logs ?? []);
      })
      .catch(() => setError("Failed to load unit"))
      .finally(() => setLoading(false));
  }, [isLoggedIn, clientId, params.id]);

  const handleArchive = useCallback(async () => {
    if (!unit || !window.confirm("Archive this unit? It will be hidden from your unit list.")) return;
    setArchiving(true);
    try {
      await fetch(`/api/units/${unit.id}?clientId=${encodeURIComponent(clientId)}`, { method: "DELETE" });
      navigate("/records");
    } catch {
      setArchiving(false);
    }
  }, [unit, clientId, navigate]);

  const handleDiagnoseThis = useCallback(() => {
    try {
      sessionStorage.setItem("unitdown_selected_unit_id", params.id);
      sessionStorage.setItem("unitdown_selected_unit_label",
        unit ? (unit.nickname ?? unit.modelNumber ?? unit.manufacturer ?? "Unit") : "Unit");
    } catch {}
    navigate("/");
  }, [params.id, unit, navigate]);

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !unit) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
        <p className="font-bold text-slate-700">{error ?? "Unit not found"}</p>
        <button onClick={() => navigate("/records")} className="mt-3 text-sm text-blue-600">Back to Records</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/records")} className="text-slate-400 hover:text-slate-700 p-1">
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
                <ThermometerSnowflake className="w-4 h-4 text-white" />
              </div>
              <span className="font-extrabold text-slate-900 text-sm truncate max-w-[160px]">
                {unit.nickname ?? unit.modelNumber ?? "Unit"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/records/${unit.id}/edit`)}
              className="text-slate-500 hover:text-slate-800 p-1.5 rounded-xl hover:bg-slate-100"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleArchive}
              disabled={archiving}
              className="text-slate-400 hover:text-red-500 p-1.5 rounded-xl hover:bg-red-50 disabled:opacity-50"
            >
              {archiving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">

        {/* Unit overview card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <Wrench className="w-5 h-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-extrabold text-slate-900 leading-tight">
                {unit.nickname ?? unit.modelNumber ?? "Unnamed Unit"}
              </h1>
              {unit.siteCustomerName && (
                <p className="text-sm text-slate-500 font-medium">{unit.siteCustomerName}</p>
              )}
              {unit.location && (
                <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" />{unit.location}
                </p>
              )}
            </div>
          </div>

          {/* Diagnosis CTA */}
          <Button
            onClick={handleDiagnoseThis}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl h-10 text-sm"
          >
            <Activity className="w-4 h-4 mr-2" />
            Diagnose This Unit
          </Button>
        </div>

        {/* Nameplate image */}
        {unit.nameplateImageUrl && (
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Nameplate Photo</p>
            <img
              src={unit.nameplateImageUrl}
              alt="Nameplate"
              className="w-full rounded-2xl border border-slate-200 object-cover max-h-48"
            />
          </div>
        )}

        {/* Equipment info */}
        {(unit.manufacturer || unit.modelNumber || unit.serialNumber || unit.equipmentType || unit.systemType || unit.refrigerantType || unit.capacityTons || unit.manufactureDate) && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wide mb-1">Equipment</p>
            <InfoRow label="Manufacturer" value={unit.manufacturer} />
            <InfoRow label="Model" value={unit.modelNumber} />
            <InfoRow label="Serial" value={unit.serialNumber} />
            <InfoRow label="Type" value={unit.equipmentType} />
            <InfoRow label="System" value={unit.systemType} />
            <InfoRow label="Refrigerant" value={unit.refrigerantType} />
            <InfoRow label="Capacity" value={unit.capacityTons ? `${unit.capacityTons} tons` : null} />
            <InfoRow label="Mfg. Date" value={unit.manufactureDate} />
          </div>
        )}

        {/* Electrical data */}
        {(unit.voltage || unit.phase || unit.mca || unit.mocp || unit.rla || unit.lra) && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wide mb-1">Electrical</p>
            <InfoRow label="Voltage" value={unit.voltage} />
            <InfoRow label="Phase" value={unit.phase} />
            <InfoRow label="MCA" value={unit.mca} />
            <InfoRow label="MOCP" value={unit.mocp} />
            <InfoRow label="RLA / FLA" value={unit.rla} />
            <InfoRow label="LRA" value={unit.lra} />
          </div>
        )}

        {/* Notes */}
        {unit.notes && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wide mb-2">Notes</p>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{unit.notes}</p>
          </div>
        )}

        {/* Diagnostic History for this unit */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">Diagnostic History</p>
            <span className="text-xs text-slate-400">{logs.length} log{logs.length !== 1 ? "s" : ""}</span>
          </div>
          {logs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
              <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400 font-medium">No diagnoses linked to this unit yet.</p>
              <p className="text-xs text-slate-400 mt-1">Select this unit when running a diagnosis to track history here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => {
                const cfg = statusConfig(log.status);
                return (
                  <button
                    key={log.id}
                    onClick={() => navigate(`/logs/${log.id}`)}
                    className="w-full text-left bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-blue-300 hover:shadow-md transition-all active:scale-[0.98]"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="text-sm font-bold text-slate-900 line-clamp-1 flex-1">
                        {log.diagnosisTitle ?? "Diagnosis"}
                      </span>
                      <Badge className={`text-xs border flex-shrink-0 flex items-center gap-1 ${cfg.className}`}>
                        <cfg.Icon className="w-3 h-3" />
                        {cfg.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2 mb-1.5">{log.symptoms}</p>
                    <div className="flex items-center justify-between">
                      {log.confidencePercent != null && (
                        <span className="text-xs text-slate-400">{log.confidencePercent}% match</span>
                      )}
                      <span className="text-xs text-slate-400 flex items-center gap-1 ml-auto">
                        <Clock className="w-3 h-3" />
                        {formatDate(log.timestamp)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
