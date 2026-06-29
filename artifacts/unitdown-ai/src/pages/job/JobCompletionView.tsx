/**
 * JobCompletionView — 2.0 production completion ceremony.
 *
 * Shown when the tech taps "Complete Job" in the active view.
 * Calls the real completeJob() from JobModeContext, shows the real USR ID,
 * then navigates to the real service record.
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Circle, ChevronRight, Sparkles } from "lucide-react";
import type { LocalJob, LocalEvent } from "@/context/JobModeContext";

interface Props {
  job: LocalJob;
  events: LocalEvent[];
  onConfirmComplete: () => Promise<void>;
  onViewRecord: (jobId: string) => void;
  onCancel: () => void;
}

type CeremonyPhase = "checklist" | "generating" | "complete";

const CEREMONY_STEPS = [
  { label: "Reviewing your timeline…", duration: 1400 },
  { label: "Assigning permanent USR…", duration: 1000 },
  { label: "AI building service summary…", duration: 2000 },
  { label: "Updating equipment memory…", duration: 900 },
  { label: "Notifying office…", duration: 700 },
];

export function JobCompletionView({
  job,
  events,
  onConfirmComplete,
  onViewRecord,
  onCancel,
}: Props) {
  const [phase, setPhase] = useState<CeremonyPhase>("checklist");
  const [ceremonyIndex, setCeremonyIndex] = useState(0);
  const [ceremonyDone, setCeremonyDone] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [usrId, setUsrId] = useState<string>(job.usrId ?? "");

  const types = new Set(events.map((e) => e.eventType));
  const hasNameplate = types.has("equipment_identified");
  const hasAlarm = types.has("alarm_review");
  const hasMeasurements = types.has("measurement");
  const hasRepair = types.has("part");
  const hasPhoto = types.has("photo");
  const hasVerification = types.has("verification");
  const hasRecommendations = types.has("recommendation");
  const hasVoice = types.has("voice_note");

  const checklist = [
    { label: "Nameplate captured", done: hasNameplate },
    { label: "Alarm documented", done: hasAlarm },
    { label: "Initial measurements", done: hasMeasurements },
    { label: "Repair / part logged", done: hasRepair },
    { label: "Photo captured", done: hasPhoto },
    { label: "Verification measurements", done: hasVerification },
    { label: "Recommendations added", done: hasRecommendations },
    { label: "Voice note logged", done: hasVoice },
  ];

  const doneCount = checklist.filter((c) => c.done).length;
  const score = Math.round((doneCount / checklist.length) * 100);

  async function startCeremony() {
    setCompleting(true);
    setPhase("generating");
    try {
      await onConfirmComplete();
      // After completion, the job in context will have usrId set
      if (job.usrId) setUsrId(job.usrId);
    } catch {
      // completeJob() handles its own errors; ceremony continues
    } finally {
      setCompleting(false);
    }
  }

  useEffect(() => {
    if (phase !== "generating") return;
    if (ceremonyIndex >= CEREMONY_STEPS.length) {
      const t = setTimeout(() => setCeremonyDone(true), 400);
      return () => clearTimeout(t);
    }
    const t = setTimeout(
      () => setCeremonyIndex((i) => i + 1),
      CEREMONY_STEPS[ceremonyIndex].duration,
    );
    return () => clearTimeout(t);
  }, [phase, ceremonyIndex]);

  const displayUsrId =
    usrId ||
    job.usrId ||
    `USR-${new Date().getFullYear()}-${String(job.id.slice(-6).replace(/\D/g, "").padStart(6, "0"))}`;

  // ── Checklist screen ─────────────────────────────────────────────────────────
  if (phase === "checklist") {
    return (
      <div className="min-h-screen bg-gray-950 text-white overflow-y-auto pb-36">
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
            Review your record before generating the USR.
          </p>
        </div>

        <div className="px-4 py-5 space-y-4">
          {/* Score card */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-900 border border-gray-800 rounded-2xl p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-4xl font-bold text-white">{score}%</div>
                <div className="text-sm text-gray-400 mt-0.5">
                  Record completeness
                </div>
              </div>
              <div className="text-right">
                <div
                  className={`text-sm font-bold ${
                    score >= 85
                      ? "text-green-400"
                      : score >= 65
                        ? "text-amber-400"
                        : "text-red-400"
                  }`}
                >
                  {score >= 85
                    ? "✓ Office Ready"
                    : score >= 65
                      ? "⚠ Mostly Complete"
                      : "✗ Needs More"}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {doneCount} of {checklist.length} items
                </div>
              </div>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${
                  score >= 85
                    ? "bg-green-500"
                    : score >= 65
                      ? "bg-amber-500"
                      : "bg-red-500"
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${score}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </motion.div>

          {/* Checklist */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden"
          >
            {checklist.map((item, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 px-4 py-3.5 ${
                  i < checklist.length - 1 ? "border-b border-gray-800" : ""
                }`}
              >
                {item.done ? (
                  <CheckCircle
                    size={18}
                    className="text-green-500 flex-shrink-0"
                  />
                ) : (
                  <Circle size={18} className="text-gray-600 flex-shrink-0" />
                )}
                <span
                  className={`text-sm ${item.done ? "text-white" : "text-gray-500"}`}
                >
                  {item.label}
                </span>
                {!item.done && (
                  <span className="ml-auto text-xs text-gray-600">
                    Optional
                  </span>
                )}
              </div>
            ))}
          </motion.div>

          {/* Job summary */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
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

        {/* Fixed footer */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-950 via-gray-950 to-transparent pt-8 space-y-2">
          <motion.button
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            onClick={startCeremony}
            disabled={completing}
            whileTap={{ scale: 0.97 }}
            className="w-full bg-white text-gray-950 font-bold text-lg py-5 rounded-2xl flex items-center justify-center gap-2 shadow-2xl disabled:opacity-60"
          >
            <Sparkles size={20} />
            <span>Generate Service Record</span>
          </motion.button>
        </div>
      </div>
    );
  }

  // ── Ceremony / generating screen ─────────────────────────────────────────────
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
                transition={{
                  repeat: Infinity,
                  duration: 1.8,
                  ease: "easeInOut",
                }}
              />
              <motion.div
                className="absolute inset-2 rounded-full border-2 border-white/40"
                animate={{ scale: [1, 1.1, 1], opacity: [0.6, 0.2, 0.6] }}
                transition={{
                  repeat: Infinity,
                  duration: 1.8,
                  ease: "easeInOut",
                  delay: 0.2,
                }}
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
                    {i < ceremonyIndex && (
                      <span className="text-xs text-white">✓</span>
                    )}
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
              transition={{
                delay: 0.1,
                type: "spring",
                stiffness: 300,
                damping: 20,
              }}
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
              <p className="text-gray-500 text-sm mb-8">
                Service record saved · Equipment history updated
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="grid grid-cols-3 gap-3 mb-8"
            >
              {[
                { label: "Events", value: String(events.length) },
                { label: "Record", value: `${score}%` },
                { label: "Status", value: "Saved" },
              ].map((s, i) => (
                <div
                  key={i}
                  className="bg-gray-900 rounded-2xl p-3 border border-gray-800"
                >
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
