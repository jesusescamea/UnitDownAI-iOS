import { useState, useEffect, useCallback } from "react";
import { useLocation, useParams } from "wouter";
import { useUser } from "@clerk/clerk-react";
import {
  ChevronRight, ThermometerSnowflake, AlertCircle, CheckCircle2,
  CircleDot, Clock, Wrench, Save, Loader2, ChevronDown, ChevronUp,
  ListChecks, Gauge, TriangleAlert, Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

interface DiagnosticLog {
  id: string;
  userId: string;
  unitId: string | null;
  symptoms: string;
  diagnosisId: string | null;
  diagnosisTitle: string | null;
  confidencePercent: number | null;
  result: any;
  technicianNotes: string | null;
  status: string;
  resolutionNotes: string | null;
  timestamp: number;
  createdAt: string;
}

interface UnitRecord {
  id: string;
  nickname: string | null;
  modelNumber: string | null;
  manufacturer: string | null;
  siteCustomerName: string | null;
  location: string | null;
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

function priorityColor(level?: string) {
  switch (level) {
    case "critical": return "bg-red-100 text-red-800 border-red-200";
    case "high":     return "bg-orange-100 text-orange-800 border-orange-200";
    case "medium":   return "bg-amber-100 text-amber-800 border-amber-200";
    default:         return "bg-emerald-100 text-emerald-800 border-emerald-200";
  }
}

function ExpandableSection({ title, icon: Icon, children }: {
  title: string; icon: React.FC<{ className?: string }>; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-bold text-slate-800">{title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

export default function DiagnosticLogDetailPage() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const { user: clerkUser, isLoaded } = useUser();

  const [log, setLog] = useState<DiagnosticLog | null>(null);
  const [unit, setUnit] = useState<UnitRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("unresolved");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [dirty, setDirty] = useState(false);

  const clientId = getClientId();
  const isLoggedIn = isLoaded && !!clerkUser && clientId.startsWith("user_");

  useEffect(() => {
    if (!isLoaded) return;
    if (!isLoggedIn || !params.id) { setLoading(false); return; }
    fetch(`/api/diagnostic-logs/${params.id}?clientId=${encodeURIComponent(clientId)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.log) {
          setLog(d.log);
          setNotes(d.log.technicianNotes ?? "");
          setStatus(d.log.status ?? "unresolved");
          setResolutionNotes(d.log.resolutionNotes ?? "");
          if (d.log.unitId) {
            fetch(`/api/units/${d.log.unitId}?clientId=${encodeURIComponent(clientId)}`)
              .then((r) => r.json())
              .then((ud) => { if (ud.unit) setUnit(ud.unit); })
              .catch(() => {});
          }
        } else {
          setError("Log not found");
        }
      })
      .catch(() => setError("Failed to load log"))
      .finally(() => setLoading(false));
  }, [isLoaded, isLoggedIn, clientId, params.id]);

  const handleSave = useCallback(async () => {
    if (!log) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/diagnostic-logs/${log.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          technicianNotes: notes,
          status,
          resolutionNotes,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      const d = await res.json();
      setLog(d.log);
      setDirty(false);
    } catch {
      setError("Failed to save changes");
    } finally {
      setSaving(false);
    }
  }, [log, clientId, notes, status, resolutionNotes]);

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !log) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
        <p className="font-bold text-slate-700">{error ?? "Log not found"}</p>
        <button onClick={() => navigate("/records")} className="mt-3 text-sm text-blue-600">Back to Records</button>
      </div>
    );
  }

  const cfg = statusConfig(status);
  const primary = log.result?.primary;
  const alternatives = log.result?.alternatives ?? [];

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(unit ? `/records/${unit.id}` : "/records")} className="text-slate-400 hover:text-slate-700 p-1">
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
                <ThermometerSnowflake className="w-4 h-4 text-white" />
              </div>
              <span className="font-extrabold text-slate-900 text-sm">Diagnosis Log</span>
            </div>
          </div>
          {dirty && (
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl h-9 px-3 text-xs"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-3.5 h-3.5 mr-1" />Save</>}
            </Button>
          )}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">

        {/* Summary card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h1 className="text-base font-extrabold text-slate-900 leading-tight flex-1">
              {log.diagnosisTitle ?? "Diagnosis"}
            </h1>
            {primary?.priorityLevel && (
              <Badge className={`text-xs border flex-shrink-0 ${priorityColor(primary.priorityLevel)}`}>
                {primary.priorityLevel.charAt(0).toUpperCase() + primary.priorityLevel.slice(1)} Priority
              </Badge>
            )}
          </div>

          {log.confidencePercent != null && (
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-500"
                  style={{ width: `${log.confidencePercent}%` }}
                />
              </div>
              <span className="text-xs font-bold text-slate-600">{log.confidencePercent}%</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5" />
            {new Date(log.timestamp).toLocaleString(undefined, {
              month: "short", day: "numeric", year: "numeric",
              hour: "numeric", minute: "2-digit",
            })}
          </div>

          {unit && (
            <button
              onClick={() => navigate(`/records/${unit.id}`)}
              className="mt-3 flex items-center gap-1.5 text-xs text-blue-600 font-semibold hover:underline"
            >
              <Wrench className="w-3.5 h-3.5" />
              {unit.nickname ?? unit.modelNumber ?? unit.manufacturer ?? "Unit"}
              {unit.siteCustomerName && <span className="text-slate-400 font-normal">— {unit.siteCustomerName}</span>}
            </button>
          )}
        </div>

        {/* Symptoms */}
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4">
          <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wide mb-1.5">Symptoms Entered</p>
          <p className="text-sm text-slate-700 leading-relaxed">{log.symptoms}</p>
        </div>

        {/* Why this fits */}
        {primary?.whyThisFits && (
          <div className="bg-blue-50 rounded-2xl border border-blue-200 p-4">
            <p className="text-xs font-extrabold text-blue-600 uppercase tracking-wide mb-1.5">Why This Fits</p>
            <p className="text-sm text-blue-800 leading-relaxed">{primary.whyThisFits}</p>
          </div>
        )}

        {/* Likely causes */}
        {primary?.likelyCauses?.length > 0 && (
          <ExpandableSection title="Likely Causes" icon={TriangleAlert}>
            <ol className="space-y-2 pt-1">
              {primary.likelyCauses.map((c: string, i: number) => (
                <li key={i} className="flex gap-2 text-sm text-slate-700">
                  <span className="flex-shrink-0 w-5 h-5 bg-amber-100 text-amber-800 text-xs font-bold rounded-full flex items-center justify-center">{i + 1}</span>
                  <span className="leading-relaxed">{c}</span>
                </li>
              ))}
            </ol>
          </ExpandableSection>
        )}

        {/* First checks */}
        {primary?.firstChecks?.length > 0 && (
          <ExpandableSection title="First Checks" icon={ListChecks}>
            <ol className="space-y-2 pt-1">
              {primary.firstChecks.map((c: string, i: number) => (
                <li key={i} className="text-sm text-slate-700 leading-relaxed border-b border-slate-100 pb-2 last:border-0 last:pb-0">{c}</li>
              ))}
            </ol>
          </ExpandableSection>
        )}

        {/* Meter checks */}
        {primary?.meterChecks?.length > 0 && (
          <ExpandableSection title="Meter Checks" icon={Gauge}>
            <ul className="space-y-2 pt-1">
              {primary.meterChecks.map((c: string, i: number) => (
                <li key={i} className="flex gap-2 text-sm text-slate-700">
                  <span className="text-blue-400 mt-0.5 flex-shrink-0">→</span>
                  <span className="leading-relaxed">{c}</span>
                </li>
              ))}
            </ul>
          </ExpandableSection>
        )}

        {/* Recommended action */}
        {primary?.recommendedAction && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wide mb-1.5">Recommended Action</p>
            <p className="text-sm text-slate-700 leading-relaxed">{primary.recommendedAction}</p>
          </div>
        )}

        {/* Risk note */}
        {primary?.riskNote && (
          <div className="bg-red-50 rounded-2xl border border-red-200 p-4">
            <p className="text-xs font-extrabold text-red-600 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <TriangleAlert className="w-3.5 h-3.5" />Risk Note
            </p>
            <p className="text-sm text-red-700 leading-relaxed">{primary.riskNote}</p>
          </div>
        )}

        {/* Alternatives */}
        {alternatives.length > 0 && (
          <div>
            <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wide mb-2">Alternative Diagnoses</p>
            <div className="space-y-2">
              {alternatives.map((alt: any, i: number) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-slate-800">{alt.title}</span>
                    {alt.confidencePercent != null && (
                      <span className="text-xs text-slate-400 font-semibold">{alt.confidencePercent}%</span>
                    )}
                  </div>
                  {alt.category && <p className="text-xs text-slate-400 mt-0.5">{alt.category}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status + Notes */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
          <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">Technician Notes</p>

          {/* Status selector */}
          <div>
            <p className="text-xs font-semibold text-slate-700 mb-2">Status</p>
            <div className="flex gap-2">
              {(["unresolved", "monitoring", "resolved"] as const).map((s) => {
                const c = statusConfig(s);
                const active = status === s;
                return (
                  <button
                    key={s}
                    onClick={() => { setStatus(s); setDirty(true); }}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      active ? `${c.className} border-current` : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <c.Icon className="w-3.5 h-3.5" />
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Technician notes */}
          <div>
            <p className="text-xs font-semibold text-slate-700 mb-1.5">Field Notes</p>
            <Textarea
              value={notes}
              onChange={(e) => { setNotes(e.target.value); setDirty(true); }}
              placeholder="Add notes about what you found, parts ordered, etc…"
              className="text-sm rounded-xl border-slate-200 resize-none"
              rows={3}
            />
          </div>

          {/* Resolution notes */}
          {status === "resolved" && (
            <div>
              <p className="text-xs font-semibold text-slate-700 mb-1.5">Resolution Notes</p>
              <Textarea
                value={resolutionNotes}
                onChange={(e) => { setResolutionNotes(e.target.value); setDirty(true); }}
                placeholder="What fixed it? Parts replaced, root cause confirmed…"
                className="text-sm rounded-xl border-slate-200 resize-none"
                rows={3}
              />
            </div>
          )}

          {dirty && (
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl h-11"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save Notes & Status
            </Button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{error}</div>
        )}
      </div>
    </div>
  );
}
