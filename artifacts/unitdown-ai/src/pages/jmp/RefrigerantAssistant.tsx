import { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronLeft, Thermometer, Gauge, BookOpen, Zap, BarChart2, Play, Pause, RotateCcw, CheckCircle, AlertTriangle, Info, ArrowDown } from 'lucide-react';
import {
  getSaturationTemp, getSaturationPressure, getPTTable, interpretSuperheat, interpretSubcooling,
  REFRIGERANT_INFO, ALL_REFRIGERANTS,
} from './refrigerantData';
import type { SupportedRefrigerant, PTEntry } from './refrigerantData';
import type { MeasurementReading } from './types';
import { MOCK_EQUIPMENT, MOCK_JOB, MOCK_HISTORY } from './mockData';

// ─── Types ─────────────────────────────────────────────────────────────────────

type Screen = 'overview' | 'pt-chart' | 'superheat' | 'subcooling' | 'ai-analysis' | 'teach-me' | 'analog-mode';
type MeteringDevice = 'TXV' | 'orifice' | 'unknown';

interface Props {
  onClose:          () => void;
  onLogMeasurement: (readings: MeasurementReading[]) => void;
  initialSuctionPressure?: string;
  initialHeadPressure?:    string;
}

// ─── SVG helpers ──────────────────────────────────────────────────────────────

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const s = polarToCartesian(cx, cy, r, startDeg);
  const e = polarToCartesian(cx, cy, r, endDeg);
  const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  const sweep = endDeg > startDeg ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} ${sweep} ${e.x} ${e.y}`;
}

function ptToSvg(
  entry: PTEntry,
  tempMin: number, tempMax: number,
  psigMin: number, psigMax: number,
  svgW: number, svgH: number,
  padL: number, padT: number,
): { x: number; y: number } {
  const x = padL + (entry.tempF - tempMin) / (tempMax - tempMin) * (svgW - padL - 12);
  const y = padT + (1 - (entry.psig - psigMin) / (psigMax - psigMin)) * (svgH - padT - 24);
  return { x, y };
}

function entriestoPath(
  entries: PTEntry[],
  tempMin: number, tempMax: number,
  psigMin: number, psigMax: number,
  svgW: number, svgH: number,
  padL: number, padT: number,
): string {
  const points = entries.map(e => ptToSvg(e, tempMin, tempMax, psigMin, psigMax, svgW, svgH, padL, padT));
  if (points.length < 2) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1], cur = points[i];
    const cpx = (prev.x + cur.x) / 2;
    d += ` C ${cpx} ${prev.y} ${cpx} ${cur.y} ${cur.x} ${cur.y}`;
  }
  return d;
}

// ─── Animated Gauge ───────────────────────────────────────────────────────────

interface GaugeProps {
  value:      number;
  min?:       number;
  max?:       number;
  targetMin:  number;
  targetMax:  number;
  label:      string;
  unit:       string;
  color:      string;
}

function AnimatedGauge({ value, min = 0, max = 30, targetMin, targetMax, label, unit, color }: GaugeProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const cx = 110, cy = 105, r = 80;
  const startDeg = 220, totalSweep = 280;

  useEffect(() => {
    const timer = setTimeout(() => setDisplayValue(value), 120);
    return () => clearTimeout(timer);
  }, [value]);

  const valClamped  = Math.max(min, Math.min(max, displayValue));
  const needleDeg   = startDeg + (valClamped / max) * totalSweep;
  const needle      = polarToCartesian(cx, cy, r - 10, needleDeg);

  const blueDeg  = startDeg + (0        / max) * totalSweep;
  const greenDeg = startDeg + (targetMin / max) * totalSweep;
  const orangDeg = startDeg + (targetMax / max) * totalSweep;
  const redDeg   = startDeg + (Math.min(targetMax + 8, max) / max) * totalSweep;
  const endDeg   = startDeg + totalSweep;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 220 130" className="w-full max-w-[220px]">
        {/* Blue zone */}
        <path d={arcPath(cx, cy, r, blueDeg, greenDeg)} fill="none" stroke="#3b82f6" strokeWidth="12" strokeLinecap="butt" opacity="0.8" />
        {/* Green zone */}
        <path d={arcPath(cx, cy, r, greenDeg, orangDeg)} fill="none" stroke="#22c55e" strokeWidth="12" strokeLinecap="butt" opacity="0.8" />
        {/* Orange zone */}
        <path d={arcPath(cx, cy, r, orangDeg, redDeg)} fill="none" stroke="#f59e0b" strokeWidth="12" strokeLinecap="butt" opacity="0.8" />
        {/* Red zone */}
        <path d={arcPath(cx, cy, r, redDeg, endDeg)} fill="none" stroke="#ef4444" strokeWidth="12" strokeLinecap="butt" opacity="0.8" />
        {/* Background track */}
        <path d={arcPath(cx, cy, r, blueDeg, endDeg)} fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="butt" opacity="0.4" />
        {/* Needle */}
        <line
          x1={cx} y1={cy} x2={needle.x} y2={needle.y}
          stroke={color} strokeWidth="2.5" strokeLinecap="round"
          style={{ transition: 'x2 0.8s cubic-bezier(0.34,1.56,0.64,1), y2 0.8s cubic-bezier(0.34,1.56,0.64,1)' }}
        />
        <circle cx={cx} cy={cy} r="4" fill={color} />
        {/* Glowing dot at needle tip */}
        <circle cx={needle.x} cy={needle.y} r="5" fill={color} opacity="0.9" />
        <circle cx={needle.x} cy={needle.y} r="8" fill={color} opacity="0.25" />
        {/* Center value */}
        <text x={cx} y={cy + 30} textAnchor="middle" fill="white" fontSize="20" fontWeight="bold">{Math.round(displayValue)}</text>
        <text x={cx} y={cy + 45} textAnchor="middle" fill="#9ca3af" fontSize="9">{unit}</text>
        {/* Zone labels */}
        <text x="20" y="110" fill="#6b7280" fontSize="7">LOW</text>
        <text x={cx - 12} y="30" fill="#6b7280" fontSize="7">TARGET</text>
        <text x="178" y="110" fill="#6b7280" fontSize="7">HIGH</text>
      </svg>
      <div className="text-xs text-gray-400 mt-1">{label}</div>
    </div>
  );
}

// ─── PT Chart SVG ─────────────────────────────────────────────────────────────

interface PTChartProps {
  activeRef:   SupportedRefrigerant;
  highlightPressure: number | null;
  highlightTemp:     number | null;
  onTapPoint:        (p: { psig: number; tempF: number }) => void;
}

function PTChartSVG({ activeRef, highlightPressure, highlightTemp, onTapPoint }: PTChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const W = 340, H = 240, padL = 42, padT = 12;
  const TEMP_MIN = -10, TEMP_MAX = 120;
  const PSIG_MIN = 0, PSIG_MAX = 520;

  const toSvg = useCallback((e: PTEntry) =>
    ptToSvg(e, TEMP_MIN, TEMP_MAX, PSIG_MIN, PSIG_MAX, W, H, padL, padT),
  []);

  const xTicks = [-10, 0, 20, 40, 60, 80, 100, 120];
  const yTicks = [0, 100, 200, 300, 400, 500];

  function handleSvgTap(evt: React.MouseEvent<SVGSVGElement>) {
    const rect = svgRef.current!.getBoundingClientRect();
    const svgX = (evt.clientX - rect.left) * W / rect.width;
    const svgY = (evt.clientY - rect.top) * H / rect.height;
    const tempF = TEMP_MIN + (svgX - padL) / (W - padL - 12) * (TEMP_MAX - TEMP_MIN);
    const psig  = PSIG_MIN + (1 - (svgY - padT) / (H - padT - 24)) * (PSIG_MAX - PSIG_MIN);
    const clampT = Math.max(TEMP_MIN, Math.min(TEMP_MAX, tempF));
    const clampP = Math.max(PSIG_MIN, Math.min(PSIG_MAX, psig));
    onTapPoint({ psig: Math.round(clampP), tempF: Math.round(clampT * 10) / 10 });
  }

  const activeInfo = REFRIGERANT_INFO[activeRef];
  const activeTable = getPTTable(activeRef);
  const activePath = entriestoPath(activeTable, TEMP_MIN, TEMP_MAX, PSIG_MIN, PSIG_MAX, W, H, padL, padT);

  let dotX: number | null = null, dotY: number | null = null;
  if (highlightPressure !== null) {
    const t = highlightTemp ?? getSaturationTemp(activeRef, highlightPressure);
    if (t !== null) {
      const pt = toSvg({ tempF: t, psig: highlightPressure });
      dotX = pt.x; dotY = pt.y;
    }
  }

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full cursor-crosshair" onClick={handleSvgTap}>
      {/* Grid */}
      {yTicks.map(p => {
        const y = padT + (1 - p / PSIG_MAX) * (H - padT - 24);
        return <g key={p}>
          <line x1={padL} y1={y} x2={W - 12} y2={y} stroke="#1f2937" strokeWidth="1" />
          <text x={padL - 4} y={y + 3} textAnchor="end" fill="#4b5563" fontSize="7">{p}</text>
        </g>;
      })}
      {xTicks.map(t => {
        const x = padL + (t - TEMP_MIN) / (TEMP_MAX - TEMP_MIN) * (W - padL - 12);
        return <g key={t}>
          <line x1={x} y1={padT} x2={x} y2={H - 24} stroke="#1f2937" strokeWidth="1" />
          <text x={x} y={H - 12} textAnchor="middle" fill="#4b5563" fontSize="7">{t}°</text>
        </g>;
      })}

      {/* Faded curves for other refrigerants */}
      {ALL_REFRIGERANTS.filter(r => r !== activeRef).map(r => {
        const table = getPTTable(r);
        const p = entriestoPath(table, TEMP_MIN, TEMP_MAX, PSIG_MIN, PSIG_MAX, W, H, padL, padT);
        return <path key={r} d={p} fill="none" stroke={REFRIGERANT_INFO[r].color} strokeWidth="1" opacity="0.15" />;
      })}

      {/* Highlight crosshairs */}
      {dotX !== null && dotY !== null && (
        <>
          <line x1={dotX} y1={padT} x2={dotX} y2={dotY} stroke="#ffffff" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.4" />
          <line x1={padL} y1={dotY!} x2={dotX} y2={dotY!} stroke="#ffffff" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.4" />
        </>
      )}

      {/* Active refrigerant curve */}
      <path d={activePath} fill="none" stroke={activeInfo.color} strokeWidth="2.5" strokeLinejoin="round" />

      {/* Glow on active curve */}
      <path d={activePath} fill="none" stroke={activeInfo.color} strokeWidth="6" strokeLinejoin="round" opacity="0.15" />

      {/* Glowing dot at selected point */}
      {dotX !== null && dotY !== null && (
        <g>
          <circle cx={dotX} cy={dotY!} r="12" fill={activeInfo.dotColor} opacity="0.2" />
          <circle cx={dotX} cy={dotY!} r="7" fill={activeInfo.dotColor} opacity="0.4" />
          <circle cx={dotX} cy={dotY!} r="4" fill={activeInfo.dotColor} opacity="1" />
        </g>
      )}

      {/* Axis labels */}
      <text x={padL - 28} y={H / 2} textAnchor="middle" fill="#6b7280" fontSize="7"
        transform={`rotate(-90 ${padL - 28} ${H / 2})`}>PRESSURE (PSIG)</text>
      <text x={(W + padL) / 2} y={H - 2} textAnchor="middle" fill="#6b7280" fontSize="7">SATURATION TEMP (°F)</text>
    </svg>
  );
}

// ─── Conversion animation ──────────────────────────────────────────────────────

function ConversionAnimation({ pressurePSIG, satTemp, refColor }: {
  pressurePSIG: number; satTemp: number; refColor: string;
}) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (step >= 3) return;
    const t = setTimeout(() => setStep(s => s + 1), 420);
    return () => clearTimeout(t);
  }, [step]);

  return (
    <div className="flex flex-col items-center gap-1 py-2">
      <div className={`text-lg font-bold text-white transition-all duration-300 ${step >= 1 ? 'opacity-100' : 'opacity-0'}`}>
        {pressurePSIG} PSI
      </div>
      <div className={`transition-all duration-300 ${step >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
        <div className="flex flex-col items-center gap-0.5">
          <ArrowDown size={14} style={{ color: refColor }} />
          <span className="text-[10px] text-gray-400">PT Lookup</span>
          <ArrowDown size={14} style={{ color: refColor }} />
        </div>
      </div>
      <div className={`text-2xl font-bold transition-all duration-500 ${step >= 3 ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}
        style={{ color: refColor }}>
        {satTemp.toFixed(1)}°F Sat.
      </div>
    </div>
  );
}

// ─── Superheat / Subcooling Builder shared step display ───────────────────────

function StepCard({ number, title, value, unit, status, children }: {
  number: number; title: string; value?: string; unit?: string;
  status: 'pending' | 'active' | 'done'; children?: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl border p-4 transition-all duration-300
      ${status === 'done'   ? 'border-green-700 bg-green-950/40' :
        status === 'active' ? 'border-cyan-600 bg-gray-800 shadow-lg shadow-cyan-900/30' :
        'border-gray-800 bg-gray-900 opacity-50'}`}>
      <div className="flex items-start gap-3">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0
          ${status === 'done' ? 'bg-green-600 text-white' :
            status === 'active' ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-400'}`}>
          {status === 'done' ? <CheckCircle size={14} /> : number}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-gray-400 mb-1">{title}</div>
          {value !== undefined && (
            <div className="text-xl font-bold text-white">{value}<span className="text-sm font-normal text-gray-400 ml-1">{unit}</span></div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Teach Me Mode ────────────────────────────────────────────────────────────

const TEACH_STEPS = [
  {
    icon: '🔵', title: 'Connect Your Gauges',
    body: 'Connect the blue (low-side) hose to the suction service port. This is the larger, low-pressure side of the system. The gauge needle will swing to the current suction pressure.',
  },
  {
    icon: '📊', title: 'Read the Blue Gauge',
    body: 'Read the pressure in PSIG. For this Carrier RTU-3 running R-410A, you\'re reading 115 PSI. Write it down or enter it below.',
  },
  {
    icon: '📋', title: 'Find Saturation Temperature',
    body: 'Using the R-410A PT chart: at 115 PSIG, the saturation temperature is approximately 37.9°F. This is the temperature at which R-410A boils at this pressure.',
  },
  {
    icon: '🌡️', title: 'Clamp the Suction Line',
    body: 'Attach your temperature clamp to the suction line within 6 inches of the compressor. Wait 2–3 minutes for it to stabilize. The insulation on the suction line matters — push the clamp through to the copper if possible.',
  },
  {
    icon: '➖', title: 'Subtract to Find Superheat',
    body: 'Suction line temp MINUS saturation temp = Superheat. Example: 62°F (clamp) − 37.9°F (PT lookup) = 24.1°F superheat.',
  },
  {
    icon: '🎯', title: 'Compare to Target',
    body: 'For a TXV-metered system like this Carrier 50XCQ, target superheat is 8–12°F. A reading of 24°F is significantly above target. This suggests low refrigerant charge, a restriction in the system, or poor evaporator airflow.',
  },
  {
    icon: '🧠', title: 'AI Interpretation',
    body: 'Don\'t add refrigerant yet. This unit has Code 82 (high head pressure) and a history of condenser fouling. High superheat combined with high head pressure can indicate a dirty condenser rather than undercharge. Clean the coil first. Recheck superheat after.',
  },
];

function TeachMeMode() {
  const [currentStep, setCurrentStep] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function play() {
    setPlaying(true);
    setCurrentStep(0);
  }

  function pause() {
    setPlaying(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }

  function reset() {
    pause();
    setCurrentStep(-1);
  }

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      setCurrentStep(s => {
        if (s >= TEACH_STEPS.length - 1) { setPlaying(false); return s; }
        return s + 1;
      });
    }, 3200);
    intervalRef.current = t;
    return () => clearInterval(t);
  }, [playing]);

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-gray-800/60 rounded-2xl p-4 border border-gray-700">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen size={16} className="text-amber-400" />
          <span className="text-sm font-semibold text-amber-400">Teach Me Mode</span>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed">
          Watch the full superheat process animated step-by-step. This is how senior technicians think through refrigerant diagnostics.
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        {currentStep < 0 ? (
          <button onClick={play} className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">
            <Play size={16} /> Start Walkthrough
          </button>
        ) : (
          <>
            <button onClick={playing ? pause : play} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2">
              {playing ? <Pause size={14} /> : <Play size={14} />}
              {playing ? 'Pause' : 'Resume'}
            </button>
            <button onClick={reset} className="px-4 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl flex items-center gap-2">
              <RotateCcw size={14} />
            </button>
          </>
        )}
      </div>

      {/* Steps */}
      <div className="flex flex-col gap-3">
        {TEACH_STEPS.map((step, i) => {
          const status = i < currentStep ? 'done' : i === currentStep ? 'active' : 'pending';
          return (
            <div key={i} onClick={() => setCurrentStep(i)} className="cursor-pointer">
              <StepCard number={i + 1} title="" status={status}>
                <div className="flex items-start gap-2">
                  <span className="text-lg">{step.icon}</span>
                  <div>
                    <div className="text-sm font-semibold text-white mb-1">{step.title}</div>
                    {status !== 'pending' && (
                      <p className={`text-xs leading-relaxed transition-all duration-500 ${status === 'active' ? 'text-gray-300' : 'text-gray-500'}`}>
                        {step.body}
                      </p>
                    )}
                  </div>
                </div>
              </StepCard>
            </div>
          );
        })}
      </div>

      <div className="text-center text-[10px] text-gray-600 mt-1">
        Tap any step to jump to it
      </div>
    </div>
  );
}

// ─── Analog Mode ──────────────────────────────────────────────────────────────

function AnalogMode({ refrigerant, onDone }: { refrigerant: SupportedRefrigerant; onDone: () => void }) {
  const [step, setStep] = useState(0);
  const info = REFRIGERANT_INFO[refrigerant];
  const steps = [
    {
      icon: '🔵', number: '01', title: 'Read Your Blue Gauge',
      body: `Look at the blue (low-side) gauge on your manifold set. Read the PSI value. Write it down. For ${refrigerant}, normal suction range is ${info.typicalSuction.minPSIG}–${info.typicalSuction.maxPSIG} PSI.`,
      action: 'I have my pressure reading',
    },
    {
      icon: '📋', number: '02', title: 'Look Up the PT Chart',
      body: `Take your pressure reading and find it on the ${refrigerant} side of your PT chart. Follow that pressure across to the temperature column. That temperature is your saturation temperature.`,
      action: 'I found the saturation temperature',
    },
    {
      icon: '🌡️', number: '03', title: 'Clamp the Suction Line',
      body: 'Attach your temperature clamp to the suction line. Get it against the copper. Wait at least 2–3 minutes. The reading must be stable before you use it.',
      action: 'My clamp reading is stable',
    },
    {
      icon: '➖', number: '04', title: 'Do the Math',
      body: 'Suction Line Temperature MINUS Saturation Temperature = Superheat. Example: If clamp reads 62°F and saturation is 38°F → superheat is 24°F.',
      action: 'I calculated my superheat',
    },
    {
      icon: '✅', number: '05', title: 'Compare and Decide',
      body: `For a TXV system using ${refrigerant}, target superheat is ${info.shTarget.min}–${info.shTarget.max}°F. If your reading is outside that range, investigate the cause before adding or recovering refrigerant.`,
      action: 'Done',
    },
  ];
  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-amber-950/40 border border-amber-800 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Gauge size={16} className="text-amber-400" />
          <span className="text-sm font-semibold text-amber-400">Analog Gauge Mode</span>
        </div>
        <p className="text-xs text-gray-400">Step-by-step for technicians using traditional manifold gauges. No digital display required.</p>
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-2">
        {steps.map((_, i) => (
          <button key={i} onClick={() => setStep(i)}
            className={`w-2 h-2 rounded-full transition-all ${i === step ? 'bg-amber-400 w-4' : i < step ? 'bg-amber-700' : 'bg-gray-700'}`} />
        ))}
      </div>

      {/* Current step card */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{current.icon}</span>
          <div>
            <div className="text-[10px] font-mono text-gray-500">STEP {current.number} OF {steps.length}</div>
            <div className="text-lg font-bold text-white">{current.title}</div>
          </div>
        </div>
        <p className="text-sm text-gray-300 leading-relaxed">{current.body}</p>
        <button
          onClick={() => isLast ? onDone() : setStep(s => s + 1)}
          className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2
            ${isLast ? 'bg-green-700 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}>
          {current.action}
          {!isLast && <ChevronLeft size={14} className="rotate-180" />}
        </button>
      </div>

      {step > 0 && (
        <button onClick={() => setStep(s => s - 1)} className="text-xs text-gray-500 text-center hover:text-gray-300">
          ← Back to previous step
        </button>
      )}
    </div>
  );
}

// ─── AI Analysis ──────────────────────────────────────────────────────────────

function AIAnalysis({ superheat, subcooling, suctionPSIG, headPSIG, refrigerant, meteringDevice }: {
  superheat: number | null; subcooling: number | null;
  suctionPSIG: number | null; headPSIG: number | null;
  refrigerant: SupportedRefrigerant; meteringDevice: MeteringDevice;
}) {
  const info = REFRIGERANT_INFO[refrigerant];
  const shInterp = superheat !== null ? interpretSuperheat(superheat, refrigerant, meteringDevice) : null;
  const scInterp = subcooling !== null ? interpretSubcooling(subcooling, refrigerant) : null;

  const hasHighHead = headPSIG !== null && headPSIG > 320;
  const hasHighSH   = superheat !== null && superheat > info.shTarget.max;
  const hasLowSC    = subcooling !== null && subcooling < info.scTarget.min;

  function buildAnalysis(): string[] {
    const lines: string[] = [];
    if (superheat === null && subcooling === null) {
      lines.push('Enter superheat or subcooling readings to unlock equipment-specific interpretation.');
      return lines;
    }
    if (hasHighSH && hasHighHead) {
      lines.push(`Superheat is ${superheat}°F — above the ${info.shTarget.min}–${info.shTarget.max}°F TXV target. Before adjusting refrigerant charge, address the elevated head pressure first.`);
      lines.push(`High head pressure (${headPSIG} PSI) and high superheat together are a classic sign of condenser heat rejection failure — not undercharge.`);
    } else if (hasHighSH) {
      lines.push(`Superheat of ${superheat}°F is above the ${info.shTarget.min}–${info.shTarget.max}°F TXV target. Possible causes: low refrigerant charge, restriction in liquid or suction line, or TXV hunting/failing.`);
    }
    if (hasLowSC && hasHighHead) {
      lines.push(`Subcooling of ${subcooling}°F (target ${info.scTarget.min}–${info.scTarget.max}°F) with high head suggests the condenser cannot reject enough heat to fully subcool the liquid. Clean condenser before concluding the system is undercharged.`);
    } else if (hasLowSC) {
      lines.push(`Subcooling of ${subcooling}°F is below the ${info.scTarget.min}–${info.scTarget.max}°F target. Possible undercharge or liquid line restriction.`);
    }
    if (MOCK_HISTORY.length > 0) {
      const relevant = MOCK_HISTORY.filter(h => h.summary.toLowerCase().includes('condenser') || h.summary.toLowerCase().includes('82'));
      if (relevant.length >= 2) {
        lines.push(`Service history: Code 82 appeared on ${relevant.length} of the last ${MOCK_HISTORY.length} visits. This is a pattern — condenser fouling is the recurring issue on this unit.`);
      }
    }
    return lines;
  }

  const checklist: string[] = [];
  if (hasHighHead) {
    checklist.push('Inspect condenser coil for debris, fouling, or biological growth');
    checklist.push('Verify condenser fan(s) are running at correct RPM and rotation');
    checklist.push('Check for condenser air recirculation or obstructions');
    checklist.push('Verify filters and evaporator airflow — poor return air raises head');
    checklist.push('Rule out non-condensables if head remains high after coil cleaning');
  }
  if (hasHighSH) {
    checklist.push('Check TXV bulb is making tight contact with the suction line');
    checklist.push('Confirm TXV equalizer line is not kinked or restricted');
    checklist.push('Check sight glass for bubbles (indicates possible undercharge)');
  }
  checklist.push('Do not add refrigerant based solely on superheat — rule out mechanical causes first');

  const analysis = buildAnalysis();

  return (
    <div className="flex flex-col gap-4">
      {/* Equipment context */}
      <div className="bg-gray-800/70 rounded-2xl p-4 border border-gray-700">
        <div className="text-xs text-gray-500 mb-2 font-mono">EQUIPMENT CONTEXT</div>
        <div className="text-sm font-semibold text-white">{MOCK_EQUIPMENT.make} {MOCK_EQUIPMENT.model} · {MOCK_JOB.equipmentShort}</div>
        <div className="text-xs text-gray-400 mt-0.5">{MOCK_JOB.customer} · {refrigerant} · {meteringDevice === 'unknown' ? 'Metering device unknown' : meteringDevice}</div>
        <div className="text-xs text-gray-500 mt-0.5">{MOCK_JOB.weather}</div>
      </div>

      {/* Readings summary */}
      {(superheat !== null || subcooling !== null) && (
        <div className="grid grid-cols-2 gap-3">
          {superheat !== null && shInterp && (
            <div className="bg-gray-800 rounded-xl p-3 border" style={{ borderColor: shInterp.color + '60' }}>
              <div className="text-xs text-gray-500">Superheat</div>
              <div className="text-xl font-bold text-white">{superheat}°F</div>
              <div className="text-[10px] mt-1" style={{ color: shInterp.color }}>{shInterp.label}</div>
            </div>
          )}
          {subcooling !== null && scInterp && (
            <div className="bg-gray-800 rounded-xl p-3 border" style={{ borderColor: scInterp.color + '60' }}>
              <div className="text-xs text-gray-500">Subcooling</div>
              <div className="text-xl font-bold text-white">{subcooling}°F</div>
              <div className="text-[10px] mt-1" style={{ color: scInterp.color }}>{scInterp.label}</div>
            </div>
          )}
        </div>
      )}

      {/* AI Interpretation */}
      <div className="bg-blue-950/40 border border-blue-800 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={14} className="text-blue-400" />
          <span className="text-xs font-semibold text-blue-400 uppercase tracking-wide">AI Interpretation · RTU-3 Specific</span>
        </div>
        {analysis.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {analysis.map((line, i) => (
              <li key={i} className="text-xs text-gray-300 leading-relaxed flex gap-2">
                <span className="text-blue-500 shrink-0 mt-0.5">▸</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-gray-400">Enter readings in the Superheat or Subcooling tabs to unlock interpretation.</p>
        )}
      </div>

      {/* Check next checklist */}
      {checklist.length > 0 && (
        <div className="bg-gray-800/60 rounded-2xl p-4 border border-gray-700">
          <div className="text-xs font-semibold text-gray-300 mb-3">Before Adjusting Refrigerant — Check These First:</div>
          <ul className="flex flex-col gap-2">
            {checklist.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
                <CheckCircle size={12} className="text-green-600 shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Truthfulness notice */}
      <div className="flex items-start gap-2 text-[10px] text-gray-600 px-1">
        <Info size={11} className="shrink-0 mt-0.5" />
        <span>AI interpretation is based on entered readings, equipment history, and ambient conditions. Always verify manufacturer specifications before charge adjustment.</span>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function RefrigerantAssistant({ onClose, onLogMeasurement, initialSuctionPressure, initialHeadPressure }: Props) {
  const [screen, setScreen]               = useState<Screen>('overview');
  const [activeRef, setActiveRef]         = useState<SupportedRefrigerant>(
    (MOCK_EQUIPMENT.refrigerant as SupportedRefrigerant) ?? 'R-410A'
  );
  const [meteringDevice]                  = useState<MeteringDevice>('TXV');

  // PT Chart state
  const [ptPressure, setPtPressure]       = useState('');
  const [ptResult, setPtResult]           = useState<{ psig: number; tempF: number } | null>(null);
  const [ptAnimKey, setPtAnimKey]         = useState(0);

  // Superheat builder
  const [shSuctionPSIG, setShSuctionPSIG] = useState(initialSuctionPressure ?? '115');
  const [shSatTemp, setShSatTemp]         = useState<number | null>(null);
  const [shLineTemp, setShLineTemp]       = useState('');
  const [shResult, setShResult]           = useState<number | null>(null);
  const [shStep, setShStep]               = useState(1);

  // Subcooling builder
  const [scHeadPSIG, setScHeadPSIG]       = useState(initialHeadPressure ?? '385');
  const [scSatTemp, setScSatTemp]         = useState<number | null>(null);
  const [scLineTemp, setScLineTemp]       = useState('');
  const [scResult, setScResult]           = useState<number | null>(null);
  const [scStep, setScStep]               = useState(1);

  const refInfo = REFRIGERANT_INFO[activeRef];

  // ── PT Chart: lookup from pressure input ──────────────────────────────────
  function handlePtLookup() {
    const p = parseFloat(ptPressure);
    if (isNaN(p)) return;
    const t = getSaturationTemp(activeRef, p);
    if (t !== null) {
      setPtResult({ psig: p, tempF: t });
      setPtAnimKey(k => k + 1);
    }
  }

  // ── Superheat builder ─────────────────────────────────────────────────────
  function shLookupSat() {
    const p = parseFloat(shSuctionPSIG);
    if (isNaN(p)) return;
    const t = getSaturationTemp(activeRef, p);
    setShSatTemp(t);
    if (t !== null) setShStep(3);
  }

  function shCalculate() {
    const lineT = parseFloat(shLineTemp);
    if (isNaN(lineT) || shSatTemp === null) return;
    const sh = Math.round((lineT - shSatTemp) * 10) / 10;
    setShResult(sh);
    setShStep(4);
  }

  // ── Subcooling builder ────────────────────────────────────────────────────
  function scLookupSat() {
    const p = parseFloat(scHeadPSIG);
    if (isNaN(p)) return;
    const t = getSaturationTemp(activeRef, p);
    setScSatTemp(t);
    if (t !== null) setScStep(3);
  }

  function scCalculate() {
    const lineT = parseFloat(scLineTemp);
    if (isNaN(lineT) || scSatTemp === null) return;
    const sc = Math.round((scSatTemp - lineT) * 10) / 10;
    setScResult(sc);
    setScStep(4);
  }

  // ── Log to timeline ───────────────────────────────────────────────────────
  function handleLog() {
    const readings: MeasurementReading[] = [];
    if (shSuctionPSIG) readings.push({ label: 'Suction Pressure', value: shSuctionPSIG, unit: 'psi', status: 'ok', target: `${refInfo.typicalSuction.minPSIG}–${refInfo.typicalSuction.maxPSIG}` });
    if (shSatTemp !== null) readings.push({ label: 'Suction Sat. Temp', value: shSatTemp.toFixed(1), unit: '°F', status: 'ok' });
    if (shLineTemp) readings.push({ label: 'Suction Line Temp', value: shLineTemp, unit: '°F', status: 'ok' });
    if (shResult !== null) {
      const interp = interpretSuperheat(shResult, activeRef, meteringDevice);
      readings.push({ label: 'Superheat', value: shResult.toFixed(1), unit: '°F', status: interp.band === 'target' ? 'ok' : interp.band === 'high' ? 'warn' : 'alert', target: `${refInfo.shTarget.min}–${refInfo.shTarget.max}°F` });
    }
    if (scHeadPSIG) readings.push({ label: 'Head Pressure', value: scHeadPSIG, unit: 'psi', status: parseFloat(scHeadPSIG) > refInfo.typicalDischarge.maxPSIG ? 'alert' : 'ok', target: `${refInfo.typicalDischarge.minPSIG}–${refInfo.typicalDischarge.maxPSIG}` });
    if (scSatTemp !== null) readings.push({ label: 'Condensing Sat. Temp', value: scSatTemp.toFixed(1), unit: '°F', status: 'ok' });
    if (scLineTemp) readings.push({ label: 'Liquid Line Temp', value: scLineTemp, unit: '°F', status: 'ok' });
    if (scResult !== null) {
      const interp = interpretSubcooling(scResult, activeRef);
      readings.push({ label: 'Subcooling', value: scResult.toFixed(1), unit: '°F', status: interp.band === 'target' ? 'ok' : interp.band === 'high' ? 'warn' : 'alert', target: `${refInfo.scTarget.min}–${refInfo.scTarget.max}°F` });
    }
    if (readings.length > 0) { onLogMeasurement(readings); onClose(); }
  }

  // ── Refrigerant switcher ──────────────────────────────────────────────────
  const refSelector = (
    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
      {ALL_REFRIGERANTS.map(r => (
        <button key={r} onClick={() => setActiveRef(r)}
          className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border
            ${r === activeRef ? 'text-black border-transparent' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'}`}
          style={r === activeRef ? { backgroundColor: REFRIGERANT_INFO[r].color } : {}}>
          {r}
        </button>
      ))}
    </div>
  );

  // ── Screen nav ────────────────────────────────────────────────────────────
  const navItems: { id: Screen; icon: React.ReactNode; label: string }[] = [
    { id: 'pt-chart',  icon: <BarChart2 size={14} />, label: 'PT Chart' },
    { id: 'superheat', icon: <Thermometer size={14} />, label: 'Superheat' },
    { id: 'subcooling',icon: <Gauge size={14} />, label: 'Subcooling' },
    { id: 'ai-analysis',icon: <Zap size={14} />, label: 'AI Analysis' },
    { id: 'teach-me', icon: <BookOpen size={14} />, label: 'Teach Me' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col" style={{ fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div className="shrink-0 px-4 pt-4 pb-3 border-b border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {screen !== 'overview' && (
              <button onClick={() => setScreen('overview')} className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800 text-gray-400">
                <ChevronLeft size={16} />
              </button>
            )}
            <div>
              <div className="text-[10px] font-mono text-cyan-500 uppercase tracking-widest">AI Refrigerant Assistant</div>
              <div className="text-sm font-bold text-white">
                {screen === 'overview'   && 'Refrigerant Diagnostics'}
                {screen === 'pt-chart'   && 'Interactive PT Chart'}
                {screen === 'superheat'  && 'Superheat Builder'}
                {screen === 'subcooling' && 'Subcooling Builder'}
                {screen === 'ai-analysis'&& 'AI Interpretation'}
                {screen === 'teach-me'  && 'Teach Me'}
                {screen === 'analog-mode'&& 'Analog Gauge Mode'}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800 text-gray-400">
            <X size={16} />
          </button>
        </div>

        {/* Equipment context strip */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-medium text-white bg-gray-800 px-2 py-0.5 rounded-md">
            {MOCK_EQUIPMENT.make} {MOCK_EQUIPMENT.model}
          </span>
          <span className="text-[11px] text-gray-400">{MOCK_JOB.equipmentShort}</span>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-md" style={{ backgroundColor: refInfo.color + '30', color: refInfo.color }}>
            {activeRef}
          </span>
          <span className="text-[11px] text-gray-500">{meteringDevice}</span>
          <span className="text-[11px] text-gray-500">·</span>
          <span className="text-[11px] text-gray-500">91°F · 62% RH</span>
        </div>

        {/* Screen nav tabs (hidden on overview) */}
        {screen !== 'overview' && screen !== 'teach-me' && screen !== 'analog-mode' && (
          <div className="flex gap-1 mt-3 overflow-x-auto no-scrollbar">
            {navItems.map(n => (
              <button key={n.id} onClick={() => setScreen(n.id)}
                className={`flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all
                  ${screen === n.id ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
                {n.icon}{n.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-4 flex flex-col gap-4">

          {/* ── OVERVIEW ── */}
          {screen === 'overview' && (
            <>
              {/* Hero */}
              <div className="rounded-2xl p-5 border text-center" style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0d2040 100%)', borderColor: refInfo.color + '40' }}>
                <div className="text-4xl mb-2">🌡️</div>
                <div className="text-lg font-bold text-white mb-1">AI Refrigerant Assistant</div>
                <div className="text-xs text-gray-400 leading-relaxed">
                  Interactive PT charts · Superheat & subcooling builder · Animated teach mode · Equipment-specific AI interpretation
                </div>
                <div className="mt-3 flex items-center justify-center gap-2">
                  <span className="text-[11px] px-2 py-1 rounded-md font-medium" style={{ backgroundColor: refInfo.color + '25', color: refInfo.color }}>{activeRef}</span>
                  <span className="text-[11px] text-gray-500">·</span>
                  <span className="text-[11px] text-gray-500">TXV · 91°F Ambient</span>
                </div>
              </div>

              {/* Auto-filled readings */}
              <div className="bg-gray-800/60 rounded-2xl border border-gray-700 p-4">
                <div className="text-xs font-semibold text-gray-400 mb-3">📈 Auto-Filled From Current Job</div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Suction Pressure', value: '115', unit: 'psi', status: 'ok' as const },
                    { label: 'Head Pressure', value: '385', unit: 'psi', status: 'alert' as const },
                    { label: 'Superheat', value: '24', unit: '°F', status: 'alert' as const },
                    { label: 'Subcooling', value: '8', unit: '°F', status: 'warn' as const },
                  ].map(r => (
                    <div key={r.label} className={`rounded-xl p-2.5 border ${r.status === 'alert' ? 'border-red-800 bg-red-950/30' : r.status === 'warn' ? 'border-amber-800 bg-amber-950/30' : 'border-gray-700 bg-gray-800'}`}>
                      <div className="text-[10px] text-gray-500">{r.label}</div>
                      <div className="text-base font-bold text-white">{r.value}<span className="text-xs font-normal text-gray-400 ml-1">{r.unit}</span></div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Refrigerant selector */}
              <div>
                <div className="text-xs text-gray-500 mb-2">Refrigerant</div>
                {refSelector}
                <div className="mt-2 text-[10px] text-gray-600">{refInfo.note}</div>
              </div>

              {/* Quick actions */}
              <div className="grid grid-cols-2 gap-3">
                {navItems.map(n => (
                  <button key={n.id} onClick={() => setScreen(n.id)}
                    className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-2xl p-4 flex flex-col items-start gap-2 text-left transition-colors">
                    <div style={{ color: refInfo.color }}>{n.icon}</div>
                    <span className="text-sm font-semibold text-white">{n.label}</span>
                  </button>
                ))}
                <button onClick={() => setScreen('analog-mode')}
                  className="bg-gray-800 hover:bg-gray-700 border border-amber-900/60 rounded-2xl p-4 flex flex-col items-start gap-2 text-left transition-colors">
                  <Gauge size={14} className="text-amber-400" />
                  <span className="text-sm font-semibold text-white">Analog Mode</span>
                </button>
              </div>

              {/* Warning */}
              <div className="flex items-start gap-2 bg-amber-950/30 border border-amber-900 rounded-xl p-3">
                <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-200 leading-relaxed">
                  PT values are reference approximations calibrated for field guidance. Always verify critical charge decisions against manufacturer PT charts. Never add refrigerant based solely on PT readings.
                </p>
              </div>
            </>
          )}

          {/* ── PT CHART ── */}
          {screen === 'pt-chart' && (
            <>
              {refSelector}
              <div className="bg-gray-900 rounded-2xl border border-gray-700 p-2 overflow-hidden">
                <PTChartSVG
                  activeRef={activeRef}
                  highlightPressure={ptResult?.psig ?? null}
                  highlightTemp={ptResult?.tempF ?? null}
                  onTapPoint={({ psig, tempF }) => {
                    setPtResult({ psig, tempF });
                    setPtPressure(String(psig));
                    setPtAnimKey(k => k + 1);
                  }}
                />
              </div>

              {/* Input */}
              <div className="bg-gray-800 rounded-2xl border border-gray-700 p-4">
                <div className="text-xs text-gray-400 mb-2">Enter pressure to look up saturation temperature</div>
                <div className="flex gap-3">
                  <input
                    type="number" inputMode="decimal" placeholder="e.g. 115"
                    value={ptPressure}
                    onChange={e => setPtPressure(e.target.value)}
                    className="flex-1 bg-gray-900 text-white rounded-xl px-4 py-3 text-lg font-bold border border-gray-600 outline-none focus:border-cyan-500"
                  />
                  <span className="text-gray-400 self-center text-sm">PSIG</span>
                  <button onClick={handlePtLookup}
                    className="px-5 py-3 rounded-xl font-bold text-sm text-black"
                    style={{ backgroundColor: refInfo.color }}>
                    Lookup
                  </button>
                </div>
              </div>

              {/* Animated result */}
              {ptResult && (
                <div className="bg-gray-800/80 rounded-2xl border p-4" style={{ borderColor: refInfo.color + '40' }}>
                  <ConversionAnimation key={ptAnimKey} pressurePSIG={ptResult.psig} satTemp={ptResult.tempF} refColor={refInfo.color} />
                  <div className="text-center mt-2 text-xs text-gray-500">
                    {activeRef} · {ptResult.psig} PSIG = {ptResult.tempF.toFixed(1)}°F Saturation
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => { setShSuctionPSIG(String(ptResult.psig)); setScreen('superheat'); }}
                      className="flex-1 text-xs py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl">
                      Use for Superheat →
                    </button>
                    <button onClick={() => { setScHeadPSIG(String(ptResult.psig)); setScreen('subcooling'); }}
                      className="flex-1 text-xs py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl">
                      Use for Subcooling →
                    </button>
                  </div>
                </div>
              )}

              {/* Tap hint */}
              <div className="text-center text-[10px] text-gray-600">Tap anywhere on the chart to read values</div>

              {/* Refrigerant info */}
              <div className="bg-gray-800/60 border border-gray-700 rounded-2xl p-4">
                <div className="text-xs font-semibold text-white mb-2">{refInfo.name}</div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div><span className="text-gray-500">GWP: </span><span className="text-gray-300">{refInfo.gwp.toLocaleString()}</span></div>
                  <div><span className="text-gray-500">Status: </span><span className={refInfo.status === 'phasing-out' ? 'text-amber-400' : refInfo.status === 'next-gen' ? 'text-green-400' : 'text-gray-300'}>{refInfo.status}</span></div>
                  <div className="col-span-2"><span className="text-gray-500">Typical suction: </span><span className="text-gray-300">{refInfo.typicalSuction.minPSIG}–{refInfo.typicalSuction.maxPSIG} PSIG ({refInfo.typicalSuction.minTempF}–{refInfo.typicalSuction.maxTempF}°F evap)</span></div>
                  <div className="col-span-2"><span className="text-gray-500">Typical discharge: </span><span className="text-gray-300">{refInfo.typicalDischarge.minPSIG}–{refInfo.typicalDischarge.maxPSIG} PSIG ({refInfo.typicalDischarge.minTempF}–{refInfo.typicalDischarge.maxTempF}°F cond)</span></div>
                </div>
                <p className="text-[10px] text-gray-600 mt-2">{refInfo.note}</p>
              </div>
            </>
          )}

          {/* ── SUPERHEAT BUILDER ── */}
          {screen === 'superheat' && (
            <>
              {refSelector}
              <div className="flex flex-col gap-3">
                {/* Step 1 */}
                <StepCard number={1} title="Suction Pressure" unit="PSIG" status={shStep >= 2 ? 'done' : 'active'}>
                  <input type="number" inputMode="decimal" placeholder="e.g. 115"
                    value={shSuctionPSIG}
                    onChange={e => { setShSuctionPSIG(e.target.value); setShSatTemp(null); setShResult(null); setShStep(1); }}
                    className="w-full bg-gray-900 text-white text-xl font-bold rounded-xl px-4 py-3 border border-gray-600 outline-none focus:border-cyan-500 mt-2"
                  />
                  <button onClick={() => { shLookupSat(); setShStep(2); }}
                    className="w-full mt-2 py-2.5 rounded-xl text-sm font-bold text-black"
                    style={{ backgroundColor: refInfo.color }}>
                    PT Lookup →
                  </button>
                </StepCard>

                {/* Step 2 */}
                <StepCard number={2} title="Saturation Temperature (PT Lookup)" unit="°F"
                  status={shSatTemp !== null ? 'done' : shStep === 2 ? 'active' : 'pending'}>
                  {shSatTemp !== null ? (
                    <div className="flex items-center gap-3 mt-1">
                      <div className="text-2xl font-bold" style={{ color: refInfo.color }}>{shSatTemp.toFixed(1)}°F</div>
                      <div className="text-xs text-gray-500">at {shSuctionPSIG} PSIG</div>
                    </div>
                  ) : shStep >= 2 ? (
                    <div className="text-sm text-amber-400 mt-1">Pressure out of range for {activeRef}</div>
                  ) : null}
                </StepCard>

                {/* Step 3 */}
                <StepCard number={3} title="Suction Line Temperature (clamp reading)" unit="°F"
                  status={shResult !== null ? 'done' : shStep === 3 ? 'active' : 'pending'}>
                  {shStep >= 3 && (
                    <>
                      <input type="number" inputMode="decimal" placeholder="e.g. 62"
                        value={shLineTemp}
                        onChange={e => { setShLineTemp(e.target.value); setShResult(null); }}
                        className="w-full bg-gray-900 text-white text-xl font-bold rounded-xl px-4 py-3 border border-gray-600 outline-none focus:border-cyan-500 mt-2"
                      />
                      <p className="text-[10px] text-gray-500 mt-1">Clamp on copper suction line, 6" from compressor. Wait for stable reading.</p>
                      <button onClick={shCalculate}
                        className="w-full mt-2 py-2.5 rounded-xl text-sm font-bold bg-gray-700 hover:bg-gray-600 text-white">
                        Calculate Superheat →
                      </button>
                    </>
                  )}
                </StepCard>

                {/* Step 4 — Result */}
                {shResult !== null && (() => {
                  const interp = interpretSuperheat(shResult, activeRef, meteringDevice);
                  return (
                    <div className="rounded-2xl border p-5 text-center" style={{ borderColor: interp.color + '60', background: interp.color + '15' }}>
                      <div className="text-xs text-gray-400 mb-1">Superheat Result</div>
                      {/* Animated subtraction */}
                      <div className="flex items-center justify-center gap-3 mb-3">
                        <div className="text-center">
                          <div className="text-sm text-gray-500">Line Temp</div>
                          <div className="text-2xl font-bold text-white">{shLineTemp}°F</div>
                        </div>
                        <div className="text-2xl text-gray-500">−</div>
                        <div className="text-center">
                          <div className="text-sm text-gray-500">Sat. Temp</div>
                          <div className="text-2xl font-bold text-white">{shSatTemp!.toFixed(1)}°F</div>
                        </div>
                        <div className="text-2xl text-gray-500">=</div>
                        <div className="text-center">
                          <div className="text-sm text-gray-500">Superheat</div>
                          <div className="text-3xl font-bold" style={{ color: interp.color }}>{shResult.toFixed(1)}°F</div>
                        </div>
                      </div>
                      <AnimatedGauge
                        value={shResult} max={30}
                        targetMin={refInfo.shTarget.min} targetMax={refInfo.shTarget.max}
                        label={`Target: ${refInfo.shTarget.min}–${refInfo.shTarget.max}°F (${meteringDevice})`}
                        unit="°F Superheat" color={interp.color}
                      />
                      <div className="text-sm font-semibold mt-2" style={{ color: interp.color }}>{interp.label}</div>
                      <p className="text-[10px] text-gray-500 mt-1">Typical TXV target: {refInfo.shTarget.min}–{refInfo.shTarget.max}°F · Always verify manufacturer specifications</p>
                    </div>
                  );
                })()}
              </div>

              {/* Log button */}
              {shResult !== null && (
                <div className="flex gap-3 mt-2">
                  <button onClick={() => setScreen('ai-analysis')} className="flex-1 py-3 bg-blue-900/60 border border-blue-700 text-blue-300 font-semibold rounded-xl text-sm">
                    AI Analysis →
                  </button>
                  <button onClick={handleLog} className="flex-1 py-3 bg-green-800 hover:bg-green-700 text-white font-bold rounded-xl text-sm">
                    Log to Timeline
                  </button>
                </div>
              )}
            </>
          )}

          {/* ── SUBCOOLING BUILDER ── */}
          {screen === 'subcooling' && (
            <>
              {refSelector}
              <div className="flex flex-col gap-3">
                {/* Step 1 */}
                <StepCard number={1} title="Head (Discharge) Pressure" unit="PSIG" status={scStep >= 2 ? 'done' : 'active'}>
                  <input type="number" inputMode="decimal" placeholder="e.g. 385"
                    value={scHeadPSIG}
                    onChange={e => { setScHeadPSIG(e.target.value); setScSatTemp(null); setScResult(null); setScStep(1); }}
                    className="w-full bg-gray-900 text-white text-xl font-bold rounded-xl px-4 py-3 border border-gray-600 outline-none focus:border-cyan-500 mt-2"
                  />
                  <button onClick={() => { scLookupSat(); setScStep(2); }}
                    className="w-full mt-2 py-2.5 rounded-xl text-sm font-bold text-black"
                    style={{ backgroundColor: refInfo.color }}>
                    PT Lookup →
                  </button>
                </StepCard>

                {/* Step 2 */}
                <StepCard number={2} title="Condensing Saturation Temperature (PT Lookup)" unit="°F"
                  status={scSatTemp !== null ? 'done' : scStep === 2 ? 'active' : 'pending'}>
                  {scSatTemp !== null ? (
                    <div className="flex items-center gap-3 mt-1">
                      <div className="text-2xl font-bold" style={{ color: refInfo.color }}>{scSatTemp.toFixed(1)}°F</div>
                      <div className="text-xs text-gray-500">at {scHeadPSIG} PSIG</div>
                    </div>
                  ) : scStep >= 2 ? (
                    <div className="text-sm text-amber-400 mt-1">Pressure out of range for {activeRef}</div>
                  ) : null}
                </StepCard>

                {/* Step 3 */}
                <StepCard number={3} title="Liquid Line Temperature (clamp reading)" unit="°F"
                  status={scResult !== null ? 'done' : scStep === 3 ? 'active' : 'pending'}>
                  {scStep >= 3 && (
                    <>
                      <input type="number" inputMode="decimal" placeholder="e.g. 95"
                        value={scLineTemp}
                        onChange={e => { setScLineTemp(e.target.value); setScResult(null); }}
                        className="w-full bg-gray-900 text-white text-xl font-bold rounded-xl px-4 py-3 border border-gray-600 outline-none focus:border-cyan-500 mt-2"
                      />
                      <p className="text-[10px] text-gray-500 mt-1">Clamp on liquid line near condenser outlet. Liquid line must be fully subcooled for accurate reading.</p>
                      <button onClick={scCalculate}
                        className="w-full mt-2 py-2.5 rounded-xl text-sm font-bold bg-gray-700 hover:bg-gray-600 text-white">
                        Calculate Subcooling →
                      </button>
                    </>
                  )}
                </StepCard>

                {/* Step 4 — Result */}
                {scResult !== null && (() => {
                  const interp = interpretSubcooling(scResult, activeRef);
                  return (
                    <div className="rounded-2xl border p-5 text-center" style={{ borderColor: interp.color + '60', background: interp.color + '15' }}>
                      <div className="text-xs text-gray-400 mb-1">Subcooling Result</div>
                      <div className="flex items-center justify-center gap-3 mb-3">
                        <div className="text-center">
                          <div className="text-sm text-gray-500">Sat. Temp</div>
                          <div className="text-2xl font-bold text-white">{scSatTemp!.toFixed(1)}°F</div>
                        </div>
                        <div className="text-2xl text-gray-500">−</div>
                        <div className="text-center">
                          <div className="text-sm text-gray-500">Line Temp</div>
                          <div className="text-2xl font-bold text-white">{scLineTemp}°F</div>
                        </div>
                        <div className="text-2xl text-gray-500">=</div>
                        <div className="text-center">
                          <div className="text-sm text-gray-500">Subcooling</div>
                          <div className="text-3xl font-bold" style={{ color: interp.color }}>{scResult.toFixed(1)}°F</div>
                        </div>
                      </div>
                      <AnimatedGauge
                        value={scResult} max={25}
                        targetMin={refInfo.scTarget.min} targetMax={refInfo.scTarget.max}
                        label={`Target: ${refInfo.scTarget.min}–${refInfo.scTarget.max}°F`}
                        unit="°F Subcooling" color={interp.color}
                      />
                      <div className="text-sm font-semibold mt-2" style={{ color: interp.color }}>{interp.label}</div>
                      <p className="text-[10px] text-gray-500 mt-1">Target: {refInfo.scTarget.min}–{refInfo.scTarget.max}°F · Always verify manufacturer specifications</p>
                    </div>
                  );
                })()}
              </div>

              {scResult !== null && (
                <div className="flex gap-3 mt-2">
                  <button onClick={() => setScreen('ai-analysis')} className="flex-1 py-3 bg-blue-900/60 border border-blue-700 text-blue-300 font-semibold rounded-xl text-sm">
                    AI Analysis →
                  </button>
                  <button onClick={handleLog} className="flex-1 py-3 bg-green-800 hover:bg-green-700 text-white font-bold rounded-xl text-sm">
                    Log to Timeline
                  </button>
                </div>
              )}
            </>
          )}

          {/* ── AI ANALYSIS ── */}
          {screen === 'ai-analysis' && (
            <AIAnalysis
              superheat={shResult}
              subcooling={scResult}
              suctionPSIG={shSuctionPSIG ? parseFloat(shSuctionPSIG) : null}
              headPSIG={scHeadPSIG ? parseFloat(scHeadPSIG) : null}
              refrigerant={activeRef}
              meteringDevice={meteringDevice}
            />
          )}

          {/* ── TEACH ME ── */}
          {screen === 'teach-me' && <TeachMeMode />}

          {/* ── ANALOG MODE ── */}
          {screen === 'analog-mode' && (
            <AnalogMode refrigerant={activeRef} onDone={onClose} />
          )}

        </div>
      </div>

      {/* Footer log button (shown when there's data to save) */}
      {(shResult !== null || scResult !== null) && screen !== 'overview' && (
        <div className="shrink-0 px-4 py-3 border-t border-gray-800 bg-black">
          <button onClick={handleLog}
            className="w-full py-3.5 bg-green-700 hover:bg-green-600 text-white font-bold rounded-2xl text-sm flex items-center justify-center gap-2">
            <CheckCircle size={16} /> Log Readings to Timeline
          </button>
        </div>
      )}
    </div>
  );
}
