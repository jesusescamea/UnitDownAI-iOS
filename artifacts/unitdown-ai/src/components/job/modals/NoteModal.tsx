/**
 * NoteModal — quick text note that adds to the job timeline.
 *
 * Clean and fast. One textarea, one button. No friction.
 * Future: AI Polish button will call /api/ai/polish to clean up the note.
 */

import { useState } from "react";
import { X, FileText, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useJobMode } from "@/context/JobModeContext";

interface NoteModalProps {
  onClose: () => void;
  /** Pre-fill if editing an existing note */
  initialText?: string;
  eventIdToUpdate?: string;
}

export function NoteModal({ onClose, initialText, eventIdToUpdate }: NoteModalProps) {
  const { addEvent, updateEvent } = useJobMode();
  const [text, setText] = useState(initialText ?? "");

  const handleAdd = () => {
    if (!text.trim()) return;
    const firstLine = text.trim().split("\n")[0] ?? "";
    const title = (firstLine.slice(0, 80) || "Note").trim();

    if (eventIdToUpdate) {
      updateEvent(eventIdToUpdate, { notes: text.trim(), title });
    } else {
      addEvent({ eventType: "note", title, notes: text.trim() });
    }
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-white dark:bg-zinc-900 shadow-2xl safe-area-pb">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
              <FileText className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
            </div>
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
              {eventIdToUpdate ? "Edit Note" : "Add Note"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 pb-6">
          <Textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            className="text-base resize-none leading-relaxed"
            placeholder="What happened? What did you observe? What did you do?

Examples:
• Found broken belt on drive side
• Checked alarm history — 3 strikes on blower
• Recommend replacing pulley next visit"
          />

          <div className="flex gap-3 mt-4">
            <Button variant="outline" className="flex-1 h-11" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="flex-1 h-11 bg-zinc-800 hover:bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white text-white"
              onClick={handleAdd}
              disabled={!text.trim()}
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              {eventIdToUpdate ? "Save Note" : "Add Note"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
