import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { useUser } from "@clerk/clerk-react";
import {
  ChevronRight, Wrench, Edit2, Trash2, Pencil,
  Plus, History, CheckCircle2, AlertCircle, CircleDot, Clock,
  MapPin, Activity, Loader2, FileText, Settings, Camera, Search,
  ZoomIn, X, Star, Bell, Layers, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import TimelineAddModal from "@/components/TimelineAddModal";
import EquipmentResources from "@/components/EquipmentResources";
import PhotoAlbum from "@/components/PhotoAlbum";
import ScheduledEventModal, { type ScheduledEvent } from "@/components/ScheduledEventModal";

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
  nameplatePreviewUrl: string | null;
  isFavorite: boolean;
  isArchived: boolean;
  updatedAt: string;
}

interface DiagnosticLog {
  id: string;
  unitId: string | null;
  diagnosisTitle: string | null;
  status: string;
  confidencePercent: number | null;
  timestamp: number;
}

interface TimelineEvent {
  id: string;
  unitId: string;
  eventType: string;
  title: string;
  description: string | null;
  status: string | null;
  technicianNotes: string | null;
  cost: string | null;
  parts: string | null;
  linkedDiagnosticLogId: string | null;
  eventDate: number;
  createdAt: string;
  updatedAt?: string | null;
  confidencePercent: number | null;
  source: "log" | "manual";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Equipment Lifecycle Status ────────────────────────────────────────────────

type UnitStatus = "operational" | "monitoring" | "needs-follow-up" | "critical" | "archived";

function unitStatusConfig(status: UnitStatus) {
  switch (status) {
    case "operational":     return { strip: "bg-emerald-500", dot: "bg-emerald-500", label: "Operational", textCls: "text-emerald-700", bgCls: "bg-emerald-50",  borderCls: "border-emerald-200" };
    case "monitoring":      return { strip: "bg-blue-500",    dot: "bg-blue-500",    label: "Monitoring",  textCls: "text-blue-700",    bgCls: "bg-blue-50",    borderCls: "border-blue-200"   };
    case "needs-follow-up": return { strip: "bg-amber-500",   dot: "bg-amber-500",   label: "Follow-up",   textCls: "text-amber-700",   bgCls: "bg-amber-50",   borderCls: "border-amber-200"  };
    case "critical":        return { strip: "bg-red-500",     dot: "bg-red-500",     label: "Critical",    textCls: "text-red-700",     bgCls: "bg-red-50",     borderCls: "border-red-200"    };
    case "archived":        return { strip: "bg-slate-400",   dot: "bg-slate-400",   label: "Archived",    textCls: "text-slate-500",   bgCls: "bg-slate-100",  borderCls: "border-slate-200"  };
  }
}

type ActiveTab = "timeline" | "info" | "photos" | "resources" | "notes";

function eventTypeConfig(type: string) {
  switch (type) {
    case "diagnostic":   return { label: "Diagnostic",    Icon: Activity,  bg: "bg-blue-50",    color: "text-blue-600" };
    case "repair":       return { label: "Repair",        Icon: Wrench,    bg: "bg-orange-50",  color: "text-orange-600" };
    case "maintenance":  return { label: "Maintenance",   Icon: Settings,  bg: "bg-emerald-50", color: "text-emerald-600" };
    case "note":         return { label: "Note",          Icon: FileText,  bg: "bg-slate-50",   color: "text-slate-500" };
    case "scan":         return { label: "Nameplate Scan",Icon: Camera,    bg: "bg-purple-50",  color: "text-purple-600" };
    default:             return { label: "Event",         Icon: Clock,     bg: "bg-slate-50",   color: "text-slate-500" };
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

// ─── Timeline card ────────────────────────────────────────────────────────────

function TimelineCard({
  event,
  expanded,
  onToggle,
  onNavigate,
  onDelete,
  onEdit,
}: {
  event: TimelineEvent;
  expanded: boolean;
  onToggle: () => void;
  onNavigate: (path: string) => void;
  onDelete: (id: string) => void;
  onEdit: (event: TimelineEvent) => void;
}) {
  const typeCfg = eventTypeConfig(event.eventType);
  const stCfg = event.status ? statusConfig(event.status) : null;

  const isEdited =
    event.source === "manual" &&
    !!event.updatedAt &&
    !!event.createdAt &&
    new Date(event.updatedAt).getTime() - new Date(event.createdAt).getTime() > 1000;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Collapsed header — always visible, tappable */}
      <button
        onClick={onToggle}
        className="w-full text-left p-4 active:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {/* Type icon */}
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${typeCfg.bg}`}>
            <typeCfg.Icon className={`w-4 h-4 ${typeCfg.color}`} />
          </div>

          {/* Title + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-slate-900 line-clamp-1 flex-1 min-w-0">
                {event.title}
              </span>
              {stCfg && (
                <Badge className={`text-xs border flex-shrink-0 flex items-center gap-1 ${stCfg.className}`}>
                  <stCfg.Icon className="w-3 h-3" />
                  {stCfg.label}
                </Badge>
              )}
              {isEdited && (
                <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 rounded px-1.5 py-0.5 flex-shrink-0">
                  Edited
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className={`text-xs font-semibold ${typeCfg.color}`}>{typeCfg.label}</span>
              <span className="text-slate-300 text-xs">·</span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDate(event.eventDate)}
              </span>
              {event.confidencePercent != null && (
                <>
                  <span className="text-slate-300 text-xs">·</span>
                  <span className="text-xs text-slate-400">{event.confidencePercent}% match</span>
                </>
              )}
            </div>
          </div>

          {/* Chevron */}
          <ChevronRight
            className={`w-4 h-4 text-slate-300 flex-shrink-0 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
          />
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3">

          {event.description && (
            <p className="text-sm text-slate-600 leading-relaxed">{event.description}</p>
          )}

          {event.technicianNotes && (
            <div className="bg-slate-50 rounded-xl px-3 py-2.5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Technician Notes</p>
              <p className="text-sm text-slate-700 leading-relaxed">{event.technicianNotes}</p>
            </div>
          )}

          {(event.cost || event.parts) && (
            <div className="flex gap-4">
              {event.cost && (
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Cost</p>
                  <p className="text-sm font-bold text-slate-700 mt-0.5">{event.cost}</p>
                </div>
              )}
              {event.parts && (
                <div className="min-w-0">
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Parts</p>
                  <p className="text-sm font-medium text-slate-700 mt-0.5 leading-snug">{event.parts}</p>
                </div>
              )}
            </div>
          )}

          {/* Footer actions */}
          <div className="flex items-center justify-between gap-2 pt-1">
            {event.linkedDiagnosticLogId ? (
              <button
                onClick={() => onNavigate(`/logs/${event.linkedDiagnosticLogId}`)}
                className="text-xs text-blue-600 font-semibold hover:underline"
              >
                View Full Diagnosis →
              </button>
            ) : (
              <span />
            )}
            {event.source === "manual" && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onEdit(event)}
                  className="text-xs text-slate-400 hover:text-blue-600 flex items-center gap-1 transition-colors"
                >
                  <Pencil className="w-3 h-3" />
                  Edit
                </button>
                <button
                  onClick={() => onDelete(event.id)}
                  className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  Remove
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Filter tabs config ────────────────────────────────────────────────────────

const FILTER_TABS = [
  { id: "all",         label: "All" },
  { id: "diagnostic",  label: "Diagnostics" },
  { id: "repair",      label: "Repairs" },
  { id: "maintenance", label: "Maintenance" },
  { id: "note",        label: "Notes" },
  { id: "scan",        label: "Scans" },
];

// ─── Nameplate viewer ──────────────────────────────────────────────────────────
// Shows a compressed preview card; tap → full-screen lightbox with pinch-zoom.

function NameplateViewer({
  previewUrl,
  fullUrl,
}: {
  previewUrl: string;
  fullUrl: string;
}) {
  const [open, setOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [previewFailed, setPreviewFailed] = useState(false);
  const touchRef = useRef<{ dist: number } | null>(null);

  const displayUrl = previewFailed ? fullUrl : previewUrl;

  function openLightbox() { setOpen(true); }
  function closeLightbox() { setOpen(false); setScale(1); }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    setScale((s) => Math.min(5, Math.max(1, s - e.deltaY * 0.005)));
  }

  function onTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      const dx = e.touches[1].clientX - e.touches[0].clientX;
      const dy = e.touches[1].clientY - e.touches[0].clientY;
      touchRef.current = { dist: Math.hypot(dx, dy) };
    }
  }

  function onTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && touchRef.current) {
      e.preventDefault();
      const dx = e.touches[1].clientX - e.touches[0].clientX;
      const dy = e.touches[1].clientY - e.touches[0].clientY;
      const newDist = Math.hypot(dx, dy);
      const ratio = newDist / touchRef.current.dist;
      touchRef.current = { dist: newDist };
      setScale((s) => Math.min(5, Math.max(1, s * ratio)));
    }
  }

  function onTouchEnd() {
    touchRef.current = null;
    if (scale < 1.05) setScale(1);
  }

  return (
    <>
      {/* Preview card */}
      <div>
        <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">
          Nameplate Photo
        </p>
        <button
          type="button"
          onClick={openLightbox}
          className="w-full relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 block group"
          aria-label="Tap to inspect full nameplate photo"
        >
          <img
            src={displayUrl}
            alt="Nameplate"
            className="w-full object-cover"
            style={{ aspectRatio: "16/7" }}
            onError={() => {
              if (!previewFailed) setPreviewFailed(true);
            }}
          />
          {/* Tap-to-inspect overlay */}
          <div className="absolute bottom-0 inset-x-0 py-2 bg-gradient-to-t from-black/55 to-transparent flex items-center justify-center gap-1.5 opacity-100 group-hover:opacity-100 transition-opacity">
            <ZoomIn className="w-3.5 h-3.5 text-white/90" />
            <span className="text-xs text-white/90 font-medium tracking-wide">
              Tap to inspect full photo
            </span>
          </div>
        </button>
      </div>

      {/* Full-screen lightbox */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-50 bg-white/10 hover:bg-white/25 rounded-full p-2.5 text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Zoom area */}
          <div
            className="w-full h-full flex items-center justify-center overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            onWheel={onWheel}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            style={{ touchAction: "none" }}
          >
            <img
              src={fullUrl}
              alt="Nameplate (full)"
              className="max-w-full max-h-full object-contain select-none"
              style={{
                transform: `scale(${scale})`,
                transformOrigin: "center",
                transition: scale === 1 ? "transform 0.2s ease" : "none",
                cursor: scale > 1 ? "grab" : "default",
              }}
              draggable={false}
            />
          </div>

          <p className="absolute bottom-5 left-0 right-0 text-center text-xs text-white/40 pointer-events-none">
            {scale > 1 ? `${Math.round(scale * 100)}%` : "Pinch or scroll to zoom"}
          </p>
        </div>
      )}
    </>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function UnitDetailPage() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const { user: clerkUser, isLoaded } = useUser();

  const [unit, setUnit] = useState<UnitRecord | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [unitLogs, setUnitLogs] = useState<DiagnosticLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [archiving, setArchiving] = useState(false);
  const [favLoading, setFavLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [progressOpen, setProgressOpen] = useState(true);

  // Tab state
  const [activeTab, setActiveTab] = useState<ActiveTab>("timeline");

  // Timeline UI state
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [addDefaultType, setAddDefaultType] = useState<"note" | "repair" | "maintenance">("note");
  const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null);

  const clientId = getClientId();
  const isLoggedIn = isLoaded && !!clerkUser && clientId.startsWith("user_");

  // Fetch unit + timeline
  useEffect(() => {
    if (!isLoaded) return;
    if (!isLoggedIn || !params.id) { setLoading(false); return; }
    const cid = encodeURIComponent(clientId);

    Promise.all([
      fetch(`/api/units/${params.id}?clientId=${cid}`).then((r) => r.json()),
      fetch(`/api/units/${params.id}/timeline?clientId=${cid}`).then((r) => r.json()),
      fetch(`/api/diagnostic-logs?clientId=${cid}&unitId=${params.id}`).then((r) => r.json()),
    ])
      .then(([uData, tlData, logsData]) => {
        if (uData.unit) {
          setUnit(uData.unit);
          // Track recently viewed (localStorage, max 5)
          try {
            const key = "unitdown_recently_viewed";
            const stored = JSON.parse(localStorage.getItem(key) ?? "[]") as string[];
            const updated = [uData.unit.id as string, ...stored.filter((x: string) => x !== uData.unit.id)].slice(0, 5);
            localStorage.setItem(key, JSON.stringify(updated));
          } catch {}
        } else {
          setError("Unit not found");
        }
        setEvents(tlData.events ?? []);
        setUnitLogs(logsData.logs ?? []);
      })
      .catch(() => setError("Failed to load unit"))
      .finally(() => setLoading(false));
  }, [isLoaded, isLoggedIn, clientId, params.id]);

  // Derived: filtered + searched events
  const filteredEvents = useMemo(() => {
    let evts = events;
    if (activeFilter !== "all") evts = evts.filter((e) => e.eventType === activeFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      evts = evts.filter((e) =>
        [e.title, e.description, e.technicianNotes].some((f) => f?.toLowerCase().includes(q))
      );
    }
    return evts;
  }, [events, activeFilter, searchQuery]);

  // Derived: count per type (from full unfiltered list, for tab badges)
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: events.length };
    for (const e of events) {
      counts[e.eventType] = (counts[e.eventType] ?? 0) + 1;
    }
    return counts;
  }, [events]);

  // Equipment lifecycle status — derived from open diagnostic logs
  const unitStatus = useMemo((): UnitStatus => {
    if (!unit) return "operational";
    if (unit.isArchived) return "archived";
    if (unitLogs.some((l) => l.status === "unresolved")) return "critical";
    if (unitLogs.some((l) => l.status === "waiting-on-parts")) return "needs-follow-up";
    if (unitLogs.some((l) => l.status === "return-visit" || l.status === "customer-callback")) return "needs-follow-up";
    if (unitLogs.some((l) => l.status === "monitoring")) return "monitoring";
    return "operational";
  }, [unit, unitLogs]);

  // Repair progress checklist — auto-computed, never manual
  const progressSteps = useMemo(() => {
    if (!unit) return [];
    const hasRepairOrMaint = events.some((e) => e.source === "manual" && ["repair", "maintenance"].includes(e.eventType));
    const hasPartsWaiting = unitLogs.some((l) => l.status === "waiting-on-parts");
    const hasResolved = unitLogs.some((l) => l.status === "resolved") || events.some((e) => e.status === "resolved");
    return [
      { label: "Customer / Site Added",      done: !!unit.siteCustomerName },
      { label: "Nameplate Scanned",           done: !!unit.nameplateImageUrl },
      { label: "Equipment Info Recorded",     done: !!(unit.manufacturer && unit.equipmentType) },
      { label: "Symptoms Documented",         done: unitLogs.length > 0 },
      { label: "AI Diagnosis Run",            done: unitLogs.some((l) => !!l.diagnosisTitle) },
      { label: "Field Measurements Recorded", done: !!(unit.mca || unit.mocp || unit.rla) },
      { label: "Service Timeline Started",    done: events.filter((e) => e.source === "manual").length > 0 },
      { label: "Repair / Parts Tracked",      done: hasRepairOrMaint || hasPartsWaiting },
      { label: "Issue Resolved",              done: hasResolved },
    ];
  }, [unit, events, unitLogs]);

  // Handlers
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

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleAddEvent = useCallback((newEvent: TimelineEvent) => {
    setEvents((prev) =>
      [newEvent, ...prev].sort((a, b) => b.eventDate - a.eventDate)
    );
    setShowAddModal(false);
  }, []);

  const handleDeleteEvent = useCallback(async (id: string) => {
    if (!window.confirm("Remove this timeline entry?")) return;
    try {
      const res = await fetch(`/api/timeline/${id}?clientId=${encodeURIComponent(clientId)}`, {
        method: "DELETE",
      });
      if (res.ok) setEvents((prev) => prev.filter((e) => e.id !== id));
    } catch {
      // silent — entry stays in list on failure
    }
  }, [clientId]);

  const handleUpdateEvent = useCallback((updated: TimelineEvent) => {
    setEvents((prev) =>
      prev
        .map((e) => (e.id === updated.id ? updated : e))
        .sort((a, b) => b.eventDate - a.eventDate)
    );
    setEditingEvent(null);
  }, []);

  const openAddModal = useCallback((type: "note" | "repair" | "maintenance") => {
    setAddDefaultType(type);
    setShowAddModal(true);
  }, []);

  const handleToggleFavorite = useCallback(async () => {
    if (!unit || favLoading) return;
    const newVal = !unit.isFavorite;
    setUnit((u) => u ? { ...u, isFavorite: newVal } : u);
    setFavLoading(true);
    try {
      const res = await fetch(`/api/units/${unit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, unit: { isFavorite: newVal } }),
      });
      const d = await res.json();
      if (d.unit) setUnit(d.unit);
    } catch {
      setUnit((u) => u ? { ...u, isFavorite: !newVal } : u);
    } finally {
      setFavLoading(false);
    }
  }, [unit, clientId, favLoading]);

  // ─── Render ────────────────────────────────────────────────────────────────

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

  const hasEquipment = unit.manufacturer || unit.modelNumber || unit.serialNumber ||
    unit.equipmentType || unit.systemType || unit.refrigerantType || unit.capacityTons || unit.manufactureDate;
  const hasElectrical = unit.voltage || unit.phase || unit.mca || unit.mocp || unit.rla || unit.lra;
  const sc = unitStatusConfig(unitStatus);

  return (
    <div className="min-h-screen bg-slate-50 pb-16">

      {/* ── Sticky Header ─────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/records")} className="text-slate-400 hover:text-slate-700 p-1">
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
            <button
              onClick={handleToggleFavorite}
              disabled={favLoading}
              aria-label={unit.isFavorite ? "Remove from favorites" : "Add to favorites"}
              className={`p-1.5 rounded-xl transition-colors disabled:opacity-50 ${
                unit.isFavorite
                  ? "text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50"
                  : "text-slate-400 hover:text-yellow-500 hover:bg-yellow-50"
              }`}
            >
              <Star className={`w-4 h-4 ${unit.isFavorite ? "fill-yellow-400" : ""}`} />
            </button>
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

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">

        {/* ── Equipment Identity Card ──────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          {/* Status color strip */}
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
              {/* Nameplate thumbnail */}
              {unit.nameplateImageUrl && (
                <button
                  type="button"
                  onClick={() => setActiveTab("info")}
                  className="w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden border border-slate-200 hover:border-blue-300 transition-colors group relative"
                  aria-label="View nameplate"
                  title="Tap to view nameplate"
                >
                  <img
                    src={unit.nameplatePreviewUrl ?? unit.nameplateImageUrl}
                    alt="Nameplate"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-end justify-center pb-1">
                    <span className="text-[9px] text-white/0 group-hover:text-white/90 font-semibold transition-all">Nameplate</span>
                  </div>
                </button>
              )}
            </div>

            {/* Quick spec chips */}
            {(unit.manufacturer || unit.modelNumber || unit.serialNumber || unit.refrigerantType || unit.voltage || unit.capacityTons) && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {unit.manufacturer && (
                  <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-1 rounded-full font-semibold">{unit.manufacturer}</span>
                )}
                {unit.modelNumber && (
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-full font-mono">{unit.modelNumber}</span>
                )}
                {unit.refrigerantType && (
                  <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-1 rounded-full font-semibold border border-blue-100">{unit.refrigerantType}</span>
                )}
                {unit.voltage && (
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-full">{unit.voltage}V</span>
                )}
                {unit.capacityTons && (
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-full">{unit.capacityTons} tons</span>
                )}
              </div>
            )}

            {/* Primary CTA */}
            <Button
              onClick={handleDiagnoseThis}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl h-10 text-sm"
            >
              <Activity className="w-4 h-4 mr-2" />
              Run AI Diagnosis
            </Button>
          </div>
        </div>

        {/* ── Tab Navigation ───────────────────────────────────────────────── */}
        <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {(
            [
              { id: "timeline" as const,  label: "Timeline",   Icon: History   },
              { id: "info" as const,      label: "Info",       Icon: Info      },
              { id: "photos" as const,    label: "Photos",     Icon: Camera    },
              { id: "resources" as const, label: "Resources",  Icon: Search    },
              { id: "notes" as const,     label: "Notes",      Icon: FileText  },
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
              {id === "timeline" && events.length > 0 && (
                <span className={`text-[10px] ${activeTab === "timeline" ? "opacity-70" : "text-slate-400"}`}>
                  {events.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Timeline Tab ─────────────────────────────────────────────────── */}
        {activeTab === "timeline" && (
          <div>
            {/* Section header */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">Service Timeline</p>
                <p className="text-xs text-slate-400 mt-0.5">{events.length} event{events.length !== 1 ? "s" : ""}</p>
              </div>
              <button
                onClick={() => openAddModal("note")}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-3 py-1.5 text-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Entry
              </button>
            </div>

            {/* Quick-add shortcuts */}
            <div className="flex gap-2 mb-3 flex-wrap">
              {(
                [
                  { type: "note" as const,        Icon: FileText,  label: "Note" },
                  { type: "repair" as const,       Icon: Wrench,    label: "Repair" },
                  { type: "maintenance" as const,  Icon: Settings,  label: "PM" },
                ] as const
              ).map(({ type, Icon, label }) => (
                <button
                  key={type}
                  onClick={() => openAddModal(type)}
                  className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-600 hover:border-blue-300 hover:text-blue-600 transition-colors"
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
              <button
                onClick={() => setShowReminderModal(true)}
                className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-600 hover:border-blue-300 hover:text-blue-600 transition-colors"
              >
                <Bell className="w-3.5 h-3.5" />
                Reminder
              </button>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {FILTER_TABS.map(({ id, label }) => {
                const count = typeCounts[id] ?? 0;
                const active = activeFilter === id;
                return (
                  <button
                    key={id}
                    onClick={() => setActiveFilter(id)}
                    className={`flex-shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                      active
                        ? "bg-slate-800 text-white"
                        : "bg-white border border-slate-200 text-slate-600 hover:border-slate-400"
                    }`}
                  >
                    {label}
                    <span className={`text-xs ${active ? "opacity-60" : "text-slate-400"}`}>{count}</span>
                  </button>
                );
              })}
            </div>

            {/* Search bar */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search timeline…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-4 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-blue-300"
              />
            </div>

            {/* Event cards */}
            {filteredEvents.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400 font-medium">
                  {(searchQuery || activeFilter !== "all") ? "No matching events found." : "No timeline events yet."}
                </p>
                {!searchQuery && activeFilter === "all" && (
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Run a diagnosis or tap <strong>Add Entry</strong> to start tracking this unit's history.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredEvents.map((event) => (
                  <TimelineCard
                    key={event.id}
                    event={event}
                    expanded={expandedIds.has(event.id)}
                    onToggle={() => toggleExpand(event.id)}
                    onNavigate={navigate}
                    onDelete={handleDeleteEvent}
                    onEdit={setEditingEvent}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Info Tab ─────────────────────────────────────────────────────── */}
        {activeTab === "info" && (
          <div className="space-y-4">
            {/* Nameplate — preview card + lightbox */}
            {unit.nameplateImageUrl && (
              <NameplateViewer
                previewUrl={unit.nameplatePreviewUrl ?? unit.nameplateImageUrl}
                fullUrl={unit.nameplateImageUrl}
              />
            )}

            {/* Equipment details */}
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

            {/* Electrical data */}
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

            {/* Edit button */}
            <button
              onClick={() => navigate(`/records/${unit.id}/edit`)}
              className="w-full flex items-center justify-center gap-2 text-xs font-bold text-slate-500 border border-dashed border-slate-300 rounded-2xl py-3 hover:border-blue-300 hover:text-blue-600 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit Equipment Details
            </button>
          </div>
        )}

        {/* ── Photos Tab ───────────────────────────────────────────────────── */}
        {activeTab === "photos" && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <PhotoAlbum unitId={unit.id} clientId={clientId} />
          </div>
        )}

        {/* ── Resources Tab ────────────────────────────────────────────────── */}
        {activeTab === "resources" && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            {(unit.modelNumber || unit.manufacturer) ? (
              <EquipmentResources
                modelNumber={unit.modelNumber}
                manufacturer={unit.manufacturer}
              />
            ) : (
              <div className="text-center py-6">
                <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-500">No model info yet</p>
                <p className="text-xs text-slate-400 mt-1">Add a model number or manufacturer to find resources.</p>
                <button
                  onClick={() => navigate(`/records/${unit.id}/edit`)}
                  className="mt-3 text-xs text-blue-600 font-bold hover:underline"
                >
                  Edit unit info
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Notes Tab ────────────────────────────────────────────────────── */}
        {activeTab === "notes" && (
          <div className="space-y-4">
            {/* Notes */}
            {unit.notes ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Notes</p>
                  <button
                    onClick={() => navigate(`/records/${unit.id}/edit`)}
                    className="text-xs text-blue-600 font-semibold hover:underline"
                  >
                    Edit
                  </button>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{unit.notes}</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-6 text-center">
                <FileText className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-500">No notes yet</p>
                <button
                  onClick={() => navigate(`/records/${unit.id}/edit`)}
                  className="mt-2 text-xs text-blue-600 font-bold hover:underline"
                >
                  Add notes
                </button>
              </div>
            )}

            {/* Repair Progress */}
            {progressSteps.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <button
                  onClick={() => setProgressOpen((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 active:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-6 h-6 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wide">Repair Progress</span>
                      <span className="text-xs text-slate-400 ml-2">
                        {progressSteps.filter((s) => s.done).length}/{progressSteps.length}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs font-extrabold ${
                      Math.round((progressSteps.filter((s) => s.done).length / progressSteps.length) * 100) === 100
                        ? "text-emerald-600" : "text-slate-500"
                    }`}>
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
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                          step.done ? "bg-emerald-100" : "bg-slate-100"
                        }`}>
                          {step.done
                            ? <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            : <div className="w-2 h-2 rounded-full bg-slate-300" />
                          }
                        </div>
                        <span className={`text-xs font-medium ${step.done ? "text-slate-700" : "text-slate-400"}`}>
                          {step.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Add Entry modal */}
      {showAddModal && (
        <TimelineAddModal
          unitId={unit.id}
          clientId={clientId}
          defaultType={addDefaultType}
          onSave={handleAddEvent}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* Edit Entry modal */}
      {editingEvent && (
        <TimelineAddModal
          unitId={unit.id}
          clientId={clientId}
          initialEvent={editingEvent}
          onSave={handleAddEvent}
          onUpdate={handleUpdateEvent}
          onClose={() => setEditingEvent(null)}
        />
      )}

      {/* Add Reminder modal */}
      {showReminderModal && (
        <ScheduledEventModal
          unitId={unit.id}
          unitName={unit.nickname ?? unit.modelNumber ?? unit.manufacturer ?? "Unit"}
          clientId={clientId}
          onClose={() => setShowReminderModal(false)}
          onCreated={(_ev: ScheduledEvent) => setShowReminderModal(false)}
        />
      )}
    </div>
  );
}
