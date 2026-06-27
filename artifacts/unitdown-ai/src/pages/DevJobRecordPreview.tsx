/**
 * DEV-ONLY: /job-preview/record
 * Visual QA preview of the UnitDown Service Record (USS).
 * Renders with 100% mock data — no auth, no API calls, no Clerk.
 * Blocked from rendering in production via import.meta.env.DEV guard.
 */

import { useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, FileText, Clock, MapPin, User, Wrench,
  Activity, CheckCircle2, AlertCircle, Building2,
  Package, Star, Shield, Printer, Share2, ChevronDown, ChevronRight,
  Bell, Gauge, Camera, ClipboardCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ─── Mock record data ─────────────────────────────────────────────────────────

const JOB_START_MS   = Date.now() - 67 * 60 * 1000;
const JOB_END_MS     = Date.now() - 3 * 60 * 1000;
const JOB_DATE_LABEL = new Date(JOB_START_MS).toLocaleDateString("en-US", {
  weekday: "long", year: "numeric", month: "long", day: "numeric",
});

function fmt(ts: number) {
  return new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function duration(a: number, b: number) {
  const m = Math.round((b - a) / 60000);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

interface RecordEvent {
  id: string;
  type: string;
  label: string;
  notes: string;
  ts: number;
  detail?: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
}

const EVENTS: RecordEvent[] = [
  { id: "e1", type: "dispatch",    label: "Dispatch Received",          ts: JOB_START_MS,           notes: "No cooling complaint. Unit down since morning. Blower fault on controller.",                                                         icon: Bell,          iconBg: "bg-blue-50",    iconColor: "text-blue-600"   },
  { id: "e2", type: "arrived",     label: "Arrived On Site",            ts: JOB_START_MS + 8*60000, notes: "Met with facility manager David Chen. Unit confirmed as RTU-18 on east roof.",                                                        icon: MapPin,        iconBg: "bg-emerald-50", iconColor: "text-emerald-600"},
  { id: "e3", type: "alarm_review",label: "Prodigy Alarm History Checked",ts:JOB_START_MS +18*60000,notes: "Accessed Prodigy controller. Reviewed full alarm log.",                              detail: "Alarm 8 — Blower Fault",               icon: Activity,      iconBg: "bg-amber-50",   iconColor: "text-amber-600"  },
  { id: "e4", type: "note",        label: "Alarm 8 Identified",          ts: JOB_START_MS +22*60000,notes: "Alarm 8: Blower Fault. Controller detected blower motor/belt failure. Unit locked out on safety.",                                    icon: AlertCircle,   iconBg: "bg-red-50",     iconColor: "text-red-600"    },
  { id: "e5", type: "note",        label: "Blower Section Inspected",    ts: JOB_START_MS +29*60000,notes: "Opened blower compartment. Inspected motor, belt, pulleys, and drive assembly.",                                                      icon: FileText,      iconBg: "bg-slate-100",  iconColor: "text-slate-600"  },
  { id: "e6", type: "note",        label: "Broken Belt Found",           ts: JOB_START_MS +33*60000,notes: "Belt completely severed. No pulley damage. Sheaves in good condition. Belt failure is root cause of Alarm 8.",                        icon: Wrench,        iconBg: "bg-orange-50",  iconColor: "text-orange-600" },
  { id: "e7", type: "part",        label: "Replacement Belt Installed",  ts: JOB_START_MS +44*60000,notes: "Installed spare belt 3VX450 from truck stock. Correct cross-section and length confirmed.", detail: "3VX450 belt · Qty: 1",          icon: Package,       iconBg: "bg-violet-50",  iconColor: "text-violet-600" },
  { id: "e8", type: "note",        label: "Unit Verified Operational",   ts: JOB_START_MS +52*60000,notes: "Reset alarm. Powered unit. Blower started normally. Discharge air 54°F. Unit back in cooling mode.",                                  icon: CheckCircle2,  iconBg: "bg-emerald-50", iconColor: "text-emerald-600"},
  { id: "e9", type: "recommendation",label:"Recommendation Added",       ts: JOB_START_MS +57*60000,notes: "Order one additional 3VX450 belt for on-site spare. Current stock depleted.", detail: "Order replacement belt for stock",       icon: Star,          iconBg: "bg-amber-50",   iconColor: "text-amber-600"  },
];

// ─── Section components ───────────────────────────────────────────────────────

function SectionHeader({ label, count }: { label: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{label}</p>
      {count !== undefined && (
        <span className="text-[10px] font-bold text-zinc-400 bg-zinc-100 rounded-full px-2 py-0.5">{count}</span>
      )}
      <div className="flex-1 h-px bg-zinc-100" />
    </div>
  );
}

function TimelineItem({ ev, expanded, onToggle }: { ev: RecordEvent; expanded: boolean; onToggle: () => void }) {
  const Icon = ev.icon;
  return (
    <button
      onClick={onToggle}
      className="w-full text-left flex gap-3 items-start group"
    >
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${ev.iconBg}`}>
        <Icon className={`w-4 h-4 ${ev.iconColor}`} />
      </div>
      <div className="flex-1 min-w-0 pb-3 border-b border-zinc-100">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <p className="text-sm font-semibold text-zinc-900">{ev.label}</p>
            {ev.detail && <p className="text-xs text-blue-600 font-semibold mt-0.5">{ev.detail}</p>}
            {expanded
              ? <p className="text-xs text-zinc-600 mt-1 leading-relaxed">{ev.notes}</p>
              : <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{ev.notes}</p>
            }
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[10px] text-zinc-400">{fmt(ev.ts)}</span>
            {expanded
              ? <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
              : <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />}
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DevJobRecordPreview() {
  if (!import.meta.env.DEV) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500 text-sm">Not found.</p>
      </div>
    );
  }

  const [, navigate] = useLocation();
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState({
    timeline: true, parts: true, photos: true, recommendation: true, verification: true, ai: false,
  });

  const toggle = (s: keyof typeof expandedSection) =>
    setExpandedSection((p) => ({ ...p, [s]: !p[s] }));

  return (
    <div className="min-h-screen bg-zinc-50 pb-20">
      {/* Dev banner */}
      <div className="bg-amber-400 text-amber-900 text-center py-1.5 text-xs font-bold tracking-wide sticky top-0 z-[100]">
        DEV PREVIEW · Mock data only · Not visible in production
      </div>

      {/* Page header */}
      <div className="bg-white border-b border-zinc-200 px-4 pt-3 pb-4">
        <button
          onClick={() => navigate("/job-preview")}
          className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Job
        </button>

        {/* USR badge */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">UnitDown Service Record</p>
            <p className="font-mono text-sm font-bold text-blue-700">USR-2026-000001</p>
          </div>
          <Badge className="ml-auto bg-emerald-100 text-emerald-700 border-emerald-200 text-xs font-semibold">
            Complete
          </Badge>
        </div>

        {/* Job identity card */}
        <div className="bg-zinc-50 rounded-2xl border border-zinc-200 p-3.5 space-y-2">
          <div className="flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span className="text-sm font-bold text-zinc-900">Lowe's</span>
            <span className="text-zinc-300 mx-1">·</span>
            <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span className="text-sm text-zinc-600">Redding</span>
          </div>
          <div className="flex items-center gap-2">
            <Wrench className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span className="text-sm text-zinc-700 font-semibold">RTU-18</span>
            <span className="text-zinc-300 mx-1">·</span>
            <span className="text-sm text-zinc-600">No Cooling / Blower Fault</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span className="text-xs text-zinc-500">{JOB_DATE_LABEL}</span>
          </div>
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span className="text-xs text-zinc-500">Tech: J. Martinez · Duration: {duration(JOB_START_MS, JOB_END_MS)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-3">
          <button className="flex items-center gap-1.5 text-xs text-zinc-500 border border-zinc-200 rounded-xl px-3 py-2 hover:bg-zinc-50">
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
          <button className="flex items-center gap-1.5 text-xs text-zinc-500 border border-zinc-200 rounded-xl px-3 py-2 hover:bg-zinc-50">
            <Share2 className="w-3.5 h-3.5" /> Share
          </button>
          <button className="flex items-center gap-1.5 text-xs text-blue-600 border border-blue-200 rounded-xl px-3 py-2 bg-blue-50 hover:bg-blue-100 ml-auto">
            <Gauge className="w-3.5 h-3.5" /> Export PDF
          </button>
        </div>
      </div>

      {/* Content sections */}
      <div className="px-4 py-4 space-y-4">

        {/* ── AI Report stub ── */}
        <div className="bg-gradient-to-br from-blue-50 to-violet-50 rounded-2xl border border-blue-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-blue-600" />
            <p className="text-sm font-bold text-zinc-900">AI Professional Report</p>
            <Badge className="ml-auto bg-blue-100 text-blue-700 border-blue-200 text-[10px]">93% Confidence</Badge>
          </div>
          <p className="text-xs text-zinc-600 leading-relaxed">
            Technician responded to no-cooling complaint at Lowe's Redding. Upon inspection, an Alarm 8 (Blower Fault) was found in the Prodigy controller. Root cause identified as a severed 3VX450 v-belt in the blower drive assembly. Belt replaced with spare from truck stock. Unit verified operational with discharge air temperature of 54°F. No underlying mechanical damage observed. Recommend maintaining one spare belt on site.
          </p>
          <div className="flex items-center gap-3 mt-3">
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Office Ready
            </div>
            <div className="flex items-center gap-1.5 text-xs text-blue-600 font-semibold">
              <ClipboardCheck className="w-3.5 h-3.5" />
              Completeness: 91%
            </div>
          </div>
        </div>

        {/* ── Timeline ── */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          <button
            onClick={() => toggle("timeline")}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-50"
          >
            <SectionHeader label="Timeline" count={EVENTS.length} />
            {expandedSection.timeline
              ? <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
              : <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />}
          </button>
          {expandedSection.timeline && (
            <div className="px-4 pb-4 space-y-1">
              {EVENTS.map((ev) => (
                <TimelineItem
                  key={ev.id}
                  ev={ev}
                  expanded={expandedEvent === ev.id}
                  onToggle={() => setExpandedEvent(expandedEvent === ev.id ? null : ev.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Parts ── */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          <button
            onClick={() => toggle("parts")}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-50"
          >
            <SectionHeader label="Parts" count={1} />
            {expandedSection.parts
              ? <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
              : <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />}
          </button>
          {expandedSection.parts && (
            <div className="px-4 pb-4 space-y-2">
              <div className="flex items-center gap-3 bg-violet-50 rounded-xl px-3.5 py-3 border border-violet-100">
                <div className="w-8 h-8 bg-violet-100 rounded-xl flex items-center justify-center shrink-0">
                  <Package className="w-4 h-4 text-violet-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-zinc-900">3VX450 V-Belt</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Replaced · Qty: 1 · From truck stock</p>
                </div>
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">Replaced</Badge>
              </div>
            </div>
          )}
        </div>

        {/* ── Photos ── */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          <button
            onClick={() => toggle("photos")}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-50"
          >
            <SectionHeader label="Photos" count={3} />
            {expandedSection.photos
              ? <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
              : <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />}
          </button>
          {expandedSection.photos && (
            <div className="px-4 pb-4">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Nameplate", color: "bg-blue-100", icon: FileText },
                  { label: "Failed Part", color: "bg-red-100", icon: AlertCircle },
                  { label: "Repair", color: "bg-emerald-100", icon: CheckCircle2 },
                ].map(({ label, color, icon: Icon }) => (
                  <div key={label} className={`aspect-square rounded-xl ${color} flex flex-col items-center justify-center gap-1`}>
                    <Icon className="w-5 h-5 text-zinc-500" />
                    <span className="text-[10px] text-zinc-500 font-semibold">{label}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-zinc-400 text-center mt-2">Photo placeholders — production would show actual images</p>
            </div>
          )}
        </div>

        {/* ── Recommendation ── */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          <button
            onClick={() => toggle("recommendation")}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-50"
          >
            <SectionHeader label="Recommendations" count={1} />
            {expandedSection.recommendation
              ? <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
              : <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />}
          </button>
          {expandedSection.recommendation && (
            <div className="px-4 pb-4">
              <div className="flex items-start gap-3 bg-amber-50 rounded-xl px-3.5 py-3 border border-amber-100">
                <Star className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-zinc-900">Order Replacement Belt for Stock</p>
                  <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
                    Order one additional 3VX450 belt as an on-site spare. Current spare stock is depleted after today's repair. Belt showed normal wear — no underlying issue identified.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Verification ── */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          <button
            onClick={() => toggle("verification")}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-50"
          >
            <SectionHeader label="Verification" />
            {expandedSection.verification
              ? <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
              : <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />}
          </button>
          {expandedSection.verification && (
            <div className="px-4 pb-4 space-y-2">
              <div className="flex items-center gap-3 bg-emerald-50 rounded-xl px-3.5 py-3 border border-emerald-100">
                <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800">Unit Operational</p>
                  <p className="text-xs text-emerald-700 mt-0.5">Verified by: J. Martinez · {fmt(JOB_END_MS)}</p>
                </div>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 ml-auto shrink-0" />
              </div>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {[
                  { label: "Return Visit",    value: "No",  ok: true  },
                  { label: "Follow-up",       value: "No",  ok: true  },
                  { label: "Safety Concerns", value: "None",ok: true  },
                  { label: "Warranty",        value: "N/A", ok: true  },
                ].map(({ label, value, ok }) => (
                  <div key={label} className="bg-zinc-50 rounded-xl px-3 py-2 border border-zinc-100">
                    <p className="text-[10px] text-zinc-400 uppercase tracking-wide">{label}</p>
                    <p className={`text-xs font-semibold mt-0.5 ${ok ? "text-emerald-700" : "text-amber-700"}`}>{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Customer Summary ── */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-4">
          <SectionHeader label="Customer Summary" />
          <p className="text-xs text-zinc-600 leading-relaxed">
            Your air conditioner was not cooling because a drive belt inside the unit broke. We replaced the belt and confirmed the unit is cooling normally again. We recommend having a spare belt on hand for quicker future repairs.
          </p>
        </div>

        {/* Bottom CTA */}
        <div className="pt-2 pb-4 space-y-2">
          <Button
            className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold h-11"
            onClick={() => {}}
          >
            <Camera className="w-4 h-4 mr-2" />
            Send to Customer (mock)
          </Button>
          <Button
            variant="outline"
            className="w-full rounded-xl border-zinc-300 text-zinc-600 font-semibold h-11"
            onClick={() => navigate("/job-preview")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Job Preview
          </Button>
        </div>
      </div>
    </div>
  );
}
