// ─── Types ────────────────────────────────────────────────────────────────────

export type ToolStatus   = 'loaded' | 'recommended' | 'missing';
export type ToolCategory = 'Electrical' | 'Refrigeration' | 'Airflow' | 'Combustion' | 'General';

export const ALL_TOOL_CATEGORIES: ToolCategory[] = [
  'Electrical', 'Refrigeration', 'Airflow', 'Combustion', 'General',
];

export interface ToolItem {
  id:             string;
  name:           string;
  category:       ToolCategory;
  status:         ToolStatus;
  requiredFor:    string[];   // tool is needed to do the job
  recommendedFor: string[];   // tool significantly helps
  note?:          string;     // brief description or reminder
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

const W = { missingRequired: 20, missingRecommended: 8 } as const;

export function computeToolsReadiness(tools: ToolItem[], jobId: string): number {
  let score = 100;
  for (const t of tools) {
    if (t.status !== 'missing') continue;
    if      (t.requiredFor.includes(jobId))    score -= W.missingRequired;
    else if (t.recommendedFor.includes(jobId)) score -= W.missingRecommended;
  }
  return Math.max(0, Math.min(100, score));
}

export function computeOverallToolsReadiness(tools: ToolItem[]): number {
  const s = computeToolsReadiness(tools, 'summit');
  const n = computeToolsReadiness(tools, 'northgate');
  const r = computeToolsReadiness(tools, 'ridgeline');
  return Math.round((s + n + r) / 3);
}

export function toolReadinessBadge(score: number): { label: string; color: string; dot: string } {
  if (score === 100) return { label: 'All Loaded',   color: 'text-green-400',  dot: '🟢' };
  if (score >= 85)   return { label: 'Ready',         color: 'text-green-400',  dot: '🟢' };
  if (score >= 65)   return { label: 'Missing Tools', color: 'text-yellow-400', dot: '🟡' };
  return                    { label: 'Not Ready',     color: 'text-red-400',    dot: '🔴' };
}

// ─── Tool list ────────────────────────────────────────────────────────────────

export const INITIAL_TOOLS: ToolItem[] = [

  // ── Electrical ───────────────────────────────────────────────────────────────
  {
    id: 'multimeter',
    name: 'Digital Multimeter',
    category: 'Electrical',
    status: 'loaded',
    requiredFor: ['summit', 'northgate', 'ridgeline'],
    recommendedFor: [],
    note: 'Voltage, resistance, and continuity. Required on every call.',
  },
  {
    id: 'clamp-meter',
    name: 'Clamp Meter',
    category: 'Electrical',
    status: 'loaded',
    requiredFor: ['summit', 'ridgeline'],
    recommendedFor: ['northgate'],
    note: 'Amp draw measurements. Required for motor and compressor checks.',
  },
  {
    id: 'meter-leads',
    name: 'Meter Leads + Probes',
    category: 'Electrical',
    status: 'loaded',
    requiredFor: [],
    recommendedFor: ['summit', 'northgate', 'ridgeline'],
    note: 'Confirm all leads are in good condition before departure.',
  },
  {
    id: 'fuse-jumper',
    name: '3A Fuse Jumper / Test Fuse',
    category: 'Electrical',
    status: 'loaded',
    requiredFor: [],
    recommendedFor: ['summit', 'northgate'],
    note: 'Used to isolate blown control fuses without sourcing a replacement.',
  },
  {
    id: 'control-screwdriver',
    name: 'Control Screwdriver Set',
    category: 'Electrical',
    status: 'loaded',
    requiredFor: [],
    recommendedFor: ['summit', 'northgate', 'ridgeline'],
    note: 'Insulated screwdrivers for control board and terminal work.',
  },

  // ── Refrigeration ─────────────────────────────────────────────────────────────
  {
    id: 'gauge-set',
    name: 'Refrigerant Gauge Set',
    category: 'Refrigeration',
    status: 'loaded',
    requiredFor: ['summit'],
    recommendedFor: [],
    note: 'Required for head pressure and suction diagnostics at RTU-3.',
  },
  {
    id: 'temp-clamps',
    name: 'Temperature Clamp Set',
    category: 'Refrigeration',
    status: 'loaded',
    requiredFor: [],
    recommendedFor: ['summit', 'ridgeline'],
    note: 'Line temperature for superheat and subcooling measurements.',
  },
  {
    id: 'vacuum-pump',
    name: 'Vacuum Pump (2-stage)',
    category: 'Refrigeration',
    status: 'loaded',
    requiredFor: [],
    recommendedFor: ['summit'],
    note: 'Required whenever a refrigerant circuit is opened.',
  },
  {
    id: 'recovery-machine',
    name: 'Recovery Machine',
    category: 'Refrigeration',
    status: 'loaded',
    requiredFor: [],
    recommendedFor: ['summit'],
    note: 'Required by EPA 608 before opening any refrigerant system.',
  },
  {
    id: 'recovery-cylinder',
    name: 'Recovery Cylinder',
    category: 'Refrigeration',
    status: 'loaded',
    requiredFor: [],
    recommendedFor: ['summit'],
    note: 'Check fill level — must be less than 80% full before use.',
  },
  {
    id: 'scale',
    name: 'Digital Scale',
    category: 'Refrigeration',
    status: 'loaded',
    requiredFor: [],
    recommendedFor: ['summit'],
    note: 'Required for accurate refrigerant charging by weight.',
  },
  {
    id: 'nitrogen-reg',
    name: 'Nitrogen Regulator + Hose Kit',
    category: 'Refrigeration',
    status: 'loaded',
    requiredFor: [],
    recommendedFor: ['summit'],
    note: 'Pressure testing and purging during brazed line work.',
  },
  {
    id: 'leak-detector',
    name: 'Electronic Leak Detector',
    category: 'Refrigeration',
    status: 'loaded',
    requiredFor: [],
    recommendedFor: ['summit'],
    note: 'Use to confirm leak-free connections after any refrigerant work.',
  },

  // ── Airflow ───────────────────────────────────────────────────────────────────
  {
    id: 'static-probes',
    name: 'Static Pressure Probes',
    category: 'Airflow',
    status: 'loaded',
    requiredFor: ['northgate', 'ridgeline'],
    recommendedFor: [],
    note: 'Required for CRAC and AHU static pressure readings during PM.',
  },
  {
    id: 'manometer',
    name: 'Manometer / Magnahelic',
    category: 'Airflow',
    status: 'loaded',
    requiredFor: ['northgate', 'ridgeline'],
    recommendedFor: [],
    note: 'Static differential pressure readings across filters and coils.',
  },
  {
    id: 'anemometer',
    name: 'Anemometer',
    category: 'Airflow',
    status: 'missing',
    requiredFor: [],
    recommendedFor: ['northgate', 'ridgeline'],
    note: 'Face velocity and airflow measurement — left in shop yesterday.',
  },
  {
    id: 'psychrometer',
    name: 'Psychrometer (RH + Temp)',
    category: 'Airflow',
    status: 'loaded',
    requiredFor: [],
    recommendedFor: ['northgate'],
    note: 'Relative humidity and wet-bulb readings for CRAC performance checks.',
  },

  // ── Combustion ────────────────────────────────────────────────────────────────
  {
    id: 'combustion-analyzer',
    name: 'Combustion Analyzer',
    category: 'Combustion',
    status: 'loaded',
    requiredFor: [],
    recommendedFor: [],
    note: 'CO, O2, and flue gas analysis on gas heating equipment.',
  },
  {
    id: 'gas-manometer',
    name: 'Gas Pressure Manometer',
    category: 'Combustion',
    status: 'loaded',
    requiredFor: [],
    recommendedFor: [],
    note: 'Measure gas supply and manifold pressure on furnaces and RTUs.',
  },
  {
    id: 'gas-pressure-kit',
    name: 'Gas Pressure Test Kit',
    category: 'Combustion',
    status: 'loaded',
    requiredFor: [],
    recommendedFor: [],
    note: 'Test fittings and hoses for gas pressure measurement.',
  },

  // ── General ───────────────────────────────────────────────────────────────────
  {
    id: 'impact-driver',
    name: 'Impact Driver + Bits',
    category: 'General',
    status: 'loaded',
    requiredFor: [],
    recommendedFor: ['summit', 'northgate', 'ridgeline'],
    note: 'Primary fastening tool. Confirm battery is charged.',
  },
  {
    id: 'hand-tools',
    name: 'Hand Tools Set',
    category: 'General',
    status: 'loaded',
    requiredFor: ['summit', 'northgate', 'ridgeline'],
    recommendedFor: [],
    note: 'Wrenches, pliers, nut drivers. Never leave the shop without these.',
  },
  {
    id: 'flashlight',
    name: 'Flashlight / Headlamp',
    category: 'General',
    status: 'loaded',
    requiredFor: ['summit', 'northgate', 'ridgeline'],
    recommendedFor: [],
    note: 'Mechanical rooms and rooftop work. Check battery level.',
  },
  {
    id: 'ladder',
    name: 'Ladder (6 ft + 10 ft)',
    category: 'General',
    status: 'loaded',
    requiredFor: ['summit', 'ridgeline'],
    recommendedFor: ['northgate'],
    note: 'Rooftop RTU and ceiling-mounted CRAC access.',
  },
  {
    id: 'extension-cord',
    name: 'Extension Cord (25 ft)',
    category: 'General',
    status: 'loaded',
    requiredFor: [],
    recommendedFor: ['summit', 'northgate', 'ridgeline'],
    note: 'Power for vacuum pump and recovery machine on rooftops.',
  },
  {
    id: 'ppe-kit',
    name: 'PPE Kit (glasses, gloves, respirator)',
    category: 'General',
    status: 'loaded',
    requiredFor: ['summit', 'northgate', 'ridgeline'],
    recommendedFor: [],
    note: 'N95 masks, nitrile gloves, and safety glasses. Required on all sites.',
  },
  {
    id: 'loto-kit',
    name: 'Lockout / Tagout Kit',
    category: 'General',
    status: 'loaded',
    requiredFor: ['summit', 'northgate', 'ridgeline'],
    recommendedFor: [],
    note: 'OSHA required. Confirm padlocks and tags are in the kit.',
  },
];

export const INITIAL_TOOLS_READINESS = computeOverallToolsReadiness(INITIAL_TOOLS);
