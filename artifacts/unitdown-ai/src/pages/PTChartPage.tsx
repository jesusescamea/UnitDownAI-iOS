/**
 * PTChartPage — Interactive PT Chart, Superheat & Subcooling Calculator.
 *
 * Offline-capable field tool. No network required after page load.
 * Supports 10 refrigerants with live SH/SC calculations and charge interpretation.
 */
import { useState, useMemo } from "react";
import {
  Gauge,
  ThermometerSun,
  ThermometerSnowflake,
  Info,
  ChevronDown,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Wrench,
} from "lucide-react";
import { AppNav } from "../components/AppNav";
import {
  ALL_REFRIGERANTS,
  REFRIGERANT_INFO,
  getSaturationTemp,
  interpretSuperheat,
  interpretSubcooling,
  interpretCharge,
  type SupportedRefrigerant,
} from "./jmp/refrigerantData";

// ─── PT Lookup Panel ─────────────────────────────────────────────────────────

function PTLookupRow({ ref: refrigerant }: { ref: SupportedRefrigerant }) {
  const [psig, setPsig] = useState("");
  const satTemp = useMemo(() => {
    const v = parseFloat(psig);
    if (isNaN(v)) return null;
    return getSaturationTemp(refrigerant, v);
  }, [psig, refrigerant]);

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <input
          type="number"
          value={psig}
          onChange={(e) => setPsig(e.target.value)}
          placeholder="PSIG"
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500"
        />
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-600 font-bold">PSIG</span>
      </div>
      <span className="text-gray-600">→</span>
      <div className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm font-bold text-center">
        {satTemp !== null ? (
          <span className="text-emerald-400">{satTemp}°F</span>
        ) : psig ? (
          <span className="text-gray-600">Out of range</span>
        ) : (
          <span className="text-gray-700">Sat °F</span>
        )}
      </div>
    </div>
  );
}

// ─── SH/SC Visual Bar ────────────────────────────────────────────────────────

interface ReadingBarProps {
  label: string;
  value: number | null;
  min: number;
  max: number;
  targetMin: number;
  targetMax: number;
  unit?: string;
  color: string;
  band: "low" | "target" | "high" | "very-high" | null;
  bandLabel: string;
}

function ReadingBar({
  label,
  value,
  min,
  max,
  targetMin,
  targetMax,
  unit = "°F",
  color,
  band,
  bandLabel,
}: ReadingBarProps) {
  const range = max - min;
  const targetStartPct = ((targetMin - min) / range) * 100;
  const targetWidthPct = ((targetMax - targetMin) / range) * 100;
  const valuePct = value !== null ? Math.max(0, Math.min(100, ((value - min) / range) * 100)) : null;

  const bandIcon = band === "target"
    ? <CheckCircle2 className="w-3.5 h-3.5" />
    : band === "low"
    ? <TrendingDown className="w-3.5 h-3.5" />
    : band === "high" || band === "very-high"
    ? <TrendingUp className="w-3.5 h-3.5" />
    : <Minus className="w-3.5 h-3.5" />;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</span>
        {value !== null && band ? (
          <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color }}>
            {bandIcon}
            <span>{value.toFixed(1)}{unit}</span>
          </div>
        ) : (
          <span className="text-xs text-gray-700">— {unit}</span>
        )}
      </div>

      {/* Bar */}
      <div className="relative h-4 bg-gray-800 rounded-full overflow-hidden">
        {/* Target zone */}
        <div
          className="absolute top-0 bottom-0 bg-emerald-900/60 border-x border-emerald-700/40"
          style={{ left: `${targetStartPct}%`, width: `${targetWidthPct}%` }}
        />
        {/* Value marker */}
        {valuePct !== null && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-2 h-6 rounded-full shadow-lg transition-all duration-300"
            style={{ left: `calc(${valuePct}% - 4px)`, backgroundColor: color }}
          />
        )}
      </div>

      {/* Scale labels */}
      <div className="flex items-center justify-between text-[10px] text-gray-700">
        <span>{min}{unit}</span>
        <span className="text-emerald-800 font-semibold">Target: {targetMin}–{targetMax}{unit}</span>
        <span>{max}{unit}</span>
      </div>

      {/* Band label */}
      {band && value !== null && (
        <p className="text-[11px] font-medium" style={{ color }}>{bandLabel}</p>
      )}
    </div>
  );
}

// ─── Charge State Badge ───────────────────────────────────────────────────────

function ChargeStateBadge({ state, label, description, urgency, color }: {
  state: string;
  label: string;
  description: string;
  urgency: "ok" | "monitor" | "action";
  color: string;
}) {
  const urgencyConfig = {
    ok:      { bg: "bg-emerald-950/60", border: "border-emerald-800/40", Icon: CheckCircle2 },
    monitor: { bg: "bg-amber-950/60",   border: "border-amber-800/40",   Icon: AlertTriangle },
    action:  { bg: "bg-red-950/60",     border: "border-red-800/40",     Icon: AlertCircle },
  }[urgency];

  const { bg, border, Icon } = urgencyConfig;

  if (state === "insufficient-data") {
    return (
      <div className="rounded-xl bg-gray-900 border border-gray-800 px-4 py-3 text-center">
        <p className="text-xs text-gray-600 font-medium">Enter suction + liquid readings to see charge state</p>
      </div>
    );
  }

  return (
    <div className={`rounded-xl ${bg} border ${border} px-4 py-3.5 space-y-1.5`}>
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 flex-shrink-0" style={{ color }} />
        <span className="text-sm font-bold" style={{ color }}>{label}</span>
      </div>
      <p className="text-xs text-gray-400 leading-relaxed">{description}</p>
    </div>
  );
}

// ─── Refrigerant Selector ─────────────────────────────────────────────────────

const REF_GROUPS = [
  {
    label: "A/C & Heat Pump",
    refs: ["R-410A", "R-454B", "R-32", "R-22", "R-407C"] as SupportedRefrigerant[],
  },
  {
    label: "Refrigeration",
    refs: ["R-404A", "R-448A", "R-449A"] as SupportedRefrigerant[],
  },
  {
    label: "Chiller / Automotive",
    refs: ["R-134a", "R-1234yf"] as SupportedRefrigerant[],
  },
];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PTChartPage() {
  const [ref, setRef] = useState<SupportedRefrigerant>("R-410A");
  const [meteringDevice, setMeteringDevice] = useState<"TXV" | "orifice">("TXV");
  const [showRefSelector, setShowRefSelector] = useState(false);

  // Suction side inputs
  const [suctionPSIG, setSuctionPSIG] = useState("");
  const [suctionLineTemp, setSuctionLineTemp] = useState("");

  // Liquid side inputs
  const [liquidPSIG, setLiquidPSIG] = useState("");
  const [liquidLineTemp, setLiquidLineTemp] = useState("");

  const info = REFRIGERANT_INFO[ref];

  // Derived calculations
  const satSuction = useMemo(() => {
    const v = parseFloat(suctionPSIG);
    if (isNaN(v) || v < 0) return null;
    return getSaturationTemp(ref, v);
  }, [suctionPSIG, ref]);

  const satCondensing = useMemo(() => {
    const v = parseFloat(liquidPSIG);
    if (isNaN(v) || v < 0) return null;
    return getSaturationTemp(ref, v);
  }, [liquidPSIG, ref]);

  const superheat = useMemo(() => {
    const lineTemp = parseFloat(suctionLineTemp);
    if (isNaN(lineTemp) || satSuction === null) return null;
    return Math.round((lineTemp - satSuction) * 10) / 10;
  }, [suctionLineTemp, satSuction]);

  const subcooling = useMemo(() => {
    const lineTemp = parseFloat(liquidLineTemp);
    if (isNaN(lineTemp) || satCondensing === null) return null;
    return Math.round((satCondensing - lineTemp) * 10) / 10;
  }, [liquidLineTemp, satCondensing]);

  const shInterp = useMemo(() => {
    if (superheat === null) return null;
    return interpretSuperheat(superheat, ref, meteringDevice);
  }, [superheat, ref, meteringDevice]);

  const scInterp = useMemo(() => {
    if (subcooling === null) return null;
    return interpretSubcooling(subcooling, ref);
  }, [subcooling, ref]);

  const chargeInterp = useMemo(() => {
    return interpretCharge(superheat, subcooling, ref, meteringDevice);
  }, [superheat, subcooling, ref, meteringDevice]);

  function resetInputs() {
    setSuctionPSIG("");
    setSuctionLineTemp("");
    setLiquidPSIG("");
    setLiquidLineTemp("");
  }

  const shInfo = info.shTarget;
  const scInfo = info.scTarget;
  const shBarMin = 0, shBarMax = meteringDevice === "orifice" ? 45 : 35;
  const scBarMin = 0, scBarMax = 30;
  const shTargetMin = meteringDevice === "orifice" ? 10 : shInfo.min;
  const shTargetMax = meteringDevice === "orifice" ? 25 : shInfo.max;

  const statusBadge = () => {
    if (info.status === "next-gen") return { label: "Next-Gen", bg: "bg-emerald-950", text: "text-emerald-400", border: "border-emerald-800" };
    if (info.status === "phasing-out") return { label: "Phasing Out", bg: "bg-amber-950", text: "text-amber-400", border: "border-amber-800" };
    return { label: "Current", bg: "bg-blue-950", text: "text-blue-400", border: "border-blue-800" };
  };
  const badge = statusBadge();

  return (
    <div className="min-h-[100dvh] bg-gray-950 text-white flex flex-col">
      <AppNav active="pt-chart" />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 pb-20 sm:pb-8 space-y-6">

        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">PT Chart</h1>
            <p className="text-xs text-gray-500 mt-0.5">Superheat · Subcooling · Charge Analysis</p>
          </div>
          <button
            onClick={resetInputs}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors px-2.5 py-1.5 rounded-lg hover:bg-gray-800"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>

        {/* ── Refrigerant Selector ── */}
        <div className="space-y-2">
          <button
            onClick={() => setShowRefSelector((v) => !v)}
            className="w-full flex items-center justify-between bg-gray-900 border border-gray-700 hover:border-gray-600 rounded-xl px-4 py-3 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: info.color }} />
              <div className="text-left">
                <p className="text-sm font-bold text-white">{info.name}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">GWP {info.gwp.toLocaleString()}</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.bg} ${badge.text} ${badge.border}`}>
                {badge.label}
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showRefSelector ? "rotate-180" : ""}`} />
          </button>

          {showRefSelector && (
            <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
              {REF_GROUPS.map((group) => (
                <div key={group.label}>
                  <div className="px-4 py-2 border-b border-gray-800">
                    <p className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">{group.label}</p>
                  </div>
                  <div className="p-2 grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {group.refs.map((r) => {
                      const rInfo = REFRIGERANT_INFO[r];
                      const isActive = r === ref;
                      return (
                        <button
                          key={r}
                          onClick={() => { setRef(r); setShowRefSelector(false); resetInputs(); }}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all ${
                            isActive
                              ? "bg-blue-600/20 border border-blue-600/40 text-blue-300"
                              : "hover:bg-gray-800 text-gray-300 border border-transparent"
                          }`}
                        >
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: rInfo.color }} />
                          <span className="text-xs font-semibold leading-tight">{rInfo.id}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Refrigerant note */}
          {!showRefSelector && (
            <div className="flex gap-2 px-1">
              <Info className="w-3.5 h-3.5 text-gray-600 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-gray-600 leading-snug">{info.note}</p>
            </div>
          )}
        </div>

        {/* ── Metering Device ── */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Metering:</span>
          <div className="flex bg-gray-900 border border-gray-800 rounded-lg p-0.5 gap-0.5">
            {(["TXV", "orifice"] as const).map((d) => (
              <button
                key={d}
                onClick={() => setMeteringDevice(d)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                  meteringDevice === d
                    ? "bg-blue-600 text-white"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {d === "TXV" ? "TXV / EEV" : "Fixed Orifice"}
              </button>
            ))}
          </div>
        </div>

        {/* ── Input + Results Grid ── */}
        <div className="grid sm:grid-cols-2 gap-4">

          {/* Left: Measurements */}
          <div className="space-y-4">

            {/* Suction side */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-blue-950 flex items-center justify-center">
                  <ThermometerSnowflake className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <h2 className="text-sm font-bold text-white">Suction Side</h2>
                {satSuction !== null && (
                  <span className="ml-auto text-[11px] font-bold text-blue-400 bg-blue-950/50 border border-blue-800/40 rounded px-2 py-0.5">
                    Sat: {satSuction}°F
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider block mb-1">
                    Suction Pressure
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={suctionPSIG}
                      onChange={(e) => setSuctionPSIG(e.target.value)}
                      placeholder="0"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-700 focus:outline-none focus:border-blue-500 pr-12"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-600 font-bold">PSIG</span>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider block mb-1">
                    Suction Line Temp
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={suctionLineTemp}
                      onChange={(e) => setSuctionLineTemp(e.target.value)}
                      placeholder="0"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-700 focus:outline-none focus:border-blue-500 pr-8"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-600 font-bold">°F</span>
                  </div>
                </div>
              </div>

              {superheat !== null && (
                <div className="bg-gray-800/60 rounded-lg px-3 py-2 flex items-center justify-between">
                  <span className="text-xs text-gray-500 font-medium">Superheat</span>
                  <span className="text-sm font-bold" style={{ color: shInterp?.color ?? "#fff" }}>
                    {superheat}°F
                  </span>
                </div>
              )}
            </div>

            {/* Liquid side */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-orange-950 flex items-center justify-center">
                  <ThermometerSun className="w-3.5 h-3.5 text-orange-400" />
                </div>
                <h2 className="text-sm font-bold text-white">Liquid Side</h2>
                {satCondensing !== null && (
                  <span className="ml-auto text-[11px] font-bold text-orange-400 bg-orange-950/50 border border-orange-800/40 rounded px-2 py-0.5">
                    Sat: {satCondensing}°F
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider block mb-1">
                    Liquid Pressure
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={liquidPSIG}
                      onChange={(e) => setLiquidPSIG(e.target.value)}
                      placeholder="0"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-700 focus:outline-none focus:border-blue-500 pr-12"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-600 font-bold">PSIG</span>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider block mb-1">
                    Liquid Line Temp
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={liquidLineTemp}
                      onChange={(e) => setLiquidLineTemp(e.target.value)}
                      placeholder="0"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-700 focus:outline-none focus:border-blue-500 pr-8"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-600 font-bold">°F</span>
                  </div>
                </div>
              </div>

              {subcooling !== null && (
                <div className="bg-gray-800/60 rounded-lg px-3 py-2 flex items-center justify-between">
                  <span className="text-xs text-gray-500 font-medium">Subcooling</span>
                  <span className="text-sm font-bold" style={{ color: scInterp?.color ?? "#fff" }}>
                    {subcooling}°F
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Results */}
          <div className="space-y-4">

            {/* Superheat bar */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <ReadingBar
                label="Superheat"
                value={superheat}
                min={shBarMin}
                max={shBarMax}
                targetMin={shTargetMin}
                targetMax={shTargetMax}
                color={shInterp?.color ?? "#6b7280"}
                band={shInterp?.band ?? null}
                bandLabel={shInterp?.label ?? ""}
              />
            </div>

            {/* Subcooling bar */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <ReadingBar
                label="Subcooling"
                value={subcooling}
                min={scBarMin}
                max={scBarMax}
                targetMin={scInfo.min}
                targetMax={scInfo.max}
                color={scInterp?.color ?? "#6b7280"}
                band={scInterp?.band ?? null}
                bandLabel={scInterp?.label ?? ""}
              />
            </div>

            {/* Charge state */}
            <ChargeStateBadge {...chargeInterp} />

            {/* Target ranges reference */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
              <p className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Target Ranges — {ref}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-0.5">
                  <p className="text-[10px] text-gray-600">Superheat ({meteringDevice === "orifice" ? "Orifice" : "TXV"})</p>
                  <p className="text-sm font-bold text-white">{shTargetMin}–{shTargetMax}°F</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] text-gray-600">Subcooling</p>
                  <p className="text-sm font-bold text-white">{scInfo.min}–{scInfo.max}°F</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] text-gray-600">Typical Suction</p>
                  <p className="text-sm font-bold text-white">{info.typicalSuction.minPSIG}–{info.typicalSuction.maxPSIG} PSIG</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] text-gray-600">Typical Discharge</p>
                  <p className="text-sm font-bold text-white">{info.typicalDischarge.minPSIG}–{info.typicalDischarge.maxPSIG} PSIG</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── PT Lookup Table ── */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
            <Gauge className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-bold text-white">Pressure → Sat Temp Lookup</h2>
            <span className="text-xs text-gray-600 ml-1">({ref})</span>
          </div>
          <div className="p-4 space-y-2">
            <p className="text-[11px] text-gray-600 mb-3">Type a pressure reading to find the saturated temperature.</p>
            <div className="grid sm:grid-cols-2 gap-2">
              {[0, 1, 2, 3].map((i) => (
                <PTLookupRow key={i} ref={ref} />
              ))}
            </div>
          </div>
        </div>

        {/* ── Field Notes ── */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-bold text-white">Field Notes</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 text-xs text-gray-500 leading-relaxed">
            <div className="space-y-1">
              <p className="font-bold text-gray-400">Superheat = Suction Line Temp − Sat Suction Temp</p>
              <p>Measured at the suction service valve or near the compressor. High SH can indicate undercharge, restriction at metering, or low load. Low SH can mean overcharge or floodback.</p>
            </div>
            <div className="space-y-1">
              <p className="font-bold text-gray-400">Subcooling = Sat Condensing Temp − Liquid Line Temp</p>
              <p>Measured at the liquid line service valve or liquid service valve out of the condenser. Low SC = undercharge or liquid line restriction. High SC = overcharge or condenser problem.</p>
            </div>
            {ref === "R-407C" && (
              <div className="sm:col-span-2 bg-amber-950/30 border border-amber-800/30 rounded-lg p-3">
                <p className="font-bold text-amber-400">R-407C Temperature Glide Warning</p>
                <p className="text-amber-600 mt-0.5">R-407C has significant temperature glide (~9°F). Use bubble point pressure for subcooling and dew point pressure for superheat. Do not use the same pressure for both readings.</p>
              </div>
            )}
            {(ref === "R-454B" || ref === "R-32" || ref === "R-448A" || ref === "R-1234yf") && (
              <div className="sm:col-span-2 bg-orange-950/30 border border-orange-800/30 rounded-lg p-3">
                <p className="font-bold text-orange-400">A2L Safety</p>
                <p className="text-orange-600 mt-0.5">{ref} is an A2L (mildly flammable) refrigerant. Follow A2L handling protocols. No open flames, ensure adequate ventilation, and use A2L-rated tools and recovery equipment.</p>
              </div>
            )}
          </div>
        </div>

        {/* Safety notice */}
        <div className="flex gap-2.5 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-gray-600 leading-snug">
            <strong className="text-gray-500">Reference only.</strong> PT chart values are approximate and calibrated for field use. Always verify charge decisions against manufacturer service data. Refrigerant handling requires EPA Section 608 certification.
          </p>
        </div>

      </main>
    </div>
  );
}
