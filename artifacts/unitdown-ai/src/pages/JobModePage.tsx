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
 * "Start New Job" opens the shared ScheduleJobWizard (Customer → Site →
 * Equipment → Schedule → Review) instead of the old free-text modal.
 * The wizard result is POSTed to /api/jobs and then startJob() is called
 * with the server-assigned ID so no duplicate job is ever created.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import {
  Briefcase, Plus, Clock, ChevronRight, RefreshCw, AlertCircle, FileText,
} from "lucide-react";
import { useUser, useAuth } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";

import { useJobMode, type LocalJob } from "@/context/JobModeContext";
import {
  ScheduleJobWizard,
  type ScheduleWizardResult,
} from "@/pages/jmp/ScheduleJobWizard";
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

type ModalState = { type: "none" } | { type: "wizard" };

// ─── Jobs list screen (no active job) ────────────────────────────────────────

interface JobsListScreenProps {
  onStartNew: () => void;
  onResume: (id: string) => void;
}

function JobsListScreen({ onStartNew, onResume }: JobsListScreenProps) {
  const { loadPendingJobs, pendingJobIds } = useJobMode();
  const [, navigate] = useLocation();
  const [pendingJobs, setPendingJobs] = useState<LocalJob[]>([]);

  useEffect(() => {
    setPendingJobs(loadPendingJobs());
  }, [pendingJobIds, loadPendingJobs]);

  const completedJobs = useMemo((): LocalJob[] => {
    return pendingJobIds
      .map((id) => {
        try {
          const raw = localStorage.getItem(`unitdown_job_${id}`);
          if (!raw) return null;
          const snap = JSON.parse(raw) as { job?: LocalJob };
          return snap.job ?? null;
        } catch { return null; }
      })
      .filter((j): j is LocalJob =>
        !!j && (j.status === "completed" || (j.status as string) === "complete"),
      )
      .sort(
        (a, b) =>
          ((b as LocalJob & { completedAt?: number }).completedAt ?? b.updatedAt) -
          ((a as LocalJob & { completedAt?: number }).completedAt ?? a.updatedAt),
      );
  }, [pendingJobIds]);

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-14 sm:pb-0">
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
      <div className="px-4 py-5 space-y-6">
        {pendingJobs.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Resume Previous Job
            </h2>
            <div className="space-y-2">
              {pendingJobs.map((j) => (
                <JobCard key={j.id} job={j} onResume={onResume} />
              ))}
            </div>
          </div>
        )}

        {/* Completed jobs / service records */}
        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Completed Service Records
          </h2>
          {completedJobs.length > 0 ? (
            <div className="space-y-2">
              {completedJobs.map((j) => (
                <CompletedJobCard
                  key={j.id}
                  job={j}
                  onOpen={() => navigate(`/job/${j.id}/record`)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center text-center py-10 px-6 rounded-2xl border border-gray-800 bg-gray-900/40">
              <FileText className="w-8 h-8 text-gray-600 mb-3" />
              <p className="text-sm font-medium text-gray-400 mb-1">No completed jobs yet</p>
              <p className="text-xs text-gray-600 max-w-xs leading-relaxed">
                Completed service records will appear here.
              </p>
            </div>
          )}
        </div>
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

// ─── Completed job card ───────────────────────────────────────────────────────

function CompletedJobCard({ job, onOpen }: { job: LocalJob; onOpen: () => void }) {
  const label =
    [job.unitLabel, job.customer, job.site].filter(Boolean).join(" · ") ||
    "Untitled Job";
  const completedAt =
    (job as LocalJob & { completedAt?: number }).completedAt ?? job.updatedAt;
  const usrId = (job as LocalJob & { usrId?: string }).usrId;

  return (
    <button
      onClick={onOpen}
      className="w-full text-left flex items-center gap-3 rounded-xl border border-gray-800 bg-gray-900 px-4 py-3.5 hover:border-green-700 transition-colors group"
    >
      <div className="w-9 h-9 rounded-lg bg-green-950 flex items-center justify-center shrink-0">
        <FileText className="w-4 h-4 text-green-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-white truncate">{label}</div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            {new Date(completedAt).toLocaleDateString("en-US", {
              month: "short", day: "numeric", year: "numeric",
            })}
          </span>
          {usrId && (
            <>
              <span className="w-1 h-1 rounded-full bg-gray-600" />
              <span className="text-xs text-gray-600 font-mono">{usrId}</span>
            </>
          )}
        </div>
      </div>
      <span className="text-[10px] font-semibold text-green-500 border border-green-800 rounded-full px-2 py-0.5 shrink-0 group-hover:bg-green-900/40 transition-colors">
        View Report
      </span>
    </button>
  );
}

// ─── Main page component ──────────────────────────────────────────────────────

interface JobModePageProps {
  jobId?: string;
}

export function JobModePage({ jobId }: JobModePageProps) {
  const { isSignedIn: isUser, user } = useUser();
  const { getToken }                  = useAuth();
  const {
    job, events, elapsedSeconds, startJob, resumeJob, addEvent,
    completeJob, isLoaded,
  } = useJobMode();
  const [, navigate] = useLocation();
  const [modal, setModal]         = useState<ModalState>({ type: "none" });
  const [error, setError]         = useState("");
  const [completing, setCompleting] = useState(false);

  // Dismiss the error banner after a few seconds
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(""), 6000);
    return () => clearTimeout(t);
  }, [error]);

  // Resume by ID when navigating directly to /job/:id
  useEffect(() => {
    if (!jobId) return;
    if (!isLoaded) return;
    if (job?.id === jobId) return;
    void resumeJob(jobId);
  }, [jobId, isLoaded]); // eslint-disable-line

  // Derive unit data from job metadata (populated by the wizard's equipment step)
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

  // ── Wizard → Create + Start job ─────────────────────────────────────────────
  //
  // Called when the technician taps "Create Job" on the wizard's Review step.
  // We POST to /api/jobs to create the server record, then call startJob() with
  // the server-assigned ID so the offline queue uses ON CONFLICT DO NOTHING —
  // guaranteeing exactly one row in the database.

  const handleWizardCreated = useCallback(
    async (result: ScheduleWizardResult) => {
      // Close the wizard immediately so the user sees progress
      setModal({ type: "none" });

      // ── Auth: bypass token first so Clerk never blocks this path ──────────
      const bypassToken = (import.meta.env.VITE_OWNER_BYPASS_TOKEN as string | undefined) || null;
      const clerkToken  = bypassToken ? null : await getToken().catch(() => null);
      const authToken   = bypassToken ?? clerkToken;

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

      try {
        const res = await fetch("/api/jobs", {
          method:  "POST",
          headers,
          body: JSON.stringify({
            customer:  result.job.customer  || undefined,
            site:      result.job.address !== "—" ? result.job.address : undefined,
            unitLabel: result.job.unitTag  !== "—" ? result.job.unitTag  : undefined,
            title:     result.job.symptom  || result.title,
            startedAt: result.scheduledMs,
            unitId:    result.unitId       || undefined,
          }),
        });

        let serverJobId: string | undefined;

        if (res.ok) {
          const body = await res.json().catch(() => null) as { id?: string } | null;
          serverJobId = body?.id;
        } else {
          const errBody = await res.json().catch(() => ({ error: `HTTP ${res.status}` })) as { error?: string };
          setError(`Could not create job: ${errBody.error ?? `HTTP ${res.status}`}`);
          return;
        }

        // Start the job, reusing the server-assigned ID so the sync queue's
        // ON CONFLICT DO NOTHING keeps exactly one row.
        const newJob = await startJob({
          existingId: serverJobId,
          customer:   result.job.customer  || undefined,
          site:       result.job.address !== "—" ? result.job.address : undefined,
          unitLabel:  result.job.unitTag  !== "—" ? result.job.unitTag  : undefined,
          title:      result.job.symptom  || result.title,
          metadata: {
            model:         result.job.model,
            equipment:     result.job.equipment,
            dispatchNotes: result.job.dispatchNotes,
            scheduledJobId: serverJobId,
            symptom:        result.job.symptom,
            address:        result.job.address,
            scheduledTime:  result.job.scheduledTime,
          },
        });

        navigate(`/job/${newJob.id}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(`Could not start job — ${msg}`);
      }
    },
    [getToken, startJob, navigate],
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
    const currentJobId = job?.id;
    await completeJob();
    if (currentJobId) {
      navigate(`/job/${currentJobId}/record`);
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

    // Dispatch phase: show pre-job brief until tech taps "I'm On Site"
    // (presence of an "arrived" event marks the transition to active)
    const hasArrived = events.some((e) => e.eventType === "arrived");
    if (!hasArrived) {
      return (
        <JobDispatchView
          job={job}
          unit={unitData}
          techName={user?.fullName ?? user?.firstName ?? ""}
          onStartJob={() => void handleOnSite()}
        />
      );
    }

    // Active phase: arrived event exists — show 2.0 dark timeline
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

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <>
      {error && (
        <div className="fixed top-4 inset-x-4 z-50 flex items-start gap-2 rounded-xl bg-red-950 border border-red-800 px-4 py-3 shadow-lg">
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      <JobsListScreen
        onStartNew={() => setModal({ type: "wizard" })}
        onResume={handleResume}
      />

      {modal.type === "wizard" && (
        <ScheduleJobWizard
          defaultDate={todayStr}
          onClose={() => setModal({ type: "none" })}
          onCreate={(result) => { void handleWizardCreated(result); }}
        />
      )}
    </>
  );
}
