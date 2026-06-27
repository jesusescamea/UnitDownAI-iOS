/**
 * MeasurementModal — record one or more meter readings as a timeline event.
 *
 * Technicians can add multiple key/value pairs (e.g. "Suction Pressure: 72 psi").
 * Common HVAC measurements are offered as quick-tap suggestions.
 *
 * The measurements object is stored in event.measurements as a plain record.
 * Phase 3: typed schemas per equipment type will be added here.
 * Phase 4: AI will pre-fill from nameplate and historical data.
 */

import { useState } from "react";
import { X, Ruler, Plus, Trash2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useJobMode } from "@/context/JobModeContext";

interface MeasurementModalProps {
  onClose: () => void;
}

interface Row {
  key: string;
  value: string;
}

const COMMON_MEASUREMENTS: { label: string; unit: string }[] = [
  { label: "Suction Pressure",   unit: "psi" },
  { label: "Discharge Pressure", unit: "psi" },
  { label: "Suction Temp",       unit: "°F" },
  { label: "Discharge Temp",     unit: "°F" },
  { label: "Superheat",          unit: "°F" },
  { label: "Subcooling",         unit: "°F" },
  { label: "Supply Air Temp",    unit: "°F" },
  { label: "Return Air Temp",    unit: "°F" },
  { label: "Delta T",            unit: "°F" },
  { label: "Amp Draw",           unit: "A" },
  { label: "Voltage L1-L2",      unit: "V" },
  { label: "Voltage L1-L3",      unit: "V" },
  { label: "Voltage L2-L3",      unit: "V" },
  { label: "Static Pressure",    unit: "in. w.c." },
  { label: "Airflow",            unit: "CFM" },
];

export function MeasurementModal({ onClose }: MeasurementModalProps) {
  const { addEvent } = useJobMode();
  const [rows, setRows] = useState<Row[]>([{ key: "", value: "" }]);
  const [note, setNote] = useState("");

  const addRow = () => setRows((r) => [...r, { key: "", value: "" }]);

  const updateRow = (i: number, field: keyof Row, val: string) => {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [field]: val } : row)));
  };

  const removeRow = (i: number) => {
    if (rows.length === 1) return;
    setRows((r) => r.filter((_, idx) => idx !== i));
  };

  const addQuickMeasurement = (label: string, unit: string) => {
    const exists = rows.some((r) => r.key.toLowerCase() === label.toLowerCase());
    if (exists) return;
    // Fill first empty row, otherwise append
    const emptyIdx = rows.findIndex((r) => !r.key && !r.value);
    if (emptyIdx >= 0) {
      setRows((r) =>
        r.map((row, i) => (i === emptyIdx ? { key: label, value: "" } : row)),
      );
    } else {
      setRows((r) => [...r, { key: label, value: "" }]);
    }
  };

  const handleAdd = () => {
    const valid = rows.filter((r) => r.key.trim() && r.value.trim());
    if (valid.length === 0) return;

    const measurements: Record<string, string> = {};
    valid.forEach((r) => {
      measurements[r.key.trim()] = r.value.trim();
    });

    const title =
      valid.length === 1
        ? `${valid[0]!.key}: ${valid[0]!.value}`
        : `${valid.length} Measurements Recorded`;

    addEvent({
      eventType: "measurement",
      title,
      notes: note.trim() || undefined,
      measurements,
    });
    onClose();
  };

  const hasValidRows = rows.some((r) => r.key.trim() && r.value.trim());

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-white dark:bg-zinc-900 shadow-2xl safe-area-pb max-h-[90vh] flex flex-col">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-950 flex items-center justify-center">
              <Ruler className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Measurements</h2>
              <p className="text-xs text-zinc-500">Record meter readings</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-5">
          {/* Quick measurements */}
          <div>
            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">
              Common Measurements — tap to add
            </p>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_MEASUREMENTS.map(({ label, unit }) => (
                <button
                  key={label}
                  onClick={() => addQuickMeasurement(label, unit)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    rows.some((r) => r.key.toLowerCase() === label.toLowerCase())
                      ? "border-cyan-400 bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300"
                      : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-cyan-400 hover:text-cyan-600"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Measurement rows */}
          <div>
            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">
              Readings
            </p>
            <div className="space-y-2">
              {rows.map((row, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input
                    placeholder="Measurement name"
                    value={row.key}
                    onChange={(e) => updateRow(i, "key", e.target.value)}
                    className="flex-1 h-10 text-sm"
                  />
                  <Input
                    placeholder="Value + unit"
                    value={row.value}
                    onChange={(e) => updateRow(i, "value", e.target.value)}
                    className="w-28 h-10 text-sm"
                  />
                  <button
                    onClick={() => removeRow(i)}
                    className="p-1.5 text-zinc-300 hover:text-red-500 transition-colors"
                    disabled={rows.length === 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={addRow}
              className="mt-2 flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700"
            >
              <Plus className="w-4 h-4" />
              Add another reading
            </button>
          </div>

          {/* Optional note */}
          <div>
            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">
              Optional Note
            </p>
            <Input
              placeholder="e.g. Measured at full load, outdoor temp 95°F"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="h-10 text-sm"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-6 pt-3 border-t border-zinc-100 dark:border-zinc-800 shrink-0">
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 h-11" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="flex-1 h-11 bg-cyan-600 hover:bg-cyan-700 text-white"
              onClick={handleAdd}
              disabled={!hasValidRows}
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              Add to Timeline
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
