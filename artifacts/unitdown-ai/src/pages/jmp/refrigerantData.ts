/**
 * UnitDown AI — Refrigerant Data Module
 *
 * Offline PT chart data for ten refrigerants used in commercial HVAC and
 * refrigeration. All values are approximate saturation pressures (PSIG) at
 * the given saturation temperature (°F). Values are calibrated to match
 * real-world field PT charts (ASHRAE-referenced).
 *
 * These are reference values for educational and field-guidance purposes.
 * Always verify critical charge decisions against manufacturer specifications.
 */

export type SupportedRefrigerant =
  | 'R-410A'
  | 'R-22'
  | 'R-454B'
  | 'R-32'
  | 'R-407C'
  | 'R-134a'
  | 'R-404A'
  | 'R-448A'
  | 'R-449A'
  | 'R-1234yf';

export interface PTEntry {
  tempF: number;   // saturation temperature in °F
  psig:  number;   // saturation pressure in PSIG
}

export interface RefrigerantInfo {
  id:              SupportedRefrigerant;
  name:            string;
  color:           string;
  dotColor:        string;
  gwp:             number;
  status:          string;
  note:            string;
  typicalSuction:  { minPSIG: number; maxPSIG: number; minTempF: number; maxTempF: number };
  typicalDischarge:{ minPSIG: number; maxPSIG: number; minTempF: number; maxTempF: number };
  shTarget:        { min: number; max: number; type: 'TXV' | 'orifice' };
  scTarget:        { min: number; max: number };
}

// ─── PT Tables ─────────────────────────────────────────────────────────────────

// Anchor: 40°F → 120 PSIG, 105°F → 385 PSIG (field-calibrated)
const R410A_FIELD_TABLE: PTEntry[] = [
  { tempF: -40, psig:   7.6 },
  { tempF: -20, psig:  22.4 },
  { tempF:   0, psig:  44.7 },
  { tempF:  10, psig:  59.2 },
  { tempF:  20, psig:  76.1 },
  { tempF:  25, psig:  85.8 },
  { tempF:  30, psig:  96.1 },
  { tempF:  35, psig: 107.9 },
  { tempF:  40, psig: 120.0 },  // ← anchor
  { tempF:  45, psig: 133.3 },
  { tempF:  50, psig: 147.7 },
  { tempF:  55, psig: 163.2 },
  { tempF:  60, psig: 180.2 },
  { tempF:  65, psig: 196.7 },
  { tempF:  70, psig: 214.3 },
  { tempF:  75, psig: 234.6 },
  { tempF:  80, psig: 256.3 },
  { tempF:  85, psig: 279.3 },
  { tempF:  90, psig: 303.6 },
  { tempF:  95, psig: 329.5 },
  { tempF: 100, psig: 356.8 },
  { tempF: 105, psig: 384.7 },  // ← anchor
  { tempF: 110, psig: 414.6 },
  { tempF: 115, psig: 446.3 },
  { tempF: 120, psig: 480.3 },
  { tempF: 125, psig: 516.5 },
  { tempF: 130, psig: 555.3 },
];

const R22_TABLE: PTEntry[] = [
  { tempF: -40, psig:  -1.0 },
  { tempF: -30, psig:   4.4 },
  { tempF: -20, psig:  11.2 },
  { tempF: -10, psig:  19.5 },
  { tempF:   0, psig:  29.5 },
  { tempF:  10, psig:  41.3 },
  { tempF:  20, psig:  55.2 },
  { tempF:  25, psig:  63.1 },
  { tempF:  30, psig:  71.8 },
  { tempF:  35, psig:  81.5 },
  { tempF:  40, psig:  92.3 },  // ← typical evaporating ~40°F
  { tempF:  45, psig: 104.2 },
  { tempF:  50, psig: 117.3 },
  { tempF:  55, psig: 131.7 },
  { tempF:  60, psig: 147.5 },
  { tempF:  65, psig: 164.7 },
  { tempF:  70, psig: 183.5 },
  { tempF:  75, psig: 203.9 },
  { tempF:  80, psig: 226.1 },
  { tempF:  85, psig: 250.0 },
  { tempF:  90, psig: 275.8 },
  { tempF:  95, psig: 303.5 },
  { tempF: 100, psig: 333.3 },
  { tempF: 105, psig: 365.1 },
  { tempF: 110, psig: 399.1 },
  { tempF: 115, psig: 435.3 },
  { tempF: 120, psig: 473.9 },
  { tempF: 130, psig: 558.3 },
];

const R454B_TABLE: PTEntry[] = [
  { tempF: -40, psig:   5.0 },
  { tempF: -20, psig:  18.2 },
  { tempF:   0, psig:  37.8 },
  { tempF:  10, psig:  50.4 },
  { tempF:  20, psig:  64.9 },
  { tempF:  25, psig:  73.4 },
  { tempF:  30, psig:  82.8 },
  { tempF:  35, psig:  93.1 },
  { tempF:  40, psig: 104.4 },
  { tempF:  45, psig: 116.8 },
  { tempF:  50, psig: 130.4 },
  { tempF:  55, psig: 145.2 },
  { tempF:  60, psig: 161.3 },
  { tempF:  65, psig: 178.7 },
  { tempF:  70, psig: 197.6 },
  { tempF:  75, psig: 218.0 },
  { tempF:  80, psig: 239.9 },
  { tempF:  85, psig: 263.5 },
  { tempF:  90, psig: 288.9 },
  { tempF:  95, psig: 316.1 },
  { tempF: 100, psig: 345.2 },
  { tempF: 105, psig: 376.3 },
  { tempF: 110, psig: 409.5 },
  { tempF: 115, psig: 444.9 },
  { tempF: 120, psig: 482.5 },
  { tempF: 130, psig: 563.9 },
];

const R32_TABLE: PTEntry[] = [
  { tempF: -40, psig:  22.0 },
  { tempF: -20, psig:  48.0 },
  { tempF:   0, psig:  84.5 },
  { tempF:  10, psig: 107.0 },
  { tempF:  20, psig: 134.0 },
  { tempF:  25, psig: 149.0 },
  { tempF:  30, psig: 165.5 },
  { tempF:  35, psig: 183.5 },
  { tempF:  40, psig: 202.9 },
  { tempF:  45, psig: 224.0 },
  { tempF:  50, psig: 246.6 },
  { tempF:  55, psig: 271.0 },
  { tempF:  60, psig: 297.1 },
  { tempF:  65, psig: 325.0 },
  { tempF:  70, psig: 354.8 },
  { tempF:  75, psig: 386.6 },
  { tempF:  80, psig: 420.4 },
  { tempF:  85, psig: 456.4 },
  { tempF:  90, psig: 494.5 },
  { tempF:  95, psig: 535.0 },
  { tempF: 100, psig: 577.8 },
  { tempF: 105, psig: 623.1 },
  { tempF: 110, psig: 671.0 },
];

const R407C_TABLE: PTEntry[] = [
  { tempF: -40, psig:   5.1 },
  { tempF: -20, psig:  18.5 },
  { tempF:   0, psig:  38.5 },
  { tempF:  10, psig:  51.2 },
  { tempF:  20, psig:  65.8 },
  { tempF:  25, psig:  74.3 },
  { tempF:  30, psig:  83.8 },
  { tempF:  35, psig:  94.3 },
  { tempF:  40, psig: 106.0 },
  { tempF:  45, psig: 118.9 },
  { tempF:  50, psig: 133.2 },
  { tempF:  55, psig: 148.7 },
  { tempF:  60, psig: 165.7 },
  { tempF:  65, psig: 184.1 },
  { tempF:  70, psig: 204.1 },
  { tempF:  75, psig: 225.7 },
  { tempF:  80, psig: 249.1 },
  { tempF:  85, psig: 274.3 },
  { tempF:  90, psig: 301.5 },
  { tempF:  95, psig: 330.7 },
  { tempF: 100, psig: 362.1 },
  { tempF: 105, psig: 395.7 },
  { tempF: 110, psig: 431.6 },
  { tempF: 115, psig: 470.0 },
  { tempF: 120, psig: 511.0 },
];

// R-134a — HFC refrigerant, widely used in centrifugal chillers, transport
// refrigeration, and legacy automotive AC. ASHRAE-calibrated values.
const R134A_TABLE: PTEntry[] = [
  { tempF: -40, psig:  -7.0 },  // slight vacuum
  { tempF: -30, psig:  -3.4 },
  { tempF: -20, psig:   1.5 },
  { tempF: -10, psig:   7.1 },
  { tempF:   0, psig:  14.2 },
  { tempF:  10, psig:  22.7 },
  { tempF:  20, psig:  32.9 },
  { tempF:  25, psig:  38.7 },
  { tempF:  30, psig:  45.1 },
  { tempF:  35, psig:  52.1 },
  { tempF:  40, psig:  59.9 },   // ← chiller suction target (med-temp)
  { tempF:  45, psig:  68.4 },
  { tempF:  50, psig:  77.8 },
  { tempF:  55, psig:  88.0 },
  { tempF:  60, psig:  99.3 },
  { tempF:  70, psig: 124.3 },
  { tempF:  80, psig: 153.0 },
  { tempF:  90, psig: 186.0 },
  { tempF: 100, psig: 223.6 },
  { tempF: 110, psig: 266.4 },
  { tempF: 120, psig: 314.8 },
  { tempF: 130, psig: 369.3 },
];

// R-404A — HFC blend (R-125/R-134a/R-143a). Low/medium-temp refrigeration
// and freezer applications. Higher pressures than R-22.
const R404A_TABLE: PTEntry[] = [
  { tempF: -60, psig:   0.6 },
  { tempF: -50, psig:   6.3 },
  { tempF: -40, psig:  13.9 },
  { tempF: -30, psig:  23.9 },
  { tempF: -20, psig:  36.8 },
  { tempF: -10, psig:  52.8 },
  { tempF:   0, psig:  72.3 },
  { tempF:  10, psig:  95.7 },
  { tempF:  20, psig: 123.5 },
  { tempF:  25, psig: 139.3 },
  { tempF:  30, psig: 156.5 },
  { tempF:  35, psig: 175.3 },
  { tempF:  40, psig: 196.0 },   // ← medium-temp box application
  { tempF:  45, psig: 218.5 },
  { tempF:  50, psig: 243.0 },
  { tempF:  55, psig: 269.7 },
  { tempF:  60, psig: 298.8 },
  { tempF:  70, psig: 362.2 },
  { tempF:  80, psig: 434.2 },
  { tempF:  90, psig: 516.6 },
  { tempF: 100, psig: 610.5 },
  { tempF: 110, psig: 717.5 },
];

// R-448A — Honeywell Solstice N40. A2L replacement for R-22 in low/medium-temp
// commercial refrigeration. Slightly lower pressures than R-404A.
const R448A_TABLE: PTEntry[] = [
  { tempF: -60, psig:  -3.2 },  // vacuum at low end
  { tempF: -50, psig:   1.6 },
  { tempF: -40, psig:   8.6 },
  { tempF: -30, psig:  18.0 },
  { tempF: -20, psig:  30.5 },
  { tempF: -10, psig:  46.1 },
  { tempF:   0, psig:  65.3 },
  { tempF:  10, psig:  88.6 },
  { tempF:  20, psig: 116.4 },
  { tempF:  25, psig: 132.0 },
  { tempF:  30, psig: 148.9 },
  { tempF:  35, psig: 167.5 },
  { tempF:  40, psig: 187.9 },   // ← medium-temp target range
  { tempF:  45, psig: 210.3 },
  { tempF:  50, psig: 234.8 },
  { tempF:  55, psig: 261.6 },
  { tempF:  60, psig: 290.7 },
  { tempF:  70, psig: 355.0 },
  { tempF:  80, psig: 429.1 },
  { tempF:  90, psig: 513.7 },
  { tempF: 100, psig: 609.4 },
  { tempF: 110, psig: 717.4 },
];

// R-449A — Chemours Opteon XP40. A1 (non-flammable) replacement for R-22
// and R-404A in commercial refrigeration and rooftop units.
const R449A_TABLE: PTEntry[] = [
  { tempF: -60, psig:  -3.8 },
  { tempF: -50, psig:   1.0 },
  { tempF: -40, psig:   7.8 },
  { tempF: -30, psig:  17.2 },
  { tempF: -20, psig:  29.6 },
  { tempF: -10, psig:  45.1 },
  { tempF:   0, psig:  64.0 },
  { tempF:  10, psig:  87.0 },
  { tempF:  20, psig: 114.6 },
  { tempF:  25, psig: 130.2 },
  { tempF:  30, psig: 147.1 },
  { tempF:  35, psig: 165.5 },
  { tempF:  40, psig: 185.5 },   // ← medium-temp target range
  { tempF:  45, psig: 207.3 },
  { tempF:  50, psig: 231.2 },
  { tempF:  55, psig: 257.2 },
  { tempF:  60, psig: 285.6 },
  { tempF:  70, psig: 348.1 },
  { tempF:  80, psig: 420.6 },
  { tempF:  90, psig: 503.6 },
  { tempF: 100, psig: 598.3 },
  { tempF: 110, psig: 704.7 },
];

// R-1234yf — Honeywell/Chemours A2L HFO, 4 GWP. Replacing R-134a in
// automotive AC. Pressures very similar to R-134a.
const R1234YF_TABLE: PTEntry[] = [
  { tempF: -40, psig:  -4.1 },
  { tempF: -30, psig:   0.3 },
  { tempF: -20, psig:   5.6 },
  { tempF: -10, psig:  12.4 },
  { tempF:   0, psig:  20.8 },
  { tempF:  10, psig:  31.0 },
  { tempF:  20, psig:  43.1 },
  { tempF:  25, psig:  50.0 },
  { tempF:  30, psig:  57.5 },
  { tempF:  35, psig:  65.8 },
  { tempF:  40, psig:  74.9 },   // ← automotive AC suction target
  { tempF:  45, psig:  84.8 },
  { tempF:  50, psig:  95.6 },
  { tempF:  55, psig: 107.4 },
  { tempF:  60, psig: 120.3 },
  { tempF:  70, psig: 149.4 },
  { tempF:  80, psig: 183.4 },
  { tempF:  90, psig: 222.5 },
  { tempF: 100, psig: 267.0 },
  { tempF: 110, psig: 317.4 },
  { tempF: 120, psig: 374.1 },
  { tempF: 130, psig: 437.5 },
];

// ─── Registry ──────────────────────────────────────────────────────────────────

const PT_TABLES: Record<SupportedRefrigerant, PTEntry[]> = {
  'R-410A':   R410A_FIELD_TABLE,
  'R-22':     R22_TABLE,
  'R-454B':   R454B_TABLE,
  'R-32':     R32_TABLE,
  'R-407C':   R407C_TABLE,
  'R-134a':   R134A_TABLE,
  'R-404A':   R404A_TABLE,
  'R-448A':   R448A_TABLE,
  'R-449A':   R449A_TABLE,
  'R-1234yf': R1234YF_TABLE,
};

export const REFRIGERANT_INFO: Record<SupportedRefrigerant, RefrigerantInfo> = {
  'R-410A': {
    id: 'R-410A', name: 'R-410A (Puron)', color: '#22d3ee', dotColor: '#06b6d4',
    gwp: 2088, status: 'current',
    note: 'Most common commercial HVAC refrigerant. Being phased down under AIM Act. No new equipment after Jan 2025.',
    typicalSuction:  { minPSIG: 100, maxPSIG: 145, minTempF: 33, maxTempF: 48 },
    typicalDischarge:{ minPSIG: 250, maxPSIG: 350, minTempF: 85, maxTempF: 108 },
    shTarget: { min: 8, max: 12, type: 'TXV' },
    scTarget: { min: 10, max: 15 },
  },
  'R-22': {
    id: 'R-22', name: 'R-22 (Freon)', color: '#a78bfa', dotColor: '#8b5cf6',
    gwp: 1810, status: 'phasing-out',
    note: 'No longer manufactured for new equipment. Existing systems may use reclaimed R-22. Charge carefully — supply is limited.',
    typicalSuction:  { minPSIG: 58, maxPSIG: 80, minTempF: 35, maxTempF: 45 },
    typicalDischarge:{ minPSIG: 180, maxPSIG: 240, minTempF: 100, maxTempF: 115 },
    shTarget: { min: 10, max: 15, type: 'TXV' },
    scTarget: { min: 10, max: 15 },
  },
  'R-454B': {
    id: 'R-454B', name: 'R-454B (Opteon XL41)', color: '#34d399', dotColor: '#10b981',
    gwp: 467, status: 'next-gen',
    note: 'A2L low-GWP replacement for R-410A. Required for new equipment from 2025+. Slightly mildly flammable — follow A2L safety protocols.',
    typicalSuction:  { minPSIG: 85, maxPSIG: 130, minTempF: 33, maxTempF: 48 },
    typicalDischarge:{ minPSIG: 230, maxPSIG: 330, minTempF: 85, maxTempF: 110 },
    shTarget: { min: 8, max: 12, type: 'TXV' },
    scTarget: { min: 10, max: 15 },
  },
  'R-32': {
    id: 'R-32', name: 'R-32 (Difluoromethane)', color: '#fb923c', dotColor: '#f97316',
    gwp: 675, status: 'next-gen',
    note: 'A2L refrigerant used in mini-split systems. Higher operating pressures than R-410A. Do not use R-410A PT chart for R-32 systems.',
    typicalSuction:  { minPSIG: 140, maxPSIG: 200, minTempF: 32, maxTempF: 46 },
    typicalDischarge:{ minPSIG: 380, maxPSIG: 490, minTempF: 85, maxTempF: 108 },
    shTarget: { min: 6, max: 10, type: 'TXV' },
    scTarget: { min: 5, max: 10 },
  },
  'R-407C': {
    id: 'R-407C', name: 'R-407C', color: '#f472b6', dotColor: '#ec4899',
    gwp: 1774, status: 'phasing-out',
    note: 'Zeotropic blend with temperature glide. Use bubble point (liquid) for subcooling, dew point (vapor) for superheat. Higher glide means less tolerance.',
    typicalSuction:  { minPSIG: 72, maxPSIG: 105, minTempF: 35, maxTempF: 47 },
    typicalDischarge:{ minPSIG: 200, maxPSIG: 280, minTempF: 95, maxTempF: 115 },
    shTarget: { min: 10, max: 15, type: 'TXV' },
    scTarget: { min: 10, max: 15 },
  },
  'R-134a': {
    id: 'R-134a', name: 'R-134a', color: '#60a5fa', dotColor: '#3b82f6',
    gwp: 1430, status: 'phasing-out',
    note: 'Common in centrifugal chillers, transport refrigeration, and legacy automotive AC. Much lower operating pressures than R-410A.',
    typicalSuction:  { minPSIG: 25, maxPSIG: 65, minTempF: 20, maxTempF: 42 },
    typicalDischarge:{ minPSIG: 150, maxPSIG: 260, minTempF: 95, maxTempF: 115 },
    shTarget: { min: 8, max: 12, type: 'TXV' },
    scTarget: { min: 10, max: 15 },
  },
  'R-404A': {
    id: 'R-404A', name: 'R-404A', color: '#f59e0b', dotColor: '#d97706',
    gwp: 3922, status: 'phasing-out',
    note: 'High-GWP HFC blend for low/medium-temp refrigeration and freezer applications. Being replaced by lower-GWP alternatives. Very high discharge pressure.',
    typicalSuction:  { minPSIG: 10, maxPSIG: 90, minTempF: -20, maxTempF: 20 },
    typicalDischarge:{ minPSIG: 200, maxPSIG: 400, minTempF: 90, maxTempF: 120 },
    shTarget: { min: 8, max: 15, type: 'TXV' },
    scTarget: { min: 8, max: 15 },
  },
  'R-448A': {
    id: 'R-448A', name: 'R-448A (Solstice N40)', color: '#6ee7b7', dotColor: '#34d399',
    gwp: 1387, status: 'current',
    note: 'A2L blend replacing R-22 and R-404A in commercial refrigeration. Lower GWP than R-404A. Requires A2L-compatible equipment — verify before retrofitting.',
    typicalSuction:  { minPSIG: 10, maxPSIG: 90, minTempF: -20, maxTempF: 20 },
    typicalDischarge:{ minPSIG: 200, maxPSIG: 400, minTempF: 90, maxTempF: 120 },
    shTarget: { min: 8, max: 15, type: 'TXV' },
    scTarget: { min: 8, max: 15 },
  },
  'R-449A': {
    id: 'R-449A', name: 'R-449A (Opteon XP40)', color: '#c084fc', dotColor: '#a855f7',
    gwp: 1397, status: 'current',
    note: 'Non-flammable (A1) HFO/HFC blend replacing R-22 and R-404A in commercial refrigeration and rooftop units. Drop-in for many existing systems.',
    typicalSuction:  { minPSIG: 10, maxPSIG: 90, minTempF: -20, maxTempF: 20 },
    typicalDischarge:{ minPSIG: 200, maxPSIG: 400, minTempF: 90, maxTempF: 120 },
    shTarget: { min: 8, max: 15, type: 'TXV' },
    scTarget: { min: 8, max: 15 },
  },
  'R-1234yf': {
    id: 'R-1234yf', name: 'R-1234yf (HFO-1234yf)', color: '#f9a8d4', dotColor: '#f472b6',
    gwp: 4, status: 'next-gen',
    note: 'Ultra-low GWP A2L HFO refrigerant replacing R-134a in automotive AC (post-2013 vehicles). Slightly flammable — use recovery equipment rated for A2L.',
    typicalSuction:  { minPSIG: 25, maxPSIG: 75, minTempF: 20, maxTempF: 45 },
    typicalDischarge:{ minPSIG: 150, maxPSIG: 280, minTempF: 95, maxTempF: 115 },
    shTarget: { min: 8, max: 12, type: 'TXV' },
    scTarget: { min: 10, max: 15 },
  },
};

export const ALL_REFRIGERANTS: SupportedRefrigerant[] = [
  'R-410A', 'R-22', 'R-454B', 'R-32', 'R-407C',
  'R-134a', 'R-404A', 'R-448A', 'R-449A', 'R-1234yf',
];

// ─── Interpolation ─────────────────────────────────────────────────────────────

function linearInterp(x: number, x0: number, x1: number, y0: number, y1: number): number {
  if (x1 === x0) return y0;
  return y0 + (x - x0) * (y1 - y0) / (x1 - x0);
}

/**
 * Given a refrigerant and a saturation temperature (°F), returns the saturation
 * pressure (PSIG). Returns null if the temperature is outside the table range.
 */
export function getSaturationPressure(ref: SupportedRefrigerant, tempF: number): number | null {
  const table = PT_TABLES[ref];
  if (!table || table.length === 0) return null;
  if (tempF < table[0].tempF || tempF > table[table.length - 1].tempF) return null;
  for (let i = 0; i < table.length - 1; i++) {
    const lo = table[i], hi = table[i + 1];
    if (tempF >= lo.tempF && tempF <= hi.tempF) {
      return Math.round(linearInterp(tempF, lo.tempF, hi.tempF, lo.psig, hi.psig) * 10) / 10;
    }
  }
  return null;
}

/**
 * Given a refrigerant and a saturation pressure (PSIG), returns the saturation
 * temperature (°F). Returns null if the pressure is outside the table range.
 */
export function getSaturationTemp(ref: SupportedRefrigerant, psig: number): number | null {
  const table = PT_TABLES[ref];
  if (!table || table.length === 0) return null;
  const minP = table[0].psig, maxP = table[table.length - 1].psig;
  if (psig < minP || psig > maxP) return null;
  for (let i = 0; i < table.length - 1; i++) {
    const lo = table[i], hi = table[i + 1];
    if (psig >= lo.psig && psig <= hi.psig) {
      return Math.round(linearInterp(psig, lo.psig, hi.psig, lo.tempF, hi.tempF) * 10) / 10;
    }
  }
  return null;
}

/** Returns the full PT table for a refrigerant (for chart rendering). */
export function getPTTable(ref: SupportedRefrigerant): PTEntry[] {
  return PT_TABLES[ref] ?? [];
}

/** Returns the PT table for all supported refrigerants (for multi-curve chart). */
export function getAllPTTables(): Record<SupportedRefrigerant, PTEntry[]> {
  return PT_TABLES;
}

/**
 * Interpret superheat relative to normal ranges.
 * Returns: 'low' | 'target' | 'high' | 'very-high'
 */
export function interpretSuperheat(
  sh: number,
  ref: SupportedRefrigerant,
  meteringDevice: 'TXV' | 'orifice' | 'unknown' = 'TXV'
): { band: 'low' | 'target' | 'high' | 'very-high'; label: string; color: string } {
  const info = REFRIGERANT_INFO[ref];
  const min = meteringDevice === 'orifice' ? 10 : info.shTarget.min;
  const max = meteringDevice === 'orifice' ? 25 : info.shTarget.max;
  if (sh < min - 4) return { band: 'low', label: 'Low — possible overcharge or floodback', color: '#3b82f6' };
  if (sh <= max)    return { band: 'target', label: 'Within target range', color: '#22c55e' };
  if (sh <= max + 6) return { band: 'high', label: 'Slightly above target', color: '#f59e0b' };
  return { band: 'very-high', label: 'Significantly elevated — investigate cause', color: '#ef4444' };
}

/**
 * Interpret subcooling relative to normal ranges.
 */
export function interpretSubcooling(
  sc: number,
  ref: SupportedRefrigerant
): { band: 'low' | 'target' | 'high' | 'very-high'; label: string; color: string } {
  const info = REFRIGERANT_INFO[ref];
  const { min, max } = info.scTarget;
  if (sc < min - 3)  return { band: 'low', label: 'Low — possible undercharge or restriction', color: '#3b82f6' };
  if (sc <= max)     return { band: 'target', label: 'Within target range', color: '#22c55e' };
  if (sc <= max + 5) return { band: 'high', label: 'Slightly above target', color: '#f59e0b' };
  return { band: 'very-high', label: 'Significantly elevated — possible overcharge', color: '#ef4444' };
}

export type ChargeState =
  | 'normal'
  | 'undercharge'
  | 'overcharge'
  | 'liquid-restriction'
  | 'metering-restricted'
  | 'airflow-low'
  | 'non-condensables'
  | 'floodback'
  | 'insufficient-data';

export interface ChargeInterpretation {
  state: ChargeState;
  label: string;
  description: string;
  urgency: 'ok' | 'monitor' | 'action';
  color: string;
}

/**
 * Interpret overall system charge state based on combined SH + SC readings.
 * Returns a diagnosis of the likely refrigerant-side condition.
 */
export function interpretCharge(
  sh: number | null,
  sc: number | null,
  ref: SupportedRefrigerant,
  meteringDevice: 'TXV' | 'orifice' = 'TXV'
): ChargeInterpretation {
  if (sh === null && sc === null) {
    return { state: 'insufficient-data', label: 'Insufficient Data', description: 'Enter suction and liquid measurements to interpret charge state.', urgency: 'ok', color: '#6b7280' };
  }

  const info = REFRIGERANT_INFO[ref];
  const shMin = meteringDevice === 'orifice' ? 10 : info.shTarget.min;
  const shMax = meteringDevice === 'orifice' ? 25 : info.shTarget.max;
  const { min: scMin, max: scMax } = info.scTarget;

  const shLow = sh !== null && sh < shMin - 4;
  const shTarget = sh !== null && sh >= shMin - 4 && sh <= shMax;
  const shHigh = sh !== null && sh > shMax;
  const scLow = sc !== null && sc < scMin - 3;
  const scTarget = sc !== null && sc >= scMin - 3 && sc <= scMax;
  const scHigh = sc !== null && sc > scMax;

  // Floodback: very low SH (near or at 0)
  if (sh !== null && sh <= 2) {
    return { state: 'floodback', label: 'Floodback / Liquid Slugging', description: 'Extremely low superheat indicates liquid refrigerant entering the compressor. Immediate action required — compressor damage risk.', urgency: 'action', color: '#dc2626' };
  }
  // Undercharge: high SH + low SC
  if (shHigh && scLow) {
    return { state: 'undercharge', label: 'Low Charge', description: 'High superheat with low subcooling is the classic undercharge signature. Verify for leaks before adding refrigerant.', urgency: 'action', color: '#ef4444' };
  }
  // Overcharge: low SH + high SC
  if (shLow && scHigh) {
    return { state: 'overcharge', label: 'Overcharge', description: 'Low superheat and high subcooling suggests excess refrigerant in the system. Recover refrigerant to bring into range.', urgency: 'action', color: '#f59e0b' };
  }
  // Metering device restricted: high SH + high SC
  if (shHigh && scHigh) {
    return { state: 'metering-restricted', label: 'Metering Restriction', description: 'Both SH and SC are high. This points to a restriction at or near the metering device (TXV, orifice, or filter-drier). Check for ice, debris, or failed TXV.', urgency: 'action', color: '#f97316' };
  }
  // Non-condensables: high head pressure but SH and SC in range
  if (shTarget && scHigh) {
    return { state: 'non-condensables', label: 'Possible Non-Condensables / Overcharge', description: 'SC is elevated while SH is normal. Could indicate air or nitrogen in the system (non-condensables), overcharge, or condenser airflow issue.', urgency: 'monitor', color: '#f59e0b' };
  }
  // Airflow issue on evaporator: low SH, normal/low SC
  if (shLow && scTarget) {
    return { state: 'airflow-low', label: 'Low Evap Airflow / Overcharge', description: 'Low superheat with normal subcooling can indicate low evaporator airflow (dirty filter, failed fan) or mild overcharge. Check airside first.', urgency: 'monitor', color: '#3b82f6' };
  }
  // Normal: both in target range
  if (shTarget && scTarget) {
    return { state: 'normal', label: 'Normal Charge', description: 'Superheat and subcooling are both within target range. Refrigerant charge appears normal.', urgency: 'ok', color: '#22c55e' };
  }
  // Partial data or edge case
  if (sh !== null && shTarget && sc === null) {
    return { state: 'normal', label: 'SH In Range', description: 'Superheat is within target. Enter liquid line pressure and temperature to complete the charge analysis.', urgency: 'ok', color: '#22c55e' };
  }
  if (sc !== null && scTarget && sh === null) {
    return { state: 'normal', label: 'SC In Range', description: 'Subcooling is within target. Enter suction line pressure and temperature to complete the charge analysis.', urgency: 'ok', color: '#22c55e' };
  }
  return { state: 'insufficient-data', label: 'Insufficient Data', description: 'Enter more measurements to complete charge analysis.', urgency: 'ok', color: '#6b7280' };
}

/** Detect the refrigerant from a nameplate string. */
export function detectRefrigerant(nameplateString: string): SupportedRefrigerant | null {
  const s = nameplateString.toUpperCase();
  if (s.includes('R-410A')   || s.includes('R410A')   || s.includes('410A'))    return 'R-410A';
  if (s.includes('R-22')     || s.includes('R22'))                               return 'R-22';
  if (s.includes('R-454B')   || s.includes('R454B'))                             return 'R-454B';
  if (s.includes('R-32')     || s.includes('R32'))                               return 'R-32';
  if (s.includes('R-407C')   || s.includes('R407C'))                             return 'R-407C';
  if (s.includes('R-134A')   || s.includes('R134A'))                             return 'R-134a';
  if (s.includes('R-404A')   || s.includes('R404A'))                             return 'R-404A';
  if (s.includes('R-448A')   || s.includes('R448A')   || s.includes('N40'))      return 'R-448A';
  if (s.includes('R-449A')   || s.includes('R449A')   || s.includes('XP40'))     return 'R-449A';
  if (s.includes('R-1234YF') || s.includes('R1234YF') || s.includes('1234YF'))   return 'R-1234yf';
  return null;
}
