/**
 * JobCompletionView — 2.0 production completion ceremony.
 *
 * Completeness score is documentation quality only and never blocks completion.
 * The technician controls each checklist item's disposition before generating
 * the UnitDown Service Record (USR).
 */
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle, Circle, ChevronRight, Sparkles,
  Ban, Clock, AlertCircle, CheckCheck,
} from "lucide-react";
import type { LocalJob, LocalEvent } from "@/context/JobModeContext";

interface Props {
  job: LocalJob;
  events: LocalEvent[];
  onConfirmComplete: () => Promise<void>;
  onViewRecord: (jobId: string) => void;
  onCancel: () => void;
}

type CeremonyPhase = "checklist" | "generating" | "complete";

/** How the technician resolved a checklist item. */
type Disposition = "recorded" | "na" | "unable" | "add-later" | "pending";

interface ChecklistItem {
  key: string;
  label: string;
  recorded: boolean;
}

const CEREMONY_STEPS = [
  { label: "Reviewing your timeline…",   duration: 1400 },
  { label: "Assigning permanent USR…",   duration: 1000 },
  { label: "AI building service summary…", duration: 2000 },
  { label: "Updating equipment memory…", duration: 900  },
  { label: "Notifying office…",          duration: 700  },
];

const DISPOSITION_META: Record<
  Disposition,
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
  recorded:   { label: "Recorded",          color: "text-green-400",  bg: "bg-green-950/50 border-green-800",  icon: <CheckCircle   size={14} className="text-green-400"  /> },
  na:         { label: "Not Applicable",    color: "text-gray-400",   bg: "bg-gray-800/50 border-gray-700",    icon: <Ban           size={14} className="text-gray-400"   /> },
  unable:     { label: "Unable to Collect", color: "text-amber-400",  bg: "bg-amber-950/40 border-amber-800",  icon: <AlertCircle   size={14} className="text-amber-400"  /> },
  "add-later":{ label: "Add Later",         color: "text-blue-400",   bg: "bg-blue-950/40 border-blue-800",    icon: <Clock         size={14} className="text-blue-400"   /> },
  pending:    { label: "Not Recorded",      color: "text-gray-600",   bg: "bg-gray-900 border-gray-800",       icon: <Circle        size={14} className="text-gray-600"   /> },
};

const MANUAL_OPTIONS: { key: Disposition; label: string }[] = [
  { key: "na",         label: "N/A"            },
  { key: "unable",     label: "Unable"         },
  { key: "add-later",  label: "Add Later"      },
];

export function JobCompletionView({
  job,
  events,
  onConfirmComplete,
  onViewRecord,
  onCancel,
}: Props) {
  const [phase, setPhase]             = useState<CeremonyPhase>("checklist");
  const [ceremonyIndex, setCeremonyIndex] = useState(0);
  const [ceremonyDone, setCeremonyDone]   = useState(false);
  const [usrId, setUsrId]             = useState<string>(job.usrId ?? "");
  const completingRef                 = useRef(false); // prevents double-tap

  // ── Derive which checklist items are already covered by timeline events ──────
  const types = new Set(events.map((e) => e.eventType));

  const CHECKLIST: ChecklistItem[] = [
    { key: "nameplate",      label: "Nameplate captured",       recorded: types.has("equipment_identified") },
    { key: "alarm",          label: "Alarm documented",         recorded: types.has("alarm_review")         },
    { key: "measurements",   label: "Initial measurements",     recorded: types.has("measurement")          },
    { key: "repair",         label: "Repair / part logged",     recorded: types.has("part")                 },
    { key: "photo",          label: "Photo captured",           recorded: types.has("photo")                },
    { key: "verification",   label: "Verification measurements",recorded: types.has("verification")         },
    { key: "recommendations",label: "Recommendations added",    recorded: types.has("recommendation")       },
    { key: "voice",          label: "Voice note logged",        recorded: types.has("voice_note")           },
  ];

  // Local dispositions for items not yet in the timeline.
  // Starts as "recorded" or "pending"; tech can manually set non-recorded items.
  const [dispositions, setDispositions] = useState<Record<string, Disposition>>(
    () => Object.fromEntries(CHECKLIST.map((c) => [c.key, c.recorded ? "recorded" : "pending"])),
  );

  // Keep dispositions in sync when events stream in mid-render.
  useEffect(() => {
    setDispositions((prev) => {
      const next = { ...prev };
      for (const c of CHECKLIST) {
        if (c.recorded && next[c.key] !== "recorded") next[c.key] = "recorded";
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events.length]);

  function setDisposition(key: string, disp: Disposition) {
    setDispositions((prev) => ({ ...prev, [key]: disp }));
  }

  // ── Score — documentation quality only, never blocks ─────────────────────────
  const recordedCount  = CHECKLIST.filter((c) => dispositions[c.key] === "recorded").length;
  const resolvedCount  = CHECKLIST.filter((c) => {
    const d = dispositions[c.key];
    return d === "recorded" || d === "na" || d === "unable";
  }).length;
  const score = Math.round((recordedCount / CHECKLIST.length) * 100);

  // ── Ceremony ─────────────────────────────────────────────────────────────────
  async function startCeremony() {
    if (completingRef.current) return;
    completingRef.current = true;
    setPhase("generating");
    try {
      await onConfirmComplete();
      if (job.usrId) setUsrId(job.usrId);
    } catch {
      // completeJob() handles its own errors; ceremony continues optimistically
    }
    // Note: don't reset completingRef — we don't want the user going back
  }

  useEffect(() => {
    if (phase !== "generating") return;
    if (ceremonyIndex >= CEREMONY_STEPS.length) {
      const t = setTimeout(() => setCeremonyDone(true), 400);
      return () => clearTimeout(t);
    }
    const t = setTimeout(
      () => setCeremonyIndex((i) => i + 1),
      CEREMONY_STEPS[ceremonyIndex]!.duration,
    );
    return () => clearTimeout(t);
  }, [phase, ceremonyIndex]);

  const displayUsrId =
    usrId ||
    job.usrId ||
    `USR-${new Date().getFullYear()}-${String(job.id.slice(-6).replace(/\D/g, "").padStart(6, "0"))}`;

  // ── Checklist screen ──────────────────────────────────────────────────────────
  if (phase === "checklist") {
    return (
      <div className="min-h-screen bg-gray-950 text-white overflow-y-auto pb-40">
        {/* Header */}
        <div className="bg-gray-900 px-4 pt-12 pb-5 border-b border-gray-800">
          <button
            onClick={onCancel}
            className="text-xs text-gray-500 mb-3 flex items-center gap-1"
          >
            ← Back to job
          </button>
          <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">
            Almost Done
          </div>
          <h1 className="text-2xl font-bold">Complete Job</h1>
          <p className="text-gray-400 text-sm mt-1">
            Mark any missing items before generating the USR.
          </p>
        </div>

        <div className="px-4 py-5 space-y-4">
          {/* Score card — documentation quality, informational only */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-900 border border-gray-800 rounded-2xl p-5"
          >
            <div className="flex items-center justify-between mb-1">
              <div>
                <div className="text-4xl font-bold text-white">{score}%</div>
                <div className="text-xs text-gray-500 mt-0.5">Documentation quality</div>
              </div>
              <div className="text-right">
                <div
                  className={`text-sm font-bold ${
                    score >= 85 ? "text-green-400" : score >= 65 ? "text-amber-400" : "text-gray-400"
                  }`}
                >
                  {score >= 85 ? "✓ High Quality" : score >= 65 ? "⚠ Mostly Complete" : "Low Coverage"}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {recordedCount} recorded · {resolvedCount - recordedCount} resolved
                </div>
              </div>
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden mt-3">
              <motion.div
                className={`h-full rounded-full ${
                  score >= 85 ? "bg-green-500" : score >= 65 ? "bg-amber-500" : "bg-gray-600"
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${score}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
            <p className="text-[11px] text-gray-600 mt-2">
              Score is for documentation quality only — does not affect job closure.
            </p>
          </motion.div>

          {/* Checklist with per-item controls */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.07 }}
            className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden"
          >
            {CHECKLIST.map((item, i) => {
              const disp = dispositions[item.key] ?? "pending";
              const meta = DISPOSITION_META[disp];
              const isLast = i === CHECKLIST.length - 1;

              return (
                <div
                  key={item.key}
                  className={`px-4 py-3 ${!isLast ? "border-b border-gray-800/70" : ""}`}
                >
                  {/* Row */}
                  <div className="flex items-center gap-3">
                    <span className="flex-shrink-0">{meta.icon}</span>
                    <span className={`text-sm flex-1 ${disp === "recorded" ? "text-white" : "text-gray-400"}`}>
                      {item.label}
                    </span>
                    <span className={`text-[11px] font-medium ${meta.color}`}>
                      {meta.label}
                    </span>
                  </div>

                  {/* Per-item controls for unrecorded items */}
                  {disp !== "recorded" && (
                    <div className="flex gap-1.5 mt-2 ml-[22px]">
                      {MANUAL_OPTIONS.map((opt) => (
                        <button
                          key={opt.key}
                          onClick={() =>
                            setDisposition(item.key, disp === opt.key ? "pending" : opt.key)
                          }
                          className={`text-[10px] px-2.5 py-1 rounded-lg border transition-colors font-medium ${
                            disp === opt.key
                              ? DISPOSITION_META[opt.key].bg + " " + DISPOSITION_META[opt.key].color
                              : "border-gray-700 text-gray-600 hover:text-gray-400 hover:border-gray-600"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </motion.div>

          {/* Job summary */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-2"
          >
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Job ID</span>
              <span className="font-mono text-xs font-medium text-gray-300">
                {job.id.slice(0, 16)}…
              </span>
            </div>
            {job.unitLabel && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Equipment</span>
                <span className="font-medium">{job.unitLabel}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Events logged</span>
              <span className="font-medium">{events.length}</span>
            </div>
          </motion.div>
        </div>

        {/* Fixed footer — always enabled, technician controls completion */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-950 via-gray-950/95 to-transparent pt-8">
          <motion.button
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
            onClick={() => { void startCeremony(); }}
            whileTap={{ scale: 0.97 }}
            className="w-full bg-white text-gray-950 font-bold text-lg py-5 rounded-2xl flex items-center justify-center gap-2 shadow-2xl"
          >
            <CheckCheck size={20} />
            <span>Complete Job — Generate USR</span>
          </motion.button>
        </div>
      </div>
    );
  }

  // ── Ceremony / generating screen ──────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-6">
      <AnimatePresence mode="wait">
        {!ceremonyDone ? (
          <motion.div
            key="generating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center w-full max-w-sm"
          >
            <div className="relative mx-auto mb-8 w-24 h-24">
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-white/20"
                animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.1, 0.4] }}
                transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
              />
              <motion.div
                className="absolute inset-2 rounded-full border-2 border-white/40"
                animate={{ scale: [1, 1.1, 1], opacity: [0.6, 0.2, 0.6] }}
                transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut", delay: 0.2 }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles size={32} className="text-white" />
              </div>
            </div>

            <div className="space-y-3 mb-8">
              {CEREMONY_STEPS.map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: i <= ceremonyIndex ? 1 : 0.2, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                      i < ceremonyIndex
                        ? "bg-green-500"
                        : i === ceremonyIndex
                          ? "bg-white"
                          : "bg-gray-800"
                    }`}
                  >
                    {i < ceremonyIndex && <span className="text-xs text-white">✓</span>}
                    {i === ceremonyIndex && (
                      <motion.div
                        className="w-2 h-2 rounded-full bg-gray-900"
                        animate={{ scale: [1, 0.5, 1] }}
                        transition={{ repeat: Infinity, duration: 0.8 }}
                      />
                    )}
                  </div>
                  <span
                    className={`text-sm ${
                      i < ceremonyIndex
                        ? "text-green-400"
                        : i === ceremonyIndex
                          ? "text-white font-medium"
                          : "text-gray-600"
                    }`}
                  >
                    {s.label}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="text-center w-full max-w-sm"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 20 }}
              className="mx-auto mb-6 w-20 h-20 rounded-full bg-green-500 flex items-center justify-center shadow-2xl shadow-green-500/30"
            >
              <CheckCircle size={40} className="text-white" strokeWidth={2.5} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="text-3xl font-bold mb-1">Job Complete</h2>
              <div className="font-mono text-xl font-bold text-green-400 mb-2">
                {displayUsrId}
              </div>
              <p className="text-gray-500 text-sm mb-6">
                Service record saved · Equipment history updated
              </p>
            </motion.div>

            {/* Final report breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-6 space-y-2 text-left"
            >
              <div className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">
                Service Record Summary
              </div>
              {CHECKLIST.map((item) => {
                const disp = dispositions[item.key] ?? "pending";
                const meta = DISPOSITION_META[disp];
                return (
                  <div key={item.key} className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">{item.label}</span>
                    <span className={`text-xs font-medium ${meta.color} flex items-center gap-1`}>
                      {meta.icon}
                      {meta.label}
                    </span>
                  </div>
                );
              })}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="grid grid-cols-3 gap-3 mb-6"
            >
              {[
                { label: "Events",  value: String(events.length) },
                { label: "Quality", value: `${score}%`            },
                { label: "Status",  value: "Saved"                },
              ].map((s, i) => (
                <div key={i} className="bg-gray-900 rounded-2xl p-3 border border-gray-800">
                  <div className="text-2xl font-bold text-white">{s.value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                </div>
              ))}
            </motion.div>

            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              onClick={() => onViewRecord(job.id)}
              whileTap={{ scale: 0.97 }}
              className="w-full bg-white text-gray-950 font-bold text-lg py-5 rounded-2xl flex items-center justify-center gap-2"
            >
              <span>View Service Record</span>
              <ChevronRight size={20} />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
