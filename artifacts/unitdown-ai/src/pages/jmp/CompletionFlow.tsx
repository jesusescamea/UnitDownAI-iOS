import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Circle, ChevronRight, Sparkles } from 'lucide-react';
import { MOCK_JOB } from './mockData';
import type { PrototypeState, PrototypeAction } from './types';

interface Props {
  state: PrototypeState;
  dispatch: React.Dispatch<PrototypeAction>;
  onShowRecord: () => void;
}

type CeremonyStep = 'checklist' | 'generating' | 'complete';

const CEREMONY_STEPS = [
  { label: 'Reviewing your timeline...', duration: 1800 },
  { label: 'Assigning permanent USR...', duration: 1200 },
  { label: 'AI building service summary...', duration: 2200 },
  { label: 'Updating equipment memory...', duration: 1000 },
  { label: 'Notifying office...', duration: 800 },
];

export function CompletionFlow({ state, dispatch, onShowRecord }: Props) {
  const [step, setStep] = useState<CeremonyStep>('checklist');
  const [ceremonyIndex, setCeremonyIndex] = useState(0);
  const [ceremonyDone, setCeremonyDone] = useState(false);

  const hasNameplate = state.activities.some(a => a.type === 'nameplate');
  const hasAlarm = state.activities.some(a => a.type === 'alarm');
  const hasMeasurements = state.activities.some(a => a.type === 'measurement');
  const hasRepair = state.parts.length > 0 || state.activities.some(a => a.type === 'part');
  const hasPhoto = state.activities.some(a => a.type === 'photo');
  const hasVerification = state.activities.some(a => a.type === 'verification');
  const hasRecommendations = state.recommendations.length > 0;

  const checklist = [
    { label: 'Nameplate captured', done: hasNameplate },
    { label: 'Alarm documented', done: hasAlarm },
    { label: 'Initial measurements', done: hasMeasurements },
    { label: 'Repair documented', done: hasRepair },
    { label: 'Repair photo', done: hasPhoto },
    { label: 'Verification measurements', done: hasVerification },
    { label: 'Recommendations added', done: hasRecommendations },
    { label: 'Customer summary reviewed', done: state.jobState === 'CUSTOMER_REVIEWED' },
  ];

  const doneCount = checklist.filter(c => c.done).length;
  const score = Math.round((doneCount / checklist.length) * 100);

  function startCeremony() {
    setStep('generating');
  }

  useEffect(() => {
    if (step !== 'generating') return;
    if (ceremonyIndex >= CEREMONY_STEPS.length) {
      const t = setTimeout(() => setCeremonyDone(true), 400);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setCeremonyIndex(i => i + 1);
    }, CEREMONY_STEPS[ceremonyIndex].duration);
    return () => clearTimeout(t);
  }, [step, ceremonyIndex]);

  if (step === 'checklist') {
    return (
      <div className="min-h-screen bg-gray-950 text-white overflow-y-auto pb-32">
        <div className="bg-gray-900 px-4 pt-12 pb-5 border-b border-gray-800">
          <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Almost Done</div>
          <h1 className="text-2xl font-bold">Complete Job</h1>
          <p className="text-gray-400 text-sm mt-1">Review your record before generating the USR.</p>
        </div>

        <div className="px-4 py-5 space-y-4">
          {/* Score */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-900 border border-gray-800 rounded-2xl p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-4xl font-bold text-white">{score}%</div>
                <div className="text-sm text-gray-400 mt-0.5">Record completeness</div>
              </div>
              <div className="text-right">
                <div className={`text-sm font-bold ${score >= 85 ? 'text-green-400' : score >= 65 ? 'text-amber-400' : 'text-red-400'}`}>
                  {score >= 85 ? '✓ Office Ready' : score >= 65 ? '⚠ Mostly Complete' : '✗ Needs More'}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{doneCount} of {checklist.length} items</div>
              </div>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${score >= 85 ? 'bg-green-500' : score >= 65 ? 'bg-amber-500' : 'bg-red-500'}`}
                initial={{ width: 0 }}
                animate={{ width: `${score}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </motion.div>

          {/* Checklist */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden"
          >
            {checklist.map((item, i) => (
              <div key={i} className={`flex items-center gap-3 px-4 py-3.5 ${i < checklist.length - 1 ? 'border-b border-gray-800' : ''}`}>
                {item.done ? (
                  <CheckCircle size={18} className="text-green-500 flex-shrink-0" />
                ) : (
                  <Circle size={18} className="text-gray-600 flex-shrink-0" />
                )}
                <span className={`text-sm ${item.done ? 'text-white' : 'text-gray-500'}`}>{item.label}</span>
                {!item.done && (
                  <span className="ml-auto text-xs text-gray-600">Optional</span>
                )}
              </div>
            ))}
          </motion.div>

          {/* Job info */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-2"
          >
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Work Order</span>
              <span className="font-mono font-medium">{MOCK_JOB.id}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Equipment</span>
              <span className="font-medium">{MOCK_JOB.equipmentShort}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Activities logged</span>
              <span className="font-medium">{state.activities.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Parts installed</span>
              <span className="font-medium">{state.parts.length || 3}</span>
            </div>
          </motion.div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-950 via-gray-950 to-transparent pt-8 space-y-2">
          <motion.button
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            onClick={startCeremony}
            whileTap={{ scale: 0.97 }}
            className="w-full bg-white text-gray-950 font-bold text-lg py-5 rounded-2xl flex items-center justify-center gap-2 shadow-2xl"
          >
            <Sparkles size={20} />
            <span>Generate Service Record</span>
          </motion.button>
          <div className="text-center text-xs text-gray-600">
            Permanent USR · Equipment memory updated · Office notified
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-6">
      <AnimatePresence mode="wait">
        {!ceremonyDone ? (
          <motion.div
            key="generating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center w-full max-w-sm"
          >
            {/* Pulsing ring */}
            <div className="relative mx-auto mb-8 w-24 h-24">
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-white/20"
                animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.1, 0.4] }}
                transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
              />
              <motion.div
                className="absolute inset-2 rounded-full border-2 border-white/40"
                animate={{ scale: [1, 1.1, 1], opacity: [0.6, 0.2, 0.6] }}
                transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut', delay: 0.2 }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles size={32} className="text-white" />
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-3 mb-8">
              {CEREMONY_STEPS.map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: i <= ceremonyIndex ? 1 : 0.2, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${i < ceremonyIndex ? 'bg-green-500' : i === ceremonyIndex ? 'bg-white' : 'bg-gray-800'}`}>
                    {i < ceremonyIndex && <span className="text-xs text-white">✓</span>}
                    {i === ceremonyIndex && (
                      <motion.div
                        className="w-2 h-2 rounded-full bg-gray-900"
                        animate={{ scale: [1, 0.5, 1] }}
                        transition={{ repeat: Infinity, duration: 0.8 }}
                      />
                    )}
                  </div>
                  <span className={`text-sm ${i < ceremonyIndex ? 'text-green-400' : i === ceremonyIndex ? 'text-white font-medium' : 'text-gray-600'}`}>
                    {s.label}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="text-center w-full max-w-sm"
          >
            {/* USR Badge */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }}
              className="mx-auto mb-6 w-20 h-20 rounded-full bg-green-500 flex items-center justify-center shadow-2xl shadow-green-500/30"
            >
              <CheckCircle size={40} className="text-white" strokeWidth={2.5} />
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <div className="text-xs font-bold uppercase tracking-widest text-green-400 mb-2">Office Ready</div>
              <h2 className="text-3xl font-bold mb-1">Job Complete</h2>
              <div className="font-mono text-xl font-bold text-orange-400 mb-2">{MOCK_JOB.usrId}</div>
              <p className="text-gray-400 text-sm mb-8">Permanent service record generated · Equipment memory updated</p>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="grid grid-cols-3 gap-3 mb-8"
            >
              {[
                { label: 'Activities', value: String(state.activities.length) },
                { label: 'Parts', value: String(state.parts.length || 3) },
                { label: 'Record', value: '97%' },
              ].map((s, i) => (
                <div key={i} className="bg-gray-900 rounded-2xl p-3 border border-gray-800">
                  <div className="text-2xl font-bold text-white">{s.value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                </div>
              ))}
            </motion.div>

            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              onClick={onShowRecord}
              whileTap={{ scale: 0.97 }}
              className="w-full bg-white text-gray-950 font-bold text-lg py-5 rounded-2xl flex items-center justify-center gap-2"
            >
              <span>View Service Record</span>
              <ChevronRight size={20} />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
