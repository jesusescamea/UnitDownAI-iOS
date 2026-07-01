/**
 * JobActiveView — UnitDown 2.0 dark active job screen.
 *
 * Adapted from jmp/ActiveJobView.tsx prototype, wired to real production data:
 * - LocalJob / LocalEvent from JobModeContext (no mock data)
 * - addEvent() from useJobMode() for all inline modals
 * - elapsedSeconds from JobModeContext for the live timer
 * - Existing production VoiceNoteModal / NoteModal / MeasurementModal reused
 *   (they call addEvent internally via context)
 * - Inline modals: alarm, photo, nameplate, part, recommendations
 * - DEV navigation removed; job stage derived from real events
 */
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera, Mic, Plus, X, ChevronDown, ChevronUp,
  Wrench, CheckSquare, Cpu, CheckCircle, Sparkles,
  AlertTriangle, Search, ArrowLeft, ChevronRight, Zap, FileText,
} from "lucide-react";
import { useUser } from "@clerk/clerk-react";
import { useJobMode } from "@/context/JobModeContext";
import type { LocalJob, LocalEvent, EventType } from "@/context/JobModeContext";
import { VoiceNoteModal } from "@/components/job/modals/VoiceNoteModal";
import { NoteModal } from "@/components/job/modals/NoteModal";
import { MeasurementModal } from "@/components/job/modals/MeasurementModal";
import { searchParts, PARTS_MASTER, matchVanInventory } from "@/pages/jmp/partsIntelligence";
import { INITIAL_INVENTORY } from "@/pages/jmp/vanData";
import NameplateScannerModal from "@/components/NameplateScannerModal";

// ─── Types ─────────────────────────────────────────────────────────────────────

type ModalType =
  | "voice" | "note" | "measurement-initial" | "measurement-verification"
  | "alarm" | "photo" | "nameplate" | "part" | "recommendations"
  | "fab-menu" | "customer-summary";

// ─── Color palette ─────────────────────────────────────────────────────────────

const ACTIVITY_COLORS: Record<string, { border: string; bg: string; label: string; icon: string }> = {
  arrived:              { border: "border-gray-600",   bg: "bg-gray-900",      label: "text-gray-300",   icon: "📍" },
  dispatch:             { border: "border-gray-600",   bg: "bg-gray-900",      label: "text-gray-300",   icon: "📍" },
  equipment_identified: { border: "border-blue-600",   bg: "bg-blue-950/50",   label: "text-blue-400",   icon: "🔖" },
  alarm_review:         { border: "border-red-600",    bg: "bg-red-950/50",    label: "text-red-400",    icon: "⚡" },
  voice_note:           { border: "border-purple-600", bg: "bg-purple-950/50", label: "text-purple-400", icon: "🎤" },
  measurement:          { border: "border-green-600",  bg: "bg-green-950/50",  label: "text-green-400",  icon: "📈" },
  verification:         { border: "border-green-500",  bg: "bg-green-950/50",  label: "text-green-300",  icon: "✅" },
  part:                 { border: "border-orange-600", bg: "bg-orange-950/50", label: "text-orange-400", icon: "🔧" },
  photo:                { border: "border-sky-600",    bg: "bg-sky-950/50",    label: "text-sky-400",    icon: "📷" },
  recommendation:       { border: "border-amber-600",  bg: "bg-amber-950/50",  label: "text-amber-400",  icon: "📋" },
  note:                 { border: "border-gray-600",   bg: "bg-gray-900",      label: "text-gray-400",   icon: "📝" },
  service_report:       { border: "border-indigo-600", bg: "bg-indigo-950/50", label: "text-indigo-400", icon: "📄" },
  completed:            { border: "border-green-600",  bg: "bg-green-950/50",  label: "text-green-400",  icon: "🏁" },
};

// ─── Job stage derivation ──────────────────────────────────────────────────────

type JobStage =
  | "ARRIVED" | "EQUIPMENT_VERIFIED" | "INITIAL_OBSERVATION"
  | "MEASUREMENTS_CAPTURED" | "ROOT_CAUSE_IDENTIFIED" | "REPAIR_IN_PROGRESS"
  | "REPAIR_COMPLETED" | "VERIFICATION_COMPLETE" | "RECOMMENDATIONS_ADDED"
  | "CUSTOMER_REVIEWED";

function getSkipped(events: LocalEvent[]): Set<string> {
  return new Set(
    events
      .filter((e) => e.eventType === "note" && (e.metadata as Record<string, unknown> | null)?.skipped)
      .map((e) => (e.metadata as Record<string, string>).skipped),
  );
}

function deriveStage(events: LocalEvent[]): JobStage {
  const types   = new Set(events.map((e) => e.eventType));
  const skipped = getSkipped(events);
  if (types.has("verification")  || skipped.has("verification"))  return "VERIFICATION_COMPLETE";
  if (types.has("recommendation"))                                 return "RECOMMENDATIONS_ADDED";
  if (types.has("part"))                                           return "REPAIR_IN_PROGRESS";
  if (types.has("measurement")   || skipped.has("measurement"))   return "MEASUREMENTS_CAPTURED";
  if (types.has("alarm_review"))                                   return "INITIAL_OBSERVATION";
  if (types.has("equipment_identified"))                           return "EQUIPMENT_VERIFIED";
  return "ARRIVED";
}

function computeScore(events: LocalEvent[]): number {
  const types = new Set(events.map((e) => e.eventType));
  let score = 10;
  if (types.has("equipment_identified")) score += 15;
  if (types.has("alarm_review"))         score += 10;
  if (types.has("measurement"))          score += 15;
  if (types.has("part"))                 score += 15;
  if (types.has("photo"))                score += 10;
  if (types.has("verification"))         score += 15;
  if (types.has("recommendation"))       score += 10;
  return Math.min(100, score);
}

interface SuggestionConfig {
  emoji: string; text: string; context: string | null;
  primaryLabel: string; primaryModal: ModalType | "complete";
  secondLabel?: string; secondModal?: ModalType;
}

const SUGGESTION: Record<JobStage, SuggestionConfig> = {
  ARRIVED:             { emoji: "📷", text: "Nameplate photo is a good starting point",      context: "Confirms equipment ID and loads measurement templates",           primaryLabel: "Capture Nameplate",         primaryModal: "nameplate" },
  EQUIPMENT_VERIFIED:  { emoji: "⚡", text: "Any active fault codes on the display?",          context: "Document alarms before starting diagnosis",                      primaryLabel: "Log Alarm Code",            primaryModal: "alarm" },
  INITIAL_OBSERVATION: { emoji: "📈", text: "Initial readings when you're ready",              context: "Start with suction / head / superheat / subcooling",              primaryLabel: "Start Measurements",        primaryModal: "measurement-initial" },
  MEASUREMENTS_CAPTURED:{ emoji: "🔍", text: "Document your diagnosis",                        context: "Voice note or add a written note about your findings",            primaryLabel: "Voice Note",               primaryModal: "voice" },
  ROOT_CAUSE_IDENTIFIED:{ emoji: "🔧", text: "Ready to start the repair?",                    context: null,                                                             primaryLabel: "Log Part / Repair",         primaryModal: "part" },
  REPAIR_IN_PROGRESS:  { emoji: "📷", text: "Repair photo when you're ready",                 context: null,                                                             primaryLabel: "Take Repair Photo",         primaryModal: "photo",     secondLabel: "Add Part", secondModal: "part" },
  REPAIR_COMPLETED:    { emoji: "✅", text: "Verification readings when system is stable",    context: "Compare post-repair to initial measurements",                     primaryLabel: "Start Verification",        primaryModal: "measurement-verification" },
  VERIFICATION_COMPLETE:{ emoji: "⭐", text: "System looks good — any recommendations?",      context: "Deferred maintenance, follow-up items, safety notes",             primaryLabel: "Add Recommendations",       primaryModal: "recommendations" },
  RECOMMENDATIONS_ADDED:{ emoji: "👤", text: "Ready to review with the customer?",            context: "Plain-language summary is ready",                                 primaryLabel: "Customer Review",           primaryModal: "customer-summary" },
  CUSTOMER_REVIEWED:   { emoji: "🏁", text: "Job looks complete — ready to generate the USR?", context: null,                                                           primaryLabel: "Complete Job",              primaryModal: "complete" },
};

// ─── Utilities ─────────────────────────────────────────────────────────────────

function formatTimer(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function fmtTimestamp(ts: number) {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

// ─── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  job: LocalJob;
  events: LocalEvent[];
  elapsedSeconds: number;
  onComplete: () => void;
  onBack: () => void;
}

// ─── Main component ────────────────────────────────────────────────────────────

export function JobActiveView({ job, events, elapsedSeconds, onComplete, onBack }: Props) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const { addEvent } = useJobMode();
  const [activeModal, setActiveModal] = useState<ModalType | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [repairDone, setRepairDone] = useState(false);

  const stage = repairDone ? "REPAIR_COMPLETED" : deriveStage(events);
  const score = computeScore(events);
  const suggestion = SUGGESTION[stage];

  useEffect(() => {
    if (timelineRef.current) {
      timelineRef.current.scrollTop = timelineRef.current.scrollHeight;
    }
  }, [events.length]);

  function openModal(m: ModalType) { setActiveModal(m); }
  function closeModal() { setActiveModal(null); }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  async function doAddEvent(type: EventType, title: string, extra: {
    notes?: string; measurements?: Record<string, string>;
    parts?: unknown; metadata?: Record<string, unknown>;
    voiceTranscript?: string; photoUrls?: string[];
  } = {}) {
    closeModal();
    await addEvent({ eventType: type, title, ...extra });
    showToast(`✓ ${title} saved`);
  }

  function handleSuggestionPrimary() {
    if (suggestion.primaryModal === "complete") { onComplete(); return; }
    openModal(suggestion.primaryModal as ModalType);
  }

  const header = [job.unitLabel, job.customer].filter(Boolean).join(" · ") || "Active Job";

  return (
    <div className="h-screen bg-gray-950 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 pt-10 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-0.5">
          <button onClick={onBack} className="text-[10px] text-gray-500 flex items-center gap-1">
            <ArrowLeft size={10} /> Jobs
          </button>
          <div className="flex items-center gap-1.5 bg-gray-800 rounded-full px-2.5 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="font-mono text-sm font-bold text-white">{formatTimer(elapsedSeconds)}</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-white text-base leading-tight">{header}</div>
            <div className="text-[10px] font-mono text-gray-600 mt-0.5">{job.id.slice(0, 20)}</div>
          </div>
          <button onClick={onComplete}
            className="text-[10px] font-semibold text-gray-400 border border-gray-700 rounded-full px-3 py-1 hover:border-green-600 hover:text-green-400 transition-colors">
            Complete
          </button>
        </div>
      </div>

      {/* Score bar */}
      <div className="px-4 pt-2.5 pb-1 flex-shrink-0 bg-gray-950">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-gray-500 font-medium">SERVICE RECORD</span>
          <span className={`text-xs font-bold ${score >= 90 ? "text-green-400" : score >= 70 ? "text-amber-400" : "text-gray-400"}`}>
            {score}%
          </span>
        </div>
        <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${score >= 90 ? "bg-green-500" : score >= 70 ? "bg-amber-500" : "bg-blue-500"}`}
            animate={{ width: `${score}%` }} transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Suggestion card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={stage}
          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
          className="mx-4 mt-2 mb-1.5 flex-shrink-0"
        >
          <div className="rounded-2xl px-3.5 py-3 border border-gray-800 bg-gray-900/60">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mb-1">Suggested</div>
                <p className="text-white font-semibold text-sm leading-snug">
                  {suggestion.emoji} {suggestion.text}
                </p>
                {suggestion.context && (
                  <p className="text-gray-500 text-xs mt-0.5">{suggestion.context}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2.5">
              <button onClick={handleSuggestionPrimary}
                className="flex-1 bg-white/90 text-gray-950 font-bold text-xs py-2.5 rounded-xl">
                {suggestion.primaryLabel}
              </button>
              {suggestion.secondLabel && suggestion.secondModal && (
                <button onClick={() => openModal(suggestion.secondModal!)}
                  className="flex-1 bg-gray-800 text-white font-semibold text-xs py-2.5 rounded-xl border border-gray-700">
                  {suggestion.secondLabel}
                </button>
              )}
              {stage === "REPAIR_IN_PROGRESS" && !repairDone && (
                <button onClick={() => { setRepairDone(true); showToast("Repair marked complete"); }}
                  className="bg-gray-800 text-gray-300 font-semibold text-xs py-2.5 px-3 rounded-xl border border-gray-700">
                  Done ✓
                </button>
              )}
            </div>
            {/* Skip / Not Applicable for optional measurement stages */}
            {(stage === "INITIAL_OBSERVATION" || stage === "REPAIR_COMPLETED") && (
              <div className="flex gap-2 mt-1.5">
                <button
                  onClick={() => {
                    const which = stage === "INITIAL_OBSERVATION" ? "measurement" : "verification";
                    void doAddEvent("note", which === "measurement" ? "Measurements Skipped" : "Verification Skipped", {
                      metadata: { skipped: which, reason: "Not applicable for this repair" },
                    });
                    showToast("Skipped — continuing without readings");
                  }}
                  className="flex-1 text-[10px] text-gray-500 border border-gray-700 rounded-xl py-1.5 hover:text-gray-300 hover:border-gray-600 transition-colors"
                >
                  Skip — Not Applicable
                </button>
                <button
                  onClick={() => {
                    const which = stage === "INITIAL_OBSERVATION" ? "measurement" : "verification";
                    void doAddEvent("note", which === "measurement" ? "Measurements Skipped" : "Verification Skipped", {
                      metadata: { skipped: which, reason: "Will complete later" },
                    });
                    showToast("Continuing — readings can be added later");
                  }}
                  className="flex-1 text-[10px] text-gray-500 border border-gray-700 rounded-xl py-1.5 hover:text-gray-300 hover:border-gray-600 transition-colors"
                >
                  Continue Without
                </button>
              </div>
            )}
            <button onClick={() => openModal("fab-menu")}
              className="w-full text-[10px] text-gray-600 mt-1.5 py-0.5 text-center">
              or use + to do something else
            </button>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Timeline */}
      <div ref={timelineRef} className="flex-1 overflow-y-auto px-4 space-y-2 pb-4">
        <AnimatePresence initial={false}>
          {events.map((e) => <EventCard key={e.id} event={e} />)}
        </AnimatePresence>
        {events.length === 0 && (
          <div className="text-center py-8 text-gray-600 text-sm">
            Timeline will build as you work
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="flex-shrink-0 bg-gray-900 border-t border-gray-800 px-4 py-3 flex gap-3 items-center">
        <button onClick={() => openModal("photo")}
          className="w-12 h-12 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center flex-shrink-0">
          <Camera size={20} className="text-white" />
        </button>
        <button onClick={() => openModal("voice")}
          className="flex-1 h-12 rounded-2xl bg-purple-700 flex items-center justify-center gap-2 font-bold text-white text-sm">
          <Mic size={18} />
          Voice Note
        </button>
        <button onClick={() => openModal("fab-menu")}
          className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center flex-shrink-0">
          <Plus size={22} className="text-gray-950" />
        </button>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs font-medium px-4 py-2.5 rounded-full shadow-xl border border-gray-700 whitespace-nowrap z-50">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODALS */}
      <AnimatePresence>
        {activeModal === "voice" && (
          <VoiceNoteModal onClose={closeModal} />
        )}
        {activeModal === "note" && (
          <NoteModal onClose={closeModal} />
        )}
        {activeModal === "measurement-initial" && (
          <MeasurementModal onClose={closeModal} />
        )}
        {activeModal === "measurement-verification" && (
          <MeasurementModal onClose={closeModal} />
        )}
        {activeModal === "fab-menu" && (
          <FabMenu
            stage={stage}
            onClose={closeModal}
            onSelect={(m) => { closeModal(); setTimeout(() => openModal(m), 80); }}
            onRepairDone={() => { setRepairDone(true); showToast("Repair marked complete"); closeModal(); }}
            onComplete={onComplete}
          />
        )}
        {activeModal === "nameplate" && (
          <JobIdentifyModal
            job={job}
            onClose={closeModal}
            onSave={(fields, method, linkedUnitId) => {
              const label = [fields.make, fields.model].filter(Boolean).join(" ") || "Equipment identified";
              const subtitle = Object.entries(fields).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(" · ");
              void doAddEvent("equipment_identified", label, {
                notes: subtitle,
                metadata: {
                  nameplate: fields,
                  identificationMethod: method,
                  ...(linkedUnitId ? { linkedUnitId } : {}),
                },
              });
            }}
          />
        )}
        {activeModal === "alarm" && (
          <AlarmModal
            onClose={closeModal}
            onSave={(code, desc) => {
              void doAddEvent("alarm_review", `Alarm Code ${code}`, { notes: desc });
            }}
          />
        )}
        {activeModal === "photo" && (
          <PhotoModal
            onClose={closeModal}
            onSave={(label, photoDataUrl, notes) => {
              void doAddEvent("photo", `Photo · ${label}`, {
                notes: notes || label,
                photoUrls: photoDataUrl ? [photoDataUrl] : undefined,
                metadata: { photoLabel: label },
              });
            }}
          />
        )}
        {activeModal === "part" && (
          <PartModal
            onClose={closeModal}
            onSave={(name, detail, qty) => {
              void doAddEvent("part", name, { notes: detail, parts: { name, qty, detail } });
            }}
          />
        )}
        {activeModal === "recommendations" && (
          <RecommendationsModal
            onClose={closeModal}
            onSave={(recs) => {
              closeModal();
              recs.forEach((r, i) => {
                setTimeout(() => {
                  void addEvent({ eventType: "recommendation", title: "Recommendation", notes: r });
                }, i * 80);
              });
              showToast(`📋 ${recs.length} recommendation${recs.length !== 1 ? "s" : ""} added`);
            }}
          />
        )}
        {activeModal === "customer-summary" && (
          <CustomerSummaryModal
            job={job}
            events={events}
            onClose={closeModal}
            onReviewed={() => {
              void doAddEvent("note", "Customer Review Complete", { notes: "Summary reviewed with customer" });
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Event card ────────────────────────────────────────────────────────────────

function EventCard({ event: e }: { event: LocalEvent }) {
  const [expanded, setExpanded] = useState(false);
  const colors = ACTIVITY_COLORS[e.eventType] ?? ACTIVITY_COLORS.note;
  const hasMeasurements = e.measurements && Object.keys(e.measurements).length > 0;
  const expandable = !!(e.voiceTranscript || hasMeasurements);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className={`${colors.bg} border-l-4 ${colors.border} rounded-r-2xl rounded-bl-2xl p-3 ${expandable ? "cursor-pointer" : ""}`}
      onClick={() => expandable && setExpanded((v) => !v)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className={`text-[9px] font-bold uppercase tracking-wider ${colors.label}`}>
              {colors.icon} {e.eventType.replace(/_/g, " ")}
            </span>
            {!e._synced && (
              <span className="text-[9px] bg-amber-900/50 text-amber-400 px-1 py-0.5 rounded font-semibold">⏳ Syncing</span>
            )}
          </div>
          <div className="font-semibold text-white text-sm leading-snug">{e.title}</div>
          {e.notes && (
            <div className="text-xs text-gray-400 mt-0.5 leading-relaxed line-clamp-2">{e.notes}</div>
          )}
          {e.voiceTranscript && !expanded && (
            <div className="text-xs text-gray-500 mt-1 italic truncate">
              "{e.voiceTranscript.substring(0, 65)}..."
            </div>
          )}
        </div>
        <div className="text-[10px] text-gray-600 font-mono flex-shrink-0">
          {fmtTimestamp(e.timestamp)}
        </div>
      </div>

      <AnimatePresence>
        {expanded && e.voiceTranscript && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <div className="mt-2 p-2.5 bg-black/20 rounded-xl">
              <div className="text-[9px] text-purple-400 font-bold uppercase tracking-wider mb-1">Transcript</div>
              <div className="text-xs text-gray-300 italic leading-relaxed">"{e.voiceTranscript}"</div>
            </div>
          </motion.div>
        )}
        {expanded && hasMeasurements && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {Object.entries(e.measurements!).map(([label, value], i) => (
                <div key={i} className="rounded-lg px-2 py-1.5 bg-green-950/40">
                  <div className="text-[9px] text-gray-400">{label}</div>
                  <div className="text-xs font-bold text-white">{value}</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Modal shell ───────────────────────────────────────────────────────────────

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 z-40 flex items-end" onClick={onClose}>
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 35 }}
        className="w-full bg-gray-900 rounded-t-3xl border-t border-gray-800 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-800">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center">
            <X size={16} className="text-gray-400" />
          </button>
        </div>
        <div className="px-5 pb-8 pt-4">{children}</div>
      </motion.div>
    </motion.div>
  );
}

// ─── FAB menu ──────────────────────────────────────────────────────────────────

function FabMenu({ stage, onClose, onSelect, onRepairDone, onComplete }: {
  stage: JobStage; onClose: () => void;
  onSelect: (m: ModalType) => void;
  onRepairDone: () => void;
  onComplete: () => void;
}) {
  const measModal: ModalType =
    stage === "REPAIR_COMPLETED" || stage === "VERIFICATION_COMPLETE"
      ? "measurement-verification"
      : "measurement-initial";

  const actions: { icon: React.ReactNode; label: string; modal: ModalType }[] = [
    { icon: <Camera size={20} />,    label: "Photo",           modal: "photo" },
    { icon: <Mic size={20} />,       label: "Voice Note",      modal: "voice" },
    { icon: <Zap size={20} />,       label: "Alarm Code",      modal: "alarm" },
    { icon: <Wrench size={20} />,    label: "Part / Material", modal: "part" },
    { icon: <FileText size={20} />,  label: "Measurements",    modal: measModal },
    { icon: <FileText size={20} />,  label: "Note",            modal: "note" },
    { icon: <CheckSquare size={20} />, label: "Recommendations", modal: "recommendations" },
    { icon: <Cpu size={20} />,        label: "Nameplate",       modal: "nameplate" },
  ];

  return (
    <ModalShell title="Add Activity" onClose={onClose}>
      <div className="grid grid-cols-4 gap-3">
        {actions.map((a) => (
          <button key={a.label} onClick={() => onSelect(a.modal)}
            className="flex flex-col items-center gap-2 p-3 bg-gray-800 rounded-2xl hover:bg-gray-700 transition-colors">
            <div className="text-white">{a.icon}</div>
            <span className="text-[10px] text-gray-300 font-medium text-center leading-tight">{a.label}</span>
          </button>
        ))}
      </div>
      {stage === "REPAIR_IN_PROGRESS" && (
        <button onClick={onRepairDone}
          className="w-full mt-4 bg-green-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2">
          <CheckCircle size={18} /> Mark Repair Complete
        </button>
      )}
      <button onClick={() => { onClose(); setTimeout(onComplete, 80); }}
        className="w-full mt-3 py-3 text-sm font-semibold text-gray-500 border border-gray-800 rounded-2xl flex items-center justify-center gap-2">
        <Sparkles size={15} /> Complete Job
      </button>
    </ModalShell>
  );
}

// ─── Job equipment identification modal ────────────────────────────────────────
//
// Smart routing flow:
//   job.unitId       → VERIFY  (confirm the assigned unit)
//   job.customer/site → SELECT  (pick from site's saved units, if any)
//   fallback          → CHOOSE  (scan vs manual)

const NAMEPLATE_FIELDS: Array<{ key: string; label: string; placeholder: string }> = [
  { key: "make",        label: "Make",          placeholder: "e.g. Carrier" },
  { key: "model",       label: "Model",         placeholder: "e.g. 50XCQ006006" },
  { key: "serial",      label: "Serial Number", placeholder: "e.g. 4321A8876" },
  { key: "capacity",    label: "Capacity",      placeholder: "e.g. 7.5 Ton" },
  { key: "refrigerant", label: "Refrigerant",   placeholder: "e.g. R-410A" },
  { key: "voltage",     label: "Voltage",       placeholder: "e.g. 208/230V 3-Phase" },
];

const OCR_DISPLAY_FIELDS: Array<{ key: string; label: string }> = [
  { key: "make",        label: "Manufacturer" },
  { key: "model",       label: "Model" },
  { key: "serial",      label: "Serial" },
  { key: "refrigerant", label: "Refrigerant" },
  { key: "voltage",     label: "Voltage" },
  { key: "capacity",    label: "Capacity" },
];

interface UnitCard {
  id: string;
  nickname?: string | null;
  siteCustomerName?: string | null;
  location?: string | null;
  manufacturer?: string | null;
  modelNumber?: string | null;
  serialNumber?: string | null;
  equipmentType?: string | null;
}

type IdScreen = "routing" | "verify" | "select" | "choose" | "ocr_result" | "manual";

function UnitCardDisplay({ unit, compact }: { unit: UnitCard; compact?: boolean }) {
  const label = unit.nickname
    || [unit.manufacturer, unit.modelNumber].filter(Boolean).join(" ")
    || "Unknown Unit";
  const sub = [unit.equipmentType, unit.location].filter(Boolean).join(" · ");
  return (
    <div className="space-y-1.5">
      <div className="font-semibold text-white text-sm leading-tight">{label}</div>
      {sub && <div className="text-[10px] text-gray-500">{sub}</div>}
      {!compact && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-1">
          {unit.manufacturer  && <UnitSpec label="Make"   value={unit.manufacturer} />}
          {unit.modelNumber   && <UnitSpec label="Model"  value={unit.modelNumber} />}
          {unit.serialNumber  && <UnitSpec label="Serial" value={unit.serialNumber} />}
          {unit.siteCustomerName && <UnitSpec label="Site" value={unit.siteCustomerName} />}
        </div>
      )}
    </div>
  );
}

function UnitSpec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[9px] font-bold uppercase tracking-wider text-gray-600">{label}</div>
      <div className="text-[11px] text-white font-medium truncate">{value}</div>
    </div>
  );
}

function OcrEditRow({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <div className="flex items-center justify-between gap-2 py-1.5 border-b border-gray-800/50 last:border-0">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 flex-shrink-0 w-24">{label}</span>
        <input
          autoFocus
          value={value}
          onChange={e => onChange(e.target.value)}
          onBlur={() => setEditing(false)}
          className="flex-1 bg-gray-800 text-white text-xs rounded-lg px-2 py-1 border border-teal-600 outline-none text-right"
        />
      </div>
    );
  }
  return (
    <button
      onClick={() => setEditing(true)}
      className="w-full flex items-center justify-between gap-2 py-1.5 border-b border-gray-800/50 last:border-0 active:bg-white/5 rounded-sm transition-colors"
    >
      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 flex-shrink-0 w-24">{label}</span>
      <span className={`text-xs font-medium text-right flex-1 ${value ? "text-white" : "text-gray-600 italic"}`}>
        {value || "Not detected"}
      </span>
    </button>
  );
}

function JobIdentifyModal({ job, onClose, onSave }: {
  job: LocalJob;
  onClose: () => void;
  onSave: (fields: Record<string, string>, method: string, linkedUnitId?: string) => void;
}) {
  const { user } = useUser();
  const clientId = user?.id ?? "";

  const [screen, setScreen]           = useState<IdScreen>("routing");
  const [loading, setLoading]         = useState(true);
  const [siteUnits, setSiteUnits]     = useState<UnitCard[]>([]);
  const [assignedUnit, setAssignedUnit] = useState<UnitCard | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [ocrLoading, setOcrLoading]   = useState(false);
  const [ocrFields, setOcrFields]     = useState<Record<string, string> | null>(null);
  const [manualFields, setManualFields] = useState<Record<string, string>>({});

  // Auto-route based on job context
  useEffect(() => {
    let cancelled = false;
    async function route() {
      try {
        if (job.unitId) {
          const res = await fetch(`/api/units/${job.unitId}?clientId=${encodeURIComponent(clientId)}`);
          if (!cancelled && res.ok) {
            const d = await res.json();
            setAssignedUnit((d.unit ?? d) as UnitCard);
            setScreen("verify");
            setLoading(false);
            return;
          }
        }
        if (job.customer || job.site) {
          const q = encodeURIComponent(job.customer ?? job.site ?? "");
          const res = await fetch(`/api/units?clientId=${encodeURIComponent(clientId)}&q=${q}`);
          if (!cancelled && res.ok) {
            const d = await res.json();
            const units: UnitCard[] = Array.isArray(d) ? d : (d.units ?? []);
            if (units.length > 0) {
              setSiteUnits(units);
              setScreen("select");
              setLoading(false);
              return;
            }
          }
        }
      } catch { /* fall through to choose */ }
      if (!cancelled) { setScreen("choose"); setLoading(false); }
    }
    void route();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCapture(blob: Blob) {
    setScannerOpen(false);
    setOcrLoading(true);
    setScreen("ocr_result");
    setOcrFields(null);
    try {
      const fd = new FormData();
      fd.append("file", blob, "nameplate.jpg");
      const res  = await fetch("/api/nameplate/ocr", { method: "POST", body: fd });
      const data = await res.json();
      const ext  = (data.extracted ?? {}) as Record<string, unknown>;
      setOcrFields({
        make:        String(ext.manufacturer  ?? ""),
        model:       String(ext.modelNumber   ?? ""),
        serial:      String(ext.serialNumber  ?? ""),
        capacity:    ext.capacityTons ? `${ext.capacityTons} Tons` : "",
        refrigerant: String(ext.refrigerantType ?? ""),
        voltage:     String(ext.voltage ?? ""),
      });
    } catch {
      setOcrFields({});
    } finally {
      setOcrLoading(false);
    }
  }

  function confirmUnit(unit: UnitCard, method: "verified" | "selected") {
    onSave({
      make:        unit.manufacturer ?? "",
      model:       unit.modelNumber  ?? "",
      serial:      unit.serialNumber ?? "",
      refrigerant: "",
      voltage:     "",
      capacity:    "",
    }, method, unit.id);
  }

  // ── Loading ──
  if (loading) {
    return (
      <ModalShell title="Identify Equipment" onClose={onClose}>
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="w-8 h-8 border-2 border-gray-700 border-t-white rounded-full animate-spin" />
          <p className="text-xs text-gray-500">Checking for saved equipment…</p>
        </div>
      </ModalShell>
    );
  }

  // ── Camera scanner (renders full-screen) ──
  if (scannerOpen) {
    return (
      <NameplateScannerModal
        onCapture={(blob) => { void handleCapture(blob); }}
        onClose={() => { setScannerOpen(false); setScreen(assignedUnit ? "verify" : siteUnits.length > 0 ? "select" : "choose"); }}
      />
    );
  }

  // ── VERIFY screen — job has a linked unit ──
  if (screen === "verify" && assignedUnit) {
    return (
      <ModalShell title="Assigned Equipment" onClose={onClose}>
        <div className="space-y-4">
          <p className="text-xs text-gray-400">
            This job is assigned to the unit below. Confirm you're working on the right equipment before starting.
          </p>
          <div className="bg-blue-950/25 border border-blue-800/40 rounded-2xl p-4">
            <UnitCardDisplay unit={assignedUnit} />
          </div>
          <button
            onClick={() => confirmUnit(assignedUnit, "verified")}
            className="w-full bg-white text-gray-950 font-bold py-4 rounded-2xl text-sm flex items-center justify-center gap-2"
          >
            <CheckCircle size={16} /> Verify This Unit
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => setScannerOpen(true)}
              className="flex-1 flex items-center justify-center gap-2 bg-gray-800 border border-gray-700 rounded-2xl py-3 text-xs font-semibold text-gray-300 active:bg-gray-700"
            >
              <Camera size={13} /> Scan to Confirm
            </button>
            <button
              onClick={() => setScreen(siteUnits.length > 0 ? "select" : "choose")}
              className="flex-1 flex items-center justify-center gap-2 bg-gray-800 border border-gray-700 rounded-2xl py-3 text-xs font-semibold text-gray-300 active:bg-gray-700"
            >
              Select Different
            </button>
          </div>
        </div>
      </ModalShell>
    );
  }

  // ── SELECT screen — site has saved units ──
  if (screen === "select") {
    return (
      <ModalShell title="Equipment on Site" onClose={onClose}>
        <div className="space-y-3">
          <p className="text-xs text-gray-400">Tap the unit you're working on.</p>
          <div className="space-y-2 max-h-[52vh] overflow-y-auto">
            {siteUnits.map((unit) => (
              <button
                key={unit.id}
                onClick={() => confirmUnit(unit, "selected")}
                className="w-full text-left bg-gray-800 border border-gray-700 rounded-2xl p-4 active:bg-gray-700 transition-colors"
              >
                <UnitCardDisplay unit={unit} />
              </button>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setScannerOpen(true)}
              className="flex-1 flex items-center justify-center gap-2 bg-gray-800 border border-gray-700 rounded-2xl py-3 text-xs font-semibold text-gray-300 active:bg-gray-700"
            >
              <Camera size={13} /> Scan Nameplate
            </button>
            <button
              onClick={() => setScreen("manual")}
              className="flex-1 flex items-center justify-center gap-2 bg-gray-800 border border-gray-700 rounded-2xl py-3 text-xs font-semibold text-gray-300 active:bg-gray-700"
            >
              Enter Manually
            </button>
          </div>
        </div>
      </ModalShell>
    );
  }

  // ── CHOOSE screen — no saved units ──
  if (screen === "choose") {
    return (
      <ModalShell title="Identify Equipment" onClose={onClose}>
        <div className="space-y-3">
          <p className="text-xs text-gray-400">
            How do you want to identify the unit you're working on?
          </p>
          <button
            onClick={() => setScannerOpen(true)}
            className="w-full bg-white text-gray-950 font-bold py-5 rounded-2xl flex items-center justify-center gap-3 text-sm active:scale-[0.98] transition-transform"
          >
            <Camera size={20} /> Scan Nameplate
          </button>
          <button
            onClick={() => setScreen("manual")}
            className="w-full bg-gray-800 border border-gray-700 text-gray-300 font-semibold py-5 rounded-2xl flex items-center justify-center gap-3 text-sm active:bg-gray-700"
          >
            Enter Manually
          </button>
        </div>
      </ModalShell>
    );
  }

  // ── OCR RESULT screen ──
  if (screen === "ocr_result") {
    if (ocrLoading) {
      return (
        <ModalShell title="Reading Nameplate…" onClose={onClose}>
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-8 h-8 border-2 border-gray-700 border-t-teal-400 rounded-full animate-spin" />
            <p className="text-xs text-gray-500">Extracting equipment data…</p>
          </div>
        </ModalShell>
      );
    }
    const fieldsToSave = ocrFields ?? {};
    return (
      <ModalShell title="Nameplate Detected" onClose={onClose}>
        <div className="space-y-4">
          <p className="text-xs text-gray-400">Review the extracted data. Tap any field to edit.</p>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3">
            {OCR_DISPLAY_FIELDS.map(f => (
              <OcrEditRow
                key={f.key}
                label={f.label}
                value={fieldsToSave[f.key] ?? ""}
                onChange={(v) => setOcrFields(prev => ({ ...(prev ?? {}), [f.key]: v }))}
              />
            ))}
          </div>
          <button
            onClick={() => onSave(fieldsToSave, "scanned")}
            className="w-full bg-white text-gray-950 font-bold py-4 rounded-2xl text-sm"
          >
            Confirm Equipment
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => { setOcrFields(null); setScannerOpen(true); }}
              className="flex-1 flex items-center justify-center gap-2 bg-gray-800 border border-gray-700 rounded-2xl py-3 text-xs font-semibold text-gray-300 active:bg-gray-700"
            >
              <Camera size={13} /> Scan Again
            </button>
            <button
              onClick={() => setScreen("manual")}
              className="flex-1 flex items-center justify-center gap-2 bg-gray-800 border border-gray-700 rounded-2xl py-3 text-xs font-semibold text-gray-300 active:bg-gray-700"
            >
              Enter Manually
            </button>
          </div>
        </div>
      </ModalShell>
    );
  }

  // ── MANUAL entry screen (fallback) ──
  const anyFilled = Object.values(manualFields).some(v => v.trim());
  return (
    <ModalShell title="Enter Manually" onClose={onClose}>
      <div className="space-y-3">
        <p className="text-xs text-gray-400">
          Fill in what you can read from the nameplate. All fields are optional.
        </p>
        {NAMEPLATE_FIELDS.map((f) => (
          <div key={f.key}>
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">
              {f.label}
            </label>
            <input
              value={manualFields[f.key] ?? ""}
              onChange={(e) => setManualFields(p => ({ ...p, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 border border-gray-700 text-sm placeholder-gray-600 focus:border-teal-600 outline-none"
            />
          </div>
        ))}
        <button
          onClick={() => onSave(manualFields, "manual")}
          className={`w-full font-bold py-4 rounded-2xl mt-1 ${anyFilled ? "bg-white text-gray-950" : "bg-gray-800 border border-gray-700 text-gray-500"}`}
        >
          {anyFilled ? "Save to Record" : "Skip Equipment ID"}
        </button>
      </div>
    </ModalShell>
  );
}

// ─── Alarm modal ───────────────────────────────────────────────────────────────

const COMMON_CODES = ["22", "31", "81", "82", "14", "33", "51", "63"];

function AlarmModal({ onClose, onSave }: { onClose: () => void; onSave: (code: string, desc: string) => void }) {
  const [code, setCode] = useState("");
  const [desc, setDesc] = useState("");
  return (
    <ModalShell title="Log Alarm Code" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider block mb-1.5">
            Fault Code
          </label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full bg-gray-800 text-white text-2xl font-bold rounded-2xl px-4 py-4 border border-gray-700 text-center font-mono"
            placeholder="00"
          />
        </div>
        <div className="grid grid-cols-4 gap-2">
          {COMMON_CODES.map((c) => (
            <button key={c} onClick={() => setCode(c)}
              className={`py-2 rounded-xl text-sm font-bold border ${c === code ? "border-white bg-gray-700 text-white" : "border-gray-700 text-gray-400"}`}>
              {c}
            </button>
          ))}
        </div>
        <div>
          <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider block mb-1.5">
            Description / Fault Meaning
          </label>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="e.g. High pressure lockout — head pressure exceeded 650 psi"
            rows={3}
            className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 border border-gray-700 text-sm placeholder-gray-600 focus:border-red-600 outline-none resize-none"
          />
        </div>
        <button
          onClick={() => { if (code.trim()) onSave(code.trim(), desc.trim()); }}
          disabled={!code.trim()}
          className="w-full bg-red-600 text-white font-bold py-4 rounded-2xl disabled:opacity-50"
        >
          Log Alarm
        </button>
      </div>
    </ModalShell>
  );
}

// ─── Photo modal ───────────────────────────────────────────────────────────────

const PHOTO_TYPES = [
  "Nameplate", "Failed Part", "Repair", "Wiring", "Measurement", "Overall Unit",
];

function compressImage(file: File, maxWidth = 1200, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("canvas")); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target!.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function PhotoModal({ onClose, onSave }: {
  onClose: () => void;
  onSave: (label: string, photoDataUrl: string | null, notes: string) => void;
}) {
  const [selected, setSelected] = useState("Repair");
  const [notes, setNotes] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCompressing(true);
    try {
      const dataUrl = await compressImage(file);
      setPreview(dataUrl);
    } catch {
      setPreview(null);
    } finally {
      setCompressing(false);
      e.target.value = "";
    }
  }

  return (
    <ModalShell title="Capture Photo" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2">
            Category
          </div>
          <div className="grid grid-cols-3 gap-2">
            {PHOTO_TYPES.map((p) => (
              <button key={p} onClick={() => setSelected(p)}
                className={`py-3 rounded-xl text-xs font-semibold border ${selected === p ? "border-white text-white bg-gray-700" : "border-gray-700 text-gray-400"}`}>
                {p}
              </button>
            ))}
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={handleFileChange}
        />

        {preview ? (
          <div className="relative rounded-2xl overflow-hidden">
            <img src={preview} alt="Captured" className="w-full max-h-56 object-cover rounded-2xl" />
            <button
              onClick={() => setPreview(null)}
              className="absolute top-2 right-2 bg-gray-900/80 text-white rounded-full p-1.5"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => inputRef.current?.click()}
            disabled={compressing}
            className="w-full bg-white text-gray-950 font-bold py-5 rounded-2xl flex items-center justify-center gap-2 text-lg disabled:opacity-60"
          >
            <Camera size={22} />
            {compressing ? "Processing…" : "Take Photo"}
          </button>
        )}

        {preview && (
          <button
            onClick={() => inputRef.current?.click()}
            className="w-full border border-gray-700 text-gray-400 font-semibold py-3 rounded-2xl flex items-center justify-center gap-2 text-sm"
          >
            <Camera size={16} /> Retake
          </button>
        )}

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          rows={2}
          className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-gray-500"
        />

        <button
          onClick={() => onSave(selected, preview, notes)}
          disabled={!preview}
          className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-40"
        >
          Save Photo
        </button>
      </div>
    </ModalShell>
  );
}

// ─── Part modal ── Parts Intelligence 2-step flow ──────────────────────────────

const VAN_MATCH_COLORS: Record<string, string> = {
  "in-stock":            "bg-green-950/40 border-green-700/40 text-green-400",
  "low-stock":           "bg-amber-950/40 border-amber-700/40 text-amber-400",
  "out-of-stock":        "bg-red-950/40 border-red-700/40 text-red-400",
  "possible-substitute": "bg-blue-950/40 border-blue-700/40 text-blue-400",
  "not-stocked":         "bg-gray-800 border-gray-700 text-gray-400",
  "verify-before-install": "bg-amber-950/40 border-amber-700/40 text-amber-400",
};
const VAN_MATCH_LABELS: Record<string, string> = {
  "in-stock":            "✓ In Van",
  "low-stock":           "⚠ Low Stock",
  "out-of-stock":        "✕ Out of Stock",
  "possible-substitute": "~ Possible Substitute",
  "not-stocked":         "— Not Stocked",
  "verify-before-install": "⚠ Verify Before Install",
};

function PartModal({ onClose, onSave }: {
  onClose: () => void;
  onSave: (name: string, detail: string, qty: number) => void;
}) {
  const [step, setStep]     = useState<"select" | "form" | "manual">("select");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [specs, setSpecs]   = useState<Record<string, string>>({});
  const [notes, setNotes]   = useState("");
  const [qty, setQty]       = useState(1);
  const [manualName, setManualName]     = useState("");
  const [manualSource, setManualSource] = useState("Van stock");

  const partDef  = selected ? PARTS_MASTER[selected] : null;
  const vanMatch = partDef ? matchVanInventory(partDef, INITIAL_INVENTORY) : null;
  const results  = searchParts(search);

  function selectType(type: string) {
    setSelected(type); setSpecs({}); setNotes(""); setQty(1); setStep("form");
  }

  function handleSave() {
    if (!partDef) return;
    const allFields = [...partDef.requiredSpecs, ...partDef.optionalSpecs];
    const specStr = Object.entries(specs)
      .map(([k, v]) => { const f = allFields.find((x) => x.key === k); return `${f?.label ?? k}: ${v}${f?.unit ? " " + f.unit : ""}`; })
      .join(" · ");
    const full = [specStr, notes].filter(Boolean).join(" — ");
    onSave(partDef.partType, full || "Part logged", qty);
  }

  function handleSaveManual() {
    if (!manualName.trim()) return;
    const full = [`Source: ${manualSource}`, notes].filter(Boolean).join(" — ");
    onSave(manualName.trim(), full, qty);
  }

  // Step 1: Select
  if (step === "select") {
    return (
      <ModalShell title="Log Part / Repair" onClose={onClose}>
        <div className="space-y-3">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search part type…" autoFocus
              className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500" />
          </div>
          <div className="space-y-1 max-h-64 overflow-y-auto pr-0.5">
            {results.slice(0, 22).map((type) => {
              const def = PARTS_MASTER[type];
              return (
                <button key={type} onClick={() => selectType(type)}
                  className="w-full flex items-center gap-3 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-left hover:border-orange-600/50 transition-colors">
                  <div className="w-7 h-7 bg-orange-900/40 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Wrench size={12} className="text-orange-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{type}</div>
                    <div className="text-[10px] text-gray-500">{def.category}</div>
                  </div>
                  <ChevronRight size={13} className="text-gray-600 flex-shrink-0" />
                </button>
              );
            })}
            {results.length === 0 && (
              <div className="text-sm text-gray-500 text-center py-6">No parts match "{search}"</div>
            )}
          </div>
          <button onClick={() => setStep("manual")}
            className="w-full py-3 text-sm text-gray-500 border border-gray-800 rounded-2xl hover:text-gray-400 transition-colors">
            + Manual Entry
          </button>
        </div>
      </ModalShell>
    );
  }

  // Step 2: Form
  if (step === "form" && partDef) {
    const criticalMissing = partDef.requiredSpecs.filter((s) => s.critical && !specs[s.key]?.trim());
    return (
      <ModalShell title={partDef.partType} onClose={onClose}>
        <div className="space-y-4">
          <button onClick={() => setStep("select")}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-400 transition-colors">
            <ArrowLeft size={11} /> Back to part types
          </button>
          {vanMatch && (
            <div className={`rounded-xl border px-3 py-2.5 ${VAN_MATCH_COLORS[vanMatch.status] ?? "bg-gray-800 border-gray-700 text-gray-400"}`}>
              <div className="text-[9px] font-bold uppercase tracking-wider mb-0.5 opacity-70">Van Stock</div>
              <div className="text-xs font-bold">{VAN_MATCH_LABELS[vanMatch.status] ?? vanMatch.status}</div>
            </div>
          )}
          {partDef.requiredSpecs.length > 0 && (
            <div className="space-y-2.5">
              <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Required Specs</div>
              {partDef.requiredSpecs.map((field) => (
                <div key={field.key}>
                  <label className="flex items-center gap-1 text-[10px] text-gray-400 mb-1">
                    {field.label}
                    {field.critical && <span className="text-red-400">*</span>}
                  </label>
                  {field.type === "select" ? (
                    <select value={specs[field.key] ?? ""} onChange={(e) => setSpecs((p) => ({ ...p, [field.key]: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500">
                      <option value="">Select…</option>
                      {field.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input type={field.type === "number" ? "number" : "text"} value={specs[field.key] ?? ""} onChange={(e) => setSpecs((p) => ({ ...p, [field.key]: e.target.value }))}
                      placeholder={field.placeholder ?? ""}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500" />
                  )}
                </div>
              ))}
            </div>
          )}
          <div>
            <label className="block text-[10px] text-gray-400 uppercase tracking-wider mb-1">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Replaced failed unit — confirmed from nameplate" rows={2}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 resize-none" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Quantity</span>
            <div className="flex items-center gap-3">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-white font-bold">−</button>
              <span className="text-white font-bold w-6 text-center">{qty}</span>
              <button onClick={() => setQty((q) => q + 1)} className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-white font-bold">+</button>
            </div>
          </div>
          {criticalMissing.length > 0 && (
            <div className="text-[10px] text-amber-400 bg-amber-950/20 border border-amber-800/30 rounded-xl px-3 py-2">
              Missing required specs: {criticalMissing.map((s) => s.label).join(", ")}. You can still save.
            </div>
          )}
          <button onClick={handleSave} className="w-full bg-orange-600 text-white font-bold py-4 rounded-2xl">
            Log Part / Repair
          </button>
        </div>
      </ModalShell>
    );
  }

  // Manual entry
  return (
    <ModalShell title="Manual Part Entry" onClose={onClose}>
      <div className="space-y-3">
        <button onClick={() => setStep("select")} className="flex items-center gap-1.5 text-xs text-gray-500">
          <ArrowLeft size={11} /> Back to part types
        </button>
        <div>
          <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Part Name <span className="text-red-400">*</span></label>
          <input value={manualName} onChange={(e) => setManualName(e.target.value)}
            placeholder="e.g. Belt 3VX450, 35/5 µF Dual Run Cap"
            className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 border border-gray-700 text-sm placeholder-gray-600" />
        </div>
        <div>
          <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Source</label>
          <select value={manualSource} onChange={(e) => setManualSource(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white">
            {["Van stock", "Shop stock", "Supply house", "Customer supplied", "Unknown"].map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Notes</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Replaced worn belt, confirmed from nameplate"
            className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 border border-gray-700 text-sm placeholder-gray-600" />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Quantity</span>
          <div className="flex items-center gap-3">
            <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-white font-bold">−</button>
            <span className="text-white font-bold w-6 text-center">{qty}</span>
            <button onClick={() => setQty((q) => q + 1)} className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-white font-bold">+</button>
          </div>
        </div>
        <button onClick={handleSaveManual} disabled={!manualName.trim()}
          className="w-full bg-orange-600 text-white font-bold py-4 rounded-2xl disabled:opacity-50">
          Save Part
        </button>
      </div>
    </ModalShell>
  );
}

// ─── Recommendations modal ─────────────────────────────────────────────────────

type RecPriority = "normal" | "high" | "safety" | "follow-up";
interface RecEntry { id: string; text: string; priority: RecPriority; selected: boolean }

const PRIORITY_CFG: Record<RecPriority, { label: string; activeCls: string }> = {
  normal:      { label: "Normal",   activeCls: "bg-gray-700 border-gray-500 text-gray-200" },
  high:        { label: "High",     activeCls: "bg-orange-900/60 border-orange-600 text-orange-300" },
  safety:      { label: "⚠ Safety", activeCls: "bg-red-900/60 border-red-600 text-red-300" },
  "follow-up": { label: "Follow-up",activeCls: "bg-blue-900/60 border-blue-600 text-blue-300" },
};

let _seq = 0;
function gid() { return `rec-${Date.now()}-${++_seq}`; }

function RecommendationsModal({ onClose, onSave }: { onClose: () => void; onSave: (recs: string[]) => void }) {
  const [entries, setEntries] = useState<RecEntry[]>([{ id: gid(), text: "", priority: "normal", selected: true }]);

  function toggle(id: string) { setEntries((p) => p.map((e) => e.id === id ? { ...e, selected: !e.selected } : e)); }
  function setPri(id: string, pri: RecPriority) { setEntries((p) => p.map((e) => e.id === id ? { ...e, priority: pri } : e)); }
  function setText(id: string, t: string) { setEntries((p) => p.map((e) => e.id === id ? { ...e, text: t } : e)); }
  function del(id: string) { setEntries((p) => p.filter((e) => e.id !== id)); }
  function addEntry() { setEntries((p) => [...p, { id: gid(), text: "", priority: "normal", selected: true }]); }

  function save() {
    const recs = entries.filter((e) => e.selected && e.text.trim()).map((e) => {
      let s = e.text.trim();
      if (e.priority === "high")      s = `[HIGH PRIORITY] ${s}`;
      if (e.priority === "safety")    s = `[⚠ SAFETY] ${s}`;
      if (e.priority === "follow-up") s = `[FOLLOW-UP] ${s}`;
      return s;
    });
    if (recs.length > 0) onSave(recs);
  }

  return (
    <ModalShell title="Recommendations" onClose={onClose}>
      <div className="space-y-2.5">
        <p className="text-xs text-gray-500">Add one or more recommendations for the customer or next tech.</p>
        {entries.map((entry) => (
          <div key={entry.id} className={`rounded-2xl border p-3.5 transition-colors ${entry.selected ? "bg-amber-950/20 border-amber-800/60" : "bg-gray-800/60 border-gray-700/50"}`}>
            <div className="flex items-start gap-2.5 mb-2">
              <button onClick={() => toggle(entry.id)}
                className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 border ${entry.selected ? "bg-amber-500 border-amber-500" : "border-gray-600 bg-gray-800"}`}>
                {entry.selected && <span className="text-[10px] font-bold text-white">✓</span>}
              </button>
              <textarea value={entry.text} onChange={(e) => setText(entry.id, e.target.value)}
                placeholder="Describe the recommendation…" rows={2} autoFocus={entries.length === 1}
                className="flex-1 bg-gray-900 text-white text-sm rounded-xl px-3 py-2 border border-gray-700 focus:border-amber-600 outline-none resize-none" />
              <button onClick={() => del(entry.id)} className="text-gray-600 hover:text-red-400 p-1">
                <X size={14} />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1.5 ml-7">
              {(Object.keys(PRIORITY_CFG) as RecPriority[]).map((p) => {
                const cfg = PRIORITY_CFG[p];
                const active = entry.priority === p;
                return (
                  <button key={p} onClick={() => setPri(entry.id, p)}
                    className={`py-1 rounded-lg text-[9px] font-bold border transition-colors ${active ? cfg.activeCls : "border-gray-700 bg-gray-800 text-gray-600"}`}>
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <button onClick={addEntry}
          className="w-full py-2.5 text-sm text-gray-500 border border-gray-800 rounded-2xl hover:text-gray-400 transition-colors">
          + Add Recommendation
        </button>
        <button onClick={save} disabled={!entries.some((e) => e.selected && e.text.trim())}
          className="w-full bg-amber-600 text-white font-bold py-4 rounded-2xl disabled:opacity-50">
          Save Recommendations
        </button>
      </div>
    </ModalShell>
  );
}

// ─── Customer summary modal ────────────────────────────────────────────────────

function CustomerSummaryModal({ job, events, onClose, onReviewed }: {
  job: LocalJob; events: LocalEvent[]; onClose: () => void; onReviewed: () => void;
}) {
  const parts = events.filter((e) => e.eventType === "part");
  const recs  = events.filter((e) => e.eventType === "recommendation");

  return (
    <ModalShell title="Customer Summary" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-xs text-gray-400">Plain-language summary to review with the customer or building contact.</p>
        <div className="bg-gray-800 rounded-2xl p-4 space-y-3">
          <div>
            <div className="text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-1">Equipment</div>
            <div className="text-sm font-semibold text-white">{job.unitLabel || "Equipment on site"}</div>
            <div className="text-xs text-gray-400">{job.customer} · {job.site}</div>
          </div>
          {parts.length > 0 && (
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-1">Work Performed</div>
              {parts.map((p, i) => <div key={i} className="text-sm text-white">• {p.title} {p.notes ? `— ${p.notes}` : ""}</div>)}
            </div>
          )}
          {recs.length > 0 && (
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-1">Recommendations</div>
              {recs.map((r, i) => <div key={i} className="text-sm text-gray-300">• {r.notes || r.title}</div>)}
            </div>
          )}
          {parts.length === 0 && recs.length === 0 && (
            <p className="text-sm text-gray-500">Add parts/repairs and recommendations to build the customer summary.</p>
          )}
        </div>
        <button onClick={onReviewed}
          className="w-full bg-white text-gray-950 font-bold py-4 rounded-2xl flex items-center justify-center gap-2">
          <CheckCircle size={18} /> Customer Review Complete
        </button>
      </div>
    </ModalShell>
  );
}
