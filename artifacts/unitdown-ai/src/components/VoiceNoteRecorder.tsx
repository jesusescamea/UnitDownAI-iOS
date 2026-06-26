/**
 * VoiceNoteRecorder — segment-based transcript engine with AI Polish
 *
 * === Transcript architecture ===
 *
 * Two separate accumulation structures (both refs — never React state):
 *
 *   finalSegmentsRef: string[]
 *     Each confirmed isFinal result is merged into this list via buildNextSegments(),
 *     which detects and removes suffix/prefix overlaps before appending.
 *     This is the ONLY place final text is written.
 *
 *   interimRef: string
 *     The current in-progress phrase. Replaced entirely each onresult event.
 *     Never appended to finalSegmentsRef during live recording.
 *
 * Display formula: displayFinal + (displayInterim ? " " + displayInterim : "")
 *
 * On stop: interimRef is promoted → finalSegments exactly once (if not already captured).
 * On review: cleanupTranscript() removes adjacent n-gram repeats (n=1,2,3) before
 *   seeding the review text.
 *
 * === Reviewing flow ===
 * After stopping, the tech sees a choice screen with three options:
 *   📝 Original       — save exactly what was said
 *   ✨ Professional   — AI rewrites for service records
 *   👤 Customer       — AI rewrites for customer communication
 *
 * Tapping Save calls AI Polish (if needed) and saves the result.
 * Re-record is available at the top. Discard is a link at the bottom.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Mic, MicOff, RotateCcw } from "lucide-react";
import { aiPolish } from "@workspace/api-client-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Stage = "idle" | "recording" | "reviewing";
type MicStatus = "listening" | "processing";
type ReviewOption = "original" | "professional" | "customer";

export interface VoiceNoteEntry {
  id: string;
  text: string;
  savedAt: number;
}

interface VoiceNoteRecorderProps {
  onSave: (entry: VoiceNoteEntry) => void;
  onDiscard?: () => void;
  placeholder?: string;
  isPro?: boolean;
}

// ─── Review option config ─────────────────────────────────────────────────────

const REVIEW_OPTIONS: Array<{
  value: ReviewOption;
  emoji: string;
  label: string;
  sub: string;
  proOnly: boolean;
}> = [
  { value: "original",     emoji: "📝", label: "Original",     sub: "Exactly what I said",              proOnly: false },
  { value: "professional", emoji: "✨", label: "Professional", sub: "Perfect for service records",       proOnly: true  },
  { value: "customer",     emoji: "👤", label: "Customer",     sub: "Easy for customers to understand",  proOnly: true  },
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

/**
 * Merges `newPhrase` into `segments` by detecting suffix/prefix overlaps.
 *
 * Finds the longest suffix of the joined segments that is also a prefix of
 * the new phrase (case-insensitive). Replaces those overlapping words with
 * the full new phrase, flattening into a single coherent segment.
 *
 * Example:
 *   prev: "High head"  +  new: "High head pressure"
 *   → overlap=2 → "High head pressure"   (NOT "High head High head pressure")
 */
function buildNextSegments(segments: string[], newRaw: string): string[] {
  const newPhrase = newRaw.trim();
  if (!newPhrase) return segments;

  const prevJoined = segments.join(" ").trim();

  if (prevJoined && prevJoined.toLowerCase().includes(newPhrase.toLowerCase())) {
    return segments; // exact duplicate — skip
  }

  if (!prevJoined) {
    return [newPhrase];
  }

  const prevWords = prevJoined.split(/\s+/).filter(Boolean);
  const newWords  = newPhrase.split(/\s+/).filter(Boolean);

  let overlapLen = 0;
  const maxCheck = Math.min(prevWords.length, newWords.length - 1);
  for (let len = maxCheck; len >= 1; len--) {
    const prevSuffix = prevWords.slice(-len).map((w) => w.toLowerCase()).join(" ");
    const newPrefix  = newWords.slice(0, len).map((w) => w.toLowerCase()).join(" ");
    if (prevSuffix === newPrefix) {
      overlapLen = len;
      break;
    }
  }

  if (overlapLen > 0) {
    const merged = [
      ...prevWords.slice(0, prevWords.length - overlapLen),
      ...newWords,
    ].join(" ");
    return [merged];
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
    if (prev === curr) {
      result.splice(i, n);
    } else {
      i++;
    }
  }
  return result;
}

function cleanupTranscript(text: string): string {
  let words = text.trim().split(/\s+/).filter(Boolean);
  for (const n of [3, 2, 1]) {
    words = removeAdjacentNgramRepeats(words, n);
  }
  return words.join(" ");
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VoiceNoteRecorder({
  onSave,
  onDiscard,
  isPro = false,
}: VoiceNoteRecorderProps) {
  const [stage,          setStage]          = useState<Stage>("idle");
  const [micStatus,      setMicStatus]      = useState<MicStatus>("listening");
  const [reviewText,     setReviewText]     = useState("");   // cleaned final transcript
  const [selectedOption, setSelectedOption] = useState<ReviewOption>("original");
  const [isSaving,       setIsSaving]       = useState(false);
  const [error,          setError]          = useState<string | null>(null);

  // Display mirrors — React state derived from refs
  const [displayFinal,   setDisplayFinal]   = useState("");
  const [displayInterim, setDisplayInterim] = useState("");

  // Refs — single source of truth; never stale inside callbacks
  const finalSegmentsRef = useRef<string[]>([]);
  const interimRef       = useRef<string>("");
  const recognitionRef   = useRef<AnySpeechRecognition>(null);

  const isSupported = !!getSpeechRecognitionClass();

  // ── Helpers ────────────────────────────────────────────────────────────────

  function resetRefs() {
    finalSegmentsRef.current = [];
    interimRef.current       = "";
  }

  function syncDisplay() {
    setDisplayFinal(finalSegmentsRef.current.join(" "));
    setDisplayInterim(interimRef.current);
  }

  // ── start ──────────────────────────────────────────────────────────────────
  const startRecording = useCallback(() => {
    const SR = getSpeechRecognitionClass();
    if (!SR) return;

    resetRefs();
    setDisplayFinal("");
    setDisplayInterim("");
    setError(null);
    setSelectedOption("original");

    const r = new SR();
    recognitionRef.current = r;

    r.continuous      = true;
    r.interimResults  = true;
    r.lang            = "en-US";
    r.maxAlternatives = 1;

    r.onstart = () => setMicStatus("listening");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onresult = (event: any) => {
      interimRef.current = ""; // replace, never append

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript: string = result[0].transcript;

        if (result.isFinal) {
          finalSegmentsRef.current = buildNextSegments(finalSegmentsRef.current, transcript);
        } else {
          interimRef.current = transcript;
        }
      }

      syncDisplay();
      setMicStatus("listening");
    };

    r.onspeechend = () => setMicStatus("processing");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onerror = (event: any) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setError("Microphone access denied. Allow microphone access and try again.");
      } else if (event.error === "no-speech") {
        setMicStatus("listening");
        return;
      } else if (event.error !== "aborted") {
        setError("Could not reach speech recognition. Check your connection and try again.");
      }
      setStage("idle");
    };

    r.onend = () => {
      const pending = interimRef.current.trim();
      if (pending) {
        const joined = finalSegmentsRef.current.join(" ").toLowerCase();
        if (!joined.includes(pending.toLowerCase())) {
          finalSegmentsRef.current = buildNextSegments(finalSegmentsRef.current, pending);
        }
        interimRef.current = "";
      }

      setDisplayFinal(finalSegmentsRef.current.join(" "));
      setDisplayInterim("");
      setMicStatus("listening");
      setStage((prev) => (prev === "recording" ? "reviewing" : prev));
    };

    r.start();
    setStage("recording");
    setMicStatus("listening");
  }, []);

  // ── stop ───────────────────────────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  // ── cancel ─────────────────────────────────────────────────────────────────
  const cancelRecording = useCallback(() => {
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    resetRefs();
    setStage("idle");
    setDisplayFinal("");
    setDisplayInterim("");
  }, []);

  // Seed review text on entering review — run final cleanup
  useEffect(() => {
    if (stage === "reviewing") {
      const raw = finalSegmentsRef.current.join(" ");
      setReviewText(cleanupTranscript(raw));
      setSelectedOption("original");
      setIsSaving(false);
    }
  }, [stage]);

  // ── save ───────────────────────────────────────────────────────────────────
  const persistEntry = (text: string) => {
    if (!text.trim()) return;
    onSave({ id: `vn-${Date.now()}`, text: text.trim(), savedAt: Date.now() });
    resetRefs();
    setStage("idle");
    setReviewText("");
    setIsSaving(false);
  };

  const handleSave = async () => {
    if (isSaving) return;

    if (selectedOption === "original") {
      persistEntry(reviewText);
      return;
    }

    const mode = selectedOption === "professional" ? "professional" : "email-customer";
    setIsSaving(true);

    try {
      const result = await aiPolish({ text: reviewText, mode });
      persistEntry(result.polished);
    } catch {
      // Graceful fallback — save the original if AI is unavailable
      persistEntry(reviewText);
    }
  };

  // ── re-record ──────────────────────────────────────────────────────────────
  const handleReRecord = () => {
    resetRefs();
    setStage("idle");
    setReviewText("");
    setTimeout(startRecording, 80);
  };

  // ── discard ────────────────────────────────────────────────────────────────
  const handleDiscard = () => {
    resetRefs();
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
          <p className="text-xs text-red-500 text-center max-w-[240px] leading-snug">{error}</p>
        )}
        <button
          onClick={startRecording}
          className="w-[72px] h-[72px] rounded-full flex items-center justify-center bg-blue-600 active:bg-blue-700 text-white shadow-lg shadow-blue-200 active:scale-95 transition-all duration-150"
          aria-label="Start voice note"
        >
          <Mic className="w-8 h-8" />
        </button>
        <p className="text-[11px] text-slate-400 font-semibold tracking-wide">TAP TO DICTATE</p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RECORDING
  // ─────────────────────────────────────────────────────────────────────────
  if (stage === "recording") {
    const isProcessing = micStatus === "processing";
    const hasText = displayFinal.trim() || displayInterim.trim();

    return (
      <div className="space-y-3">
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={stopRecording}
            className="relative w-[72px] h-[72px] rounded-full bg-red-500 active:bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-200 active:scale-95 transition-all duration-150"
            aria-label="Stop recording"
          >
            {!isProcessing && (
              <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-40 pointer-events-none" />
            )}
            <Mic className="w-8 h-8 relative" />
          </button>

          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isProcessing ? "bg-amber-400 animate-pulse" : "bg-red-500 animate-pulse"}`} />
            <p className={`text-[11px] font-bold tracking-wide ${isProcessing ? "text-amber-500" : "text-red-500"}`}>
              {isProcessing ? "Processing…" : "Listening…"}
            </p>
            <span className="text-[10px] text-slate-400">· tap to stop</span>
          </div>
        </div>

        {hasText ? (
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 min-h-[56px]">
            <p className="text-sm text-slate-700 leading-relaxed">
              {displayFinal}
              {displayFinal && displayInterim ? " " : ""}
              <span className="text-slate-400 italic">{displayInterim}</span>
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-center h-12">
            <p className="text-xs text-slate-400 italic">Speak now…</p>
          </div>
        )}

        <button onClick={cancelRecording} className="w-full text-xs text-slate-400 font-medium py-1">
          Cancel
        </button>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // REVIEWING — choice screen
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

      {/* What would you like to save? */}
      <p className="text-xs font-semibold text-slate-500">What would you like to save?</p>

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

      {/* Save button */}
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
