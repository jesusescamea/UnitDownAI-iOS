/**
 * VoiceNoteRecorder — manual-control recording with auto-restart
 *
 * === Manual control model ===
 *
 * Recording only ends when the USER taps Stop (or Done). The browser's
 * SpeechRecognition fires `onend` on any silence/timeout, so we auto-restart
 * the recognition session whenever that happens mid-recording. The transcript
 * accumulates across all sessions into finalSegmentsRef.
 *
 *   Recording state machine:
 *     idle → recording (tap mic)
 *       recording / listening — mic active, SR running
 *       recording / paused   — user tapped Pause; SR stopped; no auto-restart
 *       recording / processing — SR heard speech end, restarting
 *     recording → reviewing  (tap Stop only)
 *     recording → idle       (tap Cancel)
 *     paused → recording/listening  (tap Resume)
 *     reviewing → idle       (save or discard)
 *
 * === Transcript architecture ===
 *
 * Two refs — never React state — are the single source of truth:
 *
 *   finalSegmentsRef: string[]
 *     Accumulated isFinal results merged via buildNextSegments() which detects
 *     suffix/prefix overlaps before appending. Survives SR session restarts.
 *
 *   interimRef: string
 *     Current in-progress phrase; replaced each onresult event; promoted to
 *     final on session end before the next session starts.
 *
 * === Reviewing flow ===
 *
 * After Stop: 3-card choice screen (Original / Professional / Customer).
 * Tapping Save calls AI Polish if needed, then saves the entry.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Mic, MicOff, Pause, Play, RotateCcw, Square } from "lucide-react";
import { aiPolish } from "@workspace/api-client-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Stage        = "idle" | "recording" | "reviewing";
type RecordMode   = "listening" | "paused" | "processing";
type ReviewOption = "original" | "professional" | "customer";

export interface VoiceNoteEntry {
  id: string;
  text: string;
  savedAt: number;
}

interface VoiceNoteRecorderProps {
  onSave:     (entry: VoiceNoteEntry) => void;
  onDiscard?: () => void;
  placeholder?: string;
  isPro?: boolean;
}

// ─── Review option config ─────────────────────────────────────────────────────

const REVIEW_OPTIONS: Array<{
  value:   ReviewOption;
  emoji:   string;
  label:   string;
  sub:     string;
  proOnly: boolean;
}> = [
  { value: "original",     emoji: "📝", label: "Original",     sub: "Exactly what I said",             proOnly: false },
  { value: "professional", emoji: "✨", label: "Professional", sub: "Perfect for service records",      proOnly: true  },
  { value: "customer",     emoji: "👤", label: "Customer",     sub: "Easy for customers to understand", proOnly: true  },
];

// ─── Browser support ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySpeechRecognition = any;

function getSpeechRecognitionClass(): AnySpeechRecognition | null {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition ?? null;
}

// ─── Overlap-aware segment merger ────────────────────────────────────────────

function buildNextSegments(segments: string[], newRaw: string): string[] {
  const newPhrase = newRaw.trim();
  if (!newPhrase) return segments;

  const prevJoined = segments.join(" ").trim();

  if (prevJoined && prevJoined.toLowerCase().includes(newPhrase.toLowerCase())) {
    return segments;
  }
  if (!prevJoined) return [newPhrase];

  const prevWords = prevJoined.split(/\s+/).filter(Boolean);
  const newWords  = newPhrase.split(/\s+/).filter(Boolean);

  let overlapLen = 0;
  const maxCheck = Math.min(prevWords.length, newWords.length - 1);
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

// ─── N-gram adjacent dedup ────────────────────────────────────────────────────

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

// ─── Component ────────────────────────────────────────────────────────────────

export function VoiceNoteRecorder({
  onSave,
  onDiscard,
  isPro = false,
}: VoiceNoteRecorderProps) {
  const [stage,          setStage]          = useState<Stage>("idle");
  const [recordMode,     setRecordMode]     = useState<RecordMode>("listening");
  const [reviewText,     setReviewText]     = useState("");
  const [selectedOption, setSelectedOption] = useState<ReviewOption>("original");
  const [isSaving,       setIsSaving]       = useState(false);
  const [error,          setError]          = useState<string | null>(null);

  // Display mirrors — derived from refs, updated imperatively
  const [displayFinal,   setDisplayFinal]   = useState("");
  const [displayInterim, setDisplayInterim] = useState("");

  // Refs — never stale inside callbacks
  const finalSegmentsRef = useRef<string[]>([]);
  const interimRef       = useRef<string>("");
  const recognitionRef   = useRef<AnySpeechRecognition>(null);

  // Manual-control gate refs
  const userStoppedRef   = useRef(false); // true after user taps Stop
  const isPausedRef      = useRef(false); // true while paused (no auto-restart)
  const isRestartingRef  = useRef(false); // debounce guard for onend auto-restart

  const isSupported = !!getSpeechRecognitionClass();

  // ── Helpers ────────────────────────────────────────────────────────────────

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

  // ── Core session starter (safe to call multiple times) ─────────────────────

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
      } else if (event.error === "aborted" || event.error === "no-speech") {
        // Expected during pause/stop/restart — ignore
      } else {
        // Network or unknown error — log but don't crash; onend will auto-restart
        setRecordMode("processing");
      }
    };

    r.onend = () => {
      // Promote any dangling interim before deciding what to do
      promotePendingInterim();

      if (userStoppedRef.current) {
        // ── User tapped Stop ──────────────────────────────────────────────
        setRecordMode("listening");
        setStage("reviewing");
        return;
      }

      if (isPausedRef.current) {
        // ── User tapped Pause ─────────────────────────────────────────────
        setRecordMode("paused");
        return;
      }

      // ── Browser ended recognition (silence / timeout / glitch) ───────────
      // Auto-restart to keep recording — this is the core of manual control.
      if (!isRestartingRef.current) {
        isRestartingRef.current = true;
        setRecordMode("processing");
        // Small delay lets the browser release the mic before re-acquiring it
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
      // start() can throw if the browser denies immediately
      setError("Could not start microphone. Check browser permissions.");
      setStage("idle");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Public actions ─────────────────────────────────────────────────────────

  const startRecording = useCallback(() => {
    resetAccumulators();
    userStoppedRef.current  = false;
    isPausedRef.current     = false;
    isRestartingRef.current = false;

    setDisplayFinal("");
    setDisplayInterim("");
    setError(null);
    setSelectedOption("original");
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
    // onend will fire → userStoppedRef.current === true → go to reviewing
  }, []);

  const pauseRecording = useCallback(() => {
    isPausedRef.current     = true;
    isRestartingRef.current = false;
    recognitionRef.current?.stop();
    // onend fires → isPausedRef.current === true → setRecordMode("paused")
  }, []);

  const resumeRecording = useCallback(() => {
    isPausedRef.current     = false;
    isRestartingRef.current = false;
    setRecordMode("listening");
    startRecognitionSession();
  }, [startRecognitionSession]);

  const cancelRecording = useCallback(() => {
    userStoppedRef.current  = true; // prevent auto-restart in onend
    isPausedRef.current     = false;
    isRestartingRef.current = false;
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    resetAccumulators();
    setStage("idle");
    setDisplayFinal("");
    setDisplayInterim("");
  }, []);

  // Seed review text when entering review stage
  useEffect(() => {
    if (stage === "reviewing") {
      const raw = finalSegmentsRef.current.join(" ");
      setReviewText(cleanupTranscript(raw));
      setSelectedOption("original");
      setIsSaving(false);
    }
  }, [stage]);

  // ── Save ───────────────────────────────────────────────────────────────────

  const persistEntry = (text: string) => {
    if (!text.trim()) return;
    onSave({ id: `vn-${Date.now()}`, text: text.trim(), savedAt: Date.now() });
    resetAccumulators();
    setStage("idle");
    setReviewText("");
    setIsSaving(false);
  };

  const handleSave = async () => {
    if (isSaving) return;
    if (selectedOption === "original") { persistEntry(reviewText); return; }

    const mode = selectedOption === "professional" ? "professional" : "email-customer";
    setIsSaving(true);
    try {
      const result = await aiPolish({ text: reviewText, mode });
      persistEntry(result.polished);
    } catch {
      persistEntry(reviewText); // graceful fallback — never lose the note
    }
  };

  const handleReRecord = () => {
    resetAccumulators();
    setStage("idle");
    setReviewText("");
    setTimeout(startRecording, 80);
  };

  const handleDiscard = () => {
    resetAccumulators();
    setStage("idle");
    setReviewText("");
    onDiscard?.();
  };

  // ─────────────────────────────────────────────────────────────────────────
  // UNSUPPORTED
  // ─────────────────────────────────────────────────────────────────────────
  if (!isSupported) {
    return (
      <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200">
        <MicOff className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        <p className="text-xs text-slate-500">
          Voice notes require Chrome, Edge, or Safari 14.1+.
        </p>
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
  // RECORDING (listening | paused | processing)
  // ─────────────────────────────────────────────────────────────────────────
  if (stage === "recording") {
    const isListening  = recordMode === "listening";
    const isPaused     = recordMode === "paused";
    const isProcessing = recordMode === "processing";
    const hasText      = displayFinal.trim() || displayInterim.trim();

    // Status indicator config
    const statusConfig = isPaused
      ? { dot: "bg-amber-400",              label: "Paused",      labelCls: "text-amber-600" }
      : isProcessing
      ? { dot: "bg-slate-400 animate-pulse", label: "Processing…", labelCls: "text-slate-500" }
      : { dot: "bg-red-500 animate-pulse",   label: "Listening…",  labelCls: "text-red-500"   };

    return (
      <div className="space-y-3">
        {/* Status bar */}
        <div className="flex items-center gap-2 px-1">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusConfig.dot}`} />
          <span className={`text-sm font-bold ${statusConfig.labelCls}`}>{statusConfig.label}</span>
          {isListening && (
            <span className="text-xs text-slate-400 ml-0.5">· tap Stop when done</span>
          )}
        </div>

        {/* Live transcript */}
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

        {/* Large glove-friendly controls */}
        <div className="grid grid-cols-2 gap-2">
          {/* Pause / Resume */}
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

          {/* Stop */}
          <button
            onClick={stopRecording}
            disabled={isProcessing && !hasText}
            className="flex items-center justify-center gap-2 h-[56px] rounded-xl bg-red-500 active:bg-red-600 text-white font-bold text-base disabled:opacity-40 transition-colors shadow-sm shadow-red-200"
          >
            <Square className="w-5 h-5 fill-white" />
            Stop
          </button>
        </div>

        {/* Cancel — full width, smaller */}
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
  // REVIEWING — 3-card choice screen
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mic className="w-4 h-4 text-emerald-500" />
          <p className="text-sm font-bold text-slate-700">Recording Complete</p>
        </div>
        <button
          disabled={isSaving}
          onClick={handleReRecord}
          className="flex items-center gap-1 text-xs text-blue-600 font-semibold active:opacity-60 disabled:opacity-30"
        >
          <RotateCcw className="w-3 h-3" />
          Re-record
        </button>
      </div>

      {/* Original transcript preview */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
        <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide mb-1">Original</p>
        <p className="text-sm text-slate-600 leading-relaxed line-clamp-5">{reviewText}</p>
      </div>

      {/* Choice label */}
      <p className="text-xs font-semibold text-slate-500">What would you like to save?</p>

      {/* Option cards */}
      <div className="space-y-2">
        {REVIEW_OPTIONS.map((opt) => {
          const locked = opt.proOnly && !isPro;
          const active = selectedOption === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => !locked && !isSaving && setSelectedOption(opt.value)}
              disabled={isSaving}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all duration-150 ${
                locked
                  ? "border-slate-200 bg-slate-50 opacity-60 cursor-default"
                  : active
                  ? "border-blue-500 bg-blue-50 shadow-sm"
                  : "border-slate-200 bg-white active:border-slate-300"
              }`}
            >
              <span className="text-xl leading-none flex-shrink-0">{opt.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className={`text-sm font-bold leading-tight ${active && !locked ? "text-blue-700" : "text-slate-700"}`}>
                    {opt.label}
                  </p>
                  {locked && (
                    <span className="text-[9px] font-extrabold bg-slate-200 text-slate-500 rounded-full px-1.5 py-0.5 leading-none uppercase tracking-wide">Pro</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{opt.sub}</p>
              </div>
              {active && !locked && (
                <div className="w-4 h-4 rounded-full bg-blue-500 flex-shrink-0 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full py-3.5 rounded-xl bg-blue-600 disabled:bg-blue-400 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors active:bg-blue-700"
      >
        {isSaving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {selectedOption === "professional" ? "Writing professional version…" : "Writing customer version…"}
          </>
        ) : (
          "Save"
        )}
      </button>

      {/* Discard */}
      <button
        disabled={isSaving}
        onClick={handleDiscard}
        className="w-full text-xs text-slate-400 font-medium py-1 text-center disabled:opacity-30"
      >
        Discard
      </button>
    </div>
  );
}
