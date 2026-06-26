/**
 * VoiceNoteRecorder — HVAC Voice Intelligence 2.0
 *
 * === Manual control recording model ===
 *
 *   Stage machine:
 *     idle → recording (tap mic)
 *       recording / listening  — SR active
 *       recording / paused     — user tapped Pause; SR stopped
 *       recording / processing — SR ended naturally, restarting in 250ms
 *     recording → reviewing    (tap Stop only)
 *     recording → idle         (tap Cancel)
 *
 *   Reviewing sub-states:
 *     interpreting — auto-calls voice intelligence API the moment we enter; spinner
 *     ready        — 3-tab view: Professional | Original | Customer
 *                    confidence badge, uncertain phrases, memory extracts
 *     error        — save original / try again options
 *
 * === Voice Intelligence pipeline (backend) ===
 *
 *   1. HVAC terminology interpretation (fixes mishearings)
 *   2. Confidence scoring (0–100)
 *   3. Three documentation versions generated in one call
 *   4. Uncertain phrases flagged (< 85% confidence)
 *   5. Equipment memory data extracted
 *
 * === Per-user learning engine ===
 *
 *   User phrase overrides stored in localStorage under "unitdown_voice_corrections".
 *   Sent with every voice interpret call so the AI improves over time.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Mic,
  MicOff,
  Pause,
  Play,
  RotateCcw,
  Square,
} from "lucide-react";
import { voiceInterpret } from "@workspace/api-client-react";
import type { VoiceInterpretResult, VoiceUncertainPhrase } from "@workspace/api-client-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Stage       = "idle" | "recording" | "reviewing";
type RecordMode  = "listening" | "paused" | "processing";
type ReviewStage = "interpreting" | "ready" | "error";
type ActiveTab   = "professional" | "original" | "customer";

export interface VoiceNoteEntry {
  id:      string;
  text:    string;
  savedAt: number;
}

interface VoiceNoteRecorderProps {
  onSave:       (entry: VoiceNoteEntry) => void;
  onDiscard?:   () => void;
  placeholder?: string;
  isPro?:       boolean;
}

// ─── Learning engine (localStorage) ──────────────────────────────────────────

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

function saveCorrections(
  phraseChoices: Record<string, "accept" | "keep">,
  phrases:       VoiceUncertainPhrase[],
): void {
  if (!phrases.length) return;
  const stored = getStoredCorrections();
  for (const phrase of phrases) {
    const choice    = phraseChoices[phrase.original] ?? "accept";
    const preferred = choice === "keep" ? phrase.original : phrase.suggested;
    const existing  = stored.find((c) => c.original === phrase.original);
    if (existing) {
      existing.preferred = preferred;
      existing.count     = existing.count + 1;
    } else {
      stored.push({ original: phrase.original, preferred, count: 1 });
    }
  }
  try {
    localStorage.setItem(CORRECTIONS_KEY, JSON.stringify(stored));
  } catch {
    // Storage quota — fail silently
  }
}

// ─── Browser speech recognition ───────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySpeechRecognition = any;

function getSpeechRecognitionClass(): AnySpeechRecognition | null {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition ?? null;
}

// ─── Overlap-aware segment merger ─────────────────────────────────────────────

function buildNextSegments(segments: string[], newRaw: string): string[] {
  const newPhrase = newRaw.trim();
  if (!newPhrase) return segments;
  const prevJoined = segments.join(" ").trim();
  if (prevJoined && prevJoined.toLowerCase().includes(newPhrase.toLowerCase())) return segments;
  if (!prevJoined) return [newPhrase];

  const prevWords = prevJoined.split(/\s+/).filter(Boolean);
  const newWords  = newPhrase.split(/\s+/).filter(Boolean);
  let overlapLen  = 0;
  const maxCheck  = Math.min(prevWords.length, newWords.length - 1);
  for (let len = maxCheck; len >= 1; len--) {
    const prevSuffix = prevWords.slice(-len).map((w) => w.toLowerCase()).join(" ");
    const newPrefix  = newWords.slice(0, len).map((w) => w.toLowerCase()).join(" ");
    if (prevSuffix === newPrefix) { overlapLen = len; break; }
  }
  if (overlapLen > 0) {
    return [[...prevWords.slice(0, prevWords.length - overlapLen), ...newWords].join(" ")];
  }
  return [...segments, newPhrase];
}

function removeAdjacentNgramRepeats(words: string[], n: number): string[] {
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
  for (const n of [3, 2, 1]) words = removeAdjacentNgramRepeats(words, n);
  return words.join(" ");
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function applyPhraseChoices(
  text:         string,
  phrases:      VoiceUncertainPhrase[],
  choices:      Record<string, "accept" | "keep">,
): string {
  let result = text;
  for (const phrase of phrases) {
    if ((choices[phrase.original] ?? "accept") === "keep") {
      result = result.split(phrase.suggested).join(phrase.original);
    }
  }
  return result;
}

function hasMemoryContent(r: VoiceInterpretResult): boolean {
  const m = r.memoryExtracts;
  return (
    m.componentsReplaced.length > 0 ||
    m.repairsPerformed.length   > 0 ||
    !!m.refrigerantType          ||
    !!m.refrigerantAmount        ||
    !!m.followUp                 ||
    !!m.pmReminders              ||
    !!m.observedConditions       ||
    !!m.warrantyInfo
  );
}

const INTERPRET_PHASES: string[] = [
  "Analyzing HVAC context…",
  "Interpreting technical terms…",
  "Generating documentation…",
];

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS: Array<{ value: ActiveTab; label: string; proOnly: boolean }> = [
  { value: "professional", label: "Professional", proOnly: true  },
  { value: "original",     label: "Original",     proOnly: false },
  { value: "customer",     label: "Customer",     proOnly: true  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function VoiceNoteRecorder({
  onSave,
  onDiscard,
  isPro = false,
}: VoiceNoteRecorderProps) {
  const [stage,          setStage]          = useState<Stage>("idle");
  const [recordMode,     setRecordMode]     = useState<RecordMode>("listening");
  const [reviewStage,    setReviewStage]    = useState<ReviewStage>("interpreting");
  const [reviewText,     setReviewText]     = useState("");
  const [interpretResult, setInterpretResult] = useState<VoiceInterpretResult | null>(null);
  const [activeTab,      setActiveTab]      = useState<ActiveTab>("professional");
  const [phraseChoices,  setPhraseChoices]  = useState<Record<string, "accept" | "keep">>({});
  const [memoryExpanded, setMemoryExpanded] = useState(false);
  const [interpretPhase, setInterpretPhase] = useState(0);
  const [error,          setError]          = useState<string | null>(null);

  const [displayFinal,   setDisplayFinal]   = useState("");
  const [displayInterim, setDisplayInterim] = useState("");

  const finalSegmentsRef = useRef<string[]>([]);
  const interimRef       = useRef<string>("");
  const recognitionRef   = useRef<AnySpeechRecognition>(null);
  const userStoppedRef   = useRef(false);
  const isPausedRef      = useRef(false);
  const isRestartingRef  = useRef(false);
  const phaseTimersRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  const isSupported = !!getSpeechRecognitionClass();

  // ── Helpers ─────────────────────────────────────────────────────────────────

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

  // ── Core SR session ──────────────────────────────────────────────────────────

  const startRecognitionSession = useCallback(() => {
    const SR = getSpeechRecognitionClass();
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
        setStage("reviewing");
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

  // ── Recording controls ───────────────────────────────────────────────────────

  const startRecording = useCallback(() => {
    resetAccumulators();
    userStoppedRef.current  = false;
    isPausedRef.current     = false;
    isRestartingRef.current = false;
    setDisplayFinal("");
    setDisplayInterim("");
    setError(null);
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

  // ── Enter reviewing — seed text + auto-fire interpret ───────────────────────

  useEffect(() => {
    if (stage !== "reviewing") return;

    const raw = finalSegmentsRef.current.join(" ");
    const cleaned = cleanupTranscript(raw);
    setReviewText(cleaned);
    setReviewStage("interpreting");
    setActiveTab("professional");
    setPhraseChoices({});
    setInterpretResult(null);
    setMemoryExpanded(false);
    setInterpretPhase(0);

    // Cycle loading phase text
    phaseTimersRef.current = setInterval(() => {
      setInterpretPhase((p) => Math.min(p + 1, INTERPRET_PHASES.length - 1));
    }, 3000);

    const stored = getStoredCorrections();
    const corrections = stored.map((c) => ({
      original:  c.original,
      preferred: c.preferred,
      count:     c.count,
    }));

    voiceInterpret({ rawTranscript: cleaned, userCorrections: corrections })
      .then((result) => {
        if (phaseTimersRef.current) {
          clearInterval(phaseTimersRef.current);
          phaseTimersRef.current = null;
        }
        setInterpretResult(result);
        setReviewStage("ready");
      })
      .catch(() => {
        if (phaseTimersRef.current) {
          clearInterval(phaseTimersRef.current);
          phaseTimersRef.current = null;
        }
        setReviewStage("error");
      });
  }, [stage]);

  useEffect(() => {
    return () => {
      if (phaseTimersRef.current) clearInterval(phaseTimersRef.current);
    };
  }, []);

  // ── Actions ──────────────────────────────────────────────────────────────────

  function handleSave() {
    if (!interpretResult) return;
    const baseText = interpretResult[activeTab];
    const finalText = applyPhraseChoices(baseText, interpretResult.uncertainPhrases, phraseChoices);
    if (interpretResult.uncertainPhrases.length > 0) {
      saveCorrections(phraseChoices, interpretResult.uncertainPhrases);
    }
    persistEntry(finalText || reviewText);
  }

  function handleSaveOriginal() {
    persistEntry(reviewText);
  }

  function handleRetry() {
    setStage("idle");
    setTimeout(startRecording, 80);
  }

  function handleReRecord() {
    resetAccumulators();
    setStage("idle");
    setReviewText("");
    setInterpretResult(null);
    setTimeout(startRecording, 80);
  }

  function handleDiscard() {
    resetAccumulators();
    setStage("idle");
    setReviewText("");
    setInterpretResult(null);
    onDiscard?.();
  }

  function persistEntry(text: string) {
    if (!text.trim()) return;
    onSave({ id: `vn-${Date.now()}`, text: text.trim(), savedAt: Date.now() });
    resetAccumulators();
    setStage("idle");
    setReviewText("");
    setInterpretResult(null);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // UNSUPPORTED
  // ─────────────────────────────────────────────────────────────────────────

  if (!isSupported) {
    return (
      <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200">
        <MicOff className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        <p className="text-xs text-slate-500">Voice notes require Chrome, Edge, or Safari 14.1+.</p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // IDLE
  // ─────────────────────────────────────────────────────────────────────────

  if (stage === "idle") {
    return (
      <div className="flex flex-col items-center gap-2.5 py-2">
        {error && (
          <p className="text-xs text-red-500 text-center max-w-[260px] leading-snug">{error}</p>
        )}
        <button
          onClick={startRecording}
          className="w-[80px] h-[80px] rounded-full flex items-center justify-center bg-blue-600 active:bg-blue-700 text-white shadow-lg shadow-blue-200 active:scale-95 transition-all duration-150"
          aria-label="Start voice note"
        >
          <Mic className="w-9 h-9" />
        </button>
        <p className="text-[11px] text-slate-400 font-semibold tracking-wide uppercase">Tap to record</p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RECORDING
  // ─────────────────────────────────────────────────────────────────────────

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
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusConfig.dot}`} />
          <span className={`text-sm font-bold ${statusConfig.labelCls}`}>{statusConfig.label}</span>
          {isListening && (
            <span className="text-xs text-slate-400 ml-0.5">· tap Stop when done</span>
          )}
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 min-h-[72px]">
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
              className="flex items-center justify-center gap-2 h-[56px] rounded-xl border-2 border-blue-500 bg-blue-50 text-blue-700 font-bold text-base active:bg-blue-100 transition-colors"
            >
              <Play className="w-5 h-5" />
              Resume
            </button>
          ) : (
            <button
              onClick={pauseRecording}
              disabled={isProcessing}
              className="flex items-center justify-center gap-2 h-[56px] rounded-xl border-2 border-slate-300 bg-white text-slate-700 font-bold text-base active:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <Pause className="w-5 h-5" />
              Pause
            </button>
          )}
          <button
            onClick={stopRecording}
            disabled={isProcessing && !hasText}
            className="flex items-center justify-center gap-2 h-[56px] rounded-xl bg-red-500 active:bg-red-600 text-white font-bold text-base disabled:opacity-40 transition-colors shadow-sm shadow-red-200"
          >
            <Square className="w-5 h-5 fill-white" />
            Stop
          </button>
        </div>

        <button
          onClick={cancelRecording}
          className="w-full h-[48px] rounded-xl border border-slate-200 text-slate-500 font-semibold text-sm active:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // REVIEWING
  // ─────────────────────────────────────────────────────────────────────────

  // ── INTERPRETING ────────────────────────────────────────────────────────

  if (stage === "reviewing" && reviewStage === "interpreting") {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4 text-emerald-500" />
            <p className="text-sm font-bold text-slate-700">Recording Complete</p>
          </div>
          <button
            onClick={handleReRecord}
            className="flex items-center gap-1 text-xs text-blue-600 font-semibold active:opacity-60"
          >
            <RotateCcw className="w-3 h-3" />
            Re-record
          </button>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide mb-1">Transcript</p>
          <p className="text-sm text-slate-600 leading-relaxed">{reviewText}</p>
        </div>

        <div className="flex flex-col items-center gap-3 py-5">
          <div className="flex items-center gap-2.5">
            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
            <p className="text-sm font-semibold text-slate-600">
              {INTERPRET_PHASES[interpretPhase]}
            </p>
          </div>
          <p className="text-xs text-slate-400">HVAC Voice Intelligence running</p>
        </div>
      </div>
    );
  }

  // ── ERROR ────────────────────────────────────────────────────────────────

  if (stage === "reviewing" && reviewStage === "error") {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Mic className="w-4 h-4 text-emerald-500" />
          <p className="text-sm font-bold text-slate-700">Recording Complete</p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide mb-1">Transcript</p>
          <p className="text-sm text-slate-600 leading-relaxed">{reviewText}</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-3">
          <p className="text-sm font-semibold text-amber-800 mb-0.5">AI interpretation unavailable</p>
          <p className="text-xs text-amber-700">You can save the original transcript or try again.</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleSaveOriginal}
            className="flex items-center justify-center gap-2 h-[52px] rounded-xl bg-blue-600 active:bg-blue-700 text-white font-bold text-sm transition-colors"
          >
            Save Original
          </button>
          <button
            onClick={handleRetry}
            className="flex items-center justify-center gap-2 h-[52px] rounded-xl border-2 border-slate-300 bg-white text-slate-700 font-bold text-sm active:bg-slate-50 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Re-record
          </button>
        </div>

        <button
          onClick={handleDiscard}
          className="w-full h-[44px] rounded-xl border border-slate-200 text-slate-500 font-semibold text-sm active:bg-slate-50 transition-colors"
        >
          Discard
        </button>
      </div>
    );
  }

  // ── READY ────────────────────────────────────────────────────────────────

  if (stage === "reviewing" && reviewStage === "ready" && interpretResult) {
    const confidence     = interpretResult.confidence;
    const isHighConf     = confidence >= 85;
    const uncertainItems = interpretResult.uncertainPhrases;
    const showMemory     = hasMemoryContent(interpretResult);

    const currentText = applyPhraseChoices(
      interpretResult[activeTab],
      uncertainItems,
      phraseChoices,
    );

    const tabLabel = TABS.find((t) => t.value === activeTab)?.label ?? "Professional";

    return (
      <div className="space-y-3">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <p className="text-sm font-bold text-slate-700">Voice Analyzed</p>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${
                isHighConf
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {confidence}%
            </span>
          </div>
          <button
            onClick={handleReRecord}
            className="flex items-center gap-1 text-xs text-slate-500 font-semibold active:opacity-60"
          >
            <RotateCcw className="w-3 h-3" />
            Re-record
          </button>
        </div>

        {/* ── Uncertain phrase review (only when below 85%) ── */}
        {uncertainItems.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
            <div className="px-3 py-2 border-b border-amber-200">
              <p className="text-[10px] font-extrabold text-amber-700 uppercase tracking-wide">
                {uncertainItems.length === 1 ? "1 Interpretation to Review" : `${uncertainItems.length} Interpretations to Review`}
              </p>
            </div>
            <div className="divide-y divide-amber-100">
              {uncertainItems.map((phrase) => {
                const choice = phraseChoices[phrase.original] ?? "accept";
                return (
                  <div key={phrase.original} className="px-3 py-2.5">
                    <div className="flex items-start gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <span className="text-xs text-amber-600 line-through">{phrase.original}</span>
                        <span className="text-xs text-slate-400 mx-1.5">→</span>
                        <span className="text-xs font-semibold text-slate-700">{phrase.suggested}</span>
                        <span className="ml-1.5 text-[10px] text-amber-600">{phrase.confidence}%</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPhraseChoices((prev) => ({ ...prev, [phrase.original]: "accept" }))}
                        className={`flex-1 h-[32px] rounded-lg text-xs font-bold transition-colors ${
                          choice === "accept"
                            ? "bg-emerald-600 text-white"
                            : "border border-slate-200 bg-white text-slate-600 active:bg-slate-50"
                        }`}
                      >
                        ✓ Accept
                      </button>
                      <button
                        onClick={() => setPhraseChoices((prev) => ({ ...prev, [phrase.original]: "keep" }))}
                        className={`flex-1 h-[32px] rounded-lg text-xs font-bold transition-colors ${
                          choice === "keep"
                            ? "bg-slate-700 text-white"
                            : "border border-slate-200 bg-white text-slate-600 active:bg-slate-50"
                        }`}
                      >
                        Keep original
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Tab bar ── */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {TABS.map((tab) => {
            const locked = tab.proOnly && !isPro;
            return (
              <button
                key={tab.value}
                onClick={() => !locked && setActiveTab(tab.value)}
                className={`flex-1 h-[34px] rounded-lg text-xs font-bold transition-colors ${
                  activeTab === tab.value
                    ? "bg-white text-slate-800 shadow-sm"
                    : locked
                    ? "text-slate-400 cursor-not-allowed"
                    : "text-slate-500 active:bg-white/60"
                }`}
              >
                {tab.label}
                {locked && <span className="ml-0.5 text-[9px]">🔒</span>}
              </button>
            );
          })}
        </div>

        {/* ── Tab content ── */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 min-h-[96px]">
          {activeTab === "original" ? (
            <>
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide mb-1">Raw Transcript</p>
              <p className="text-sm text-slate-600 leading-relaxed">{interpretResult.original}</p>
            </>
          ) : (
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{currentText}</p>
          )}
        </div>

        {/* ── Equipment Memory extracts ── */}
        {showMemory && (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setMemoryExpanded((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 active:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">🔧 Equipment Memory Extracted</span>
              </div>
              {memoryExpanded
                ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              }
            </button>
            {memoryExpanded && (
              <div className="px-3 py-2.5 space-y-2 bg-white border-t border-slate-100">
                {interpretResult.memoryExtracts.componentsReplaced.length > 0 && (
                  <MemoryRow label="Components replaced" value={interpretResult.memoryExtracts.componentsReplaced.join(", ")} />
                )}
                {interpretResult.memoryExtracts.repairsPerformed.length > 0 && (
                  <MemoryRow label="Repairs performed" value={interpretResult.memoryExtracts.repairsPerformed.join(", ")} />
                )}
                {interpretResult.memoryExtracts.refrigerantType && (
                  <MemoryRow label="Refrigerant type" value={interpretResult.memoryExtracts.refrigerantType} />
                )}
                {interpretResult.memoryExtracts.refrigerantAmount && (
                  <MemoryRow label="Refrigerant amount" value={interpretResult.memoryExtracts.refrigerantAmount} />
                )}
                {interpretResult.memoryExtracts.followUp && (
                  <MemoryRow label="Follow-up needed" value={interpretResult.memoryExtracts.followUp} />
                )}
                {interpretResult.memoryExtracts.pmReminders && (
                  <MemoryRow label="PM reminders" value={interpretResult.memoryExtracts.pmReminders} />
                )}
                {interpretResult.memoryExtracts.observedConditions && (
                  <MemoryRow label="Conditions observed" value={interpretResult.memoryExtracts.observedConditions} />
                )}
                {interpretResult.memoryExtracts.warrantyInfo && (
                  <MemoryRow label="Warranty info" value={interpretResult.memoryExtracts.warrantyInfo} />
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Save ── */}
        <button
          onClick={handleSave}
          className="w-full h-[52px] rounded-xl bg-blue-600 active:bg-blue-700 text-white font-bold text-base transition-colors shadow-sm shadow-blue-200"
        >
          Save {tabLabel} Version
        </button>

        {/* ── Secondary actions ── */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleReRecord}
            className="flex items-center justify-center gap-2 h-[44px] rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm active:bg-slate-50 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Re-record
          </button>
          <button
            onClick={handleDiscard}
            className="h-[44px] rounded-xl border border-slate-200 text-slate-500 font-semibold text-sm active:bg-slate-50 transition-colors"
          >
            Discard
          </button>
        </div>

        {/* Back to original option */}
        {activeTab !== "original" && (
          <button
            onClick={handleSaveOriginal}
            className="w-full flex items-center justify-center gap-1 py-1.5 text-xs text-slate-400 font-semibold active:opacity-60"
          >
            <ArrowLeft className="w-3 h-3" />
            Save raw transcript instead
          </button>
        )}
      </div>
    );
  }

  return null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MemoryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide w-[110px] flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-xs text-slate-700 leading-snug">{value}</span>
    </div>
  );
}
