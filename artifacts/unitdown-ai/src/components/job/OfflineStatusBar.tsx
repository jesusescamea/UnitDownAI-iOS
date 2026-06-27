/**
 * OfflineStatusBar — compact connectivity + sync status pill.
 *
 * States (in priority order):
 *   offline   → "Offline · Saving locally"      (red)
 *   syncing   → "Syncing…"                       (blue, animated)
 *   error     → "Sync failed · Tap to retry"     (amber, tappable)
 *   pending   → "N items pending upload"         (amber)
 *   idle      → "Online · Synced"                (green)
 */

import { Cloud, CloudOff, Loader2, AlertTriangle, CheckCircle2, Upload } from "lucide-react";
import { useJobMode } from "@/context/JobModeContext";

export function OfflineStatusBar() {
  const { isOnline, syncStatus, pendingCount, retrySync } = useJobMode();

  if (!isOnline) {
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-red-500">
        <CloudOff className="w-3 h-3" />
        <span>Offline · Saving locally</span>
      </span>
    );
  }

  if (syncStatus === "syncing") {
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-blue-500">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>Syncing…</span>
      </span>
    );
  }

  if (syncStatus === "error") {
    return (
      <button
        onClick={retrySync}
        className="flex items-center gap-1 text-xs font-medium text-amber-500 hover:text-amber-700 transition-colors"
      >
        <AlertTriangle className="w-3 h-3" />
        <span>Sync failed · Tap to retry</span>
      </button>
    );
  }

  if (pendingCount > 0) {
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-amber-500">
        <Upload className="w-3 h-3" />
        <span>{pendingCount} pending</span>
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1 text-xs font-medium text-green-500">
      <Cloud className="w-3 h-3" />
      <span>Synced</span>
    </span>
  );
}

/** Standalone pill variant for use outside the job header (e.g. job list page). */
export function OfflinePill() {
  const { isOnline, pendingCount } = useJobMode();

  if (isOnline && pendingCount === 0) return null;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
      !isOnline
        ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400"
        : "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400"
    }`}>
      {!isOnline ? (
        <>
          <CloudOff className="w-3 h-3" />
          Offline
        </>
      ) : (
        <>
          <Upload className="w-3 h-3" />
          {pendingCount} pending
        </>
      )}
    </div>
  );
}

/** Subtle banner shown at the top of a page when offline. */
export function OfflineBanner() {
  const { isOnline } = useJobMode();

  if (isOnline) return null;

  return (
    <div className="flex items-center justify-center gap-2 bg-red-50 dark:bg-red-950/30 border-b border-red-200 dark:border-red-900 px-4 py-2">
      <CloudOff className="w-3.5 h-3.5 text-red-500 shrink-0" />
      <p className="text-xs text-red-700 dark:text-red-400 font-medium">
        No connection — all changes saved locally and will sync automatically when connection returns.
      </p>
    </div>
  );
}

/** Inline status for use on the job list page (non-active-job context). */
export function GlobalOfflineIndicator() {
  const { isOnline } = useJobMode();
  if (isOnline) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-red-500 font-medium">
      <CloudOff className="w-3 h-3" />
      Offline
    </span>
  );
}
