// ─── Types ────────────────────────────────────────────────────────────────────

export type ItemStatus   = 'ready' | 'low' | 'missing';
export type ItemPriority = 'required' | 'recommended' | 'nice' | 'none';

export type AITag =
  | 'Fast Moving'
  | 'Rarely Used'
  | 'Seasonal'
  | 'Critical Spare'
  | 'High Failure Item'
  | 'Universal Part'
  | 'OEM Only'
  | 'High Value'
  | 'Large Item'
  | 'Requires EPA Certification'
  | 'Long Lead Time';

export type ReturnTripRisk  = 'Very Low' | 'Low' | 'Medium' | 'High' | 'Critical';
export type RestockCategory = 'Critical Today' | 'Likely Today' | 'Recommended This Week' | 'Shop Stock' | 'Seasonal';

export type ItemCategory =
  | 'Refrigerant'
  | 'Capacitors'
  | 'Contactors'
  | 'Relays'
  | 'Transformers'
  | 'Motors'
  | 'Fan Blades'
  | 'Bearings'
  | 'Belts'
  | 'Filters'
  | 'Fuses'
  | 'Pressure Switches'
  | 'Sensors'
  | 'Chemicals'
  | 'Drain Parts'
  | 'Controls'
  | 'Screws / Hardware'
  | 'Wire / Terminals'
  | 'Miscellaneous';

export const ALL_CATEGORIES: ItemCategory[] = [
  'Refrigerant',
  'Capacitors',
  'Contactors',
  'Relays',
  'Transformers',
  'Motors',
  'Fan Blades',
  'Bearings',
  'Belts',
  'Filters',
  'Fuses',
  'Pressure Switches',
  'Sensors',
  'Chemicals',
  'Drain Parts',
  'Controls',
  'Screws / Hardware',
  'Wire / Terminals',
  'Miscellaneous',
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
  id:             string;
  name:           string;
  category:       ItemCategory;
  qty:            number;
  minQty:         number;
  unit:           string;
  requiredFor:    string[];
  recommendedFor: string[];
  niceToHaveFor:  string[];
  lastUsed?:      string;
  usagePattern?:  string;
  aiRec?:         string;
  substitutes?:   SubstituteItem[];
  usageHistory?:  UsageRecord[];
  // ── AI Intelligence ────────────────────────────────────────────────────
  aiTags?:               AITag[];
  // ── Supply House (future integration) ─────────────────────────────────
  supplierName?:         string;
  supplierAvailability?: 'In Stock' | 'Low Stock' | 'Out of Stock' | 'Special Order';
  supplierPrice?:        number;
  oemPartNumber?:        string;
  universalAlternative?: string;
  pickupTimeMin?:        number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function itemStatus(item: InventoryItem): ItemStatus {
  if (item.qty === 0)          return 'missing';
  if (item.qty < item.minQty) return 'low';
  return 'ready';
}

export function itemHighestPriority(item: InventoryItem, jobIds: string[]): ItemPriority {
  for (const j of jobIds) if (item.requiredFor.includes(j))    return 'required';
  for (const j of jobIds) if (item.recommendedFor.includes(j)) return 'recommended';
  for (const j of jobIds) if (item.niceToHaveFor.includes(j))  return 'nice';
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
    if (item.requiredFor.includes(jobId)) {
      if      (s === 'missing') score -= W.missingRequired;
      else if (s === 'low')     score -= W.lowRequired;
    } else if (item.recommendedFor.includes(jobId)) {
      if      (s === 'missing') score -= W.missingRecommended;
      else if (s === 'low')     score -= W.lowRecommended;
    } else if (item.niceToHaveFor.includes(jobId)) {
      if      (s === 'missing') score -= W.missingNice;
      else if (s === 'low')     score -= W.lowNice;
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
    label: 'Fully Stocked', sublabel: 'All required & recommended parts loaded',
    color: 'text-green-400', dot: '🟢', ring: '#22c55e',
  };
  if (score >= 90) return {
    label: 'Ready', sublabel: 'Minor recommended items low',
    color: 'text-green-400', dot: '🟢', ring: '#22c55e',
  };
  if (score >= 80) return {
    label: 'Mostly Ready', sublabel: 'Missing some recommended parts',
    color: 'text-yellow-400', dot: '🟡', ring: '#eab308',
  };
  if (score >= 65) return {
    label: 'At Risk', sublabel: 'Missing required parts for one or more jobs',
    color: 'text-orange-400', dot: '🟡', ring: '#f97316',
  };
  if (score >= 50) return {
    label: 'High Return Risk', sublabel: 'Multiple critical parts missing',
    color: 'text-red-400', dot: '🔴', ring: '#ef4444',
  };
  return {
    label: 'Not Ready', sublabel: 'Do not dispatch without restocking',
    color: 'text-red-500', dot: '🔴', ring: '#dc2626',
  };
}

// ─── Job info ─────────────────────────────────────────────────────────────────

export const JOB_INFO: Record<string, { name: string; abbr: string; dotColor: string }> = {};

export const TODAY_JOB_IDS: Record<string, string> = {};

export function getJobVanId(jobId: string): string {
  return TODAY_JOB_IDS[jobId] ?? jobId;
}

const TODAY_VAN_JOBS: string[] = [];

// ─── AI route comparison ──────────────────────────────────────────────────────

export interface RouteComparison {
  status:             'ready' | 'risk' | 'incomplete';
  headline:           string;
  body:               string;
  missingRequired:    Array<{ item: InventoryItem; jobs: string[] }>;
  missingRecommended: Array<{ item: InventoryItem; jobs: string[] }>;
  lowRequired:        Array<{ item: InventoryItem; jobs: string[] }>;
}

export function aiRouteComparison(inventory: InventoryItem[]): RouteComparison {
  const missingRequired:    Array<{ item: InventoryItem; jobs: string[] }> = [];
  const missingRecommended: Array<{ item: InventoryItem; jobs: string[] }> = [];
  const lowRequired:        Array<{ item: InventoryItem; jobs: string[] }> = [];

  for (const item of inventory) {
    const s       = itemStatus(item);
    const reqJobs = TODAY_VAN_JOBS.filter(j => item.requiredFor.includes(j));
    const recJobs = TODAY_VAN_JOBS.filter(j => item.recommendedFor.includes(j));
    if (reqJobs.length > 0) {
      if      (s === 'missing') missingRequired.push({ item, jobs: reqJobs });
      else if (s === 'low')     lowRequired.push({ item, jobs: reqJobs });
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
    parts.push(`Low stock on required parts: ${names}.`);
  }
  if (missingRecommended.length > 0) {
    const names = missingRecommended.map(r => r.item.name).join(', ');
    parts.push(`Missing recommended: ${names}.`);
  }
  if (missingRequired.length > 0) parts.push('Stop at the supply house before your first call.');

  return {
    status: missingRequired.length > 0 ? 'incomplete' : 'risk',
    headline: missingRequired.length > 0
      ? `You are missing ${missingRequired.length} required part${missingRequired.length !== 1 ? 's' : ''}.`
      : `${missingRecommended.length + lowRequired.length} recommended part${(missingRecommended.length + lowRequired.length) !== 1 ? 's' : ''} low or missing.`,
    body: parts.join(' '),
    missingRequired, missingRecommended, lowRequired,
  };
}

// ─── AI Day Brief stock list ──────────────────────────────────────────────────

export const AI_STOCK_LIST: {
  item: string; reason: string; ok: 'ready' | 'low' | 'missing';
}[] = [];

// ─── Parts Inventory ──────────────────────────────────────────────────────────

export const INITIAL_INVENTORY: InventoryItem[] = [

  // ── Refrigerant ──────────────────────────────────────────────────────────────
  {
    id: 'r410a', name: 'R-410A Refrigerant',
    category: 'Refrigerant', qty: 1, minQty: 2, unit: 'cylinder',
    requiredFor: ['summit'], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 26', usagePattern: 'Used on most refrigerant calls',
    aiRec: 'High-pressure call history — carry a full cylinder for any refrigerant work.',
    aiTags: ['Fast Moving', 'Requires EPA Certification', 'Seasonal'],
    substitutes: [{ name: 'R-454B', compatible: false, note: 'Different pressure rating — do not interchange.' }],
    usageHistory: [
      { date: 'Jun 26', qty: 1, site: 'Commercial HVAC Job' },
      { date: 'Jun 12', qty: 1, site: 'Westfield Office Tower' },
      { date: 'May 30', qty: 1, site: 'Commercial HVAC Job' },
    ],
  },
  {
    id: 'r22', name: 'R-22 Refrigerant (recovery only)',
    category: 'Refrigerant', qty: 1, minQty: 1, unit: 'cylinder',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 10', usagePattern: 'Legacy equipment recovery only',
    aiRec: 'Recovery only — EPA 608 prohibits reuse for charging.',
    aiTags: ['Requires EPA Certification', 'Large Item'],
  },
  {
    id: 'r407c', name: 'R-407C Refrigerant',
    category: 'Refrigerant', qty: 0, minQty: 1, unit: 'cylinder',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 3', aiRec: 'Out of stock. Add to restock if R-22 retrofit work is scheduled.',
  },
  {
    id: 'r134a', name: 'R-134a Refrigerant',
    category: 'Refrigerant', qty: 1, minQty: 1, unit: 'cylinder',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'May 28', aiRec: 'No chiller work scheduled today.',
  },

  // ── Capacitors ───────────────────────────────────────────────────────────────
  {
    id: 'cap-35-5', name: '35/5 MFD Dual Run Capacitor',
    category: 'Capacitors', qty: 1, minQty: 2, unit: 'each',
    requiredFor: [], recommendedFor: ['summit'], niceToHaveFor: [],
    lastUsed: 'Jun 26', usagePattern: 'Replaced 4 this month',
    aiRec: 'Summit RTU-3 repeated Code 82 — condenser fan capacitor is primary suspect. Carry two.',
    aiTags: ['High Failure Item', 'Fast Moving', 'Universal Part'],
    supplierName: 'Ferguson HVAC', supplierAvailability: 'In Stock', supplierPrice: 12.50, pickupTimeMin: 15, universalAlternative: 'Genteq Z97F9835',
    substitutes: [{ name: '40/5 MFD Dual Run', compatible: false, note: 'Different rating — confirm nameplate before substituting.' }],
    usageHistory: [
      { date: 'Jun 26', qty: 1, site: 'Commercial HVAC Job' },
      { date: 'Jun 18', qty: 1, site: 'Commercial HVAC Job' },
      { date: 'Jun 10', qty: 1, site: 'Parkway Clinic' },
      { date: 'Jun 4',  qty: 1, site: 'Commercial HVAC Job' },
      { date: 'May 27', qty: 1, site: 'Commercial HVAC Job' },
    ],
  },
  {
    id: 'cap-45-5', name: '45/5 MFD Dual Run Capacitor',
    category: 'Capacitors', qty: 2, minQty: 2, unit: 'each',
    requiredFor: [], recommendedFor: [], niceToHaveFor: ['summit'],
    lastUsed: 'Jun 24', aiRec: 'Good stock.',
    usageHistory: [
      { date: 'Jun 24', qty: 1, site: 'Commercial HVAC Job' },
      { date: 'Jun 15', qty: 1, site: 'Westfield Office Tower' },
    ],
  },
  {
    id: 'cap-40-5', name: '40/5 MFD Dual Run Capacitor',
    category: 'Capacitors', qty: 1, minQty: 2, unit: 'each',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 19', aiRec: 'Below minimum. Restock before next PM cycle.',
  },
  {
    id: 'cap-50-7', name: '50/7.5 MFD Dual Run Capacitor',
    category: 'Capacitors', qty: 2, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 15', aiRec: 'Stock adequate.',
  },
  {
    id: 'cap-30-5', name: '30/5 MFD Dual Run Capacitor',
    category: 'Capacitors', qty: 0, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 8', aiRec: 'Out of stock.',
  },
  {
    id: 'cap-5mfd', name: '5 MFD Run Capacitor',
    category: 'Capacitors', qty: 3, minQty: 2, unit: 'each',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 22', aiRec: 'Adequate stock.',
  },

  // ── Contactors ───────────────────────────────────────────────────────────────
  {
    id: 'contactor-30a', name: '2-Pole 30A Contactor',
    category: 'Contactors', qty: 1, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: ['summit'], niceToHaveFor: [],
    lastUsed: 'Jun 21', usagePattern: 'Most common size',
    aiRec: 'RTU-3 contactor history shows arcing. Replacement likely today.',
    aiTags: ['High Failure Item', 'Fast Moving'],
    usageHistory: [
      { date: 'Jun 21', qty: 1, site: 'Commercial HVAC Job' },
      { date: 'Jun 8',  qty: 1, site: 'Commercial HVAC Job' },
      { date: 'May 30', qty: 1, site: 'Commercial HVAC Job' },
    ],
  },
  {
    id: 'contactor-40a', name: '3-Pole 40A Contactor',
    category: 'Contactors', qty: 0, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: ['summit'], niceToHaveFor: [],
    lastUsed: 'Jun 12', aiRec: 'Out of stock. Restock before Summit call.',
    aiTags: ['High Failure Item'],
    supplierName: 'Waxman Supply', supplierAvailability: 'In Stock', supplierPrice: 38.00, pickupTimeMin: 22,
    substitutes: [{ name: '3-Pole 40A Heavy-Duty', compatible: true, note: 'Confirm coil voltage (24V typical) before installing.' }],
  },
  {
    id: 'contactor-25a', name: '3-Pole 25A Contactor',
    category: 'Contactors', qty: 2, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: ['ridgeline'], niceToHaveFor: [],
    lastUsed: 'Jun 16', aiRec: 'Good stock.',
  },

  // ── Relays ───────────────────────────────────────────────────────────────────
  {
    id: 'relay-time-delay', name: 'Time-Delay Relay (5-min)',
    category: 'Relays', qty: 2, minQty: 2, unit: 'each',
    requiredFor: [], recommendedFor: ['northgate'], niceToHaveFor: [],
    lastUsed: 'Jun 20', aiRec: 'Used frequently on CRAC units — keep stock above minimum.',
    aiTags: ['Fast Moving'],
    usageHistory: [
      { date: 'Jun 20', qty: 1, site: 'Commercial HVAC Job' },
      { date: 'May 15', qty: 1, site: 'Commercial HVAC Job' },
    ],
  },
  {
    id: 'relay-fan', name: 'Fan Relay 24V DPDT',
    category: 'Relays', qty: 1, minQty: 2, unit: 'each',
    requiredFor: [], recommendedFor: ['ridgeline'], niceToHaveFor: [],
    lastUsed: 'Jun 14', aiRec: 'Below minimum — common replacement on AHU control boards.',
  },
  {
    id: 'relay-sequencer', name: 'Sequencer Relay',
    category: 'Relays', qty: 1, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 5', aiRec: 'One on hand.',
  },

  // ── Transformers ─────────────────────────────────────────────────────────────
  {
    id: 'xfmr-40va', name: '40VA Control Transformer (208/230–24V)',
    category: 'Transformers', qty: 1, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: ['summit', 'northgate'], niceToHaveFor: [],
    lastUsed: 'Jun 18', aiRec: 'Carry as a spare — frequent failure after high-pressure events.',
    aiTags: ['Critical Spare'],
    usageHistory: [
      { date: 'Jun 18', qty: 1, site: 'Commercial HVAC Job' },
      { date: 'May 10', qty: 1, site: 'Commercial HVAC Job' },
    ],
  },
  {
    id: 'xfmr-75va', name: '75VA Control Transformer (460–24V)',
    category: 'Transformers', qty: 0, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'May 28', aiRec: 'Out of stock. Add if 460V commercial work is scheduled.',
  },

  // ── Motors ────────────────────────────────────────────────────────────────────
  {
    id: 'motor-cond-fan', name: 'Condenser Fan Motor 1/3 HP',
    category: 'Motors', qty: 0, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: ['summit'], niceToHaveFor: [],
    lastUsed: 'Jun 10',
    aiRec: 'RTU-3 condenser fan is the suspected root cause of Code 82. Carrying one avoids a return trip.',
    aiTags: ['High Value', 'High Failure Item', 'Long Lead Time'],
    supplierName: 'Waxman Supply', supplierAvailability: 'Low Stock', supplierPrice: 145.00, pickupTimeMin: 22, oemPartNumber: 'HC39GE234A',
  },
  {
    id: 'motor-cond-quarter', name: 'Condenser Fan Motor 1/4 HP',
    category: 'Motors', qty: 1, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 6', aiRec: 'One on hand.',
  },
  {
    id: 'motor-blower', name: 'Blower Motor 1/3 HP PSC',
    category: 'Motors', qty: 0, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: ['ridgeline'], niceToHaveFor: [],
    lastUsed: 'Jun 2',
    aiRec: 'Out of stock. Vibration trends on belt-drive AHUs often precede motor replacement.',
    aiTags: ['High Value', 'Large Item', 'Long Lead Time'],
  },

  // ── Fan Blades ────────────────────────────────────────────────────────────────
  {
    id: 'fan-blade-18', name: 'Condenser Fan Blade 18"',
    category: 'Fan Blades', qty: 1, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: ['summit'], niceToHaveFor: [],
    lastUsed: 'Jun 4', aiRec: 'Check blade condition during RTU-3 condenser fan inspection.',
  },
  {
    id: 'fan-blade-20', name: 'Condenser Fan Blade 20"',
    category: 'Fan Blades', qty: 0, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'May 30', aiRec: 'Out of stock.',
    substitutes: [{ name: '18" blade + spacer kit', compatible: false, note: 'Emergency measure only — airflow will differ.' }],
  },
  {
    id: 'fan-blade-22', name: 'Condenser Fan Blade 22"',
    category: 'Fan Blades', qty: 1, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 1', aiRec: 'One on hand.',
  },

  // ── Bearings ──────────────────────────────────────────────────────────────────
  {
    id: 'bearing-half', name: 'Pillow Block Bearing 1/2" bore',
    category: 'Bearings', qty: 2, minQty: 2, unit: 'each',
    requiredFor: ['ridgeline'], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 18', usagePattern: 'AHU shaft bearing replacement',
    aiRec: 'AHU-5 vibration trend indicates bearing wear. Carry at least two.',
    aiTags: ['Long Lead Time'],
    usageHistory: [
      { date: 'Jun 18', qty: 2, site: 'Commercial HVAC Job' },
      { date: 'May 22', qty: 2, site: 'Commercial HVAC Job' },
    ],
  },
  {
    id: 'bearing-five-eighths', name: 'Pillow Block Bearing 5/8" bore',
    category: 'Bearings', qty: 1, minQty: 2, unit: 'each',
    requiredFor: [], recommendedFor: ['ridgeline'], niceToHaveFor: [],
    lastUsed: 'Jun 11', aiRec: 'Below minimum.',
  },
  {
    id: 'bearing-6204', name: 'Ball Bearing 6204 Standard',
    category: 'Bearings', qty: 2, minQty: 2, unit: 'each',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 9', aiRec: 'Good stock.',
  },

  // ── Belts ─────────────────────────────────────────────────────────────────────
  {
    id: 'belt-a40', name: 'Belt A-40',
    category: 'Belts', qty: 2, minQty: 1, unit: 'each',
    requiredFor: ['ridgeline'], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 20', usagePattern: 'AHU-5 confirmed belt size',
    aiRec: 'Stocked and ready for belt-drive AHU service.',
    aiTags: ['Fast Moving'],
    usageHistory: [
      { date: 'Jun 20', qty: 1, site: 'Commercial HVAC Job' },
      { date: 'May 22', qty: 1, site: 'Commercial HVAC Job' },
      { date: 'Apr 15', qty: 1, site: 'Commercial HVAC Job' },
    ],
  },
  {
    id: 'belt-b52', name: 'Belt B-52',
    category: 'Belts', qty: 0, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: ['ridgeline'], niceToHaveFor: [],
    lastUsed: 'Jun 5', aiRec: 'Out of stock. Carry as a backup on AHU calls.',
    substitutes: [
      { name: 'Belt B-54', compatible: false, note: 'Too long — will slip under tension.' },
      { name: 'Belt B-51', compatible: false, note: 'Too short — may not fit over sheaves.' },
    ],
  },
  {
    id: 'belt-a38', name: 'Belt A-38',
    category: 'Belts', qty: 1, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 14', aiRec: 'One on hand.',
  },
  {
    id: 'belt-a42', name: 'Belt A-42',
    category: 'Belts', qty: 0, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 7', aiRec: 'Out of stock.',
    substitutes: [{ name: 'Belt A-40', compatible: false, note: 'Shorter — confirm sheave center distance before using.' }],
  },

  // ── Filters ───────────────────────────────────────────────────────────────────
  {
    id: 'filter-20x20', name: '20×20×1 Air Filter',
    category: 'Filters', qty: 6, minQty: 4, unit: 'each',
    requiredFor: ['ridgeline'], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 20', aiRec: 'Adequate stock for PM calls.',
    substitutes: [{ name: '20×25×1 (trim to fit)', compatible: false, note: 'Can be trimmed but leaves a gap — replace ASAP.' }],
    usageHistory: [
      { date: 'Jun 20', qty: 4, site: 'Commercial HVAC Job' },
      { date: 'May 22', qty: 4, site: 'Commercial HVAC Job' },
      { date: 'Apr 18', qty: 4, site: 'Commercial HVAC Job' },
    ],
  },
  {
    id: 'filter-16x25', name: '16×25×1 Air Filter',
    category: 'Filters', qty: 2, minQty: 4, unit: 'each',
    requiredFor: [], recommendedFor: ['northgate'], niceToHaveFor: [],
    lastUsed: 'Jun 15', aiRec: 'Below minimum. Restock before your next commercial call.',
    substitutes: [{ name: '16×20×1', compatible: false, note: 'Too short — leaves unfiltered bypass gap.' }],
  },
  {
    id: 'filter-24x24', name: '24×24×2 MERV-8 Filter',
    category: 'Filters', qty: 4, minQty: 4, unit: 'each',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 13', aiRec: 'Adequate stock.',
  },
  {
    id: 'filter-20x25', name: '20×25×4 MERV-11 Filter',
    category: 'Filters', qty: 2, minQty: 2, unit: 'each',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 8', aiRec: 'Stocked.',
  },

  // ── Fuses ─────────────────────────────────────────────────────────────────────
  {
    id: 'fuse-3a', name: '3A Control Fuse',
    category: 'Fuses', qty: 0, minQty: 10, unit: 'each',
    requiredFor: [], recommendedFor: ['summit', 'northgate'], niceToHaveFor: [],
    lastUsed: 'Jun 23', usagePattern: 'Replaced frequently on commercial units',
    aiRec: 'Stock empty. Add to restock before departure.',
    aiTags: ['Fast Moving', 'Critical Spare'],
    supplierName: 'Ferguson HVAC', supplierAvailability: 'In Stock', supplierPrice: 0.85, pickupTimeMin: 15,
    substitutes: [{ name: '3A Time-Delay Fuse', compatible: true, note: 'Confirm fast-blow vs time-delay before installing.' }],
    usageHistory: [
      { date: 'Jun 23', qty: 3, site: 'Commercial HVAC Job' },
      { date: 'Jun 15', qty: 2, site: 'Commercial HVAC Job' },
      { date: 'Jun 8',  qty: 2, site: 'Commercial HVAC Job' },
      { date: 'Jun 1',  qty: 2, site: 'Commercial HVAC Job' },
    ],
  },
  {
    id: 'fuse-15a', name: '15A Cartridge Fuse',
    category: 'Fuses', qty: 6, minQty: 5, unit: 'each',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 18', aiRec: 'Stock adequate.',
  },
  {
    id: 'fuse-30a', name: '30A Cartridge Fuse',
    category: 'Fuses', qty: 4, minQty: 4, unit: 'each',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 14', aiRec: 'Good stock.',
  },
  {
    id: 'fuse-5a', name: '5A Control Fuse',
    category: 'Fuses', qty: 8, minQty: 5, unit: 'each',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 20', aiRec: 'Adequate.',
  },

  // ── Pressure Switches ─────────────────────────────────────────────────────────
  {
    id: 'ps-high', name: 'High-Pressure Safety Switch',
    category: 'Pressure Switches', qty: 0, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: ['summit'], niceToHaveFor: [],
    lastUsed: 'Jun 3',
    aiRec: 'Summit RTU-3 has repeated high-pressure lockouts — switch may need replacement.',
    aiTags: ['Critical Spare', 'High Failure Item'],
    supplierName: 'Ferguson HVAC', supplierAvailability: 'In Stock', supplierPrice: 24.00, pickupTimeMin: 15,
  },
  {
    id: 'ps-low', name: 'Low-Pressure Safety Switch',
    category: 'Pressure Switches', qty: 1, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'May 20', aiRec: 'One on hand.',
  },
  {
    id: 'ps-oil', name: 'Oil Pressure Control',
    category: 'Pressure Switches', qty: 0, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Apr 10', aiRec: 'Out of stock — add if chiller work is scheduled.',
  },

  // ── Sensors ───────────────────────────────────────────────────────────────────
  {
    id: 'sensor-ntc', name: 'NTC Thermistor 10K',
    category: 'Sensors', qty: 4, minQty: 3, unit: 'each',
    requiredFor: [], recommendedFor: ['northgate'], niceToHaveFor: [],
    lastUsed: 'Jun 17', aiRec: 'Common on CRAC units. Good stock.',
    usageHistory: [
      { date: 'Jun 17', qty: 1, site: 'Commercial HVAC Job' },
      { date: 'Jun 2',  qty: 2, site: 'Commercial HVAC Job' },
    ],
  },
  {
    id: 'sensor-discharge', name: 'Discharge Line Thermostat',
    category: 'Sensors', qty: 1, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: ['summit'], niceToHaveFor: [],
    lastUsed: 'Jun 12', aiRec: 'One on hand — useful for Summit refrigerant diagnostics.',
  },
  {
    id: 'sensor-freeze', name: 'Freeze Protection Thermostat',
    category: 'Sensors', qty: 2, minQty: 2, unit: 'each',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 8', aiRec: 'Adequate.',
  },

  // ── Chemicals ─────────────────────────────────────────────────────────────────
  {
    id: 'coil-cleaner', name: 'Foam Coil Cleaner',
    category: 'Chemicals', qty: 2, minQty: 2, unit: 'can',
    requiredFor: ['summit'], recommendedFor: ['ridgeline'], niceToHaveFor: [],
    lastUsed: 'Jun 26',
    aiRec: 'Essential for condenser coil cleaning — stock before commercial PM calls.',
    aiTags: ['Fast Moving', 'Seasonal'],
    usageHistory: [
      { date: 'Jun 26', qty: 1, site: 'Commercial HVAC Job' },
      { date: 'Jun 20', qty: 1, site: 'Commercial HVAC Job' },
      { date: 'Jun 12', qty: 1, site: 'Commercial HVAC Job' },
      { date: 'Jun 5',  qty: 1, site: 'Commercial HVAC Job' },
    ],
  },
  {
    id: 'contact-cleaner', name: 'Electrical Contact Cleaner',
    category: 'Chemicals', qty: 1, minQty: 1, unit: 'can',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 20', aiRec: 'Stocked.',
  },
  {
    id: 'evap-treatment', name: 'Evaporator Coil Treatment',
    category: 'Chemicals', qty: 1, minQty: 1, unit: 'gallon',
    requiredFor: [], recommendedFor: ['northgate'], niceToHaveFor: [],
    lastUsed: 'Jun 16', aiRec: 'Recommended for CRAC unit evaporator coil PM.',
  },
  {
    id: 'leak-spray', name: 'Leak Detection Spray',
    category: 'Chemicals', qty: 1, minQty: 1, unit: 'can',
    requiredFor: [], recommendedFor: ['summit'], niceToHaveFor: [],
    lastUsed: 'Jun 25', aiRec: 'Use alongside electronic leak detector.',
  },

  // ── Drain Parts ───────────────────────────────────────────────────────────────
  {
    id: 'drain-tabs', name: 'Drain Pan Treatment Tablets',
    category: 'Drain Parts', qty: 12, minQty: 6, unit: 'each',
    requiredFor: [], recommendedFor: ['ridgeline'], niceToHaveFor: [],
    lastUsed: 'Jun 20', aiRec: 'Adequate. Drop two tablets per drain pan during PM visits.',
  },
  {
    id: 'drain-trap', name: 'Condensate Trap (PVC)',
    category: 'Drain Parts', qty: 2, minQty: 2, unit: 'each',
    requiredFor: [], recommendedFor: ['northgate'], niceToHaveFor: [],
    lastUsed: 'Jun 14', aiRec: 'Carry two — CRAC units commonly need trap replacement.',
  },
  {
    id: 'float-switch', name: 'Condensate Float Switch',
    category: 'Drain Parts', qty: 1, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: ['northgate'], niceToHaveFor: [],
    lastUsed: 'Jun 8', aiRec: 'One on hand.',
  },

  // ── Controls ──────────────────────────────────────────────────────────────────
  {
    id: 'humidifier-canister', name: 'Humidifier Canister',
    category: 'Controls', qty: 0, minQty: 1, unit: 'each',
    requiredFor: ['northgate'], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'May 30', usagePattern: 'Scheduled PM every 90 days on CRAC units',
    aiRec: 'Required for CRAC unit humidifier PM. This call cannot be completed without it.',
    aiTags: ['OEM Only', 'Long Lead Time'],
    supplierName: 'Liebert Distributor', supplierAvailability: 'Special Order', supplierPrice: 89.00, pickupTimeMin: 180, oemPartNumber: 'LB-106898G1',
    substitutes: [{ name: 'Universal humidifier canister', compatible: false, note: 'Confirm electrode spacing — Liebert DS spacing is non-standard.' }],
    usageHistory: [
      { date: 'May 30', qty: 1, site: 'Commercial HVAC Job' },
      { date: 'Mar 1',  qty: 1, site: 'Commercial HVAC Job' },
    ],
  },
  {
    id: 'thermostat-7day', name: '7-Day Programmable Thermostat',
    category: 'Controls', qty: 1, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 10', aiRec: 'Good to carry as a spare.',
  },

  // ── Screws / Hardware ─────────────────────────────────────────────────────────
  {
    id: 'screws-sheetmetal', name: 'Sheet Metal Screws (assorted)',
    category: 'Screws / Hardware', qty: 1, minQty: 1, unit: 'box',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 26', aiRec: 'Stocked. Use for access panel re-assembly.',
  },
  {
    id: 'screws-machine', name: 'Machine Screws #10-32 (assorted)',
    category: 'Screws / Hardware', qty: 1, minQty: 1, unit: 'bag',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 22', aiRec: 'Adequate.',
  },
  {
    id: 'panel-latch', name: 'Access Panel Latch / Fastener',
    category: 'Screws / Hardware', qty: 6, minQty: 4, unit: 'each',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 18', aiRec: 'Good stock.',
  },

  // ── Wire / Terminals ──────────────────────────────────────────────────────────
  {
    id: 'wire-18awg', name: '18AWG Thermostat Wire (50 ft)',
    category: 'Wire / Terminals', qty: 1, minQty: 1, unit: 'roll',
    requiredFor: [], recommendedFor: ['summit', 'northgate'], niceToHaveFor: [],
    lastUsed: 'Jun 24', aiRec: 'Needed for any control wiring replacement.',
  },
  {
    id: 'wire-connectors', name: 'Wire Connectors (assorted)',
    category: 'Wire / Terminals', qty: 1, minQty: 1, unit: 'bag',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 26', aiRec: 'Stocked.',
  },
  {
    id: 'terminals-spade', name: 'Spade Terminal Assortment',
    category: 'Wire / Terminals', qty: 1, minQty: 1, unit: 'bag',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 21', aiRec: 'Adequate.',
  },

  // ── Miscellaneous ─────────────────────────────────────────────────────────────
  {
    id: 'schrader-cores', name: 'Schrader Valve Cores',
    category: 'Miscellaneous', qty: 20, minQty: 10, unit: 'each',
    requiredFor: [], recommendedFor: ['summit'], niceToHaveFor: [],
    lastUsed: 'Jun 23', aiRec: 'Good stock. Replace on every refrigerant service.',
  },
  {
    id: 'teflon-tape', name: 'Teflon Thread Tape',
    category: 'Miscellaneous', qty: 3, minQty: 2, unit: 'roll',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 21', aiRec: 'Adequate.',
  },
  {
    id: 'copper-tubing', name: 'Copper Tubing 1/4" OD (5 ft)',
    category: 'Miscellaneous', qty: 1, minQty: 1, unit: 'coil',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 14', aiRec: 'One coil on hand.',
  },
  {
    id: 'elec-tape', name: 'Electrical Tape',
    category: 'Miscellaneous', qty: 2, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 26', aiRec: 'Adequate.',
  },
  {
    id: 'zip-ties', name: 'Cable Zip Ties (assorted)',
    category: 'Miscellaneous', qty: 1, minQty: 1, unit: 'bag',
    requiredFor: [], recommendedFor: [], niceToHaveFor: [],
    lastUsed: 'Jun 24', aiRec: 'Stocked.',
  },
];

export const INITIAL_READINESS = computeOverallReadiness(INITIAL_INVENTORY);

export function aiVanSummary(inventory: InventoryItem[]): string {
  const comparison = aiRouteComparison(inventory);
  return comparison.body || comparison.headline;
}

// ─── Return Trip Risk ──────────────────────────────────────────────────────────

const JOB_HISTORY_FACTORS: Record<string, number> = {
  summit:    0.75, // RTU-3 failed Code 82 three times — previous repairs unsuccessful
  northgate: 0.90, // Missing required humidifier canister drops confidence
  ridgeline: 0.95, // Standard PM, reliable equipment history
};

export function computeFirstVisitLikelihood(
  inventory: InventoryItem[],
  toolsScore: number,
  jobId: string,
): number {
  const partsScore = computeJobReadiness(inventory, jobId);
  const histFactor = JOB_HISTORY_FACTORS[jobId] ?? 1.0;
  const raw = (partsScore * 0.60 + toolsScore * 0.25 + 15) * histFactor;
  return Math.round(Math.max(0, Math.min(100, raw)));
}

export function computeReturnTripRisk(likelihood: number): ReturnTripRisk {
  if (likelihood >= 92) return 'Very Low';
  if (likelihood >= 80) return 'Low';
  if (likelihood >= 65) return 'Medium';
  if (likelihood >= 45) return 'High';
  return 'Critical';
}

export function returnTripRiskStyle(risk: ReturnTripRisk): {
  bg: string; border: string; text: string; label: string;
} {
  switch (risk) {
    case 'Very Low': return { bg: 'bg-green-950/40',  border: 'border-green-800/60',  text: 'text-green-400',  label: 'VERY LOW'  };
    case 'Low':      return { bg: 'bg-green-950/20',  border: 'border-green-900/50',  text: 'text-green-500',  label: 'LOW'       };
    case 'Medium':   return { bg: 'bg-yellow-950/30', border: 'border-yellow-800/60', text: 'text-yellow-400', label: 'MEDIUM'    };
    case 'High':     return { bg: 'bg-orange-950/30', border: 'border-orange-800/60', text: 'text-orange-400', label: 'HIGH'      };
    case 'Critical': return { bg: 'bg-red-950/30',    border: 'border-red-800/60',    text: 'text-red-400',    label: 'CRITICAL'  };
  }
}

// ─── Smart Restock ────────────────────────────────────────────────────────────

export interface RestockSection {
  category:    RestockCategory;
  description: string;
  why:         string;
  items:       InventoryItem[];
}

const TODAY_JOBS_IDS = ['summit', 'northgate', 'ridgeline'];

export function generateRestockSections(inventory: InventoryItem[]): RestockSection[] {
  const criticalToday = inventory.filter(i =>
    itemStatus(i) === 'missing' && i.requiredFor.some(j => TODAY_JOBS_IDS.includes(j)),
  );

  const likelyToday = inventory.filter(i => {
    if (criticalToday.includes(i)) return false;
    const s = itemStatus(i);
    return (
      (s === 'missing' && i.recommendedFor.some(j => TODAY_JOBS_IDS.includes(j))) ||
      (s === 'low'     && i.requiredFor.some(j => TODAY_JOBS_IDS.includes(j)))
    );
  });

  const recThisWeek = inventory.filter(i => {
    if (criticalToday.includes(i) || likelyToday.includes(i)) return false;
    const s = itemStatus(i);
    return s !== 'ready' && (
      i.aiTags?.includes('High Failure Item') ||
      i.aiTags?.includes('Fast Moving') ||
      i.aiTags?.includes('Critical Spare')
    );
  });

  const shopStock = inventory.filter(i => {
    if (criticalToday.includes(i) || likelyToday.includes(i) || recThisWeek.includes(i)) return false;
    return itemStatus(i) !== 'ready';
  });

  const seasonal = inventory.filter(i =>
    i.aiTags?.includes('Seasonal') &&
    itemStatus(i) !== 'ready' &&
    !criticalToday.includes(i) && !likelyToday.includes(i),
  );

  return ([
    {
      category:    'Critical Today',
      description: "Cannot complete today's scheduled work without these",
      why:         'Required for active work orders. A return trip is guaranteed if missing.',
      items:       criticalToday,
    },
    {
      category:    'Likely Today',
      description: "High probability of needing on today's calls",
      why:         'Based on job history, equipment patterns, and active fault codes.',
      items:       likelyToday,
    },
    {
      category:    'Recommended This Week',
      description: 'AI-recommended — usage patterns and failure history',
      why:         'High-failure items, fast-movers, or critical spares running low.',
      items:       recThisWeek,
    },
    {
      category:    'Shop Stock',
      description: 'Standard van stock below minimum quantity',
      why:         'Not needed today — restock before next dispatch.',
      items:       shopStock,
    },
    {
      category:    'Seasonal',
      description: 'Summer high-heat priority items',
      why:         'Peak cooling season — elevated demand for refrigerant and capacitors.',
      items:       seasonal,
    },
  ] as RestockSection[]).filter(s => s.items.length > 0);
}

// ─── Morning Brief ────────────────────────────────────────────────────────────

export interface MorningBrief {
  todayReadiness: number;
  jobCount:       number;
  highestRiskJob: string;
  highestRisk:    ReturnTripRisk;
  mustGrab:       Array<{ name: string; reason: string }>;
  leaveBehind:    Array<{ name: string; reason: string }>;
  weatherNote:    string;
  tempF:          number;
  aiInsights:     string[];
}

export function generateMorningBrief(
  inventory: InventoryItem[],
  toolsScores: { summit: number; northgate: number; ridgeline: number },
): MorningBrief {
  const likelihoods = {
    summit:    computeFirstVisitLikelihood(inventory, toolsScores.summit,    'summit'),
    northgate: computeFirstVisitLikelihood(inventory, toolsScores.northgate, 'northgate'),
    ridgeline: computeFirstVisitLikelihood(inventory, toolsScores.ridgeline, 'ridgeline'),
  };

  const todayReadiness = Math.round(
    (likelihoods.summit + likelihoods.northgate + likelihoods.ridgeline) / 3,
  );

  const sortedByRisk = Object.entries(likelihoods).sort(([, a], [, b]) => a - b);
  const [highestRiskJobId, highestRiskScore] = sortedByRisk[0];
  const highestRiskJobName = JOB_INFO[highestRiskJobId]?.name ?? highestRiskJobId;

  const mustGrab: Array<{ name: string; reason: string }> = inventory
    .filter(i => {
      const s = itemStatus(i);
      return (s === 'missing' || s === 'low') &&
        i.requiredFor.some(j => TODAY_JOBS_IDS.includes(j));
    })
    .slice(0, 6)
    .map(i => ({
      name:   i.name,
      reason: i.aiRec ?? `Required for ${i.requiredFor.map(j => JOB_INFO[j]?.abbr ?? j).join(', ')}`,
    }));

  const leaveBehind: Array<{ name: string; reason: string }> = inventory
    .filter(i =>
      i.aiTags?.includes('Large Item') &&
      i.requiredFor.length === 0 &&
      i.recommendedFor.length === 0 &&
      i.niceToHaveFor.length === 0,
    )
    .map(i => ({ name: i.name, reason: 'Not required for any scheduled job today' }));

  const missingCount = inventory.filter(i => itemStatus(i) === 'missing').length;
  const lowCount     = inventory.filter(i => itemStatus(i) === 'low').length;
  const capLow       = inventory.filter(i => i.category === 'Capacitors' && itemStatus(i) !== 'ready').length;
  const refLow       = inventory.filter(i => i.category === 'Refrigerant' && itemStatus(i) !== 'ready').length;

  const aiInsights: string[] = [];
  if (missingCount > 0)
    aiInsights.push(`${missingCount} part${missingCount !== 1 ? 's' : ''} are out of stock — restock before dispatch.`);
  if (lowCount > 0)
    aiInsights.push(`${lowCount} part${lowCount !== 1 ? 's' : ''} are below minimum stock level.`);
  if (capLow > 0)
    aiInsights.push('Capacitor stock is low — most common summer failure part across all units.');
  if (refLow > 0)
    aiInsights.push('Refrigerant stock is below minimum — ensure adequate supply before refrigerant calls.');
  if (aiInsights.length === 0)
    aiInsights.push('Van inventory is well stocked and ready for dispatch.');

  return {
    todayReadiness,
    jobCount:       0,
    highestRiskJob: '',
    highestRisk:    computeReturnTripRisk(highestRiskScore),
    mustGrab,
    leaveBehind,
    weatherNote:    '',
    tempF:          0,
    aiInsights,
  };
}

// ─── Nearby Techs (Borrow From Another Van) ────────────────────────────────────

export interface NearbyTech {
  id:          string;
  name:        string;
  initials:    string;
  distanceMi:  number;
  etaMin:      number;
  vanId:       string;
  status:      'available' | 'on-call' | 'en-route';
  availItems:  Array<{ id: string; name: string; qty: number; unit: string }>;
}

export const NEARBY_TECHS: NearbyTech[] = [
  {
    id:         'tech-kevin',
    name:       'Kevin Marsh',
    initials:   'KM',
    distanceMi: 2.1,
    etaMin:     8,
    vanId:      'Unit #31',
    status:     'available',
    availItems: [
      { id: 'contactor-30a', name: '2-Pole 30A Contactor',        qty: 2, unit: 'each' },
      { id: 'cap-35-5',      name: '35/5 MFD Dual Capacitor',     qty: 1, unit: 'each' },
      { id: 'fan-blade-18',  name: 'Condenser Fan Blade 18"',     qty: 1, unit: 'each' },
      { id: 'fuse-3a',       name: '3A Control Fuse',             qty: 6, unit: 'each' },
      { id: 'ps-high',       name: 'High-Pressure Safety Switch', qty: 1, unit: 'each' },
    ],
  },
  {
    id:         'tech-sam',
    name:       'Sam Torres',
    initials:   'ST',
    distanceMi: 4.7,
    etaMin:     18,
    vanId:      'Unit #52',
    status:     'on-call',
    availItems: [
      { id: 'motor-cond-fan', name: 'Condenser Fan Motor 1/3 HP',  qty: 1, unit: 'each' },
      { id: 'contactor-40a',  name: '3-Pole 40A Contactor',        qty: 1, unit: 'each' },
      { id: 'cap-40-5',       name: '40/5 MFD Dual Capacitor',     qty: 1, unit: 'each' },
      { id: 'xfmr-40va',      name: '40VA Control Transformer',    qty: 1, unit: 'each' },
    ],
  },
];
