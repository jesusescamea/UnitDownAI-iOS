/**
 * useStepVoice — Isolated voice recording for a single conversation step.
 *
 * Root-cause fix for duplicate/repeated transcripts:
 *  1. continuous=false  → browser stops automatically after the user's answer,
 *     preventing the engine from re-emitting old phrases in later events.
 *  2. Session ID per startListening() call → stale onresult/onend callbacks
 *     from a previous recording are silently discarded (handles StrictMode
 *     double-mount, rapid re-renders, and lingering async events).
 *  3. Guard against double-start (double-tap on mobile) by killing any live
 *     instance before spawning a new one.
 *
 * Usage pattern:
 *   const voice = useStepVoice();
 *   // Renders mic button → calls voice.start()
 *   // When status === 'done', voice.transcript has the answer
 *   // voice.reset() is called when step changes (key={step} on the parent)
 */

import { useState, useRef, useCallback, useEffect } from 'react';

export type VoiceStatus = 'idle' | 'listening' | 'done' | 'error' | 'unsupported';

export interface UseStepVoice {
  status:     VoiceStatus;
  transcript: string;   // Final text from the current recording session only
  interim:    string;   // Live in-progress text (cleared on session end)
  error:      string | null;
  start:      () => void;
  stop:       () => void;  // Manual early-stop (also sets status='done')
  reset:      () => void;  // Clear all state, ready for a new recording
  supported:  boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSpeechRec(): (new() => any) | null {
  if (typeof window === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useStepVoice(): UseStepVoice {
  const supported = !!getSpeechRec();

  const [status,     setStatus]     = useState<VoiceStatus>(supported ? 'idle' : 'unsupported');
  const [transcript, setTranscript] = useState('');
  const [interim,    setInterim]    = useState('');
  const [error,      setError]      = useState<string | null>(null);

  // One live SpeechRecognition instance at most.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef     = useRef<any>(null);
  // Session token: each start() gets a fresh value.
  // Any callback whose captured sessionId no longer matches is discarded.
  const sessionRef = useRef<string>('');

  const stop = useCallback(() => {
    // Invalidate FIRST so any async onresult/onend callbacks are discarded.
    sessionRef.current = '';
    const r = recRef.current;
    recRef.current = null;
    if (r) { try { r.stop(); } catch { /* ignore */ } }
    setInterim('');
    setStatus('done');
  }, []);

  const reset = useCallback(() => {
    sessionRef.current = '';
    const r = recRef.current;
    recRef.current = null;
    if (r) { try { r.stop(); } catch { /* ignore */ } }
    setTranscript('');
    setInterim('');
    setError(null);
    setStatus('idle');
  }, []);

  const start = useCallback(() => {
    const SpeechRec = getSpeechRec();
    if (!SpeechRec) { setStatus('unsupported'); return; }

    // Kill any existing session (prevents double-tap spawning two recognizers).
    if (recRef.current) {
      sessionRef.current = '';
      try { recRef.current.stop(); } catch { /* ignore */ }
      recRef.current = null;
    }

    const sessionId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    sessionRef.current = sessionId;

    setTranscript('');
    setInterim('');
    setError(null);
    setStatus('listening');

    const rec = new SpeechRec();

    // KEY FIX: continuous=false means the engine stops on its own after a
    // short silence following the user's answer.  One question → one answer.
    // No giant accumulating transcript that can double up on re-emitted events.
    rec.continuous     = false;
    rec.interimResults = true;
    rec.lang           = 'en-US';

    let latestFinal = '';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      if (sessionRef.current !== sessionId) return; // stale — discard

      let fin = '';
      let int = '';
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) fin += r[0]?.transcript ?? '';
        else           int  = r[0]?.transcript ?? '';
      }
      if (fin) { latestFinal = fin; setTranscript(fin); }
      setInterim(int);
    };

    rec.onerror = (e: { error: string }) => {
      if (sessionRef.current !== sessionId) return;
      sessionRef.current = '';
      recRef.current = null;
      setInterim('');

      if (e.error === 'not-allowed') {
        setError('Microphone access denied. Allow mic in your browser and try again.');
        setStatus('error');
      } else if (e.error === 'no-speech') {
        setError('No speech detected. Tap to try again.');
        setStatus('idle');
      } else if (e.error !== 'aborted') {
        setError('Recording stopped unexpectedly. Tap to try again.');
        setStatus('error');
      }
    };

    rec.onend = () => {
      if (sessionRef.current !== sessionId) return; // stale — discard
      sessionRef.current = '';
      recRef.current = null;
      setInterim('');
      // Keep transcript that arrived via onresult; latestFinal is a backup.
      setTranscript(t => t || latestFinal);
      setStatus('done');
    };

    recRef.current = rec;
    try {
      rec.start();
    } catch {
      sessionRef.current = '';
      recRef.current = null;
      setError('Could not start recording. Check microphone permissions.');
      setStatus('error');
    }
  }, []);

  // Cleanup on unmount — invalidates the session so no stale callbacks fire.
  useEffect(() => {
    return () => {
      sessionRef.current = '';
      if (recRef.current) {
        try { recRef.current.stop(); } catch { /* ignore */ }
        recRef.current = null;
      }
    };
  }, []);

  return { status, transcript, interim, error, start, stop, reset, supported };
}
