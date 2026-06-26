/**
 * VoiceNoteRecorder
 *
 * Production-quality voice note component for HVAC field technicians.
 * Uses the Web Speech API (no external dependency, no API key).
 *
 * Design goals:
 *  - Large touch targets suitable for gloved hands
 *  - Bluetooth headset compatible (uses default audio input)
 *  - Three-stage flow: idle → recording → reviewing
 *  - Interim transcript preview so techs know they're being heard
 *  - Edit before save — transcript is never saved verbatim without review
 *  - Phase-2 ready: exposes onSave(text) so AI cleanup can be injected later
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Mic, MicOff, RotateCcw, X } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Stage = "idle" | "recording" | "reviewing";

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
  /** Placeholder text shown in the edit textarea. */
  placeholder?: string;
}

// ─── Browser support ──────────────────────────────────────────────────────────

// SpeechRecognition is not in TypeScript's default DOM lib in all versions,
// so we use `any` for the constructor and instance types throughout.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySpeechRecognition = any;

function getSpeechRecognitionClass(): AnySpeechRecognition | null {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition ?? null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VoiceNoteRecorder({ onSave, onDiscard, placeholder }: VoiceNoteRecorderProps) {
  const [stage,     setStage]     = useState<Stage>("idle");
  const [committed, setCommitted] = useState("");   // final transcript chunks
  const [interim,   setInterim]   = useState("");   // live interim (not yet final)
  const [editText,  setEditText]  = useState("");   // editable in review stage
  const [error,     setError]     = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<AnySpeechRecognition>(null);
  const isSupported = !!getSpeechRecognitionClass();

  // ── start ──────────────────────────────────────────────────────────────────
  const startRecording = useCallback(() => {
    const SR = getSpeechRecognitionClass();
    if (!SR) return;

    const r = new SR();
    recognitionRef.current = r;

    r.continuous      = true;
    r.interimResults  = true;
    r.lang            = "en-US";
    r.maxAlternatives = 1;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onresult = (event: any) => {
      let newFinal  = "";
      let newInterim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) newFinal   += res[0].transcript;
        else             newInterim += res[0].transcript;
      }
      if (newFinal) {
        setCommitted((prev) => (prev ? `${prev} ${newFinal.trim()}` : newFinal.trim()));
      }
      setInterim(newInterim);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onerror = (event: any) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setError("Microphone access denied. Allow microphone access and try again.");
      } else if (event.error !== "aborted" && event.error !== "no-speech") {
        setError("Could not reach speech recognition. Check your connection and try again.");
      }
      setStage("idle");
    };

    r.onend = () => {
      setInterim("");
      setStage((prev) => (prev === "recording" ? "reviewing" : prev));
    };

    setError(null);
    setCommitted("");
    setInterim("");
    r.start();
    setStage("recording");
  }, []);

  // ── stop (moves to review) ─────────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    // onend handler finishes the state transition
  }, []);

  // ── cancel (discard everything) ────────────────────────────────────────────
  const cancelRecording = useCallback(() => {
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    setStage("idle");
    setCommitted("");
    setInterim("");
  }, []);

  // Seed edit textarea when entering review stage
  useEffect(() => {
    if (stage === "reviewing") {
      setEditText(committed.trim());
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
  };

  // ── discard ────────────────────────────────────────────────────────────────
  const handleDiscard = () => {
    setStage("idle");
    setCommitted("");
    setEditText("");
    onDiscard?.();
  };

  // ── re-record ──────────────────────────────────────────────────────────────
  const handleReRecord = () => {
    setStage("idle");
    setCommitted("");
    setEditText("");
    // Small delay so UI resets before mic restarts
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
          className={`
            w-[72px] h-[72px] rounded-full flex items-center justify-center
            bg-blue-600 active:bg-blue-700 text-white shadow-lg shadow-blue-200
            active:scale-95 transition-all duration-150
          `}
          aria-label="Start voice note"
        >
          <Mic className="w-8 h-8" />
        </button>
        <p className="text-[11px] text-slate-400 font-semibold tracking-wide">
          TAP TO DICTATE
        </p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RECORDING
  // ─────────────────────────────────────────────────────────────────────────
  if (stage === "recording") {
    const hasText = committed.trim() || interim.trim();
    return (
      <div className="space-y-3">
        {/* Pulsing stop button */}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={stopRecording}
            className="relative w-[72px] h-[72px] rounded-full bg-red-500 active:bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-200 active:scale-95 transition-all duration-150"
            aria-label="Stop recording"
          >
            <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-40 pointer-events-none" />
            <Mic className="w-8 h-8 relative" />
          </button>
          <p className="text-[11px] text-red-500 font-bold tracking-wide animate-pulse">
            LISTENING — TAP TO STOP
          </p>
        </div>

        {/* Live transcript preview */}
        {hasText && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 min-h-[56px]">
            <p className="text-sm text-slate-700 leading-relaxed">
              {committed}
              {committed && interim ? " " : ""}
              <span className="text-slate-400 italic">{interim}</span>
            </p>
          </div>
        )}

        {!hasText && (
          <div className="flex items-center justify-center h-12">
            <p className="text-xs text-slate-400">Listening for your voice…</p>
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
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-extrabold text-slate-700 uppercase tracking-widest">
          Review &amp; Edit
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReRecord}
            className="flex items-center gap-1 text-xs text-blue-600 font-semibold active:opacity-60"
          >
            <RotateCcw className="w-3 h-3" />
            Re-record
          </button>
        </div>
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

      {/* Action row */}
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
