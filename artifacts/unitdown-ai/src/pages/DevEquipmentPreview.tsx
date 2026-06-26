/**
 * DEV-ONLY: /dev/equipment-preview
 * Visual preview of the Equipment Library and Equipment Detail redesigns.
 * Renders with 100% fake data — no Clerk, no API calls, no auth required.
 * Blocked from rendering in production via import.meta.env.DEV guard.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, AlertCircle, Bell, Brain, Building2, Calendar, Camera, CheckCircle2,
  ChevronDown, ChevronRight, CircleDot,
  Clock, Edit2, FileText, History, Info,
  Map as MapIcon, MapPin, Mic, Plus, Search, Settings, Star, Trash2, TrendingUp, Wrench, X, ZoomIn,
} from "lucide-react";
import RtuIcon from "@/components/RtuIcon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VoiceNoteRecorder, type VoiceNoteEntry } from "@/components/VoiceNoteRecorder";

// ─── Types & mock data ────────────────────────────────────────────────────────

type UnitStatus = "operational" | "monitoring" | "needs-follow-up" | "critical" | "archived";
type ActiveTab = "timeline" | "info" | "photos" | "resources" | "notes";

function unitStatusConfig(status: UnitStatus) {
  switch (status) {
    case "operational":     return { strip: "bg-emerald-500", dot: "bg-emerald-500", label: "Operational", textCls: "text-emerald-700", bgCls: "bg-emerald-50",  borderCls: "border-emerald-200" };
    case "monitoring":      return { strip: "bg-blue-500",    dot: "bg-blue-500",    label: "Monitoring",  textCls: "text-blue-700",    bgCls: "bg-blue-50",    borderCls: "border-blue-200"   };
    case "needs-follow-up": return { strip: "bg-amber-500",   dot: "bg-amber-500",   label: "Follow-up",   textCls: "text-amber-700",   bgCls: "bg-amber-50",   borderCls: "border-amber-200"  };
    case "critical":        return { strip: "bg-red-500",     dot: "bg-red-500",     label: "Critical",    textCls: "text-red-700",     bgCls: "bg-red-50",     borderCls: "border-red-200"    };
    case "archived":        return { strip: "bg-slate-400",   dot: "bg-slate-400",   label: "Archived",    textCls: "text-slate-500",   bgCls: "bg-slate-100",  borderCls: "border-slate-200"  };
  }
}

interface MockUnit {
  id: string;
  nickname: string | null;
  siteCustomerName: string | null;
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
  isFavorite: boolean;
  isArchived: boolean;
  status: UnitStatus;
  lastVisit: string | null;
  openIssue: string | null;
  nextAction: string;
  nextVisit: string | null;
}

const MOCK_UNITS: MockUnit[] = [
  {
    id: "1",
    nickname: "RTU-1",
    siteCustomerName: "Sunrise Medical Center",
    location: "Roof — Zone A",
    manufacturer: "Carrier",
    modelNumber: "48XLT016A-6",
    serialNumber: "0920A1234",
    equipmentType: "RTU",
    systemType: "Packaged",
    refrigerantType: "R-410A",
    voltage: "460",
    phase: "3",
    mca: "42.5",
    mocp: "50",
    rla: "38.0",
    lra: "215",
    capacityTons: "12.5",
    manufactureDate: "2020-09",
    notes: "Filter change due Q3. Compressor contactor replaced 2024-11. Watch suction line temps.",
    isFavorite: true,
    isArchived: false,
    status: "critical",
    lastVisit: "Jun 24",
    openIssue: "High-head pressure — compressor fault",
    nextAction: "Schedule service call",
    nextVisit: "Jul 2",
  },
  {
    id: "2",
    nickname: "RTU-2",
    siteCustomerName: "Lakewood Office Park",
    location: "Roof — Zone B",
    manufacturer: "Lennox",
    modelNumber: "LGH210H4BS1G",
    serialNumber: "5521B8890",
    equipmentType: "RTU",
    systemType: "Packaged",
    refrigerantType: "R-410A",
    voltage: "460",
    phase: "3",
    mca: "38.0",
    mocp: "45",
    rla: "34.2",
    lra: "198",
    capacityTons: "17.5",
    manufactureDate: "2022-03",
    notes: null,
    isFavorite: false,
    isArchived: false,
    status: "monitoring",
    lastVisit: "Jun 18",
    openIssue: "Low refrigerant charge suspected",
    nextAction: "Verify subcooling at next visit",
    nextVisit: "Jul 5",
  },
  {
    id: "3",
    nickname: "RTU-7",
    siteCustomerName: "Harbor View Hotel",
    location: "Roof — West Wing",
    manufacturer: "York",
    modelNumber: "ZJ210000BD4BAAA",
    serialNumber: "NUPM77241",
    equipmentType: "RTU",
    systemType: "Packaged",
    refrigerantType: "R-410A",
    voltage: "460",
    phase: "3",
    mca: "52.0",
    mocp: "60",
    rla: "47.5",
    lra: "245",
    capacityTons: "17.5",
    manufactureDate: "2021-06",
    notes: "Annual PM completed 2025-04. Condenser coils cleaned.",
    isFavorite: false,
    isArchived: false,
    status: "operational",
    lastVisit: "Apr 2",
    openIssue: null,
    nextAction: "Q3 PM due in 6 weeks",
    nextVisit: "Aug 6",
  },
  {
    id: "4",
    nickname: "Kitchen MUA",
    siteCustomerName: "Harbor View Hotel",
    location: "Roof — Kitchen",
    manufacturer: "Greenheck",
    modelNumber: "MUA-36-14",
    serialNumber: "GH-2209-3344",
    equipmentType: "Make-Up Air",
    systemType: "Direct-Gas",
    refrigerantType: null,
    voltage: "208",
    phase: "3",
    mca: "18.5",
    mocp: "25",
    rla: null,
    lra: null,
    capacityTons: null,
    manufactureDate: "2019-11",
    notes: "Burner lockout logged twice this month. Check gas valve solenoid.",
    isFavorite: false,
    isArchived: false,
    status: "needs-follow-up",
    lastVisit: "Jun 10",
    openIssue: "Burner lockout — repeated fault",
    nextAction: "Follow up this week",
    nextVisit: "Jun 30",
  },
  {
    id: "5",
    nickname: "AHU-2B",
    siteCustomerName: "Lakewood Office Park",
    location: "Mechanical Room B2",
    manufacturer: "Trane",
    modelNumber: "TWE240E400B",
    serialNumber: "21B56789",
    equipmentType: "AHU",
    systemType: "Split",
    refrigerantType: "R-410A",
    voltage: "208",
    phase: "3",
    mca: "28.0",
    mocp: "35",
    rla: "24.5",
    lra: "178",
    capacityTons: "20.0",
    manufactureDate: "2021-03",
    notes: null,
    isFavorite: false,
    isArchived: false,
    status: "operational",
    lastVisit: "May 14",
    openIssue: null,
    nextAction: "Schedule next PM",
    nextVisit: null,
  },
  {
    id: "6",
    nickname: "Split #4",
    siteCustomerName: "Greenfield Realty",
    location: "3rd Floor — East Wing",
    manufacturer: "Daikin",
    modelNumber: "RXS12LVJU",
    serialNumber: "E005G1001",
    equipmentType: "Split System",
    systemType: "Mini-Split",
    refrigerantType: "R-32",
    voltage: "208",
    phase: "1",
    mca: "14.0",
    mocp: "20",
    rla: "12.3",
    lra: "56",
    capacityTons: "1.0",
    manufactureDate: "2022-11",
    notes: null,
    isFavorite: false,
    isArchived: false,
    status: "needs-follow-up",
    lastVisit: "Jun 5",
    openIssue: "Outdoor fan cycling on overload",
    nextAction: "Follow up this week",
    nextVisit: null,
  },
  {
    id: "7",
    nickname: "EF-1",
    siteCustomerName: "Sunrise Medical Center",
    location: "Roof — Exhaust Section",
    manufacturer: "Greenheck",
    modelNumber: "CUBE-182-VG",
    serialNumber: "GH-2318-5512",
    equipmentType: "Exhaust Fan",
    systemType: "Centrifugal",
    refrigerantType: null,
    voltage: "208",
    phase: "3",
    mca: "8.4",
    mocp: "15",
    rla: "6.8",
    lra: "42",
    capacityTons: null,
    manufactureDate: "2020-07",
    notes: "Belt tension checked on last PM. Drive sheave showing wear — flag for replacement at next visit.",
    isFavorite: false,
    isArchived: false,
    status: "operational",
    lastVisit: "May 22",
    openIssue: null,
    nextAction: "Inspect belt & sheave at next PM",
    nextVisit: "Aug 12",
  },
  {
    id: "8",
    nickname: "GF-Kitchen",
    siteCustomerName: "Harbor View Hotel",
    location: "Kitchen Roof",
    manufacturer: "Captive-Aire",
    modelNumber: "NSSB-3-4",
    serialNumber: "CA-2117-9901",
    equipmentType: "Grease Fan",
    systemType: "Upblast",
    refrigerantType: null,
    voltage: "208",
    phase: "1",
    mca: "6.2",
    mocp: "10",
    rla: "5.1",
    lra: "28",
    capacityTons: null,
    manufactureDate: "2018-04",
    notes: null,
    isFavorite: false,
    isArchived: false,
    status: "needs-follow-up",
    lastVisit: "Jun 1",
    openIssue: "Excessive grease buildup — fan wobble reported by kitchen staff",
    nextAction: "Deep clean + rebalance",
    nextVisit: "Jul 8",
  },
];

const MOCK_TIMELINE = [
  {
    id: "t1",
    eventType: "diagnostic",
    title: "High-Head Pressure — Compressor Fault",
    status: "unresolved",
    eventDate: Date.now() - 86400000 * 2,
    description: "Customer reported poor cooling. Unit running but not keeping up with demand.",
    found: "410 psi head pressure. Outdoor ambient 95°F. Condenser coils fouled with cottonwood and debris.",
    action: "Cleaned condenser coil with coil cleaner and garden hose. Checked refrigerant charge — within spec.",
    result: "Pressure dropped to 340 psi. Unit back in cooling range.",
    followUp: "Return next week to verify — compressor amp draw was elevated at 22A (RLA 19A). May be weak.",
    technicianNotes: "Cleaned coils — pressure came down to 340 psi. Scheduling follow-up.",
    source: "log" as const,
    confidencePercent: 88,
  },
  {
    id: "t2",
    eventType: "repair",
    title: "Contactor Replaced — Compressor Circuit",
    status: "resolved",
    eventDate: Date.now() - 86400000 * 30,
    description: "Customer reported unit not starting after the weekend.",
    found: "Primary contactor contacts burned and welded open. No voltage reaching compressor.",
    action: "Replaced OEM contactor — 40A/3-pole. Verified voltage at load side.",
    result: "Unit back online same day. Compressor starting normally.",
    followUp: null,
    technicianNotes: "OEM contactor 40A/3-pole. Unit back online same day.",
    source: "manual" as const,
    confidencePercent: null,
  },
  {
    id: "t3",
    eventType: "maintenance",
    title: "Quarterly PM — Filter Change",
    status: "resolved",
    eventDate: Date.now() - 86400000 * 90,
    description: "Scheduled quarterly preventive maintenance visit.",
    found: "Filters at end of service life — MERV-13 heavily loaded at 90 days. Belts good. Coils clean.",
    action: "Replaced (4) MERV-13 filters. Checked belts, drain pan, coil condition, and electrical connections.",
    result: "Unit at full airflow. All checks passed — no issues found.",
    followUp: null,
    technicianNotes: null,
    source: "manual" as const,
    confidencePercent: null,
  },
  {
    id: "t4",
    eventType: "note",
    title: "Field Observation — Compressor Vibration at Startup",
    status: null,
    eventDate: Date.now() - 86400000 * 14,
    description: "Customer mentioned a low-frequency hum during afternoon peak load.",
    found: null,
    action: null,
    result: null,
    followUp: null,
    technicianNotes: "Noticed slight vibration in compressor section at startup. Compressor isolators may need inspection at next scheduled PM. Customer advised to monitor.",
    source: "manual" as const,
    confidencePercent: null,
  },
  {
    id: "t5",
    eventType: "reminder",
    title: "Return Visit — Verify Compressor Amp Draw",
    status: "unresolved",
    eventDate: Date.now() - 86400000 * 2,
    description: "Set after high-head pressure call. Compressor amp draw was elevated at 22A (RLA 19A). Needs a return check.",
    found: null,
    action: null,
    result: null,
    followUp: "Return within 7 days. Run compressor amp draw with clamp meter. If still above RLA, recommend compressor evaluation.",
    technicianNotes: null,
    source: "manual" as const,
    confidencePercent: null,
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function UnitCard({ unit, onSelect }: { unit: MockUnit; onSelect: () => void }) {
  const sc = unitStatusConfig(unit.status);
  const showBadge = unit.status !== "operational" && unit.status !== "archived";
  const eqType = (unit.equipmentType ?? "").toLowerCase();
  const isRooftop = eqType.includes("rtu") || eqType.includes("rooftop") || eqType.includes("package") || eqType.includes("make-up") || eqType.includes("makeup");

  return (
    <button
      onClick={onSelect}
      className="w-full text-left bg-white rounded-2xl border border-slate-200 px-4 py-4 shadow-sm active:bg-slate-50 transition-all hover:border-blue-300 hover:shadow-md hover:scale-[1.01] active:scale-[0.98] duration-150"
    >
      <div className="flex items-start gap-3">
        {/* Equipment-type avatar */}
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border mt-0.5 ${sc.bgCls} ${sc.borderCls}`}>
          {isRooftop
            ? <RtuIcon className={sc.textCls} style={{ width: "18px", height: "18px" }} />
            : <span className={`w-2.5 h-2.5 rounded-full ${sc.dot}`} />
          }
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-extrabold text-slate-900 leading-tight truncate">
                  {unit.nickname ?? unit.modelNumber ?? "Unnamed Unit"}
                </span>
                {unit.isFavorite && <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400 flex-shrink-0" />}
              </div>
              {unit.siteCustomerName && (
                <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">{unit.siteCustomerName}</p>
              )}
              {unit.location && (
                <p className="text-[10px] text-slate-400 flex items-center gap-0.5 mt-0.5">
                  <MapPin className="w-2.5 h-2.5 flex-shrink-0" />{unit.location}
                </p>
              )}
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0 mt-0.5" />
          </div>

          <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
            {unit.equipmentType && (
              <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                {unit.equipmentType}
              </span>
            )}
            {unit.manufacturer && (
              <span className="text-[10px] text-slate-500 font-medium">{unit.manufacturer}</span>
            )}
            {showBadge && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ml-auto ${sc.bgCls} ${sc.textCls} ${sc.borderCls}`}>
                {sc.label}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── Job Ticket Unit Card (inside expanded customer card) ─────────────────────
// Separate from UnitCard (used in library view) so each can evolve independently.

function JobTicketUnitCard({ unit, onSelect }: { unit: MockUnit; onSelect: () => void }) {
  const sc = unitStatusConfig(unit.status);
  const eqType = (unit.equipmentType ?? "").toLowerCase();
  const isRooftop = eqType.includes("rtu") || eqType.includes("rooftop") || eqType.includes("package") || eqType.includes("make-up") || eqType.includes("makeup");
  const subtitleParts = [unit.manufacturer, unit.capacityTons ? `${unit.capacityTons} tons` : null].filter(Boolean);

  return (
    <button
      onClick={onSelect}
      className="w-full text-left bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm
        hover:border-blue-300 hover:shadow-md transition-all duration-150 ease-out
        active:scale-[0.98]"
    >
      <div className="flex items-start gap-3">
        {/* Type avatar */}
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 border mt-0.5 ${sc.bgCls} ${sc.borderCls}`}>
          {isRooftop
            ? <RtuIcon className={sc.textCls} style={{ width: "16px", height: "16px" }} />
            : <span className={`w-2 h-2 rounded-full ${sc.dot}`} />
          }
        </div>

        <div className="min-w-0 flex-1">
          {/* Name + status pill */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <span className="font-extrabold text-slate-900 text-sm leading-snug truncate block">
                {unit.nickname ?? unit.modelNumber ?? "Unnamed Unit"}
              </span>
              {subtitleParts.length > 0 && (
                <p className="text-[11px] text-slate-400 mt-0.5">{subtitleParts.join(" · ")}</p>
              )}
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 mt-0.5 ${sc.bgCls} ${sc.textCls} ${sc.borderCls}`}>
              {sc.label}
            </span>
          </div>

          {/* Job ticket rows */}
          <div className="mt-2.5 space-y-1.5">
            <div className="flex gap-3">
              <div className="flex-1">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Open Issue</p>
                <p className={`text-xs font-medium mt-0.5 leading-snug ${unit.openIssue ? "text-amber-700" : "text-slate-400"}`}>
                  {unit.openIssue ?? "None"}
                </p>
              </div>
              <div className="flex-1">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Last Visit</p>
                <p className="text-xs font-medium text-slate-700 mt-0.5">{unit.lastVisit ?? "—"}</p>
              </div>
            </div>
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Next</p>
              <p className={`text-xs font-medium mt-0.5 ${unit.nextVisit ? "text-blue-700" : "text-slate-400"}`}>
                {unit.nextVisit ? `Return ${unit.nextVisit}` : unit.nextAction ?? "—"}
              </p>
            </div>
          </div>
        </div>

        <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0 mt-1" />
      </div>
    </button>
  );
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

function TimelineCard({ event }: { event: typeof MOCK_TIMELINE[0] }) {
  const [open, setOpen] = useState(false);
  const typeCfgs: Record<string, { bg: string; color: string; Icon: typeof Activity; label: string }> = {
    diagnostic:  { bg: "bg-blue-50",    color: "text-blue-600",    Icon: Activity, label: "Diagnostic" },
    repair:      { bg: "bg-orange-50",  color: "text-orange-600",  Icon: Wrench,   label: "Repair"     },
    maintenance: { bg: "bg-emerald-50", color: "text-emerald-600", Icon: Settings, label: "PM"         },
    note:        { bg: "bg-slate-100",  color: "text-slate-600",   Icon: FileText, label: "Note"       },
    reminder:    { bg: "bg-amber-50",   color: "text-amber-600",   Icon: Bell,     label: "Reminder"   },
  };
  const stCfg: Record<string, { label: string; className: string }> = {
    unresolved: { label: "Open Issue", className: "bg-amber-100 text-amber-800 border-amber-200"      },
    resolved:   { label: "Resolved",   className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  };
  const typeCfg  = typeCfgs[event.eventType] ?? typeCfgs.diagnostic;
  const statusCfg = event.status ? stCfg[event.status] : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Collapsed header */}
      <button onClick={() => setOpen((v) => !v)} className="w-full text-left p-4 active:bg-slate-50 transition-colors">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${typeCfg.bg}`}>
            <typeCfg.Icon className={`w-4 h-4 ${typeCfg.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-slate-900 line-clamp-1 flex-1 min-w-0">{event.title}</span>
              {statusCfg && (
                <Badge className={`text-xs border flex-shrink-0 ${statusCfg.className}`}>{statusCfg.label}</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xs font-semibold ${typeCfg.color}`}>{typeCfg.label}</span>
              <span className="text-slate-300 text-xs">·</span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(event.eventDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
              </span>
              {event.confidencePercent != null && (
                <><span className="text-slate-300 text-xs">·</span><span className="text-xs text-slate-400">{event.confidencePercent}% match</span></>
              )}
            </div>
          </div>
          <ChevronRight className={`w-4 h-4 text-slate-300 flex-shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
        </div>
      </button>

      {/* Expanded — service story narrative */}
      {open && (
        <div className="border-t border-slate-100">
          {event.description && (
            <p className="px-4 pt-3 text-sm text-slate-500 leading-relaxed italic">{event.description}</p>
          )}
          <div className="px-4 pb-4 pt-3 space-y-3">
            {event.found && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Found</p>
                <p className="text-sm text-slate-700 leading-relaxed">{event.found}</p>
              </div>
            )}
            {event.action && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Action</p>
                <p className="text-sm text-slate-700 leading-relaxed">{event.action}</p>
              </div>
            )}
            {event.result && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Result</p>
                <p className="text-sm text-slate-700 leading-relaxed">{event.result}</p>
              </div>
            )}
            {event.followUp && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wide mb-1">Return Visit</p>
                <p className="text-sm text-amber-800 leading-relaxed">{event.followUp}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Customers & Sites Preview ────────────────────────────────────────────────

const TYPE_CHIPS = [
  { label: "RTU",          match: "rtu"        },
  { label: "Make-Up Air",  match: "make-up"    },
  { label: "AHU",          match: "ahu"        },
  { label: "Split System", match: "split"      },
  { label: "Exhaust Fan",  match: "exhaust"    },
  { label: "Grease Fan",   match: "grease"     },
];

function CustomerGroupCard({
  customer, units, expanded, onToggle, onSelectUnit,
}: {
  customer: string;
  units: MockUnit[];
  expanded: boolean;
  onToggle: () => void;
  onSelectUnit: (u: MockUnit) => void;
}) {
  const criticalCount    = units.filter((u) => u.status === "critical").length;
  const followUpCount    = units.filter((u) => u.status === "needs-follow-up").length;
  const monitoringCount  = units.filter((u) => u.status === "monitoring").length;
  const operationalCount = units.filter((u) => u.status === "operational").length;

  // Identify the highest-priority unit for the attention line
  const priorityUnit =
    units.find((u) => u.status === "critical") ??
    units.find((u) => u.status === "needs-follow-up") ??
    units.find((u) => u.status === "monitoring") ??
    null;
  const priorityUnitLabel = priorityUnit?.nickname ?? priorityUnit?.modelNumber ?? null;

  const openIssue =
    units.find((u) => u.status === "critical")?.openIssue ??
    units.find((u) => u.status === "needs-follow-up")?.openIssue ??
    units.find((u) => u.status === "monitoring")?.openIssue ??
    null;

  const nextVisit = units.reduce<string | null>((acc, u) => (!acc && u.nextVisit ? u.nextVisit : acc), null);
  const lastVisit = units.reduce<string | null>((acc, u) => (!acc && u.lastVisit ? u.lastVisit : acc), null);

  const locationMap: Record<string, MockUnit[]> = {};
  units.forEach((u) => {
    const loc = u.location ?? "Main";
    if (!locationMap[loc]) locationMap[loc] = [];
    locationMap[loc].push(u);
  });
  const locationEntries = Object.entries(locationMap);
  const primarySite = locationEntries.length === 1 ? locationEntries[0][0] : null;

  const accentBorder = criticalCount > 0 ? "border-red-300" : followUpCount > 0 ? "border-amber-200" : monitoringCount > 0 ? "border-blue-200" : "border-slate-200";
  const iconBg    = criticalCount > 0 ? "bg-red-100"    : followUpCount > 0 ? "bg-amber-100"   : monitoringCount > 0 ? "bg-blue-100"   : "bg-slate-100";
  const iconColor = criticalCount > 0 ? "text-red-600"  : followUpCount > 0 ? "text-amber-600" : monitoringCount > 0 ? "text-blue-600" : "text-slate-500";

  return (
    <div className={`bg-white border rounded-2xl shadow-md shadow-slate-200/80 overflow-hidden transition-all ${expanded ? "border-blue-300 shadow-lg shadow-slate-300/60" : accentBorder}`}>
      {/* ── Entire header is the tap target ──────────────────────────────────── */}
      <div
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && onToggle()}
        className="p-4 cursor-pointer hover:bg-slate-50/60 active:bg-slate-100/80 transition-colors select-none"
      >
        {/* Top row: icon + customer name + open/close badge */}
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${iconBg}`}>
            <Building2 className={iconColor} style={{ width: "18px", height: "18px" }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-extrabold text-slate-900 text-sm">{customer}</p>
            {primarySite ? (
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                {primarySite}
              </p>
            ) : (
              <p className="text-xs text-slate-500 mt-0.5">{locationEntries.length} locations · {units.length} equipment</p>
            )}
          </div>
          <div className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-xl flex-shrink-0 ${
            expanded ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
          }`}>
            {expanded ? "Close" : "Open Site"}
            <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </div>
        </div>

        {/* Attention line — which unit needs attention */}
        <div className="mt-2">
          {criticalCount > 0 ? (
            <p className="text-xs font-semibold text-red-700 flex items-center gap-1.5">
              <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" />
              {priorityUnitLabel ? `${priorityUnitLabel} needs attention` : `${criticalCount} unit${criticalCount > 1 ? "s" : ""} need attention`}
            </p>
          ) : followUpCount > 0 ? (
            <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
              <span className="w-2 h-2 bg-amber-500 rounded-full flex-shrink-0" />
              {priorityUnitLabel ? `${priorityUnitLabel} — follow-up scheduled` : `${followUpCount} unit${followUpCount > 1 ? "s" : ""} — follow-up scheduled`}
            </p>
          ) : monitoringCount > 0 ? (
            <p className="text-xs font-semibold text-blue-700 flex items-center gap-1.5">
              <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
              {priorityUnitLabel ? `${priorityUnitLabel} being monitored` : `${monitoringCount} unit${monitoringCount > 1 ? "s" : ""} being monitored`}
            </p>
          ) : (
            <p className="text-xs font-medium text-emerald-600 flex items-center gap-1.5">
              <span className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0" />
              No active issues
            </p>
          )}
        </div>

        {/* Info row: Last Visit / Next Visit / Open Issue */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="bg-slate-50 rounded-xl px-2.5 py-2">
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Last Visit</p>
            <p className="text-xs font-bold text-slate-700 mt-0.5">{lastVisit ?? "—"}</p>
          </div>
          <div className={`rounded-xl px-2.5 py-2 ${nextVisit ? "bg-blue-50" : "bg-slate-50"}`}>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Next Visit</p>
            <p className={`text-xs font-bold mt-0.5 ${nextVisit ? "text-blue-700" : "text-slate-400"}`}>
              {nextVisit ?? "Not scheduled"}
            </p>
          </div>
          <div className={`rounded-xl px-2.5 py-2 ${openIssue ? "bg-amber-50" : "bg-slate-50"}`}>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Open Issue</p>
            <p className={`text-xs font-bold mt-0.5 truncate ${openIssue ? "text-amber-700" : "text-emerald-600"}`}>
              {openIssue ?? "None"}
            </p>
          </div>
        </div>

        {/* Status breakdown */}
        <div className="flex items-center gap-3 mt-2.5 flex-wrap">
          {criticalCount > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-red-700 font-bold">
              <span className="w-2 h-2 bg-red-500 rounded-full" />
              Critical: {criticalCount}
            </span>
          )}
          {followUpCount > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-amber-700 font-semibold">
              <span className="w-2 h-2 bg-amber-500 rounded-full" />
              Follow-up: {followUpCount}
            </span>
          )}
          {monitoringCount > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-blue-700 font-semibold">
              <span className="w-2 h-2 bg-blue-500 rounded-full" />
              Monitoring: {monitoringCount}
            </span>
          )}
          {operationalCount > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-semibold">
              <span className="w-2 h-2 bg-emerald-500 rounded-full" />
              Operational: {operationalCount}
            </span>
          )}
        </div>
      </div>

      {/* ── Expanded: Equipment Locations ─────────────────────────────────────── */}
      {expanded && (
        <div className="border-t border-slate-100">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Equipment Locations</span>
            <span className="text-xs text-slate-400 ml-auto">{units.length} unit{units.length !== 1 ? "s" : ""}</span>
          </div>
          {locationEntries.map(([loc, locUnits]) => (
            <div key={loc}>
              {locationEntries.length > 1 && (
                <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-500">{loc}</span>
                  <span className="text-xs text-slate-400">({locUnits.length})</span>
                </div>
              )}
              <div className="p-3 space-y-2">
                {locUnits.map((u) => (
                  <JobTicketUnitCard key={u.id} unit={u} onSelect={() => onSelectUnit(u)} />
                ))}
              </div>
            </div>
          ))}

          {/* Future Roof Map — dev preview placeholder only, never in production */}
          <div className="mx-3 mb-3 mt-1 border border-dashed border-slate-200 rounded-2xl p-4 text-center bg-slate-50/60">
            <MapIcon className="w-5 h-5 text-slate-300 mx-auto mb-1.5" />
            <p className="text-xs font-bold text-slate-400">Roof Map</p>
            <p className="text-[10px] text-slate-300 mt-0.5 leading-relaxed">Coming soon — equipment layout visualized by zone and roof section</p>
          </div>
        </div>
      )}
    </div>
  );
}

type KpiFilterType = "attention" | "monitoring" | "return-visits" | null;

function EquipmentLibraryPreview({
  onSelectUnit,
  onOpenDrawer,
}: {
  onSelectUnit: (unit: MockUnit) => void;
  onOpenDrawer: () => void;
}) {
  const [typeFilter, setTypeFilter] = useState("");
  const [q, setQ] = useState("");
  const [viewMode, setViewMode] = useState<"customers" | "all">("customers");
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set());
  const [kpiFilter, setKpiFilter] = useState<KpiFilterType>(null);
  const customerSectionRef = useRef<HTMLDivElement | null>(null);

  const filtered = MOCK_UNITS.filter((u) => {
    if (q && !`${u.nickname} ${u.siteCustomerName} ${u.manufacturer} ${u.modelNumber} ${u.serialNumber} ${u.location}`
      .toLowerCase().includes(q.toLowerCase())) return false;
    if (typeFilter && !(u.equipmentType ?? "").toLowerCase().includes(typeFilter)) return false;
    return true;
  });

  const customerGroups: Array<{ customer: string; units: MockUnit[] }> = [];
  const seenCustomers = new Map<string, MockUnit[]>();
  filtered.forEach((u) => {
    const cust = u.siteCustomerName ?? "Uncategorized";
    if (!seenCustomers.has(cust)) {
      seenCustomers.set(cust, []);
      customerGroups.push({ customer: cust, units: seenCustomers.get(cust)! });
    }
    seenCustomers.get(cust)!.push(u);
  });

  const kpiFilteredGroups = kpiFilter === null
    ? customerGroups
    : customerGroups.filter(({ units }) => {
        if (kpiFilter === "attention")     return units.some((u) => u.status === "critical");
        if (kpiFilter === "monitoring")    return units.some((u) => u.status === "monitoring");
        if (kpiFilter === "return-visits") return units.some((u) => u.status === "needs-follow-up");
        return true;
      });

  const kpiFilteredUnits = kpiFilter === null
    ? filtered
    : filtered.filter((u) => {
        if (kpiFilter === "attention")     return u.status === "critical";
        if (kpiFilter === "monitoring")    return u.status === "monitoring";
        if (kpiFilter === "return-visits") return u.status === "needs-follow-up";
        return true;
      });

  const needsAttentionCount = MOCK_UNITS.filter((u) => u.status === "critical").length;
  const monitoringCount     = MOCK_UNITS.filter((u) => u.status === "monitoring").length;
  const returnVisitCount    = MOCK_UNITS.filter((u) => u.status === "needs-follow-up").length;
  const equipmentCount      = MOCK_UNITS.filter((u) => !u.isArchived).length;

  // ─── Search autocomplete ──────────────────────────────────────────────────
  const autocompleteCandidates = useMemo(() => {
    const seen = new Set<string>();
    MOCK_UNITS.forEach((u) => {
      [u.siteCustomerName, u.location, u.nickname, u.manufacturer, u.modelNumber, u.serialNumber]
        .forEach((v) => { if (v) seen.add(v); });
    });
    return Array.from(seen).sort();
  }, []);

  const suggestion = useMemo(() => {
    if (!q.trim() || q.length < 2) return "";
    const lower = q.toLowerCase();
    return autocompleteCandidates.find((c) => c.toLowerCase().startsWith(lower)) ?? "";
  }, [q, autocompleteCandidates]);

  const toggleCustomer = (customer: string) => {
    setExpandedCustomers((prev) => {
      const next = new Set(prev);
      next.has(customer) ? next.delete(customer) : next.add(customer);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-transparent pb-16">
      {/* Header */}
      <header className="bg-white border-b border-[#E6EDF8] sticky top-7 z-50">
        <div className="max-w-2xl mx-auto px-4 h-12 flex items-center justify-between">
          <button
            onClick={onOpenDrawer}
            className="flex items-center gap-2 active:opacity-60 transition-opacity"
          >
            <div className="w-6 h-6 bg-blue-50 rounded-lg flex items-center justify-center">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <span className="font-extrabold text-slate-800 text-sm">Customers & Sites</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl h-8 px-3 text-xs">
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Unit
          </Button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">
        {/* Search with ghost-text autocomplete */}
        <div className="relative bg-white rounded-xl shadow-sm border border-[#E6EDF8]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 z-10 pointer-events-none" />
          {suggestion && suggestion !== q && (
            <div
              aria-hidden="true"
              className="absolute inset-0 flex items-center pl-9 pr-4 pointer-events-none overflow-hidden select-none"
            >
              <span className="invisible text-sm whitespace-pre">{q}</span>
              <span className="text-slate-300 text-sm whitespace-pre">{suggestion.slice(q.length)}</span>
            </div>
          )}
          <input
            type="text"
            placeholder="Search customers, sites, units, models, or serials…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if ((e.key === "Tab" || e.key === "Enter") && suggestion && suggestion !== q) {
                e.preventDefault();
                setQ(suggestion);
              }
            }}
            className="w-full h-10 pl-9 pr-4 text-sm rounded-xl border border-slate-200 bg-transparent focus:outline-none focus:border-blue-300 relative z-0"
          />
        </div>

        {/* KPI Quick-Nav (2×2) */}
        <div className="grid grid-cols-2 gap-2">
          {([
            {
              filterKey: null as KpiFilterType,
              label: "Equipment",
              subtitle: `${equipmentCount} total`,
              Icon: Building2,
              value: equipmentCount,
              hasItems: equipmentCount > 0,
              colorOn:  "bg-slate-100 text-slate-800 border-slate-300",
              colorOff: "bg-white text-slate-600 border-slate-200",
              accentOn:  "bg-slate-300 text-slate-600",
              accentOff: "bg-slate-100 text-slate-400",
            },
            {
              filterKey: "attention" as KpiFilterType,
              label: "Needs Service",
              subtitle: needsAttentionCount > 0
                ? `${needsAttentionCount} unit${needsAttentionCount !== 1 ? "s" : ""}`
                : "All clear",
              Icon: AlertCircle,
              value: needsAttentionCount,
              hasItems: needsAttentionCount > 0,
              colorOn:  "bg-red-50 text-red-900 border-red-200",
              colorOff: "bg-white text-slate-600 border-slate-200",
              accentOn:  "bg-red-100 text-red-600",
              accentOff: "bg-slate-100 text-slate-400",
            },
            {
              filterKey: "monitoring" as KpiFilterType,
              label: "Monitoring",
              subtitle: monitoringCount > 0 ? `${monitoringCount} active` : "None active",
              Icon: CircleDot,
              value: monitoringCount,
              hasItems: monitoringCount > 0,
              colorOn:  "bg-blue-50 text-blue-900 border-blue-200",
              colorOff: "bg-white text-slate-600 border-slate-200",
              accentOn:  "bg-blue-100 text-blue-600",
              accentOff: "bg-slate-100 text-slate-400",
            },
            {
              filterKey: "return-visits" as KpiFilterType,
              label: "Return Visits",
              subtitle: returnVisitCount > 0 ? `${returnVisitCount} scheduled` : "None pending",
              Icon: Calendar,
              value: returnVisitCount,
              hasItems: returnVisitCount > 0,
              colorOn:  "bg-amber-50 text-amber-900 border-amber-200",
              colorOff: "bg-white text-slate-600 border-slate-200",
              accentOn:  "bg-amber-100 text-amber-600",
              accentOff: "bg-slate-100 text-slate-400",
            },
          ] as const).map(({ filterKey, label, subtitle, Icon, value, hasItems, colorOn, colorOff, accentOn, accentOff }) => {
            const isSelected = filterKey !== null && kpiFilter === filterKey;
            return (
              <button
                key={label}
                onClick={() => {
                  if (filterKey === null) {
                    setKpiFilter(null);
                    setTimeout(() => customerSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
                  } else {
                    setKpiFilter((prev) => (prev === filterKey ? null : filterKey));
                  }
                }}
                className={`flex flex-col justify-between p-2.5 rounded-2xl border text-left
                  transition-all duration-150 active:scale-[0.96]
                  ${isSelected ? "ring-2 ring-blue-300 ring-offset-2 ring-offset-[#EEF4FF] shadow-xl scale-[1.01]" : "shadow-md hover:shadow-lg"}
                  ${hasItems ? colorOn : colorOff}`}
              >
                <div className={`w-5 h-5 rounded-md flex items-center justify-center mb-1.5 ${hasItems ? accentOn : accentOff}`}>
                  <Icon className="w-3 h-3" />
                </div>
                <span className="text-lg font-extrabold leading-none block">{value}</span>
                <span className="text-[10px] font-semibold mt-0.5 opacity-70 leading-tight block">{label}</span>
                <span className="text-[9px] font-medium opacity-50 leading-none block mt-0.5">{subtitle}</span>
              </button>
            );
          })}
        </div>

        {/* PM Due — future KPI placeholder (dev preview only) */}
        <div className="flex items-center gap-3 px-3 py-2 rounded-2xl border border-dashed border-slate-200 bg-white">
          <div className="w-5 h-5 bg-slate-100 rounded-md flex items-center justify-center flex-shrink-0">
            <Wrench className="w-3 h-3 text-slate-300" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-semibold text-slate-400">PM Due</span>
            <span className="text-[10px] text-slate-300 ml-1.5">— KPI planned for next release</span>
          </div>
          <span className="text-[9px] font-bold text-slate-300 border border-slate-200 px-1.5 py-0.5 rounded-full flex-shrink-0">Soon</span>
        </div>

        {/* Active filter pill */}
        {kpiFilter && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-[#D7E3F7] rounded-full px-2.5 py-0.5 flex items-center gap-1">
              Filtered
              <button onClick={() => setKpiFilter(null)} className="ml-0.5 opacity-60 hover:opacity-100" aria-label="Clear filter">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
            <span className="text-[11px] text-slate-400">Tap card again to clear</span>
          </div>
        )}

        {/* Section header + view toggle */}
        <div ref={customerSectionRef} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-100 rounded-xl flex items-center justify-center">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <h2 className="font-extrabold text-slate-800 text-sm">Customers & Sites</h2>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{MOCK_UNITS.length}</span>
          </div>
          <div className="flex bg-slate-100 rounded-full p-0.5">
            <button
              onClick={() => setViewMode("customers")}
              className={`text-xs font-bold px-2.5 py-0.5 rounded-full transition-all ${viewMode === "customers" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}
            >
              By Customer
            </button>
            <button
              onClick={() => setViewMode("all")}
              className={`text-xs font-bold px-2.5 py-0.5 rounded-full transition-all ${viewMode === "all" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}
            >
              All Units
            </button>
          </div>
        </div>

        {/* Type chips */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setTypeFilter("")}
            className={`flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${
              typeFilter === ""
                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                : "bg-[#F4F7FC] text-slate-600 border-[#D7E3F7] hover:bg-blue-50 hover:border-blue-200"
            }`}
          >
            All
          </button>
          {TYPE_CHIPS.filter((chip) =>
            MOCK_UNITS.some((u) => (u.equipmentType ?? "").toLowerCase().includes(chip.match))
          ).map((chip) => (
            <button
              key={chip.match}
              onClick={() => setTypeFilter(typeFilter === chip.match ? "" : chip.match)}
              className={`flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${
                typeFilter === chip.match
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "bg-[#F4F7FC] text-slate-600 border-[#D7E3F7] hover:bg-blue-50 hover:border-blue-200"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Content: customer-grouped or flat */}
        {viewMode === "customers" ? (
          kpiFilteredGroups.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
              <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No customers match your filter.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {kpiFilteredGroups.map(({ customer, units }) => (
                <CustomerGroupCard
                  key={customer}
                  customer={customer}
                  units={units}
                  expanded={expandedCustomers.has(customer)}
                  onToggle={() => toggleCustomer(customer)}
                  onSelectUnit={onSelectUnit}
                />
              ))}
            </div>
          )
        ) : (
          kpiFilteredUnits.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
              <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No units match your filter.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {kpiFilteredUnits.map((u) => (
                <UnitCard key={u.id} unit={u} onSelect={() => onSelectUnit(u)} />
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}

// ─── Equipment Detail Preview ─────────────────────────────────────────────────

// ─── Service History filter config ───────────────────────────────────────────

const HISTORY_FILTER_CHIPS: Array<{ key: string; label: string; types: string[] | null }> = [
  { key: "All",         label: "All",         types: null                },
  { key: "Diagnostics", label: "Diagnostics", types: ["diagnostic"]     },
  { key: "Repairs",     label: "Repairs",     types: ["repair"]         },
  { key: "Maintenance", label: "Maintenance", types: ["maintenance"]    },
  { key: "Notes",       label: "Notes",       types: ["note"]           },
  { key: "Reminders",   label: "Reminders",   types: ["reminder"]       },
];

const HISTORY_EMPTY_STATES: Record<string, { message: string; action: string }> = {
  Diagnostics: { message: "No diagnostics recorded yet.",    action: "Run Diagnosis"  },
  Repairs:     { message: "No repairs recorded yet.",        action: "Add Repair"     },
  Maintenance: { message: "No maintenance history.",         action: "Add PM Entry"   },
  Notes:       { message: "No technician notes yet.",        action: "Add Note"       },
  Reminders:   { message: "No reminders or follow-ups set.", action: "Add Reminder"   },
};

// ─── Equipment detail view ────────────────────────────────────────────────────

function EquipmentDetailPreview({
  unit,
  onBack,
  onOpenDrawer,
}: {
  unit: MockUnit;
  onBack: () => void;
  onOpenDrawer: () => void;
}) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("timeline");
  const [progressOpen, setProgressOpen] = useState(true);
  const [voiceNotes, setVoiceNotes] = useState<VoiceNoteEntry[]>([]);

  // ── Service History filter — persisted per unit in localStorage ─────────────
  const [historyFilter, setHistoryFilter] = useState<string>(() => {
    try { return localStorage.getItem(`unitdown_dev_hf_${unit.id}`) ?? "All"; } catch { return "All"; }
  });
  const [historySearch, setHistorySearch] = useState("");

  // Restore when the user navigates to a different unit (component stays mounted)
  useEffect(() => {
    try { setHistoryFilter(localStorage.getItem(`unitdown_dev_hf_${unit.id}`) ?? "All"); } catch { setHistoryFilter("All"); }
    setHistorySearch("");
  }, [unit.id]);

  // Persist filter selection
  useEffect(() => {
    try { localStorage.setItem(`unitdown_dev_hf_${unit.id}`, historyFilter); } catch {}
  }, [historyFilter, unit.id]);

  // Filtered + searched timeline
  const filteredTimeline = useMemo(() => {
    const chip = HISTORY_FILTER_CHIPS.find((c) => c.key === historyFilter);
    let items = chip?.types ? MOCK_TIMELINE.filter((e) => chip.types!.includes(e.eventType)) : MOCK_TIMELINE;
    const q = historySearch.trim().toLowerCase();
    if (q) {
      items = items.filter((e) =>
        [e.title, e.description, e.found, e.action, e.result, e.technicianNotes, e.followUp]
          .some((f) => f?.toLowerCase().includes(q))
      );
    }
    return items;
  }, [historyFilter, historySearch]);

  const sc = unitStatusConfig(unit.status);

  const hasEquipment = unit.manufacturer || unit.modelNumber || unit.serialNumber ||
    unit.equipmentType || unit.systemType || unit.refrigerantType || unit.capacityTons || unit.manufactureDate;
  const hasElectrical = unit.voltage || unit.phase || unit.mca || unit.mocp || unit.rla || unit.lra;

  const progressSteps = [
    { label: "Customer / Site Added",      done: !!unit.siteCustomerName },
    { label: "Nameplate Scanned",           done: false },
    { label: "Equipment Info Recorded",     done: !!(unit.manufacturer && unit.equipmentType) },
    { label: "Symptoms Documented",         done: unit.status !== "operational" },
    { label: "AI Diagnosis Run",            done: unit.status === "critical" || unit.status === "monitoring" },
    { label: "Field Measurements Recorded", done: !!(unit.mca || unit.mocp) },
    { label: "Service Timeline Started",    done: true },
    { label: "Repair / Parts Tracked",      done: unit.status !== "archived" },
    { label: "Issue Resolved",              done: unit.status === "operational" || unit.status === "archived" },
  ];

  return (
    <div className="min-h-screen bg-transparent pb-16">
      {/* Header */}
      <header className="bg-white border-b border-[#E6EDF8] sticky top-7 z-50">
        <div className="max-w-2xl mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-1 min-w-0">
            <button onClick={onBack} className="text-slate-400 active:text-slate-700 p-1 flex-shrink-0">
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
            <button
              onClick={onOpenDrawer}
              className="text-sm font-semibold text-blue-600 truncate max-w-[110px] active:opacity-60 transition-opacity"
            >
              {unit.siteCustomerName ?? "Customers"}
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
            <span className="text-sm font-extrabold text-slate-800 truncate max-w-[110px]">
              {unit.nickname ?? unit.modelNumber ?? "Unit"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button className={`p-1.5 rounded-xl ${unit.isFavorite ? "text-yellow-400" : "text-slate-300"}`}>
              <Star className={`w-4 h-4 ${unit.isFavorite ? "fill-yellow-400" : ""}`} />
            </button>
            <button className="text-slate-400 p-1.5 rounded-xl hover:bg-slate-100">
              <Edit2 className="w-4 h-4" />
            </button>
            <button className="text-slate-300 p-1.5 rounded-xl hover:bg-red-50">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">

        {/* Equipment Identity Card */}
        <div className="bg-white rounded-2xl border border-[#E6EDF8] overflow-hidden shadow-md shadow-slate-200/80">
          <div className={`h-1.5 w-full ${sc.strip}`} />
          <div className="p-4">
            {/* Name row + status badge */}
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${sc.bgCls} ${sc.textCls} ${sc.borderCls}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                    {sc.label}
                  </span>
                  {unit.equipmentType && (
                    <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded-full">
                      {unit.equipmentType}
                    </span>
                  )}
                </div>
                <h1 className="text-lg font-extrabold text-slate-900 leading-tight">
                  {unit.nickname ?? unit.modelNumber ?? "Unnamed Unit"}
                </h1>
                {unit.siteCustomerName && (
                  <p className="text-sm text-slate-600 font-medium mt-0.5">{unit.siteCustomerName}</p>
                )}
                {unit.location && (
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" />{unit.location}
                  </p>
                )}
              </div>
              {/* Nameplate thumbnail placeholder */}
              <div
                className="w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden border border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center gap-1 hover:border-blue-300 transition-colors"
                title="Nameplate photo (mock)"
              >
                <ZoomIn className="w-4 h-4 text-slate-300" />
                <span className="text-[8px] text-slate-300 font-medium">Nameplate</span>
              </div>
            </div>

            {/* Hero insight row — Last Visit · Open Issue · Next */}
            <div className="grid grid-cols-3 gap-1.5 mt-3 mb-3">
              <div className="bg-slate-50 rounded-xl px-2.5 py-2 border border-slate-100">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Last Visit</p>
                <p className="text-xs font-bold text-slate-700 mt-0.5">{unit.lastVisit ?? "—"}</p>
              </div>
              <div className={`rounded-xl px-2.5 py-2 border ${unit.openIssue ? "bg-amber-50 border-amber-100" : "bg-slate-50 border-slate-100"}`}>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Open Issue</p>
                <p className={`text-xs font-bold mt-0.5 line-clamp-1 ${unit.openIssue ? "text-amber-700" : "text-slate-400"}`}>
                  {unit.openIssue ?? "None"}
                </p>
              </div>
              <div className="bg-blue-50 rounded-xl px-2.5 py-2 border border-blue-100">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Next</p>
                <p className="text-xs font-bold text-blue-700 mt-0.5 line-clamp-1">{unit.nextAction}</p>
              </div>
            </div>

            {/* Quick spec chips */}
            {(unit.manufacturer || unit.modelNumber || unit.refrigerantType || unit.voltage || unit.capacityTons) && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {unit.manufacturer && <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-1 rounded-full font-semibold">{unit.manufacturer}</span>}
                {unit.modelNumber && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-full font-mono">{unit.modelNumber}</span>}
                {unit.refrigerantType && <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-1 rounded-full font-semibold border border-blue-100">{unit.refrigerantType}</span>}
                {unit.voltage && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-full">{unit.voltage}V</span>}
                {unit.capacityTons && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-full">{unit.capacityTons} tons</span>}
              </div>
            )}

            {(() => {
              const hasOpenIssue = !!unit.openIssue;
              const isFollowUp   = unit.status === "needs-follow-up";
              const ctaLabel =
                unit.status === "critical" && hasOpenIssue ? "Continue Diagnosis" :
                isFollowUp ? "Resume Repair" :
                unit.status === "monitoring" ? "Continue Diagnosis" :
                MOCK_TIMELINE.length === 0 ? "Start Diagnosis" :
                "New Diagnostic";
              const CtaIcon = isFollowUp ? Wrench : Activity;
              return (
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl h-10 text-sm">
                  <CtaIcon className="w-4 h-4 mr-2" />
                  {ctaLabel}
                </Button>
              );
            })()}
          </div>
        </div>

        {/* Equipment Memory */}
        <div className="bg-white rounded-2xl border border-[#E6EDF8] shadow-md shadow-slate-200/80 overflow-hidden">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-violet-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Brain className="w-4 h-4 text-violet-600" />
              </div>
              <p className="text-sm font-extrabold text-slate-900 flex-1">Equipment Memory</p>
              <span className="text-[9px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-semibold tracking-wide">AI · Coming Soon</span>
            </div>
            <ul className="space-y-2.5">
              {[
                "High head pressure reported 3 times — typically in summer",
                "Condenser coil cleaned every June–July",
                "Contactor replaced Nov 2024 — watch for recurrence",
                "Last refrigerant check: Jun 2026, charge within spec",
                "Customer usually requests Friday morning visits",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-violet-400 rounded-full mt-1.5 flex-shrink-0" />
                  <span className="text-xs text-slate-600 leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Quick Insights */}
        <div className="bg-white rounded-2xl border border-[#E6EDF8] shadow-md shadow-slate-200/80 overflow-hidden">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-sm font-extrabold text-slate-900 flex-1">Quick Insights</p>
              <span className="text-[9px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-semibold tracking-wide">Mock data</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Most Common Issue",        value: "High Head Pressure" },
                { label: "Avg. Days Between Visits", value: "47 days"            },
                { label: "Last Repair",              value: "Nov 2024"           },
                { label: "Most Recent PM",           value: "Q3 2025"            },
                { label: "Unit Age",                 value: "6 years"            },
                { label: "Warranty Expires",         value: "May 2027"           },
              ].map(({ label, value }) => (
                <div key={label} className="bg-slate-50 rounded-xl px-3 py-2.5">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide leading-tight">{label}</p>
                  <p className="text-xs font-bold text-slate-800 mt-0.5">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {(
            [
              { id: "timeline"  as const, label: "Service History",  Icon: History  },
              { id: "info"      as const, label: "Info",      Icon: Info     },
              { id: "photos"    as const, label: "Photos",    Icon: Camera   },
              { id: "resources" as const, label: "Resources", Icon: Search   },
              { id: "notes"     as const, label: "Notes",     Icon: FileText },
            ] as const
          ).map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-shrink-0 flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold transition-all duration-150 ${
                activeTab === id
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-[#F4F7FC] border border-[#D7E3F7] text-slate-600 hover:border-blue-300 hover:text-blue-600"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
              {id === "timeline" && (
                <span className={`text-[10px] ${activeTab === "timeline" ? "opacity-70" : "text-slate-400"}`}>
                  {MOCK_TIMELINE.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Service History Tab */}
        {activeTab === "timeline" && (
          <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">Service History</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {filteredTimeline.length}{" "}
                  {historyFilter === "All" && !historySearch
                    ? "entries on record"
                    : historySearch
                    ? "matching"
                    : `${historyFilter.toLowerCase()} ${filteredTimeline.length === 1 ? "entry" : "entries"}`}
                </p>
              </div>
              <button className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-3 py-1.5 text-xs transition-colors">
                <Plus className="w-3.5 h-3.5" />
                Add Entry
              </button>
            </div>

            {/* Quick-add row */}
            <div className="flex gap-2 mb-3 flex-wrap">
              {([
                { Icon: FileText, label: "Note"     },
                { Icon: Wrench,   label: "Repair"   },
                { Icon: Settings, label: "PM"       },
                { Icon: Bell,     label: "Reminder" },
              ] as const).map(({ Icon, label }) => (
                <button key={label} className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-600 hover:border-blue-300 hover:text-blue-600 transition-colors">
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>

            {/* Filter chips */}
            <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {HISTORY_FILTER_CHIPS.map((chip) => {
                const count = chip.types === null
                  ? MOCK_TIMELINE.length
                  : MOCK_TIMELINE.filter((e) => chip.types!.includes(e.eventType)).length;
                const active = historyFilter === chip.key;
                return (
                  <button
                    key={chip.key}
                    onClick={() => setHistoryFilter(chip.key)}
                    className={`flex-shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all duration-200 ${
                      active
                        ? "bg-slate-800 text-white shadow-sm scale-[1.03]"
                        : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {chip.label}
                    <span className={`text-[10px] font-bold tabular-nums ${active ? "opacity-70" : "opacity-50"}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder={`Search ${historyFilter === "All" ? "service history" : historyFilter.toLowerCase()}…`}
                className="w-full h-9 pl-9 pr-9 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-blue-300"
              />
              {historySearch && (
                <button
                  onClick={() => setHistorySearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 active:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Results list */}
            {filteredTimeline.length > 0 ? (
              <div key={`${historyFilter}::${historySearch}`} className="space-y-2">
                {filteredTimeline.map((ev, i) => (
                  <div
                    key={ev.id}
                    className="animate-in fade-in-0 slide-in-from-bottom-2 duration-200"
                    style={{ animationDelay: `${i * 35}ms`, animationFillMode: "backwards" }}
                  >
                    <TimelineCard event={ev} />
                  </div>
                ))}
              </div>
            ) : (
              /* Empty state */
              <div className="flex flex-col items-center gap-3 py-10 text-center animate-in fade-in-0 duration-200">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                  {historyFilter === "Repairs"     && <Wrench   className="w-5 h-5 text-slate-400" />}
                  {historyFilter === "Maintenance" && <Settings className="w-5 h-5 text-slate-400" />}
                  {historyFilter === "Notes"       && <FileText className="w-5 h-5 text-slate-400" />}
                  {historyFilter === "Reminders"   && <Bell     className="w-5 h-5 text-slate-400" />}
                  {historyFilter === "Diagnostics" && <Activity className="w-5 h-5 text-slate-400" />}
                  {historyFilter === "All"         && <History  className="w-5 h-5 text-slate-400" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-600">
                    {historySearch
                      ? `No ${historyFilter === "All" ? "entries" : historyFilter.toLowerCase()} matching "${historySearch}"`
                      : (HISTORY_EMPTY_STATES[historyFilter]?.message ?? "No entries yet.")}
                  </p>
                </div>
                {!historySearch && historyFilter !== "All" && (
                  <button className="flex items-center gap-1.5 bg-blue-50 text-blue-700 font-bold rounded-xl px-4 py-2 text-xs hover:bg-blue-100 transition-colors">
                    <Plus className="w-3.5 h-3.5" />
                    {HISTORY_EMPTY_STATES[historyFilter]?.action ?? "Add Entry"}
                  </button>
                )}
                {historySearch && (
                  <button
                    onClick={() => setHistorySearch("")}
                    className="text-xs text-blue-600 font-semibold active:opacity-60"
                  >
                    Clear search
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Info Tab */}
        {activeTab === "info" && (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Nameplate Photo</p>
              <div className="w-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center gap-2 py-10">
                <ZoomIn className="w-8 h-8 text-slate-300" />
                <p className="text-xs text-slate-400 font-medium">No nameplate photo (mock)</p>
              </div>
            </div>
            {hasEquipment && (
              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-2">Equipment</p>
                <InfoRow label="Manufacturer" value={unit.manufacturer} />
                <InfoRow label="Model"        value={unit.modelNumber} />
                <InfoRow label="Serial"       value={unit.serialNumber} />
                <InfoRow label="Type"         value={unit.equipmentType} />
                <InfoRow label="System"       value={unit.systemType} />
                <InfoRow label="Refrigerant"  value={unit.refrigerantType} />
                <InfoRow label="Capacity"     value={unit.capacityTons ? `${unit.capacityTons} tons` : null} />
                <InfoRow label="Mfg. Date"    value={unit.manufactureDate} />
              </div>
            )}
            {hasElectrical && (
              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-2">Electrical</p>
                <InfoRow label="Voltage"   value={unit.voltage} />
                <InfoRow label="Phase"     value={unit.phase} />
                <InfoRow label="MCA"       value={unit.mca} />
                <InfoRow label="MOCP"      value={unit.mocp} />
                <InfoRow label="RLA / FLA" value={unit.rla} />
                <InfoRow label="LRA"       value={unit.lra} />
              </div>
            )}
            <button className="w-full flex items-center justify-center gap-2 text-xs font-bold text-slate-500 border border-dashed border-slate-300 rounded-2xl py-3 hover:border-blue-300 hover:text-blue-600 transition-colors">
              <Edit2 className="w-3.5 h-3.5" />
              Edit Equipment Details
            </button>
          </div>
        )}

        {/* Photos Tab */}
        {activeTab === "photos" && (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
              <Camera className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-500">Photo Album</p>
              <p className="text-xs text-slate-400 mt-1">Unit photos, field snapshots, and inspection images appear here.</p>
            </div>
            <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl border border-dashed border-slate-200 bg-slate-50">
              <Camera className="w-3.5 h-3.5 text-slate-300 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-400 leading-snug">
                <span className="font-semibold text-slate-500">Roadmap:</span> One-tap photo capture will attach photos directly to the current site, equipment, or timeline entry.
              </p>
            </div>
          </div>
        )}

        {/* Resources Tab */}
        {activeTab === "resources" && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Equipment Resources</p>
            {[
              { label: `${unit.manufacturer} ${unit.modelNumber} Install Manual`, type: "PDF" },
              { label: `${unit.manufacturer} ${unit.modelNumber} Service Manual`, type: "PDF" },
              { label: `${unit.manufacturer} ${unit.modelNumber} Parts List`,     type: "PDF" },
            ].map(({ label, type }) => (
              <div key={label} className="flex items-center justify-between gap-2 py-2 border-b border-slate-100 last:border-0">
                <p className="text-xs text-slate-700 font-medium">{label}</p>
                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">{type}</span>
              </div>
            ))}
          </div>
        )}

        {/* Notes Tab */}
        {activeTab === "notes" && (
          <div className="space-y-4">
            {unit.notes ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Notes</p>
                  <button className="text-xs text-blue-600 font-semibold hover:underline">Edit</button>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{unit.notes}</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-6 text-center">
                <FileText className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-500">No notes yet</p>
              </div>
            )}

            {/* Voice Notes */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              {/* Section header */}
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-blue-50 rounded-lg flex items-center justify-center">
                    <Mic className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <p className="text-xs font-extrabold text-slate-700 uppercase tracking-widest">Voice Notes</p>
                  {voiceNotes.length > 0 && (
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                      {voiceNotes.length}
                    </span>
                  )}
                </div>
              </div>

              {/* Saved voice notes list */}
              {voiceNotes.length > 0 && (
                <div className="px-4 pb-2 space-y-2">
                  {voiceNotes.map((vn) => (
                    <div key={vn.id} className="bg-slate-50 rounded-xl px-3 py-2.5">
                      <p className="text-sm text-slate-800 leading-relaxed">{vn.text}</p>
                      <p className="text-[10px] text-slate-400 mt-1.5">
                        {new Date(vn.savedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {" · "}Voice note
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Recorder */}
              <div className="px-4 pb-4 pt-1">
                <VoiceNoteRecorder
                  onSave={(entry) => setVoiceNotes((prev) => [entry, ...prev])}
                  placeholder="Tap the mic and speak — edit before saving…"
                  isPro
                />
              </div>
            </div>

            {/* Service Checklist */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <button onClick={() => setProgressOpen((v) => !v)} className="w-full flex items-center justify-between px-4 py-3 active:bg-slate-50 transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 bg-blue-50 rounded-lg flex items-center justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wide">Service Checklist</span>
                  <span className="text-xs text-slate-400">{progressSteps.filter((s) => s.done).length}/{progressSteps.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-extrabold ${Math.round((progressSteps.filter((s) => s.done).length / progressSteps.length) * 100) === 100 ? "text-emerald-600" : "text-slate-500"}`}>
                    {Math.round((progressSteps.filter((s) => s.done).length / progressSteps.length) * 100)}%
                  </span>
                  <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${progressOpen ? "rotate-90" : ""}`} />
                </div>
              </button>
              <div className="px-4 pb-2">
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${Math.round((progressSteps.filter((s) => s.done).length / progressSteps.length) * 100)}%` }}
                  />
                </div>
              </div>
              {progressOpen && (
                <div className="px-4 pb-4 pt-2 space-y-1.5 border-t border-slate-100">
                  {progressSteps.map((step) => (
                    <div key={step.label} className="flex items-center gap-2.5">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${step.done ? "bg-emerald-100" : "bg-slate-100"}`}>
                        {step.done ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <div className="w-2 h-2 rounded-full bg-slate-300" />}
                      </div>
                      <span className={`text-xs font-medium ${step.done ? "text-slate-700" : "text-slate-400"}`}>{step.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ─── Site Navigator Drawer ────────────────────────────────────────────────────

function SiteNavigatorDrawer({
  open,
  onClose,
  q,
  onQChange,
  selectedUnit,
  onSelectCustomer,
  onSelectUnit,
  pinnedCustomers,
  onTogglePin,
  recentCustomerNames,
}: {
  open: boolean;
  onClose: () => void;
  q: string;
  onQChange: (v: string) => void;
  selectedUnit: MockUnit | null;
  onSelectCustomer: (customer: string) => void;
  onSelectUnit: (unit: MockUnit) => void;
  pinnedCustomers: Set<string>;
  onTogglePin: (customer: string) => void;
  recentCustomerNames: string[];
}) {
  const lower = q.toLowerCase();
  const isSearching = q.trim().length > 0;

  const matchedUnits = isSearching
    ? MOCK_UNITS.filter((u) =>
        [u.siteCustomerName, u.location, u.nickname, u.manufacturer, u.modelNumber, u.serialNumber]
          .some((v) => v?.toLowerCase().includes(lower))
      )
    : MOCK_UNITS;

  const allCustomerNames = Array.from(
    new Set(matchedUnits.map((u) => u.siteCustomerName ?? "Uncategorized"))
  ).sort();

  // Pinned customers float to top
  const pinnedInList   = allCustomerNames.filter((c) => pinnedCustomers.has(c));
  const unpinnedInList = allCustomerNames.filter((c) => !pinnedCustomers.has(c));
  const customerNames  = [...pinnedInList, ...unpinnedInList];

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 z-[200] transition-opacity duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Bottom sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-[201] bg-white rounded-t-3xl shadow-2xl
          flex flex-col transition-transform duration-300 ease-out max-h-[80vh]
          ${open ? "translate-y-0" : "translate-y-full"}`}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        {/* Header + search */}
        <div className="px-4 pt-1 pb-3 flex-shrink-0">
          <p className="text-sm font-extrabold text-slate-900 mb-3">Jump to Site or Equipment</p>
          <div className="relative bg-slate-50 rounded-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Customer, site, unit, manufacturer…"
              value={q}
              onChange={(e) => onQChange(e.target.value)}
              className="w-full h-10 pl-9 pr-8 text-sm rounded-xl border border-slate-200 bg-transparent focus:outline-none focus:border-blue-300"
            />
            {q && (
              <button
                onClick={() => onQChange("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable results */}
        <div className="overflow-y-auto flex-1 px-4 pb-10 space-y-5">

          {/* Recent Sites — shown only when not actively searching */}
          {!isSearching && recentCustomerNames.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Recent</p>
              <div className="space-y-1">
                {recentCustomerNames.map((customer) => (
                  <button
                    key={customer}
                    onClick={() => { onSelectCustomer(customer); onClose(); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50 active:bg-blue-50 transition-colors text-left"
                  >
                    <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <span className="text-sm font-semibold text-slate-700">{customer}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 ml-auto flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Customers — with pin toggles */}
          {customerNames.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                {isSearching ? "Customers" : "All Customers"}
              </p>
              <div className="space-y-1">
                {customerNames.map((customer) => {
                  const isPinned = pinnedCustomers.has(customer);
                  return (
                    <div key={customer} className="flex items-center gap-1">
                      <button
                        onClick={() => { onSelectCustomer(customer); onClose(); }}
                        className="flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50 active:bg-blue-50 transition-colors text-left min-w-0"
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isPinned ? "bg-amber-100" : "bg-blue-100"}`}>
                          {isPinned
                            ? <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                            : <Building2 className="w-3.5 h-3.5 text-blue-600" />
                          }
                        </div>
                        <span className="text-sm font-semibold text-slate-800 truncate">{customer}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 ml-auto flex-shrink-0" />
                      </button>
                      <button
                        onClick={() => onTogglePin(customer)}
                        className={`p-2 rounded-xl transition-colors flex-shrink-0 ${isPinned ? "text-amber-400" : "text-slate-300 active:text-amber-300"}`}
                        aria-label={isPinned ? "Unpin site" : "Pin site"}
                      >
                        <Star className={`w-4 h-4 ${isPinned ? "fill-amber-400" : ""}`} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Equipment */}
          {matchedUnits.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Equipment</p>
              <div className="space-y-1">
                {matchedUnits.map((u) => {
                  const sc = unitStatusConfig(u.status);
                  const isActive = selectedUnit?.id === u.id;
                  return (
                    <button
                      key={u.id}
                      onClick={() => { onSelectUnit(u); onClose(); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left ${
                        isActive ? "bg-blue-50" : "bg-slate-50 active:bg-slate-100"
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${sc.bgCls}`}>
                        <span className={`w-2 h-2 rounded-full ${sc.dot}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800 leading-tight">
                          {u.nickname ?? u.modelNumber}
                        </p>
                        <p className="text-xs text-slate-400 truncate">{u.siteCustomerName}</p>
                      </div>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${sc.bgCls} ${sc.textCls}`}>
                        {sc.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {customerNames.length === 0 && matchedUnits.length === 0 && (
            <div className="py-10 text-center">
              <Search className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No results for "{q}"</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Root preview page ────────────────────────────────────────────────────────

export default function DevEquipmentPreview() {
  if (!import.meta.env.DEV) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500 text-sm">Not found.</p>
      </div>
    );
  }

  // Restore last viewed unit from localStorage on mount
  const [selectedUnit, setSelectedUnit] = useState<MockUnit | null>(() => {
    try {
      const lastId = localStorage.getItem("unitdown_dev_last_unit_id");
      return lastId ? (MOCK_UNITS.find((u) => u.id === lastId) ?? null) : null;
    } catch { return null; }
  });

  const [drawerOpen, setDrawerOpen]   = useState(false);
  const [drawerQ,    setDrawerQ]      = useState("");

  // Pinned customers — persisted to localStorage
  const [pinnedCustomers, setPinnedCustomers] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem("unitdown_dev_pinned");
      return stored ? new Set<string>(JSON.parse(stored) as string[]) : new Set<string>();
    } catch { return new Set<string>(); }
  });

  // Recent unit IDs — persisted to localStorage (max 10 entries)
  const [recentUnitIds, setRecentUnitIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("unitdown_dev_recents");
      return stored ? (JSON.parse(stored) as string[]) : [];
    } catch { return []; }
  });

  // Derive unique recent customer names (max 4) from recent unit history
  const recentCustomerNames = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    recentUnitIds.forEach((id) => {
      const cust = MOCK_UNITS.find((u) => u.id === id)?.siteCustomerName;
      if (cust && !seen.has(cust)) { seen.add(cust); result.push(cust); }
    });
    return result.slice(0, 4);
  }, [recentUnitIds]);

  const handleSelectUnit = (unit: MockUnit) => {
    setSelectedUnit(unit);
    try { localStorage.setItem("unitdown_dev_last_unit_id", unit.id); } catch {}
    setRecentUnitIds((prev) => {
      const next = [unit.id, ...prev.filter((id) => id !== unit.id)].slice(0, 10);
      try { localStorage.setItem("unitdown_dev_recents", JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const handleBack = () => {
    setSelectedUnit(null);
    try { localStorage.removeItem("unitdown_dev_last_unit_id"); } catch {}
  };

  const handleTogglePin = (customer: string) => {
    setPinnedCustomers((prev) => {
      const next = new Set(prev);
      next.has(customer) ? next.delete(customer) : next.add(customer);
      try { localStorage.setItem("unitdown_dev_pinned", JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  const openDrawer  = () => { setDrawerQ(""); setDrawerOpen(true); };
  const closeDrawer = () => { setDrawerOpen(false); };

  return (
    <div className="bg-[#EEF4FF] min-h-screen">
      {/* Dev banner — always on top */}
      <div className="bg-amber-400 text-amber-900 text-center py-1.5 text-xs font-bold tracking-wide sticky top-0 z-[100]">
        DEV PREVIEW · Mock data only · Not visible in production
      </div>

      {/* Searchable site navigator drawer */}
      <SiteNavigatorDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        q={drawerQ}
        onQChange={setDrawerQ}
        selectedUnit={selectedUnit}
        onSelectCustomer={() => {
          setSelectedUnit(null);
          try { localStorage.removeItem("unitdown_dev_last_unit_id"); } catch {}
        }}
        onSelectUnit={handleSelectUnit}
        pinnedCustomers={pinnedCustomers}
        onTogglePin={handleTogglePin}
        recentCustomerNames={recentCustomerNames}
      />

      {selectedUnit ? (
        <EquipmentDetailPreview
          unit={selectedUnit}
          onBack={handleBack}
          onOpenDrawer={openDrawer}
        />
      ) : (
        <EquipmentLibraryPreview
          onSelectUnit={handleSelectUnit}
          onOpenDrawer={openDrawer}
        />
      )}
    </div>
  );
}
