/**
 * VoiceNoteRecorder
 *
 * Production-quality voice note component for HVAC field technicians.
 * Uses the Web Speech API (no external dependency, no API key).
 *
 * Transcript architecture:
 *   - finalRef   — ref (not state) accumulates only isFinal results; never double-counted
 *   - interimRef — ref replaced (not appended) every onresult event
 *   - Display state is derived from refs, not accumulated from state
 *
 * This avoids the classic Web Speech bug where iterating from resultIndex 0
 * causes interim text to be appended on every pass ("come come back come back…").
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
  /** Called when the technician confirms a note. Text is already reviewed/edited. */
  onSave: (entry: VoiceNoteEntry) => void;
  /** Called when the technician explicitly discards a recording. */
  onDiscard?: () => void;
  /** Placeholder shown in the edit textarea. */
  placeholder?: string;
}

// ─── Browser support ──────────────────────────────────────────────────────────

// SpeechRecognition is not in TypeScript's default DOM lib — use `any`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySpeechRecognition = any;

function getSpeechRecognitionClass(): AnySpeechRecognition | null {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition ?? null;
}

// ─── Duplicate-word filter ────────────────────────────────────────────────────

/**
 * Removes consecutive duplicate words (case-insensitive).
 * "come come back and check" → "come back and check"
 * Does not de-duplicate non-adjacent repetitions ("check check in and check again")
 * because those may be intentional.
 */
function dedupeConsecutiveWords(text: string): string {
  const words = text.trim().split(/\s+/);
  const result: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const prev = result[result.length - 1];
    if (!prev || words[i].toLowerCase() !== prev.toLowerCase()) {
      result.push(words[i]);
    }
  }
  return result.join(" ");
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VoiceNoteRecorder({ onSave, onDiscard, placeholder }: VoiceNoteRecorderProps) {
  const [stage,     setStage]     = useState<Stage>("idle");
  const [micStatus, setMicStatus] = useState<MicStatus>("listening");
  const [editText,  setEditText]  = useState("");
  const [error,     setError]     = useState<string | null>(null);

  // ── Display-derived state (updated from refs, not accumulated from state) ──
  const [committed, setCommitted] = useState("");  // mirror of finalRef for display
  const [interim,   setInterim]   = useState("");  // mirror of interimRef for display

  // ── Refs — single source of truth for transcript accumulation ──────────────
  // Using refs (not state) so onresult callbacks always see the current value
  // without needing to list them as useCallback dependencies.
  const finalRef   = useRef("");  // only isFinal chunks — append-only
  const interimRef = useRef("");  // current interim — replaced each event
  const recognitionRef = useRef<AnySpeechRecognition>(null);

  const isSupported = !!getSpeechRecognitionClass();

  // ── start ──────────────────────────────────────────────────────────────────
  const startRecording = useCallback(() => {
    const SR = getSpeechRecognitionClass();
    if (!SR) return;

    // Reset accumulation refs
    finalRef.current   = "";
    interimRef.current = "";
    setCommitted("");
    setInterim("");
    setError(null);

    const r = new SR();
    recognitionRef.current = r;

    r.continuous      = true;
    r.interimResults  = true;
    r.lang            = "en-US";
    r.maxAlternatives = 1;

    r.onstart = () => {
      setMicStatus("listening");
    };

    // ── Core fix: iterate only from resultIndex, replace interim each event ──
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onresult = (event: any) => {
      // Reset interim for this event — it is a full replacement, not an append
      interimRef.current = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          // Append space-separated; let dedupeConsecutiveWords clean later
          finalRef.current += (finalRef.current ? " " : "") + result[0].transcript.trim();
        } else {
          interimRef.current += result[0].transcript;
        }
      }

      setCommitted(finalRef.current);
      setInterim(interimRef.current);
      setMicStatus("listening");
    };

    // onspeechend fires when the user pauses — recognition is analyzing
    r.onspeechend = () => {
      setMicStatus("processing");
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onerror = (event: any) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setError("Microphone access denied. Allow microphone access and try again.");
      } else if (event.error === "no-speech") {
        // Benign — user just didn't speak; stay recording
        setMicStatus("listening");
        return;
      } else if (event.error !== "aborted") {
        setError("Could not reach speech recognition. Check your connection and try again.");
      }
      setStage("idle");
    };

    r.onend = () => {
      // If recognition ended with only interim (final never arrived — rare but real),
      // promote the last interim to final so nothing is lost.
      if (!finalRef.current && interimRef.current.trim()) {
        finalRef.current = interimRef.current.trim();
        setCommitted(finalRef.current);
      }
      setInterim("");
      setMicStatus("listening"); // reset for next session
      setStage((prev) => (prev === "recording" ? "reviewing" : prev));
    };

    r.start();
    setStage("recording");
    setMicStatus("listening");
  }, []);

  // ── stop (moves to review) ─────────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    // onend handler completes the state transition
  }, []);

  // ── cancel (discard everything) ────────────────────────────────────────────
  const cancelRecording = useCallback(() => {
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    finalRef.current   = "";
    interimRef.current = "";
    setStage("idle");
    setCommitted("");
    setInterim("");
  }, []);

  // Seed editable textarea when entering review — apply dedup filter here
  useEffect(() => {
    if (stage === "reviewing") {
      setEditText(dedupeConsecutiveWords(committed.trim()));
    }
  }, [stage, committed]);

  // ── save confirmed note ────────────────────────────────────────────────────
  const handleSave = () => {
    const text = editText.trim();
    if (!text) return;
    onSave({ id: `vn-${Date.now()}`, text, savedAt: Date.now() });
    setStage("idle");
    setCommitted("");
    setEditText("");
    finalRef.current   = "";
    interimRef.current = "";
  };

  // ── discard ────────────────────────────────────────────────────────────────
  const handleDiscard = () => {
    setStage("idle");
    setCommitted("");
    setEditText("");
    finalRef.current   = "";
    interimRef.current = "";
    onDiscard?.();
  };

  // ── re-record ──────────────────────────────────────────────────────────────
  const handleReRecord = () => {
    setStage("idle");
    setCommitted("");
    setEditText("");
    finalRef.current   = "";
    interimRef.current = "";
    setTimeout(startRecording, 80);
  };

  // ── unsupported browser ────────────────────────────────────────────────────
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
    const hasText = committed.trim() || interim.trim();

    return (
      <div className="space-y-3">
        {/* Stop button */}
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

          {/* ── Status indicator ── */}
          <div className="flex items-center gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                isProcessing
                  ? "bg-amber-400 animate-pulse"
                  : "bg-red-500 animate-pulse"
              }`}
            />
            <p className={`text-[11px] font-bold tracking-wide ${
              isProcessing ? "text-amber-500" : "text-red-500"
            }`}>
              {isProcessing ? "Processing…" : "Listening…"}
            </p>
            <span className="text-[10px] text-slate-400">· tap to stop</span>
          </div>
        </div>

        {/* Live transcript */}
        {hasText ? (
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 min-h-[56px]">
            <p className="text-sm text-slate-700 leading-relaxed">
              {committed}
              {committed && interim ? " " : ""}
              <span className="text-slate-400 italic">{interim}</span>
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-center h-12">
            <p className="text-xs text-slate-400 italic">Speak now…</p>
          </div>
        )}

        <button
          onClick={cancelRecording}
          className="w-full text-xs text-slate-400 font-medium py-1"
        >
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
          <p className="text-[11px] font-bold text-emerald-600 tracking-wide uppercase">
            Ready to Save
          </p>
        </div>
        <button
          onClick={handleReRecord}
          className="flex items-center gap-1 text-xs text-blue-600 font-semibold active:opacity-60"
        >
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

      {/* Actions */}
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
