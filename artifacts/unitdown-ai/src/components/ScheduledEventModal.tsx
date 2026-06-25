import { useState } from "react";
import { X, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface ScheduledEvent {
  id: string;
  unitId: string | null;
  title: string;
  eventType: string;
  scheduledDate: number;
  isCompleted: boolean;
  notes: string | null;
  recurrence: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  unitId?: string;
  unitName?: string;
  clientId: string;
  onClose: () => void;
  onCreated: (event: ScheduledEvent) => void;
}

const EVENT_TYPES = [
  { value: "return-visit",   label: "Return Visit" },
  { value: "pm-due",         label: "Preventive Maintenance" },
  { value: "callback",       label: "Customer Callback" },
  { value: "inspection",     label: "Inspection" },
  { value: "parts-followup", label: "Parts Follow-Up" },
  { value: "reminder",       label: "General Reminder" },
];

const RECURRENCE_OPTIONS = [
  { value: "",           label: "One Time" },
  { value: "monthly",    label: "Monthly" },
  { value: "quarterly",  label: "Quarterly" },
  { value: "semiannual", label: "Every 6 Months" },
  { value: "annual",     label: "Annual" },
];

const QUICK_DATES = [
  { label: "Tomorrow",  days: 1 },
  { label: "3 Days",    days: 3 },
  { label: "1 Week",    days: 7 },
  { label: "2 Weeks",   days: 14 },
];

function toDateInputVal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function todayInput(): string {
  return toDateInputVal(new Date());
}

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toDateInputVal(d);
}

export default function ScheduledEventModal({ unitId, unitName, clientId, onClose, onCreated }: Props) {
  const [title, setTitle] = useState(unitName ? `Return Visit – ${unitName}` : "");
  const [eventType, setEventType] = useState("return-visit");
  const [dateStr, setDateStr] = useState(() => addDays(1));
  const [notes, setNotes] = useState("");
  const [recurrence, setRecurrence] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!title.trim()) { setError("Title is required"); return; }
    if (!dateStr) { setError("Date is required"); return; }
    const scheduledDate = new Date(dateStr + "T08:00:00").getTime();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/scheduled-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          event: {
            unitId: unitId ?? null,
            title: title.trim(),
            eventType,
            scheduledDate,
            notes: notes.trim() || null,
            recurrence: recurrence || null,
          },
        }),
      });
      const d = await res.json();
      if (d.event) {
        onCreated(d.event);
        onClose();
      } else {
        setError(d.error ?? "Failed to save reminder");
      }
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center">
              <Bell className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <span className="font-bold text-slate-900">Add Reminder</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-xl hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {unitName && (
            <div className="text-xs bg-blue-50 text-blue-700 px-3 py-2 rounded-xl font-semibold">
              {unitName}
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
              Title
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Return to verify refrigerant charge"
              className="rounded-xl border-slate-200 text-sm"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
              Type
            </label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="w-full h-10 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 px-3"
            >
              {EVENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">
              When
            </label>
            <div className="flex gap-2 mb-2 flex-wrap">
              {QUICK_DATES.map((q) => (
                <button
                  key={q.days}
                  type="button"
                  onClick={() => setDateStr(addDays(q.days))}
                  className={`text-xs px-2.5 py-1.5 rounded-xl border font-semibold transition-colors ${
                    dateStr === addDays(q.days)
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                  }`}
                >
                  {q.label}
                </button>
              ))}
            </div>
            <Input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              min={todayInput()}
              className="rounded-xl border-slate-200 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
              Repeat
            </label>
            <select
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value)}
              className="w-full h-10 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 px-3"
            >
              {RECURRENCE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional context..."
              rows={2}
              className="w-full rounded-xl border border-slate-200 text-sm px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="flex-1 rounded-xl font-semibold"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
          >
            {saving ? "Saving…" : "Save Reminder"}
          </Button>
        </div>
      </div>
    </div>
  );
}
