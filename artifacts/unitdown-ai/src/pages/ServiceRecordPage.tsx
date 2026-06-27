/**
 * ServiceRecordPage — the UnitDown Service Record (USS).
 *
 * Route: /job/:jobId/record
 *
 * Every completed job produces a permanent, standardized service record.
 * This page assembles the full USS document from the completed job's timeline.
 *
 * Design principle: Medical record / aircraft maintenance log aesthetic.
 * Clean, professional, enterprise-grade, printable.
 */

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  FileText,
  Clock,
  MapPin,
  User,
  Wrench,
  Activity,
  ClipboardList,
  Camera,
  Mic,
  Brain,
  Shield,
  CheckCircle2,
  AlertCircle,
  Download,
  ChevronRight,
  Building2,
  Gauge,
  Package,
  Archive,
  RefreshCw,
  RotateCcw,
  Share2,
  Printer,
  Mail,
  Copy,
  ExternalLink,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PartEntry {
  description: string;
  quantity?: string | number;
  partNumber?: string;
  eventId: string;
  timestamp: number;
}

interface ServiceRecordJob {
  id: string;
  userId: string;
  customer: string | null;
  site: string | null;
  unitLabel: string | null;
  title: string | null;
  status: string;
  startedAt: number;
  completedAt: number | null;
  usrId: string | null;
  serviceRecordStatus: string | null;
  metadata: Record<string, unknown> | null;
}

interface ServiceRecordEvent {
  id: string;
  eventType: string;
  title: string;
  timestamp: number;
  notes: string | null;
  voiceTranscript: string | null;
  voiceCorrected: string | null;
  measurements: Record<string, unknown> | null;
  parts: unknown;
  metadata: Record<string, unknown> | null;
}

interface ServiceRecord {
  job: ServiceRecordJob;
  usrId: string | null;
  serviceRecordStatus: string;
  generatedAt: number;
  timeline: ServiceRecordEvent[];
  measurements: Record<string, string[]> | null;
  parts: {
    replaced: PartEntry[];
    recommended: PartEntry[];
    pending: PartEntry[];
    unknown: PartEntry[];
  };
  photos: Record<string, string[]>;
  aiReport: {
    professional: string | null;
    customerSummary: string | null;
    invoiceSummary: string | null;
    confidence: number | null;
    officeReady: boolean | null;
    completenessScore: number | null;
  };
  equipmentMemory: { updates: string[] };
  verification: {
    operationalStatus: string | null;
    verifiedBy: string | null;
    notes: string | null;
    followUpRequired: boolean;
    returnVisit: boolean;
    safetyConcerns: boolean;
    warrantyMention: boolean;
  };
  exportFormats: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDuration(startMs: number, endMs: number): string {
  const mins = Math.round((endMs - startMs) / 60000);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function eventTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    dispatch: "Dispatch Received",
    arrived: "Arrived On Site",
    equipment_identified: "Equipment Identified",
    alarm_review: "Alarm Review",
    voice_note: "Voice Note",
    note: "Note",
    photo: "Photo Added",
    measurement: "Measurements Taken",
    part: "Part",
    recommendation: "Recommendation",
    service_report: "Service Report",
    verification: "Verification",
    completed: "Job Completed",
  };
  return labels[type] ?? type;
}

function eventTypeIcon(type: string) {
  const icons: Record<string, React.ElementType> = {
    dispatch: Clock,
    arrived: MapPin,
    equipment_identified: Building2,
    alarm_review: AlertCircle,
    voice_note: Mic,
    note: ClipboardList,
    photo: Camera,
    measurement: Gauge,
    part: Package,
    recommendation: ChevronRight,
    service_report: FileText,
    verification: Shield,
    completed: CheckCircle2,
  };
  const Icon = icons[type] ?? Activity;
  return Icon;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RecordSectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-slate-600" />
      </div>
      <div>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function DataRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-xs font-medium text-slate-500 w-36 shrink-0 pt-0.5 uppercase tracking-wide">
        {label}
      </span>
      <span
        className={`text-sm flex-1 ${
          value
            ? mono
              ? "font-mono font-semibold text-slate-900"
              : "text-slate-800"
            : "text-slate-400 italic"
        }`}
      >
        {value ?? "Not Recorded"}
      </span>
    </div>
  );
}

function PlaceholderSection({
  icon: Icon,
  title,
  message,
}: {
  icon: React.ElementType;
  title: string;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-slate-400" />
      </div>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="text-xs text-slate-400 mt-1 max-w-xs">{message}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string; className: string }> = {
    draft: { label: "Draft", className: "bg-amber-100 text-amber-800 border-amber-200" },
    completed: { label: "Completed", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
    verified: { label: "Verified", className: "bg-blue-100 text-blue-800 border-blue-200" },
    archived: { label: "Archived", className: "bg-slate-100 text-slate-600 border-slate-200" },
  };
  const cfg = configs[status] ?? configs.draft;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.className}`}
    >
      {cfg.label}
    </span>
  );
}

// ─── Export Sheet ─────────────────────────────────────────────────────────────

function ExportSheet({ onClose }: { onClose: () => void }) {
  const exportOptions = [
    { icon: FileText, label: "PDF Report", description: "Full professional PDF", soon: true },
    { icon: User, label: "Customer Copy", description: "Plain-English customer version", soon: true },
    { icon: Building2, label: "Office Copy", description: "Internal office report", soon: true },
    { icon: Archive, label: "USS Archive", description: "Portable JSON for future contractors", soon: true },
    { icon: Printer, label: "Print", description: "Browser print dialog", soon: false },
    { icon: Mail, label: "Email", description: "Send via email", soon: true },
    { icon: Share2, label: "Share Link", description: "Generate shareable link", soon: true },
    { icon: Copy, label: "Copy JSON", description: "Copy raw service record", soon: true },
  ];

  const handlePrint = () => {
    onClose();
    setTimeout(() => window.print(), 200);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-white shadow-2xl safe-area-pb max-h-[85dvh] overflow-y-auto">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-zinc-300" />
        </div>
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-slate-900">Export Service Record</h2>
              <p className="text-xs text-slate-500 mt-0.5">Choose your export format</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2">
            {exportOptions.map(({ icon: Icon, label, description, soon }) => (
              <button
                key={label}
                onClick={label === "Print" ? handlePrint : undefined}
                disabled={soon}
                className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors ${
                  soon
                    ? "border-slate-100 bg-slate-50 cursor-not-allowed opacity-60"
                    : "border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50 active:bg-blue-100"
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${soon ? "bg-slate-100" : "bg-blue-50"}`}>
                  <Icon className={`w-4 h-4 ${soon ? "text-slate-400" : "text-blue-600"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900">{label}</div>
                  <div className="text-xs text-slate-500">{description}</div>
                </div>
                {soon ? (
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide bg-slate-100 px-2 py-0.5 rounded-full">
                    Soon
                  </span>
                ) : (
                  <ExternalLink className="w-4 h-4 text-blue-400 shrink-0" />
                )}
              </button>
            ))}
          </div>

          <p className="text-center text-xs text-slate-400 mt-5 pb-2">
            Export formats are being added in upcoming releases.
          </p>
        </div>
      </div>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

interface ServiceRecordPageProps {
  jobId: string;
}

export function ServiceRecordPage({ jobId }: ServiceRecordPageProps) {
  const [, navigate] = useLocation();
  const [record, setRecord] = useState<ServiceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/jobs/${jobId}/service-record`, {
      headers: { "Content-Type": "application/json" },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json() as Promise<ServiceRecord>;
      })
      .then((data) => {
        if (!cancelled) {
          setRecord(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load service record");
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [jobId]);

  // ── Loading skeleton ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <div className="px-4 py-6 space-y-4 max-w-2xl mx-auto">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────

  if (error || !record) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
          <AlertCircle className="w-7 h-7 text-red-400" />
        </div>
        <h2 className="text-base font-semibold text-slate-900 mb-2">Record Unavailable</h2>
        <p className="text-sm text-slate-500 mb-6 max-w-xs">
          {error === "404"
            ? "This service record could not be found."
            : "The service record could not be loaded. Check your connection and try again."}
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate("/job")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Jobs
          </Button>
          <Button onClick={() => window.location.reload()}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const { job, usrId, serviceRecordStatus, timeline, measurements, parts, photos, aiReport, equipmentMemory, verification } = record;

  const jobLabel = [job.unitLabel, job.customer, job.site].filter(Boolean).join(" · ") || "Untitled Job";
  const hasPhotos = Object.values(photos).some((arr) => arr.length > 0);
  const totalEventCount = timeline.filter(
    (e) => e.eventType !== "dispatch" && e.eventType !== "completed",
  ).length;

  const voiceEvents = timeline.filter(
    (e) => e.eventType === "voice_note" && (e.voiceCorrected || e.voiceTranscript),
  );

  const measurementKeys = measurements ? Object.keys(measurements) : [];

  // Standard measurement display names
  const measurementLabels: Record<string, string> = {
    voltage: "Voltage",
    amperage: "Amperage",
    resistance: "Resistance",
    capacitance: "Capacitance",
    superheat: "Superheat",
    subcooling: "Subcooling",
    deltaT: "Delta T",
    suctionPressure: "Suction Pressure",
    dischargePressure: "Discharge Pressure",
    staticPressure: "Static Pressure",
    gasPressure: "Gas Pressure",
    refrigerantType: "Refrigerant Type",
    refrigerantRecovered: "Refrigerant Recovered",
    refrigerantAdded: "Refrigerant Added",
    supplyTemp: "Supply Temp",
    returnTemp: "Return Temp",
  };

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white">
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 print:hidden">
        <div className="flex items-center gap-2 px-4 h-14">
          <button
            onClick={() => navigate("/job")}
            className="p-1.5 -ml-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors shrink-0"
            aria-label="Back to jobs"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-slate-900 truncate">Service Record</div>
            <div className="text-xs text-slate-500 font-mono truncate">
              {usrId ?? "USR pending sync…"}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <StatusBadge status={serviceRecordStatus} />
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowExport(true)}
              className="h-8 px-3 text-xs rounded-lg border-slate-200 text-slate-700 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4 pb-12">

        {/* ── Cover Card ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Record header bar */}
          <div className="bg-slate-900 px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-5 h-5 rounded flex items-center justify-center bg-blue-500">
                    <FileText className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                    UnitDown Service Record
                  </span>
                </div>
                <div className="font-mono text-xl font-bold text-white tracking-wide">
                  {usrId ?? <span className="text-slate-500 text-base">USR-PENDING</span>}
                </div>
                {!usrId && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />
                    <span className="text-xs text-amber-400">
                      USR ID generates when this job syncs online
                    </span>
                  </div>
                )}
              </div>
              <StatusBadge status={serviceRecordStatus} />
            </div>
          </div>

          {/* Cover details */}
          <div className="px-5 py-4 space-y-0 divide-y divide-slate-100">
            <DataRow label="Customer" value={job.customer} />
            <DataRow label="Site" value={job.site} />
            <DataRow label="Equipment" value={job.unitLabel} />
            <DataRow label="Job Title" value={job.title} />
            <DataRow
              label="Date"
              value={job.startedAt ? formatDate(job.startedAt) : null}
            />
            <DataRow
              label="Start Time"
              value={job.startedAt ? formatTime(job.startedAt) : null}
            />
            <DataRow
              label="End Time"
              value={job.completedAt ? formatTime(job.completedAt) : null}
            />
            <DataRow
              label="Duration"
              value={
                job.startedAt && job.completedAt
                  ? formatDuration(job.startedAt, job.completedAt)
                  : null
              }
            />
            <DataRow
              label="Timeline Events"
              value={totalEventCount > 0 ? `${totalEventCount} recorded events` : null}
            />
            <DataRow label="Job Status" value={job.status.charAt(0).toUpperCase() + job.status.slice(1)} />
            <DataRow label="AI Confidence" value={aiReport.confidence !== null ? `${aiReport.confidence}%` : null} />
            <DataRow
              label="Office Ready"
              value={
                aiReport.officeReady === true
                  ? "Yes"
                  : aiReport.officeReady === false
                  ? "No"
                  : null
              }
            />
          </div>
        </div>

        {/* ── Timeline ───────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-1">
            <RecordSectionHeader
              icon={Clock}
              title="Service Timeline"
              subtitle="Chronological record of all job events"
            />
          </div>

          {timeline.length > 0 ? (
            <div className="px-5 pb-5">
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-3.5 top-0 bottom-0 w-px bg-slate-100" />

                <div className="space-y-0">
                  {timeline.map((evt, idx) => {
                    const Icon = eventTypeIcon(evt.eventType);
                    const isLast = idx === timeline.length - 1;
                    const isCompleted = evt.eventType === "completed";
                    return (
                      <div key={evt.id} className="relative flex gap-4">
                        {/* Icon node */}
                        <div
                          className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-3 border-2 ${
                            isCompleted
                              ? "bg-emerald-500 border-emerald-500"
                              : "bg-white border-slate-200"
                          }`}
                        >
                          <Icon
                            className={`w-3 h-3 ${isCompleted ? "text-white" : "text-slate-500"}`}
                          />
                        </div>

                        {/* Content */}
                        <div className={`flex-1 min-w-0 py-3 ${!isLast ? "border-b border-slate-50" : ""}`}>
                          <div className="flex items-start justify-between gap-2">
                            <span className={`text-sm font-medium ${isCompleted ? "text-emerald-700" : "text-slate-900"}`}>
                              {eventTypeLabel(evt.eventType)}
                            </span>
                            <span className="text-xs text-slate-400 shrink-0 mt-0.5">
                              {formatTime(evt.timestamp)}
                            </span>
                          </div>
                          {evt.title && evt.title !== eventTypeLabel(evt.eventType) && (
                            <p className="text-xs text-slate-600 mt-0.5">{evt.title}</p>
                          )}
                          {evt.voiceCorrected && (
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed border-l-2 border-blue-200 pl-2 italic">
                              {evt.voiceCorrected}
                            </p>
                          )}
                          {!evt.voiceCorrected && evt.notes && (
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                              {evt.notes}
                            </p>
                          )}
                          {evt.measurements && Object.keys(evt.measurements).length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {Object.entries(evt.measurements).map(([k, v]) => (
                                <span
                                  key={k}
                                  className="inline-flex items-center text-[10px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded"
                                >
                                  {k}: {String(v)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="px-5 pb-5">
              <PlaceholderSection
                icon={Clock}
                title="No timeline events"
                message="Timeline events will appear here as they are recorded during the job."
              />
            </div>
          )}
        </div>

        {/* ── Measurements ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-2">
            <RecordSectionHeader
              icon={Gauge}
              title="Measurements"
              subtitle="All instrument readings recorded during this service call"
            />
          </div>

          <div className="px-5 pb-5">
            {measurementKeys.length > 0 ? (
              <div className="grid grid-cols-2 gap-x-4">
                {measurementKeys.map((key) => {
                  const values = measurements![key];
                  return (
                    <div
                      key={key}
                      className="py-2.5 border-b border-slate-100 last:border-0"
                    >
                      <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">
                        {measurementLabels[key] ?? key}
                      </div>
                      <div className="text-sm font-semibold font-mono text-slate-900 mt-0.5">
                        {values.join(", ")}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div>
                {/* Standard measurement grid — all show "Not Recorded" */}
                <div className="grid grid-cols-2 gap-x-4">
                  {[
                    "Voltage",
                    "Amperage",
                    "Superheat",
                    "Subcooling",
                    "Delta T",
                    "Suction Pressure",
                    "Discharge Pressure",
                    "Static Pressure",
                    "Gas Pressure",
                    "Refrigerant Type",
                    "Refrigerant Recovered",
                    "Refrigerant Added",
                  ].map((label) => (
                    <div
                      key={label}
                      className="py-2.5 border-b border-slate-100 last:border-0"
                    >
                      <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">
                        {label}
                      </div>
                      <div className="text-xs text-slate-400 italic mt-0.5">
                        Not Recorded
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Parts ──────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-2">
            <RecordSectionHeader
              icon={Package}
              title="Parts"
              subtitle="Parts replaced, recommended, and pending"
            />
          </div>

          <div className="px-5 pb-5 space-y-4">
            {/* Replaced */}
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Parts Replaced
              </div>
              {parts.replaced.length > 0 ? (
                <div className="space-y-2">
                  {parts.replaced.map((p, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">{p.description}</p>
                        {(p.quantity || p.partNumber) && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            {[p.quantity && `Qty: ${p.quantity}`, p.partNumber && `P/N: ${p.partNumber}`]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic">Not Recorded</p>
              )}
            </div>

            {/* Recommended */}
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Recommended Parts
              </div>
              {parts.recommended.length > 0 ? (
                <div className="space-y-2">
                  {parts.recommended.map((p, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2.5">
                      <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                      <p className="text-sm text-slate-900">{p.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic">None</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Photos ─────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-2">
            <RecordSectionHeader
              icon={Camera}
              title="Photo Evidence"
              subtitle="Categorized site photos"
            />
          </div>
          <div className="px-5 pb-5">
            {hasPhotos ? (
              <div className="space-y-4">
                {Object.entries(photos).map(([category, urls]) =>
                  urls.length > 0 ? (
                    <div key={category}>
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 capitalize">
                        {category.replace(/([A-Z])/g, " $1").trim()}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {urls.map((url, i) => (
                          <div
                            key={i}
                            className="aspect-square rounded-lg bg-slate-100 overflow-hidden border border-slate-200"
                          >
                            <img
                              src={url}
                              alt={`${category} photo ${i + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null,
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {[
                  "Equipment Overview",
                  "Nameplate",
                  "Alarm Screen",
                  "Measurements",
                  "Failed Parts",
                  "Installed Parts",
                  "Verification",
                  "General",
                ].map((cat) => (
                  <div
                    key={cat}
                    className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0"
                  >
                    <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                      <Camera className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <span className="text-sm text-slate-500">{cat}</span>
                    <span className="ml-auto text-xs text-slate-400 italic">Not Recorded</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Voice Documentation ─────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-2">
            <RecordSectionHeader
              icon={Mic}
              title="Voice Documentation"
              subtitle="AI-corrected voice transcripts from the field"
            />
          </div>
          <div className="px-5 pb-5">
            {voiceEvents.length > 0 ? (
              <div className="space-y-4">
                {voiceEvents.map((evt) => (
                  <div key={evt.id} className="rounded-xl bg-slate-50 border border-slate-100 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Mic className="w-3.5 h-3.5 text-blue-500" />
                      <span className="text-xs font-medium text-slate-600">
                        {formatTime(evt.timestamp)}
                      </span>
                    </div>
                    {evt.voiceCorrected && (
                      <div className="mb-3">
                        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
                          AI Professional Version
                        </div>
                        <p className="text-sm text-slate-800 leading-relaxed">{evt.voiceCorrected}</p>
                      </div>
                    )}
                    {evt.voiceTranscript && (
                      <div>
                        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
                          Original Transcript
                        </div>
                        <p className="text-xs text-slate-500 italic leading-relaxed">{evt.voiceTranscript}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <PlaceholderSection
                icon={Mic}
                title="No voice notes"
                message="Voice notes recorded during the job will appear here."
              />
            )}
          </div>
        </div>

        {/* ── AI Professional Report (placeholder) ───────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-2">
            <RecordSectionHeader
              icon={Brain}
              title="AI Professional Report"
              subtitle="AI-generated professional service documentation"
            />
          </div>
          <div className="px-5 pb-5 space-y-4">
            {aiReport.professional ? (
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
                <p className="text-sm text-slate-800 leading-relaxed">{aiReport.professional}</p>
              </div>
            ) : (
              <PlaceholderSection
                icon={Brain}
                title="Professional Report"
                message="AI-generated professional report will appear here once generated."
              />
            )}

            {/* Customer Summary */}
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Customer Summary
              </div>
              {aiReport.customerSummary ? (
                <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
                  <p className="text-sm text-slate-800 leading-relaxed">{aiReport.customerSummary}</p>
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic">No Customer Summary generated.</p>
              )}
            </div>

            {/* Invoice Summary */}
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Invoice Summary
              </div>
              {aiReport.invoiceSummary ? (
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4">
                  <p className="text-sm text-slate-800 leading-relaxed">{aiReport.invoiceSummary}</p>
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic">No Invoice Summary generated.</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Equipment Memory Updates (placeholder) ──────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-2">
            <RecordSectionHeader
              icon={Brain}
              title="Equipment Memory Updates"
              subtitle="Observations that update this equipment's long-term history"
            />
          </div>
          <div className="px-5 pb-5">
            {equipmentMemory.updates.length > 0 ? (
              <div className="space-y-2">
                {equipmentMemory.updates.map((update, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2.5"
                  >
                    <Brain className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-slate-800">{update}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-5 text-center">
                <p className="text-sm text-slate-500 italic">No Equipment Memory generated.</p>
                <p className="text-xs text-slate-400 mt-1">
                  AI-extracted equipment observations will appear here in a future release.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Recommendations ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-2">
            <RecordSectionHeader
              icon={ClipboardList}
              title="Recommendations"
              subtitle="Future work and follow-up actions"
            />
          </div>
          <div className="px-5 pb-5">
            {timeline.filter((e) => e.eventType === "recommendation").length > 0 ? (
              <div className="space-y-2">
                {timeline
                  .filter((e) => e.eventType === "recommendation")
                  .map((evt) => (
                    <div
                      key={evt.id}
                      className="flex items-start gap-2.5 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2.5"
                    >
                      <ChevronRight className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                      <p className="text-sm text-slate-800">{evt.notes ?? evt.title}</p>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic">No recommendations recorded.</p>
            )}
          </div>
        </div>

        {/* ── Verification ────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-2">
            <RecordSectionHeader
              icon={Shield}
              title="Verification"
              subtitle="Operational status and technician confirmation"
            />
          </div>
          <div className="px-5 pb-5 space-y-0 divide-y divide-slate-100">
            <DataRow label="Operational Status" value={verification.operationalStatus} />
            <DataRow label="Verified By" value={verification.verifiedBy} />
            <DataRow label="Verification Notes" value={verification.notes} />
            <DataRow
              label="Follow-up Required"
              value={
                verification.followUpRequired === true
                  ? "Yes"
                  : verification.followUpRequired === false
                  ? "No"
                  : null
              }
            />
            <DataRow
              label="Return Visit"
              value={
                verification.returnVisit === true
                  ? "Yes"
                  : verification.returnVisit === false
                  ? "No"
                  : null
              }
            />
            <DataRow
              label="Safety Concerns"
              value={verification.safetyConcerns === true ? "Yes — review required" : "None noted"}
            />
            <DataRow
              label="Warranty"
              value={verification.warrantyMention === true ? "Warranty referenced" : "Not applicable"}
            />
          </div>
        </div>

        {/* ── Report Footer ────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  UnitDown Service Standard
                </div>
                <div className="font-mono text-sm font-semibold text-slate-700">
                  {usrId ?? "USR Pending"}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Generated {new Date(record.generatedAt).toLocaleString()}
                </div>
              </div>
              <div className="text-right">
                <StatusBadge status={serviceRecordStatus} />
                <div className="text-xs text-slate-400 mt-1">
                  {jobLabel}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Print-only footer */}
        <div className="hidden print:block text-center text-xs text-slate-400 py-4">
          UnitDown Service Record · {usrId ?? "USR Pending"} · Generated {new Date(record.generatedAt).toLocaleString()}
        </div>
      </div>

      {/* ── Export Sheet ─────────────────────────────────────────────────── */}
      {showExport && <ExportSheet onClose={() => setShowExport(false)} />}
    </div>
  );
}
