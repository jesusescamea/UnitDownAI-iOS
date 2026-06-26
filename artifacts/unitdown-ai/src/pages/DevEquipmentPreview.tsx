/**
 * DEV-ONLY: /dev/equipment-preview
 * Visual preview of the Equipment Library and Equipment Detail redesigns.
 * Renders with 100% fake data — no Clerk, no API calls, no auth required.
 * Blocked from rendering in production via import.meta.env.DEV guard.
 */

import { useState } from "react";
import {
  Activity, AlertCircle, Bell, Camera, CheckCircle2, ChevronRight,
  CircleDot, Clock, Edit2, FileText, History, Info, Layers,
  Loader2, MapPin, Plus, Search, Settings, Star, Trash2, Wrench,
  ZoomIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
}

const MOCK_UNITS: MockUnit[] = [
  {
    id: "1",
    nickname: "Roof Unit A",
    siteCustomerName: "Sunrise Medical Center",
    location: "Roof — Zone A",
    manufacturer: "Carrier",
    modelNumber: "48XLT016-6",
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
  },
  {
    id: "2",
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
    status: "monitoring",
  },
  {
    id: "3",
    nickname: "Chiller #1",
    siteCustomerName: "Harbor View Hotel",
    location: "Central Plant",
    manufacturer: "York",
    modelNumber: "YLAA0152SE",
    serialNumber: "NUPM123456",
    equipmentType: "Chiller",
    systemType: "Air-Cooled",
    refrigerantType: "R-134a",
    voltage: "480",
    phase: "3",
    mca: "86.0",
    mocp: "100",
    rla: "78.4",
    lra: null,
    capacityTons: "45.0",
    manufactureDate: "2019-06",
    notes: "Annual PM completed 2025-04. Condenser coils cleaned.",
    isFavorite: false,
    isArchived: false,
    status: "operational",
  },
  {
    id: "4",
    nickname: "Split #4 Office",
    siteCustomerName: "Greenfield Realty",
    location: "3rd Floor East Wing",
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
  },
  {
    id: "5",
    nickname: "Old Boiler",
    siteCustomerName: "Riverside Elementary",
    location: "Boiler Room",
    manufacturer: "Weil-McLain",
    modelNumber: "80-5",
    serialNumber: null,
    equipmentType: "Boiler",
    systemType: "Hot Water",
    refrigerantType: null,
    voltage: "120",
    phase: "1",
    mca: null,
    mocp: null,
    rla: null,
    lra: null,
    capacityTons: null,
    manufactureDate: "2003-01",
    notes: "Unit slated for replacement. Track-only.",
    isFavorite: false,
    isArchived: true,
    status: "archived",
  },
];

const MOCK_TIMELINE = [
  { id: "t1", eventType: "diagnostic", title: "High-head pressure — compressor fault", status: "unresolved", eventDate: Date.now() - 86400000 * 2, description: "Found 410 psi on high side. Ambient 95°F. Condenser coils fouled.", technicianNotes: "Cleaned coils — pressure came down to 340 psi. Scheduling follow-up.", source: "log" as const, confidencePercent: 88 },
  { id: "t2", eventType: "repair", title: "Contactor replaced — compressor circuit", status: "resolved", eventDate: Date.now() - 86400000 * 30, description: null, technicianNotes: "OEM contactor 40A/3-pole. Unit back online same day.", source: "manual" as const, confidencePercent: null },
  { id: "t3", eventType: "maintenance", title: "Quarterly PM — filter change", status: "resolved", eventDate: Date.now() - 86400000 * 90, description: "Replaced (4) MERV-13 filters. Checked belts, coils, drain pan.", technicianNotes: null, source: "manual" as const, confidencePercent: null },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusDot({ status }: { status: UnitStatus }) {
  const colors: Record<UnitStatus, string> = {
    operational: "bg-emerald-500",
    monitoring: "bg-blue-500",
    "needs-follow-up": "bg-amber-400",
    critical: "bg-red-500",
    archived: "bg-slate-400",
  };
  return <span className={`w-2 h-2 rounded-full flex-shrink-0 ${colors[status]}`} />;
}

function UnitCard({ unit, onSelect }: { unit: MockUnit; onSelect: () => void }) {
  const sc = unitStatusConfig(unit.status);
  return (
    <button
      onClick={onSelect}
      className="w-full text-left bg-white rounded-2xl border border-slate-200 p-3.5 shadow-sm active:bg-slate-50 transition-colors hover:border-blue-300 hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        {/* Status dot */}
        <div className="mt-1 flex-shrink-0">
          <StatusDot status={unit.status} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-extrabold text-slate-900 leading-tight">
                  {unit.nickname ?? unit.modelNumber ?? "Unnamed Unit"}
                </span>
                {unit.isFavorite && <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400 flex-shrink-0" />}
              </div>
              {unit.siteCustomerName && (
                <p className="text-xs text-slate-500 font-medium mt-0.5">{unit.siteCustomerName}</p>
              )}
              {unit.location && (
                <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" />{unit.location}
                </p>
              )}
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0 mt-0.5" />
          </div>

          {/* Tags */}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sc.bgCls} ${sc.textCls} ${sc.borderCls}`}>
              {sc.label}
            </span>
            {unit.equipmentType && (
              <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">
                {unit.equipmentType}
              </span>
            )}
            {unit.manufacturer && (
              <span className="text-[10px] text-slate-400 font-medium">{unit.manufacturer}</span>
            )}
          </div>
        </div>
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
  const typeCfgs: Record<string, { bg: string; color: string; Icon: typeof Activity }> = {
    diagnostic: { bg: "bg-blue-50",    color: "text-blue-600",   Icon: Activity  },
    repair:     { bg: "bg-orange-50",  color: "text-orange-600", Icon: Wrench    },
    maintenance:{ bg: "bg-emerald-50", color: "text-emerald-600",Icon: Settings  },
  };
  const stCfg: Record<string, { label: string; className: string }> = {
    unresolved: { label: "Unresolved", className: "bg-amber-100 text-amber-800 border-amber-200" },
    resolved:   { label: "Resolved",   className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  };
  const typeCfg = typeCfgs[event.eventType] ?? typeCfgs.diagnostic;
  const statusCfg = event.status ? stCfg[event.status] : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <button onClick={() => setOpen((v) => !v)} className="w-full text-left p-4 active:bg-slate-50">
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
              <span className={`text-xs font-semibold ${typeCfg.color} capitalize`}>{event.eventType}</span>
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
      {open && (
        <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-2">
          {event.description && <p className="text-sm text-slate-600 leading-relaxed">{event.description}</p>}
          {event.technicianNotes && (
            <div className="bg-slate-50 rounded-xl px-3 py-2.5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Technician Notes</p>
              <p className="text-sm text-slate-700 leading-relaxed">{event.technicianNotes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Equipment Library Preview ────────────────────────────────────────────────

const TYPE_CHIPS = [
  { label: "RTU",         match: "rtu" },
  { label: "Split",       match: "split" },
  { label: "Chiller",     match: "chiller" },
  { label: "AHU",         match: "ahu" },
  { label: "Boiler",      match: "boiler" },
];

function EquipmentLibraryPreview({ onSelectUnit }: { onSelectUnit: (unit: MockUnit) => void }) {
  const [typeFilter, setTypeFilter] = useState("");
  const [q, setQ] = useState("");

  const filtered = MOCK_UNITS.filter((u) => {
    if (q && !`${u.nickname} ${u.siteCustomerName} ${u.manufacturer} ${u.modelNumber}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (typeFilter && !(u.equipmentType ?? "").toLowerCase().includes(typeFilter)) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-slate-900 text-sm">Equipment Library</span>
          </div>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl h-8 px-3 text-xs">
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Unit
          </Button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search equipment…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full h-9 pl-9 pr-4 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-blue-300"
          />
        </div>

        {/* Type chips */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setTypeFilter("")}
            className={`flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${
              typeFilter === ""
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
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
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Section header */}
        <div className="flex items-center justify-between">
          <h2 className="font-extrabold text-slate-900 text-sm">Equipment Library</h2>
          <span className="text-xs text-slate-400">{filtered.length} unit{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        {/* Unit cards */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
            <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No units match your filter.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((u) => (
              <UnitCard key={u.id} unit={u} onSelect={() => onSelectUnit(u)} />
            ))}
          </div>
        )}

        {/* KPI row */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Equipment",  value: MOCK_UNITS.filter((u) => !u.isArchived).length },
            { label: "Critical",   value: MOCK_UNITS.filter((u) => u.status === "critical").length },
            { label: "Monitoring", value: MOCK_UNITS.filter((u) => u.status === "monitoring").length },
            { label: "Follow-up",  value: MOCK_UNITS.filter((u) => u.status === "needs-follow-up").length },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-200 px-3 py-2.5 text-center">
              <p className="text-lg font-extrabold text-slate-900">{value}</p>
              <p className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Equipment Detail Preview ─────────────────────────────────────────────────

function EquipmentDetailPreview({ unit, onBack }: { unit: MockUnit; onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("timeline");
  const [progressOpen, setProgressOpen] = useState(true);
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
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="text-slate-400 hover:text-slate-700 p-1">
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
                <Layers className="w-4 h-4 text-white" />
              </div>
              <span className="font-extrabold text-slate-900 text-sm truncate max-w-[160px]">
                {unit.nickname ?? unit.modelNumber ?? "Unit"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button className={`p-1.5 rounded-xl ${unit.isFavorite ? "text-yellow-500" : "text-slate-400"}`}>
              <Star className={`w-4 h-4 ${unit.isFavorite ? "fill-yellow-400" : ""}`} />
            </button>
            <button className="text-slate-500 p-1.5 rounded-xl hover:bg-slate-100">
              <Edit2 className="w-4 h-4" />
            </button>
            <button className="text-slate-400 p-1.5 rounded-xl hover:bg-red-50">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">

        {/* Equipment Identity Card */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
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
                className="w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden border border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-blue-300 transition-colors"
                title="Nameplate photo (mock)"
              >
                <ZoomIn className="w-4 h-4 text-slate-300" />
                <span className="text-[8px] text-slate-300 font-medium">Nameplate</span>
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

            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl h-10 text-sm">
              <Activity className="w-4 h-4 mr-2" />
              Run AI Diagnosis
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {(
            [
              { id: "timeline"  as const, label: "Timeline",  Icon: History   },
              { id: "info"      as const, label: "Info",      Icon: Info      },
              { id: "photos"    as const, label: "Photos",    Icon: Camera    },
              { id: "resources" as const, label: "Resources", Icon: Search    },
              { id: "notes"     as const, label: "Notes",     Icon: FileText  },
            ] as const
          ).map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-shrink-0 flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold transition-all duration-150 ${
                activeTab === id
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600"
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

        {/* Timeline Tab */}
        {activeTab === "timeline" && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">Service Timeline</p>
                <p className="text-xs text-slate-400 mt-0.5">{MOCK_TIMELINE.length} events</p>
              </div>
              <button className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-3 py-1.5 text-xs transition-colors">
                <Plus className="w-3.5 h-3.5" />
                Add Entry
              </button>
            </div>
            <div className="flex gap-2 mb-3 flex-wrap">
              {[
                { Icon: FileText, label: "Note" },
                { Icon: Wrench, label: "Repair" },
                { Icon: Settings, label: "PM" },
                { Icon: Bell, label: "Reminder" },
              ].map(({ Icon, label }) => (
                <button key={label} className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-600 hover:border-blue-300 hover:text-blue-600 transition-colors">
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {["All", "Diagnostics", "Repairs", "Maintenance", "Notes"].map((label, i) => (
                <button key={label} className={`flex-shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${i === 0 ? "bg-slate-800 text-white" : "bg-white border border-slate-200 text-slate-600"}`}>
                  {label}
                  <span className="text-xs opacity-60">{i === 0 ? MOCK_TIMELINE.length : i === 1 ? 1 : i === 2 ? 1 : 1}</span>
                </button>
              ))}
            </div>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input type="text" placeholder="Search timeline…" className="w-full h-9 pl-9 pr-4 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-blue-300" />
            </div>
            <div className="space-y-2">
              {MOCK_TIMELINE.map((ev) => <TimelineCard key={ev.id} event={ev} />)}
            </div>
          </div>
        )}

        {/* Info Tab */}
        {activeTab === "info" && (
          <div className="space-y-4">
            {/* Nameplate placeholder */}
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
                <InfoRow label="Model" value={unit.modelNumber} />
                <InfoRow label="Serial" value={unit.serialNumber} />
                <InfoRow label="Type" value={unit.equipmentType} />
                <InfoRow label="System" value={unit.systemType} />
                <InfoRow label="Refrigerant" value={unit.refrigerantType} />
                <InfoRow label="Capacity" value={unit.capacityTons ? `${unit.capacityTons} tons` : null} />
                <InfoRow label="Mfg. Date" value={unit.manufactureDate} />
              </div>
            )}
            {hasElectrical && (
              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-2">Electrical</p>
                <InfoRow label="Voltage" value={unit.voltage} />
                <InfoRow label="Phase" value={unit.phase} />
                <InfoRow label="MCA" value={unit.mca} />
                <InfoRow label="MOCP" value={unit.mocp} />
                <InfoRow label="RLA / FLA" value={unit.rla} />
                <InfoRow label="LRA" value={unit.lra} />
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
          <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
            <Camera className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-500">Photo Album</p>
            <p className="text-xs text-slate-400 mt-1">Unit photos, field snapshots, and inspection images appear here.</p>
          </div>
        )}

        {/* Resources Tab */}
        {activeTab === "resources" && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Equipment Resources</p>
            {[
              { label: `${unit.manufacturer} ${unit.modelNumber} Install Manual`, type: "PDF" },
              { label: `${unit.manufacturer} ${unit.modelNumber} Service Manual`, type: "PDF" },
              { label: `${unit.manufacturer} ${unit.modelNumber} Parts List`, type: "PDF" },
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
            {/* Repair Progress */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <button onClick={() => setProgressOpen((v) => !v)} className="w-full flex items-center justify-between px-4 py-3 active:bg-slate-50 transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 bg-blue-50 rounded-lg flex items-center justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wide">Repair Progress</span>
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
                  <div className="bg-blue-600 h-1.5 rounded-full transition-all duration-500" style={{ width: `${Math.round((progressSteps.filter((s) => s.done).length / progressSteps.length) * 100)}%` }} />
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

// ─── Root preview page ────────────────────────────────────────────────────────

export default function DevEquipmentPreview() {
  // Block in production
  if (!import.meta.env.DEV) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500 text-sm">Not found.</p>
      </div>
    );
  }

  const [selectedUnit, setSelectedUnit] = useState<MockUnit | null>(null);

  return (
    <div>
      {/* Dev banner */}
      <div className="bg-amber-400 text-amber-900 text-center py-1.5 text-xs font-bold tracking-wide sticky top-0 z-[100]">
        DEV PREVIEW · Mock data only · Not visible in production
      </div>

      {/* Quick-jump unit selector */}
      <div className="bg-slate-900 px-4 py-2 flex items-center gap-2 flex-wrap">
        <span className="text-slate-400 text-xs font-bold uppercase tracking-wide mr-1">Jump to:</span>
        <button
          onClick={() => setSelectedUnit(null)}
          className={`text-xs px-2.5 py-1 rounded-full font-bold transition-all ${!selectedUnit ? "bg-blue-500 text-white" : "text-slate-400 hover:text-white"}`}
        >
          Library
        </button>
        {MOCK_UNITS.map((u) => {
          const sc = unitStatusConfig(u.status);
          return (
            <button
              key={u.id}
              onClick={() => setSelectedUnit(u)}
              className={`text-xs px-2.5 py-1 rounded-full font-bold transition-all flex items-center gap-1.5 ${selectedUnit?.id === u.id ? "bg-blue-500 text-white" : "text-slate-400 hover:text-white"}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
              {u.nickname ?? u.modelNumber}
            </button>
          );
        })}
      </div>

      {selectedUnit ? (
        <EquipmentDetailPreview unit={selectedUnit} onBack={() => setSelectedUnit(null)} />
      ) : (
        <EquipmentLibraryPreview onSelectUnit={setSelectedUnit} />
      )}
    </div>
  );
}
