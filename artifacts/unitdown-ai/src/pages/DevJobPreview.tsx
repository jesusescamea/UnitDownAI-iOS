/**
 * DEV-ONLY: /job-preview
 * Visual QA preview of the Active Job session screen.
 * Renders with 100% mock data — no auth, no API calls, no Clerk.
 * Blocked from rendering in production via import.meta.env.DEV guard.
 */

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, Briefcase, CheckCircle2, Clock, Mic, Camera,
  Gauge, Package, FileText, Plus, ChevronDown, ChevronRight,
  Wifi, AlertTriangle, MapPin, Wrench, Activity, Bell,
  ClipboardCheck, Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Mock data ────────────────────────────────────────────────────────────────

const JOB_START = Date.now() - 67 * 60 * 1000; // 1h 7m ago

interface MockEvent {
  id: string;
  type: string;
  label: string;
  notes: string | null;
  ts: number;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  detail?: string;
}

const MOCK_EVENTS: MockEvent[] = [
  {
    id: "e1",
    type: "dispatch",
    label: "Dispatch Received",
    notes: "No cooling complaint. Unit down since this morning. Blower fault on controller.",
    ts: JOB_START,
    icon: Bell,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  {
    id: "e2",
    type: "arrived",
    label: "Arrived On Site",
    notes: "Met with facility manager David Chen. Confirmed unit is RTU-18 on the east roof.",
    ts: JOB_START + 8 * 60 * 1000,
    icon: MapPin,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
  },
  {
    id: "e3",
    type: "alarm_review",
    label: "Checked Prodigy Alarm History",
    notes: "Accessed Prodigy controller. Reviewed alarm log.",
    ts: JOB_START + 18 * 60 * 1000,
    icon: Activity,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    detail: "Alarm 8 — Blower Fault",
  },
  {
    id: "e4",
    type: "note",
    label: "Alarm 8 Found",
    notes: "Alarm 8: Blower Fault. Controller detected blower motor failure. Unit locked out.",
    ts: JOB_START + 22 * 60 * 1000,
    icon: AlertTriangle,
    iconBg: "bg-red-50",
    iconColor: "text-red-600",
  },
  {
    id: "e5",
    type: "note",
    label: "Blower Section Inspected",
    notes: "Opened blower compartment. Visually inspected motor, belt, and drive assembly.",
    ts: JOB_START + 29 * 60 * 1000,
    icon: FileText,
    iconBg: "bg-slate-100",
    iconColor: "text-slate-600",
  },
  {
    id: "e6",
    type: "note",
    label: "Broken Belt Found",
    notes: "Belt completely severed. No signs of pulley damage. Sheaves in good condition. Belt failure is cause of Alarm 8.",
    ts: JOB_START + 33 * 60 * 1000,
    icon: Wrench,
    iconBg: "bg-orange-50",
    iconColor: "text-orange-600",
  },
  {
    id: "e7",
    type: "part",
    label: "Spare Belt Installed",
    notes: "Installed spare belt from truck stock. 3VX450 — correct cross-section and length.",
    ts: JOB_START + 44 * 60 * 1000,
    icon: Package,
    iconBg: "bg-violet-50",
    iconColor: "text-violet-600",
    detail: "Part: 3VX450 belt · Qty: 1",
  },
  {
    id: "e8",
    type: "note",
    label: "Unit Verified Operational",
    notes: "Reset alarm, powered unit. Blower started normally. Discharge air 54°F. Unit back in cooling mode.",
    ts: JOB_START + 52 * 60 * 1000,
    icon: CheckCircle2,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
  },
  {
    id: "e9",
    type: "recommendation",
    label: "Recommendation Added",
    notes: "Order one additional 3VX450 belt as on-site spare. Current spare stock is now depleted. Belt showed normal wear — no underlying issue identified.",
    ts: JOB_START + 57 * 60 * 1000,
    icon: Star,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    detail: "Order replacement belt for stock",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

// ─── Action modal stub ────────────────────────────────────────────────────────

function MockActionModal({
  title,
  description,
  onClose,
}: {
  title: string;
  description: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-t-3xl p-6 pb-10 shadow-2xl">
        <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-5" />
        <p className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 text-center mb-4">
          DEV PREVIEW — mock action, no data saved
        </p>
        <h3 className="text-lg font-bold text-zinc-900 mb-1">{title}</h3>
        <p className="text-sm text-zinc-500 mb-6">{description}</p>
        <Button
          className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold h-11"
          onClick={onClose}
        >
          Dismiss (mock)
        </Button>
      </div>
    </div>
  );
}

// ─── Complete confirmation modal ──────────────────────────────────────────────

function CompleteModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-t-3xl p-6 pb-10 shadow-2xl">
        <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-5" />
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
            <ClipboardCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-900">Complete this job?</h3>
            <p className="text-xs text-zinc-500">This will generate the UnitDown Service Record.</p>
          </div>
        </div>
        <p className="text-sm text-zinc-600 mb-5 leading-relaxed">
          The job timeline will be locked and a permanent service record will be created for this equipment.
        </p>
        <div className="space-y-2">
          <Button
            className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-11"
            onClick={onConfirm}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Complete Job
          </Button>
          <Button
            variant="outline"
            className="w-full rounded-xl border-zinc-300 text-zinc-700 font-semibold h-11"
            onClick={onCancel}
          >
            Continue Working
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── FAB ─────────────────────────────────────────────────────────────────────

type FABAction = "voice" | "photo" | "measurement" | "part" | "note";

function FABMenu({ onAction, onClose }: { onAction: (a: FABAction) => void; onClose: () => void }) {
  const actions: { id: FABAction; label: string; icon: React.ComponentType<{ className?: string }>; color: string; bg: string }[] = [
    { id: "voice",       label: "Voice Note",   icon: Mic,     color: "text-violet-600", bg: "bg-violet-50 border-violet-200" },
    { id: "photo",       label: "Photo",        icon: Camera,  color: "text-blue-600",   bg: "bg-blue-50 border-blue-200"     },
    { id: "measurement", label: "Measurement",  icon: Gauge,   color: "text-amber-600",  bg: "bg-amber-50 border-amber-200"   },
    { id: "part",        label: "Part",         icon: Package, color: "text-violet-600", bg: "bg-violet-50 border-violet-200" },
    { id: "note",        label: "Note",         icon: FileText,color: "text-slate-600",  bg: "bg-slate-50 border-slate-200"   },
  ];
  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div className="fixed bottom-28 right-4 z-40 space-y-2">
        {[...actions].reverse().map((a) => (
          <button
            key={a.id}
            onClick={() => { onAction(a.id); onClose(); }}
            className={`flex items-center gap-2.5 bg-white border rounded-xl px-3.5 py-2.5 shadow-lg hover:shadow-xl transition-shadow ${a.bg}`}
          >
            <a.icon className={`w-4 h-4 ${a.color}`} />
            <span className={`text-sm font-semibold ${a.color}`}>{a.label}</span>
          </button>
        ))}
      </div>
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DevJobPreview() {
  if (!import.meta.env.DEV) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500 text-sm">Not found.</p>
      </div>
    );
  }

  const [, navigate] = useLocation();
  const [elapsed, setElapsed] = useState(Date.now() - JOB_START);
  const [fabOpen, setFabOpen] = useState(false);
  const [modal, setModal] = useState<null | { title: string; description: string }>(null);
  const [showComplete, setShowComplete] = useState(false);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setElapsed(Date.now() - JOB_START), 1000);
    return () => clearInterval(t);
  }, []);

  const handleFAB = (action: FABAction) => {
    const map: Record<FABAction, { title: string; description: string }> = {
      voice:       { title: "Voice Note",  description: "Record a voice note — transcription and AI correction would be applied in production." },
      photo:       { title: "Photo",       description: "Capture a photo — categorized as nameplate, alarm, measurement, part, or repair in production." },
      measurement: { title: "Measurement", description: "Log meter readings — voltage, amperage, superheat, subcooling, static pressure, etc." },
      part:        { title: "Part Added",  description: "Log a replaced or ordered part — part number, quantity, and description." },
      note:        { title: "Note",        description: "Add a technician note to the timeline." },
    };
    setModal(map[action]);
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      {/* Dev banner */}
      <div className="bg-amber-400 text-amber-900 text-center py-1.5 text-xs font-bold tracking-wide sticky top-0 z-[100]">
        DEV PREVIEW · Mock data only · Not visible in production
      </div>

      {/* Sticky job header */}
      <div className="sticky top-[30px] z-40 bg-white border-b border-zinc-200 shadow-sm">
        <div className="px-4 pt-3 pb-3">
          {/* Top row: back + complete */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => navigate("/job")}
              className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Jobs</span>
            </button>
            <Button
              onClick={() => setShowComplete(true)}
              className="h-8 px-4 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <ClipboardCheck className="w-3.5 h-3.5 mr-1.5" />
              Complete Job
            </Button>
          </div>

          {/* Job identity */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 mt-0.5">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-zinc-900 text-sm leading-tight">No Cooling / Blower Fault</p>
              <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-zinc-700">Lowe's</span>
                <span className="text-zinc-300">·</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  Redding
                </span>
                <span className="text-zinc-300">·</span>
                <span>RTU-18</span>
              </p>
            </div>
          </div>

          {/* Stats row: elapsed + sync */}
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              <span className="font-mono font-semibold text-zinc-900 tabular-nums">{formatElapsed(elapsed)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-600">
              <Wifi className="w-3.5 h-3.5" />
              <span className="font-semibold">Saved locally</span>
            </div>
            <div className="ml-auto flex items-center gap-1.5 text-xs text-zinc-400">
              <span>{MOCK_EVENTS.length} events</span>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 px-4 py-4 space-y-3 pb-40">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1">
          Timeline · {new Date(JOB_START).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </p>
        {MOCK_EVENTS.map((ev, idx) => {
          const isExpanded = expandedEvent === ev.id;
          const isLast = idx === MOCK_EVENTS.length - 1;
          const Icon = ev.icon;
          return (
            <div key={ev.id} className="relative flex gap-3">
              {/* Vertical line */}
              {!isLast && (
                <div className="absolute left-5 top-10 bottom-0 w-px bg-zinc-200" />
              )}
              {/* Icon */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 z-10 ${ev.iconBg} border border-white shadow-sm`}>
                <Icon className={`w-5 h-5 ${ev.iconColor}`} />
              </div>
              {/* Card */}
              <button
                onClick={() => setExpandedEvent(isExpanded ? null : ev.id)}
                className="flex-1 text-left bg-white rounded-2xl border border-zinc-100 shadow-sm hover:shadow-md transition-shadow px-3.5 py-3 mb-1"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-900 leading-tight">{ev.label}</p>
                    {ev.detail && (
                      <p className="text-xs text-blue-600 font-semibold mt-0.5">{ev.detail}</p>
                    )}
                    {!isExpanded && ev.notes && (
                      <p className="text-xs text-zinc-500 mt-1 leading-relaxed line-clamp-2">{ev.notes}</p>
                    )}
                    {isExpanded && ev.notes && (
                      <p className="text-xs text-zinc-600 mt-1.5 leading-relaxed">{ev.notes}</p>
                    )}
                  </div>
                  <div className="shrink-0 flex items-center gap-1.5">
                    <span className="text-[10px] text-zinc-400">{formatTime(ev.ts)}</span>
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                    )}
                  </div>
                </div>
              </button>
            </div>
          );
        })}

        {/* Live pulse — recording in progress */}
        <div className="flex gap-3 items-center">
          <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center shrink-0">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
          </div>
          <p className="text-xs text-zinc-400 italic">Job in progress — tap an action below to continue</p>
        </div>
      </div>

      {/* FAB */}
      {fabOpen && <FABMenu onAction={handleFAB} onClose={() => setFabOpen(false)} />}
      <div className="fixed bottom-6 right-4 z-40">
        <button
          onClick={() => setFabOpen((o) => !o)}
          className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all ${
            fabOpen ? "bg-zinc-800 rotate-45" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          <Plus className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Action modal */}
      {modal && (
        <MockActionModal
          title={modal.title}
          description={modal.description}
          onClose={() => setModal(null)}
        />
      )}

      {/* Complete modal */}
      {showComplete && (
        <CompleteModal
          onConfirm={() => navigate("/job-preview/record")}
          onCancel={() => setShowComplete(false)}
        />
      )}
    </div>
  );
}
