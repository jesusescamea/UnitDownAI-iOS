/**
 * JobFAB — Floating Action Button + Action Sheet.
 *
 * Always visible while Job Mode is active. One tap opens an action sheet
 * with 6 quick actions. Every action immediately creates a timeline event.
 *
 * Phase 1 functional: Voice Note, Note, Measurement
 * Phase 2 stubs: Photo, Upload Photo
 * Phase 3 stubs: Part
 *
 * Extension: add new EventType entries here + matching modal to unlock.
 */

import { useState } from "react";
import { Plus, X, Mic, FileText, Ruler, Wrench, Image, Camera } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export type FABAction = "voice_note" | "note" | "measurement" | "photo" | "upload" | "part";

interface ActionItem {
  id: FABAction;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
  bg: string;
  comingSoon?: boolean;
}

const ACTIONS: ActionItem[] = [
  {
    id: "voice_note",
    icon: Mic,
    label: "Voice Note",
    color: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800",
  },
  {
    id: "photo",
    icon: Camera,
    label: "Photo",
    color: "text-purple-500",
    bg: "bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800",
    comingSoon: true,
  },
  {
    id: "upload",
    icon: Image,
    label: "Upload",
    color: "text-violet-500",
    bg: "bg-violet-50 dark:bg-violet-950 border-violet-200 dark:border-violet-800",
    comingSoon: true,
  },
  {
    id: "measurement",
    icon: Ruler,
    label: "Measurement",
    color: "text-cyan-600",
    bg: "bg-cyan-50 dark:bg-cyan-950 border-cyan-200 dark:border-cyan-800",
  },
  {
    id: "part",
    icon: Wrench,
    label: "Part",
    color: "text-orange-500",
    bg: "bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800",
    comingSoon: true,
  },
  {
    id: "note",
    icon: FileText,
    label: "Note",
    color: "text-zinc-600",
    bg: "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700",
  },
];

interface JobFABProps {
  onAction: (action: FABAction) => void;
}

export function JobFAB({ onAction }: JobFABProps) {
  const [open, setOpen] = useState(false);

  const handleAction = (action: ActionItem) => {
    if (action.comingSoon) return;
    setOpen(false);
    onAction(action.id);
  };

  return (
    <>
      {/* Backdrop (closes sheet when tapped) */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="fab-backdrop"
            className="fixed inset-0 z-40 bg-black/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Action sheet */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="fab-sheet"
            className="fixed bottom-24 inset-x-4 z-50 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-2xl overflow-hidden"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Quick Action
              </p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                Every action immediately adds to the timeline
              </p>
            </div>

            <div className="grid grid-cols-3 gap-0 divide-x divide-y divide-zinc-100 dark:divide-zinc-800">
              {ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    className={`relative flex flex-col items-center gap-2 py-5 px-3 transition-colors ${
                      action.comingSoon
                        ? "opacity-40 cursor-not-allowed"
                        : "active:bg-zinc-50 dark:active:bg-zinc-800/80"
                    }`}
                    onClick={() => handleAction(action)}
                    disabled={action.comingSoon}
                  >
                    <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${action.bg}`}>
                      <Icon className={`w-5 h-5 ${action.color}`} />
                    </div>
                    <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 leading-tight text-center">
                      {action.label}
                    </span>
                    {action.comingSoon && (
                      <span className="absolute top-2 right-2 text-[9px] font-semibold text-zinc-400 bg-zinc-100 dark:bg-zinc-700 px-1 py-0.5 rounded">
                        Soon
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB button */}
      <motion.button
        className="fixed bottom-6 right-5 z-50 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-lg shadow-blue-600/40 flex items-center justify-center transition-colors"
        onClick={() => setOpen((v) => !v)}
        whileTap={{ scale: 0.92 }}
        aria-label="Quick action"
      >
        <motion.div
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.15 }}
        >
          {open ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
        </motion.div>
      </motion.button>
    </>
  );
}
