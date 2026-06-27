import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronDown, Sparkles, CheckCircle, ArrowLeft } from 'lucide-react';
import type { EquipmentAttention } from './dashboardData';

interface Props {
  eq: EquipmentAttention;
  onClose: () => void;
}

type Phase = 'briefing' | 'q1' | 'q2' | 'q3' | 'analysis';

interface Answer { question: string; answer: string }

// ─── Per-equipment diagnostic question sets ────────────────────────────────────
interface QuestionSet {
  questions: { id: 'q1' | 'q2' | 'q3'; prompt: string; options: string[] }[];
  buildAnalysis: (answers: Answer[]) => string;
}

const QUESTION_SETS: Record<string, QuestionSet> = {
  'RTU-3': {
    questions: [
      {
        id: 'q1',
        prompt: 'Is Code 82 currently active on the display?',
        options: [
          'Yes — fault is active, unit locked out',
          'I cleared it and the unit is running',
          'Unit won\'t start at all',
        ],
      },
      {
        id: 'q2',
        prompt: 'What\'s your current head pressure reading?',
        options: [
          'Over 350 psi — critically high',
          '290–350 psi — elevated',
          '260–290 psi — normal range',
          'Haven\'t taken readings yet',
        ],
      },
      {
        id: 'q3',
        prompt: 'Is the condenser fan running?',
        options: [
          'Yes — looks and sounds normal',
          'Running, but seems sluggish',
          'Not running at all',
          'Can\'t see it from here yet',
        ],
      },
    ],
    buildAnalysis: (answers) => {
      const a1 = answers[0]?.answer ?? '';
      const a2 = answers[1]?.answer ?? '';
      const a3 = answers[2]?.answer ?? '';
      const fanIssue = a3.includes('sluggish') || a3.includes('Not running');
      const highPressure = a2.includes('350') || a2.includes('290–350');
      if (fanIssue) {
        return `The condenser fan is not performing correctly — this is the most likely root cause of the high-pressure lockout.\n\nWhen the fan fails to move adequate airflow across the condenser coil, head pressure rises until the high-pressure cutout trips. Condenser cleaning would not resolve a fan performance issue.\n\nNext steps:\n• Check condenser fan motor capacitor (run capacitor)\n• Verify fan blade is seated correctly and not bent\n• Check motor amp draw vs. nameplate FLA\n• Inspect contactor for pitting — weak contact = voltage drop = fan starts slow`;
      } else if (highPressure) {
        return `Head pressure is elevated even with the fan running. This narrows the cause to the refrigerant circuit or the coil itself.\n\nWith cleaning already performed twice, consider these possibilities in order:\n• Refrigerant overcharge — check subcooling (target: 10–15°F for R-410A)\n• Non-condensables in the circuit — check for air or nitrogen in the high side\n• Liquid line restriction — TXV or filter drier partially blocked\n• Coil face blocked from the inside (debris behind coil, not on face)\n\nCheck subcooling first — overcharge is the most common cause when coil restriction has already been eliminated.`;
      } else {
        return `With Code 82 active but no obvious fan or pressure issue visible yet, the fault may be intermittent or heat-load dependent.\n\nThis unit has locked out on Code 82 three times in 12 months. When a fault is intermittent and conditions look normal on arrival:\n• Check run capacitor — weak capacitors cause fan to start slow only under load\n• Check contactor contacts — arcing creates voltage drop under draw\n• Log head pressure at startup and again after 10 minutes running — watch for climbing pressure\n• Ask building staff: does the fault typically occur in the afternoon on hot days?\n\nAn afternoon pattern strongly suggests a heat-load issue (fan, coil, or charge) rather than a control fault.`;
      }
    },
  },

  'AHU-5': {
    questions: [
      {
        id: 'q1',
        prompt: 'Where is the vibration most noticeable?',
        options: [
          'At the motor housing',
          'Along the fan shaft / bearing area',
          'Throughout the unit frame',
          'Not sure yet — just arrived',
        ],
      },
      {
        id: 'q2',
        prompt: 'Is the motor hot to the touch?',
        options: [
          'Very hot — cannot hold hand on it',
          'Warm, but not unusually so',
          'Cool — normal temperature',
          'Haven\'t checked yet',
        ],
      },
      {
        id: 'q3',
        prompt: 'Can you see the belt and pulleys?',
        options: [
          'Yes — belt appears worn or tracking off-center',
          'Belt looks OK, but pulleys look worn',
          'Everything looks normal visually',
          'Haven\'t opened the access panel yet',
        ],
      },
    ],
    buildAnalysis: (answers) => {
      const a1 = answers[0]?.answer ?? '';
      const a2 = answers[1]?.answer ?? '';
      const a3 = answers[2]?.answer ?? '';
      const motorHot = a2.includes('Very hot');
      const beltIssue = a3.includes('worn') || a3.includes('tracking off');
      if (beltIssue) {
        return `A belt tracking off-center or showing wear is a clear sign of pulley misalignment or worn sheaves — not a failed bearing.\n\nRepeated bearing failures on belt-drive equipment are almost always caused by the mechanical system around the bearing, not the bearing itself.\n\nNext steps:\n• Check sheave alignment using a straightedge across both pulleys\n• Measure sheave groove depth — worn grooves cause the belt to ride low and create side loading\n• Check motor shaft runout with a dial indicator if available\n• Verify motor mounting bolts are all torqued — soft-foot causes misalignment under load`;
      } else if (motorHot) {
        return `A motor running hot alongside increasing vibration suggests the bearing wear is creating friction and increasing motor load — the motor is working harder to compensate.\n\nAt 0.31 in/s and climbing, bearing replacement is likely necessary, but replacing the bearing alone without finding the mechanical root cause will result in the same failure on the next bearing.\n\nNext steps:\n• Replace bearing\n• Before reinstalling: check shaft runout, pulley alignment, and belt tension\n• Verify motor amps after replacement — should come down if bearing was the load source\n• Schedule a vibration re-check at 30 days to confirm trend reversal`;
      } else {
        return `Vibration increasing from 0.12 to 0.31 in/s over two visits is a clear upward trend. Without visible belt or pulley damage, the vibration source may be internal.\n\nFor a 0.31 in/s reading:\n• Immediate risk: bearing failure is not yet certain but the trend is heading toward the 0.4 in/s alarm threshold\n• Check for resonance: tap the motor mounting feet — any looseness will amplify vibration\n• Check belt tension: overtension creates high radial loads on bearings\n• Measure and log motor amps — increasing amps with vibration = mechanical binding, not just balance\n\nRecommend scheduling bearing replacement proactively before the threshold is reached.`;
      }
    },
  },

  'CRAC-3': {
    questions: [
      {
        id: 'q1',
        prompt: 'What does the humidity display read right now?',
        options: [
          'Below 40% — low humidity condition',
          '40–55% — below setpoint',
          'At or above setpoint',
          'Display is showing a fault or error',
        ],
      },
      {
        id: 'q2',
        prompt: 'Have you pulled the canister for inspection?',
        options: [
          'Yes — heavy scale buildup visible',
          'Yes — moderate buildup, not severe',
          'Not yet — just arrived',
          'Canister access is blocked',
        ],
      },
      {
        id: 'q3',
        prompt: 'Any visible mineral deposits around the humidifier fill/drain?',
        options: [
          'Yes — significant white scale deposits',
          'Minor deposits around drain',
          'Clean — no visible scale',
          'Haven\'t looked yet',
        ],
      },
    ],
    buildAnalysis: (answers) => {
      const a1 = answers[0]?.answer ?? '';
      const a2 = answers[1]?.answer ?? '';
      const scale = a2.includes('heavy') || a2.includes('moderate');
      const lowHumidity = a1.includes('Below 40') || a1.includes('40–55');
      if (scale && lowHumidity) {
        return `A scaled canister with low humidity output confirms the canister is the primary issue — the mineral buildup is blocking steam generation.\n\nIn data centers, low humidity is a static discharge risk. The longer the canister operates with heavy scale, the more likely it fails mid-cycle — which is worse than a scheduled swap.\n\nNext steps:\n• Replace canister (Liebert DS-series specified)\n• Check local water hardness — if above 12 gpg, recommend water treatment\n• Inspect drain line for scale blockage — a partial drain blockage will accelerate canister scaling\n• Log humidity reading after replacement and verify it reaches setpoint within 30 minutes`;
      } else if (scale) {
        return `The canister shows scale buildup even though humidity is currently at setpoint. This means the unit is working harder than it should to maintain the setpoint — reduced output efficiency.\n\nA scaled canister operating near capacity may appear functional until it fails abruptly. 35 days past interval with visible scale means replacement is due now.\n\nNote for the customer: the water supply at this facility may have elevated mineral content. If canisters are scaling faster than the recommended interval, a water treatment solution or lower-mineral water supply connection should be considered.`;
      } else {
        return `Current humidity is within an acceptable range and the canister shows limited visible scale. However, this unit is 35 days past the recommended canister replacement interval.\n\nDeferring canister replacement further increases the risk of mid-cycle failure — which in a data center environment could trigger a humidity alarm and impact equipment reliability.\n\nRecommend replacing the canister today regardless of visible condition, documenting the replacement in the service record, and updating the PM interval schedule to ensure the next replacement isn't deferred again.`;
      }
    },
  },
};

// Preloaded context chips
const PRELOAD_CHIPS = [
  'Business', 'Site Location', 'Unit ID', 'Model / Serial',
  'Refrigerant Type', 'Alarm History', 'Service Records',
  'AI Pattern Analysis', 'Dispatch Notes',
];

// ─── Component ─────────────────────────────────────────────────────────────────
export function AiDiagnosticModal({ eq, onClose }: Props) {
  const [phase,           setPhase]           = useState<Phase>('briefing');
  const [answers,         setAnswers]         = useState<Answer[]>([]);
  const [contextExpanded, setContextExpanded] = useState(false);

  const qSet = QUESTION_SETS[eq.id] ?? QUESTION_SETS['RTU-3'];

  // Which question to show based on answers count
  const currentQIndex = answers.length; // 0, 1, or 2
  const currentQ = qSet.questions[currentQIndex];

  function handleAnswer(option: string) {
    const q = qSet.questions[answers.length];
    const next = [...answers, { question: q.prompt, answer: option }];
    setAnswers(next);
    if (next.length >= 3) {
      setPhase('analysis');
    } else {
      setPhase(`q${next.length + 1}` as Phase);
    }
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning.' : hour < 17 ? 'Good afternoon.' : 'Good evening.';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-gray-950 z-[60] flex flex-col overflow-hidden"
    >
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 pt-12 pb-4 flex items-start justify-between flex-shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-5 h-5 rounded-md bg-blue-600/40 flex items-center justify-center">
              <Sparkles size={10} className="text-blue-300" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">AI Diagnostic</span>
          </div>
          <h2 className="text-lg font-bold text-white leading-tight">{eq.unit}</h2>
          <div className="text-sm text-blue-300/80">{eq.unitTag}</div>
          <div className="text-xs font-mono text-gray-600 mt-0.5">{eq.model}</div>
        </div>
        <button onClick={onClose}
          className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0 mt-1">
          <X size={18} className="text-gray-400" />
        </button>
      </div>

      {/* ── Preloaded context (collapsible) ──────────────────────── */}
      <div className="border-b border-gray-800 flex-shrink-0">
        <button onClick={() => setContextExpanded(e => !e)}
          className="w-full flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-2">
            <CheckCircle size={11} className="text-green-400" />
            <span className="text-[10px] font-semibold text-green-400">Context preloaded</span>
            <span className="text-[9px] text-gray-600">— no re-entry required</span>
          </div>
          <ChevronDown size={12} className={`text-gray-600 transition-transform ${contextExpanded ? 'rotate-180' : ''}`} />
        </button>
        <AnimatePresence>
          {contextExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }}
              className="px-4 pb-3">
              <div className="flex flex-wrap gap-1.5">
                {PRELOAD_CHIPS.map(chip => (
                  <div key={chip} className="flex items-center gap-1 bg-green-900/30 border border-green-800/40 rounded-full px-2 py-0.5">
                    <CheckCircle size={8} className="text-green-500 flex-shrink-0" />
                    <span className="text-[9px] text-green-300">{chip}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Scrollable content ───────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 pb-8 pt-5 space-y-5">

        {/* AI Greeting — always visible */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <AiBubble>
            <p className="text-sm text-white font-medium mb-3">{greeting}</p>
            <p className="text-sm text-gray-300 leading-relaxed mb-3">
              You're working on <span className="text-white font-semibold">{eq.unit}</span>,{' '}
              <span className="text-blue-300">{eq.unitTag}</span>.{' '}
              <span className="font-mono text-gray-400">{eq.model}</span>
            </p>
            <p className="text-sm text-gray-300 leading-relaxed mb-3">
              I've reviewed the previous service history.
            </p>
            <div className="bg-black/30 rounded-xl p-3 mb-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-blue-400 mb-2">Observed pattern</div>
              <div className="space-y-1.5">
                {eq.aiInsight.stats.map((s, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-gray-300">
                    <span className="text-blue-400 flex-shrink-0 mt-0.5">•</span>
                    <span>{s}</span>
                  </div>
                ))}
                {eq.serviceHistory.slice(0, 3).map((h, i) => (
                  h.alarms?.length ? (
                    <div key={`h${i}`} className="flex items-start gap-2 text-sm text-gray-300">
                      <span className="text-red-400 flex-shrink-0 mt-0.5">•</span>
                      <span>{h.alarms[0]} — {h.date} ({h.tech})</span>
                    </div>
                  ) : null
                ))}
              </div>
            </div>
            <p className="text-sm text-blue-200/80 leading-relaxed">
              {eq.aiInsight.analysis}
            </p>
          </AiBubble>
        </motion.div>

        {/* Q&A thread */}
        <AnimatePresence mode="sync">
          {answers.map((a, i) => (
            <motion.div key={i} className="space-y-2"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
              {/* AI question */}
              <AiBubble compact>
                <p className="text-sm text-gray-300">{qSet.questions[i].prompt}</p>
              </AiBubble>
              {/* Tech answer */}
              <div className="flex justify-end">
                <div className="bg-blue-700 rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[85%]">
                  <p className="text-sm text-white">{a.answer}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Current active question */}
        <AnimatePresence>
          {phase !== 'briefing' && phase !== 'analysis' && currentQ && (
            <motion.div
              key={phase}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-3">
              <AiBubble compact>
                <p className="text-sm text-gray-300 mb-3">{currentQ.prompt}</p>
                <div className="space-y-2">
                  {currentQ.options.map((opt, i) => (
                    <motion.button key={i}
                      initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                      onClick={() => handleAnswer(opt)}
                      whileTap={{ scale: 0.97 }}
                      className="w-full text-left bg-gray-700/60 hover:bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 flex items-center justify-between group transition-colors">
                      <span className="text-sm text-white">{opt}</span>
                      <ChevronRight size={14} className="text-gray-500 group-hover:text-gray-300 flex-shrink-0 ml-2 transition-colors" />
                    </motion.button>
                  ))}
                </div>
              </AiBubble>
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI Analysis result */}
        <AnimatePresence>
          {phase === 'analysis' && (
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
              <AiBubble highlight>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={13} className="text-blue-300" />
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-300">AI Assessment</span>
                </div>
                <div className="text-sm text-gray-200 leading-relaxed whitespace-pre-line">
                  {qSet.buildAnalysis(answers)}
                </div>
              </AiBubble>

              {/* Suggested parts for this visit */}
              <motion.div className="mt-4"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Suggested Parts for This Visit</div>
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-3 flex flex-wrap gap-1.5">
                  {eq.aiInsight.suggestedParts.map((p, i) => (
                    <div key={i} className="flex items-center gap-1 bg-gray-800 rounded-full px-2 py-1">
                      <span className="text-[10px] text-gray-300">{p}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Answered questions summary */}
              <motion.div className="mt-4"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Your Responses</div>
                <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                  {answers.map((a, i) => (
                    <div key={i} className={`px-4 py-3 ${i < answers.length - 1 ? 'border-b border-gray-800' : ''}`}>
                      <div className="text-[9px] text-gray-600 mb-0.5">{a.question}</div>
                      <div className="text-xs font-semibold text-white">{a.answer}</div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Actions */}
              <motion.div className="mt-5 space-y-2"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}>
                <button className="w-full bg-white text-gray-950 font-bold py-4 rounded-2xl flex items-center justify-center gap-2">
                  Start Job — Load These Findings
                  <ChevronRight size={18} />
                </button>
                <button className="w-full bg-gray-800 border border-gray-700 text-white font-semibold py-3.5 rounded-2xl text-sm flex items-center justify-center gap-2">
                  Save Assessment to Service Record
                </button>
                <button onClick={() => { setAnswers([]); setPhase('q1'); }}
                  className="w-full text-gray-500 text-sm py-2 flex items-center justify-center gap-1">
                  <ArrowLeft size={12} /> Restart Diagnostic
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Begin button — only on briefing phase */}
        <AnimatePresence>
          {phase === 'briefing' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              exit={{ opacity: 0 }}>
              <button onClick={() => setPhase('q1')}
                className="w-full bg-white text-gray-950 font-bold py-4 rounded-2xl flex items-center justify-center gap-2">
                <Sparkles size={16} />
                Begin Diagnostic
                <ChevronRight size={18} />
              </button>
              <p className="text-[10px] text-gray-600 text-center mt-2">
                AI will ask 3 questions based on this unit's history
              </p>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </motion.div>
  );
}

// ─── AI Chat Bubble ────────────────────────────────────────────────────────────
function AiBubble({
  children, compact, highlight,
}: { children: React.ReactNode; compact?: boolean; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl rounded-tl-sm p-4 ${
      highlight
        ? 'bg-blue-950/60 border border-blue-700/50'
        : compact
          ? 'bg-gray-800/80 border border-gray-700/60'
          : 'bg-gray-800 border border-gray-700'
    }`}>
      {!compact && !highlight && (
        <div className="flex items-center gap-1.5 mb-3">
          <div className="w-5 h-5 rounded-full bg-blue-600/50 flex items-center justify-center">
            <Sparkles size={10} className="text-blue-300" />
          </div>
          <span className="text-[9px] font-bold uppercase tracking-wider text-blue-400">UnitDown AI</span>
        </div>
      )}
      {children}
    </div>
  );
}
