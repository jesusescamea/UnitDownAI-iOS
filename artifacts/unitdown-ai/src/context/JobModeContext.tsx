/**
 * JobModeContext — the operating system for every HVAC service call.
 *
 * Architecture principles:
 * - localStorage is the primary store (instant, survives backgrounding)
 * - Backend API is the secondary store (persistent, synced in background)
 * - All event creation is optimistic — UI updates instantly
 * - Auto-save runs silently after every change (5s debounce to backend)
 * - Resume detection runs on every app mount
 *
 * Extension hooks (for future features):
 * - `event.metadata` jsonb: Smart Photos, AI enrichment, Equipment Memory diffs
 * - `event.measurements` jsonb: Phase 3 typed measurement schemas
 * - `event.parts` jsonb: Phase 3 Parts Assistant output
 * - `job.metadata` jsonb: AI Report, invoice summary, equipment memory updates
 */

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
  useCallback,
  useState,
  type ReactNode,
} from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type JobStatus = "active" | "paused" | "completed" | "cancelled";

export type EventType =
  | "dispatch"
  | "arrived"
  | "equipment_identified"
  | "alarm_review"
  | "voice_note"
  | "note"
  | "photo"
  | "measurement"
  | "part"
  | "recommendation"
  | "verification"
  | "service_report"
  | "completed";

export interface LocalJob {
  id: string;
  userId: string;
  unitId: string | null;
  customer: string | null;
  site: string | null;
  unitLabel: string | null;
  title: string | null;
  status: JobStatus;
  startedAt: number;
  updatedAt: number;
  completedAt: number | null;
  // Extension hook: future AI systems write keyed sub-objects here
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface LocalEvent {
  id: string;
  /** True once the event has been confirmed persisted to the backend. */
  _synced: boolean;
  jobId: string;
  userId: string;
  eventType: EventType;
  title: string;
  timestamp: number;
  notes: string | null;
  voiceTranscript: string | null;
  voiceCorrected: string | null;
  // Phase 2: object storage paths (not URLs); retrieve via signed URL
  photoUrls: string[] | null;
  // Phase 1: free-form key/value readings e.g. { "Suction Pressure": "72 psi" }
  // Phase 3: will be superseded by typed measurement schemas
  measurements: Record<string, string> | null;
  // Phase 3: Parts Assistant structured output
  parts: unknown;
  // Extension hook: AI enrichment, Smart Photos, Equipment Memory updates, etc.
  metadata: Record<string, unknown> | null;
  sequenceNum: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventInput {
  eventType: EventType;
  title: string;
  timestamp?: number;
  notes?: string;
  voiceTranscript?: string;
  voiceCorrected?: string;
  photoUrls?: string[];
  measurements?: Record<string, string>;
  parts?: unknown;
  metadata?: Record<string, unknown>;
}

export interface StartJobOptions {
  unitId?: string;
  customer?: string;
  site?: string;
  unitLabel?: string;
  title?: string;
}

export type SyncStatus = "idle" | "syncing" | "error";

export interface JobModeContextValue {
  // ── Current session ──────────────────────────────────────────────────────
  job: LocalJob | null;
  events: LocalEvent[];
  syncStatus: SyncStatus;
  hasPendingSync: boolean;
  /** Elapsed seconds since the job started (live counter). */
  elapsedSeconds: number;
  isLoaded: boolean;

  // ── Job lifecycle ─────────────────────────────────────────────────────────
  startJob: (opts?: StartJobOptions) => Promise<LocalJob>;
  resumeJob: (id: string) => Promise<void>;
  patchJob: (updates: Partial<LocalJob>) => void;
  completeJob: () => Promise<void>;
  clearJob: () => void;

  // ── Timeline events ───────────────────────────────────────────────────────
  addEvent: (input: CreateEventInput) => LocalEvent;
  updateEvent: (id: string, updates: Partial<LocalEvent>) => void;
  removeEvent: (id: string) => void;

  // ── Resume detection ──────────────────────────────────────────────────────
  /** IDs of active jobs found in localStorage (for resume banner). */
  pendingJobIds: string[];
  loadPendingJobs: () => LocalJob[];
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

const LS_ACTIVE_KEY = "unitdown_active_job_id";
const jobKey = (id: string) => `unitdown_job_${id}`;

interface JobSnapshot {
  job: LocalJob;
  events: LocalEvent[];
  savedAt: number;
}

function writeSnapshot(job: LocalJob, events: LocalEvent[]): void {
  try {
    const snap: JobSnapshot = { job, events, savedAt: Date.now() };
    localStorage.setItem(jobKey(job.id), JSON.stringify(snap));
    if (job.status === "active" || job.status === "paused") {
      localStorage.setItem(LS_ACTIVE_KEY, job.id);
    } else {
      localStorage.removeItem(LS_ACTIVE_KEY);
    }
  } catch {
    // Storage full — silently ignore; server sync is the backup
  }
}

function readSnapshot(id: string): JobSnapshot | null {
  try {
    const raw = localStorage.getItem(jobKey(id));
    if (!raw) return null;
    return JSON.parse(raw) as JobSnapshot;
  } catch {
    return null;
  }
}

function clearSnapshot(id: string): void {
  try {
    localStorage.removeItem(jobKey(id));
    const activeId = localStorage.getItem(LS_ACTIVE_KEY);
    if (activeId === id) localStorage.removeItem(LS_ACTIVE_KEY);
  } catch {
    // ignore
  }
}

function getActiveJobId(): string | null {
  return localStorage.getItem(LS_ACTIVE_KEY);
}

// Find all locally-saved jobs (active + paused ones that didn't get cleared)
function getAllPendingJobIds(): string[] {
  const ids: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("unitdown_job_")) {
      ids.push(key.replace("unitdown_job_", ""));
    }
  }
  return ids;
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...opts?.headers },
  });
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── ID generator ─────────────────────────────────────────────────────────────

let _seq = 0;
function tempId(): string {
  return `tmp_${Date.now()}_${++_seq}`;
}

// ─── State + reducer ──────────────────────────────────────────────────────────

interface State {
  job: LocalJob | null;
  events: LocalEvent[];
  syncStatus: SyncStatus;
}

type Action =
  | { type: "SET_JOB"; job: LocalJob; events: LocalEvent[] }
  | { type: "PATCH_JOB"; updates: Partial<LocalJob> }
  | { type: "ADD_EVENT"; event: LocalEvent }
  | { type: "UPDATE_EVENT"; id: string; updates: Partial<LocalEvent> }
  | { type: "REMOVE_EVENT"; id: string }
  | { type: "MARK_SYNCED"; tempId: string; realId: string }
  | { type: "SET_SYNC_STATUS"; status: SyncStatus }
  | { type: "CLEAR" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_JOB":
      return { ...state, job: action.job, events: action.events };
    case "PATCH_JOB":
      if (!state.job) return state;
      return { ...state, job: { ...state.job, ...action.updates, updatedAt: Date.now() } };
    case "ADD_EVENT":
      return { ...state, events: [...state.events, action.event] };
    case "UPDATE_EVENT":
      return {
        ...state,
        events: state.events.map((e) =>
          e.id === action.id ? { ...e, ...action.updates, updatedAt: new Date().toISOString() } : e,
        ),
      };
    case "REMOVE_EVENT":
      return { ...state, events: state.events.filter((e) => e.id !== action.id) };
    case "MARK_SYNCED":
      return {
        ...state,
        events: state.events.map((e) =>
          e.id === action.tempId ? { ...e, id: action.realId, _synced: true } : e,
        ),
      };
    case "SET_SYNC_STATUS":
      return { ...state, syncStatus: action.status };
    case "CLEAR":
      return { job: null, events: [], syncStatus: "idle" };
    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

const JobModeContext = createContext<JobModeContextValue | null>(null);

export function useJobMode(): JobModeContextValue {
  const ctx = useContext(JobModeContext);
  if (!ctx) throw new Error("useJobMode must be used inside <JobModeProvider>");
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function JobModeProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    job: null,
    events: [],
    syncStatus: "idle",
  });
  const [isLoaded, setIsLoaded] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [pendingJobIds, setPendingJobIds] = useState<string[]>([]);

  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncingRef = useRef(false);

  // ── Elapsed time counter ─────────────────────────────────────────────────

  useEffect(() => {
    if (!state.job || state.job.status !== "active") {
      setElapsedSeconds(0);
      return;
    }
    const start = state.job.startedAt;
    setElapsedSeconds(Math.floor((Date.now() - start) / 1000));

    const timer = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [state.job?.id, state.job?.status, state.job?.startedAt]);

  // ── localStorage persistence (fires after every state change) ────────────

  useEffect(() => {
    if (!state.job) return;
    writeSnapshot(state.job, state.events);
  }, [state.job, state.events]);

  // ── On mount: detect pending jobs ────────────────────────────────────────

  useEffect(() => {
    const ids = getAllPendingJobIds();
    setPendingJobIds(ids);
    setIsLoaded(true);
  }, []);

  // ── Background sync to server ─────────────────────────────────────────────
  // Called after any addEvent. Debounced 5 seconds.

  const scheduleSyncToServer = useCallback(() => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      void syncToServer();
    }, 5000);
  }, []); // eslint-disable-line

  const syncToServer = useCallback(async () => {
    const { job, events } = state;
    if (!job || syncingRef.current) return;

    const pending = events.filter((e) => !e._synced);
    if (pending.length === 0) return;

    syncingRef.current = true;
    dispatch({ type: "SET_SYNC_STATUS", status: "syncing" });

    try {
      for (const evt of pending) {
        const body = {
          eventType: evt.eventType,
          title: evt.title,
          timestamp: evt.timestamp,
          notes: evt.notes,
          voiceTranscript: evt.voiceTranscript,
          voiceCorrected: evt.voiceCorrected,
          photoUrls: evt.photoUrls,
          measurements: evt.measurements,
          parts: evt.parts,
          metadata: evt.metadata,
          sequenceNum: evt.sequenceNum,
        };

        const created = await apiFetch<{ id: string }>(`/jobs/${job.id}/events`, {
          method: "POST",
          body: JSON.stringify(body),
        });

        dispatch({ type: "MARK_SYNCED", tempId: evt.id, realId: created.id });
      }
      dispatch({ type: "SET_SYNC_STATUS", status: "idle" });
    } catch {
      dispatch({ type: "SET_SYNC_STATUS", status: "error" });
    } finally {
      syncingRef.current = false;
    }
  }, [state]);

  // ── startJob ──────────────────────────────────────────────────────────────

  const startJob = useCallback(async (opts?: StartJobOptions): Promise<LocalJob> => {
    const serverJob = await apiFetch<LocalJob>("/jobs", {
      method: "POST",
      body: JSON.stringify(opts ?? {}),
    });

    // Seed the timeline with a "job started" event immediately
    const startEvent: LocalEvent = {
      id: tempId(),
      _synced: false,
      jobId: serverJob.id,
      userId: serverJob.userId,
      eventType: "dispatch",
      title: "Job Started",
      timestamp: serverJob.startedAt,
      notes: null,
      voiceTranscript: null,
      voiceCorrected: null,
      photoUrls: null,
      measurements: null,
      parts: null,
      metadata: null,
      sequenceNum: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    dispatch({ type: "SET_JOB", job: serverJob, events: [startEvent] });
    setPendingJobIds((ids) => [...new Set([...ids, serverJob.id])]);
    scheduleSyncToServer();
    return serverJob;
  }, [scheduleSyncToServer]);

  // ── resumeJob ─────────────────────────────────────────────────────────────

  const resumeJob = useCallback(async (id: string): Promise<void> => {
    // 1. Load from localStorage immediately (instant UI)
    const snap = readSnapshot(id);
    if (snap) {
      dispatch({ type: "SET_JOB", job: snap.job, events: snap.events });
    }

    // 2. Fetch from server in background (merge any server-side events)
    try {
      const data = await apiFetch<{ job: LocalJob; events: LocalEvent[] }>(`/jobs/${id}`);
      const serverEventIds = new Set(data.events.map((e) => e.id));
      const localUnsyncedEvents = (snap?.events ?? []).filter(
        (e) => !e._synced && !serverEventIds.has(e.id),
      );
      const mergedEvents: LocalEvent[] = [
        ...data.events.map((e) => ({ ...e, _synced: true })),
        ...localUnsyncedEvents,
      ].sort((a, b) => a.timestamp - b.timestamp || a.sequenceNum - b.sequenceNum);

      dispatch({ type: "SET_JOB", job: data.job, events: mergedEvents });
      if (localUnsyncedEvents.length > 0) scheduleSyncToServer();
    } catch {
      // Server fetch failed — localStorage data is still usable
    }
  }, [scheduleSyncToServer]);

  // ── patchJob ──────────────────────────────────────────────────────────────

  const patchJob = useCallback((updates: Partial<LocalJob>) => {
    dispatch({ type: "PATCH_JOB", updates });
    if (state.job) {
      void apiFetch(`/jobs/${state.job.id}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      }).catch(() => {/* best-effort */});
    }
  }, [state.job]);

  // ── completeJob ───────────────────────────────────────────────────────────

  const completeJob = useCallback(async (): Promise<void> => {
    if (!state.job) return;

    const now = Date.now();
    // Add final timeline event
    const completionEvent: LocalEvent = {
      id: tempId(),
      _synced: false,
      jobId: state.job.id,
      userId: state.job.userId,
      eventType: "completed",
      title: "Job Completed",
      timestamp: now,
      notes: null,
      voiceTranscript: null,
      voiceCorrected: null,
      photoUrls: null,
      measurements: null,
      parts: null,
      metadata: null,
      sequenceNum: state.events.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    dispatch({ type: "ADD_EVENT", event: completionEvent });
    dispatch({ type: "PATCH_JOB", updates: { status: "completed", completedAt: now } });

    // Sync immediately (don't wait for debounce)
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    await apiFetch(`/jobs/${state.job.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "completed", completedAt: now }),
    }).catch(() => {});

    await apiFetch(`/jobs/${state.job.id}/events`, {
      method: "POST",
      body: JSON.stringify({
        eventType: "completed",
        title: "Job Completed",
        timestamp: now,
        sequenceNum: state.events.length,
      }),
    }).catch(() => {});
  }, [state.job, state.events.length]);

  // ── clearJob ──────────────────────────────────────────────────────────────

  const clearJob = useCallback(() => {
    if (state.job) clearSnapshot(state.job.id);
    dispatch({ type: "CLEAR" });
  }, [state.job]);

  // ── addEvent (optimistic) ─────────────────────────────────────────────────

  const addEvent = useCallback((input: CreateEventInput): LocalEvent => {
    if (!state.job) throw new Error("No active job");
    const now = input.timestamp ?? Date.now();
    const event: LocalEvent = {
      id: tempId(),
      _synced: false,
      jobId: state.job.id,
      userId: state.job.userId,
      eventType: input.eventType,
      title: input.title,
      timestamp: now,
      notes: input.notes ?? null,
      voiceTranscript: input.voiceTranscript ?? null,
      voiceCorrected: input.voiceCorrected ?? null,
      photoUrls: input.photoUrls ?? null,
      measurements: input.measurements ?? null,
      parts: input.parts ?? null,
      metadata: input.metadata ?? null,
      sequenceNum: state.events.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    dispatch({ type: "ADD_EVENT", event });
    scheduleSyncToServer();
    return event;
  }, [state.job, state.events.length, scheduleSyncToServer]);

  // ── updateEvent ───────────────────────────────────────────────────────────

  const updateEvent = useCallback((id: string, updates: Partial<LocalEvent>) => {
    dispatch({ type: "UPDATE_EVENT", id, updates });
    if (state.job) {
      void apiFetch(`/jobs/${state.job.id}/events/${id}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      }).catch(() => {});
    }
  }, [state.job]);

  // ── removeEvent ───────────────────────────────────────────────────────────

  const removeEvent = useCallback((id: string) => {
    dispatch({ type: "REMOVE_EVENT", id });
    if (state.job) {
      void apiFetch(`/jobs/${state.job.id}/events/${id}`, {
        method: "DELETE",
      }).catch(() => {});
    }
  }, [state.job]);

  // ── loadPendingJobs (for resume list) ─────────────────────────────────────

  const loadPendingJobs = useCallback((): LocalJob[] => {
    return pendingJobIds
      .map((id) => readSnapshot(id)?.job)
      .filter((j): j is LocalJob => !!j && (j.status === "active" || j.status === "paused"))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [pendingJobIds]);

  const hasPendingSync = state.events.some((e) => !e._synced);

  const value: JobModeContextValue = {
    job: state.job,
    events: state.events,
    syncStatus: state.syncStatus,
    hasPendingSync,
    elapsedSeconds,
    isLoaded,
    startJob,
    resumeJob,
    patchJob,
    completeJob,
    clearJob,
    addEvent,
    updateEvent,
    removeEvent,
    pendingJobIds,
    loadPendingJobs,
  };

  return <JobModeContext.Provider value={value}>{children}</JobModeContext.Provider>;
}
