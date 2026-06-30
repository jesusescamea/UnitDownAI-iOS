import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, Mic, Plus, X, ChevronDown, ChevronUp, Zap, FileText,
  Wrench, CheckSquare, User, Cpu, CheckCircle, Sparkles, Send, AlertTriangle,
  Search, ArrowLeft, ChevronRight, Thermometer,
} from 'lucide-react';
import {
  MOCK_JOB, MOCK_EQUIPMENT, INITIAL_MEASUREMENTS, SUGGESTED_RECOMMENDATIONS,
  FAULT_CODES, JOB_STATE_LABELS, randomVoiceNote, AI_ASSIST_PROMPTS, MOCK_HISTORY,
} from './mockData';
import { INITIAL_INVENTORY } from './vanData';
import {
  PARTS_MASTER, searchParts, getEquipmentPartsContext, matchVanInventory,
} from './partsIntelligence';
import RefrigerantAssistant from './RefrigerantAssistant';
import type { PrototypeState, PrototypeAction, JobState, Activity, MeasurementReading, ModalType, NameplateScanResult, NameplateFields } from './types';

// ─── Color mapping ─────────────────────────────────────────────────────────────
const ACTIVITY_COLORS: Record<string, { border: string; bg: string; label: string; icon: string }> = {
  arrival:         { border: 'border-gray-600',   bg: 'bg-gray-900',       label: 'text-gray-300',   icon: '📍' },
  nameplate:       { border: 'border-blue-600',   bg: 'bg-blue-950/50',    label: 'text-blue-400',   icon: '🔖' },
  alarm:           { border: 'border-red-600',    bg: 'bg-red-950/50',     label: 'text-red-400',    icon: '⚡' },
  voice:           { border: 'border-purple-600', bg: 'bg-purple-950/50',  label: 'text-purple-400', icon: '🎤' },
  measurement:     { border: 'border-green-600',  bg: 'bg-green-950/50',   label: 'text-green-400',  icon: '📈' },
  verification:    { border: 'border-green-500',  bg: 'bg-green-950/50',   label: 'text-green-300',  icon: '✅' },
  'ai-suggestion': { border: 'border-blue-500',   bg: 'bg-blue-950/30',    label: 'text-blue-300',   icon: '🤖' },
  part:            { border: 'border-orange-600', bg: 'bg-orange-950/50',  label: 'text-orange-400', icon: '🔧' },
  photo:           { border: 'border-sky-600',    bg: 'bg-sky-950/50',     label: 'text-sky-400',    icon: '📷' },
  diagnosis:       { border: 'border-indigo-600', bg: 'bg-indigo-950/50',  label: 'text-indigo-400', icon: '🔍' },
  recommendation:  { border: 'border-amber-600',  bg: 'bg-amber-950/50',   label: 'text-amber-400',  icon: '📋' },
  note:            { border: 'border-gray-600',   bg: 'bg-gray-900',       label: 'text-gray-400',   icon: '📝' },
};

const STATUS_COLOR = {
  ok:    'text-green-400 bg-green-950/60',
  warn:  'text-amber-400 bg-amber-950/60',
  alert: 'text-red-400 bg-red-950/60',
};

function formatTimer(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const JOB_STATES: JobState[] = [
  'ARRIVED', 'EQUIPMENT_VERIFIED', 'INITIAL_OBSERVATION', 'MEASUREMENTS_CAPTURED',
  'ROOT_CAUSE_IDENTIFIED', 'REPAIR_IN_PROGRESS', 'REPAIR_COMPLETED',
  'VERIFICATION_COMPLETE', 'RECOMMENDATIONS_ADDED', 'CUSTOMER_REVIEWED',
];

// ─── Suggestion config — suggestions, not directives ───────────────────────
interface SuggestionConfig {
  emoji: string;
  text: string;
  context: string | null;
  primaryLabel: string;
  primaryModal: ModalType | 'complete' | 'repair-done';
  secondLabel?: string;
  secondModal?: ModalType;
  aiDriven?: boolean;
}

const SUGGESTION: Record<JobState, SuggestionConfig> = {
  ARRIVED: {
    emoji: '📷', text: 'Nameplate photo is a good starting point',
    context: 'Confirms equipment ID and loads measurement templates',
    primaryLabel: 'Take Nameplate Photo', primaryModal: 'nameplate',
  },
  EQUIPMENT_VERIFIED: {
    emoji: '⚡', text: 'Any active fault codes on the display?',
    context: 'RTU-3 has Code 82 on 2 of last 3 visits',
    primaryLabel: 'Log Alarm', primaryModal: 'alarm',
  },
  INITIAL_OBSERVATION: {
    emoji: '📈', text: 'Initial readings when you\'re ready',
    context: 'R-410A template loaded · 7.5-ton packaged RTU',
    primaryLabel: 'Start Measurements', primaryModal: 'measurements-initial',
  },
  MEASUREMENTS_CAPTURED: {
    emoji: '🔍', text: 'High head + elevated superheat — condenser coil likely',
    context: 'Pattern matches Code 82 history on this unit',
    primaryLabel: 'Voice Note', primaryModal: 'voice', aiDriven: true,
  },
  ROOT_CAUSE_IDENTIFIED: {
    emoji: '🔧', text: 'Ready to start the repair?',
    context: 'Coil cleaning recommended but not done on last 2 visits',
    primaryLabel: 'Log Part / Repair', primaryModal: 'part',
  },
  REPAIR_IN_PROGRESS: {
    emoji: '📷', text: 'Repair photo when you\'re ready',
    context: null,
    primaryLabel: 'Take Repair Photo', primaryModal: 'photo',
    secondLabel: 'Add Part', secondModal: 'part',
  },
  REPAIR_COMPLETED: {
    emoji: '✅', text: 'Verification readings when system is stable',
    context: 'Compare post-repair to initial measurements',
    primaryLabel: 'Start Verification', primaryModal: 'measurements-verification',
  },
  VERIFICATION_COMPLETE: {
    emoji: '⭐', text: 'System looks good — any recommendations?',
    context: 'Head: 385→278 psi ✓  ·  Superheat: 24→9°F ✓',
    primaryLabel: 'Add Recommendations', primaryModal: 'recommendations',
  },
  RECOMMENDATIONS_ADDED: {
    emoji: '👤', text: 'Ready to review with the customer?',
    context: 'Plain-language summary is ready',
    primaryLabel: 'Show Customer Summary', primaryModal: 'customer-summary',
  },
  CUSTOMER_REVIEWED: {
    emoji: '🏁', text: 'Job looks complete — ready to generate the USR?',
    context: null,
    primaryLabel: 'Complete Job', primaryModal: 'complete',
  },
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
      toast('Repair marked complete'); return;
    }
    openModal(suggestion.primaryModal as ModalType);
  }

  function handleCameraPress() { openModal('photo'); }

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
            DEV {state.showDevNav ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
          </button>
        </div>
      </div>

      {/* Dev nav */}
      <AnimatePresence>
        {state.showDevNav && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="bg-gray-950 border-b border-gray-800 overflow-hidden flex-shrink-0"
          >
            <div className="px-3 py-2">
              <div className="text-[9px] font-bold uppercase tracking-wider text-gray-600 mb-1.5">Jump to state</div>
              <div className="flex flex-wrap gap-1">
                {JOB_STATES.map(s => (
                  <button key={s} onClick={() => dispatch({ type: 'JUMP_TO_STATE', payload: s })}
                    className={`text-[9px] px-2 py-0.5 rounded-full border font-medium ${s === jobState ? 'border-white text-white bg-gray-800' : 'border-gray-700 text-gray-500'}`}>
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
            animate={{ width: `${completionScore}%` }} transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Suggestion card — suggestion, not gate */}
      <AnimatePresence mode="wait">
        <motion.div
          key={jobState}
          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
          className="mx-4 mt-2 mb-1.5 flex-shrink-0"
        >
          <div className={`rounded-2xl px-3.5 py-3 border ${suggestion.aiDriven ? 'border-blue-800/60 bg-blue-950/20' : 'border-gray-800 bg-gray-900/60'}`}>
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500">
                    {suggestion.aiDriven ? '🤖 AI Suggested' : 'Suggested'}
                  </span>
                </div>
                <p className="text-white font-semibold text-sm leading-snug">{suggestion.emoji} {suggestion.text}</p>
                {suggestion.context && <p className="text-gray-500 text-xs mt-0.5">{suggestion.context}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2.5">
              <button onClick={handleSuggestionPrimary}
                className="flex-1 bg-white/90 text-gray-950 font-bold text-xs py-2.5 rounded-xl">
                {suggestion.primaryLabel}
              </button>
              {suggestion.secondLabel && suggestion.secondModal && (
                <button onClick={() => openModal(suggestion.secondModal!)}
                  className="flex-1 bg-gray-800 text-white font-semibold text-xs py-2.5 rounded-xl border border-gray-700">
                  {suggestion.secondLabel}
                </button>
              )}
              {jobState === 'REPAIR_IN_PROGRESS' && (
                <button
                  onClick={() => { dispatch({ type: 'SET_JOB_STATE', payload: 'REPAIR_COMPLETED' }); toast('Repair marked complete'); }}
                  className="bg-gray-800 text-gray-300 font-semibold text-xs py-2.5 px-3 rounded-xl border border-gray-700">
                  Done ✓
                </button>
              )}
            </div>
            <button
              onClick={() => openModal('fab-menu')}
              className="w-full text-[10px] text-gray-600 mt-1.5 py-0.5 text-center">
              or use + to do something else
            </button>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Timeline */}
      <div ref={timelineRef} className="flex-1 overflow-y-auto px-4 space-y-2 pb-4">
        <AnimatePresence initial={false}>
          {activities.map(a => <ActivityCard key={a.id} activity={a} />)}
        </AnimatePresence>
        {activities.length === 0 && (
          <div className="text-center py-8 text-gray-600 text-sm">Timeline will build as you work</div>
        )}
      </div>

      {/* Bottom Bar */}
      <div className="flex-shrink-0 bg-gray-900 border-t border-gray-800 px-4 py-3 flex gap-3 items-center">
        <button onClick={handleCameraPress}
          className="w-12 h-12 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center flex-shrink-0">
          <Camera size={20} className="text-white" />
        </button>
        <button onClick={() => openModal('voice')}
          className="flex-1 h-12 rounded-2xl bg-purple-700 flex items-center justify-center gap-2 font-bold text-white text-sm">
          <Mic size={18} />
          Hold to Record
        </button>
        <button onClick={() => openModal('fab-menu')}
          className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center flex-shrink-0">
          <Plus size={22} className="text-gray-950" />
        </button>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {state.toastMessage && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs font-medium px-4 py-2.5 rounded-full shadow-xl border border-gray-700 whitespace-nowrap z-50">
            {state.toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODALS */}
      <AnimatePresence>
        {activeModal === 'fab-menu' && (
          <FabMenu jobState={jobState} onClose={closeModal}
            onSelect={m => { closeModal(); setTimeout(() => openModal(m), 80); }}
            onRepairDone={() => { dispatch({ type: 'SET_JOB_STATE', payload: 'REPAIR_COMPLETED' }); toast('Repair marked complete'); closeModal(); }}
          />
        )}
        {activeModal === 'nameplate' && (
          <NameplateModal onClose={closeModal} onConfirm={(result) => {
            dispatch({ type: 'SET_NAMEPLATE_VERIFIED' });
            const hasData = Object.values(result.fields).some(v => v !== null);
            const make    = result.fields.make  ?? 'Unknown';
            const model   = result.fields.model ?? 'Unknown';
            const serial  = result.fields.serial;
            addActivity({
              id: `nameplate-${Date.now()}`, type: 'nameplate', timestamp: currentTime(),
              title: hasData ? 'Nameplate Captured' : 'Equipment ID Skipped',
              subtitle: hasData
                ? `${make} ${model}${serial ? ` · SN: ${serial}` : ''}`
                : 'No nameplate data · Manual entry required',
              badge: result.source === 'manual' ? '✎ Manual' : '📷 Camera',
              nameplateResult: result,
            }, 'EQUIPMENT_VERIFIED', hasData ? 8 : 3);
            toast(hasData ? '✓ Equipment identified' : '📋 Equipment ID logged');
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
          <VoiceModal onClose={closeModal} onSave={(transcript, conf) => {
            const nextState: JobState | undefined =
              jobState === 'MEASUREMENTS_CAPTURED' ? 'ROOT_CAUSE_IDENTIFIED' : undefined;
            addActivity({
              id: `voice-${Date.now()}`, type: 'voice', timestamp: currentTime(),
              title: 'Voice Note', transcript, confidence: conf,
            }, nextState, 3);
            toast('🎤 Voice note saved');
          }} />
        )}
        {activeModal === 'measurements-initial' && (
          <MeasurementModal mode="initial" onClose={closeModal} onSave={readings => {
            dispatch({ type: 'SET_INITIAL_MEASUREMENTS', payload: readings });
            addActivity({
              id: `meas-${Date.now()}`, type: 'measurement', timestamp: currentTime(),
              title: 'Initial Measurements', subtitle: 'Head: 385 psi ↑  ·  Superheat: 24°F ↑  ·  Delta T: 11°F ↓',
              measurements: readings,
            }, 'MEASUREMENTS_CAPTURED', 12);
            setTimeout(() => {
              dispatch({ type: 'ADD_ACTIVITY', payload: {
                id: `ai-${Date.now()}`, type: 'ai-suggestion', timestamp: currentTime(),
                title: 'AI Observation', subtitle: 'High head + elevated superheat indicates condenser restriction. Pattern matches Code 82 on 2 previous visits.',
                isAISuggestion: true,
              }});
            }, 600);
            toast('📈 Measurements recorded');
          }} />
        )}
        {activeModal === 'measurements-verification' && (
          <MeasurementModal mode="verification" onClose={closeModal} onSave={readings => {
            dispatch({ type: 'SET_VERIFICATION_MEASUREMENTS', payload: readings });
            addActivity({
              id: `verif-${Date.now()}`, type: 'verification', timestamp: currentTime(),
              title: 'Verification Measurements', subtitle: 'All readings within spec  ✓',
              measurements: readings,
            }, 'VERIFICATION_COMPLETE', 15);
            toast('✅ Verification complete');
          }} />
        )}
        {activeModal === 'part' && (
          <PartModal jobState={jobState} onClose={closeModal} onSave={(name, detail, qty) => {
            dispatch({ type: 'ADD_PART', payload: { id: `part-${Date.now()}`, name, qty, detail } });
            const advancesToRepair: JobState[] = ['ROOT_CAUSE_IDENTIFIED','EQUIPMENT_VERIFIED','INITIAL_OBSERVATION','MEASUREMENTS_CAPTURED'];
            addActivity({
              id: `part-${Date.now()}`, type: 'part', timestamp: currentTime(),
              title: name, subtitle: detail, partQty: qty,
            }, advancesToRepair.includes(jobState) ? 'REPAIR_IN_PROGRESS' : undefined, 10);
            toast(`🔧 ${name} logged`);
          }} />
        )}
        {activeModal === 'photo' && (
          <PhotoModal jobState={jobState} onClose={closeModal} onSave={(label, color, photoDataUrl, notes) => {
            addActivity({
              id: `photo-${Date.now()}`, type: 'photo', timestamp: currentTime(),
              title: 'Photo Captured', photoLabel: label, photoColor: color,
              photoDataUrl: photoDataUrl ?? undefined,
              photoNotes: notes || undefined,
            }, undefined, 5);
            toast('📷 Photo saved');
          }} />
        )}
        {activeModal === 'recommendations' && (
          <RecommendationsModal onClose={closeModal} onSave={recs => {
            dispatch({ type: 'SET_RECOMMENDATIONS', payload: recs });
            recs.forEach((r, i) => {
              setTimeout(() => {
                dispatch({ type: 'ADD_ACTIVITY', payload: {
                  id: `rec-${Date.now()}-${i}`, type: 'recommendation', timestamp: currentTime(),
                  title: 'Recommendation', subtitle: r,
                }});
              }, i * 80);
            });
            dispatch({ type: 'SET_JOB_STATE', payload: 'RECOMMENDATIONS_ADDED' });
            dispatch({ type: 'SET_COMPLETION_SCORE', payload: Math.min(100, completionScore + 5) });
            closeModal();
            toast(`📋 ${recs.length} recommendation${recs.length !== 1 ? 's' : ''} added`);
          }} />
        )}
        {activeModal === 'customer-summary' && (
          <CustomerSummaryModal state={state} onClose={closeModal} onReviewed={() => {
            addActivity({
              id: `review-${Date.now()}`, type: 'note', timestamp: currentTime(),
              title: 'Customer Review Complete', subtitle: 'Summary reviewed with building engineer',
            }, 'CUSTOMER_REVIEWED', 3);
            toast('👤 Customer review logged');
          }} />
        )}
        {activeModal === 'note' && (
          <NoteModal onClose={closeModal} onSave={text => {
            addActivity({ id: `note-${Date.now()}`, type: 'note', timestamp: currentTime(), title: 'Note', subtitle: text }, undefined, 1);
            toast('📝 Note saved');
          }} />
        )}
        {activeModal === 'ai-assist' && (
          <AiAssistModal onClose={closeModal} state={state} />
        )}
        {activeModal === 'refrigerant-assistant' && (
          <RefrigerantAssistant
            onClose={closeModal}
            onLogMeasurement={(readings) => {
              addActivity({
                id: `refrigerant-${Date.now()}`,
                type: 'measurement',
                timestamp: currentTime(),
                title: 'Refrigerant Check',
                subtitle: readings.map(r => `${r.label}: ${r.value} ${r.unit}`).join(' · '),
                measurements: readings,
              }, 'MEASUREMENTS_CAPTURED', 8);
              toast('🌡️ Refrigerant readings logged');
            }}
            initialSuctionPressure="115"
            initialHeadPressure="385"
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
  const expandable = !!(a.measurements || a.transcript);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className={`${colors.bg} border-l-4 ${colors.border} rounded-r-2xl rounded-bl-2xl p-3 ${expandable ? 'cursor-pointer' : ''}`}
      onClick={() => expandable && setExpanded(e => !e)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className={`text-[9px] font-bold uppercase tracking-wider ${colors.label}`}>{colors.icon} {a.type.replace(/-/g, ' ')}</span>
            {a.badge && <span className="text-[9px] bg-green-900/50 text-green-400 px-1.5 py-0.5 rounded-full font-semibold">{a.badge}</span>}
          </div>
          <div className="font-semibold text-white text-sm leading-snug">{a.title}</div>
          {a.subtitle && <div className="text-xs text-gray-400 mt-0.5 leading-relaxed">{a.subtitle}</div>}
          {a.transcript && !expanded && (
            <div className="text-xs text-gray-500 mt-1 italic truncate">"{a.transcript.substring(0, 65)}..."</div>
          )}
        </div>
        <div className="text-[10px] text-gray-600 font-mono flex-shrink-0">{a.timestamp}</div>
      </div>
      {/* Photo preview */}
      {a.type === 'photo' && (a.photoDataUrl || a.photoLabel) && (
        a.photoDataUrl ? (
          <div className="mt-2 rounded-xl overflow-hidden">
            <img src={a.photoDataUrl} alt={a.photoLabel ?? 'Photo'} className="w-full max-h-48 object-cover" />
            {(a.photoLabel || a.photoNotes) && (
              <div className={`px-2 py-1.5 ${a.photoColor ?? 'bg-gray-800'} flex items-center justify-between`}>
                <span className="text-xs text-white/80 font-medium">{a.photoLabel}</span>
                {a.photoNotes && <span className="text-xs text-white/50 truncate ml-2">{a.photoNotes}</span>}
              </div>
            )}
          </div>
        ) : (
          <div className={`mt-2 h-20 rounded-xl flex items-center justify-center ${a.photoColor ?? 'bg-gray-800'}`}>
            <div className="text-center">
              <div className="text-2xl mb-0.5">📷</div>
              <div className="text-xs text-white/70 font-medium">{a.photoLabel}</div>
            </div>
          </div>
        )
      )}
      {a.type === 'nameplate' && (
        <div className="mt-2 bg-blue-900/40 rounded-xl p-2.5 text-[10px]">
          {a.nameplateResult ? (
            <>
              <div className={`text-[8px] font-bold uppercase tracking-wider mb-2 ${
                a.nameplateResult.source === 'manual' ? 'text-blue-400' : 'text-amber-400'
              }`}>
                {a.nameplateResult.source === 'manual' ? '✎ Manual Entry' : '📷 Camera Capture'}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(['make', 'model', 'serial', 'capacity', 'refrigerant', 'voltage'] as const).map(field => {
                  const val = a.nameplateResult!.fields[field];
                  return (
                    <div key={field}>
                      <div className="text-gray-500 capitalize">{field}</div>
                      <div className={val ? 'text-white font-semibold' : 'text-gray-600 italic text-[9px]'}>
                        {val ?? 'Not detected.'}
                      </div>
                    </div>
                  );
                })}
              </div>
              {a.nameplateResult.needsManualReview && (
                <div className="mt-2 text-amber-400/70 text-[9px]">⚠ Manual review needed</div>
              )}
            </>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <div><div className="text-gray-500">Make</div><div className="text-white font-semibold">{MOCK_EQUIPMENT.make}</div></div>
              <div><div className="text-gray-500">Capacity</div><div className="text-white font-semibold">{MOCK_EQUIPMENT.capacity}</div></div>
              <div><div className="text-gray-500">Refrigerant</div><div className="text-white font-semibold">{MOCK_EQUIPMENT.refrigerant}</div></div>
            </div>
          )}
        </div>
      )}
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

// ─── Modal shell ──────────────────────────────────────────────────────────────
function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 z-40 flex items-end" onClick={onClose}>
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
function FabMenu({ jobState, onClose, onSelect, onRepairDone }: {
  jobState: JobState; onClose: () => void;
  onSelect: (m: ModalType) => void; onRepairDone: () => void;
}) {
  const verifyModal: ModalType = (jobState === 'REPAIR_COMPLETED' || jobState === 'VERIFICATION_COMPLETE') ? 'measurements-verification' : 'measurements-initial';
  const actions: { icon: React.ReactNode; label: string; modal: ModalType }[] = [
    { icon: <Camera size={20} />,    label: 'Photo',          modal: 'photo' },
    { icon: <Mic size={20} />,       label: 'Voice Note',     modal: 'voice' },
    { icon: <Zap size={20} />,       label: 'Alarm Code',     modal: 'alarm' },
    { icon: <Wrench size={20} />,    label: 'Part / Material', modal: 'part' },
    { icon: <FileText size={20} />,  label: 'Measurements',   modal: verifyModal },
    { icon: <FileText size={20} />,  label: 'Note',           modal: 'note' },
    { icon: <Cpu size={20} />,         label: 'AI Assist',        modal: 'ai-assist' },
    { icon: <Thermometer size={20} />, label: 'Refrigerant Check', modal: 'refrigerant-assistant' },
    { icon: <CheckSquare size={20} />, label: 'Recommendations',   modal: 'recommendations' },
  ];
  return (
    <ModalShell title="Add Activity" onClose={onClose}>
      <div className="grid grid-cols-4 gap-3">
        {actions.map(a => (
          <button key={a.label} onClick={() => onSelect(a.modal)}
            className="flex flex-col items-center gap-2 p-3 bg-gray-800 rounded-2xl">
            <div className="text-white">{a.icon}</div>
            <span className="text-[10px] text-gray-300 font-medium text-center leading-tight">{a.label}</span>
          </button>
        ))}
      </div>
      {jobState === 'REPAIR_IN_PROGRESS' && (
        <button onClick={onRepairDone}
          className="w-full mt-4 bg-green-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2">
          <CheckCircle size={18} /> Mark Repair Complete
        </button>
      )}
    </ModalShell>
  );
}

// ─── Nameplate modal — safe prototype flow ────────────────────────────────────
interface QualityCheckDef  { id: string; label: string; ms: number }
interface QualityCheckState { id: string; label: string; status: 'pending' | 'running' | 'pass' }

const QUALITY_CHECK_DEFS: QualityCheckDef[] = [
  { id: 'received',  label: 'Image received',           ms: 350 },
  { id: 'focus',     label: 'Checking focus',           ms: 550 },
  { id: 'lighting',  label: 'Checking lighting',        ms: 550 },
  { id: 'text',      label: 'Looking for text regions', ms: 500 },
  { id: 'nameplate', label: 'Identifying nameplate',    ms: 700 },
];

const NAMEPLATE_FIELD_DEFS: Array<{ key: keyof NameplateFields; label: string; placeholder: string }> = [
  { key: 'make',        label: 'Make',          placeholder: 'e.g. Carrier' },
  { key: 'model',       label: 'Model',         placeholder: 'e.g. 50XCQ006006' },
  { key: 'serial',      label: 'Serial Number', placeholder: 'e.g. 4321A8876' },
  { key: 'capacity',    label: 'Capacity',      placeholder: 'e.g. 7.5 Ton' },
  { key: 'refrigerant', label: 'Refrigerant',   placeholder: 'e.g. R-410A' },
  { key: 'voltage',     label: 'Voltage',       placeholder: 'e.g. 208/230V 3-Phase' },
  { key: 'phase',       label: 'Phase',         placeholder: 'e.g. 3-Phase' },
];

type NameplatePhase = 'capture' | 'analyzing' | 'result' | 'manual' | 'confirm';

function NameplateModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: (result: NameplateScanResult) => void }) {
  const [phase, setPhase]               = useState<NameplatePhase>('capture');
  const [checkIndex, setCheckIndex]     = useState(0);
  const [scanResult, setScanResult]     = useState<NameplateScanResult | null>(null);
  const [confirmResult, setConfirmResult] = useState<NameplateScanResult | null>(null);
  const [manualFields, setManualFields] = useState<NameplateFields>({
    make: null, model: null, serial: null, capacity: null, refrigerant: null, voltage: null, phase: null,
  });

  const checks: QualityCheckState[] = QUALITY_CHECK_DEFS.map((def, i) => ({
    id: def.id, label: def.label,
    status: i < checkIndex ? 'pass' : i === checkIndex ? 'running' : 'pending',
  }));

  function startCapture() {
    setCheckIndex(0);
    setPhase('analyzing');
    let delay = 0;
    QUALITY_CHECK_DEFS.forEach((def, i) => {
      delay += def.ms;
      setTimeout(() => setCheckIndex(i + 1), delay);
    });
    const total = QUALITY_CHECK_DEFS.reduce((s, d) => s + d.ms, 0);
    setTimeout(() => {
      const r: NameplateScanResult = {
        detected: false, confidence: 0,
        fields: { make: null, model: null, serial: null, capacity: null, refrigerant: null, voltage: null, phase: null },
        fieldConfidence: {},
        warnings: ['Prototype mode — camera input is not analyzed. No real OCR is running.'],
        needsManualReview: true,
        source: 'prototype',
      };
      setScanResult(r);
      setPhase('result');
    }, total + 300);
  }

  function buildManualResult(): NameplateScanResult {
    const fields: NameplateFields = {
      make:        manualFields.make        || null,
      model:       manualFields.model       || null,
      serial:      manualFields.serial      || null,
      capacity:    manualFields.capacity    || null,
      refrigerant: manualFields.refrigerant || null,
      voltage:     manualFields.voltage     || null,
      phase:       manualFields.phase       || null,
    };
    const fieldConf: Partial<Record<keyof NameplateFields, number>> = {};
    (Object.keys(fields) as Array<keyof NameplateFields>).forEach(k => {
      if (fields[k] !== null) fieldConf[k] = 100;
    });
    return {
      detected: Object.values(fields).some(v => v !== null),
      confidence: 100, fields, fieldConfidence: fieldConf,
      warnings: [], needsManualReview: false, source: 'manual',
    };
  }

  const anyManualFilled = Object.values(manualFields).some(v => v !== null && v !== '');

  return (
    <ModalShell title="Nameplate Capture" onClose={onClose}>

      {/* ── CAPTURE ──────────────────────────────────────────────────────────── */}
      {phase === 'capture' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 bg-blue-950/30 border border-blue-800/40 rounded-xl px-3 py-2">
            <span className="text-blue-400 text-[10px] font-black uppercase tracking-wider">📷 Nameplate Capture</span>
            <span className="text-blue-300/70 text-[10px]">Position nameplate and tap Capture.</span>
          </div>
          <div className="relative w-full h-52 bg-gray-800 rounded-2xl overflow-hidden flex items-center justify-center">
            <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-teal-400 rounded-tl-sm" />
            <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-teal-400 rounded-tr-sm" />
            <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-teal-400 rounded-bl-sm" />
            <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-teal-400 rounded-br-sm" />
            <div className="text-center">
              <Camera size={32} className="text-gray-600 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Position nameplate in frame</p>
              <p className="text-gray-600 text-xs mt-1">Fill frame · Hold steady · Good lighting</p>
            </div>
          </div>
          <button onClick={startCapture}
            className="w-full bg-white text-gray-950 font-bold py-4 rounded-2xl flex items-center justify-center gap-2">
            <Camera size={18} /> Capture Nameplate
          </button>
          <button onClick={() => setPhase('manual')}
            className="w-full py-3 text-sm font-semibold text-gray-400 border border-gray-700 rounded-2xl">
            ✏ Enter Manually Instead
          </button>
        </div>
      )}

      {/* ── ANALYZING ────────────────────────────────────────────────────────── */}
      {phase === 'analyzing' && (
        <div className="space-y-4">
          <div className="w-full h-28 bg-gray-800 rounded-2xl flex items-center justify-center">
            <div className="text-center">
              <motion.div className="flex gap-1.5 justify-center mb-2"
                animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 0.8 }}>
                {[0,1,2].map(i => <div key={i} className="w-2 h-2 bg-blue-400 rounded-full" />)}
              </motion.div>
              <p className="text-sm text-gray-400">Analyzing image...</p>
            </div>
          </div>
          <div className="bg-gray-800 rounded-2xl p-4 space-y-2.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Image Quality Checks</div>
            {checks.map(c => (
              <div key={c.id} className="flex items-center gap-2.5">
                {c.status === 'pass'    && <CheckCircle size={13} className="text-green-400 flex-shrink-0" />}
                {c.status === 'running' && (
                  <motion.div className="w-3.5 h-3.5 rounded-full border-2 border-blue-400 border-t-transparent flex-shrink-0"
                    animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.7, ease: 'linear' }} />
                )}
                {c.status === 'pending' && <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-600 flex-shrink-0" />}
                <span className={`text-xs ${c.status === 'pass' ? 'text-green-400' : c.status === 'running' ? 'text-blue-300' : 'text-gray-600'}`}>
                  {c.label}
                </span>
              </div>
            ))}
          </div>
          <div className="text-[10px] text-blue-400/70 text-center">Running image quality checks…</div>
        </div>
      )}

      {/* ── RESULT ────────────────────────────────────────────────────────────── */}
      {phase === 'result' && scanResult && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-700 border border-gray-600 flex items-center justify-center flex-shrink-0">
              <span className="text-lg">📋</span>
            </div>
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">Scan Complete</div>
              <div className="text-sm font-bold text-white mb-1">Fields not detected</div>
              <p className="text-xs text-gray-500 leading-relaxed">
                AI did not detect readable text. Retake the photo or enter equipment data manually.
              </p>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-3">Scan Results</div>
            <div className="grid grid-cols-2 gap-2.5">
              {NAMEPLATE_FIELD_DEFS.map(f => (
                <div key={f.key}>
                  <div className="text-[9px] text-gray-600 mb-0.5">{f.label}</div>
                  <div className="text-[11px] text-gray-600 italic">Not detected.</div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-start gap-2 bg-amber-950/20 border border-amber-900/30 rounded-xl px-3 py-2">
              <AlertTriangle size={11} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-amber-400/80 leading-relaxed">
                AI never invents Make, Model, Serial, or any nameplate field. Blank means not detected.
              </p>
            </div>
          </div>

          <button onClick={() => setPhase('manual')}
            className="w-full bg-white text-gray-950 font-bold py-4 rounded-2xl flex items-center justify-center gap-2">
            ✏ Enter Equipment Data Manually
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => { setCheckIndex(0); setPhase('capture'); }}
              className="py-3 bg-gray-800 border border-gray-700 text-sm font-semibold text-gray-300 rounded-2xl flex items-center justify-center gap-1.5">
              <Camera size={13} /> Retake Photo
            </button>
            <button onClick={() => { setConfirmResult(scanResult); setPhase('confirm'); }}
              className="py-3 bg-gray-800 border border-gray-700 text-sm text-gray-500 rounded-2xl">
              Skip Equipment ID
            </button>
          </div>
          <button onClick={() => {
            const r: NameplateScanResult = {
              detected: true, confidence: 0,
              fields: {
                make: MOCK_EQUIPMENT.make, model: MOCK_EQUIPMENT.model,
                serial: MOCK_EQUIPMENT.serial, capacity: MOCK_EQUIPMENT.capacity,
                refrigerant: MOCK_EQUIPMENT.refrigerant, voltage: MOCK_EQUIPMENT.voltage, phase: null,
              },
              fieldConfidence: {},
              warnings: [
                'SAMPLE DATA — not from the scanned image.',
                'For prototype demonstration only. Do not use in real service records.',
              ],
              needsManualReview: true,
              source: 'prototype',
            };
            setConfirmResult(r);
            setPhase('confirm');
          }} className="w-full py-2 text-[10px] text-gray-600 border border-gray-800 rounded-xl">
            Use Sample Nameplate (demo only)
          </button>
        </motion.div>
      )}

      {/* ── MANUAL ENTRY ─────────────────────────────────────────────────────── */}
      {phase === 'manual' && (
        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-3">
          <div className="flex items-center justify-between mb-1">
            <button onClick={() => setPhase(scanResult ? 'result' : 'capture')} className="text-xs text-gray-500">← Back</button>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Manual Entry</span>
          </div>
          <p className="text-xs text-gray-500 pb-1">Enter what you can read from the nameplate. All fields are optional.</p>
          {NAMEPLATE_FIELD_DEFS.map(def => (
            <div key={def.key}>
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">{def.label}</label>
              <input
                value={manualFields[def.key] ?? ''}
                onChange={e => setManualFields(prev => ({ ...prev, [def.key]: e.target.value || null }))}
                placeholder={def.placeholder}
                className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 border border-gray-700 text-sm placeholder-gray-600 focus:border-teal-600 outline-none"
              />
            </div>
          ))}
          <button
            onClick={() => { setConfirmResult(buildManualResult()); setPhase('confirm'); }}
            className={`w-full font-bold py-4 rounded-2xl mt-1 ${anyManualFilled ? 'bg-white text-gray-950' : 'bg-gray-800 border border-gray-700 text-gray-500'}`}>
            {anyManualFilled ? 'Review & Confirm' : 'Skip Equipment ID'}
          </button>
        </motion.div>
      )}

      {/* ── CONFIRM ──────────────────────────────────────────────────────────── */}
      {phase === 'confirm' && confirmResult && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className={`rounded-xl px-3 py-2.5 flex items-center gap-2.5 ${
            confirmResult.source === 'manual'
              ? 'bg-blue-950/30 border border-blue-800/50'
              : 'bg-amber-950/30 border border-amber-800/40'
          }`}>
            <span className="text-base">{confirmResult.source === 'manual' ? '✏' : '📷'}</span>
            <div>
              <div className={`text-[10px] font-bold uppercase tracking-wider ${confirmResult.source === 'manual' ? 'text-blue-400' : 'text-amber-400'}`}>
                Source: {confirmResult.source === 'manual' ? 'Manual Entry' : 'Camera Capture'}
              </div>
              <div className="text-[9px] text-gray-500">Source is recorded in the service record.</div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl divide-y divide-gray-800">
            {NAMEPLATE_FIELD_DEFS.map(def => {
              const val  = confirmResult.fields[def.key];
              const conf = confirmResult.fieldConfidence[def.key];
              return (
                <div key={def.key} className="flex items-center justify-between px-4 py-3">
                  <span className="text-xs text-gray-400">{def.label}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-mono font-semibold ${val ? 'text-white' : 'text-gray-600 italic'}`}>
                      {val ?? 'Not detected.'}
                    </span>
                    {val && conf !== undefined && (
                      <span className="text-[8px] text-gray-600">{conf}%</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <button onClick={() => onConfirm(confirmResult)}
            className="w-full bg-white text-gray-950 font-bold py-4 rounded-2xl flex items-center justify-center gap-2">
            <CheckCircle size={16} /> Confirm & Save to Record
          </button>
          <button onClick={() => setPhase(confirmResult.source === 'manual' ? 'manual' : 'result')}
            className="w-full py-3 text-center text-sm text-gray-500">
            ← Correct Equipment Data
          </button>
        </motion.div>
      )}

    </ModalShell>
  );
}

// ─── Alarm modal ──────────────────────────────────────────────────────────────
function AlarmModal({ onClose, onSave }: { onClose: () => void; onSave: (code: string, desc: string) => void }) {
  const [code, setCode] = useState('82');
  const desc = FAULT_CODES[code] ?? 'Unknown fault code — log for reference.';
  return (
    <ModalShell title="Log Alarm Code" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider block mb-1.5">Fault Code</label>
          <input value={code} onChange={e => setCode(e.target.value)}
            className="w-full bg-gray-800 text-white text-2xl font-bold rounded-2xl px-4 py-4 border border-gray-700 text-center font-mono"
            placeholder="00" />
        </div>
        {FAULT_CODES[code] && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-red-950/50 border border-red-800 rounded-2xl p-4">
            <div className="text-xs font-bold text-red-400 mb-1">Code {code}</div>
            <p className="text-sm text-gray-300 leading-relaxed">{desc}</p>
          </motion.div>
        )}
        <div className="grid grid-cols-5 gap-2">
          {['81','82','22','31','14'].map(c => (
            <button key={c} onClick={() => setCode(c)}
              className={`py-2 rounded-xl text-sm font-bold border ${c === code ? 'border-white bg-gray-700 text-white' : 'border-gray-700 text-gray-400'}`}>{c}</button>
          ))}
        </div>
        <button onClick={() => onSave(code, desc.split('—')[0].trim())}
          className="w-full bg-red-600 text-white font-bold py-4 rounded-2xl">Log Alarm</button>
      </div>
    </ModalShell>
  );
}

// ─── Voice modal — random transcripts ─────────────────────────────────────────
function VoiceModal({ onClose, onSave }: { onClose: () => void; onSave: (t: string, conf: number) => void }) {
  const [phase, setPhase] = useState<'idle' | 'recording' | 'done'>('idle');
  const [secs, setSecs] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [confidence] = useState(() => 88 + Math.floor(Math.random() * 10));

  function startRecording() {
    const t = randomVoiceNote();
    setTranscript(t);
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
            <p className="text-gray-400 text-sm mb-6">Tap to start recording</p>
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
                <motion.div key={i} className="w-1 bg-purple-400 rounded-full"
                  animate={{ height: [h*3, h*5, h*3] }}
                  transition={{ repeat: Infinity, duration: 0.5 + i*0.07, ease: 'easeInOut' }} />
              ))}
            </div>
            <div className="text-purple-300 font-mono font-bold text-xl mb-2">{String(secs).padStart(2,'0')}s</div>
          </div>
        )}
        {phase === 'done' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="bg-purple-950/50 border border-purple-800 rounded-2xl p-4 mb-4 text-left">
              <div className="text-[10px] font-bold uppercase tracking-wider text-purple-400 mb-2">AI Transcript</div>
              <p className="text-sm text-gray-200 leading-relaxed italic">"{transcript}"</p>
              <div className="mt-2 text-[10px] text-purple-400 font-semibold">{confidence}% confidence</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => { setPhase('idle'); setSecs(0); }} className="py-3 rounded-2xl bg-gray-800 text-gray-300 font-semibold text-sm">Re-record</button>
              <button onClick={() => onSave(transcript, confidence)} className="py-3 rounded-2xl bg-purple-700 text-white font-bold text-sm">Save Note</button>
            </div>
          </motion.div>
        )}
      </div>
    </ModalShell>
  );
}

// ─── Measurement modal ─────────────────────────────────────────────────────────
function MeasurementModal({ mode, onClose, onSave }: { mode: 'initial' | 'verification'; onClose: () => void; onSave: (r: MeasurementReading[]) => void }) {
  const defaults = mode === 'verification'
    ? INITIAL_MEASUREMENTS.map(m => ({ ...m, value: m.verificationValue ?? m.value, status: (m.verificationStatus ?? 'ok') as 'ok' | 'warn' | 'alert' }))
    : INITIAL_MEASUREMENTS;
  const [readings, setReadings] = useState<MeasurementReading[]>(defaults.map(m => ({ ...m })));
  return (
    <ModalShell title={mode === 'initial' ? 'Initial Measurements' : 'Verification Measurements'} onClose={onClose}>
      <div className="space-y-3">
        <div className="flex items-center gap-2 bg-blue-950/30 border border-blue-800/40 rounded-xl px-3 py-2">
          <span className="text-blue-400 text-[10px] font-semibold">Edit values as needed before saving.</span>
        </div>
        {mode === 'verification' && (
          <div className="bg-blue-950/40 border border-blue-800 rounded-xl p-3 text-xs text-blue-300">
            Post-repair readings — will be compared to initial measurements
          </div>
        )}
        {readings.map((m, i) => (
          <div key={i} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border ${m.status === 'ok' ? 'bg-green-950/30 border-green-900' : m.status === 'warn' ? 'bg-amber-950/30 border-amber-900' : 'bg-red-950/30 border-red-900'}`}>
            <div className="flex-1">
              <div className="text-[10px] text-gray-400">{m.label}</div>
              {m.target && <div className="text-[9px] text-gray-600">target: {m.target}</div>}
            </div>
            <div className="flex items-center gap-1">
              <input value={m.value} onChange={e => setReadings(prev => prev.map((r, idx) => idx === i ? { ...r, value: e.target.value } : r))}
                className="w-16 bg-gray-800 text-white font-bold text-right rounded-lg px-2 py-1 text-sm border border-gray-700" />
              <span className="text-xs text-gray-400 w-8">{m.unit}</span>
            </div>
            <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${m.status === 'ok' ? 'bg-green-900 text-green-400' : m.status === 'warn' ? 'bg-amber-900 text-amber-400' : 'bg-red-900 text-red-400'}`}>
              {m.status === 'ok' ? '✓' : m.status === 'warn' ? '↓' : '↑'}
            </div>
          </div>
        ))}
        <button onClick={() => onSave(readings)} className="w-full bg-green-600 text-white font-bold py-4 rounded-2xl mt-2">Save Readings</button>
      </div>
    </ModalShell>
  );
}

// ─── Part modal ── Parts Intelligence 2-step flow ─────────────────────────────

const EQUIPMENT_CONTEXT = getEquipmentPartsContext({
  equipmentType: MOCK_EQUIPMENT.type,
  make:          MOCK_EQUIPMENT.make,
  model:         MOCK_EQUIPMENT.model,
  serial:        MOCK_EQUIPMENT.serial,
  voltage:       MOCK_EQUIPMENT.voltage,
  refrigerant:   MOCK_EQUIPMENT.refrigerant,
});

const VAN_MATCH_COLORS: Record<string, string> = {
  'in-stock':            'bg-green-950/40 border-green-700/40 text-green-400',
  'low-stock':           'bg-amber-950/40 border-amber-700/40 text-amber-400',
  'out-of-stock':        'bg-red-950/40 border-red-700/40 text-red-400',
  'possible-substitute': 'bg-blue-950/40 border-blue-700/40 text-blue-400',
  'not-stocked':         'bg-gray-800 border-gray-700 text-gray-400',
  'verify-before-install':'bg-amber-950/40 border-amber-700/40 text-amber-400',
};
const VAN_MATCH_LABELS: Record<string, string> = {
  'in-stock':            '✓ In Van',
  'low-stock':           '⚠ Low Stock in Van',
  'out-of-stock':        '✕ Out of Stock',
  'possible-substitute': '~ Possible Substitute',
  'not-stocked':         '— Not Stocked in Van',
  'verify-before-install':'⚠ Verify Before Install',
};

function PartModal({ jobState: _j, onClose, onSave }: {
  jobState: JobState;
  onClose:  () => void;
  onSave:   (name: string, detail: string, qty: number) => void;
}) {
  const [step, setStep]         = useState<'select' | 'form' | 'manual'>('select');
  const [search, setSearch]     = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [specs, setSpecs]       = useState<Record<string, string>>({});
  const [notes, setNotes]       = useState('');
  const [qty, setQty]           = useState(1);
  const [manualName, setManualName]     = useState('');
  const [manualSource, setManualSource] = useState('Van stock');

  const partDef  = selected ? PARTS_MASTER[selected] : null;
  const vanMatch = partDef ? matchVanInventory(partDef, INITIAL_INVENTORY) : null;
  const results  = searchParts(search);

  function selectType(type: string) {
    setSelected(type);
    setSpecs({});
    setNotes('');
    setQty(1);
    setStep('form');
  }

  function handleSave() {
    if (!partDef) return;
    const allFields = [...partDef.requiredSpecs, ...partDef.optionalSpecs];
    const specStr = Object.entries(specs)
      .filter(([, v]) => v.trim())
      .map(([k, v]) => {
        const f = allFields.find(x => x.key === k);
        return `${f?.label ?? k}: ${v}${f?.unit ? ' ' + f.unit : ''}`;
      })
      .join(' · ');
    const full = [specStr, notes].filter(Boolean).join(' — ');
    onSave(partDef.partType, full || 'Part logged', qty);
  }

  function handleSaveManual() {
    if (!manualName.trim()) return;
    const full = [`Source: ${manualSource}`, notes].filter(Boolean).join(' — ');
    onSave(manualName.trim(), full, qty);
  }

  // ── Step 1: Part type selector ──────────────────────────────────────────────
  if (step === 'select') {
    return (
      <ModalShell title="Log Part / Repair" onClose={onClose}>
        <div className="space-y-3">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search part type…"
              autoFocus
              className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="space-y-1 max-h-64 overflow-y-auto pr-0.5">
            {results.slice(0, 22).map(type => {
              const def = PARTS_MASTER[type];
              return (
                <button key={type} onClick={() => selectType(type)}
                  className="w-full flex items-center gap-3 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-left hover:border-orange-600/50 transition-colors">
                  <div className="w-7 h-7 bg-orange-900/40 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Wrench size={12} className="text-orange-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{type}</div>
                    <div className="text-[10px] text-gray-500">{def.category}</div>
                  </div>
                  <ChevronRight size={13} className="text-gray-600 flex-shrink-0" />
                </button>
              );
            })}
            {results.length === 0 && (
              <div className="text-sm text-gray-500 text-center py-6">No parts match "{search}"</div>
            )}
          </div>

          <button onClick={() => setStep('manual')}
            className="w-full py-3 text-sm text-gray-500 border border-gray-800 rounded-2xl hover:text-gray-400 transition-colors">
            + Manual Entry
          </button>
        </div>
      </ModalShell>
    );
  }

  // ── Step 2: Smart part form ─────────────────────────────────────────────────
  if (step === 'form' && partDef) {
    const criticalMissing = partDef.requiredSpecs.filter(s => s.critical && !specs[s.key]?.trim());

    return (
      <ModalShell title={partDef.partType} onClose={onClose}>
        <div className="space-y-4">

          {/* Back */}
          <button onClick={() => setStep('select')}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-400 transition-colors">
            <ArrowLeft size={11} /> Back to part types
          </button>

          {/* Equipment context card */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-2.5">
            <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-1">Current Equipment</div>
            <div className="text-xs font-semibold text-white">{MOCK_EQUIPMENT.make} {MOCK_EQUIPMENT.model}</div>
            <div className="text-[10px] text-gray-500 mt-0.5">
              {MOCK_EQUIPMENT.type} · {MOCK_EQUIPMENT.refrigerant} · {MOCK_EQUIPMENT.voltage}
            </div>
            {EQUIPMENT_CONTEXT.likelyFailureParts.length > 0 && (
              <div className="text-[9px] text-blue-400 mt-1">
                Common for this unit: {EQUIPMENT_CONTEXT.likelyFailureParts.slice(0, 3).join(', ')}
              </div>
            )}
          </div>

          {/* Van inventory match */}
          {vanMatch && (
            <div className={`rounded-xl border px-3 py-2.5 ${VAN_MATCH_COLORS[vanMatch.status]}`}>
              <div className="text-[9px] font-bold uppercase tracking-wider mb-0.5 opacity-70">Van Stock</div>
              <div className="text-xs font-bold">{VAN_MATCH_LABELS[vanMatch.status]}</div>
              {vanMatch.itemName && (
                <div className="text-[10px] mt-0.5 opacity-80 font-medium">{vanMatch.itemName}{vanMatch.qty !== undefined ? ` — ${vanMatch.qty} on hand` : ''}</div>
              )}
              <div className="text-[10px] mt-0.5 opacity-70">{vanMatch.note}</div>
              {vanMatch.missingVerifications.length > 0 && (
                <div className="text-[10px] mt-1.5 font-semibold">
                  Verify before install: {vanMatch.missingVerifications.join(', ')}
                </div>
              )}
            </div>
          )}

          {/* Required specs */}
          {partDef.requiredSpecs.length > 0 && (
            <div className="space-y-2.5">
              <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Required Specs</div>
              {partDef.requiredSpecs.map(field => (
                <div key={field.key}>
                  <label className="flex items-center gap-1 text-[10px] text-gray-400 mb-1">
                    {field.label}
                    {field.critical && <span className="text-red-400 text-[9px]">*</span>}
                    {field.unit && <span className="text-gray-600">({field.unit})</span>}
                  </label>
                  {field.type === 'select' ? (
                    <select
                      value={specs[field.key] ?? ''}
                      onChange={e => setSpecs(p => ({ ...p, [field.key]: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500">
                      <option value="">Select…</option>
                      {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input
                      type={field.type === 'number' ? 'number' : 'text'}
                      value={specs[field.key] ?? ''}
                      onChange={e => setSpecs(p => ({ ...p, [field.key]: e.target.value }))}
                      placeholder={field.placeholder ?? ''}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Required photos */}
          {partDef.requiredPhotos.filter(p => p.required).length > 0 && (
            <div>
              <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-1.5">Photos Required</div>
              <div className="space-y-1">
                {partDef.requiredPhotos.filter(p => p.required).map((p, i) => (
                  <div key={i} className="flex items-start gap-2 text-[11px] text-gray-400">
                    <span className="text-amber-500 mt-0.5 flex-shrink-0 text-xs">📷</span>
                    <span>
                      <span className="font-semibold">{p.label}</span>
                      {' — '}{p.timing === 'before' ? 'Before removal' : p.timing === 'after' ? 'After install' : 'Any time'}
                      {p.note ? `: ${p.note}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Safety notes */}
          {partDef.safetyNotes.length > 0 && (
            <div className="bg-amber-950/25 border border-amber-800/40 rounded-xl px-3 py-2.5">
              <div className="text-[9px] font-bold uppercase tracking-wider text-amber-400 mb-1">Safety</div>
              {partDef.safetyNotes.slice(0, 2).map((n, i) => (
                <div key={i} className="text-[10px] text-amber-300 flex items-start gap-1.5 mt-0.5">
                  <AlertTriangle size={10} className="flex-shrink-0 mt-0.5" />{n}
                </div>
              ))}
            </div>
          )}

          {/* Online lookup placeholder */}
          <div className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-xl px-3 py-2.5">
            <div>
              <div className="text-[10px] text-gray-400 font-semibold">Search Replacement Online</div>
              <div className="text-[9px] text-gray-600">Grainger · Johnstone · Ferguson · OEM lookup</div>
            </div>
            <span className="text-[9px] bg-gray-800 text-gray-500 border border-gray-700 px-2 py-1 rounded-lg font-semibold whitespace-nowrap">Coming Soon</span>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[10px] text-gray-400 uppercase tracking-wider mb-1">Notes / Detail</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Replaced failed unit — confirmed from nameplate. Amp draw 3.2A after install."
              rows={2}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 resize-none"
            />
          </div>

          {/* Qty stepper */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Quantity</span>
            <div className="flex items-center gap-3">
              <button onClick={() => setQty(q => Math.max(1, q - 1))}
                className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-white font-bold">−</button>
              <span className="text-white font-bold w-6 text-center">{qty}</span>
              <button onClick={() => setQty(q => q + 1)}
                className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-white font-bold">+</button>
            </div>
          </div>

          {/* Missing specs warning */}
          {criticalMissing.length > 0 && (
            <div className="text-[10px] text-amber-400 bg-amber-950/20 border border-amber-800/30 rounded-xl px-3 py-2">
              Missing required specs: {criticalMissing.map(s => s.label).join(', ')}. You can still save — these improve the service record.
            </div>
          )}

          <button onClick={handleSave}
            className="w-full bg-orange-600 text-white font-bold py-4 rounded-2xl">
            Log Part / Repair
          </button>
        </div>
      </ModalShell>
    );
  }

  // ── Manual entry ────────────────────────────────────────────────────────────
  return (
    <ModalShell title="Manual Part Entry" onClose={onClose}>
      <div className="space-y-3">
        <button onClick={() => setStep('select')}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-400 transition-colors">
          <ArrowLeft size={11} /> Back to part types
        </button>

        <div>
          <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">
            Part Name / Description <span className="text-red-400">*</span>
          </label>
          <input value={manualName} onChange={e => setManualName(e.target.value)}
            placeholder="e.g. Belt 3VX450, 35/5 µF Dual Run Cap, Nu-Brite cleaning"
            className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 border border-gray-700 text-sm placeholder-gray-600" />
        </div>

        <div>
          <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Source</label>
          <select value={manualSource} onChange={e => setManualSource(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white">
            {['Van stock', 'Shop stock', 'Supply house', 'Customer supplied', 'Unknown'].map(s => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Notes</label>
          <input value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="e.g. Replaced worn belt, 0.75 lbs R-410A added, confirmed from nameplate"
            className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 border border-gray-700 text-sm placeholder-gray-600" />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Quantity</span>
          <div className="flex items-center gap-3">
            <button onClick={() => setQty(q => Math.max(1, q - 1))}
              className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-white font-bold">−</button>
            <span className="text-white font-bold w-6 text-center">{qty}</span>
            <button onClick={() => setQty(q => q + 1)}
              className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-white font-bold">+</button>
          </div>
        </div>

        <button onClick={handleSaveManual} disabled={!manualName.trim()}
          className="w-full bg-orange-600 text-white font-bold py-4 rounded-2xl disabled:opacity-50">
          Save Part
        </button>
      </div>
    </ModalShell>
  );
}

// ─── Photo modal ──────────────────────────────────────────────────────────────
const PHOTO_TYPES = [
  { label: 'Nameplate',    color: 'bg-blue-900/60' },
  { label: 'Failed Part',  color: 'bg-red-900/60' },
  { label: 'Repair',       color: 'bg-orange-900/60' },
  { label: 'Wiring',       color: 'bg-yellow-900/60' },
  { label: 'Measurement',  color: 'bg-green-900/60' },
  { label: 'Overall Unit', color: 'bg-gray-800' },
];

function compressImageJmp(file: File, maxWidth = 1200, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('canvas')); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target!.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function PhotoModal({ jobState: _j, onClose, onSave }: {
  jobState: JobState;
  onClose: () => void;
  onSave: (label: string, color: string, photoDataUrl: string | null, notes: string) => void;
}) {
  const [selected, setSelected] = useState(PHOTO_TYPES[2]);
  const [notes, setNotes] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCompressing(true);
    try {
      const dataUrl = await compressImageJmp(file);
      setPreview(dataUrl);
    } catch {
      setPreview(null);
    } finally {
      setCompressing(false);
      e.target.value = '';
    }
  }

  return (
    <ModalShell title="Capture Photo" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2">Category</div>
          <div className="grid grid-cols-3 gap-2">
            {PHOTO_TYPES.map(p => (
              <button key={p.label} onClick={() => setSelected(p)}
                className={`py-3 rounded-xl text-xs font-semibold border ${selected.label === p.label ? 'border-white text-white bg-gray-700' : 'border-gray-700 text-gray-400'}`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={handleFileChange}
        />

        {preview ? (
          <div className="relative rounded-2xl overflow-hidden">
            <img src={preview} alt="Captured" className="w-full max-h-56 object-cover rounded-2xl" />
            <button
              onClick={() => setPreview(null)}
              className="absolute top-2 right-2 bg-gray-900/80 text-white rounded-full p-1.5"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => inputRef.current?.click()}
            disabled={compressing}
            className="w-full bg-white text-gray-950 font-bold py-5 rounded-2xl flex items-center justify-center gap-2 text-lg disabled:opacity-60"
          >
            <Camera size={22} />
            {compressing ? 'Processing…' : 'Take Photo'}
          </button>
        )}

        {preview && (
          <button
            onClick={() => inputRef.current?.click()}
            className="w-full border border-gray-700 text-gray-400 font-semibold py-3 rounded-2xl flex items-center justify-center gap-2 text-sm"
          >
            <Camera size={16} /> Retake
          </button>
        )}

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          rows={2}
          className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-gray-500"
        />

        <button
          onClick={() => onSave(selected.label, selected.color, preview, notes)}
          disabled={!preview}
          className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-40"
        >
          Save Photo
        </button>
      </div>
    </ModalShell>
  );
}

// ─── Recommendations modal — production version (unlimited entries) ───────────
type RecPriority = 'normal' | 'high' | 'safety' | 'follow-up';
interface RecEntry {
  id: string;
  text: string;
  priority: RecPriority;
  dueDate: string;
  notes: string;
  isSuggested: boolean;
  selected: boolean;
}

const REC_PRIORITY_CONFIG: Record<RecPriority, { label: string; activeCls: string }> = {
  normal:      { label: 'Normal',     activeCls: 'bg-gray-700 border-gray-500 text-gray-200' },
  high:        { label: 'High',       activeCls: 'bg-orange-900/60 border-orange-600 text-orange-300' },
  safety:      { label: '⚠ Safety',   activeCls: 'bg-red-900/60 border-red-600 text-red-300' },
  'follow-up': { label: 'Follow-up',  activeCls: 'bg-blue-900/60 border-blue-600 text-blue-300' },
};

let _recSeq = 0;
function genRecId() { return `rec-${Date.now()}-${++_recSeq}`; }

function RecommendationsModal({ onClose, onSave }: { onClose: () => void; onSave: (recs: string[]) => void }) {
  const [entries, setEntries] = useState<RecEntry[]>(() =>
    SUGGESTED_RECOMMENDATIONS.map((text, i) => ({
      id: genRecId(),
      text,
      priority: i === 2 ? ('high' as RecPriority) : ('normal' as RecPriority),
      dueDate: '',
      notes: '',
      isSuggested: true,
      selected: i < 3,
    }))
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function toggle(id: string) {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, selected: !e.selected } : e));
  }
  function setPriority(id: string, p: RecPriority) {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, priority: p } : e));
  }
  function setEntryText(id: string, t: string) {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, text: t } : e));
  }
  function setEntryNotes(id: string, n: string) {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, notes: n } : e));
  }
  function setEntryDue(id: string, d: string) {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, dueDate: d } : e));
  }
  function deleteEntry(id: string) {
    setEntries(prev => prev.filter(e => e.id !== id));
    setExpandedId(prev => prev === id ? null : prev);
  }
  function addEntry() {
    const id = genRecId();
    setEntries(prev => [...prev, {
      id, text: '', priority: 'normal', dueDate: '', notes: '',
      isSuggested: false, selected: true,
    }]);
    setExpandedId(id);
  }

  function save() {
    const recs = entries
      .filter(e => e.selected && e.text.trim())
      .map(e => {
        let s = e.text.trim();
        if (e.priority === 'high')       s = `[HIGH PRIORITY] ${s}`;
        if (e.priority === 'safety')     s = `[⚠ SAFETY] ${s}`;
        if (e.priority === 'follow-up')  s = `[FOLLOW-UP] ${s}`;
        if (e.notes.trim())  s = `${s} — Note: ${e.notes.trim()}`;
        if (e.dueDate)       s = `${s} (Due: ${e.dueDate})`;
        return s;
      });
    onSave(recs);
  }

  const selectedCount = entries.filter(e => e.selected && e.text.trim()).length;

  return (
    <ModalShell title="Recommendations" onClose={onClose}>
      <div className="space-y-2.5">

        {/* Suggestion badge */}
        <div className="flex items-center gap-2 pb-1">
          <span className="text-xs text-gray-500 flex-1">Select, edit, or add recommendations below</span>
          <span className="text-[9px] font-bold bg-blue-950/30 text-blue-400 border border-blue-800/30 px-1.5 py-0.5 rounded flex-shrink-0">AI Suggestions</span>
        </div>

        {/* Entry list */}
        {entries.map(entry => {
          const isExpanded = expandedId === entry.id || (!entry.isSuggested && !entry.text);
          const cfg = REC_PRIORITY_CONFIG[entry.priority];
          return (
            <div key={entry.id}
              className={`rounded-2xl border transition-colors ${
                entry.selected
                  ? 'bg-amber-950/20 border-amber-800/60'
                  : 'bg-gray-800/60 border-gray-700/50'
              }`}>

              {/* Row: checkbox + text + expand + delete */}
              <div className="flex items-start gap-2.5 p-3.5">
                <button onClick={() => toggle(entry.id)}
                  className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 border transition-colors ${
                    entry.selected ? 'bg-amber-500 border-amber-500' : 'border-gray-600 bg-gray-800'
                  }`}>
                  {entry.selected && <span className="text-[10px] font-bold text-white">✓</span>}
                </button>

                <div className="flex-1 min-w-0">
                  {entry.isSuggested && entry.text && !isExpanded ? (
                    <button onClick={() => setExpandedId(prev => prev === entry.id ? null : entry.id)}
                      className="text-sm text-gray-200 leading-relaxed text-left w-full">
                      {entry.text}
                    </button>
                  ) : (
                    <textarea
                      value={entry.text}
                      onChange={e => setEntryText(entry.id, e.target.value)}
                      placeholder="Describe the recommendation…"
                      rows={2}
                      autoFocus={!entry.isSuggested}
                      className="w-full bg-gray-900 text-white text-sm rounded-xl px-3 py-2 border border-gray-700 focus:border-amber-600 outline-none resize-none"
                    />
                  )}
                  {/* Priority badge (when collapsed & selected) */}
                  {entry.selected && !isExpanded && entry.priority !== 'normal' && (
                    <span className={`inline-flex mt-1 text-[9px] font-bold border px-1.5 py-0.5 rounded ${cfg.activeCls}`}>
                      {cfg.label}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                  <button onClick={() => setExpandedId(prev => prev === entry.id ? null : entry.id)}
                    className="text-gray-600 hover:text-gray-300 transition-colors p-1">
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  <button onClick={() => deleteEntry(entry.id)}
                    className="text-gray-600 hover:text-red-400 transition-colors p-1">
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Expanded: priority + due date + notes */}
              {isExpanded && (
                <div className="px-3.5 pb-3.5 border-t border-gray-700/50 pt-3 space-y-3">
                  {/* Priority */}
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">Priority</div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {(Object.keys(REC_PRIORITY_CONFIG) as RecPriority[]).map(p => {
                        const pcfg = REC_PRIORITY_CONFIG[p];
                        const active = entry.priority === p;
                        return (
                          <button key={p} onClick={() => setPriority(entry.id, p)}
                            className={`py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${
                              active ? pcfg.activeCls : 'border-gray-700 bg-gray-800 text-gray-600'
                            }`}>
                            {pcfg.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Due date */}
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Due Date (optional)</div>
                    <input type="date" value={entry.dueDate}
                      onChange={e => setEntryDue(entry.id, e.target.value)}
                      className="w-full bg-gray-800 text-white text-xs rounded-lg px-3 py-2 border border-gray-700 focus:border-amber-600 outline-none" />
                  </div>

                  {/* Notes */}
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Notes (optional)</div>
                    <input value={entry.notes}
                      onChange={e => setEntryNotes(entry.id, e.target.value)}
                      placeholder="Add context, urgency, or timing…"
                      className="w-full bg-gray-800 text-white text-xs rounded-lg px-3 py-2 border border-gray-700 focus:border-amber-600 outline-none" />
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Add Recommendation */}
        <button onClick={addEntry}
          className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-gray-700 rounded-2xl text-sm text-gray-500 hover:border-amber-700 hover:text-amber-400 transition-colors">
          <Plus size={15} /> Add Recommendation
        </button>

        {/* Save */}
        <button onClick={save} disabled={selectedCount === 0}
          className="w-full bg-amber-600 disabled:opacity-40 text-white font-bold py-4 rounded-2xl transition-opacity">
          Save {selectedCount} Recommendation{selectedCount !== 1 ? 's' : ''}
        </button>
      </div>
    </ModalShell>
  );
}

// ─── Customer summary modal ───────────────────────────────────────────────────
function CustomerSummaryModal({ state, onClose, onReviewed }: { state: PrototypeState; onClose: () => void; onReviewed: () => void }) {
  return (
    <ModalShell title="Customer Summary" onClose={onClose}>
      <div className="space-y-4">
        <div className="bg-blue-950/30 border border-blue-800 rounded-xl p-2.5">
          <div className="text-[9px] font-bold text-blue-400 uppercase tracking-wider">Customer-facing view · Plain language</div>
        </div>
        {[
          { emoji: '🔍', title: 'What we found', text: 'Your rooftop unit (RTU-3) had a badly clogged condenser coil and was slightly low on refrigerant. Both issues were causing the unit to work too hard, triggering a safety shutoff and preventing proper cooling.' },
          { emoji: '🔧', title: 'What we fixed', text: 'We cleaned the condenser coil thoroughly, added refrigerant, and replaced a weak capacitor. The unit is now cooling correctly — indoor supply air dropped from 61°F to 56°F.' },
          { emoji: '✅', title: 'Verification', text: 'We measured before and after the repair. All pressures and temperatures are now within specification.' },
          ...(state.recommendations.length > 0 ? [{ emoji: '📋', title: 'We recommend', text: state.recommendations[0].replace(/^\[HIGH PRIORITY\] /, '') }] : []),
        ].map((s, i) => (
          <div key={i} className="bg-gray-800 rounded-2xl p-4">
            <div className="font-bold text-white text-sm mb-1.5">{s.emoji} {s.title}</div>
            <p className="text-sm text-gray-300 leading-relaxed">{s.text}</p>
          </div>
        ))}
        <button onClick={onReviewed} className="w-full bg-white text-gray-950 font-bold py-4 rounded-2xl">Reviewed with Customer ✓</button>
      </div>
    </ModalShell>
  );
}

// ─── Note modal ───────────────────────────────────────────────────────────────
function NoteModal({ onClose, onSave }: { onClose: () => void; onSave: (text: string) => void }) {
  const [text, setText] = useState('');
  return (
    <ModalShell title="Add Note" onClose={onClose}>
      <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Type a note..."
        className="w-full h-32 bg-gray-800 text-white rounded-2xl px-4 py-3 border border-gray-700 text-sm resize-none mb-4" autoFocus />
      <button onClick={() => text.trim() && onSave(text.trim())} disabled={!text.trim()}
        className="w-full bg-white text-gray-950 font-bold py-4 rounded-2xl disabled:opacity-40">Save Note</button>
    </ModalShell>
  );
}

// ─── AI Assist modal — real OpenAI call with equipment context ────────────────

function fmtBold(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>
      : <span key={i}>{part}</span>
  );
}

function AiAssistModal({ onClose, state }: { onClose: () => void; state: PrototypeState }) {
  const [showAnswer, setShowAnswer] = useState(false);
  const [activeLabel, setActiveLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [customQ, setCustomQ] = useState('');

  // Extract alarm codes from activities
  const alarmCodes = state.activities
    .filter(a => a.type === 'alarm')
    .map(a => a.badge ?? a.title)
    .filter(Boolean);

  // Build measurement list from captured readings
  const measurementItems = (state.initialMeasurements ?? []).map(m => ({
    label: m.label,
    value: m.value,
    unit: m.unit,
    status: m.status,
  }));

  const serviceHistoryText = MOCK_HISTORY
    .map(h => `${h.date} (${h.tech}): ${h.summary}`)
    .join('\n');

  async function ask(question: string, label: string) {
    if (!question.trim() || loading) return;
    setLoading(true);
    setAnswer('');
    setError('');
    setActiveLabel(label);
    setShowAnswer(true);

    try {
      const resp = await fetch('/api/hvac/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          equipmentContext: {
            make: MOCK_EQUIPMENT.make,
            model: MOCK_EQUIPMENT.model,
            refrigerant: MOCK_EQUIPMENT.refrigerant,
            capacity: MOCK_EQUIPMENT.capacity,
            voltage: MOCK_EQUIPMENT.voltage,
            unitTag: MOCK_JOB.equipmentShort,
            customer: MOCK_JOB.customer,
            site: MOCK_JOB.address,
            faultCodes: alarmCodes.length ? alarmCodes : ['82'],
            measurements: measurementItems.length ? measurementItems : [
              { label: 'Head Pressure', value: '385', unit: 'psi', status: 'alert' },
              { label: 'Suction Pressure', value: '115', unit: 'psi', status: 'ok' },
              { label: 'Superheat', value: '24', unit: '°F', status: 'alert' },
              { label: 'Subcooling', value: '8', unit: '°F', status: 'warn' },
            ],
          },
          sessionContext: {
            serviceHistory: serviceHistoryText,
            weather: MOCK_JOB.weather,
          },
        }),
      });
      const data = await resp.json() as { answer?: string; error?: string };
      if (!resp.ok) throw new Error(data.error ?? 'Request failed');
      setAnswer(data.answer ?? '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reach AI assistant. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function goBack() {
    setShowAnswer(false);
    setAnswer('');
    setError('');
    setLoading(false);
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 z-40 flex items-end" onClick={onClose}>
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 35 }}
        className="w-full bg-gray-900 rounded-t-3xl border-t border-gray-800"
        style={{ maxHeight: '88vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-blue-700 flex items-center justify-center">
              <Sparkles size={14} className="text-white" />
            </div>
            <div>
              <div className="font-bold text-white text-sm">AI Field Assistant</div>
              <div className="text-[9px] text-gray-500">
                {MOCK_EQUIPMENT.make} {MOCK_EQUIPMENT.model} · {MOCK_JOB.equipmentShort}
                {alarmCodes.length > 0 ? ` · Code ${alarmCodes[0]}` : ' · Code 82'}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center">
            <X size={16} className="text-gray-400" />
          </button>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: 'calc(88vh - 80px)' }}>
          {!showAnswer ? (
            /* ── Prompt list ── */
            <div className="px-5 py-4 space-y-3">
              <div className="text-xs text-gray-500">What do you need help with?</div>
              {AI_ASSIST_PROMPTS.map((p, i) => (
                <button key={i} onClick={() => ask(p.label, p.label)}
                  className="w-full flex items-center gap-3 bg-gray-800 border border-gray-700 rounded-2xl p-4 text-left hover:border-blue-700 transition-colors">
                  <span className="text-xl flex-shrink-0">{p.icon}</span>
                  <span className="font-semibold text-white text-sm">{p.label}</span>
                </button>
              ))}
              {/* Custom question */}
              <div className="flex gap-2 pt-1">
                <input
                  value={customQ}
                  onChange={e => setCustomQ(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && customQ.trim() && ask(customQ, customQ)}
                  placeholder="Ask something specific…"
                  className="flex-1 bg-gray-800 text-white rounded-xl px-3 py-2.5 border border-gray-700 text-sm focus:border-blue-600 outline-none"
                />
                <button
                  onClick={() => ask(customQ, customQ)}
                  disabled={!customQ.trim()}
                  className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition-opacity">
                  <Send size={16} className="text-white" />
                </button>
              </div>
            </div>
          ) : (
            /* ── Answer view ── */
            <div className="px-5 py-4">
              <button onClick={goBack}
                className="text-xs text-gray-500 mb-4 flex items-center gap-1 hover:text-gray-300 transition-colors">
                ← Back to questions
              </button>
              <div className="font-bold text-white text-sm mb-3">{activeLabel}</div>

              {loading && (
                <div className="flex items-center gap-3 py-6 text-gray-400">
                  <div className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin flex-shrink-0" />
                  <span className="text-sm">Analyzing equipment context…</span>
                </div>
              )}

              {error && !loading && (
                <div className="bg-red-950/40 border border-red-800/60 rounded-2xl p-4 space-y-2">
                  <div className="text-red-400 text-sm font-semibold">Connection error</div>
                  <div className="text-red-300/70 text-xs leading-relaxed">{error}</div>
                  <button onClick={() => ask(activeLabel, activeLabel)}
                    className="text-xs text-red-400 underline">Try again</button>
                </div>
              )}

              {answer && !loading && (
                <div className="bg-blue-950/30 border border-blue-800/50 rounded-2xl p-4">
                  <div className="text-sm text-gray-200 leading-relaxed whitespace-pre-line">
                    {fmtBold(answer)}
                  </div>
                </div>
              )}

              {/* Related prompts */}
              {(answer || error) && !loading && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {AI_ASSIST_PROMPTS
                    .filter(p => p.label !== activeLabel)
                    .slice(0, 2)
                    .map((p, i) => (
                      <button key={i} onClick={() => ask(p.label, p.label)}
                        className="py-2.5 px-3 bg-gray-800 rounded-xl text-xs text-gray-300 font-medium text-left border border-gray-700 hover:border-blue-700 transition-colors">
                        {p.icon} {p.label}
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function currentTime(): string {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}
