// ─── Types ────────────────────────────────────────────────────────────────────

export type ItemStatus   = 'ready' | 'low' | 'missing';
export type ItemPriority = 'required' | 'recommended' | 'nice' | 'none';

export type ItemCategory =
  | 'Refrigerant' | 'Capacitors' | 'Contactors' | 'Motors' | 'Fan Blades'
  | 'Bearings'    | 'Belts'      | 'Filters'    | 'Fuses'  | 'Chemicals'
  | 'Controls'    | 'Tools'      | 'Test Instruments' | 'PPE' | 'Miscellaneous';

export const ALL_CATEGORIES: ItemCategory[] = [
  'Refrigerant', 'Capacitors', 'Contactors', 'Motors', 'Fan Blades',
  'Bearings',    'Belts',      'Filters',    'Fuses',  'Chemicals',
  'Controls',    'Tools',      'Test Instruments', 'PPE', 'Miscellaneous',
];

export interface UsageRecord {
  date: string;
  qty:  number;
  site: string;
}

export interface SubstituteItem {
  name:       string;
  compatible: boolean;
  note:       string;
}

export interface InventoryItem {
  id:            string;
  name:          string;
  category:      ItemCategory;
  qty:           number;
  minQty:        number;
  unit:          string;
  requiredFor:   string[];   // job cannot be completed without this
  recommendedFor: string[];  // strongly reduces return-trip risk
  niceToHaveFor: string[];   // minor benefit, optional
  lastUsed?:     string;
  usagePattern?: string;
  aiRec?:        string;
  substitutes?:  SubstituteItem[];
  usageHistory?: UsageRecord[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function itemStatus(item: InventoryItem): ItemStatus {
  if (item.qty === 0)          return 'missing';
  if (item.qty < item.minQty) return 'low';
  return 'ready';
}

export function itemHighestPriority(item: InventoryItem, jobIds: string[]): ItemPriority {
  for (const j of jobIds) if (item.requiredFor.includes(j))   return 'required';
  for (const j of jobIds) if (item.recommendedFor.includes(j)) return 'recommended';
  for (const j of jobIds) if (item.niceToHaveFor.includes(j)) return 'nice';
  return 'none';
}

export function aiLearningNote(item: InventoryItem): string | null {
  const h = item.usageHistory;
  if (!h || h.length === 0) return null;
  const total = h.reduce((s, r) => s + r.qty, 0);
  const sites = [...new Set(h.map(r => r.site))];
  if (total >= 6)
    return `High-use item: ${total} units used across ${h.length} recent visits. AI recommends carrying ${item.minQty + 2}+.`;
  if (total >= 3)
    return `Recurring use: ${total} units used in the last ${h.length} visits${sites.length === 1 ? ` — all at ${sites[0]}` : ''}. Consider carrying extra.`;
  if (total >= 2)
    return `Used on ${h.length} recent visits. Monitor stock closely.`;
  return null;
}

// ─── Scoring weights ──────────────────────────────────────────────────────────

const W = {
  missingRequired:    15,
  lowRequired:         7,
  missingRecommended:  5,
  lowRecommended:      2,
  missingNice:         2,
  lowNice:             1,
} as const;

export function computeJobReadiness(inventory: InventoryItem[], jobId: string): number {
  let score = 100;
  for (const item of inventory) {
    const s = itemStatus(item);
    if      (item.requiredFor.includes(jobId))   {
      if (s === 'missing') score -= W.missingRequired;
      else if (s === 'low') score -= W.lowRequired;
    } else if (item.recommendedFor.includes(jobId)) {
      if (s === 'missing') score -= W.missingRecommended;
      else if (s === 'low') score -= W.lowRecommended;
    } else if (item.niceToHaveFor.includes(jobId)) {
      if (s === 'missing') score -= W.missingNice;
      else if (s === 'low') score -= W.lowNice;
    }
  }
  return Math.max(0, Math.min(100, score));
}

export function computeOverallReadiness(inventory: InventoryItem[]): number {
  const s = computeJobReadiness(inventory, 'summit');
  const n = computeJobReadiness(inventory, 'northgate');
  const r = computeJobReadiness(inventory, 'ridgeline');
  return Math.round((s + n + r) / 3);
}

// ─── Confidence score label ───────────────────────────────────────────────────

export function readinessBadge(score: number): {
  label: string; sublabel: string; color: string; dot: string; ring: string;
} {
  if (score === 100) return {
    label: 'Fully Stocked', sublabel: 'All required & recommended items loaded',
    color: 'text-green-400', dot: '🟢', ring: '#22c55e',
  };
  if (score >= 90) return {
    label: 'Ready', sublabel: 'Minor recommended items low',
    color: 'text-green-400', dot: '🟢', ring: '#22c55e',
  };
  if (score >= 80) return {
    label: 'Mostly Ready', sublabel: 'Missing some recommended items',
    color: 'text-yellow-400', dot: '🟡', ring: '#eab308',
  };
  if (score >= 65) return {
    label: 'At Risk', sublabel: 'Missing required parts for one or more jobs',
    color: 'text-orange-400', dot: '🟡', ring: '#f97316',
  };
  if (score >= 50) return {
    label: 'High Return Risk', sublabel: 'Multiple critical items missing',
    color: 'text-red-400', dot: '🔴', ring: '#ef4444',
  };
  return {
    label: 'Not Ready', sublabel: 'Do not dispatch without restocking',
    color: 'text-red-500', dot: '🔴', ring: '#dc2626',
  };
}

// ─── Job info ─────────────────────────────────────────────────────────────────

export const JOB_INFO: Record<string, { name: string; abbr: string; dotColor: string }> = {
  summit:    { name: 'Summit Medical Plaza',  abbr: 'Summit Medical', dotColor: 'bg-red-500'   },
  northgate: { name: 'Northgate Data Center', abbr: 'Northgate',      dotColor: 'bg-blue-500'  },
  ridgeline: { name: 'Ridgeline Office Park', abbr: 'Ridgeline',      dotColor: 'bg-green-500' },
};

export const TODAY_JOB_IDS: Record<string, string> = {
  'JM-2026-0047': 'summit',
  'PM-2026-0148': 'northgate',
  'PM-2026-0149': 'ridgeline',
};

export function getJobVanId(jobId: string): string {
  return TODAY_JOB_IDS[jobId] ?? jobId;
}

const TODAY_VAN_JOBS = ['summit', 'northgate', 'ridgeline'];

// ─── AI route comparison ──────────────────────────────────────────────────────

export interface RouteComparison {
  status:               'ready' | 'risk' | 'incomplete';
  headline:             string;
  body:                 string;
  missingRequired:      Array<{ item: InventoryItem; jobs: string[] }>;
  missingRecommended:   Array<{ item: InventoryItem; jobs: string[] }>;
  lowRequired:          Array<{ item: InventoryItem; jobs: string[] }>;
}

export function aiRouteComparison(inventory: InventoryItem[]): RouteComparison {
  const missingRequired:    Array<{ item: InventoryItem; jobs: string[] }> = [];
  const missingRecommended: Array<{ item: InventoryItem; jobs: string[] }> = [];
  const lowRequired:        Array<{ item: InventoryItem; jobs: string[] }> = [];

  for (const item of inventory) {
    const s = itemStatus(item);
    const reqJobs  = TODAY_VAN_JOBS.filter(j => item.requiredFor.includes(j));
    const recJobs  = TODAY_VAN_JOBS.filter(j => item.recommendedFor.includes(j));

    if (reqJobs.length > 0) {
      if (s === 'missing') missingRequired.push({ item, jobs: reqJobs });
      else if (s === 'low') lowRequired.push({ item, jobs: reqJobs });
    }
    if (recJobs.length > 0 && s === 'missing') {
      missingRecommended.push({ item, jobs: recJobs });
    }
  }

  if (missingRequired.length === 0 && lowRequired.length === 0 && missingRecommended.length === 0) {
    return {
      status: 'ready',
      headline: 'You have everything required.',
      body: "Truck is fully loaded for today's route. Good to go.",
      missingRequired, missingRecommended, lowRequired,
    };
  }

  const parts: string[] = [];
  if (missingRequired.length > 0) {
    const names = missingRequired.map(r => r.item.name).join(', ');
    parts.push(`Missing required: ${names}.`);
  }
  if (lowRequired.length > 0) {
    const names = lowRequired.map(r => `${r.item.name} (${r.item.qty}/${r.item.minQty})`).join(', ');
    parts.push(`Low stock on required items: ${names}.`);
  }
  if (missingRecommended.length > 0) {
    const names = missingRecommended.map(r => r.item.name).join(', ');
    parts.push(`Missing recommended: ${names}.`);
  }
  if (missingRequired.length > 0) parts.push('Stop at the supply house before your first call.');

  return {
    status: missingRequired.length > 0 ? 'incomplete' : 'risk',
    headline: missingRequired.length > 0
      ? `You are missing ${missingRequired.length} required item${missingRequired.length !== 1 ? 's' : ''}.`
      : `${missingRecommended.length + lowRequired.length} recommended item${(missingRecommended.length + lowRequired.length) !== 1 ? 's' : ''} low or missing.`,
    body: parts.join(' '),
    missingRequired, missingRecommended, lowRequired,
  };
}

// ─── AI day brief stock list ──────────────────────────────────────────────────

export const AI_STOCK_LIST: {
  item: string; reason: string; ok: 'ready' | 'low' | 'missing';
}[] = [
  { item: 'Foam Coil Cleaner',        reason: 'Summit Medical condenser cleaning',           ok: 'ready'   },
  { item: 'Refrigerant Gauge Set',    reason: 'RTU-3 head pressure diagnostics',             ok: 'ready'   },
  { item: 'R-410A (full cylinder)',   reason: 'Potential charge work at Summit',             ok: 'low'     },
  { item: 'Humidifier Canister',      reason: 'Northgate CRAC-3 scheduled PM',               ok: 'missing' },
  { item: 'Static Pressure Probes',  reason: 'Northgate + Ridgeline PM checks',             ok: 'ready'   },
  { item: '35/5 Dual Capacitor (×2)', reason: 'RTU-3 repeated capacitor history',            ok: 'low'     },
  { item: 'Belt A-40',               reason: 'AHU-5 belt inspection at Ridgeline',          ok: 'ready'   },
  { item: '3A Control Fuses (×10)',  reason: 'Common on all three sites — stock is empty',  ok: 'missing' },
  { item: 'Condenser Fan Motor',     reason: 'RTU-3 suspected root cause — avoid return',  ok: 'missing' },
];

// ─── Inventory items ──────────────────────────────────────────────────────────

export const INITIAL_INVENTORY: InventoryItem[] = [

  // ── Refrigerant ──────────────────────────────────────────────────────────────
  {
    id: 'r410a', name: 'R-410A Refrigerant',
    category: 'Refrigerant', qty: 1, minQty: 2, unit: 'cylinder',
    requiredFor: ['summit'], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 26', usagePattern: 'Used on most refrigerant calls',
    aiRec: 'Summit Medical has high-pressure history — carry a full cylinder for potential charge work.',
    substitutes: [{ name: 'R-454B (Puron Advance)', compatible: false, note: 'Not interchangeable — different pressure ratings. Do not mix.' }],
    usageHistory: [
      { date: 'Jun 26', qty: 1, site: 'Summit Medical Plaza' },
      { date: 'Jun 12', qty: 1, site: 'Westfield Office Tower' },
      { date: 'May 30', qty: 1, site: 'Summit Medical Plaza' },
    ],
  },
  {
    id: 'r22', name: 'R-22 Refrigerant (recovery only)',
    category: 'Refrigerant', qty: 1, minQty: 1, unit: 'cylinder',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 10', usagePattern: 'Legacy equipment recovery only',
    aiRec: 'Recovery only — cannot be re-used for recharging per EPA 608.',
  },
  {
    id: 'r407c', name: 'R-407C Refrigerant',
    category: 'Refrigerant', qty: 0, minQty: 1, unit: 'cylinder',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 3', usagePattern: 'R-22 replacement retrofit work',
    aiRec: 'Out of stock. Add to restock if R-22 retrofit work is scheduled.',
  },
  {
    id: 'r134a', name: 'R-134a Refrigerant',
    category: 'Refrigerant', qty: 1, minQty: 1, unit: 'cylinder',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'May 28', usagePattern: 'Chiller and specialty equipment',
    aiRec: 'Stocked. No chiller work scheduled today.',
  },

  // ── Capacitors ───────────────────────────────────────────────────────────────
  {
    id: 'cap-35-5', name: '35/5 MFD Dual Run Capacitor',
    category: 'Capacitors', qty: 1, minQty: 2, unit: 'each',
    requiredFor: [], recommendedFor: ['summit'], niceToHaveFor: [],
    lastUsed: 'Jun 26', usagePattern: 'Replaced 4 this month',
    aiRec: 'Summit Medical RTU-3 has repeated Code 82. Condenser fan capacitor is the primary suspect. Carry at least two.',
    substitutes: [{ name: '40/5 MFD Dual Run', compatible: false, note: 'Different rating — do not substitute unless confirmed by equipment nameplate.' }],
    usageHistory: [
      { date: 'Jun 26', qty: 1, site: 'Summit Medical Plaza' },
      { date: 'Jun 18', qty: 1, site: 'Summit Medical Plaza' },
      { date: 'Jun 10', qty: 1, site: 'Parkway Clinic' },
      { date: 'Jun 4',  qty: 1, site: 'Summit Medical Plaza' },
      { date: 'May 27', qty: 1, site: 'Northgate Data Center' },
    ],
  },
  {
    id: 'cap-45-5', name: '45/5 MFD Dual Run Capacitor',
    category: 'Capacitors', qty: 2, minQty: 2, unit: 'each',
    requiredFor: [], recommendedFor: [], niceToHaveFor: ['summit'],
    lastUsed: 'Jun 24', usagePattern: 'Average 1–2 per week',
    aiRec: 'Good stock.',
    usageHistory: [
      { date: 'Jun 24', qty: 1, site: 'Ridgeline Office Park' },
      { date: 'Jun 15', qty: 1, site: 'Westfield Office Tower' },
    ],
  },
  {
    id: 'cap-40-5', name: '40/5 MFD Dual Run Capacitor',
    category: 'Capacitors', qty: 1, minQty: 2, unit: 'each',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 19', usagePattern: 'Common on mid-size rooftop units',
    aiRec: 'Below minimum. Restock before next PM cycle.',
  },
  {
    id: 'cap-50-7', name: '50/7.5 MFD Dual Run Capacitor',
    category: 'Capacitors', qty: 2, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 15', usagePattern: 'Larger compressors',
    aiRec: 'Stock is adequate.',
  },
  {
    id: 'cap-30-5', name: '30/5 MFD Dual Run Capacitor',
    category: 'Capacitors', qty: 0, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 8', usagePattern: 'Smaller split systems',
    aiRec: 'Out of stock.',
  },
  {
    id: 'cap-5mfd', name: '5 MFD Run Capacitor',
    category: 'Capacitors', qty: 3, minQty: 2, unit: 'each',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 22', usagePattern: 'Condenser fan motor-only capacitor',
    aiRec: 'Adequate stock.',
  },

  // ── Contactors ───────────────────────────────────────────────────────────────
  {
    id: 'contactor-30a', name: '2-Pole 30A Contactor',
    category: 'Contactors', qty: 1, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: ['summit'], niceToHaveFor: [],
    lastUsed: 'Jun 21', usagePattern: 'Most common size',
    aiRec: 'RTU-3 contactor history shows arcing. Replacement likely today.',
    usageHistory: [
      { date: 'Jun 21', qty: 1, site: 'Summit Medical Plaza' },
      { date: 'Jun 8',  qty: 1, site: 'Ridgeline Office Park' },
      { date: 'May 30', qty: 1, site: 'Summit Medical Plaza' },
    ],
  },
  {
    id: 'contactor-40a', name: '3-Pole 40A Contactor',
    category: 'Contactors', qty: 0, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: ['summit'], niceToHaveFor: [],
    lastUsed: 'Jun 12', usagePattern: 'Compressor-side replacement',
    aiRec: 'Out of stock. Consider restocking before the Summit Medical call.',
    substitutes: [{ name: '3-Pole 40A Heavy-Duty Contactor', compatible: true, note: 'Confirm coil voltage matches (24V typical). Physically interchangeable.' }],
  },
  {
    id: 'contactor-40a-2p', name: '2-Pole 40A Contactor',
    category: 'Contactors', qty: 1, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 5', usagePattern: 'Larger single-phase compressors',
    aiRec: 'One on hand — adequate.',
  },
  {
    id: 'contactor-25a', name: '3-Pole 25A Contactor',
    category: 'Contactors', qty: 2, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: ['ridgeline'], niceToHaveFor: [],
    lastUsed: 'Jun 16', usagePattern: 'AHU compressor and control circuits',
    aiRec: 'Good stock.',
  },

  // ── Motors ────────────────────────────────────────────────────────────────────
  {
    id: 'motor-cond-fan', name: 'Condenser Fan Motor 1/3 HP',
    category: 'Motors', qty: 0, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: ['summit'], niceToHaveFor: [],
    lastUsed: 'Jun 10', usagePattern: 'High-demand in summer',
    aiRec: 'RTU-3 condenser fan is a suspected root cause of Code 82. Carrying a motor avoids a return trip.',
  },
  {
    id: 'motor-cond-quarter', name: 'Condenser Fan Motor 1/4 HP',
    category: 'Motors', qty: 1, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 6', usagePattern: 'Smaller condensing units',
    aiRec: 'One on hand.',
  },
  {
    id: 'motor-blower', name: 'Blower Motor 1/3 HP PSC',
    category: 'Motors', qty: 0, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: ['ridgeline'], niceToHaveFor: [],
    lastUsed: 'Jun 2', usagePattern: 'AHU blower replacement',
    aiRec: 'Out of stock. AHU-5 vibration trend could lead to motor replacement.',
  },

  // ── Fan Blades ────────────────────────────────────────────────────────────────
  {
    id: 'fan-blade-18', name: 'Condenser Fan Blade 18"',
    category: 'Fan Blades', qty: 1, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: ['summit'], niceToHaveFor: [],
    lastUsed: 'Jun 4', usagePattern: 'RTU condenser replacement',
    aiRec: 'Check blade condition during RTU-3 condenser fan inspection.',
  },
  {
    id: 'fan-blade-20', name: 'Condenser Fan Blade 20"',
    category: 'Fan Blades', qty: 0, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'May 30', usagePattern: 'Larger RTU condenser',
    aiRec: 'Out of stock.',
    substitutes: [{ name: '18" blade + spacer kit', compatible: false, note: 'Airflow will differ — only use as emergency measure pending correct part.' }],
  },
  {
    id: 'fan-blade-22', name: 'Condenser Fan Blade 22"',
    category: 'Fan Blades', qty: 1, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 1', usagePattern: 'Large commercial RTU',
    aiRec: 'One on hand.',
  },

  // ── Bearings ──────────────────────────────────────────────────────────────────
  {
    id: 'bearing-half', name: 'Pillow Block Bearing 1/2" bore',
    category: 'Bearings', qty: 2, minQty: 2, unit: 'each',
    requiredFor: ['ridgeline'], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 18', usagePattern: 'AHU shaft bearing replacement',
    aiRec: 'AHU-5 vibration trend indicates bearing wear. Carry at least two.',
    usageHistory: [
      { date: 'Jun 18', qty: 2, site: 'Ridgeline Office Park' },
      { date: 'May 22', qty: 2, site: 'Ridgeline Office Park' },
    ],
  },
  {
    id: 'bearing-five-eighths', name: 'Pillow Block Bearing 5/8" bore',
    category: 'Bearings', qty: 1, minQty: 2, unit: 'each',
    requiredFor: [], recommendedFor: ['ridgeline'], niceToHaveFor: [],
    lastUsed: 'Jun 11', usagePattern: 'Larger AHU bearing',
    aiRec: 'Below minimum.',
  },
  {
    id: 'bearing-6204', name: 'Ball Bearing 6204 Standard',
    category: 'Bearings', qty: 2, minQty: 2, unit: 'each',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 9', usagePattern: 'Fan motor and pump bearings',
    aiRec: 'Good stock.',
  },

  // ── Belts ─────────────────────────────────────────────────────────────────────
  {
    id: 'belt-a40', name: 'Belt A-40',
    category: 'Belts', qty: 2, minQty: 1, unit: 'each',
    requiredFor: ['ridgeline'], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 20', usagePattern: 'Standard AHU belt',
    aiRec: 'Confirmed belt size for AHU-5 at Ridgeline — stocked and ready.',
    usageHistory: [
      { date: 'Jun 20', qty: 1, site: 'Ridgeline Office Park' },
      { date: 'May 22', qty: 1, site: 'Ridgeline Office Park' },
      { date: 'Apr 15', qty: 1, site: 'Ridgeline Office Park' },
    ],
  },
  {
    id: 'belt-b52', name: 'Belt B-52',
    category: 'Belts', qty: 0, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: ['ridgeline'], niceToHaveFor: [],
    lastUsed: 'Jun 5', usagePattern: 'Larger AHU belt',
    aiRec: 'Carry as backup for Ridgeline — belt size confirmed on previous visit.',
    substitutes: [
      { name: 'Belt B-54 (2" longer)', compatible: false, note: 'Too long — will slip or not tension properly.' },
      { name: 'Belt B-51 (1" shorter)', compatible: false, note: 'Too short — may not fit over sheaves.' },
    ],
  },
  {
    id: 'belt-a38', name: 'Belt A-38',
    category: 'Belts', qty: 1, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 14', usagePattern: 'Slightly shorter A-section belt',
    aiRec: 'One on hand.',
  },
  {
    id: 'belt-a42', name: 'Belt A-42',
    category: 'Belts', qty: 0, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 7', usagePattern: 'Slightly longer A-section belt',
    aiRec: 'Out of stock.',
    substitutes: [{ name: 'Belt A-40', compatible: false, note: 'Close but shorter — confirm sheave center distance before using.' }],
  },
  {
    id: 'belt-b60', name: 'Belt B-60',
    category: 'Belts', qty: 1, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'May 25', usagePattern: 'Large commercial AHU',
    aiRec: 'One on hand.',
  },

  // ── Filters ───────────────────────────────────────────────────────────────────
  {
    id: 'filter-20x20', name: '20×20×1 Air Filter',
    category: 'Filters', qty: 6, minQty: 4, unit: 'each',
    requiredFor: ['ridgeline'], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 20', usagePattern: 'Standard PM filter',
    aiRec: 'Adequate for Ridgeline PM.',
    substitutes: [{ name: '20×25×1 (trim to fit)', compatible: false, note: 'Can be trimmed in an emergency but will leave a gap — replace with correct size ASAP.' }],
    usageHistory: [
      { date: 'Jun 20', qty: 4, site: 'Ridgeline Office Park' },
      { date: 'May 22', qty: 4, site: 'Ridgeline Office Park' },
      { date: 'Apr 18', qty: 4, site: 'Ridgeline Office Park' },
    ],
  },
  {
    id: 'filter-16x25', name: '16×25×1 Air Filter',
    category: 'Filters', qty: 2, minQty: 4, unit: 'each',
    requiredFor: [], recommendedFor: ['northgate'], niceToHaveFor: [],
    lastUsed: 'Jun 15', usagePattern: 'Northgate CRAC filter size',
    aiRec: 'Below minimum. Consider restocking before the Northgate call.',
    substitutes: [{ name: '16×20×1 (too short)', compatible: false, note: 'Will not cover full filter rack — unfiltered bypass air.' }],
  },
  {
    id: 'filter-24x24', name: '24×24×2 MERV-8 Filter',
    category: 'Filters', qty: 4, minQty: 4, unit: 'each',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 13', usagePattern: 'Commercial AHU MERV-8',
    aiRec: 'Adequate stock.',
  },
  {
    id: 'filter-20x25', name: '20×25×4 MERV-11 Filter',
    category: 'Filters', qty: 2, minQty: 2, unit: 'each',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 8', usagePattern: 'High-efficiency commercial units',
    aiRec: 'Stocked.',
  },

  // ── Fuses ─────────────────────────────────────────────────────────────────────
  {
    id: 'fuse-3a', name: '3A Control Fuse',
    category: 'Fuses', qty: 0, minQty: 10, unit: 'each',
    requiredFor: [], recommendedFor: ['summit', 'northgate'], niceToHaveFor: [],
    lastUsed: 'Jun 23', usagePattern: 'Replaced frequently on commercial units',
    aiRec: 'Stock is empty. Add to restock before departure.',
    substitutes: [{ name: '3A Time-Delay Fuse', compatible: true, note: 'Compatible for control circuits. Confirm fuse type (fast-blow vs time-delay) before installing.' }],
    usageHistory: [
      { date: 'Jun 23', qty: 3, site: 'Northgate Data Center' },
      { date: 'Jun 15', qty: 2, site: 'Summit Medical Plaza' },
      { date: 'Jun 8',  qty: 2, site: 'Summit Medical Plaza' },
      { date: 'Jun 1',  qty: 2, site: 'Northgate Data Center' },
    ],
  },
  {
    id: 'fuse-15a', name: '15A Cartridge Fuse',
    category: 'Fuses', qty: 6, minQty: 5, unit: 'each',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 18', usagePattern: 'Disconnect block fuses',
    aiRec: 'Stock is adequate.',
  },
  {
    id: 'fuse-30a', name: '30A Cartridge Fuse',
    category: 'Fuses', qty: 4, minQty: 4, unit: 'each',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 14', usagePattern: 'Condenser disconnect fuses',
    aiRec: 'Good stock.',
  },
  {
    id: 'fuse-5a', name: '5A Control Fuse',
    category: 'Fuses', qty: 8, minQty: 5, unit: 'each',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 20', usagePattern: 'Control board protection',
    aiRec: 'Adequate.',
  },

  // ── Chemicals ─────────────────────────────────────────────────────────────────
  {
    id: 'coil-cleaner', name: 'Foam Coil Cleaner',
    category: 'Chemicals', qty: 2, minQty: 2, unit: 'can',
    requiredFor: ['summit'], recommendedFor: ['ridgeline'], niceToHaveFor: [],
    lastUsed: 'Jun 26', usagePattern: 'Used on nearly every PM',
    aiRec: 'Required for Summit Medical condenser cleaning.',
    usageHistory: [
      { date: 'Jun 26', qty: 1, site: 'Summit Medical Plaza' },
      { date: 'Jun 20', qty: 1, site: 'Ridgeline Office Park' },
      { date: 'Jun 12', qty: 1, site: 'Summit Medical Plaza' },
      { date: 'Jun 5',  qty: 1, site: 'Northgate Data Center' },
    ],
  },
  {
    id: 'contact-cleaner', name: 'Electrical Contact Cleaner',
    category: 'Chemicals', qty: 1, minQty: 1, unit: 'can',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 20', usagePattern: 'Contactor and board cleaning',
    aiRec: 'Stocked.',
  },
  {
    id: 'evap-treatment', name: 'Evaporator Coil Treatment',
    category: 'Chemicals', qty: 1, minQty: 1, unit: 'gallon',
    requiredFor: [], recommendedFor: ['northgate'], niceToHaveFor: [],
    lastUsed: 'Jun 16', usagePattern: 'CRAC evaporator coil PM',
    aiRec: 'Recommended for Northgate CRAC evaporator coil PM.',
  },
  {
    id: 'drain-tabs', name: 'Drain Pan Treatment Tablets',
    category: 'Chemicals', qty: 12, minQty: 6, unit: 'each',
    requiredFor: [], recommendedFor: ['ridgeline'], niceToHaveFor: [],
    lastUsed: 'Jun 20', usagePattern: 'Placed in drain pan during every PM',
    aiRec: 'Adequate stock.',
  },
  {
    id: 'leak-spray', name: 'Leak Detection Spray',
    category: 'Chemicals', qty: 1, minQty: 1, unit: 'can',
    requiredFor: [], recommendedFor: ['summit'], niceToHaveFor: [],
    lastUsed: 'Jun 25', usagePattern: 'Visual confirmation of refrigerant leaks',
    aiRec: 'Use alongside electronic leak detector.',
  },

  // ── Controls ──────────────────────────────────────────────────────────────────
  {
    id: 'humidifier-canister', name: 'Humidifier Canister',
    category: 'Controls', qty: 0, minQty: 1, unit: 'each',
    requiredFor: ['northgate'], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'May 30', usagePattern: 'Scheduled PM — every 90 days at Northgate',
    aiRec: "Required for today's CRAC-3 PM. This call cannot be completed without it.",
    substitutes: [{ name: 'Universal humidifier canister', compatible: false, note: 'Confirm Liebert DS model compatibility — electrode spacing may differ.' }],
    usageHistory: [
      { date: 'May 30', qty: 1, site: 'Northgate Data Center' },
      { date: 'Mar 1',  qty: 1, site: 'Northgate Data Center' },
    ],
  },
  {
    id: 'thermostat-7day', name: '7-Day Programmable Thermostat',
    category: 'Controls', qty: 1, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 10', usagePattern: 'Occasional replacement',
    aiRec: 'Good to carry as a spare.',
  },
  {
    id: 'pressure-switch', name: 'High-Pressure Safety Switch',
    category: 'Controls', qty: 0, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: ['summit'], niceToHaveFor: [],
    lastUsed: 'Jun 3', usagePattern: 'Replaced when high-pressure lockout is tripped repeatedly',
    aiRec: 'Summit Medical RTU-3 has repeated high-pressure lockouts. Switch may need testing or replacement.',
  },

  // ── Tools ─────────────────────────────────────────────────────────────────────
  {
    id: 'vacuum-pump', name: 'Vacuum Pump (2-stage)',
    category: 'Tools', qty: 1, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: ['summit'], niceToHaveFor: [],
    lastUsed: 'Jun 26', usagePattern: 'Every refrigerant circuit opening',
    aiRec: 'Ready. Needed if Summit Medical requires refrigerant circuit work.',
  },
  {
    id: 'recovery-machine', name: 'Recovery Machine',
    category: 'Tools', qty: 1, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: ['summit'], niceToHaveFor: [],
    lastUsed: 'Jun 20', usagePattern: 'Required before any system opening',
    aiRec: 'Required by EPA 608 for any refrigerant system work.',
  },
  {
    id: 'nitrogen-kit', name: 'Nitrogen Regulator & Hose Kit',
    category: 'Tools', qty: 1, minQty: 1, unit: 'set',
    requiredFor: [], recommendedFor: ['summit'], niceToHaveFor: [],
    lastUsed: 'Jun 14', usagePattern: 'Pressure testing and purging during brazed line work',
    aiRec: 'Required for any open refrigerant circuit pressure test.',
  },
  {
    id: 'torch-kit', name: 'Torch Kit (MAPP Gas)',
    category: 'Tools', qty: 1, minQty: 1, unit: 'set',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 14', usagePattern: 'Brazing copper line sets',
    aiRec: 'Check gas level before departure.',
  },
  {
    id: 'cordless-drill', name: 'Cordless Drill + Bits',
    category: 'Tools', qty: 1, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 26', usagePattern: 'Every service call',
    aiRec: 'Check battery charge before departure.',
  },

  // ── Test Instruments ──────────────────────────────────────────────────────────
  {
    id: 'gauge-set', name: 'Refrigerant Gauge Set',
    category: 'Test Instruments', qty: 1, minQty: 1, unit: 'set',
    requiredFor: ['summit'], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 26', usagePattern: 'Every refrigerant call',
    aiRec: 'Required for RTU-3 head pressure diagnostics.',
  },
  {
    id: 'pressure-probes', name: 'Static Pressure Probes',
    category: 'Test Instruments', qty: 1, minQty: 1, unit: 'set',
    requiredFor: ['northgate', 'ridgeline'], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 26', usagePattern: 'Required for CRAC and AHU PMs',
    aiRec: 'Needed for both Northgate and Ridgeline today.',
  },
  {
    id: 'multimeter', name: 'Digital Multimeter',
    category: 'Test Instruments', qty: 1, minQty: 1, unit: 'each',
    requiredFor: ['summit', 'northgate', 'ridgeline'], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 26', usagePattern: 'Every call',
    aiRec: 'Essential — needed on all three calls today.',
  },
  {
    id: 'clamp-meter', name: 'Clamp Meter',
    category: 'Test Instruments', qty: 1, minQty: 1, unit: 'each',
    requiredFor: ['summit', 'ridgeline'], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 26', usagePattern: 'Amp draw measurements',
    aiRec: 'Needed for AHU-5 motor amp verification at Ridgeline.',
  },
  {
    id: 'leak-detector', name: 'Electronic Leak Detector',
    category: 'Test Instruments', qty: 1, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: ['summit'], niceToHaveFor: [],
    lastUsed: 'Jun 24', usagePattern: 'Every refrigerant call',
    aiRec: 'Use to verify leak-free connections after refrigerant work.',
  },
  {
    id: 'temp-clamps', name: 'Temperature Clamp Set',
    category: 'Test Instruments', qty: 1, minQty: 1, unit: 'set',
    requiredFor: [], recommendedFor: ['summit', 'ridgeline'], niceToHaveFor: [],
    lastUsed: 'Jun 25', usagePattern: 'Suction/discharge line temperature measurements',
    aiRec: 'Use for superheat and subcooling measurements at Summit Medical.',
  },

  // ── PPE ───────────────────────────────────────────────────────────────────────
  {
    id: 'n95', name: 'N95 Respirator Masks',
    category: 'PPE', qty: 5, minQty: 5, unit: 'each',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 25', usagePattern: 'Coil cleaning and chemical work',
    aiRec: "Adequate for today's route.",
  },
  {
    id: 'safety-glasses', name: 'Safety Glasses',
    category: 'PPE', qty: 2, minQty: 2, unit: 'pair',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 26', usagePattern: 'Required on all sites',
    aiRec: 'Stocked.',
  },
  {
    id: 'nitrile-gloves', name: 'Nitrile Gloves',
    category: 'PPE', qty: 1, minQty: 1, unit: 'box',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 26', usagePattern: 'Chemical and refrigerant handling',
    aiRec: 'One box adequate for today.',
  },
  {
    id: 'ear-protection', name: 'Foam Ear Protection',
    category: 'PPE', qty: 10, minQty: 5, unit: 'each',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 22', usagePattern: 'Mechanical room and loud equipment',
    aiRec: 'Good stock.',
  },
  {
    id: 'hard-hat', name: 'Hard Hat (Class E)',
    category: 'PPE', qty: 1, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 20', usagePattern: 'Required on all construction sites',
    aiRec: 'Stocked.',
  },

  // ── Miscellaneous ─────────────────────────────────────────────────────────────
  {
    id: 'schrader-cores', name: 'Schrader Valve Cores',
    category: 'Miscellaneous', qty: 20, minQty: 10, unit: 'each',
    requiredFor: [], recommendedFor: ['summit'], niceToHaveFor: [],
    lastUsed: 'Jun 23', usagePattern: 'Replace on every refrigerant service',
    aiRec: 'Good stock.',
  },
  {
    id: 'teflon-tape', name: 'Teflon Thread Tape',
    category: 'Miscellaneous', qty: 3, minQty: 2, unit: 'roll',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 21', usagePattern: 'Pipe fittings and connections',
    aiRec: 'Adequate.',
  },
  {
    id: 'copper-tubing', name: 'Copper Tubing 1/4" OD (5 ft)',
    category: 'Miscellaneous', qty: 1, minQty: 1, unit: 'coil',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 14', usagePattern: 'Refrigerant line patching',
    aiRec: 'One coil on hand.',
  },
  {
    id: 'wire-connectors', name: 'Wire Connectors (assorted)',
    category: 'Miscellaneous', qty: 1, minQty: 1, unit: 'bag',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 26', usagePattern: 'Control wiring on every call',
    aiRec: 'Stocked.',
  },
  {
    id: 'elec-tape', name: 'Electrical Tape',
    category: 'Miscellaneous', qty: 2, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 26', usagePattern: 'Wire insulation and labeling',
    aiRec: 'Adequate.',
  },
  {
    id: 'zip-ties', name: 'Cable Zip Ties (assorted)',
    category: 'Miscellaneous', qty: 1, minQty: 1, unit: 'bag',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 24', usagePattern: 'Wire management and filter retention',
    aiRec: 'Stocked.',
  },
];

export const INITIAL_READINESS = computeOverallReadiness(INITIAL_INVENTORY);

export function aiVanSummary(inventory: InventoryItem[]): string {
  const comparison = aiRouteComparison(inventory);
  return comparison.body || comparison.headline;
}
