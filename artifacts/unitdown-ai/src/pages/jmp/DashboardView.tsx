import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Thermometer, Clock, MapPin, AlertTriangle, ChevronRight, X, Wrench, Calendar, Phone, Star } from 'lucide-react';
import { TODAY_JOBS, FOLLOW_UP_ITEMS, MOCK_HISTORY, MOCK_EQUIPMENT, type TodayJob } from './mockData';

interface Props {
  onStartJob: () => void;
}

const PRIORITY_STYLE = {
  emergency: { border: 'border-l-red-500', badge: 'bg-red-500 text-white', label: 'EMERGENCY' },
  high:      { border: 'border-l-amber-500', badge: 'bg-amber-500 text-white', label: 'HIGH PRIORITY' },
  normal:    { border: 'border-l-blue-500', badge: 'bg-blue-600/30 text-blue-300', label: 'SERVICE' },
  pm:        { border: 'border-l-gray-600', badge: 'bg-gray-700 text-gray-300', label: 'PM DUE' },
};

const FOLLOW_UP_PRIORITY = {
  high:   'text-amber-400 bg-amber-950/50',
  medium: 'text-blue-400 bg-blue-950/50',
  low:    'text-gray-400 bg-gray-800',
};

export function DashboardView({ onStartJob }: Props) {
  const [selectedJob, setSelectedJob] = useState<TodayJob | null>(null);
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  const openJobs = TODAY_JOBS.filter(j => j.status === 'open').length;
  const pmJobs = TODAY_JOBS.filter(j => j.priority === 'pm').length;

  return (
    <div className="min-h-screen bg-gray-950 text-white overflow-y-auto pb-6">
      {/* Header */}
      <div className="bg-gray-900 px-4 pt-12 pb-4 border-b border-gray-800">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-gray-400 text-xs mb-0.5">Good morning,</div>
            <h1 className="text-xl font-bold">Marcus Rivera</h1>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
              <span>{now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
              <span className="text-gray-700">·</span>
              <span>{timeStr}</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-full bg-blue-700 flex items-center justify-center font-bold text-white text-base flex-shrink-0">
            MR
          </div>
        </div>

        {/* Weather + conditions */}
        <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
          <div className="flex items-center gap-1">
            <Thermometer size={12} className="text-orange-400" />
            <span>91°F · Partly Cloudy</span>
          </div>
          <div className="flex items-center gap-1">
            <span>💧</span>
            <span>Humidity 62%</span>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-4 gap-px bg-gray-800 border-b border-gray-800">
        {[
          { label: 'Jobs Today', value: String(TODAY_JOBS.length), color: 'text-white' },
          { label: 'In Progress', value: '0', color: 'text-gray-400' },
          { label: 'PMs Due', value: String(pmJobs), color: 'text-blue-400' },
          { label: 'Follow-ups', value: String(FOLLOW_UP_ITEMS.length), color: 'text-amber-400' },
        ].map(s => (
          <div key={s.label} className="bg-gray-950 px-3 py-3 text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[9px] text-gray-600 mt-0.5 uppercase tracking-wider font-medium">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="px-4 pt-5 space-y-5">
        {/* Today's Jobs */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">Today's Jobs</h2>
            <span className="text-xs text-gray-600">{openJobs} open</span>
          </div>
          <div className="space-y-2">
            {TODAY_JOBS.map((job, i) => {
              const style = PRIORITY_STYLE[job.priority];
              return (
                <motion.button
                  key={job.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  onClick={() => setSelectedJob(job)}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full bg-gray-900 border border-gray-800 border-l-4 ${style.border} rounded-r-2xl rounded-bl-2xl p-4 text-left`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${style.badge}`}>{style.label}</span>
                        <span className="text-[10px] font-mono text-gray-600">{job.id}</span>
                        <span className="text-[10px] text-gray-600 ml-auto">{job.scheduledTime}</span>
                      </div>
                      <div className="font-bold text-white text-sm leading-snug truncate">{job.equipment}</div>
                      <div className="text-xs text-gray-400 mt-0.5 truncate">{job.customer}</div>
                      <div className="text-xs text-gray-500 mt-1 leading-snug line-clamp-2">{job.symptom}</div>
                      {job.techNote && (
                        <div className="mt-1.5 text-[10px] text-amber-400/80 bg-amber-950/30 rounded-lg px-2 py-1 border border-amber-900/30">
                          💡 {job.techNote}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <ChevronRight size={16} className="text-gray-600" />
                      <div className="flex items-center gap-1 text-[10px] text-gray-500">
                        <MapPin size={9} />
                        <span>{job.driveTime}</span>
                      </div>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Emergency Call button */}
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="w-full flex items-center justify-between bg-red-950/40 border border-red-800 rounded-2xl px-4 py-3.5"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-700 rounded-xl flex items-center justify-center flex-shrink-0">
              <Phone size={15} className="text-white" />
            </div>
            <div className="text-left">
              <div className="font-bold text-sm text-white">Emergency Call</div>
              <div className="text-xs text-red-400/70">Start unscheduled emergency job</div>
            </div>
          </div>
          <ChevronRight size={16} className="text-red-600" />
        </motion.button>

        {/* Follow-ups needing attention */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">Needs Follow-Up</h2>
          </div>
          <div className="space-y-2">
            {FOLLOW_UP_ITEMS.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.06 }}
                className="bg-gray-900 border border-gray-800 rounded-2xl p-3.5 flex items-start gap-3"
              >
                <div className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 mt-0.5 uppercase tracking-wider ${FOLLOW_UP_PRIORITY[item.priority]}`}>
                  {item.priority}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-white truncate">{item.customer} · {item.equipment}</div>
                  <div className="text-xs text-gray-400 mt-0.5 leading-relaxed">{item.issue}</div>
                </div>
                <div className="flex flex-col items-end flex-shrink-0">
                  <div className={`text-[9px] font-mono ${item.daysDue <= 14 ? 'text-amber-400' : 'text-gray-500'}`}>
                    {item.daysDue}d
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Recent completed */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">Recent Completed</h2>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            {[
              { id: 'USR-2026-004920', customer: 'Parkway Medical', equipment: 'AHU-5', date: 'Yesterday', score: 94 },
              { id: 'USR-2026-004919', customer: 'Lakeside Tower', equipment: 'RTU-2', date: 'Jun 25', score: 88 },
            ].map((r, i) => (
              <div key={i} className={`flex items-center gap-3 px-4 py-3 ${i === 0 ? 'border-b border-gray-800' : ''}`}>
                <div className="w-8 h-8 rounded-xl bg-green-900/40 flex items-center justify-center flex-shrink-0">
                  <Star size={13} className="text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-white truncate">{r.customer} · {r.equipment}</div>
                  <div className="text-[10px] font-mono text-gray-600">{r.id}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-[10px] text-green-400 font-bold">{r.score}%</div>
                  <div className="text-[9px] text-gray-600">{r.date}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Job Detail Sheet */}
      <AnimatePresence>
        {selectedJob && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-40 flex items-end"
            onClick={() => setSelectedJob(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 35 }}
              className="w-full bg-gray-900 rounded-t-3xl border-t border-gray-800 max-h-[88vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="px-5 pt-5 pb-4 border-b border-gray-800 flex items-start justify-between">
                <div>
                  <div className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full inline-flex mb-2 ${PRIORITY_STYLE[selectedJob.priority].badge}`}>
                    {PRIORITY_STYLE[selectedJob.priority].label}
                  </div>
                  <div className="text-xs font-mono text-gray-500 mb-1">{selectedJob.id}</div>
                  <h2 className="text-lg font-bold text-white leading-tight">{selectedJob.equipment}</h2>
                  <div className="text-sm text-gray-400">{selectedJob.customer}</div>
                </div>
                <button onClick={() => setSelectedJob(null)} className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center mt-1 flex-shrink-0">
                  <X size={16} className="text-gray-400" />
                </button>
              </div>

              <div className="px-5 py-4 space-y-4">
                {/* Details */}
                <div className="space-y-2">
                  <DetailRow icon={<AlertTriangle size={13} className="text-amber-400" />} label="Symptom" value={selectedJob.symptom} />
                  <DetailRow icon={<MapPin size={13} className="text-blue-400" />} label="Address" value={selectedJob.address} />
                  <DetailRow icon={<Clock size={13} className="text-gray-400" />} label="Scheduled" value={selectedJob.scheduledTime} />
                  <DetailRow icon={<MapPin size={13} className="text-green-400" />} label="Drive time" value={selectedJob.driveTime} />
                </div>

                {/* Equipment data for RTU-3 */}
                {selectedJob.isPrototype && (
                  <div className="bg-gray-800 rounded-2xl p-4">
                    <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
                      <Wrench size={12} /> Equipment Details
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {[
                        ['Model', MOCK_EQUIPMENT.model],
                        ['Serial', MOCK_EQUIPMENT.serial],
                        ['Refrigerant', MOCK_EQUIPMENT.refrigerant],
                        ['Capacity', MOCK_EQUIPMENT.capacity],
                      ].map(([l, v]) => (
                        <div key={l}>
                          <div className="text-gray-500">{l}</div>
                          <div className="font-mono font-semibold text-white">{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* History for RTU-3 */}
                {selectedJob.isPrototype && (
                  <div className="bg-gray-800 rounded-2xl p-4">
                    <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
                      <Calendar size={12} /> Service History
                    </div>
                    <div className="space-y-2">
                      {MOCK_HISTORY.map((h, i) => (
                        <div key={i} className="flex gap-2 text-xs">
                          <span className="text-gray-500 flex-shrink-0 w-16">{h.date}</span>
                          <span className="text-gray-300 leading-relaxed">{h.summary}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedJob.techNote && (
                  <div className="bg-amber-950/30 border border-amber-800 rounded-2xl p-3 text-sm text-amber-200">
                    💡 {selectedJob.techNote}
                  </div>
                )}

                {/* Start button */}
                {selectedJob.isPrototype ? (
                  <button
                    onClick={onStartJob}
                    className="w-full bg-white text-gray-950 font-bold text-lg py-5 rounded-2xl flex items-center justify-center gap-2 mt-2"
                  >
                    <span>Start Job</span>
                    <ChevronRight size={20} />
                  </button>
                ) : (
                  <div className="w-full bg-gray-800 text-gray-500 font-semibold py-5 rounded-2xl text-center text-sm">
                    Full prototype workflow: JM-2026-0047 only
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 flex-shrink-0">{icon}</div>
      <div>
        <div className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">{label}</div>
        <div className="text-sm text-white leading-snug">{value}</div>
      </div>
    </div>
  );
}
