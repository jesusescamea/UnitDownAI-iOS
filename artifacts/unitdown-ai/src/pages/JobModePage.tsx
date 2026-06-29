/**
 * JobModePage — UnitDown 2.0 Job Mode operating system.
 *
 * Route: /job          → Jobs list + "Start New Job"
 * Route: /job/:id      → Dispatch → Active → Completion ceremony
 *
 * Phase transitions (all derived from real events, no separate "status" enum):
 *   events.length === 0  → JobDispatchView  (pre-job brief, "I'm On Site")
 *   events.length  >  0  → JobActiveView    (2.0 dark timeline)
 *   completing === true  → JobCompletionView (ceremony + USR generation)
 *
 * All auth, offline-sync, and resume logic preserved from the original.
 * Existing production modals (VoiceNoteModal, NoteModal, MeasurementModal)
 * are used inside JobActiveView via context — no changes required.
 */

import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import {
  Briefcase, Plus, Clock, ChevronRight, RefreshCw, AlertCircle,
} from "lucide-react";
import { useUser } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";

import { useJobMode, type LocalJob } from "@/context/JobModeContext";
import { StartJobSheet } from "@/components/job/StartJobSheet";
import { JobDispatchView, type JobUnitData } from "./job/JobDispatchView";
import { JobActiveView } from "./job/JobActiveView";
import { JobCompletionView } from "./job/JobCompletionView";
import { AppNav } from "@/components/AppNav";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m ago`;
}

// ─── Modal state ──────────────────────────────────────────────────────────────

type ModalState = { type: "none" } | { type: "start_job" };

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
    <div className="min-h-screen bg-gray-950 text-white">
      <AppNav active="job" />
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 pt-5 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Active Jobs</h1>
            <p className="text-sm text-gray-400">
              Every service call — automatically documented
            </p>
          </div>
        </div>

        <Button
          className="w-full mt-5 h-13 text-base font-semibold rounded-xl bg-white hover:bg-gray-100 text-gray-950 flex items-center justify-center gap-2"
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
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
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
            <div className="w-16 h-16 rounded-2xl bg-blue-950 flex items-center justify-center mb-4">
              <Briefcase className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-base font-semibold text-white mb-2">
              Ready for your first job
            </h3>
            <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
              Start a job when you arrive on site. UnitDown will build a complete
              timeline — voice notes, measurements, photos, and parts — automatically
              saved throughout the call.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Single pending job card ──────────────────────────────────────────────────

function JobCard({ job, onResume }: { job: LocalJob; onResume: (id: string) => void }) {
  const label =
    [job.unitLabel, job.customer, job.site].filter(Boolean).join(" · ") ||
    "Untitled Job";

  return (
    <button
      onClick={() => onResume(job.id)}
      className="w-full text-left flex items-center gap-3 rounded-xl border border-gray-800 bg-gray-900 px-4 py-3.5 hover:border-gray-600 transition-colors group"
    >
      <div className="w-9 h-9 rounded-lg bg-amber-950 flex items-center justify-center shrink-0">
        <RefreshCw className="w-4 h-4 text-amber-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-white truncate">{label}</div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            {formatRelativeTime(job.updatedAt)}
          </span>
          <span className="w-1 h-1 rounded-full bg-gray-600" />
          <span className="text-xs text-amber-500 font-medium capitalize">
            {job.status}
          </span>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-300 transition-colors" />
    </button>
  );
}

// ─── Main page component ──────────────────────────────────────────────────────

interface JobModePageProps {
  jobId?: string;
}

export function JobModePage({ jobId }: JobModePageProps) {
  const { isSignedIn: isUser, user } = useUser();
  const {
    job, events, elapsedSeconds, startJob, resumeJob, addEvent,
    completeJob, isLoaded,
  } = useJobMode();
  const [, navigate] = useLocation();
  const [modal, setModal]         = useState<ModalState>({ type: "none" });
  const [startLoading, setStartLoading] = useState(false);
  const [error, setError]         = useState("");
  const [completing, setCompleting] = useState(false);

  // Resume by ID when navigating directly to /job/:id
  useEffect(() => {
    if (!jobId) return;
    if (!isLoaded) return;
    if (job?.id === jobId) return;
    void resumeJob(jobId);
  }, [jobId, isLoaded]); // eslint-disable-line

  // Derive unit data from job metadata (populated by StartJobSheet / linked unit)
  function metaStr(key: string): string | null {
    const v = job?.metadata?.[key];
    return typeof v === "string" ? v : null;
  }
  const unitData: JobUnitData | null = job
    ? {
        manufacturer:    metaStr("manufacturer"),
        modelNumber:     metaStr("modelNumber"),
        serialNumber:    metaStr("serialNumber"),
        capacityTons:    metaStr("capacityTons"),
        refrigerantType: metaStr("refrigerantType"),
        location:        metaStr("location"),
        voltage:         metaStr("voltage"),
      }
    : null;

  // ── Start new job ───────────────────────────────────────────────────────────

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

  // ── Resume existing job ─────────────────────────────────────────────────────

  const handleResume = useCallback(
    (id: string) => navigate(`/job/${id}`),
    [navigate],
  );

  // ── "I'm On Site" — adds arrived event, transitions to active view ──────────

  const handleOnSite = useCallback(async () => {
    await addEvent({ eventType: "arrived", title: "On Site" });
  }, [addEvent]);

  // ── Complete job ────────────────────────────────────────────────────────────

  const handleCompleteJob = useCallback(async () => {
    const jobId = job?.id;
    await completeJob();
    if (jobId) {
      navigate(`/job/${jobId}/record`);
    } else {
      navigate("/job");
    }
  }, [job, completeJob, navigate]);

  // ── Auth guard ──────────────────────────────────────────────────────────────

  if (!isUser) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-blue-950 flex items-center justify-center mb-4">
          <Briefcase className="w-7 h-7 text-blue-400" />
        </div>
        <h2 className="text-lg font-semibold text-white mb-2">
          Sign in for Job Mode
        </h2>
        <p className="text-sm text-gray-500 mb-6 max-w-xs">
          Job Mode saves your work to your account so you can resume from any device.
        </p>
        <Button
          className="bg-white text-gray-950 hover:bg-gray-100 px-8 font-bold"
          onClick={() => navigate("/login")}
        >
          Sign In
        </Button>
      </div>
    );
  }

  // ── Completion ceremony ─────────────────────────────────────────────────────

  if (completing && job) {
    return (
      <JobCompletionView
        job={job}
        events={events}
        onConfirmComplete={handleCompleteJob}
        onViewRecord={(id) => navigate(`/job/${id}/record`)}
        onCancel={() => setCompleting(false)}
      />
    );
  }

  // ── Active session view (dispatch or active timeline) ───────────────────────

  if (jobId || (job && job.status === "active")) {
    if (!job) {
      // Still loading resume
      return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-white border-t-transparent animate-spin" />
        </div>
      );
    }

    // Dispatch phase: no events yet — show pre-job brief
    if (events.length === 0) {
      return (
        <JobDispatchView
          job={job}
          unit={unitData}
          techName={user?.fullName ?? user?.firstName ?? ""}
          onStartJob={() => void handleOnSite()}
        />
      );
    }

    // Active phase: events exist — show 2.0 dark timeline
    return (
      <JobActiveView
        job={job}
        events={events}
        elapsedSeconds={elapsedSeconds}
        onComplete={() => setCompleting(true)}
        onBack={() => navigate("/job")}
      />
    );
  }

  // ── Jobs list (landing) view ─────────────────────────────────────────────────

  return (
    <>
      {error && (
        <div className="fixed top-4 inset-x-4 z-50 flex items-start gap-2 rounded-xl bg-red-950 border border-red-800 px-4 py-3 shadow-lg">
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      <JobsListScreen
        onStartNew={() => setModal({ type: "start_job" })}
        onResume={handleResume}
      />

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
