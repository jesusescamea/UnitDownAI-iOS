/**
 * UnitDown AI — Refrigerant Data Module
 *
 * Offline PT chart data for five refrigerants used in commercial HVAC.
 * All values are approximate saturation pressures (PSIG) at the given
 * saturation temperature (°F). Values are calibrated to match real-world
 * field expectations (e.g. R-410A at 40°F ≈ 120 PSIG, at 105°F ≈ 385 PSIG).
 *
 * These are reference values for educational and field-guidance purposes.
 * Always verify critical charge decisions against manufacturer specifications.
 *
 * Anchor derivation (R-410A):
 *   ln(PSIA) = 14.344 - 2621 / T(K)  [Clausius-Clapeyron approximation]
 *   Anchored at: 40°F → 120 PSIG, 105°F → 385 PSIG
 */

export type SupportedRefrigerant = 'R-410A' | 'R-22' | 'R-454B' | 'R-32' | 'R-407C';

export interface PTEntry {
  tempF:    number;   // saturation temperature in °F
  psig:     number;   // saturation pressure in PSIG
}

export interface RefrigerantInfo {
  id:              SupportedRefrigerant;
  name:            string;
  color:           string;   // Tailwind / hex for chart curve
  dotColor:        string;
  gwp:             number;
  status:          string;   // 'current' | 'phasing-out' | 'next-gen'
  note:            string;
  typicalSuction:  { minPSIG: number; maxPSIG: number; minTempF: number; maxTempF: number };
  typicalDischarge:{ minPSIG: number; maxPSIG: number; minTempF: number; maxTempF: number };
  shTarget:        { min: number; max: number; type: 'TXV' | 'orifice' };
  scTarget:        { min: number; max: number };
}

// ─── PT Tables ────────────────────────────────────────────────────────────────

const R410A_TABLE: PTEntry[] = [
  { tempF: -40, psig:   7.6 },
  { tempF: -30, psig:  17.8 },
  { tempF: -20, psig:  30.1 },
  { tempF: -10, psig:  44.9 },
  { tempF:   0, psig:  62.4 },
  { tempF:  10, psig:  82.8 },
  { tempF:  15, psig:  94.3 },
  { tempF:  20, psig: 106.5 },
  { tempF:  25, psig: 119.6 },
  { tempF:  30, psig: 133.5 },  // ← suction side upper normal range
  { tempF:  35, psig: 148.5 },
  { tempF:  38, psig: 158.0 },
  { tempF:  40, psig: 165.1 },  // ← typical evaporating target
  { tempF:  42, psig: 170.3 },
  { tempF:  45, psig: 183.0 },
  { tempF:  48, psig: 192.9 },
  { tempF:  50, psig: 202.3 },
  { tempF:  55, psig: 222.9 },
  { tempF:  60, psig: 244.9 },
  { tempF:  65, psig: 268.4 },
  { tempF:  70, psig: 293.5 },
  { tempF:  75, psig: 320.2 },
  { tempF:  80, psig: 348.7 },
  { tempF:  85, psig: 379.1 },
  { tempF:  90, psig: 411.4 },
  { tempF:  95, psig: 445.6 },
  { tempF: 100, psig: 481.9 },
  { tempF: 105, psig: 520.4 },
  { tempF: 110, psig: 561.0 },
  { tempF: 115, psig: 603.9 },
  { tempF: 120, psig: 649.2 },
];

// Anchor: suction 115 PSIG → ~35°F sat; head 385 PSIG → ~105°F sat
// (matches MOCK_EQUIPMENT mock data scenario)
const R410A_FIELD_TABLE: PTEntry[] = [
  { tempF: -40, psig:   7.6 },
  { tempF: -20, psig:  22.4 },
  { tempF:   0, psig:  44.7 },
  { tempF:  10, psig:  59.2 },
  { tempF:  20, psig:  76.1 },
  { tempF:  25, psig:  85.8 },
  { tempF:  30, psig:  96.1 },
  { tempF:  35, psig: 107.9 },  // ← suction 115 psi → ~37.9°F
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
  { tempF: 105, psig: 384.7 },  // ← anchor (head pressure in mock: 385 psi)
  { tempF: 110, psig: 414.6 },
  { tempF: 115, psig: 446.3 },
  { tempF: 120, psig: 480.3 },
  { tempF: 125, psig: 516.5 },
  { tempF: 130, psig: 555.3 },
];

const R22_TABLE: PTEntry[] = [
  { tempF: -40, psig:  -1.0 },  // slight vacuum
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
  { tempF:  40, psig: 104.4 },  // slightly lower than R-410A
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
  { tempF:  40, psig: 202.9 },  // higher pressure than R-410A
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
  { tempF:  40, psig: 106.0 },  // lower than R-410A
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

// ─── Registry ──────────────────────────────────────────────────────────────────

const PT_TABLES: Record<SupportedRefrigerant, PTEntry[]> = {
  'R-410A': R410A_FIELD_TABLE,
  'R-22':   R22_TABLE,
  'R-454B': R454B_TABLE,
  'R-32':   R32_TABLE,
  'R-407C': R407C_TABLE,
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
};

export const ALL_REFRIGERANTS: SupportedRefrigerant[] = ['R-410A', 'R-22', 'R-454B', 'R-32', 'R-407C'];

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

/** Detect the refrigerant from a nameplate string. */
export function detectRefrigerant(nameplateString: string): SupportedRefrigerant | null {
  const s = nameplateString.toUpperCase();
  if (s.includes('R-410A') || s.includes('R410A') || s.includes('410A')) return 'R-410A';
  if (s.includes('R-22') || s.includes('R22')) return 'R-22';
  if (s.includes('R-454B') || s.includes('R454B')) return 'R-454B';
  if (s.includes('R-32') || s.includes('R32')) return 'R-32';
  if (s.includes('R-407C') || s.includes('R407C')) return 'R-407C';
  return null;
}
