import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Mic, Plus, X, ChevronDown, ChevronUp, Zap, FileText, Wrench, CheckSquare, User, Cpu, CheckCircle } from 'lucide-react';
import { MOCK_JOB, MOCK_EQUIPMENT, INITIAL_MEASUREMENTS, SUGGESTED_RECOMMENDATIONS, FAULT_CODES, JOB_STATE_LABELS } from './mockData';
import type { PrototypeState, PrototypeAction, JobState, Activity, MeasurementReading, ModalType } from './types';

const ACTIVITY_COLORS: Record<string, { border: string; bg: string; label: string; icon: string }> = {
  arrival:        { border: 'border-gray-600',    bg: 'bg-gray-900',        label: 'text-gray-300',   icon: '📍' },
  nameplate:      { border: 'border-blue-600',    bg: 'bg-blue-950/50',     label: 'text-blue-400',   icon: '🔖' },
  alarm:          { border: 'border-red-600',      bg: 'bg-red-950/50',      label: 'text-red-400',    icon: '⚡' },
  voice:          { border: 'border-purple-600',  bg: 'bg-purple-950/50',   label: 'text-purple-400', icon: '🎤' },
  measurement:    { border: 'border-green-600',   bg: 'bg-green-950/50',    label: 'text-green-400',  icon: '📈' },
  verification:   { border: 'border-green-500',   bg: 'bg-green-950/50',    label: 'text-green-300',  icon: '✅' },
  'ai-suggestion':{ border: 'border-blue-500',    bg: 'bg-blue-950/30',     label: 'text-blue-300',   icon: '🤖' },
  part:           { border: 'border-orange-600',  bg: 'bg-orange-950/50',   label: 'text-orange-400', icon: '🔧' },
  photo:          { border: 'border-sky-600',     bg: 'bg-sky-950/50',      label: 'text-sky-400',    icon: '📷' },
  diagnosis:      { border: 'border-indigo-600',  bg: 'bg-indigo-950/50',   label: 'text-indigo-400', icon: '🔍' },
  recommendation: { border: 'border-amber-600',   bg: 'bg-amber-950/50',    label: 'text-amber-400',  icon: '📋' },
  note:           { border: 'border-gray-600',    bg: 'bg-gray-900',        label: 'text-gray-400',   icon: '📝' },
};

const STATUS_COLOR = { ok: 'text-green-400 bg-green-950/60', warn: 'text-amber-400 bg-amber-950/60', alert: 'text-red-400 bg-red-950/60' };

function formatTimer(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
    : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

const JOB_STATES: JobState[] = [
  'ARRIVED','EQUIPMENT_VERIFIED','INITIAL_OBSERVATION','MEASUREMENTS_CAPTURED',
  'ROOT_CAUSE_IDENTIFIED','REPAIR_IN_PROGRESS','REPAIR_COMPLETED',
  'VERIFICATION_COMPLETE','RECOMMENDATIONS_ADDED','CUSTOMER_REVIEWED',
];

interface SuggestionConfig {
  emoji: string;
  text: string;
  subtext: string | null;
  primaryLabel: string;
  primaryModal: ModalType | 'complete' | 'repair-done';
  secondLabel?: string;
  secondModal?: ModalType;
  aiDriven?: boolean;
  color: string;
}

const SUGGESTION: Record<JobState, SuggestionConfig> = {
  ARRIVED: { emoji: '📷', text: 'Start with the nameplate', subtext: 'Identify the equipment before anything else', primaryLabel: 'Take Nameplate Photo', primaryModal: 'nameplate', color: 'blue' },
  EQUIPMENT_VERIFIED: { emoji: '⚡', text: 'Check for active alarms', subtext: 'RTU-3 shows Code 82 on 2 of 3 last visits', primaryLabel: 'Log Alarm Code', primaryModal: 'alarm', color: 'red' },
  INITIAL_OBSERVATION: { emoji: '📈', text: 'Record initial readings', subtext: 'R-410A template loaded · 7.5-ton packaged RTU', primaryLabel: 'Start Measurements', primaryModal: 'measurements-initial', color: 'green' },
  MEASUREMENTS_CAPTURED: { emoji: '🔍', text: 'High head pressure — inspect condenser coil', subtext: 'Head: 385 psi · Superheat: 24°F — matches Code 82 pattern', primaryLabel: 'Log Voice Note', primaryModal: 'voice', aiDriven: true, color: 'purple' },
  ROOT_CAUSE_IDENTIFIED: { emoji: '🔧', text: 'Clean condenser coil + check refrigerant charge', subtext: 'Coil cleaning recommended but not done on last 2 visits', primaryLabel: 'Log Part / Repair', primaryModal: 'part', color: 'orange' },
  REPAIR_IN_PROGRESS: { emoji: '📷', text: 'Document the repair', subtext: null, primaryLabel: 'Take Repair Photo', primaryModal: 'photo', secondLabel: 'Add Part / Material', secondModal: 'part', color: 'orange' },
  REPAIR_COMPLETED: { emoji: '✅', text: 'Ready for verification readings', subtext: 'Compare post-repair to initial measurements', primaryLabel: 'Start Verification', primaryModal: 'measurements-verification', color: 'green' },
  VERIFICATION_COMPLETE: { emoji: '⭐', text: 'System operating within spec', subtext: 'Head: 385→278 psi ✓  ·  Superheat: 24→9°F ✓', primaryLabel: 'Add Recommendations', primaryModal: 'recommendations', color: 'green' },
  RECOMMENDATIONS_ADDED: { emoji: '👤', text: 'Review findings with customer', subtext: 'Plain-language summary ready', primaryLabel: 'Show Customer Summary', primaryModal: 'customer-summary', color: 'blue' },
  CUSTOMER_REVIEWED: { emoji: '🏁', text: 'Ready to complete this job', subtext: 'USR will be generated · Office notified', primaryLabel: 'Complete Job', primaryModal: 'complete', color: 'green' },
};

interface Props {
  state: PrototypeState;
  dispatch: React.Dispatch<PrototypeAction>;
  onComplete: () => void;
}

export function ActiveJobView({ state, dispatch, onComplete }: Props) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const { jobState, activities, activeModal, completionScore } = state;
  const suggestion = SUGGESTION[jobState];

  useEffect(() => {
    if (timelineRef.current) {
      timelineRef.current.scrollTop = timelineRef.current.scrollHeight;
    }
  }, [activities.length]);

  function openModal(modal: ModalType) { dispatch({ type: 'SET_MODAL', payload: modal }); }
  function closeModal() { dispatch({ type: 'SET_MODAL', payload: null }); }

  function toast(msg: string) {
    dispatch({ type: 'SHOW_TOAST', payload: msg });
    setTimeout(() => dispatch({ type: 'CLEAR_TOAST' }), 2500);
  }

  function addActivity(a: Activity, nextState?: JobState, scoreBonus?: number) {
    dispatch({ type: 'ADD_ACTIVITY', payload: a });
    if (nextState) dispatch({ type: 'SET_JOB_STATE', payload: nextState });
    if (scoreBonus) dispatch({ type: 'SET_COMPLETION_SCORE', payload: Math.min(100, completionScore + scoreBonus) });
    closeModal();
  }

  function handleSuggestionPrimary() {
    if (suggestion.primaryModal === 'complete') { onComplete(); return; }
    if (suggestion.primaryModal === 'repair-done') {
      dispatch({ type: 'SET_JOB_STATE', payload: 'REPAIR_COMPLETED' });
      toast('Repair marked complete');
      return;
    }
    openModal(suggestion.primaryModal as ModalType);
  }

  function handleCameraPress() {
    if (jobState === 'ARRIVED' && !state.nameplateVerified) openModal('nameplate');
    else openModal('photo');
  }

  return (
    <div className="h-screen bg-gray-950 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 pt-10 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-0.5">
          <div className="text-[10px] font-mono text-gray-500">{MOCK_JOB.id}</div>
          <div className="flex items-center gap-1.5 bg-gray-800 rounded-full px-2.5 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="font-mono text-sm font-bold text-white">{formatTimer(state.elapsedSeconds)}</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-white text-base leading-tight">{MOCK_JOB.equipment}</div>
            <div className="text-xs text-gray-400">{MOCK_JOB.customer}</div>
          </div>
          <button
            onClick={() => dispatch({ type: 'TOGGLE_DEV_NAV' })}
            className="text-gray-500 text-[10px] flex items-center gap-1 border border-gray-700 rounded-full px-2 py-0.5"
          >
            <span>DEV</span>
            {state.showDevNav ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
          </button>
        </div>
      </div>

      {/* Dev Nav */}
      <AnimatePresence>
        {state.showDevNav && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-gray-950 border-b border-gray-800 overflow-hidden flex-shrink-0"
          >
            <div className="px-3 py-2">
              <div className="text-[9px] font-bold uppercase tracking-wider text-gray-600 mb-1.5">Jump to state (dev only)</div>
              <div className="flex flex-wrap gap-1">
                {JOB_STATES.map(s => (
                  <button
                    key={s}
                    onClick={() => dispatch({ type: 'JUMP_TO_STATE', payload: s })}
                    className={`text-[9px] px-2 py-0.5 rounded-full border font-medium ${s === jobState ? 'border-white text-white bg-gray-800' : 'border-gray-700 text-gray-500'}`}
                  >
                    {JOB_STATE_LABELS[s].replace(/[🔍📍👁📈🔖⭐🔧✅📋👤🏁]/u, '').trim()}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Score bar */}
      <div className="px-4 pt-2.5 pb-1 flex-shrink-0 bg-gray-950">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-gray-500 font-medium">SERVICE RECORD</span>
          <span className={`text-xs font-bold ${completionScore >= 90 ? 'text-green-400' : completionScore >= 70 ? 'text-amber-400' : 'text-gray-400'}`}>{completionScore}%</span>
        </div>
        <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${completionScore >= 90 ? 'bg-green-500' : completionScore >= 70 ? 'bg-amber-500' : 'bg-blue-500'}`}
            animate={{ width: `${completionScore}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Suggestion card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={jobState}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className="mx-4 mt-2 mb-2 flex-shrink-0"
        >
          <div className={`rounded-2xl p-3.5 border ${suggestion.aiDriven ? 'bg-blue-950/40 border-blue-800' : 'bg-gray-900 border-gray-800'}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-1.5 mb-1">
                  {suggestion.aiDriven && <span className="text-[9px] font-bold uppercase tracking-wider text-blue-400 bg-blue-900/50 px-1.5 py-0.5 rounded-full">AI Guided</span>}
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{JOB_STATE_LABELS[jobState]}</span>
                </div>
                <p className="text-white font-semibold text-sm leading-snug">{suggestion.emoji} {suggestion.text}</p>
                {suggestion.subtext && <p className="text-gray-400 text-xs mt-0.5 leading-snug">{suggestion.subtext}</p>}
              </div>
            </div>
            <div className="flex gap-2 mt-2.5">
              <button
                onClick={handleSuggestionPrimary}
                className="flex-1 bg-white text-gray-950 font-bold text-xs py-2.5 rounded-xl"
              >
                {suggestion.primaryLabel}
              </button>
              {suggestion.secondLabel && suggestion.secondModal && (
                <button
                  onClick={() => openModal(suggestion.secondModal!)}
                  className="flex-1 bg-gray-800 text-white font-semibold text-xs py-2.5 rounded-xl border border-gray-700"
                >
                  {suggestion.secondLabel}
                </button>
              )}
              {jobState === 'REPAIR_IN_PROGRESS' && (
                <button
                  onClick={() => { dispatch({ type: 'SET_JOB_STATE', payload: 'REPAIR_COMPLETED' }); toast('Repair marked complete'); }}
                  className="bg-gray-800 text-gray-300 font-semibold text-xs py-2.5 px-3 rounded-xl border border-gray-700"
                >
                  Done ✓
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Timeline */}
      <div ref={timelineRef} className="flex-1 overflow-y-auto px-4 space-y-2 pb-4">
        <AnimatePresence initial={false}>
          {activities.map((a) => (
            <ActivityCard key={a.id} activity={a} />
          ))}
        </AnimatePresence>
        {activities.length === 0 && (
          <div className="text-center py-10 text-gray-600 text-sm">Timeline will build as you work</div>
        )}
      </div>

      {/* Bottom Bar */}
      <div className="flex-shrink-0 bg-gray-900 border-t border-gray-800 px-4 py-3 flex gap-3 items-center">
        <button
          onClick={handleCameraPress}
          className="w-12 h-12 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center flex-shrink-0"
        >
          <Camera size={20} className="text-white" />
        </button>
        <button
          onClick={() => openModal('voice')}
          className="flex-1 h-12 rounded-2xl bg-purple-700 flex items-center justify-center gap-2 font-bold text-white text-sm"
        >
          <Mic size={18} />
          Hold to Record
        </button>
        <button
          onClick={() => openModal('fab-menu')}
          className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center flex-shrink-0"
        >
          <Plus size={22} className="text-gray-950" />
        </button>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {state.toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs font-medium px-4 py-2.5 rounded-full shadow-xl border border-gray-700 whitespace-nowrap z-50"
          >
            {state.toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODALS */}
      <AnimatePresence>
        {activeModal === 'fab-menu' && (
          <FabMenu
            jobState={jobState}
            onClose={closeModal}
            onSelect={(m) => { closeModal(); setTimeout(() => openModal(m), 100); }}
            onRepairDone={() => { dispatch({ type: 'SET_JOB_STATE', payload: 'REPAIR_COMPLETED' }); toast('Repair marked complete'); closeModal(); }}
          />
        )}
        {activeModal === 'nameplate' && (
          <NameplateModal onClose={closeModal} onConfirm={() => {
            dispatch({ type: 'SET_NAMEPLATE_VERIFIED' });
            addActivity({
              id: `nameplate-${Date.now()}`, type: 'nameplate', timestamp: currentTime(),
              title: 'Nameplate Captured', subtitle: `${MOCK_EQUIPMENT.make} ${MOCK_EQUIPMENT.model} · SN: ${MOCK_EQUIPMENT.serial}`,
              badge: '✓ Verified',
            }, 'EQUIPMENT_VERIFIED', 8);
            toast('✓ Equipment identified');
          }} />
        )}
        {activeModal === 'alarm' && (
          <AlarmModal onClose={closeModal} onSave={(code, desc) => {
            addActivity({
              id: `alarm-${Date.now()}`, type: 'alarm', timestamp: currentTime(),
              title: `Alarm · Code ${code}`, subtitle: desc,
            }, 'INITIAL_OBSERVATION', 6);
            toast(`⚡ Alarm ${code} logged`);
          }} />
        )}
        {activeModal === 'voice' && (
          <VoiceModal
            jobState={jobState}
            onClose={closeModal}
            onSave={(transcript, conf) => {
              const nextState: JobState | undefined =
                jobState === 'MEASUREMENTS_CAPTURED' ? 'ROOT_CAUSE_IDENTIFIED' : undefined;
              addActivity({
                id: `voice-${Date.now()}`, type: 'voice', timestamp: currentTime(),
                title: 'Voice Note', transcript, confidence: conf,
              }, nextState, 3);
              toast('🎤 Voice note saved');
            }}
          />
        )}
        {activeModal === 'measurements-initial' && (
          <MeasurementModal
            mode="initial"
            onClose={closeModal}
            onSave={(readings) => {
              dispatch({ type: 'SET_INITIAL_MEASUREMENTS', payload: readings });
              addActivity({
                id: `meas-${Date.now()}`, type: 'measurement', timestamp: currentTime(),
                title: 'Initial Measurements', subtitle: 'Head: 385 psi ↑  ·  Superheat: 24°F ↑  ·  Delta T: 11°F ↓',
                measurements: readings,
              }, 'MEASUREMENTS_CAPTURED', 12);
              // auto AI suggestion activity
              setTimeout(() => {
                dispatch({ type: 'ADD_ACTIVITY', payload: {
                  id: `ai-${Date.now()}`, type: 'ai-suggestion', timestamp: currentTime(),
                  title: 'AI Observation', subtitle: 'High head + elevated superheat indicates condenser restriction. Pattern matches 2 previous Code 82 visits.',
                  isAISuggestion: true,
                }});
              }, 600);
              toast('📈 Measurements recorded');
            }}
          />
        )}
        {activeModal === 'measurements-verification' && (
          <MeasurementModal
            mode="verification"
            onClose={closeModal}
            onSave={(readings) => {
              dispatch({ type: 'SET_VERIFICATION_MEASUREMENTS', payload: readings });
              addActivity({
                id: `verif-${Date.now()}`, type: 'verification', timestamp: currentTime(),
                title: 'Verification Measurements', subtitle: 'All readings within spec  ✓',
                measurements: readings,
              }, 'VERIFICATION_COMPLETE', 15);
              toast('✅ Verification complete');
            }}
          />
        )}
        {activeModal === 'part' && (
          <PartModal
            jobState={jobState}
            onClose={closeModal}
            onSave={(name, detail, qty) => {
              dispatch({ type: 'ADD_PART', payload: { id: `part-${Date.now()}`, name, qty, detail } });
              addActivity({
                id: `part-${Date.now()}`, type: 'part', timestamp: currentTime(),
                title: name, subtitle: detail, partQty: qty,
              }, jobState === 'ROOT_CAUSE_IDENTIFIED' || jobState === 'EQUIPMENT_VERIFIED' || jobState === 'INITIAL_OBSERVATION' || jobState === 'MEASUREMENTS_CAPTURED' ? 'REPAIR_IN_PROGRESS' : undefined, 10);
              toast(`🔧 ${name} logged`);
            }}
          />
        )}
        {activeModal === 'photo' && (
          <PhotoModal
            jobState={jobState}
            onClose={closeModal}
            onSave={(label, color) => {
              addActivity({
                id: `photo-${Date.now()}`, type: 'photo', timestamp: currentTime(),
                title: 'Photo Captured', photoLabel: label, photoColor: color,
              }, undefined, 5);
              toast('📷 Photo saved');
            }}
          />
        )}
        {activeModal === 'recommendations' && (
          <RecommendationsModal
            onClose={closeModal}
            onSave={(recs) => {
              dispatch({ type: 'SET_RECOMMENDATIONS', payload: recs });
              recs.forEach((r, i) => {
                setTimeout(() => {
                  dispatch({ type: 'ADD_ACTIVITY', payload: {
                    id: `rec-${Date.now()}-${i}`, type: 'recommendation', timestamp: currentTime(),
                    title: 'Recommendation', subtitle: r,
                  }});
                }, i * 100);
              });
              dispatch({ type: 'SET_JOB_STATE', payload: 'RECOMMENDATIONS_ADDED' });
              dispatch({ type: 'SET_COMPLETION_SCORE', payload: Math.min(100, completionScore + 5) });
              closeModal();
              toast(`📋 ${recs.length} recommendation${recs.length > 1 ? 's' : ''} added`);
            }}
          />
        )}
        {activeModal === 'customer-summary' && (
          <CustomerSummaryModal
            state={state}
            onClose={closeModal}
            onReviewed={() => {
              addActivity({
                id: `review-${Date.now()}`, type: 'note', timestamp: currentTime(),
                title: 'Customer Review Complete', subtitle: 'Summary reviewed with building engineer',
              }, 'CUSTOMER_REVIEWED', 3);
              toast('👤 Customer review logged');
            }}
          />
        )}
        {activeModal === 'note' && (
          <NoteModal
            onClose={closeModal}
            onSave={(text) => {
              addActivity({
                id: `note-${Date.now()}`, type: 'note', timestamp: currentTime(),
                title: 'Note', subtitle: text,
              }, undefined, 1);
              toast('📝 Note saved');
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Activity Card ────────────────────────────────────────────────────────────
function ActivityCard({ activity: a }: { activity: Activity }) {
  const [expanded, setExpanded] = useState(false);
  const colors = ACTIVITY_COLORS[a.type] ?? ACTIVITY_COLORS.note;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${colors.bg} border-l-4 ${colors.border} rounded-r-2xl rounded-bl-2xl p-3 cursor-pointer`}
      onClick={() => a.measurements || a.transcript ? setExpanded(e => !e) : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className={`text-[9px] font-bold uppercase tracking-wider ${colors.label}`}>{colors.icon} {a.type.replace('-', ' ')}</span>
            {a.badge && <span className="text-[9px] bg-green-900/50 text-green-400 px-1.5 py-0.5 rounded-full font-semibold">{a.badge}</span>}
          </div>
          <div className="font-semibold text-white text-sm leading-snug">{a.title}</div>
          {a.subtitle && <div className="text-xs text-gray-400 mt-0.5 leading-relaxed">{a.subtitle}</div>}
          {a.transcript && !expanded && (
            <div className="text-xs text-gray-400 mt-1 italic truncate">"{a.transcript.substring(0, 60)}..."</div>
          )}
        </div>
        <div className="text-[10px] text-gray-600 font-mono flex-shrink-0">{a.timestamp}</div>
      </div>
      {/* Photo placeholder */}
      {a.type === 'photo' && a.photoLabel && (
        <div className={`mt-2 h-20 rounded-xl flex items-center justify-center ${a.photoColor ?? 'bg-gray-800'}`}>
          <div className="text-center">
            <div className="text-2xl mb-0.5">📷</div>
            <div className="text-xs text-white/70 font-medium">{a.photoLabel}</div>
          </div>
        </div>
      )}
      {a.type === 'nameplate' && (
        <div className="mt-2 bg-blue-900/40 rounded-xl p-2.5 grid grid-cols-3 gap-2 text-[10px]">
          <div><div className="text-gray-500">Make</div><div className="text-white font-semibold">{MOCK_EQUIPMENT.make}</div></div>
          <div><div className="text-gray-500">Capacity</div><div className="text-white font-semibold">{MOCK_EQUIPMENT.capacity}</div></div>
          <div><div className="text-gray-500">Refrigerant</div><div className="text-white font-semibold">{MOCK_EQUIPMENT.refrigerant}</div></div>
        </div>
      )}
      {/* Expanded transcript */}
      <AnimatePresence>
        {expanded && a.transcript && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <div className="mt-2 p-2.5 bg-black/20 rounded-xl">
              <div className="text-[9px] text-purple-400 font-bold uppercase tracking-wider mb-1">Transcript</div>
              <div className="text-xs text-gray-300 italic leading-relaxed">"{a.transcript}"</div>
              {a.confidence && <div className="mt-1.5 text-[9px] text-purple-400 font-semibold">{a.confidence}% confidence</div>}
            </div>
          </motion.div>
        )}
        {expanded && a.measurements && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {a.measurements.map((m, i) => (
                <div key={i} className={`rounded-lg px-2 py-1.5 ${STATUS_COLOR[m.status]}`}>
                  <div className="text-[9px] opacity-70">{m.label}</div>
                  <div className="text-xs font-bold">{m.value} {m.unit}</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Modal Shell ──────────────────────────────────────────────────────────────
function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 z-40 flex items-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 35 }}
        className="w-full bg-gray-900 rounded-t-3xl border-t border-gray-800 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-800">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center">
            <X size={16} className="text-gray-400" />
          </button>
        </div>
        <div className="px-5 pb-8 pt-4">{children}</div>
      </motion.div>
    </motion.div>
  );
}

// ─── FAB Menu ─────────────────────────────────────────────────────────────────
function FabMenu({ jobState, onClose, onSelect, onRepairDone }: { jobState: JobState; onClose: () => void; onSelect: (m: ModalType) => void; onRepairDone: () => void }) {
  const actions = [
    { icon: <Camera size={20} />, label: 'Photo', modal: 'photo' as ModalType },
    { icon: <Mic size={20} />, label: 'Voice Note', modal: 'voice' as ModalType },
    { icon: <Zap size={20} />, label: 'Alarm Code', modal: 'alarm' as ModalType },
    { icon: <Wrench size={20} />, label: 'Part / Material', modal: 'part' as ModalType },
    { icon: <FileText size={20} />, label: 'Measurements', modal: (jobState === 'REPAIR_COMPLETED' || jobState === 'VERIFICATION_COMPLETE' ? 'measurements-verification' : 'measurements-initial') as ModalType },
    { icon: <FileText size={20} />, label: 'Note', modal: 'note' as ModalType },
    { icon: <Cpu size={20} />, label: 'AI Assist', modal: 'voice' as ModalType },
    { icon: <CheckSquare size={20} />, label: 'Recommendations', modal: 'recommendations' as ModalType },
  ];
  return (
    <ModalShell title="Add Activity" onClose={onClose}>
      <div className="grid grid-cols-4 gap-3">
        {actions.map(a => (
          <button key={a.label} onClick={() => onSelect(a.modal)} className="flex flex-col items-center gap-2 p-3 bg-gray-800 rounded-2xl">
            <div className="text-white">{a.icon}</div>
            <span className="text-[10px] text-gray-300 font-medium text-center leading-tight">{a.label}</span>
          </button>
        ))}
      </div>
      {jobState === 'REPAIR_IN_PROGRESS' && (
        <button onClick={onRepairDone} className="w-full mt-4 bg-green-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2">
          <CheckCircle size={18} /> Mark Repair Complete
        </button>
      )}
    </ModalShell>
  );
}

// ─── Nameplate Modal ──────────────────────────────────────────────────────────
function NameplateModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  const [phase, setPhase] = useState<'scanning' | 'reading' | 'done'>('scanning');
  useEffect(() => {
    const t1 = setTimeout(() => setPhase('reading'), 1200);
    const t2 = setTimeout(() => setPhase('done'), 2400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  return (
    <ModalShell title="Nameplate Capture" onClose={onClose}>
      <div className="text-center">
        {phase !== 'done' ? (
          <div>
            <div className="w-full h-48 bg-gray-800 rounded-2xl mb-4 flex items-center justify-center relative overflow-hidden">
              <motion.div className="absolute inset-0 bg-white" animate={{ opacity: [0, 0.3, 0] }} transition={{ duration: 0.5, delay: 1.1 }} />
              <div className="text-center">
                <div className="text-4xl mb-2">📷</div>
                <div className="text-sm text-gray-400">{phase === 'scanning' ? 'Point at nameplate...' : 'AI reading nameplate...'}</div>
                {phase === 'reading' && (
                  <motion.div className="flex gap-1 justify-center mt-2" animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 0.8 }}>
                    {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 bg-blue-400 rounded-full" />)}
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="bg-green-950/50 border border-green-700 rounded-2xl p-4 mb-4 text-left">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle size={16} className="text-green-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-green-400">AI Identified</span>
              </div>
              {[
                ['Make', MOCK_EQUIPMENT.make], ['Model', MOCK_EQUIPMENT.model], ['Serial', MOCK_EQUIPMENT.serial],
                ['Capacity', MOCK_EQUIPMENT.capacity], ['Refrigerant', MOCK_EQUIPMENT.refrigerant], ['Voltage', MOCK_EQUIPMENT.voltage],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between py-1.5 border-b border-green-900/50 last:border-0">
                  <span className="text-xs text-gray-400">{l}</span>
                  <span className="text-xs font-mono font-semibold text-white">{v}</span>
                </div>
              ))}
            </div>
            <div className="text-xs text-gray-500 mb-4">Previous service records found — 3 visits on record</div>
            <button onClick={onConfirm} className="w-full bg-white text-gray-950 font-bold py-4 rounded-2xl">This is correct — Confirm Equipment</button>
            <button onClick={onClose} className="w-full mt-2 text-gray-500 text-sm py-3">Correct it manually</button>
          </motion.div>
        )}
      </div>
    </ModalShell>
  );
}

// ─── Alarm Modal ──────────────────────────────────────────────────────────────
function AlarmModal({ onClose, onSave }: { onClose: () => void; onSave: (code: string, desc: string) => void }) {
  const [code, setCode] = useState('82');
  const desc = FAULT_CODES[code] ?? 'Unknown fault code — describe the alarm below.';
  return (
    <ModalShell title="Log Alarm Code" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider block mb-1.5">Fault Code</label>
          <input value={code} onChange={e => setCode(e.target.value)} className="w-full bg-gray-800 text-white text-2xl font-bold rounded-2xl px-4 py-4 border border-gray-700 text-center font-mono" placeholder="00" />
        </div>
        {code && FAULT_CODES[code] && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-red-950/50 border border-red-800 rounded-2xl p-4">
            <div className="text-xs font-bold text-red-400 mb-1">Code {code}</div>
            <p className="text-sm text-gray-300 leading-relaxed">{desc}</p>
          </motion.div>
        )}
        <div className="grid grid-cols-5 gap-2">
          {['81','82','22','31','14'].map(c => (
            <button key={c} onClick={() => setCode(c)} className={`py-2 rounded-xl text-sm font-bold border ${c === code ? 'border-white bg-gray-700 text-white' : 'border-gray-700 text-gray-400'}`}>{c}</button>
          ))}
        </div>
        <button onClick={() => onSave(code, desc.split('—')[0].trim())} className="w-full bg-red-600 text-white font-bold py-4 rounded-2xl">Log Alarm</button>
      </div>
    </ModalShell>
  );
}

// ─── Voice Modal ──────────────────────────────────────────────────────────────
const VOICE_TRANSCRIPTS: Record<string, string> = {
  MEASUREMENTS_CAPTURED: 'Unit short cycling, compressor cutting out on high pressure. Condenser coil is completely packed with cottonwood debris and biological growth. Going to clean it out and re-check pressures.',
  ROOT_CAUSE_IDENTIFIED: 'Coil cleaning complete. Pressures coming down. Also found a weak capacitor — 31 microfarad reading 35 on the spec. Adding refrigerant now — system was short by about three quarters of a pound.',
  REPAIR_IN_PROGRESS: 'All repair work complete. Pressures are normalizing. Going to let it run for ten minutes then take verification readings.',
  default: 'Visual inspection complete. Unit is running but not cooling to setpoint. Going to start with measurements.',
};

function VoiceModal({ jobState, onClose, onSave }: { jobState: JobState; onClose: () => void; onSave: (t: string, conf: number) => void }) {
  const [phase, setPhase] = useState<'idle' | 'recording' | 'done'>('idle');
  const [secs, setSecs] = useState(0);
  const transcript = VOICE_TRANSCRIPTS[jobState] ?? VOICE_TRANSCRIPTS.default;

  function startRecording() {
    setPhase('recording');
    setSecs(0);
    const iv = setInterval(() => setSecs(s => s + 1), 1000);
    setTimeout(() => { clearInterval(iv); setPhase('done'); }, 4000);
  }

  return (
    <ModalShell title="Voice Note" onClose={onClose}>
      <div className="text-center space-y-4">
        {phase === 'idle' && (
          <div>
            <div className="w-24 h-24 rounded-full bg-purple-800/30 border-2 border-purple-600 flex items-center justify-center mx-auto mb-4">
              <Mic size={36} className="text-purple-400" />
            </div>
            <p className="text-gray-400 text-sm mb-6">Tap to start recording your voice note</p>
            <button onClick={startRecording} className="w-full bg-purple-700 text-white font-bold py-5 rounded-2xl text-lg">Start Recording</button>
          </div>
        )}
        {phase === 'recording' && (
          <div>
            <div className="relative w-24 h-24 mx-auto mb-4">
              <motion.div className="absolute inset-0 rounded-full bg-purple-500/20" animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 1 }} />
              <div className="absolute inset-0 rounded-full bg-purple-700 flex items-center justify-center">
                <Mic size={32} className="text-white" />
              </div>
            </div>
            <div className="flex justify-center gap-1 mb-3">
              {[2,4,6,3,5,7,4,3,6,4,5,3].map((h, i) => (
                <motion.div key={i} className="w-1 bg-purple-400 rounded-full" animate={{ height: [h*3, h*5, h*3] }} transition={{ repeat: Infinity, duration: 0.5 + i*0.07, ease: 'easeInOut' }} />
              ))}
            </div>
            <div className="text-purple-300 font-mono font-bold text-xl mb-4">{String(secs).padStart(2,'0')}s</div>
            <div className="text-gray-500 text-sm">Recording... release to stop</div>
          </div>
        )}
        {phase === 'done' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="bg-purple-950/50 border border-purple-800 rounded-2xl p-4 mb-4 text-left">
              <div className="text-[10px] font-bold uppercase tracking-wider text-purple-400 mb-2">AI Transcript</div>
              <p className="text-sm text-gray-200 leading-relaxed italic">"{transcript}"</p>
              <div className="mt-2 text-[10px] text-purple-400 font-semibold">92% confidence</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => { setPhase('idle'); setSecs(0); }} className="py-3 rounded-2xl bg-gray-800 text-gray-300 font-semibold text-sm">Re-record</button>
              <button onClick={() => onSave(transcript, 92)} className="py-3 rounded-2xl bg-purple-700 text-white font-bold text-sm">Save Note</button>
            </div>
          </motion.div>
        )}
      </div>
    </ModalShell>
  );
}

// ─── Measurement Modal ────────────────────────────────────────────────────────
function MeasurementModal({ mode, onClose, onSave }: { mode: 'initial' | 'verification'; onClose: () => void; onSave: (readings: MeasurementReading[]) => void }) {
  const defaults = mode === 'verification'
    ? INITIAL_MEASUREMENTS.map(m => ({ ...m, value: m.verificationValue ?? m.value, status: (m.verificationStatus ?? 'ok') as 'ok' | 'warn' | 'alert' }))
    : INITIAL_MEASUREMENTS;
  const [readings, setReadings] = useState<MeasurementReading[]>(defaults.map(m => ({ ...m })));
  function updateVal(i: number, v: string) {
    setReadings(prev => prev.map((r, idx) => idx === i ? { ...r, value: v } : r));
  }
  return (
    <ModalShell title={mode === 'initial' ? 'Initial Measurements' : 'Verification Measurements'} onClose={onClose}>
      <div className="space-y-3">
        {mode === 'verification' && (
          <div className="bg-blue-950/40 border border-blue-800 rounded-xl p-3 text-xs text-blue-300">
            Post-repair readings — compare to initial measurements
          </div>
        )}
        <div className="grid grid-cols-1 gap-2">
          {readings.map((m, i) => (
            <div key={i} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border ${m.status === 'ok' ? 'bg-green-950/30 border-green-900' : m.status === 'warn' ? 'bg-amber-950/30 border-amber-900' : 'bg-red-950/30 border-red-900'}`}>
              <div className="flex-1">
                <div className="text-[10px] text-gray-400">{m.label}</div>
                {m.target && <div className="text-[9px] text-gray-600">target: {m.target}</div>}
              </div>
              <div className="flex items-center gap-1">
                <input
                  value={m.value}
                  onChange={e => updateVal(i, e.target.value)}
                  className="w-16 bg-gray-800 text-white font-bold text-right rounded-lg px-2 py-1 text-sm border border-gray-700"
                />
                <span className="text-xs text-gray-400 w-8">{m.unit}</span>
              </div>
              <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${m.status === 'ok' ? 'bg-green-900 text-green-400' : m.status === 'warn' ? 'bg-amber-900 text-amber-400' : 'bg-red-900 text-red-400'}`}>
                {m.status === 'ok' ? '✓' : m.status === 'warn' ? '↓' : '↑'}
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => onSave(readings)} className="w-full bg-green-600 text-white font-bold py-4 rounded-2xl mt-2">Save Readings</button>
      </div>
    </ModalShell>
  );
}

// ─── Part Modal ───────────────────────────────────────────────────────────────
const SUGGESTED_PARTS = [
  { name: 'Condenser Coil Cleaning', detail: 'Nu-Brite chemical rinse — heavy fouling removed', qty: 1 },
  { name: 'R-410A Refrigerant', detail: '0.75 lbs added — system undercharged', qty: 1 },
  { name: 'Dual Run Capacitor 35/5 µF 440V', detail: 'Replaced — tested at 31 µF (spec: 35 µF)', qty: 1 },
];

function PartModal({ jobState: _jobState, onClose, onSave }: { jobState: JobState; onClose: () => void; onSave: (name: string, detail: string, qty: number) => void }) {
  const [custom, setCustom] = useState(false);
  const [name, setName] = useState('');
  const [detail, setDetail] = useState('');
  return (
    <ModalShell title="Log Part / Repair" onClose={onClose}>
      <div className="space-y-3">
        {!custom && (
          <>
            <div className="text-xs text-gray-500 font-semibold mb-2">Suggested for this job</div>
            {SUGGESTED_PARTS.map((p, i) => (
              <button key={i} onClick={() => onSave(p.name, p.detail, p.qty)} className="w-full flex items-start gap-3 bg-gray-800 border border-gray-700 rounded-2xl p-4 text-left">
                <div className="w-8 h-8 bg-orange-900/50 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Wrench size={14} className="text-orange-400" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-white text-sm">{p.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{p.detail}</div>
                </div>
                <ChevronDown size={16} className="text-gray-600 rotate-[-90deg] mt-1" />
              </button>
            ))}
            <button onClick={() => setCustom(true)} className="w-full py-3 text-sm text-gray-500 border border-gray-800 rounded-2xl">+ Custom Part or Material</button>
          </>
        )}
        {custom && (
          <div className="space-y-3">
            <button onClick={() => setCustom(false)} className="text-xs text-gray-500">← Back to suggestions</button>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Part Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Belt 3VX450" className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 border border-gray-700 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Detail / Notes</label>
              <input value={detail} onChange={e => setDetail(e.target.value)} placeholder="e.g. Replaced worn belt" className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 border border-gray-700 text-sm" />
            </div>
            <button onClick={() => name && onSave(name, detail, 1)} disabled={!name} className="w-full bg-orange-600 text-white font-bold py-4 rounded-2xl disabled:opacity-50">Save Part</button>
          </div>
        )}
      </div>
    </ModalShell>
  );
}

// ─── Photo Modal ──────────────────────────────────────────────────────────────
const PHOTO_TYPES = [
  { label: 'Nameplate', color: 'bg-blue-900/60' },
  { label: 'Failed Part', color: 'bg-red-900/60' },
  { label: 'Repair', color: 'bg-orange-900/60' },
  { label: 'Wiring', color: 'bg-yellow-900/60' },
  { label: 'Measurement', color: 'bg-green-900/60' },
  { label: 'Overall Unit', color: 'bg-gray-800' },
];

function PhotoModal({ jobState: _j, onClose, onSave }: { jobState: JobState; onClose: () => void; onSave: (label: string, color: string) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState('bg-gray-800');
  const [taken, setTaken] = useState(false);

  function takePhoto() {
    setTaken(true);
    setTimeout(() => {
      if (selected) onSave(selected, selectedColor);
      else onSave('General', 'bg-gray-800');
    }, 1000);
  }

  return (
    <ModalShell title="Capture Photo" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2">Category (AI will suggest)</div>
          <div className="grid grid-cols-3 gap-2">
            {PHOTO_TYPES.map(p => (
              <button key={p.label} onClick={() => { setSelected(p.label); setSelectedColor(p.color); }}
                className={`py-3 rounded-xl text-xs font-semibold border ${selected === p.label ? 'border-white text-white bg-gray-700' : 'border-gray-700 text-gray-400'}`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
        {!taken ? (
          <button onClick={takePhoto} className="w-full bg-white text-gray-950 font-bold py-5 rounded-2xl flex items-center justify-center gap-2 text-lg">
            <Camera size={22} /> Take Photo
          </button>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`h-40 rounded-2xl flex items-center justify-center ${selectedColor ?? 'bg-gray-800'}`}
          >
            <div className="text-center">
              <div className="text-3xl mb-1">✓</div>
              <div className="text-white font-semibold">{selected ?? 'Photo'} saved</div>
            </div>
          </motion.div>
        )}
      </div>
    </ModalShell>
  );
}

// ─── Recommendations Modal ────────────────────────────────────────────────────
function RecommendationsModal({ onClose, onSave }: { onClose: () => void; onSave: (recs: string[]) => void }) {
  const [checked, setChecked] = useState<boolean[]>(SUGGESTED_RECOMMENDATIONS.map((_, i) => i < 3));
  const [custom, setCustom] = useState('');

  function toggle(i: number) { setChecked(prev => prev.map((c, idx) => idx === i ? !c : c)); }

  function save() {
    const recs = SUGGESTED_RECOMMENDATIONS.filter((_, i) => checked[i]);
    if (custom.trim()) recs.push(custom.trim());
    onSave(recs);
  }

  return (
    <ModalShell title="Recommendations" onClose={onClose}>
      <div className="space-y-3">
        <div className="text-xs text-gray-500">AI-suggested based on findings — tap to select</div>
        {SUGGESTED_RECOMMENDATIONS.map((r, i) => (
          <button key={i} onClick={() => toggle(i)} className={`w-full flex items-start gap-3 p-4 rounded-2xl border text-left ${checked[i] ? 'bg-amber-950/40 border-amber-700' : 'bg-gray-800 border-gray-700'}`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${checked[i] ? 'bg-amber-500' : 'bg-gray-700'}`}>
              {checked[i] && <span className="text-[10px] font-bold text-white">✓</span>}
            </div>
            <p className="text-sm text-gray-300 leading-relaxed">{r}</p>
          </button>
        ))}
        <div>
          <input value={custom} onChange={e => setCustom(e.target.value)} placeholder="Add custom recommendation..." className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 border border-gray-700 text-sm" />
        </div>
        <button onClick={save} className="w-full bg-amber-600 text-white font-bold py-4 rounded-2xl">
          Save {checked.filter(Boolean).length + (custom.trim() ? 1 : 0)} Recommendation{checked.filter(Boolean).length + (custom.trim() ? 1 : 0) !== 1 ? 's' : ''}
        </button>
      </div>
    </ModalShell>
  );
}

// ─── Customer Summary Modal ───────────────────────────────────────────────────
function CustomerSummaryModal({ state, onClose, onReviewed }: { state: PrototypeState; onClose: () => void; onReviewed: () => void }) {
  return (
    <ModalShell title="Customer Summary" onClose={onClose}>
      <div className="space-y-4">
        <div className="bg-blue-950/30 border border-blue-800 rounded-xl p-2.5">
          <div className="text-[9px] font-bold text-blue-400 uppercase tracking-wider mb-1">Customer-facing view</div>
          <div className="text-[10px] text-blue-300">Plain language — no technical jargon</div>
        </div>
        <div className="space-y-3">
          <SummaryBlock emoji="🔍" title="What we found" text="Your rooftop unit (RTU-3) had a badly clogged condenser coil and was slightly low on refrigerant. Both issues were causing the unit to work too hard, triggering a safety shutoff and preventing proper cooling." />
          <SummaryBlock emoji="🔧" title="What we fixed" text="We cleaned the condenser coil thoroughly, added 0.75 lbs of refrigerant, and replaced a weak capacitor. The unit is now cooling correctly — indoor temperature dropped and is back within normal operating range." />
          {state.recommendations.length > 0 && (
            <SummaryBlock emoji="📋" title="Recommendations" text={state.recommendations[0]} />
          )}
          <SummaryBlock emoji="✅" title="Verification" text="We measured the system before and after the repair. Supply air dropped from 61°F to 56°F. All pressures and temperatures are now within specification." />
        </div>
        <button onClick={onReviewed} className="w-full bg-white text-gray-950 font-bold py-4 rounded-2xl">Reviewed with Customer ✓</button>
      </div>
    </ModalShell>
  );
}

function SummaryBlock({ emoji, title, text }: { emoji: string; title: string; text: string }) {
  return (
    <div className="bg-gray-800 rounded-2xl p-4">
      <div className="font-bold text-white text-sm mb-1.5">{emoji} {title}</div>
      <p className="text-sm text-gray-300 leading-relaxed">{text}</p>
    </div>
  );
}

// ─── Note Modal ───────────────────────────────────────────────────────────────
function NoteModal({ onClose, onSave }: { onClose: () => void; onSave: (text: string) => void }) {
  const [text, setText] = useState('');
  return (
    <ModalShell title="Add Note" onClose={onClose}>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Type a note..."
        className="w-full h-32 bg-gray-800 text-white rounded-2xl px-4 py-3 border border-gray-700 text-sm resize-none mb-4"
        autoFocus
      />
      <button onClick={() => text.trim() && onSave(text.trim())} disabled={!text.trim()} className="w-full bg-white text-gray-950 font-bold py-4 rounded-2xl disabled:opacity-40">Save Note</button>
    </ModalShell>
  );
}

function currentTime(): string {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}
