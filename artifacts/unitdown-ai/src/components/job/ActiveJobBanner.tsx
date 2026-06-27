import { useLocation } from "wouter";
import { ChevronRight, Briefcase } from "lucide-react";
import { useJobMode } from "@/context/JobModeContext";

function formatElapsed(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function ActiveJobBanner() {
  const { job, elapsedSeconds } = useJobMode();
  const [location, navigate] = useLocation();

  if (!job || job.status !== "active") return null;

  // Don't show on the active job session page itself (but do show on the record/service page)
  const isActiveSession =
    location.startsWith("/job/") && !location.endsWith("/record");
  if (isActiveSession) return null;

  const label =
    [job.unitLabel, job.customer].filter(Boolean).join(" · ") || "Active Job";

  return (
    <div className="fixed bottom-0 inset-x-0 z-40" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <button
        onClick={() => navigate(`/job/${job.id}`)}
        className="w-full flex items-center gap-3 px-4 py-3.5 bg-zinc-950 hover:bg-zinc-900 border-t border-zinc-800 transition-colors"
      >
        {/* Live pulse dot */}
        <div className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
        </div>

        {/* Job info */}
        <div className="flex-1 min-w-0 text-left">
          <div className="text-[10px] font-bold uppercase tracking-widest text-green-400 leading-none">
            Active Job
          </div>
          <div className="text-sm font-semibold text-white truncate mt-0.5 leading-none">
            {label}
          </div>
        </div>

        {/* Elapsed + Resume button */}
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="font-mono text-sm text-zinc-400">
            {formatElapsed(elapsedSeconds)}
          </span>
          <div className="flex items-center gap-1 bg-blue-600 rounded-lg px-2.5 py-1.5">
            <Briefcase className="w-3 h-3 text-white" />
            <span className="text-xs font-bold text-white">Resume</span>
            <ChevronRight className="w-3.5 h-3.5 text-white" />
          </div>
        </div>
      </button>
    </div>
  );
}
