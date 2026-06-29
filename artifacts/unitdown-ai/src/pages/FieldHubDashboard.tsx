/**
 * FieldHubDashboard — UnitDown 2.0 Field Hub
 * Route: /dashboard  (signed-in users only)
 *
 * All data comes from real API endpoints.
 * Every section shows an honest empty state when data is absent.
 * No mock data, no fake counts.
 */
import { useState, useEffect, useCallback, type ElementType } from "react";
import { useLocation } from "wouter";
import { useUser } from "@clerk/clerk-react";
import {
  ThermometerSnowflake,
  Briefcase,
  Plus,
  Calendar,
  ChevronRight,
  Stethoscope,
  Building2,
  Wrench,
} from "lucide-react";
import { useJobMode } from "@/context/JobModeContext";
import { ScheduleJobWizard, type ScheduleWizardResult } from "@/pages/jmp/ScheduleJobWizard";
import { useToast } from "@/hooks/use-toast";
import { AppNav } from "@/components/AppNav";

// ── Minimal types matching the live API response shapes ──────────────────────

interface UnitSummary {
  id: string;
  nickname: string | null;
  siteCustomerName: string | null;
  equipmentType: string | null;
  manufacturer: string | null;
  modelNumber: string | null;
  location: string | null;
  lifecycleStatus: string | null;
  isArchived: boolean;
  updatedAt: number;
}

interface DiagLogSummary {
  id: string;
  symptoms: string | null;
  diagnosisTitle: string | null;
  timestamp: number;
}

interface ScheduledEventSummary {
  id: string;
  title: string;
  scheduledDate: number;
  eventType: string | null;
  isCompleted: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(ms: number): string {
  const diff = Date.now() - ms;
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (minutes < 2) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatScheduledDate(ms: number): string {
  const d = new Date(ms);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function greet(name: string | null | undefined): string {
  const h = new Date().getHours();
  const greeting = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return name ? `${greeting}, ${name}` : greeting;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function FieldHubDashboard() {
  const [, navigate] = useLocation();
  const { user: clerkUser, isLoaded } = useUser();
  const { pendingJobIds, loadPendingJobs } = useJobMode();
  const { toast } = useToast();

  const [units, setUnits] = useState<UnitSummary[]>([]);
  const [diagLogs, setDiagLogs] = useState<DiagLogSummary[]>([]);
  const [scheduledEvents, setScheduledEvents] = useState<ScheduledEventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScheduleWizard, setShowScheduleWizard] = useState(false);

  const clientId = clerkUser?.id ?? "";

  const loadData = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const cid = encodeURIComponent(clientId);
      const [unitsRes, logsRes, eventsRes] = await Promise.allSettled([
        fetch(`/api/units?clientId=${cid}`),
        fetch(`/api/diagnostic-logs?clientId=${cid}`),
        fetch(`/api/scheduled-events?clientId=${cid}&upcoming=true`),
      ]);

      if (unitsRes.status === "fulfilled" && unitsRes.value.ok) {
        const d = await unitsRes.value.json() as { units?: UnitSummary[] };
        setUnits((d.units ?? []).filter((u) => !u.isArchived));
      }
      if (logsRes.status === "fulfilled" && logsRes.value.ok) {
        const d = await logsRes.value.json() as { logs?: DiagLogSummary[]; diagnosticLogs?: DiagLogSummary[] };
        setDiagLogs((d.logs ?? d.diagnosticLogs ?? []).slice(0, 5));
      }
      if (eventsRes.status === "fulfilled" && eventsRes.value.ok) {
        const d = await eventsRes.value.json() as { events?: ScheduledEventSummary[] };
        setScheduledEvents(d.events ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    if (isLoaded && !clerkUser) {
      navigate("/login");
    }
  }, [isLoaded, clerkUser, navigate]);

  useEffect(() => {
    if (clientId) void loadData();
  }, [clientId, loadData]);

  async function handleScheduleCreate(result: ScheduleWizardResult) {
    setShowScheduleWizard(false);
    if (!clientId) return;
    try {
      const resp = await fetch("/api/scheduled-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          event: {
            title: result.title,
            scheduledDate: result.scheduledMs,
            eventType: "reminder",
            notes: null,
          },
        }),
      });
      if (resp.ok) {
        toast({ title: "Job scheduled", description: result.title });
        void loadData();
      } else {
        toast({ title: "Could not save schedule", variant: "destructive" });
      }
    } catch {
      toast({ title: "Could not save schedule", variant: "destructive" });
    }
  }

  const pendingJobs = pendingJobIds.length > 0 ? loadPendingJobs() : [];
  const activeJobs = pendingJobs.filter(
    (j) => j.status === "active" || j.status === "paused",
  );

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <ThermometerSnowflake className="w-8 h-8 text-blue-600 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 pb-12">

      <AppNav active="dashboard" />

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-7">

        {/* ── Welcome ─────────────────────────────────────────────────────────── */}
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            {greet(clerkUser?.firstName)}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">{today}</p>
        </div>

        {/* ── Quick Actions ────────────────────────────────────────────────────── */}
        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
            Quick Actions
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {([
              { icon: Stethoscope, label: "Diagnose",     action: () => navigate("/diagnose"),           cls: "text-blue-600 bg-blue-50"    },
              { icon: Plus,        label: "New Unit",      action: () => navigate("/records/new"),        cls: "text-emerald-600 bg-emerald-50" },
              { icon: Calendar,    label: "Schedule",      action: () => setShowScheduleWizard(true),     cls: "text-orange-600 bg-orange-50" },
              { icon: Briefcase,   label: "Job Mode",      action: () => navigate("/job"),                cls: "text-violet-600 bg-violet-50" },
              { icon: Wrench,      label: "Records",       action: () => navigate("/records"),            cls: "text-slate-600 bg-slate-100"  },
            ] as { icon: ElementType; label: string; action: () => void; cls: string }[]).map(({ icon: Icon, label, action, cls }) => (
              <button
                key={label}
                onClick={action}
                className="flex flex-col items-center gap-2 p-3 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-sm active:scale-95 transition-all text-center"
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${cls}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-semibold text-slate-700 leading-tight">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Stats row ────────────────────────────────────────────────────────── */}
        {!loading && (
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => navigate("/records")}
              className="bg-white rounded-xl border border-slate-200 px-4 py-3 text-left hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <p className="text-2xl font-extrabold text-slate-900">{units.length}</p>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">Saved Units</p>
            </button>
            <button
              onClick={() => navigate("/job")}
              className="bg-white rounded-xl border border-slate-200 px-4 py-3 text-left hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <p className="text-2xl font-extrabold text-slate-900">{activeJobs.length}</p>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">Active Jobs</p>
            </button>
            <button
              onClick={() => setShowScheduleWizard(true)}
              className="bg-white rounded-xl border border-slate-200 px-4 py-3 text-left hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <p className="text-2xl font-extrabold text-slate-900">{scheduledEvents.length}</p>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">Upcoming</p>
            </button>
          </div>
        )}

        {/* ── Active Jobs ──────────────────────────────────────────────────────── */}
        {activeJobs.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Active Jobs</p>
              <button
                onClick={() => navigate("/job")}
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                Open Job Mode
              </button>
            </div>
            <div className="space-y-2">
              {activeJobs.slice(0, 3).map((job) => (
                <button
                  key={job.id}
                  onClick={() => navigate(`/job/${job.id}`)}
                  className="w-full flex items-center gap-3 bg-white rounded-xl border border-blue-200 px-4 py-3 hover:border-blue-400 hover:shadow-sm transition-all text-left"
                >
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Briefcase className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {job.title || job.unitLabel || job.customer || "Service Job"}
                    </p>
                    <p className="text-xs text-slate-500 capitalize">{job.status}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ── Saved Equipment ──────────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Saved Equipment</p>
            <button
              onClick={() => navigate("/records")}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              View all
            </button>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl border border-slate-200 px-4 py-3 animate-pulse h-14"
                />
              ))}
            </div>
          ) : units.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 border-dashed px-6 py-8 text-center">
              <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-500">No equipment saved yet</p>
              <p className="text-xs text-slate-400 mt-1 mb-3">
                Scan a nameplate or enter details manually to save your first unit.
              </p>
              <button
                onClick={() => navigate("/records/new")}
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                + Add First Unit
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {units.slice(0, 5).map((unit) => (
                <button
                  key={unit.id}
                  onClick={() => navigate(`/records/${unit.id}`)}
                  className="w-full flex items-center gap-3 bg-white rounded-xl border border-slate-200 px-4 py-3 hover:border-blue-300 hover:shadow-sm transition-all text-left"
                >
                  <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {unit.nickname || unit.equipmentType || "Unit"}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {[unit.siteCustomerName, unit.location]
                        .filter(Boolean)
                        .join(" · ") || unit.manufacturer || "—"}
                    </p>
                  </div>
                  {unit.lifecycleStatus &&
                    unit.lifecycleStatus !== "active" && (
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-50 rounded px-1.5 py-0.5 flex-shrink-0 capitalize">
                        {unit.lifecycleStatus}
                      </span>
                    )}
                  <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                </button>
              ))}
              {units.length > 5 && (
                <button
                  onClick={() => navigate("/records")}
                  className="w-full text-center text-xs font-semibold text-slate-500 hover:text-blue-600 py-2 transition-colors"
                >
                  + {units.length - 5} more unit{units.length - 5 !== 1 ? "s" : ""}
                </button>
              )}
            </div>
          )}
        </section>

        {/* ── Recent Diagnostics ───────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              Recent Diagnostics
            </p>
            <button
              onClick={() => navigate("/diagnose")}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              Run diagnosis
            </button>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl border border-slate-200 px-4 py-3 animate-pulse h-14"
                />
              ))}
            </div>
          ) : diagLogs.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 border-dashed px-6 py-6 text-center">
              <Stethoscope className="w-7 h-7 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-500">No diagnostics yet</p>
              <p className="text-xs text-slate-400 mt-1 mb-3">
                Run a diagnosis to see your history here.
              </p>
              <button
                onClick={() => navigate("/diagnose")}
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                Run First Diagnosis
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {diagLogs.map((log) => (
                <button
                  key={log.id}
                  onClick={() => navigate(`/logs/${log.id}`)}
                  className="w-full flex items-center gap-3 bg-white rounded-xl border border-slate-200 px-4 py-3 hover:border-blue-300 hover:shadow-sm transition-all text-left"
                >
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Stethoscope className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {log.diagnosisTitle || "Diagnosis"}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{log.symptoms || "—"}</p>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400 flex-shrink-0 whitespace-nowrap">
                    {formatRelativeTime(log.timestamp)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* ── Upcoming Scheduled Work ──────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              Upcoming Schedule
            </p>
            <button
              onClick={() => setShowScheduleWizard(true)}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              + Schedule Job
            </button>
          </div>

          {loading ? (
            <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 animate-pulse h-14" />
          ) : scheduledEvents.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 border-dashed px-6 py-6 text-center">
              <Calendar className="w-7 h-7 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-500">No upcoming work scheduled</p>
              <p className="text-xs text-slate-400 mt-1 mb-3">Schedule a job to see it here.</p>
              <button
                onClick={() => setShowScheduleWizard(true)}
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                Schedule First Job
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {scheduledEvents.slice(0, 5).map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 px-4 py-3"
                >
                  <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-4 h-4 text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{ev.title}</p>
                    <p className="text-xs text-slate-500">
                      {formatScheduledDate(ev.scheduledDate)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </main>

      {/* ── Schedule Job Wizard ──────────────────────────────────────────────── */}
      {showScheduleWizard && (
        <ScheduleJobWizard
          onClose={() => setShowScheduleWizard(false)}
          onCreate={handleScheduleCreate}
        />
      )}
    </div>
  );
}
