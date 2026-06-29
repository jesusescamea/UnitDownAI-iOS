/**
 * JobDispatchView — 2.0 production pre-job brief screen.
 *
 * Shown when a job exists but has no events yet (tech has not arrived on site).
 * Receives real LocalJob data from JobModeContext.
 * "I'm On Site" callback adds an `arrived` event in the parent and transitions
 * to JobActiveView.
 */
import { motion } from "framer-motion";
import {
  AlertTriangle, Clock, MapPin, Wind, ChevronRight,
  Building2, User, Briefcase,
} from "lucide-react";
import type { LocalJob } from "@/context/JobModeContext";

export interface JobUnitData {
  manufacturer: string | null;
  modelNumber: string | null;
  serialNumber: string | null;
  capacityTons: string | null;
  refrigerantType: string | null;
  location: string | null;
  voltage: string | null;
}

interface Props {
  job: LocalJob;
  unit: JobUnitData | null;
  techName: string;
  onStartJob: () => void;
}

export function JobDispatchView({ job, unit, techName, onStartJob }: Props) {
  const symptom =
    job.title ||
    ((job.metadata as Record<string, string> | null)?.symptom) ||
    "No symptom recorded";
  const customer = job.customer || job.site || "Customer";
  const site = job.site || "";
  const unitLabel = job.unitLabel || unit?.modelNumber || "";

  const makeModel =
    [unit?.manufacturer, unit?.modelNumber].filter(Boolean).join(" ") ||
    "Unknown equipment";
  const serial = unit?.serialNumber || "—";
  const capacity = unit?.capacityTons ? `${unit.capacityTons} Ton` : "—";
  const refrigerant = unit?.refrigerantType || "—";
  const locationStr = unit?.location || site || "—";

  const dateLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-gray-950 text-white overflow-y-auto pb-32">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 pt-12 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <Briefcase size={12} className="text-blue-400" />
          <span className="text-xs font-semibold uppercase tracking-widest text-blue-400">
            Job Ready
          </span>
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
        </div>
        <div className="text-xs text-gray-400 mb-0.5">{dateLabel}</div>
        <h1 className="text-2xl font-bold tracking-tight">{customer}</h1>
        {site && site !== customer && (
          <div className="flex items-center gap-1 text-gray-400 text-sm mt-0.5">
            <MapPin size={13} />
            <span>{site}</span>
          </div>
        )}
      </div>

      <div className="px-4 pt-5 space-y-4">
        {/* Symptom card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-red-950 border border-red-800 rounded-2xl p-4"
        >
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={15} className="text-red-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-red-400">
              Reported Symptom
            </span>
          </div>
          <p className="text-white font-medium text-base leading-snug">
            {symptom}
          </p>
        </motion.div>

        {/* Equipment card */}
        {unit && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3"
          >
            <div className="flex items-center gap-2 mb-1">
              <Wind size={15} className="text-blue-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">
                Equipment
              </span>
              {unitLabel && (
                <span className="ml-auto text-xs text-gray-500 font-medium">
                  {unitLabel}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-gray-500 text-xs mb-0.5">Make / Model</div>
                <div className="font-medium">{makeModel}</div>
              </div>
              <div>
                <div className="text-gray-500 text-xs mb-0.5">Serial</div>
                <div className="font-medium font-mono text-xs">{serial}</div>
              </div>
              <div>
                <div className="text-gray-500 text-xs mb-0.5">Capacity</div>
                <div className="font-medium">{capacity}</div>
              </div>
              <div>
                <div className="text-gray-500 text-xs mb-0.5">Refrigerant</div>
                <div className="font-medium">{refrigerant}</div>
              </div>
              <div>
                <div className="text-gray-500 text-xs mb-0.5">Location</div>
                <div className="font-medium">{locationStr}</div>
              </div>
              {unit.voltage && (
                <div>
                  <div className="text-gray-500 text-xs mb-0.5">Voltage</div>
                  <div className="font-medium">{unit.voltage}</div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* No unit linked */}
        {!unit && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-900 border border-gray-800 rounded-2xl p-4"
          >
            <div className="flex items-center gap-2 mb-1">
              <Wind size={15} className="text-gray-500" />
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Equipment
              </span>
            </div>
            <p className="text-gray-500 text-sm">
              No unit linked to this job. Capture the nameplate when you arrive.
            </p>
          </motion.div>
        )}

        {/* Site / tech info */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex gap-3"
        >
          <div className="flex-1 bg-gray-900 border border-gray-800 rounded-2xl p-3 flex items-center gap-2">
            <User size={16} className="text-blue-400" />
            <div>
              <div className="text-xs text-gray-500">Tech</div>
              <div className="font-semibold text-sm truncate">
                {techName || "You"}
              </div>
            </div>
          </div>
          <div className="flex-1 bg-gray-900 border border-gray-800 rounded-2xl p-3 flex items-center gap-2">
            <Building2 size={16} className="text-green-400" />
            <div>
              <div className="text-xs text-gray-500">Site</div>
              <div className="font-semibold text-sm truncate">
                {site || customer}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-950 via-gray-950 to-transparent pt-8">
        <motion.button
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.25 }}
          onClick={onStartJob}
          whileTap={{ scale: 0.97 }}
          className="w-full bg-white text-gray-950 font-bold text-lg py-5 rounded-2xl flex items-center justify-center gap-2 shadow-2xl"
        >
          <span>I'm On Site</span>
          <ChevronRight size={20} />
        </motion.button>
        <div className="text-center mt-2 flex items-center justify-center gap-1.5 text-gray-500 text-xs">
          <Clock size={11} />
          <span>Starts job timer · Logs arrival · Loads measurement templates</span>
        </div>
      </div>
    </div>
  );
}
