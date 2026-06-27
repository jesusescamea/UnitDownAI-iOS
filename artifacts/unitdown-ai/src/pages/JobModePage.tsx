/**
 * JobModePage — the Job Mode operating system.
 *
 * Route: /job            → Job list + "Start New Job" (no active session)
 * Route: /job/:id        → Active job session
 *
 * The entire session experience lives here:
 * - Persistent sticky header (customer / unit / elapsed / sync status)
 * - Chronological timeline of all events
 * - Floating Action Button with 6 quick actions
 * - Background auto-save (localStorage + debounced API sync)
 * - Resume from any interruption (phone call, camera, backgrounding)
 * - Complete job → record completedAt, mark status, stop timer
 */

import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import {
  Briefcase, Plus, Clock, ChevronRight, RefreshCw,
  CheckCircle2, AlertCircle, Trash2,
} from "lucide-react";
import { useUser } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";

import { useJobMode, type LocalJob } from "@/context/JobModeContext";
import type { LocalEvent } from "@/context/JobModeContext";
import { StartJobSheet } from "@/components/job/StartJobSheet";
import { JobProgressHeader } from "@/components/job/JobProgressHeader";
import { JobTimeline } from "@/components/job/JobTimeline";
import { JobFAB, type FABAction } from "@/components/job/JobFAB";
import { VoiceNoteModal } from "@/components/job/modals/VoiceNoteModal";
import { NoteModal } from "@/components/job/modals/NoteModal";
import { MeasurementModal } from "@/components/job/modals/MeasurementModal";

// ─── Modal state union ────────────────────────────────────────────────────────

type ModalState =
  | { type: "none" }
  | { type: "start_job" }
  | { type: "voice_note" }
  | { type: "note"; event?: LocalEvent }
  | { type: "measurement" }
  | { type: "complete_confirm" };

// ─── Elapsed time formatter ───────────────────────────────────────────────────

function formatRelativeTime(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m ago`;
}

// ─── Jobs list screen (no active job) ────────────────────────────────────────

interface JobsListScreenProps {
  onStartNew: () => void;
  onResume: (id: string) => void;
}

function JobsListScreen({ onStartNew, onResume }: JobsListScreenProps) {
  const { loadPendingJobs, pendingJobIds } = useJobMode();
  const [pendingJobs, setPendingJobs] = useState<LocalJob[]>([]);

  useEffect(() => {
    setPendingJobs(loadPendingJobs());
  }, [pendingJobIds, loadPendingJobs]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Active Jobs</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Every service call — automatically documented
            </p>
          </div>
        </div>

        {/* Start new job button */}
        <Button
          className="w-full mt-5 h-13 text-base font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2"
          onClick={onStartNew}
        >
          <Plus className="w-5 h-5" />
          Start New Job
        </Button>
      </div>

      {/* Pending jobs */}
      <div className="px-4 py-5">
        {pendingJobs.length > 0 ? (
          <>
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">
              Resume Previous Job
            </h2>
            <div className="space-y-2">
              {pendingJobs.map((j) => (
                <JobCard key={j.id} job={j} onResume={onResume} />
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center text-center py-16 px-6">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center mb-4">
              <Briefcase className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-base font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              Ready for your first job
            </h3>
            <p className="text-sm text-zinc-400 dark:text-zinc-500 max-w-xs leading-relaxed">
              Start a job when you arrive on site. UnitDown will build a complete timeline — voice notes, measurements, photos, and parts — automatically saved throughout the call.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Single pending job card ──────────────────────────────────────────────────

function JobCard({ job, onResume }: { job: LocalJob; onResume: (id: string) => void }) {
  const label = [job.unitLabel, job.customer, job.site].filter(Boolean).join(" · ") || "Untitled Job";

  return (
    <button
      onClick={() => onResume(job.id)}
      className="w-full text-left flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-3.5 hover:border-blue-300 dark:hover:border-blue-700 transition-colors group"
    >
      <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950 flex items-center justify-center shrink-0">
        <RefreshCw className="w-4.5 h-4.5 text-amber-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
          {label}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="flex items-center gap-1 text-xs text-zinc-400">
            <Clock className="w-3 h-3" />
            {formatRelativeTime(job.updatedAt)}
          </span>
          <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />
          <span className="text-xs text-amber-600 dark:text-amber-400 font-medium capitalize">
            {job.status}
          </span>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-blue-500 transition-colors" />
    </button>
  );
}

// ─── Active job session screen ────────────────────────────────────────────────

interface ActiveJobScreenProps {
  onBack: () => void;
}

function ActiveJobScreen({ onBack }: ActiveJobScreenProps) {
  const { job, completeJob, clearJob } = useJobMode();
  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const [, navigate] = useLocation();

  const handleFABAction = useCallback((action: FABAction) => {
    switch (action) {
      case "voice_note":   setModal({ type: "voice_note" });   break;
      case "note":         setModal({ type: "note" });         break;
      case "measurement":  setModal({ type: "measurement" });  break;
      default:             break;
    }
  }, []);

  const handleComplete = useCallback(async () => {
    // Capture ID before completeJob() modifies state
    const jobId = job?.id;
    await completeJob();
    if (jobId) {
      navigate(`/job/${jobId}/record`);
    } else {
      navigate("/job");
    }
    clearJob();
  }, [job, completeJob, clearJob, navigate]);

  const handleEditEvent = useCallback((event: LocalEvent) => {
    if (event.eventType === "note") {
      setModal({ type: "note", event });
    }
  }, []);

  if (!job) return null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col">
      {/* Sticky progress header */}
      <JobProgressHeader
        onBack={onBack}
        onComplete={() => setModal({ type: "complete_confirm" })}
      />

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto">
        <JobTimeline onEditEvent={handleEditEvent} />
      </div>

      {/* FAB */}
      <JobFAB onAction={handleFABAction} />

      {/* Modals */}
      {modal.type === "voice_note" && (
        <VoiceNoteModal onClose={() => setModal({ type: "none" })} />
      )}
      {modal.type === "note" && (
        <NoteModal
          onClose={() => setModal({ type: "none" })}
          initialText={modal.event?.notes ?? undefined}
          eventIdToUpdate={modal.event?.id}
        />
      )}
      {modal.type === "measurement" && (
        <MeasurementModal onClose={() => setModal({ type: "none" })} />
      )}
      {modal.type === "complete_confirm" && (
        <CompleteConfirmSheet
          onConfirm={handleComplete}
          onCancel={() => setModal({ type: "none" })}
        />
      )}
    </div>
  );
}

// ─── Complete confirmation sheet ──────────────────────────────────────────────

function CompleteConfirmSheet({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onCancel} />
      <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-white dark:bg-zinc-900 shadow-2xl safe-area-pb">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />
        </div>
        <div className="px-5 py-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Complete this job?</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                The timeline will be saved to equipment history.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 h-11" onClick={onCancel}>
              Not Yet
            </Button>
            <Button
              className="flex-1 h-11 bg-green-600 hover:bg-green-700 text-white"
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading ? "Completing…" : "Complete Job"}
            </Button>
          </div>

          <button
            onClick={onCancel}
            className="w-full mt-3 flex items-center justify-center gap-1.5 text-xs text-red-500 hover:text-red-600 py-2"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Discard this job
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Main page component ──────────────────────────────────────────────────────

interface JobModePageProps {
  jobId?: string;  // undefined = list page, string = active session
}

export function JobModePage({ jobId }: JobModePageProps) {
  const { isSignedIn: isUser } = useUser();
  const { job, startJob, resumeJob, isLoaded } = useJobMode();
  const [, navigate] = useLocation();
  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const [startLoading, setStartLoading] = useState(false);
  const [error, setError] = useState("");

  // Resume by ID (when navigating directly to /job/:id)
  useEffect(() => {
    if (!jobId) return;
    if (!isLoaded) return;
    if (job?.id === jobId) return;  // already loaded
    void resumeJob(jobId);
  }, [jobId, isLoaded]);  // eslint-disable-line

  // ── Start new job ─────────────────────────────────────────────────────────

  const handleStartJob = useCallback(
    async (opts: Parameters<typeof startJob>[0]) => {
      setStartLoading(true);
      setError("");
      try {
        const newJob = await startJob(opts);
        setModal({ type: "none" });
        navigate(`/job/${newJob.id}`);
      } catch {
        setError("Could not start job — check your connection and try again.");
      } finally {
        setStartLoading(false);
      }
    },
    [startJob, navigate],
  );

  // ── Resume existing job ───────────────────────────────────────────────────

  const handleResume = useCallback(
    (id: string) => {
      navigate(`/job/${id}`);
    },
    [navigate],
  );

  // ── Auth guard ────────────────────────────────────────────────────────────

  if (!isUser) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center mb-4">
          <Briefcase className="w-7 h-7 text-blue-400" />
        </div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
          Sign in for Job Mode
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 max-w-xs">
          Job Mode saves your work to your account so you can resume from any device.
        </p>
        <Button
          className="bg-blue-600 hover:bg-blue-700 text-white px-8"
          onClick={() => navigate("/login")}
        >
          Sign In
        </Button>
      </div>
    );
  }

  // ── Active session view ───────────────────────────────────────────────────

  if (jobId || (job && job.status === "active")) {
    return (
      <>
        <ActiveJobScreen onBack={() => navigate("/job")} />
      </>
    );
  }

  // ── Jobs list (landing) view ──────────────────────────────────────────────

  return (
    <>
      {error && (
        <div className="fixed top-4 inset-x-4 z-50 flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 px-4 py-3 shadow-lg">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <JobsListScreen
        onStartNew={() => setModal({ type: "start_job" })}
        onResume={handleResume}
      />

      {/* Start job sheet */}
      {modal.type === "start_job" && (
        <StartJobSheet
          onStart={handleStartJob}
          onClose={() => setModal({ type: "none" })}
          loading={startLoading}
        />
      )}
    </>
  );
}
