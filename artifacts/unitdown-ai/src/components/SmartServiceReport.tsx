/**
 * SmartServiceReport — AI voice-to-structured-report for HVAC technicians.
 *
 * Recording state machine:
 *   idle → recording (tap Start)
 *     listening  — SR active, waveform animated
 *     processing — SR ended naturally, restarting in 250ms (appears identical to listening)
 *   recording → interpreting (tap Stop → runs HVAC speech correction first)
 *   interpreting → generating  (interpreter complete → runs full report AI call)
 *   generating   → report      (AI call succeeds)
 *   generating   → error       (AI call fails)
 *   recording    → idle        (tap Cancel)
 *
 * On "Add to Service History" → calls onSave(SmartReport).
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Gauge,
  Loader2,
  Mic,
  MicOff,
  Package,
  RotateCcw,
  Shield,
  Square,
  Thermometer,
  Wrench,
  Zap,
} from "lucide-react";
import { voiceReport } from "@workspace/api-client-react";
import type { VoiceReportSections, VoiceReportStructured } from "@workspace/api-client-react";

// ─── Exported types ───────────────────────────────────────────────────────────

export interface SmartReport {
  id:                  string;
  createdAt:           number;
  correctedTranscript: string;
  sections:            VoiceReportSections;
  structured:          VoiceReportStructured;
  confidence:          number;
}

interface SmartServiceReportProps {
  onSave:    (report: SmartReport) => void;
  onDiscard: () => void;
}

// ─── Stage types ──────────────────────────────────────────────────────────────

type Stage      = "idle" | "recording" | "generating" | "report" | "error";
type RecordMode = "listening" | "processing";

// ─── localStorage learning (reuses same key as VoiceNoteRecorder) ─────────────

interface StoredCorrection {
  original:  string;
  preferred: string;
  count:     number;
}

const CORRECTIONS_KEY = "unitdown_voice_corrections";

function getStoredCorrections(): StoredCorrection[] {
  try {
    const raw = localStorage.getItem(CORRECTIONS_KEY);
    return raw ? (JSON.parse(raw) as StoredCorrection[]) : [];
  } catch {
    return [];
  }
}

// ─── Browser speech recognition ───────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySR = any;

function getSRClass(): AnySR | null {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition ?? null;
}

// ─── Overlap-aware segment merger ─────────────────────────────────────────────

function buildNextSegments(segments: string[], newRaw: string): string[] {
  const phrase = newRaw.trim();
  if (!phrase) return segments;
  const prev = segments.join(" ").trim();
  if (prev && prev.toLowerCase().includes(phrase.toLowerCase())) return segments;
  if (!prev) return [phrase];
  const pWords = prev.split(/\s+/).filter(Boolean);
  const nWords = phrase.split(/\s+/).filter(Boolean);
  let overlapLen = 0;
  const maxCheck = Math.min(pWords.length, nWords.length - 1);
  for (let len = maxCheck; len >= 1; len--) {
    const pSuffix = pWords.slice(-len).map((w) => w.toLowerCase()).join(" ");
    const nPrefix = nWords.slice(0, len).map((w) => w.toLowerCase()).join(" ");
    if (pSuffix === nPrefix) { overlapLen = len; break; }
  }
  if (overlapLen > 0) {
    return [[...pWords.slice(0, pWords.length - overlapLen), ...nWords].join(" ")];
  }
  return [...segments, phrase];
}

function removeAdjacentRepeats(words: string[], n: number): string[] {
  const result = [...words];
  let i = n;
  while (i <= result.length - n) {
    const prev = result.slice(i - n, i).map((w) => w.toLowerCase()).join(" ");
    const curr = result.slice(i, i + n).map((w) => w.toLowerCase()).join(" ");
    if (prev === curr) { result.splice(i, n); } else { i++; }
  }
  return result;
}

function cleanupTranscript(text: string): string {
  let words = text.trim().split(/\s+/).filter(Boolean);
  for (const n of [3, 2, 1]) words = removeAdjacentRepeats(words, n);
  return words.join(" ");
}

// ─── Elapsed time formatter ────────────────────────────────────────────────────

function formatElapsed(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ─── Transcript quality estimate ───────────────────────────────────────────────

function transcriptQuality(text: string): { label: string; color: string } {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) return { label: "Waiting…",         color: "text-slate-400" };
  if (words < 15)  return { label: "Keep speaking…",   color: "text-slate-400" };
  if (words < 40)  return { label: "Decent — keep going", color: "text-amber-500" };
  if (words < 80)  return { label: "Good recording",   color: "text-emerald-500" };
  return              { label: "Excellent recording", color: "text-emerald-600" };
}

// ─── Animated waveform ────────────────────────────────────────────────────────

const WAVE_SPEEDS  = [1.1, 0.8, 1.4, 0.9, 1.7, 0.6, 1.3, 1.0, 1.5, 0.7, 1.2, 0.85, 1.6];
const WAVE_PHASES  = [0, 0.8, 1.6, 0.4, 1.2, 2.0, 0.6, 1.4, 0.2, 1.0, 1.8, 0.3, 1.1];
const WAVE_MAX_H   = [14, 22, 10, 28, 18, 32, 14, 26, 10, 22, 30, 16, 24]; // px

function waveBarH(i: number, frame: number, active: boolean): number {
  if (!active) return 3;
  const t   = frame * 0.11;
  const raw = (Math.sin(t * WAVE_SPEEDS[i] + WAVE_PHASES[i]) + 1) / 2;
  return Math.max(3, raw * WAVE_MAX_H[i]);
}

function Waveform({ frame, active }: { frame: number; active: boolean }) {
  return (
    <div className="flex items-center justify-center gap-[3px] h-10">
      {WAVE_SPEEDS.map((_, i) => (
        <div
          key={i}
          className={`w-[3px] rounded-full transition-none ${active ? "bg-red-400" : "bg-slate-300"}`}
          style={{ height: `${waveBarH(i, frame, active)}px` }}
        />
      ))}
    </div>
  );
}

// ─── Loading phase config ──────────────────────────────────────────────────────

const GENERATE_PHASES: Array<{ icon: string; label: string }> = [
  { icon: "🔤", label: "Running HVAC Speech Interpreter…" },
  { icon: "📋", label: "Analyzing service actions…"       },
  { icon: "🏗️", label: "Building report sections…"        },
  { icon: "📊", label: "Extracting measurements & data…"  },
];

// ─── Section display config ───────────────────────────────────────────────────

const SECTION_CONFIG: Array<{
  key:    keyof VoiceReportSections;
  label:  string;
  Icon:   React.FC<{ className?: string }>;
  color:  string;
  iconBg: string;
}> = [
  { key: "problem",        label: "Problem",        Icon: AlertTriangle, color: "text-amber-700",  iconBg: "bg-amber-50"  },
  { key: "findings",       label: "Findings",       Icon: Activity,      color: "text-blue-700",   iconBg: "bg-blue-50"   },
  { key: "workPerformed",  label: "Work Performed", Icon: Wrench,        color: "text-orange-700", iconBg: "bg-orange-50" },
  { key: "partsReplaced",  label: "Parts Replaced", Icon: Package,       color: "text-slate-700",  iconBg: "bg-slate-100" },
  { key: "measurements",   label: "Measurements",   Icon: Gauge,         color: "text-violet-700", iconBg: "bg-violet-50" },
  { key: "verification",   label: "Verification",   Icon: CheckCircle2,  color: "text-green-700",  iconBg: "bg-green-50"  },
  { key: "recommendation", label: "Recommendation", Icon: ClipboardList, color: "text-blue-700",   iconBg: "bg-blue-50"   },
];

// ─── Work category color coding ───────────────────────────────────────────────

function workCategoryStyle(cat: string): string {
  const lower = cat.toLowerCase();
  if (lower.includes("pm") || lower.includes("filter") || lower.includes("belt") ||
      lower.includes("lubrication") || lower.includes("drain") || lower.includes("cleaning")) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  if (lower.includes("replace") || lower.includes("repair") ||
      lower.includes("compressor") || lower.includes("motor") || lower.includes("fan")) {
    return "bg-orange-50 text-orange-700 border-orange-200";
  }
  if (lower.includes("refrigerant")) {
    return "bg-blue-50 text-blue-700 border-blue-200";
  }
  if (lower.includes("electrical") || lower.includes("vfd") ||
      lower.includes("thermostat") || lower.includes("control")) {
    return "bg-yellow-50 text-yellow-700 border-yellow-200";
  }
  if (lower.includes("combustion") || lower.includes("gas") || lower.includes("heat") ||
      lower.includes("flame") || lower.includes("ignitor")) {
    return "bg-red-50 text-red-700 border-red-200";
  }
  return "bg-slate-100 text-slate-600 border-slate-200";
}

// ─── Structured data row ──────────────────────────────────────────────────────

function MeasRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-2 py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-[11px] font-semibold text-slate-500 flex-shrink-0">{label}</span>
      <span className="text-[11px] font-bold text-slate-800 text-right">{value}</span>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SmartServiceReport({ onSave, onDiscard }: SmartServiceReportProps) {
  const [stage,          setStage]          = useState<Stage>("idle");
  const [recordMode,     setRecordMode]     = useState<RecordMode>("listening");
  const [displayFinal,   setDisplayFinal]   = useState("");
  const [displayInterim, setDisplayInterim] = useState("");
  const [elapsedSec,     setElapsedSec]     = useState(0);
  const [animFrame,      setAnimFrame]      = useState(0);
  const [generatePhase,  setGeneratePhase]  = useState(0);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [report,         setReport]         = useState<SmartReport | null>(null);
  const [error,          setError]          = useState<string | null>(null);

  const finalSegmentsRef  = useRef<string[]>([]);
  const interimRef        = useRef<string>("");
  const recognitionRef    = useRef<AnySR>(null);
  const userStoppedRef    = useRef(false);
  const isRestartingRef   = useRef(false);

  const elapsedTimerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef      = useRef<number>(0);
  const animTimerRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseTimerRef     = useRef<ReturnType<typeof setInterval> | null>(null);

  const isSupported = !!getSRClass();

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function resetAccumulators() {
    finalSegmentsRef.current = [];
    interimRef.current       = "";
  }

  function promotePendingInterim() {
    const pending = interimRef.current.trim();
    if (!pending) return;
    const joined = finalSegmentsRef.current.join(" ").toLowerCase();
    if (!joined.includes(pending.toLowerCase())) {
      finalSegmentsRef.current = buildNextSegments(finalSegmentsRef.current, pending);
    }
    interimRef.current = "";
    setDisplayFinal(finalSegmentsRef.current.join(" "));
    setDisplayInterim("");
  }

  function stopElapsedTimer() {
    if (elapsedTimerRef.current) { clearInterval(elapsedTimerRef.current); elapsedTimerRef.current = null; }
  }

  function stopAnimTimer() {
    if (animTimerRef.current) { clearInterval(animTimerRef.current); animTimerRef.current = null; }
  }

  function stopPhaseTimer() {
    if (phaseTimerRef.current) { clearInterval(phaseTimerRef.current); phaseTimerRef.current = null; }
  }

  // ── SR session ────────────────────────────────────────────────────────────────

  const startRecognitionSession = useCallback(() => {
    const SR = getSRClass();
    if (!SR) return;
    const r = new SR();
    recognitionRef.current = r;
    r.continuous      = true;
    r.interimResults  = true;
    r.lang            = "en-US";
    r.maxAlternatives = 1;

    r.onstart = () => {
      isRestartingRef.current = false;
      setRecordMode("listening");
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onresult = (event: any) => {
      interimRef.current = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result     = event.results[i];
        const transcript = result[0].transcript as string;
        if (result.isFinal) {
          finalSegmentsRef.current = buildNextSegments(finalSegmentsRef.current, transcript);
        } else {
          interimRef.current = transcript;
        }
      }
      setDisplayFinal(finalSegmentsRef.current.join(" "));
      setDisplayInterim(interimRef.current);
      setRecordMode("listening");
    };

    r.onspeechend = () => setRecordMode("processing");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onerror = (event: any) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setError("Microphone access denied. Allow microphone access and try again.");
        stopElapsedTimer();
        stopAnimTimer();
        setStage("idle");
      } else if (event.error !== "aborted" && event.error !== "no-speech") {
        setRecordMode("processing");
      }
    };

    r.onend = () => {
      promotePendingInterim();
      if (userStoppedRef.current) {
        setRecordMode("listening");
        setStage("generating");
        return;
      }
      // Auto-restart on silence — waveform stays "processing" for ~250ms then resumes
      if (!isRestartingRef.current) {
        isRestartingRef.current = true;
        setRecordMode("processing");
        setTimeout(() => {
          if (!userStoppedRef.current) {
            startRecognitionSession();
          } else {
            isRestartingRef.current = false;
          }
        }, 200);
      }
    };

    try {
      r.start();
    } catch {
      setError("Could not start microphone. Check browser permissions.");
      stopElapsedTimer();
      stopAnimTimer();
      setStage("idle");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Recording controls ────────────────────────────────────────────────────────

  const startRecording = useCallback(() => {
    resetAccumulators();
    userStoppedRef.current  = false;
    isRestartingRef.current = false;
    setDisplayFinal("");
    setDisplayInterim("");
    setElapsedSec(0);
    setAnimFrame(0);
    setError(null);
    setReport(null);
    setRecordMode("listening");
    setStage("recording");

    // Start elapsed timer
    startTimeRef.current = Date.now();
    elapsedTimerRef.current = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    // Start waveform animation
    animTimerRef.current = setInterval(() => {
      setAnimFrame((f) => f + 1);
    }, 80);

    startRecognitionSession();
  }, [startRecognitionSession]);

  const stopRecording = useCallback(() => {
    userStoppedRef.current  = true;
    isRestartingRef.current = false;
    stopElapsedTimer();
    stopAnimTimer();
    recognitionRef.current?.stop();
  }, []);

  const cancelRecording = useCallback(() => {
    userStoppedRef.current  = true;
    isRestartingRef.current = false;
    stopElapsedTimer();
    stopAnimTimer();
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    resetAccumulators();
    setStage("idle");
    setDisplayFinal("");
    setDisplayInterim("");
    setElapsedSec(0);
  }, []);

  // ── Enter generating — show interpreter first, then fire AI call ──────────────

  useEffect(() => {
    if (stage !== "generating") return;

    const raw     = finalSegmentsRef.current.join(" ");
    const cleaned = cleanupTranscript(raw);

    setGeneratePhase(0);
    phaseTimerRef.current = setInterval(() => {
      setGeneratePhase((p) => Math.min(p + 1, GENERATE_PHASES.length - 1));
    }, 3500);

    const stored = getStoredCorrections();
    const corrections = stored.map((c) => ({
      original:  c.original,
      preferred: c.preferred,
      count:     c.count,
    }));

    voiceReport({ rawTranscript: cleaned, userCorrections: corrections })
      .then((result) => {
        stopPhaseTimer();
        setReport({
          id:                  `sr-${Date.now()}`,
          createdAt:           Date.now(),
          correctedTranscript: result.correctedTranscript,
          sections:            result.sections,
          structured:          result.structured,
          confidence:          result.confidence,
        });
        setStage("report");
      })
      .catch(() => {
        stopPhaseTimer();
        setStage("error");
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      stopElapsedTimer();
      stopAnimTimer();
      stopPhaseTimer();
    };
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────────

  function handleSave() {
    if (!report) return;
    onSave(report);
  }

  function handleReRecord() {
    resetAccumulators();
    setReport(null);
    setStage("idle");
    setTimeout(startRecording, 80);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // UNSUPPORTED
  // ─────────────────────────────────────────────────────────────────────────────

  if (!isSupported) {
    return (
      <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 m-4">
        <MicOff className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        <p className="text-xs text-slate-500">Voice recording requires Chrome, Edge, or Safari 14.1+.</p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // IDLE
  // ─────────────────────────────────────────────────────────────────────────────

  if (stage === "idle") {
    return (
      <div className="flex flex-col items-center gap-5 py-8 px-4">
        {error && (
          <p className="text-xs text-red-500 text-center max-w-[260px] leading-snug">{error}</p>
        )}

        {/* Mic icon */}
        <div className="w-20 h-20 rounded-[22px] bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-xl shadow-blue-200">
          <Mic className="w-10 h-10 text-white" />
        </div>

        <div className="text-center space-y-1.5 max-w-[260px]">
          <p className="text-base font-extrabold text-slate-900">Ready to Record</p>
          <p className="text-xs text-slate-400 leading-relaxed">
            Speak naturally about the service call. What you found, what you did, any readings or parts.
            AI does the rest.
          </p>
        </div>

        {/* Capabilities chips */}
        <div className="flex flex-wrap justify-center gap-1.5">
          {["HVAC Terms", "Measurements", "Parts", "Work Categories"].map((cap) => (
            <span key={cap} className="text-[10px] font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
              {cap}
            </span>
          ))}
        </div>

        <button
          onClick={startRecording}
          className="w-full max-w-[280px] h-[56px] rounded-2xl bg-blue-600 active:bg-blue-700 text-white font-extrabold text-sm flex items-center justify-center gap-2.5 shadow-md shadow-blue-200 active:scale-[0.97] transition-all duration-150"
        >
          <Mic className="w-5 h-5" />
          Start Recording
        </button>
        <button
          onClick={onDiscard}
          className="text-xs text-slate-400 font-semibold active:opacity-60"
        >
          Cancel
        </button>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RECORDING
  // ─────────────────────────────────────────────────────────────────────────────

  if (stage === "recording") {
    const isListening = recordMode === "listening";
    const hasText     = displayFinal.trim();
    const quality     = transcriptQuality(displayFinal + " " + displayInterim);

    return (
      <div className="flex flex-col gap-3 px-4 py-4">

        {/* Status bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
              isListening ? "bg-red-500 animate-pulse" : "bg-amber-400"
            }`} />
            <span className={`text-sm font-extrabold ${
              isListening ? "text-red-600" : "text-slate-500"
            }`}>
              {isListening ? "Recording…" : "Reconnecting…"}
            </span>
          </div>
          {/* Elapsed time */}
          <span className="text-sm font-bold text-slate-500 tabular-nums">
            {formatElapsed(elapsedSec)}
          </span>
        </div>

        {/* Animated waveform */}
        <div className="flex flex-col items-center gap-2 py-3 bg-slate-50 rounded-2xl border border-slate-200">
          <Waveform frame={animFrame} active={isListening} />
          {/* Quality indicator */}
          <p className={`text-[10px] font-bold ${quality.color}`}>
            {quality.label}
          </p>
        </div>

        {/* Rolling transcript */}
        <div className="min-h-[72px] max-h-[140px] overflow-y-auto bg-white rounded-xl border border-slate-200 px-3 py-2.5">
          {hasText ? (
            <p className="text-sm text-slate-700 leading-relaxed">
              {displayFinal}
              {displayFinal && displayInterim ? " " : ""}
              <span className="text-slate-400 italic">{displayInterim}</span>
            </p>
          ) : (
            <p className="text-sm text-slate-400 italic">
              Speak now — what did you find on this unit?
            </p>
          )}
        </div>

        {/* STOP button — large, full-width, prominent */}
        <button
          onClick={stopRecording}
          className="w-full h-[64px] rounded-2xl bg-red-500 active:bg-red-600 text-white font-extrabold text-base flex items-center justify-center gap-3 shadow-lg shadow-red-200 active:scale-[0.97] transition-all duration-150"
        >
          <Square className="w-6 h-6 fill-white" />
          Stop Recording
        </button>

        {/* Cancel — small, unobtrusive */}
        <button
          onClick={cancelRecording}
          className="text-center text-xs text-slate-400 font-semibold py-1 active:opacity-60"
        >
          Cancel
        </button>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // GENERATING (interpreter + report generation)
  // ─────────────────────────────────────────────────────────────────────────────

  if (stage === "generating") {
    const phase = GENERATE_PHASES[generatePhase];
    const isInterpreting = generatePhase === 0;

    return (
      <div className="flex flex-col items-center gap-6 py-10 px-4">

        {/* Animated icon area */}
        <div className="relative w-20 h-20 flex items-center justify-center">
          <div className="absolute inset-0 rounded-[22px] bg-blue-50 animate-pulse" />
          {isInterpreting ? (
            <span className="text-3xl relative z-10">🔤</span>
          ) : (
            <Loader2 className="w-9 h-9 text-blue-600 animate-spin relative z-10" />
          )}
        </div>

        {/* Phase label */}
        <div className="text-center space-y-1">
          <p className="text-sm font-extrabold text-slate-800">
            {isInterpreting ? "HVAC Speech Interpreter" : "Generating Service Report"}
          </p>
          <p className="text-xs text-slate-400 transition-all duration-500">
            {phase.icon} {phase.label}
          </p>
        </div>

        {/* Phase progress dots */}
        <div className="flex gap-2">
          {GENERATE_PHASES.map((_, i) => (
            <span
              key={i}
              className={`rounded-full transition-all duration-500 ${
                i === generatePhase
                  ? "w-4 h-2 bg-blue-500"
                  : i < generatePhase
                  ? "w-2 h-2 bg-blue-300"
                  : "w-2 h-2 bg-slate-200"
              }`}
            />
          ))}
        </div>

        {/* Sub-steps for interpreter phase */}
        {isInterpreting && (
          <div className="w-full max-w-[280px] space-y-2">
            {[
              "Correcting speech recognition errors",
              "Applying HVAC terminology",
              "Normalizing refrigerant references",
            ].map((step, i) => (
              <div key={step} className="flex items-center gap-2">
                <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 ${
                  i === 0 ? "bg-blue-100" : "bg-slate-100"
                }`}>
                  {i === 0 ? (
                    <Loader2 className="w-2.5 h-2.5 text-blue-500 animate-spin" />
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                  )}
                </div>
                <p className={`text-[11px] font-medium ${i === 0 ? "text-slate-700" : "text-slate-400"}`}>
                  {step}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ERROR
  // ─────────────────────────────────────────────────────────────────────────────

  if (stage === "error") {
    return (
      <div className="flex flex-col items-center gap-5 py-10 px-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-red-500" />
        </div>
        <div>
          <p className="text-sm font-extrabold text-slate-800 mb-1.5">Report Generation Failed</p>
          <p className="text-xs text-slate-400 leading-relaxed max-w-[240px]">
            AI service is temporarily unavailable. Try again or discard this recording.
          </p>
        </div>
        <div className="flex flex-col gap-2 w-full max-w-[280px]">
          <button
            onClick={handleReRecord}
            className="w-full h-[52px] rounded-2xl bg-blue-600 active:bg-blue-700 text-white font-bold text-sm flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Try Again
          </button>
          <button
            onClick={onDiscard}
            className="w-full h-[44px] rounded-xl border border-slate-200 text-slate-400 font-semibold text-xs"
          >
            Discard
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // REPORT
  // ─────────────────────────────────────────────────────────────────────────────

  if (stage === "report" && report) {
    const s = report.sections;
    const d = report.structured;
    const hasMeasurements = !!(d.suctionPressure || d.dischargePressure || d.voltage || d.amperage ||
      d.superheat || d.subcooling || d.deltaT || d.splitTemp || d.gasPressure);
    const hasRefrigerant  = !!(d.refrigerantType || d.refrigerantCharge || d.refrigerantRecovered || d.refrigerantAdded);
    const hasEquipInfo    = !!(d.modelNumber || d.serialNumber);
    const presentSections = SECTION_CONFIG.filter((sc) => !!s[sc.key]);

    return (
      <div className="flex flex-col">

        {/* ── Report header ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2.5 px-4 pt-4 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0">
            <Mic className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-extrabold text-slate-900 leading-tight">Service Report</p>
            <p className="text-[10px] text-slate-400 font-medium">
              {new Date(report.createdAt).toLocaleString("en-US", {
                month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
              })}
            </p>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
            report.confidence >= 85 ? "bg-green-50 text-green-700" :
            report.confidence >= 65 ? "bg-amber-50 text-amber-700" :
                                      "bg-red-50 text-red-700"
          }`}>
            {report.confidence}% confidence
          </span>
        </div>

        {/* ── Flags ─────────────────────────────────────────────────────────── */}
        {(d.safetyFlag || d.returnVisitRequired || d.warrantyMention) && (
          <div className="px-4 pt-3 space-y-1.5">
            {d.safetyFlag && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-200">
                <Shield className="w-3.5 h-3.5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs font-semibold text-red-700 leading-snug">{d.safetyFlag}</p>
              </div>
            )}
            {d.returnVisitRequired && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200">
                <CalendarDays className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                <p className="text-xs font-semibold text-amber-700">
                  Return visit required{d.followUpDate ? ` — ${d.followUpDate}` : ""}
                </p>
              </div>
            )}
            {d.warrantyMention && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-violet-50 border border-violet-200">
                <Zap className="w-3.5 h-3.5 text-violet-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs font-semibold text-violet-700 leading-snug">{d.warrantyMention}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Work categories ───────────────────────────────────────────────── */}
        {d.workCategories.length > 0 && (
          <div className="px-4 pt-3 flex flex-wrap gap-1.5">
            {d.workCategories.map((cat) => (
              <span
                key={cat}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${workCategoryStyle(cat)}`}
              >
                {cat}
              </span>
            ))}
          </div>
        )}

        {/* ── Report sections ───────────────────────────────────────────────── */}
        <div className="px-4 pt-3 space-y-3">
          {presentSections.map(({ key, label, Icon, color, iconBg }) => (
            <div key={key} className="bg-white rounded-xl border border-[#E6EDF8] overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-b border-slate-100">
                <div className={`w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                  <Icon className={`w-3 h-3 ${color}`} />
                </div>
                <p className={`text-[11px] font-extrabold uppercase tracking-wider ${color}`}>{label}</p>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed px-3 py-2.5">
                {s[key]}
              </p>
            </div>
          ))}
        </div>

        {/* ── Extracted data panel ──────────────────────────────────────────── */}
        {(hasMeasurements || hasRefrigerant || d.partsReplaced.length > 0 || hasEquipInfo) && (
          <div className="px-4 pt-3">
            <div className="bg-white rounded-xl border border-[#E6EDF8] overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-b border-slate-100">
                <div className="w-5 h-5 rounded-lg flex items-center justify-center bg-violet-50 flex-shrink-0">
                  <Thermometer className="w-3 h-3 text-violet-600" />
                </div>
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-violet-700">Extracted Data</p>
              </div>
              <div className="px-3 py-2">
                {hasMeasurements && (
                  <>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 mt-1">Readings</p>
                    <MeasRow label="Suction"      value={d.suctionPressure}   />
                    <MeasRow label="Discharge"    value={d.dischargePressure} />
                    <MeasRow label="Voltage"      value={d.voltage}           />
                    <MeasRow label="Amperage"     value={d.amperage}          />
                    <MeasRow label="Superheat"    value={d.superheat}         />
                    <MeasRow label="Subcooling"   value={d.subcooling}        />
                    <MeasRow label="Delta T"      value={d.deltaT}            />
                    <MeasRow label="Split Temp"   value={d.splitTemp}         />
                    <MeasRow label="Gas Pressure" value={d.gasPressure}       />
                  </>
                )}
                {hasRefrigerant && (
                  <>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 mt-2">Refrigerant</p>
                    <MeasRow label="Type"      value={d.refrigerantType}      />
                    <MeasRow label="Charge"    value={d.refrigerantCharge}    />
                    <MeasRow label="Recovered" value={d.refrigerantRecovered} />
                    <MeasRow label="Added"     value={d.refrigerantAdded}     />
                  </>
                )}
                {hasEquipInfo && (
                  <>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 mt-2">Equipment</p>
                    <MeasRow label="Model"  value={d.modelNumber}  />
                    <MeasRow label="Serial" value={d.serialNumber} />
                  </>
                )}
                {d.partsReplaced.length > 0 && (
                  <>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 mt-2">Parts Replaced</p>
                    <div className="flex flex-wrap gap-1.5 pb-1">
                      {d.partsReplaced.map((p) => (
                        <span
                          key={p}
                          className="text-[10px] font-semibold bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Corrected transcript (collapsible) ────────────────────────────── */}
        <div className="px-4 pt-2">
          <button
            onClick={() => setTranscriptOpen((o) => !o)}
            className="w-full flex items-center gap-2 py-2 text-xs text-slate-400 font-semibold active:opacity-60"
          >
            {transcriptOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {transcriptOpen ? "Hide" : "Show"} corrected transcript
          </button>
          {transcriptOpen && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 mb-2">
              <p className="text-[11px] text-slate-600 leading-relaxed whitespace-pre-wrap">
                {report.correctedTranscript}
              </p>
            </div>
          )}
        </div>

        {/* ── Actions ───────────────────────────────────────────────────────── */}
        <div className="px-4 pb-5 pt-2 space-y-2 border-t border-slate-100 mt-1">
          <button
            onClick={handleSave}
            className="w-full h-[56px] rounded-2xl bg-blue-600 active:bg-blue-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-200 active:scale-[0.97] transition-all duration-150"
          >
            <CheckCircle2 className="w-5 h-5" />
            Add to Service History
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleReRecord}
              className="h-[42px] rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs flex items-center justify-center gap-1.5 active:bg-slate-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Re-record
            </button>
            <button
              onClick={onDiscard}
              className="h-[42px] rounded-xl border border-slate-200 text-slate-400 font-semibold text-xs active:bg-slate-50"
            >
              Discard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
