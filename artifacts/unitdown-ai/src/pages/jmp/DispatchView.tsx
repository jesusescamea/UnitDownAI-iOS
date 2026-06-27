import { motion } from 'framer-motion';
import { AlertTriangle, Clock, MapPin, Thermometer, Wind, ChevronRight, Building2, Calendar, User, Zap } from 'lucide-react';
import { MOCK_JOB, MOCK_EQUIPMENT, MOCK_HISTORY } from './mockData';

interface Props {
  onStartJob: () => void;
}

export function DispatchView({ onStartJob }: Props) {
  return (
    <div className="min-h-screen bg-gray-950 text-white overflow-y-auto pb-32">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 pt-12 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold uppercase tracking-widest text-orange-400">HIGH PRIORITY</span>
          <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
        </div>
        <div className="text-xs text-gray-400 mb-0.5">Dispatched by {MOCK_JOB.dispatcher} at {MOCK_JOB.dispatchTime}</div>
        <h1 className="text-2xl font-bold tracking-tight">{MOCK_JOB.customer}</h1>
        <div className="flex items-center gap-1 text-gray-400 text-sm mt-0.5">
          <MapPin size={13} />
          <span>{MOCK_JOB.address}</span>
        </div>
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
            <span className="text-xs font-semibold uppercase tracking-wider text-red-400">Reported Symptom</span>
          </div>
          <p className="text-white font-medium text-base leading-snug">{MOCK_JOB.symptom}</p>
        </motion.div>

        {/* Equipment card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3"
        >
          <div className="flex items-center gap-2 mb-1">
            <Wind size={15} className="text-blue-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">Equipment</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <div className="text-gray-500 text-xs">Make / Model</div>
              <div className="font-medium">{MOCK_EQUIPMENT.make}</div>
              <div className="text-gray-400 text-xs">{MOCK_EQUIPMENT.model}</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs">Serial</div>
              <div className="font-medium font-mono">{MOCK_EQUIPMENT.serial}</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs">Capacity</div>
              <div className="font-medium">{MOCK_EQUIPMENT.capacity}</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs">Refrigerant</div>
              <div className="font-medium">{MOCK_EQUIPMENT.refrigerant}</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs">Location</div>
              <div className="font-medium">{MOCK_EQUIPMENT.location}</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs">Age</div>
              <div className="font-medium">{MOCK_EQUIPMENT.age}</div>
            </div>
          </div>
        </motion.div>

        {/* Pre-job briefing */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-amber-950 border border-amber-800 rounded-2xl p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <Zap size={15} className="text-amber-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">Pre-Job Briefing</span>
          </div>
          <div className="space-y-1.5 text-sm">
            <p className="text-amber-100 font-medium">Code 82 (High Pressure) appeared on 2 of last 3 visits.</p>
            <p className="text-amber-200/70">Previous tech noted condenser coil restriction — cleaning recommended but not completed.</p>
            <p className="text-amber-200/70">Belt replaced 14 months ago on last PM visit.</p>
          </div>
        </motion.div>

        {/* History */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-900 border border-gray-800 rounded-2xl p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={15} className="text-gray-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Service History</span>
          </div>
          <div className="space-y-3">
            {MOCK_HISTORY.map((h, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-1 rounded-full bg-gray-700 flex-shrink-0 self-stretch" />
                <div className="flex-1 pb-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold text-gray-300">{h.date}</span>
                    <span className="text-xs text-gray-500">· {h.tech}</span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">{h.summary}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Conditions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="flex gap-3"
        >
          <div className="flex-1 bg-gray-900 border border-gray-800 rounded-2xl p-3 flex items-center gap-2">
            <Thermometer size={16} className="text-orange-400" />
            <div>
              <div className="text-xs text-gray-500">Outdoor Temp</div>
              <div className="font-semibold text-sm">91°F</div>
            </div>
          </div>
          <div className="flex-1 bg-gray-900 border border-gray-800 rounded-2xl p-3 flex items-center gap-2">
            <User size={16} className="text-blue-400" />
            <div>
              <div className="text-xs text-gray-500">Tech</div>
              <div className="font-semibold text-sm">{MOCK_JOB.technician}</div>
            </div>
          </div>
          <div className="flex-1 bg-gray-900 border border-gray-800 rounded-2xl p-3 flex items-center gap-2">
            <Building2 size={16} className="text-green-400" />
            <div>
              <div className="text-xs text-gray-500">Site</div>
              <div className="font-semibold text-sm truncate">Medical</div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Start Job Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-950 via-gray-950 to-transparent pt-8">
        <motion.button
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          onClick={onStartJob}
          whileTap={{ scale: 0.97 }}
          className="w-full bg-white text-gray-950 font-bold text-lg py-5 rounded-2xl flex items-center justify-center gap-2 shadow-2xl"
        >
          <span>I'm On Site</span>
          <ChevronRight size={20} />
        </motion.button>
        <div className="text-center mt-2 flex items-center justify-center gap-1.5 text-gray-500 text-xs">
          <Clock size={11} />
          <span>Starts job timer · Logs arrival time · Loads measurement templates</span>
        </div>
      </div>
    </div>
  );
}
