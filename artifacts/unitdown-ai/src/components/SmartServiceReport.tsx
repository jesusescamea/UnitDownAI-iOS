/**
 * SmartServiceReport — AI voice-to-structured-report for HVAC technicians.
 *
 * Recording state machine:
 *   idle → recording (tap mic)
 *     listening  — SR active
 *     paused     — user tapped Pause
 *     processing — SR ended naturally, restarting in 250ms
 *   recording → generating (tap Stop → auto-fires AI report call)
 *   generating → report     (AI call succeeds)
 *   generating → error      (AI call fails)
 *   recording  → idle       (tap Cancel)
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
  ArrowLeft,
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
  Pause,
  Play,
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
type RecordMode = "listening" | "paused" | "processing";

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

// ─── Overlap-aware segment merger (same logic as VoiceNoteRecorder) ───────────

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

// ─── Loading phase text ───────────────────────────────────────────────────────

const GENERATE_PHASES = [
  "Correcting HVAC speech recognition…",
  "Analyzing service actions…",
  "Building report sections…",
  "Extracting measurements & data…",
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
  if (lower.includes("pm") || lower.includes("filter") || lower.includes("belt") || lower.includes("lubrication") || lower.includes("drain") || lower.includes("cleaning")) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  if (lower.includes("replace") || lower.includes("repair") || lower.includes("compressor") || lower.includes("motor") || lower.includes("fan")) {
    return "bg-orange-50 text-orange-700 border-orange-200";
  }
  if (lower.includes("refrigerant")) {
    return "bg-blue-50 text-blue-700 border-blue-200";
  }
  if (lower.includes("electrical") || lower.includes("vfd") || lower.includes("thermostat") || lower.includes("control")) {
    return "bg-yellow-50 text-yellow-700 border-yellow-200";
  }
  if (lower.includes("combustion") || lower.includes("gas") || lower.includes("heat") || lower.includes("flame") || lower.includes("ignitor")) {
    return "bg-red-50 text-red-700 border-red-200";
  }
  return "bg-slate-100 text-slate-600 border-slate-200";
}

// ─── Structured data row helper ───────────────────────────────────────────────

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
  const [report,         setReport]         = useState<SmartReport | null>(null);
  const [generatePhase,  setGeneratePhase]  = useState(0);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [error,          setError]          = useState<string | null>(null);

  const finalSegmentsRef  = useRef<string[]>([]);
  const interimRef        = useRef<string>("");
  const recognitionRef    = useRef<AnySR>(null);
  const userStoppedRef    = useRef(false);
  const isPausedRef       = useRef(false);
  const isRestartingRef   = useRef(false);
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
      if (isPausedRef.current) {
        setRecordMode("paused");
        return;
      }
      if (!isRestartingRef.current) {
        isRestartingRef.current = true;
        setRecordMode("processing");
        setTimeout(() => {
          if (!userStoppedRef.current && !isPausedRef.current) {
            startRecognitionSession();
          } else {
            isRestartingRef.current = false;
          }
        }, 250);
      }
    };

    try {
      r.start();
    } catch {
      setError("Could not start microphone. Check browser permissions.");
      setStage("idle");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Recording controls ────────────────────────────────────────────────────────

  const startRecording = useCallback(() => {
    resetAccumulators();
    userStoppedRef.current  = false;
    isPausedRef.current     = false;
    isRestartingRef.current = false;
    setDisplayFinal("");
    setDisplayInterim("");
    setError(null);
    setReport(null);
    setRecordMode("listening");
    setStage("recording");
    startRecognitionSession();
  }, [startRecognitionSession]);

  const stopRecording = useCallback(() => {
    userStoppedRef.current  = true;
    isPausedRef.current     = false;
    isRestartingRef.current = false;
    setRecordMode("processing");
    recognitionRef.current?.stop();
  }, []);

  const pauseRecording = useCallback(() => {
    isPausedRef.current     = true;
    isRestartingRef.current = false;
    recognitionRef.current?.stop();
  }, []);

  const resumeRecording = useCallback(() => {
    isPausedRef.current     = false;
    isRestartingRef.current = false;
    setRecordMode("listening");
    startRecognitionSession();
  }, [startRecognitionSession]);

  const cancelRecording = useCallback(() => {
    userStoppedRef.current  = true;
    isPausedRef.current     = false;
    isRestartingRef.current = false;
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    resetAccumulators();
    setStage("idle");
    setDisplayFinal("");
    setDisplayInterim("");
  }, []);

  // ── Enter generating — auto-fire AI call ──────────────────────────────────────

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
        if (phaseTimerRef.current) { clearInterval(phaseTimerRef.current); phaseTimerRef.current = null; }
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
        if (phaseTimerRef.current) { clearInterval(phaseTimerRef.current); phaseTimerRef.current = null; }
        setStage("error");
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  useEffect(() => {
    return () => {
      if (phaseTimerRef.current) clearInterval(phaseTimerRef.current);
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
      <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200">
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
      <div className="flex flex-col items-center gap-4 py-6 px-4">
        {error && (
          <p className="text-xs text-red-500 text-center max-w-[260px] leading-snug">{error}</p>
        )}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
          <Mic className="w-8 h-8 text-white" />
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-slate-800 mb-1">Ready to Record</p>
          <p className="text-xs text-slate-400 leading-relaxed max-w-[240px]">
            Speak naturally about what you found and what you did.
            AI will build the full service report automatically.
          </p>
        </div>
        <button
          onClick={startRecording}
          className="w-full max-w-[280px] h-[52px] rounded-2xl bg-blue-600 active:bg-blue-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm shadow-blue-200 active:scale-[0.98] transition-all duration-150"
        >
          <Mic className="w-4.5 h-4.5" />
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
    const isListening  = recordMode === "listening";
    const isPaused     = recordMode === "paused";
    const isProcessing = recordMode === "processing";
    const hasText      = displayFinal.trim() || displayInterim.trim();

    const statusConfig = isPaused
      ? { dot: "bg-amber-400",              label: "Paused",       labelCls: "text-amber-600" }
      : isProcessing
      ? { dot: "bg-slate-400 animate-pulse", label: "Processing…", labelCls: "text-slate-500" }
      : { dot: "bg-red-500 animate-pulse",   label: "Listening…",  labelCls: "text-red-500"   };

    return (
      <div className="space-y-3 px-4 py-4">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusConfig.dot}`} />
          <span className={`text-sm font-bold ${statusConfig.labelCls}`}>{statusConfig.label}</span>
          {isListening && (
            <span className="text-xs text-slate-400 ml-0.5">· tap Stop when done</span>
          )}
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 min-h-[88px]">
          {hasText ? (
            <p className="text-sm text-slate-700 leading-relaxed">
              {displayFinal}
              {displayFinal && displayInterim ? " " : ""}
              <span className="text-slate-400 italic">{displayInterim}</span>
            </p>
          ) : (
            <p className="text-sm text-slate-400 italic">
              {isPaused ? "Recording paused — tap Resume to continue." : "Speak now…"}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {isPaused ? (
            <button
              onClick={resumeRecording}
              className="flex items-center justify-center gap-2 h-[52px] rounded-xl border-2 border-blue-500 bg-blue-50 text-blue-700 font-bold text-sm active:bg-blue-100 transition-colors"
            >
              <Play className="w-4.5 h-4.5" />
              Resume
            </button>
          ) : (
            <button
              onClick={pauseRecording}
              disabled={isProcessing}
              className="flex items-center justify-center gap-2 h-[52px] rounded-xl border-2 border-slate-300 bg-white text-slate-700 font-bold text-sm active:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <Pause className="w-4.5 h-4.5" />
              Pause
            </button>
          )}
          <button
            onClick={stopRecording}
            disabled={isProcessing && !hasText}
            className="flex items-center justify-center gap-2 h-[52px] rounded-xl bg-red-500 active:bg-red-600 text-white font-bold text-sm disabled:opacity-40 transition-colors shadow-sm shadow-red-200"
          >
            <Square className="w-4.5 h-4.5 fill-white" />
            Stop
          </button>
        </div>

        <button
          onClick={cancelRecording}
          className="w-full h-[40px] rounded-xl border border-slate-200 text-slate-400 font-semibold text-xs active:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // GENERATING
  // ─────────────────────────────────────────────────────────────────────────────

  if (stage === "generating") {
    return (
      <div className="flex flex-col items-center gap-5 py-10 px-4">
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="absolute inset-0 rounded-2xl bg-blue-50 animate-pulse" />
          <Loader2 className="w-7 h-7 text-blue-600 animate-spin relative z-10" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-bold text-slate-800">Generating Service Report</p>
          <p className="text-xs text-slate-400 transition-all duration-500">
            {GENERATE_PHASES[generatePhase]}
          </p>
        </div>
        <div className="flex gap-1.5">
          {GENERATE_PHASES.map((_, i) => (
            <span
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${
                i <= generatePhase ? "bg-blue-500" : "bg-slate-200"
              }`}
            />
          ))}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ERROR
  // ─────────────────────────────────────────────────────────────────────────────

  if (stage === "error") {
    return (
      <div className="flex flex-col items-center gap-4 py-8 px-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-red-500" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800 mb-1">Report Generation Failed</p>
          <p className="text-xs text-slate-400 leading-relaxed max-w-[240px]">
            AI service is temporarily unavailable. Try again or discard this recording.
          </p>
        </div>
        <div className="flex flex-col gap-2 w-full max-w-[280px]">
          <button
            onClick={handleReRecord}
            className="w-full h-[48px] rounded-xl bg-blue-600 active:bg-blue-700 text-white font-bold text-sm flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Try Again
          </button>
          <button
            onClick={onDiscard}
            className="w-full h-[40px] rounded-xl border border-slate-200 text-slate-400 font-semibold text-xs"
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
    const s    = report.sections;
    const d    = report.structured;
    const hasMeasurements = !!(d.suctionPressure || d.dischargePressure || d.voltage || d.amperage ||
      d.superheat || d.subcooling || d.deltaT || d.splitTemp || d.gasPressure);
    const hasRefrigerant  = !!(d.refrigerantType || d.refrigerantCharge || d.refrigerantRecovered || d.refrigerantAdded);
    const hasEquipInfo    = !!(d.modelNumber || d.serialNumber);
    const presentSections = SECTION_CONFIG.filter((sc) => !!s[sc.key]);

    return (
      <div className="flex flex-col">
        {/* ── Report header ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2.5 px-4 pt-4 pb-3 border-b border-slate-100">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
            <Mic className="w-4 h-4 text-white" />
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
            report.confidence >= 85
              ? "bg-green-50 text-green-700"
              : report.confidence >= 65
              ? "bg-amber-50 text-amber-700"
              : "bg-red-50 text-red-700"
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

        {/* ── Measurements grid ─────────────────────────────────────────────── */}
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
                    <MeasRow label="Suction"        value={d.suctionPressure}  />
                    <MeasRow label="Discharge"      value={d.dischargePressure}/>
                    <MeasRow label="Voltage"        value={d.voltage}          />
                    <MeasRow label="Amperage"       value={d.amperage}         />
                    <MeasRow label="Superheat"      value={d.superheat}        />
                    <MeasRow label="Subcooling"     value={d.subcooling}       />
                    <MeasRow label="Delta T"        value={d.deltaT}           />
                    <MeasRow label="Split Temp"     value={d.splitTemp}        />
                    <MeasRow label="Gas Pressure"   value={d.gasPressure}      />
                  </>
                )}
                {hasRefrigerant && (
                  <>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 mt-2">Refrigerant</p>
                    <MeasRow label="Type"      value={d.refrigerantType}     />
                    <MeasRow label="Charge"    value={d.refrigerantCharge}   />
                    <MeasRow label="Recovered" value={d.refrigerantRecovered}/>
                    <MeasRow label="Added"     value={d.refrigerantAdded}    />
                  </>
                )}
                {hasEquipInfo && (
                  <>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 mt-2">Equipment</p>
                    <MeasRow label="Model"  value={d.modelNumber} />
                    <MeasRow label="Serial" value={d.serialNumber}/>
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
        <div className="px-4 pb-4 pt-2 space-y-2 border-t border-slate-100 mt-1">
          <button
            onClick={handleSave}
            className="w-full h-[52px] rounded-2xl bg-blue-600 active:bg-blue-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm shadow-blue-200 active:scale-[0.98] transition-all duration-150"
          >
            <CheckCircle2 className="w-4.5 h-4.5" />
            Add to Service History
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleReRecord}
              className="h-[40px] rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs flex items-center justify-center gap-1.5 active:bg-slate-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Re-record
            </button>
            <button
              onClick={onDiscard}
              className="h-[40px] rounded-xl border border-slate-200 text-slate-400 font-semibold text-xs active:bg-slate-50"
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
