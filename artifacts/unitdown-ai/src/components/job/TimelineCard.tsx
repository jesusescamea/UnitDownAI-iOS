/**
 * TimelineCard — a single expandable event in the job timeline.
 *
 * Designed so that future AI features can enrich any card automatically:
 * - Smart Photos: adds photo thumbnails via event.photoUrls
 * - AI enrichment: surfaces highlights from event.metadata
 * - Parts Assistant: renders event.parts in a structured card
 * - Measurements: formats event.measurements as a key/value table
 */

import { useState } from "react";
import {
  Mic, FileText, Ruler, Wrench, Star, ShieldCheck,
  FileCheck, Truck, MapPin, Cpu, Bell, Image,
  CheckCircle2, ChevronDown, ChevronUp, Trash2, Pencil,
  Clock,
} from "lucide-react";
import type { LocalEvent, EventType } from "@/context/JobModeContext";

// ─── Event metadata ────────────────────────────────────────────────────────────

interface EventMeta {
  icon: React.ComponentType<{ className?: string }>;
  color: string;        // Tailwind bg + text pair
  bgColor: string;
  label: string;
}

const EVENT_META: Record<EventType, EventMeta> = {
  dispatch:             { icon: Truck,       color: "text-blue-600",   bgColor: "bg-blue-50 dark:bg-blue-950",    label: "Dispatch" },
  arrived:              { icon: MapPin,       color: "text-emerald-600",bgColor: "bg-emerald-50 dark:bg-emerald-950", label: "Arrived" },
  equipment_identified: { icon: Cpu,          color: "text-violet-600", bgColor: "bg-violet-50 dark:bg-violet-950",label: "Equipment" },
  alarm_review:         { icon: Bell,         color: "text-amber-600",  bgColor: "bg-amber-50 dark:bg-amber-950",  label: "Alarm Review" },
  voice_note:           { icon: Mic,          color: "text-blue-600",   bgColor: "bg-blue-50 dark:bg-blue-950",    label: "Voice Note" },
  note:                 { icon: FileText,     color: "text-zinc-600",   bgColor: "bg-zinc-50 dark:bg-zinc-800",    label: "Note" },
  photo:                { icon: Image,        color: "text-purple-600", bgColor: "bg-purple-50 dark:bg-purple-950",label: "Photo" },
  measurement:          { icon: Ruler,        color: "text-cyan-600",   bgColor: "bg-cyan-50 dark:bg-cyan-950",    label: "Measurement" },
  part:                 { icon: Wrench,       color: "text-orange-600", bgColor: "bg-orange-50 dark:bg-orange-950",label: "Part" },
  recommendation:       { icon: Star,         color: "text-yellow-600", bgColor: "bg-yellow-50 dark:bg-yellow-950",label: "Recommendation" },
  verification:         { icon: ShieldCheck,  color: "text-green-600",  bgColor: "bg-green-50 dark:bg-green-950",  label: "Verification" },
  service_report:       { icon: FileCheck,    color: "text-indigo-600", bgColor: "bg-indigo-50 dark:bg-indigo-950",label: "Service Report" },
  completed:            { icon: CheckCircle2, color: "text-green-600",  bgColor: "bg-green-50 dark:bg-green-950",  label: "Completed" },
};

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

// ─── Component ────────────────────────────────────────────────────────────────

interface TimelineCardProps {
  event: LocalEvent;
  onEdit?: (event: LocalEvent) => void;
  onDelete?: (id: string) => void;
}

export function TimelineCard({ event, onEdit, onDelete }: TimelineCardProps) {
  const [expanded, setExpanded] = useState(false);
  const meta = EVENT_META[event.eventType] ?? EVENT_META.note;
  const Icon = meta.icon;

  const hasExpandable =
    !!event.notes ||
    !!event.voiceTranscript ||
    !!event.voiceCorrected ||
    (event.measurements && Object.keys(event.measurements).length > 0) ||
    (event.photoUrls && event.photoUrls.length > 0);

  return (
    <div className="relative pl-10 pr-4 py-1.5 group">
      {/* Timeline connector line (shown for all except last child) */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-zinc-200 dark:bg-zinc-700 group-last:hidden" />

      {/* Icon dot */}
      <div
        className={`absolute left-0 w-8 h-8 rounded-full flex items-center justify-center ${meta.bgColor} ring-2 ring-white dark:ring-zinc-900`}
        style={{ top: "12px" }}
      >
        <Icon className={`w-4 h-4 ${meta.color}`} />
      </div>

      {/* Card */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-700/70 bg-white dark:bg-zinc-800/60 overflow-hidden shadow-sm">
        {/* Card header — always visible */}
        <button
          className="w-full text-left px-4 py-3 flex items-start gap-2"
          onClick={() => hasExpandable && setExpanded((v) => !v)}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {event.title}
              </span>
              {!event._synced && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 font-medium border border-amber-200 dark:border-amber-800">
                  Saving…
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-0.5">
              <span className="flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500">
                <Clock className="w-3 h-3" />
                {formatTime(event.timestamp)}
              </span>
              <span className={`text-xs font-medium ${meta.color}`}>
                {meta.label}
              </span>
            </div>

            {/* Preview line: corrected transcript or notes (collapsed) */}
            {!expanded && (event.voiceCorrected || event.notes) && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1.5 line-clamp-2 leading-snug">
                {event.voiceCorrected || event.notes}
              </p>
            )}
          </div>

          {hasExpandable && (
            <span className="shrink-0 text-zinc-400 dark:text-zinc-500 pt-0.5">
              {expanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </span>
          )}
        </button>

        {/* Expanded detail */}
        {expanded && hasExpandable && (
          <div className="px-4 pb-4 border-t border-zinc-100 dark:border-zinc-700 space-y-3 pt-3">
            {/* Corrected transcript */}
            {event.voiceCorrected && (
              <div>
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-1">
                  HVAC Corrected
                </p>
                <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed">
                  {event.voiceCorrected}
                </p>
              </div>
            )}

            {/* Original transcript (if different from corrected) */}
            {event.voiceTranscript && event.voiceTranscript !== event.voiceCorrected && (
              <div>
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-1">
                  Original
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-500 leading-relaxed italic">
                  "{event.voiceTranscript}"
                </p>
              </div>
            )}

            {/* Notes */}
            {event.notes && (
              <div>
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-1">
                  Notes
                </p>
                <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap">
                  {event.notes}
                </p>
              </div>
            )}

            {/* Measurements */}
            {event.measurements && Object.keys(event.measurements).length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">
                  Measurements
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.entries(event.measurements).map(([k, v]) => (
                    <div
                      key={k}
                      className="rounded-lg bg-zinc-50 dark:bg-zinc-900 px-3 py-2"
                    >
                      <div className="text-[10px] text-zinc-400 uppercase tracking-wide">
                        {k}
                      </div>
                      <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 mt-0.5">
                        {v}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Photo thumbnails (Phase 2: placeholder) */}
            {event.photoUrls && event.photoUrls.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">
                  Photos ({event.photoUrls.length})
                </p>
                <div className="flex gap-2 flex-wrap">
                  {event.photoUrls.map((url, i) => (
                    <div
                      key={i}
                      className="w-16 h-16 rounded-lg bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center overflow-hidden"
                    >
                      <Image className="w-6 h-6 text-zinc-400" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action row */}
            <div className="flex items-center justify-end gap-2 pt-1">
              {onEdit && (
                <button
                  onClick={() => onEdit(event)}
                  className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors px-2 py-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
              )}
              {onDelete && event.eventType !== "dispatch" && event.eventType !== "completed" && (
                <button
                  onClick={() => onDelete(event.id)}
                  className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors px-2 py-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
