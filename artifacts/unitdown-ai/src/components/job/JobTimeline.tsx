/**
 * JobTimeline — the chronological event list for an active job session.
 *
 * Empty state encourages action. Events are rendered bottom-up (newest
 * at the bottom) so the most recent action is always in view, just above
 * the FAB.
 */

import { useRef, useEffect } from "react";
import { Radio } from "lucide-react";
import { TimelineCard } from "./TimelineCard";
import { useJobMode, type LocalEvent } from "@/context/JobModeContext";

interface JobTimelineProps {
  onEditEvent?: (event: LocalEvent) => void;
}

export function JobTimeline({ onEditEvent }: JobTimelineProps) {
  const { events, removeEvent } = useJobMode();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when a new event is added
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events.length]);

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center mb-4">
          <Radio className="w-7 h-7 text-blue-400" />
        </div>
        <h3 className="text-base font-semibold text-zinc-700 dark:text-zinc-300">
          Timeline is empty
        </h3>
        <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-1.5 max-w-xs leading-relaxed">
          Tap <span className="font-semibold text-blue-500">+</span> to add your first action — voice note, measurement, photo, or anything that happened on this call.
        </p>
      </div>
    );
  }

  return (
    <div className="py-4">
      <div className="relative">
        {events.map((event) => (
          <TimelineCard
            key={event.id}
            event={event}
            onEdit={onEditEvent}
            onDelete={removeEvent}
          />
        ))}
        <div ref={bottomRef} className="h-28" />  {/* Spacer so FAB never covers last card */}
      </div>
    </div>
  );
}
