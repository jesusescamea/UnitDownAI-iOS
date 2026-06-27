/**
 * VoiceNoteModal — tap-to-record voice note that adds to the job timeline.
 *
 * Flow:
 * 1. Tap "Start Recording" → Web Speech API begins listening
 * 2. Technician speaks naturally
 * 3. Tap "Stop" → transcript captured
 * 4. Online: HVAC Voice Interpreter corrects terminology (TXV, superheat, etc.)
 *    Offline: raw transcript saved immediately with ai_pending flag
 * 5. Technician can edit before adding (online flow only)
 * 6. Tap "Add to Timeline" → optimistic add, modal closes
 *
 * AI fallback (offline):
 * - Skips the interpretation call entirely
 * - Saves voice note with metadata.ai_pending = true
 * - When connection returns, AI correction can be applied retrospectively
 * - Shows clear message: "No reception. Saved locally. Correction will apply when connection returns."
 */

import { useState, useRef, useCallback } from "react";
import {
  Mic, MicOff, Loader2, X, CheckCircle2, Wand2, AlertCircle, WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useJobMode } from "@/context/JobModeContext";

interface VoiceNoteModalProps {
  onClose: () => void;
}

type Phase = "idle" | "recording" | "interpreting" | "review" | "offline_saved";

// ─── Web Speech API types ──────────────────────────────────────────────────────

interface SpeechRecognitionEvent {
  results: {
    [index: number]: { [index: number]: { transcript: string } };
    length: number;
  };
}

interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: (e: SpeechRecognitionEvent) => void;
  onerror: (e: { error: string }) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

// ─── HVAC interpretation helper ───────────────────────────────────────────────

async function interpretTranscript(
  transcript: string,
): Promise<{ corrected: string; error?: string }> {
  try {
    const res = await fetch("/api/ai/voice/interpret", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript }),
    });
    if (!res.ok) throw new Error(`${res.status}`);
    const data = (await res.json()) as {
      professional?: string;
      correctedTranscript?: string;
    };
    return { corrected: data.professional ?? data.correctedTranscript ?? transcript };
  } catch {
    return { corrected: transcript, error: "Could not connect to HVAC interpreter" };
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VoiceNoteModal({ onClose }: VoiceNoteModalProps) {
  const { addEvent, isOnline } = useJobMode();
  const [phase, setPhase] = useState<Phase>("idle");
  const [rawTranscript, setRawTranscript] = useState("");
  const [corrected, setCorrected] = useState("");
  const [editedCorrected, setEditedCorrected] = useState("");
  const [interpError, setInterpError] = useState("");
  const [speechError, setSpeechError] = useState("");

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const accumulatedRef = useRef("");

  // ── Recording ──────────────────────────────────────────────────────────────

  const startRecording = useCallback(() => {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) {
      setSpeechError(
        "Voice recording is not supported in this browser. Use Chrome or Safari.",
      );
      return;
    }

    setSpeechError("");
    accumulatedRef.current = "";

    const rec = new SR();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (e: SpeechRecognitionEvent) => {
      let interim = "";
      let final = accumulatedRef.current;

      for (let i = 0; i < e.results.length; i++) {
        const result = e.results[i];
        if (!result) continue;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const isFinal = (result as any).isFinal as boolean;
        const text = result[0]?.transcript ?? "";
        if (isFinal) {
          final += (final ? " " : "") + text;
          accumulatedRef.current = final;
        } else {
          interim = text;
        }
      }

      setRawTranscript(final + (interim ? " " + interim : ""));
    };

    rec.onerror = (e) => {
      if (e.error !== "aborted") {
        setSpeechError(`Recording error: ${e.error}. Try again.`);
      }
      setPhase("idle");
    };

    rec.onend = () => {
      // handled by stopRecording
    };

    rec.start();
    recognitionRef.current = rec;
    setPhase("recording");
    setRawTranscript("");
  }, []);

  const stopRecording = useCallback(async () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;

    const transcript = accumulatedRef.current || rawTranscript;
    if (!transcript.trim()) {
      setPhase("idle");
      return;
    }

    // ── Offline path: save immediately without AI interpretation ─────────────
    if (!isOnline) {
      const title = transcript.slice(0, 80);
      addEvent({
        eventType: "voice_note",
        title: (title.charAt(0).toUpperCase() + title.slice(1)) || "Voice Note",
        voiceTranscript: transcript.trim(),
        voiceCorrected: undefined,
        metadata: {
          ai_pending: true,
          ai_task: "voice_interpret",
          ai_note: "HVAC terminology correction pending — no connection at time of recording",
        },
      });
      setPhase("offline_saved");
      return;
    }

    // ── Online path: run HVAC interpretation ─────────────────────────────────
    setPhase("interpreting");
    const { corrected: interp, error } = await interpretTranscript(transcript.trim());
    if (error) setInterpError(error);
    setCorrected(interp);
    setEditedCorrected(interp);
    setPhase("review");
  }, [rawTranscript, isOnline, addEvent]);

  // ── Confirm + add to timeline (online review phase) ────────────────────────

  const handleAdd = () => {
    const titleRaw = editedCorrected.slice(0, 80);
    const title = titleRaw.charAt(0).toUpperCase() + titleRaw.slice(1);

    addEvent({
      eventType: "voice_note",
      title: title || "Voice Note",
      voiceTranscript: rawTranscript,
      voiceCorrected: editedCorrected,
    });
    onClose();
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={phase === "recording" ? undefined : onClose}
      />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-white dark:bg-zinc-900 shadow-2xl safe-area-pb max-h-[85vh] flex flex-col">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
              <Mic className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Voice Note</h2>
              <p className="text-xs text-zinc-500">
                {isOnline
                  ? "Speak naturally — HVAC terms corrected automatically"
                  : "Offline — saved locally, correction runs when connection returns"}
              </p>
            </div>
          </div>
          <button
            onClick={phase !== "recording" ? onClose : undefined}
            className={`p-1.5 rounded-lg transition-colors ${
              phase === "recording"
                ? "text-zinc-300 cursor-not-allowed"
                : "text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Offline badge */}
        {!isOnline && phase !== "offline_saved" && (
          <div className="mx-5 mb-3 flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2 shrink-0">
            <WifiOff className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              No reception — HVAC correction will apply automatically when connection returns.
            </p>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 pb-6">
          {/* Error messages */}
          {speechError && (
            <div className="flex items-start gap-2.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 p-3 mb-4">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">{speechError}</p>
            </div>
          )}

          {/* ── Idle / recording phase ── */}
          {(phase === "idle" || phase === "recording") && (
            <div className="flex flex-col items-center py-6 gap-6">
              <button
                onClick={phase === "idle" ? startRecording : stopRecording}
                className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg ${
                  phase === "recording"
                    ? "bg-red-500 hover:bg-red-600 shadow-red-500/40 animate-pulse"
                    : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/40"
                }`}
              >
                {phase === "recording" ? (
                  <MicOff className="w-10 h-10 text-white" />
                ) : (
                  <Mic className="w-10 h-10 text-white" />
                )}
              </button>

              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 text-center">
                {phase === "recording" ? (
                  <span className="text-red-500">Recording — tap to stop</span>
                ) : (
                  "Tap to start recording"
                )}
              </p>

              {rawTranscript && (
                <div className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-800 p-4">
                  <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">
                    Live Transcript
                  </p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                    {rawTranscript}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Interpreting phase ── */}
          {phase === "interpreting" && (
            <div className="flex flex-col items-center py-10 gap-4">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
              <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center">
                Applying HVAC terminology correction…
              </p>
            </div>
          )}

          {/* ── Offline saved confirmation ── */}
          {phase === "offline_saved" && (
            <div className="flex flex-col items-center py-8 gap-5 text-center">
              <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                <WifiOff className="w-8 h-8 text-amber-500" />
              </div>
              <div>
                <p className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                  Saved locally
                </p>
                <p className="text-sm text-zinc-500 max-w-xs">
                  No reception. Voice note added to timeline.{" "}
                  HVAC correction will run automatically when connection returns.
                </p>
              </div>
              <Button className="h-11 px-8 bg-blue-600 hover:bg-blue-700 text-white" onClick={onClose}>
                Done
              </Button>
            </div>
          )}

          {/* ── Review phase (online) ── */}
          {phase === "review" && (
            <div className="space-y-4 pt-2">
              {interpError && (
                <div className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 rounded-lg p-3">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  {interpError} — original transcript used.
                </div>
              )}

              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Wand2 className="w-3.5 h-3.5 text-blue-500" />
                  <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                    HVAC Corrected — edit if needed
                  </p>
                </div>
                <Textarea
                  value={editedCorrected}
                  onChange={(e) => setEditedCorrected(e.target.value)}
                  rows={4}
                  className="text-sm resize-none"
                  placeholder="Corrected note…"
                />
              </div>

              {rawTranscript !== corrected && (
                <div>
                  <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-1.5">
                    Original
                  </p>
                  <p className="text-sm text-zinc-400 dark:text-zinc-500 italic leading-relaxed bg-zinc-50 dark:bg-zinc-800 rounded-xl p-3">
                    "{rawTranscript}"
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1 h-11"
                  onClick={() => {
                    setPhase("idle");
                    setRawTranscript("");
                    setCorrected("");
                    setEditedCorrected("");
                  }}
                >
                  Re-record
                </Button>
                <Button
                  className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={handleAdd}
                  disabled={!editedCorrected.trim()}
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  Add to Timeline
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
