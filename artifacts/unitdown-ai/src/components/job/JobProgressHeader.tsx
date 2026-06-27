/**
 * JobProgressHeader — persistent sticky header while a job is active.
 *
 * Shows: job identity (customer / site / unit), elapsed time,
 * event count, offline/sync status, and a Complete Job button.
 *
 * The OfflineStatusBar handles all 5 connectivity states:
 *   Online · Synced | Offline · Saving locally | Syncing… |
 *   N items pending | Sync failed · Tap to retry
 */

import { Clock, ListChecks, ChevronLeft, CheckCircle2 } from "lucide-react";
import { useJobMode } from "@/context/JobModeContext";
import { OfflineStatusBar, OfflineBanner } from "@/components/job/OfflineStatusBar";
import { Button } from "@/components/ui/button";

interface JobProgressHeaderProps {
  onBack: () => void;
  onComplete: () => void;
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function JobProgressHeader({ onBack, onComplete }: JobProgressHeaderProps) {
  const { job, events, elapsedSeconds } = useJobMode();

  if (!job) return null;

  const label = [job.unitLabel, job.customer, job.site].filter(Boolean).join(" · ") || "New Job";
  const eventCount = events.filter(
    (e) => e.eventType !== "dispatch" && e.eventType !== "completed",
  ).length;

  return (
    <div className="sticky top-0 z-30 bg-white/95 dark:bg-zinc-900/95 backdrop-blur border-b border-zinc-200 dark:border-zinc-800">
      {/* Offline banner — only visible when offline */}
      <OfflineBanner />

      {/* Main row */}
      <div className="flex items-center gap-2 px-3 h-14">
        {/* Back button */}
        <button
          onClick={onBack}
          className="p-1.5 -ml-1 rounded-lg text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          aria-label="Back to jobs"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Job identity */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate leading-tight">
            {label}
          </div>
          <div className="flex items-center gap-2.5 mt-0.5">
            {/* Elapsed time */}
            <span className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
              <Clock className="w-3 h-3" />
              {formatElapsed(elapsedSeconds)}
            </span>

            {/* Event count */}
            <span className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
              <ListChecks className="w-3 h-3" />
              {eventCount} {eventCount === 1 ? "event" : "events"}
            </span>

            {/* Connectivity + sync status */}
            <OfflineStatusBar />
          </div>
        </div>

        {/* Complete button */}
        <Button
          size="sm"
          onClick={onComplete}
          className="shrink-0 h-8 px-3 text-xs font-semibold rounded-lg bg-green-600 hover:bg-green-700 text-white flex items-center gap-1.5"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Complete
        </Button>
      </div>
    </div>
  );
}
