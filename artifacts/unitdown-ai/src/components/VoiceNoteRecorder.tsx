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
 *   seeding the edit textarea.
 *
 * === AI Polish ===
 * The reviewing stage exposes an "AI Polish" button. When tapped, AIPolishPanel
 * renders in place of the normal edit UI. The technician always stays in control:
 *   • Keep Original — returns to edit textarea unchanged
 *   • Edit AI Version — pre-fills textarea with polished text
 *   • Save AI Version — saves immediately
 *
 * Phase-2 ready: onSave(entry) can be intercepted for additional processing.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Mic, MicOff, RotateCcw, Sparkles, X } from "lucide-react";
import { AIPolishPanel } from "./AIPolishPanel";

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
  isPro?: boolean;
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
  placeholder,
  isPro = false,
}: VoiceNoteRecorderProps) {
  const [stage,        setStage]        = useState<Stage>("idle");
  const [micStatus,    setMicStatus]    = useState<MicStatus>("listening");
  const [editText,     setEditText]     = useState("");
  const [error,        setError]        = useState<string | null>(null);
  const [polishOpen,   setPolishOpen]   = useState(false);

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

  // Shared save logic — accepts the text to save (original or AI-polished)
  const handleSaveText = (text: string) => {
    if (!text.trim()) return;
    onSave({ id: `vn-${Date.now()}`, text: text.trim(), savedAt: Date.now() });
    resetRefs();
    setStage("idle");
    setPolishOpen(false);
    setDisplayFinal("");
    setEditText("");
  };

  // ── start ──────────────────────────────────────────────────────────────────
  const startRecording = useCallback(() => {
    const SR = getSpeechRecognitionClass();
    if (!SR) return;

    resetRefs();
    setDisplayFinal("");
    setDisplayInterim("");
    setPolishOpen(false);
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
    setPolishOpen(false);
    setDisplayFinal("");
    setDisplayInterim("");
  }, []);

  // Seed edit textarea on entering review — run final cleanup
  useEffect(() => {
    if (stage === "reviewing") {
      const raw = finalSegmentsRef.current.join(" ");
      setEditText(cleanupTranscript(raw));
      setPolishOpen(false);
    }
  }, [stage]);

  // ── save original ──────────────────────────────────────────────────────────
  const handleSave = () => handleSaveText(editText);

  // ── discard ────────────────────────────────────────────────────────────────
  const handleDiscard = () => {
    resetRefs();
    setStage("idle");
    setPolishOpen(false);
    setDisplayFinal("");
    setEditText("");
    onDiscard?.();
  };

  // ── re-record ──────────────────────────────────────────────────────────────
  const handleReRecord = () => {
    resetRefs();
    setStage("idle");
    setPolishOpen(false);
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

  // AI Polish panel replaces the normal review UI when open
  if (polishOpen) {
    return (
      <AIPolishPanel
        originalText={editText}
        isPro={isPro}
        onKeepOriginal={() => setPolishOpen(false)}
        onEditPolished={(text) => { setEditText(text); setPolishOpen(false); }}
        onSavePolished={handleSaveText}
      />
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
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

      {/* Editable transcript */}
      <textarea
        value={editText}
        onChange={(e) => setEditText(e.target.value)}
        rows={5}
        placeholder={placeholder ?? "Transcribed note — edit before saving…"}
        autoFocus
        className="w-full text-sm text-slate-800 bg-white border border-slate-200 focus:border-blue-300 rounded-xl px-3 py-2.5 resize-none focus:outline-none leading-relaxed"
      />

      {/* AI Polish — secondary action */}
      {isPro ? (
        <button
          onClick={() => setPolishOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-violet-200 bg-violet-50 text-violet-700 text-sm font-bold active:bg-violet-100 transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          AI Polish
        </button>
      ) : (
        <button
          disabled
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 text-sm font-semibold cursor-not-allowed"
        >
          <Sparkles className="w-4 h-4" />
          AI Polish
          <span className="text-[10px] font-extrabold bg-slate-200 text-slate-500 rounded-full px-1.5 py-0.5 leading-none tracking-wide uppercase">Pro</span>
        </button>
      )}

      {/* Primary actions */}
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
