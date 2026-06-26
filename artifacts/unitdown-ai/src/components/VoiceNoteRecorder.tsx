/**
 * VoiceNoteRecorder — segment-based transcript engine
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
 * Display formula (the only thing shown to the user):
 *   displayFinal + (displayInterim ? " " + displayInterim : "")
 *
 * On stop:
 *   If interimRef has content not already represented in the final segments,
 *   it is merged in via buildNextSegments() exactly once before review.
 *
 * On review:
 *   cleanupTranscript() removes any remaining adjacent repeated 1-, 2-, and
 *   3-word n-grams from the joined final text before seeding the edit textarea.
 *
 * === buildNextSegments (overlap remover) ===
 *
 *   Problem: The browser fires "High head" → "High head pressure" as successive
 *   final events. Naive append produces "High head High head pressure".
 *
 *   Solution: Find the longest suffix of the current joined text that is also a
 *   prefix of the new phrase (case-insensitive). Replace those overlapping words
 *   with the new (longer) phrase.
 *
 *   Example:
 *     prevJoined = "High head"
 *     newPhrase  = "High head pressure"
 *     overlap    = 2 words ("High head")
 *     result     = "High head pressure"   ← NOT "High head High head pressure"
 *
 * === cleanupTranscript (n-gram dedup) ===
 *
 *   Removes adjacent repeated sequences of 1, 2, and 3 words (in that order)
 *   using an in-place scan with splice. Runs once before the review textarea is
 *   seeded, as a final safety net.
 *
 *   Test cases:
 *     ["High head", "High head pressure", "High head pressure on RTU"]
 *       → "High head pressure on RTU"
 *
 *     ["Come back", "come back and check", "come back and check on unit Friday"]
 *       → "Come back and check on unit Friday"
 *
 * Phase-2 ready: onSave(entry) can be intercepted for AI cleanup before persisting.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Mic, MicOff, RotateCcw, X } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Stage = "idle" | "recording" | "reviewing";
type MicStatus = "listening" | "processing";

export interface VoiceNoteEntry {
  id: string;
  text: string;
  savedAt: number;
}

interface VoiceNoteRecorderProps {
  onSave: (entry: VoiceNoteEntry) => void;
  onDiscard?: () => void;
  placeholder?: string;
}

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
 * Steps:
 *  1. Skip if newPhrase is already contained in the joined segments (exact duplicate).
 *  2. Find the longest suffix of the joined text that matches a prefix of newPhrase
 *     (case-insensitive, word-boundary aligned).
 *  3. If overlap found: replace those trailing words with the full new phrase,
 *     returning a single flattened segment.
 *  4. If no overlap: append newPhrase as a new segment.
 */
function buildNextSegments(segments: string[], newRaw: string): string[] {
  const newPhrase = newRaw.trim();
  if (!newPhrase) return segments;

  const prevJoined = segments.join(" ").trim();

  // Skip exact duplicates (case-insensitive substring)
  if (prevJoined && prevJoined.toLowerCase().includes(newPhrase.toLowerCase())) {
    return segments;
  }

  if (!prevJoined) {
    return [newPhrase];
  }

  const prevWords = prevJoined.split(/\s+/).filter(Boolean);
  const newWords  = newPhrase.split(/\s+/).filter(Boolean);

  // Find longest suffix of prevWords that equals prefix of newWords
  // Only consider overlaps where newPhrase is strictly longer (progress forward)
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
    // Remove overlapping tail of prevWords, append all of newWords
    const merged = [
      ...prevWords.slice(0, prevWords.length - overlapLen),
      ...newWords,
    ].join(" ");
    return [merged]; // flatten into one coherent segment
  }

  return [...segments, newPhrase];
}

// ─── N-gram adjacent dedup ────────────────────────────────────────────────────

/**
 * Removes adjacent repeated sequences of `n` words in-place (case-insensitive).
 *
 * Example (n=2): "High head High head pressure" → "High head pressure"
 * Example (n=1): "come come back"               → "come back"
 */
function removeAdjacentNgramRepeats(words: string[], n: number): string[] {
  const result = [...words];
  let i = n;
  while (i <= result.length - n) {
    const prev = result.slice(i - n, i).map((w) => w.toLowerCase()).join(" ");
    const curr = result.slice(i, i + n).map((w) => w.toLowerCase()).join(" ");
    if (prev === curr) {
      result.splice(i, n); // remove the repeated block, re-check same index
    } else {
      i++;
    }
  }
  return result;
}

/**
 * Final cleanup applied before the review textarea is seeded.
 * Runs n-gram dedup for n = 3, 2, 1 (largest first to catch phrase-level repeats
 * before single-word repeats).
 */
function cleanupTranscript(text: string): string {
  let words = text.trim().split(/\s+/).filter(Boolean);
  for (const n of [3, 2, 1]) {
    words = removeAdjacentNgramRepeats(words, n);
  }
  return words.join(" ");
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VoiceNoteRecorder({ onSave, onDiscard, placeholder }: VoiceNoteRecorderProps) {
  const [stage,        setStage]        = useState<Stage>("idle");
  const [micStatus,    setMicStatus]    = useState<MicStatus>("listening");
  const [editText,     setEditText]     = useState("");
  const [error,        setError]        = useState<string | null>(null);

  // Display mirrors — React state derived from refs; updated inside event handlers
  const [displayFinal,   setDisplayFinal]   = useState(""); // finalSegmentsRef.join(" ")
  const [displayInterim, setDisplayInterim] = useState(""); // interimRef

  // ── Refs — single source of truth; never stale inside callbacks ─────────────
  const finalSegmentsRef = useRef<string[]>([]); // confirmed final segments only
  const interimRef       = useRef<string>("");   // current interim — replace, never append
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

    const r = new SR();
    recognitionRef.current = r;

    r.continuous      = true;
    r.interimResults  = true;
    r.lang            = "en-US";
    r.maxAlternatives = 1;

    r.onstart = () => setMicStatus("listening");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onresult = (event: any) => {
      // Reset interim — it is a full replacement, never appended
      interimRef.current = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript: string = result[0].transcript;

        if (result.isFinal) {
          // Merge into finalSegments with overlap detection — never touch interim
          finalSegmentsRef.current = buildNextSegments(finalSegmentsRef.current, transcript);
        } else {
          // Replace interimRef with the latest single interim phrase only
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
        return; // benign — keep recording
      } else if (event.error !== "aborted") {
        setError("Could not reach speech recognition. Check your connection and try again.");
      }
      setStage("idle");
    };

    r.onend = () => {
      // Promote interimRef → finalSegments if it exists and isn't already captured.
      // This handles short phrases that never received an isFinal event before stop().
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

  // Seed edit textarea on entering review — run final cleanup here
  useEffect(() => {
    if (stage === "reviewing") {
      const raw = finalSegmentsRef.current.join(" ");
      setEditText(cleanupTranscript(raw));
    }
  }, [stage]);

  // ── save ───────────────────────────────────────────────────────────────────
  const handleSave = () => {
    const text = editText.trim();
    if (!text) return;
    onSave({ id: `vn-${Date.now()}`, text, savedAt: Date.now() });
    resetRefs();
    setStage("idle");
    setDisplayFinal("");
    setEditText("");
  };

  // ── discard ────────────────────────────────────────────────────────────────
  const handleDiscard = () => {
    resetRefs();
    setStage("idle");
    setDisplayFinal("");
    setEditText("");
    onDiscard?.();
  };

  // ── re-record ──────────────────────────────────────────────────────────────
  const handleReRecord = () => {
    resetRefs();
    setStage("idle");
    setDisplayFinal("");
    setEditText("");
    setTimeout(startRecording, 80);
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
  // REVIEWING
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
          <p className="text-[11px] font-bold text-emerald-600 tracking-wide uppercase">Ready to Save</p>
        </div>
        <button onClick={handleReRecord} className="flex items-center gap-1 text-xs text-blue-600 font-semibold active:opacity-60">
          <RotateCcw className="w-3 h-3" />
          Re-record
        </button>
      </div>

      <textarea
        value={editText}
        onChange={(e) => setEditText(e.target.value)}
        rows={5}
        placeholder={placeholder ?? "Transcribed note — edit before saving…"}
        autoFocus
        className="w-full text-sm text-slate-800 bg-white border border-slate-200 focus:border-blue-300 rounded-xl px-3 py-2.5 resize-none focus:outline-none leading-relaxed"
      />

      <div className="flex gap-2">
        <button
          onClick={handleDiscard}
          className="flex items-center justify-center gap-1.5 flex-1 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-500 active:bg-slate-50 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          Discard
        </button>
        <button
          onClick={handleSave}
          disabled={!editText.trim()}
          className="flex items-center justify-center gap-1.5 flex-1 py-3 rounded-xl bg-blue-600 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-bold active:bg-blue-700 transition-colors"
        >
          <CheckCircle2 className="w-4 h-4" />
          Save Note
        </button>
      </div>
    </div>
  );
}
