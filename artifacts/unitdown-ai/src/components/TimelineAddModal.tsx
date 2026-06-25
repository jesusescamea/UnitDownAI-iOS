import { useState, useEffect, useCallback } from "react";
import { X, Wrench, FileText, Settings, Loader2 } from "lucide-react";
import { trackTimelineEntry } from "@/lib/appReview";
import { awardReward } from "@/lib/rewards";

type EventType = "note" | "repair" | "maintenance";
type StatusValue = "unresolved" | "monitoring" | "resolved";

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

interface Props {
  unitId: string;
  clientId: string;
  defaultType?: EventType;
  initialEvent?: TimelineEvent;
  onSave: (event: TimelineEvent) => void;
  onUpdate?: (event: TimelineEvent) => void;
  onClose: () => void;
}

const TYPE_TABS: { id: EventType; label: string; Icon: React.ElementType }[] = [
  { id: "note", label: "Note", Icon: FileText },
  { id: "repair", label: "Repair", Icon: Wrench },
  { id: "maintenance", label: "Maintenance", Icon: Settings },
];

const STATUS_OPTIONS: { value: StatusValue; label: string; className: string }[] = [
  { value: "unresolved", label: "Unresolved", className: "bg-amber-100 text-amber-700 border-amber-300" },
  { value: "monitoring", label: "Monitoring", className: "bg-blue-100 text-blue-700 border-blue-300" },
  { value: "resolved", label: "Resolved", className: "bg-emerald-100 text-emerald-700 border-emerald-300" },
];

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function tsToDateStr(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toEventType(val: string): EventType {
  if (val === "repair" || val === "maintenance") return val;
  return "note";
}

export default function TimelineAddModal({
  unitId,
  clientId,
  defaultType = "note",
  initialEvent,
  onSave,
  onUpdate,
  onClose,
}: Props) {
  const isEditMode = !!initialEvent;

  const [eventType, setEventType] = useState<EventType>(
    initialEvent ? toEventType(initialEvent.eventType) : defaultType
  );
  const [title, setTitle] = useState(initialEvent?.title ?? "");
  const [dateStr, setDateStr] = useState(
    initialEvent ? tsToDateStr(initialEvent.eventDate) : todayStr()
  );
  const [description, setDescription] = useState(initialEvent?.description ?? "");
  const [status, setStatus] = useState<StatusValue>(
    (initialEvent?.status as StatusValue | null) ?? "unresolved"
  );
  const [technicianNotes, setTechnicianNotes] = useState(initialEvent?.technicianNotes ?? "");
  const [cost, setCost] = useState(initialEvent?.cost ?? "");
  const [parts, setParts] = useState(initialEvent?.parts ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const handleSave = useCallback(async () => {
    if (!title.trim()) { setError("Title is required"); return; }
    setSaving(true);
    setError(null);

    // Parse date in local timezone (noon prevents off-by-one from UTC midnight)
    const [year, month, day] = dateStr.split("-").map(Number);
    const eventDate = new Date(year, month - 1, day, 12, 0, 0).getTime();

    try {
      if (isEditMode && initialEvent) {
        // ── Edit mode: PATCH existing entry ──────────────────────────────────
        const payload = {
          clientId,
          title: title.trim(),
          eventType,
          description: description.trim() || null,
          status: (eventType === "repair") ? status : null,
          technicianNotes: technicianNotes.trim() || null,
          cost: (eventType !== "note") ? (cost.trim() || null) : null,
          parts: (eventType !== "note") ? (parts.trim() || null) : null,
          eventDate,
        };

        const res = await fetch(`/api/timeline/${initialEvent.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Update failed");
        onUpdate?.(data.event as TimelineEvent);
      } else {
        // ── Add mode: POST new entry ──────────────────────────────────────────
        const payload = {
          clientId,
          event: {
            eventType,
            title: title.trim(),
            description: description.trim() || null,
            status: (eventType === "repair") ? status : null,
            technicianNotes: technicianNotes.trim() || null,
            cost: (eventType !== "note") ? (cost.trim() || null) : null,
            parts: (eventType !== "note") ? (parts.trim() || null) : null,
            eventDate,
          },
        };

        const res = await fetch(`/api/units/${unitId}/timeline`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Save failed");
        trackTimelineEntry();
        // Award first_timeline_entry bonus (idempotent — fires only on first entry)
        awardReward(clientId, "first_timeline_entry").catch(() => {});
        onSave(data.event as TimelineEvent);
      }
    } catch (err: any) {
      setError(err.message ?? "Failed to save");
      setSaving(false);
    }
  }, [
    isEditMode, initialEvent, unitId, clientId,
    eventType, title, dateStr, description, status, technicianNotes, cost, parts,
    onSave, onUpdate,
  ]);

  return (
    <div className="fixed inset-0 z-[300] flex flex-col justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Bottom sheet */}
      <div className="relative bg-white rounded-t-3xl max-h-[92vh] flex flex-col shadow-2xl">
        {/* Handle bar */}
        <div className="flex-shrink-0 flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 pb-3">
          <h2 className="text-base font-extrabold text-slate-900">
            {isEditMode ? "Edit Entry" : "Add Timeline Entry"}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Type tabs */}
        <div className="flex-shrink-0 flex gap-2 px-5 pb-4 border-b border-slate-100">
          {TYPE_TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setEventType(id)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                eventType === id
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Form — scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2 text-sm">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1 block">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                eventType === "note" ? "e.g. Customer reports intermittent issue" :
                eventType === "repair" ? "e.g. Replaced condenser fan capacitor" :
                "e.g. PM completed — filters + coils"
              }
              className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm text-slate-900 focus:outline-none focus:border-blue-400"
            />
          </div>

          {/* Date */}
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1 block">
              Date
            </label>
            <input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              max={todayStr()}
              className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm text-slate-900 focus:outline-none focus:border-blue-400 bg-white"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1 block">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                eventType === "note" ? "What did you observe or discuss?" :
                eventType === "repair" ? "What failed and what was replaced?" :
                "What maintenance was performed?"
              }
              rows={3}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-400 resize-none"
            />
          </div>

          {/* Status — repair only */}
          {eventType === "repair" && (
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2 block">
                Status
              </label>
              <div className="flex gap-2">
                {STATUS_OPTIONS.map(({ value, label, className }) => (
                  <button
                    key={value}
                    onClick={() => setStatus(value)}
                    className={`flex-1 rounded-xl px-2 py-2 text-xs font-semibold border transition-all ${
                      status === value
                        ? className
                        : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Cost + Parts — repair and maintenance only */}
          {eventType !== "note" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1 block">
                  Cost
                </label>
                <input
                  type="text"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder="e.g. $145"
                  className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1 block">
                  Parts
                </label>
                <input
                  type="text"
                  value={parts}
                  onChange={(e) => setParts(e.target.value)}
                  placeholder="e.g. Cap 45/5 370V"
                  className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:border-blue-400"
                />
              </div>
            </div>
          )}

          {/* Technician notes */}
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1 block">
              Technician Notes
            </label>
            <textarea
              value={technicianNotes}
              onChange={(e) => setTechnicianNotes(e.target.value)}
              placeholder="Any additional notes for your records…"
              rows={2}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-400 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex gap-3 px-5 py-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {saving ? "Saving…" : isEditMode ? "Save Changes" : "Save Entry"}
          </button>
        </div>
      </div>
    </div>
  );
}
