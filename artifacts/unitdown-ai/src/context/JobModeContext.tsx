/**
 * JobModeContext — the operating system for every HVAC service call.
 *
 * Offline-first architecture:
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  User action → localStorage (instant) → IndexedDB queue (durable)  │
 * │                                ↓ when online                        │
 * │                          flushQueue() → API server                  │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * Key guarantees:
 * - Every action works with zero network connectivity
 * - Client-generated IDs are permanent — no temp→real ID swap needed
 * - Queue survives page crash, reload, force-close (IndexedDB is durable)
 * - Server accepts client IDs via onConflictDoNothing for idempotency
 * - Resume detection on every app mount from localStorage
 * - Auto-flush on reconnect; manual retry exposed via retrySync()
 *
 * Extension hooks (unchanged from Phase 1):
 * - event.metadata jsonb: Smart Photos, AI enrichment, Equipment Memory
 * - event.measurements jsonb: Phase 3 typed measurement schemas
 * - event.parts jsonb: Phase 3 Parts Assistant output
 * - job.metadata jsonb: AI Report, invoice summary
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
import { useUser } from "@clerk/clerk-react";
import {
  enqueueOp,
  getQueuedOps,
  dequeueOp,
  markOpFailed,
  getQueueSize,
  type QueuedOp,
} from "@/services/jobOfflineDB";

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
  // USS Service Record fields — populated server-side on job completion
  usrId: string | null;
  serviceRecordStatus: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface LocalEvent {
  id: string;
  /** True once the event has been confirmed persisted to the server. */
  _synced: boolean;
  jobId: string;
  userId: string;
  eventType: EventType;
  title: string;
  timestamp: number;
  notes: string | null;
  voiceTranscript: string | null;
  voiceCorrected: string | null;
  photoUrls: string[] | null;
  measurements: Record<string, string> | null;
  parts: unknown;
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

/**
 * Connectivity + sync state.
 * idle    = online and fully synced
 * syncing = actively flushing the queue
 * pending = queue not empty; will flush when next window opens
 * error   = last flush attempt had failures
 * offline = no network connectivity
 */
export type SyncStatus = "idle" | "syncing" | "pending" | "error" | "offline";

export interface JobModeContextValue {
  // ── Current session ──────────────────────────────────────────────────────
  job: LocalJob | null;
  events: LocalEvent[];
  syncStatus: SyncStatus;
  pendingCount: number;
  isOnline: boolean;
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

  // ── Sync control ──────────────────────────────────────────────────────────
  retrySync: () => void;

  // ── Resume detection ──────────────────────────────────────────────────────
  pendingJobIds: string[];
  loadPendingJobs: () => LocalJob[];
}

// ─── Client-side ID generator (matches server format) ─────────────────────────

function clientId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
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
    // Storage quota exceeded — silently ignore; server sync is the backup
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

// ─── API helper ───────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...opts?.headers },
  });
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── Queue operation executor ─────────────────────────────────────────────────

async function executeOp(
  op: QueuedOp,
  dispatch: React.Dispatch<Action>,
): Promise<void> {
  switch (op.type) {
    case "create_job": {
      await apiFetch<LocalJob>("/jobs", {
        method: "POST",
        body: JSON.stringify(op.payload),
      });
      break;
    }
    case "patch_job": {
      const { jobId, ...data } = op.payload as { jobId: string; [k: string]: unknown };
      await apiFetch(`/jobs/${jobId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      break;
    }
    case "create_event": {
      const { jobId, ...body } = op.payload as { jobId: string; id: string; [k: string]: unknown };
      await apiFetch(`/jobs/${jobId}/events`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      dispatch({ type: "MARK_EVENT_SYNCED", eventId: op.id });
      break;
    }
    case "patch_event": {
      const { jobId, eventId, ...data } = op.payload as {
        jobId: string;
        eventId: string;
        [k: string]: unknown;
      };
      await apiFetch(`/jobs/${jobId}/events/${eventId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      break;
    }
    case "delete_event": {
      const { jobId, eventId } = op.payload as { jobId: string; eventId: string };
      await apiFetch(`/jobs/${jobId}/events/${eventId}`, { method: "DELETE" });
      break;
    }
    case "upload_photo": {
      // Phase 2 — blobs stay in IndexedDB until photo upload is implemented
      break;
    }
  }
}

// ─── State + reducer ──────────────────────────────────────────────────────────

interface State {
  job: LocalJob | null;
  events: LocalEvent[];
}

type Action =
  | { type: "SET_JOB"; job: LocalJob; events: LocalEvent[] }
  | { type: "PATCH_JOB"; updates: Partial<LocalJob> }
  | { type: "ADD_EVENT"; event: LocalEvent }
  | { type: "UPDATE_EVENT"; id: string; updates: Partial<LocalEvent> }
  | { type: "REMOVE_EVENT"; id: string }
  | { type: "MARK_EVENT_SYNCED"; eventId: string }
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
          e.id === action.id
            ? { ...e, ...action.updates, updatedAt: new Date().toISOString() }
            : e,
        ),
      };
    case "REMOVE_EVENT":
      return { ...state, events: state.events.filter((e) => e.id !== action.id) };
    case "MARK_EVENT_SYNCED":
      return {
        ...state,
        events: state.events.map((e) =>
          e.id === action.eventId ? { ...e, _synced: true } : e,
        ),
      };
    case "CLEAR":
      return { job: null, events: [] };
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
  const { user } = useUser();

  const [state, dispatch] = useReducer(reducer, { job: null, events: [] });
  const [isLoaded, setIsLoaded] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [pendingJobIds, setPendingJobIds] = useState<string[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");

  const isFlushingRef = useRef(false);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Elapsed timer ─────────────────────────────────────────────────────────

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

  // ── localStorage persistence (fires after every state change) ─────────────

  useEffect(() => {
    if (!state.job) return;
    writeSnapshot(state.job, state.events);
  }, [state.job, state.events]);

  // ── On mount: detect pending jobs + seed pending count ────────────────────

  useEffect(() => {
    setPendingJobIds(getAllPendingJobIds());
    setIsLoaded(true);
    void getQueueSize().then(setPendingCount);
  }, []);

  // ── Online/offline detection ──────────────────────────────────────────────

  const flushQueue = useCallback(async () => {
    if (!navigator.onLine) return;
    if (isFlushingRef.current) return;
    isFlushingRef.current = true;
    setSyncStatus("syncing");

    const ops = await getQueuedOps();
    if (ops.length === 0) {
      setSyncStatus("idle");
      setPendingCount(0);
      isFlushingRef.current = false;
      return;
    }

    let hadError = false;
    for (const op of ops) {
      try {
        await executeOp(op, dispatch);
        await dequeueOp(op.id);
      } catch (err) {
        await markOpFailed(op.id, String(err));
        hadError = true;
      }
    }

    const remaining = await getQueueSize();
    setPendingCount(remaining);
    setSyncStatus(hadError ? "error" : remaining > 0 ? "pending" : "idle");
    isFlushingRef.current = false;
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setSyncStatus((prev) => (prev === "offline" ? "pending" : prev));
      void flushQueue();
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus("offline");
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    // Reflect initial state
    if (!navigator.onLine) setSyncStatus("offline");
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [flushQueue]);

  // ── Periodic pending count refresh (every 10s) ────────────────────────────

  useEffect(() => {
    const timer = setInterval(async () => {
      const count = await getQueueSize();
      setPendingCount(count);
    }, 10_000);
    return () => clearInterval(timer);
  }, []);

  // ── Debounced flush (fires 3s after last write while online) ──────────────

  const scheduleFlush = useCallback(() => {
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    flushTimerRef.current = setTimeout(() => {
      void flushQueue();
    }, 3000);
  }, [flushQueue]);

  // ── retrySync ─────────────────────────────────────────────────────────────

  const retrySync = useCallback(() => {
    setSyncStatus("pending");
    void flushQueue();
  }, [flushQueue]);

  // ── startJob (offline-first) ──────────────────────────────────────────────
  // Creates the job locally and enqueues a create_job operation.
  // Network is NOT required — job starts immediately regardless of connectivity.

  const startJob = useCallback(async (opts?: StartJobOptions): Promise<LocalJob> => {
    const now = Date.now();
    const jobId = clientId("job");
    const userId = user?.id ?? "offline";

    const localJob: LocalJob = {
      id: jobId,
      userId,
      unitId: opts?.unitId ?? null,
      customer: opts?.customer ?? null,
      site: opts?.site ?? null,
      unitLabel: opts?.unitLabel ?? null,
      title: opts?.title ?? null,
      status: "active",
      startedAt: now,
      updatedAt: now,
      completedAt: null,
      usrId: null,
      serviceRecordStatus: null,
      metadata: null,
      createdAt: new Date().toISOString(),
    };

    const startEventId = clientId("evt");
    const startEvent: LocalEvent = {
      id: startEventId,
      _synced: false,
      jobId,
      userId,
      eventType: "dispatch",
      title: "Job Started",
      timestamp: now,
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

    // Write to state and localStorage immediately (offline-safe)
    dispatch({ type: "SET_JOB", job: localJob, events: [startEvent] });
    setPendingJobIds((ids) => [...new Set([...ids, jobId])]);

    // Queue the server sync operations
    const opTime = now;
    await enqueueOp({
      id: jobId,
      type: "create_job",
      payload: { id: jobId, ...opts },
      enqueuedAt: opTime,
      retries: 0,
      lastError: null,
    });
    await enqueueOp({
      id: startEventId,
      type: "create_event",
      payload: {
        id: startEventId,
        jobId,
        eventType: "dispatch",
        title: "Job Started",
        timestamp: now,
        sequenceNum: 0,
      },
      enqueuedAt: opTime + 1,
      retries: 0,
      lastError: null,
    });

    const count = await getQueueSize();
    setPendingCount(count);

    if (!isOnline) {
      setSyncStatus("offline");
    } else {
      setSyncStatus("pending");
      scheduleFlush();
    }

    return localJob;
  }, [user?.id, isOnline, scheduleFlush]);

  // ── resumeJob ─────────────────────────────────────────────────────────────

  const resumeJob = useCallback(async (id: string): Promise<void> => {
    // 1. Load from localStorage immediately (instant, works offline)
    const snap = readSnapshot(id);
    if (snap) {
      dispatch({ type: "SET_JOB", job: snap.job, events: snap.events });
    }

    // 2. Merge server state in background (if online)
    if (!navigator.onLine) return;
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

      // If there are unsynced local events, push them now
      if (localUnsyncedEvents.length > 0) {
        scheduleFlush();
      }
    } catch {
      // Network error — localStorage data is still displayed, which is correct
    }
  }, [scheduleFlush]);

  // ── patchJob ──────────────────────────────────────────────────────────────

  const patchJob = useCallback((updates: Partial<LocalJob>) => {
    if (!state.job) return;
    const jobId = state.job.id;
    dispatch({ type: "PATCH_JOB", updates });

    void enqueueOp({
      id: `patch_job_${jobId}_${Date.now()}`,
      type: "patch_job",
      payload: { jobId, ...updates },
      enqueuedAt: Date.now(),
      retries: 0,
      lastError: null,
    }).then(async () => {
      const count = await getQueueSize();
      setPendingCount(count);
      scheduleFlush();
    });
  }, [state.job, scheduleFlush]);

  // ── completeJob ───────────────────────────────────────────────────────────
  // Online path: calls POST /jobs/:jobId/complete directly — server atomically
  // generates the permanent USR ID and returns it.
  // Offline path: queues patch_job + create_event (same as before). The USR ID
  // is generated the next time the queue flushes and the /complete endpoint is
  // called. For now the offline path leaves usrId null until next online sync.

  const completeJob = useCallback(async (): Promise<void> => {
    if (!state.job) return;
    const now = Date.now();
    const jobId = state.job.id;
    const userId = state.job.userId;

    // Optimistic local update (instant feedback regardless of connectivity)
    dispatch({ type: "PATCH_JOB", updates: { status: "completed", completedAt: now } });

    if (navigator.onLine) {
      try {
        const result = await apiFetch<{ job: LocalJob; events: LocalEvent[] }>(
          `/jobs/${jobId}/complete`,
          { method: "POST" },
        );
        // Server assigned the permanent USR ID — update local state
        dispatch({
          type: "PATCH_JOB",
          updates: {
            usrId: result.job.usrId ?? null,
            serviceRecordStatus: result.job.serviceRecordStatus ?? "completed",
            completedAt: result.job.completedAt ?? now,
          },
        });
        return;
      } catch {
        // Network failure mid-request — fall through to offline path so the
        // job is still queued and can sync when connectivity returns.
      }
    }

    // Offline path: queue patch + completion event for later sync
    const eventId = clientId("evt");
    const completionEvent: LocalEvent = {
      id: eventId,
      _synced: false,
      jobId,
      userId,
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

    const enqueueTime = now;
    await enqueueOp({
      id: `patch_job_${jobId}_complete`,
      type: "patch_job",
      payload: { jobId, status: "completed", completedAt: now },
      enqueuedAt: enqueueTime,
      retries: 0,
      lastError: null,
    });
    await enqueueOp({
      id: eventId,
      type: "create_event",
      payload: {
        id: eventId,
        jobId,
        eventType: "completed",
        title: "Job Completed",
        timestamp: now,
        sequenceNum: state.events.length,
      },
      enqueuedAt: enqueueTime + 1,
      retries: 0,
      lastError: null,
    });

    const count = await getQueueSize();
    setPendingCount(count);
    setSyncStatus("offline");
  }, [state.job, state.events.length, flushQueue]);

  // ── clearJob ──────────────────────────────────────────────────────────────

  const clearJob = useCallback(() => {
    if (state.job) clearSnapshot(state.job.id);
    dispatch({ type: "CLEAR" });
  }, [state.job]);

  // ── addEvent (optimistic, offline-first) ─────────────────────────────────

  const addEvent = useCallback((input: CreateEventInput): LocalEvent => {
    if (!state.job) throw new Error("No active job");
    const now = input.timestamp ?? Date.now();
    const eventId = clientId("evt");

    const event: LocalEvent = {
      id: eventId,
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

    // Queue for server sync (fires regardless of connectivity)
    void enqueueOp({
      id: eventId,
      type: "create_event",
      payload: {
        id: eventId,
        jobId: state.job.id,
        eventType: input.eventType,
        title: input.title,
        timestamp: now,
        notes: input.notes,
        voiceTranscript: input.voiceTranscript,
        voiceCorrected: input.voiceCorrected,
        photoUrls: input.photoUrls,
        measurements: input.measurements,
        parts: input.parts,
        metadata: input.metadata,
        sequenceNum: state.events.length,
      },
      enqueuedAt: now,
      retries: 0,
      lastError: null,
    }).then(async () => {
      const count = await getQueueSize();
      setPendingCount(count);
      if (!isOnline) {
        setSyncStatus("offline");
      } else {
        setSyncStatus("pending");
        scheduleFlush();
      }
    });

    return event;
  }, [state.job, state.events.length, isOnline, scheduleFlush]);

  // ── updateEvent ───────────────────────────────────────────────────────────

  const updateEvent = useCallback((id: string, updates: Partial<LocalEvent>) => {
    if (!state.job) return;
    const jobId = state.job.id;
    dispatch({ type: "UPDATE_EVENT", id, updates });

    void enqueueOp({
      id: `patch_evt_${id}_${Date.now()}`,
      type: "patch_event",
      payload: { jobId, eventId: id, ...updates },
      enqueuedAt: Date.now(),
      retries: 0,
      lastError: null,
    }).then(() => scheduleFlush());
  }, [state.job, scheduleFlush]);

  // ── removeEvent ───────────────────────────────────────────────────────────

  const removeEvent = useCallback((id: string) => {
    if (!state.job) return;
    const jobId = state.job.id;
    dispatch({ type: "REMOVE_EVENT", id });

    void enqueueOp({
      id: `del_evt_${id}`,
      type: "delete_event",
      payload: { jobId, eventId: id },
      enqueuedAt: Date.now(),
      retries: 0,
      lastError: null,
    }).then(() => scheduleFlush());
  }, [state.job, scheduleFlush]);

  // ── loadPendingJobs ───────────────────────────────────────────────────────

  const loadPendingJobs = useCallback((): LocalJob[] => {
    return pendingJobIds
      .map((id) => readSnapshot(id)?.job)
      .filter((j): j is LocalJob => !!j && (j.status === "active" || j.status === "paused"))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [pendingJobIds]);

  // ── Derived hasPendingSync (backwards-compat) ─────────────────────────────

  const hasPendingSync = state.events.some((e) => !e._synced);

  const value: JobModeContextValue = {
    job: state.job,
    events: state.events,
    syncStatus,
    pendingCount,
    isOnline,
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
    retrySync,
    pendingJobIds,
    loadPendingJobs,
  };

  return <JobModeContext.Provider value={value}>{children}</JobModeContext.Provider>;
}
