export type ItemStatus = 'ready' | 'low' | 'missing';

export type ItemCategory =
  | 'Refrigerant' | 'Capacitors' | 'Contactors' | 'Motors' | 'Fan Blades'
  | 'Bearings' | 'Belts' | 'Filters' | 'Fuses' | 'Chemicals'
  | 'Controls' | 'Tools' | 'Test Instruments' | 'PPE' | 'Miscellaneous';

export const ALL_CATEGORIES: ItemCategory[] = [
  'Refrigerant', 'Capacitors', 'Contactors', 'Motors', 'Fan Blades',
  'Bearings', 'Belts', 'Filters', 'Fuses', 'Chemicals',
  'Controls', 'Tools', 'Test Instruments', 'PPE', 'Miscellaneous',
];

export interface InventoryItem {
  id: string;
  name: string;
  category: ItemCategory;
  qty: number;
  minQty: number;
  unit: string;
  requiredFor: string[];
  recommendedFor: string[];
  lastUsed?: string;
  usagePattern?: string;
  aiRec?: string;
}

export function itemStatus(item: InventoryItem): ItemStatus {
  if (item.qty === 0) return 'missing';
  if (item.qty < item.minQty) return 'low';
  return 'ready';
}

const W_MISSING_REQUIRED    = 15;
const W_LOW_REQUIRED        = 7;
const W_MISSING_RECOMMENDED = 5;
const W_LOW_RECOMMENDED     = 2;

export function computeJobReadiness(inventory: InventoryItem[], jobId: string): number {
  let score = 100;
  for (const item of inventory) {
    const s = itemStatus(item);
    if (item.requiredFor.includes(jobId)) {
      if (s === 'missing') score -= W_MISSING_REQUIRED;
      else if (s === 'low') score -= W_LOW_REQUIRED;
    } else if (item.recommendedFor.includes(jobId)) {
      if (s === 'missing') score -= W_MISSING_RECOMMENDED;
      else if (s === 'low') score -= W_LOW_RECOMMENDED;
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

export function readinessBadge(score: number): { label: string; color: string; dot: string } {
  if (score >= 90) return { label: 'Fully Stocked',     color: 'text-green-400',  dot: '🟢' };
  if (score >= 75) return { label: 'Mostly Ready',      color: 'text-yellow-400', dot: '🟡' };
  if (score >= 50) return { label: 'Missing Items',     color: 'text-orange-400', dot: '🟡' };
  return           { label: 'Critical Missing',         color: 'text-red-400',    dot: '🔴' };
}

export const INITIAL_INVENTORY: InventoryItem[] = [
  // ── Refrigerant (6) ──────────────────────────────────────────────────────────
  {
    id: 'r410a', name: 'R-410A Refrigerant',
    category: 'Refrigerant', qty: 1, minQty: 2, unit: 'cylinder',
    requiredFor: ['summit'], recommendedFor: [],
    lastUsed: 'Jun 26', usagePattern: 'Used on most refrigerant calls',
    aiRec: 'Summit Medical has high-pressure history — carry a full cylinder for potential charge work.',
  },
  {
    id: 'r22', name: 'R-22 Refrigerant (recovery)',
    category: 'Refrigerant', qty: 1, minQty: 1, unit: 'cylinder',
    requiredFor: [], recommendedFor: [],
    lastUsed: 'Jun 10', usagePattern: 'Legacy equipment recovery only',
    aiRec: 'For recovery of older R-22 systems only. Cannot be re-used for recharging.',
  },
  {
    id: 'r407c', name: 'R-407C Refrigerant',
    category: 'Refrigerant', qty: 0, minQty: 1, unit: 'cylinder',
    requiredFor: [], recommendedFor: [],
    lastUsed: 'Jun 3', usagePattern: 'R-22 replacement retrofit work',
    aiRec: 'Out of stock. Add to restock if R-22 retrofit work is scheduled.',
  },
  {
    id: 'r134a', name: 'R-134a Refrigerant',
    category: 'Refrigerant', qty: 1, minQty: 1, unit: 'cylinder',
    requiredFor: [], recommendedFor: [],
    lastUsed: 'May 28', usagePattern: 'Chiller and specialty equipment',
    aiRec: 'Stocked. No chiller work scheduled today.',
  },
  {
    id: 'r32', name: 'R-32 Refrigerant',
    category: 'Refrigerant', qty: 0, minQty: 1, unit: 'cylinder',
    requiredFor: [], recommendedFor: [],
    lastUsed: 'Jun 1', usagePattern: 'Mini-split systems',
    aiRec: 'Out of stock. No mini-split work scheduled today.',
  },
  // ── Capacitors (8) ──────────────────────────────────────────────────────────
  {
    id: 'cap-35-5', name: '35/5 MFD Dual Run Capacitor',
    category: 'Capacitors', qty: 1, minQty: 2, unit: 'each',
    requiredFor: [], recommendedFor: ['summit'],
    lastUsed: 'Jun 26', usagePattern: 'Replaced 4 this month',
    aiRec: 'Summit Medical has repeated Code 82 history. Condenser fan capacitor is the primary suspect. Carry at least two.',
  },
  {
    id: 'cap-45-5', name: '45/5 MFD Dual Run Capacitor',
    category: 'Capacitors', qty: 2, minQty: 2, unit: 'each',
    requiredFor: [], recommendedFor: [],
    lastUsed: 'Jun 24', usagePattern: 'Average 1–2 per week',
    aiRec: 'Good stock. Carry as backup for larger condenser motors.',
  },
  {
    id: 'cap-40-5', name: '40/5 MFD Dual Run Capacitor',
    category: 'Capacitors', qty: 1, minQty: 2, unit: 'each',
    requiredFor: [], recommendedFor: [],
    lastUsed: 'Jun 19', usagePattern: 'Common on mid-size rooftop units',
    aiRec: 'Below minimum. Restock before next PM cycle.',
  },
  {
    id: 'cap-50-7', name: '50/7.5 MFD Dual Run Capacitor',
    category: 'Capacitors', qty: 2, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: [],
    lastUsed: 'Jun 15', usagePattern: 'Larger compressors',
    aiRec: 'Stock is adequate.',
  },
  {
    id: 'cap-30-5', name: '30/5 MFD Dual Run Capacitor',
    category: 'Capacitors', qty: 0, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: [],
    lastUsed: 'Jun 8', usagePattern: 'Smaller split systems',
    aiRec: 'Out of stock. Add to restock list.',
  },
  {
    id: 'cap-5mfd', name: '5 MFD Run Capacitor',
    category: 'Capacitors', qty: 3, minQty: 2, unit: 'each',
    requiredFor: [], recommendedFor: [],
    lastUsed: 'Jun 22', usagePattern: 'Condenser fan motor-only capacitor',
    aiRec: 'Adequate stock.',
  },
  // ── Contactors (4) ──────────────────────────────────────────────────────────
  {
    id: 'contactor-30a', name: '2-Pole 30A Contactor',
    category: 'Contactors', qty: 1, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: ['summit'],
    lastUsed: 'Jun 21', usagePattern: 'Most common size',
    aiRec: 'RTU-3 contactor history shows arcing. Replacement may be needed today.',
  },
  {
    id: 'contactor-40a', name: '3-Pole 40A Contactor',
    category: 'Contactors', qty: 0, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: ['summit'],
    lastUsed: 'Jun 12', usagePattern: 'Compressor-side replacement',
    aiRec: 'Out of stock. Consider restocking before the Summit Medical call.',
  },
  {
    id: 'contactor-40a-2p', name: '2-Pole 40A Contactor',
    category: 'Contactors', qty: 1, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: [],
    lastUsed: 'Jun 5', usagePattern: 'Larger single-phase compressors',
    aiRec: 'One on hand — adequate.',
  },
  {
    id: 'contactor-25a', name: '3-Pole 25A Contactor',
    category: 'Contactors', qty: 2, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: ['ridgeline'],
    lastUsed: 'Jun 16', usagePattern: 'AHU compressor and control circuits',
    aiRec: 'Good stock.',
  },
  // ── Motors (4) ───────────────────────────────────────────────────────────────
  {
    id: 'motor-cond-fan', name: 'Condenser Fan Motor 1/3 HP',
    category: 'Motors', qty: 0, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: ['summit'],
    lastUsed: 'Jun 10', usagePattern: 'High-demand in summer',
    aiRec: 'RTU-3 condenser fan is a suspected root cause of Code 82. Carrying a motor avoids a return trip.',
  },
  {
    id: 'motor-cond-fan-quarter', name: 'Condenser Fan Motor 1/4 HP',
    category: 'Motors', qty: 1, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: [],
    lastUsed: 'Jun 6', usagePattern: 'Smaller condensing units',
    aiRec: 'One on hand — adequate.',
  },
  {
    id: 'motor-blower', name: 'Blower Motor 1/3 HP PSC',
    category: 'Motors', qty: 0, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: ['ridgeline'],
    lastUsed: 'Jun 2', usagePattern: 'AHU blower replacement',
    aiRec: 'Out of stock. AHU-5 vibration could indicate bearing failure leading to motor replacement.',
  },
  {
    id: 'motor-ecm', name: 'ECM Blower Motor (Universal)',
    category: 'Motors', qty: 0, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: [],
    lastUsed: 'May 20', usagePattern: 'Variable-speed AHU replacement',
    aiRec: 'Out of stock. Typically special-order — order if ECM failure suspected.',
  },
  // ── Fan Blades (3) ──────────────────────────────────────────────────────────
  {
    id: 'fan-blade-18', name: 'Condenser Fan Blade 18"',
    category: 'Fan Blades', qty: 1, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: ['summit'],
    lastUsed: 'Jun 4', usagePattern: 'RTU condenser replacement',
    aiRec: 'Check blade condition during RTU-3 condenser fan inspection.',
  },
  {
    id: 'fan-blade-20', name: 'Condenser Fan Blade 20"',
    category: 'Fan Blades', qty: 0, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: [],
    lastUsed: 'May 30', usagePattern: 'Larger RTU condenser',
    aiRec: 'Out of stock. Restock for larger rooftop units.',
  },
  {
    id: 'fan-blade-22', name: 'Condenser Fan Blade 22"',
    category: 'Fan Blades', qty: 1, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: [],
    lastUsed: 'Jun 1', usagePattern: 'Large commercial RTU',
    aiRec: 'One on hand.',
  },
  // ── Bearings (3) ────────────────────────────────────────────────────────────
  {
    id: 'bearing-half', name: 'Pillow Block Bearing 1/2" bore',
    category: 'Bearings', qty: 2, minQty: 2, unit: 'each',
    requiredFor: ['ridgeline'], recommendedFor: [],
    lastUsed: 'Jun 18', usagePattern: 'AHU shaft bearing replacement',
    aiRec: 'AHU-5 vibration trend indicates bearing wear. Carry at least two.',
  },
  {
    id: 'bearing-five-eighths', name: 'Pillow Block Bearing 5/8" bore',
    category: 'Bearings', qty: 1, minQty: 2, unit: 'each',
    requiredFor: [], recommendedFor: ['ridgeline'],
    lastUsed: 'Jun 11', usagePattern: 'Larger AHU bearing',
    aiRec: 'Below minimum. AHU-5 may have larger bore — confirm before restocking.',
  },
  {
    id: 'bearing-6204', name: 'Ball Bearing 6204-2RS',
    category: 'Bearings', qty: 2, minQty: 2, unit: 'each',
    requiredFor: [], recommendedFor: [],
    lastUsed: 'Jun 9', usagePattern: 'Fan motor and pump bearings',
    aiRec: 'Good stock.',
  },
  // ── Belts (5) ────────────────────────────────────────────────────────────────
  {
    id: 'belt-a40', name: 'Belt A-40',
    category: 'Belts', qty: 2, minQty: 1, unit: 'each',
    requiredFor: ['ridgeline'], recommendedFor: [],
    lastUsed: 'Jun 20', usagePattern: 'Standard AHU belt',
    aiRec: 'Confirmed belt size for AHU-5 at Ridgeline — stocked and ready.',
  },
  {
    id: 'belt-b52', name: 'Belt B-52',
    category: 'Belts', qty: 0, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: ['ridgeline'],
    lastUsed: 'Jun 5', usagePattern: 'Larger AHU belt',
    aiRec: 'Carry as backup for Ridgeline — belt size confirmed on previous visit.',
  },
  {
    id: 'belt-a38', name: 'Belt A-38',
    category: 'Belts', qty: 1, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: [],
    lastUsed: 'Jun 14', usagePattern: 'Smaller AHU belt',
    aiRec: 'One on hand — adequate.',
  },
  {
    id: 'belt-a42', name: 'Belt A-42',
    category: 'Belts', qty: 0, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: [],
    lastUsed: 'Jun 7', usagePattern: 'Slightly longer AHU belt',
    aiRec: 'Out of stock. Add to routine restock.',
  },
  {
    id: 'belt-b60', name: 'Belt B-60',
    category: 'Belts', qty: 1, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: [],
    lastUsed: 'May 25', usagePattern: 'Large commercial AHU',
    aiRec: 'One on hand.',
  },
  // ── Filters (4) ─────────────────────────────────────────────────────────────
  {
    id: 'filter-20x20', name: '20×20×1 Air Filter',
    category: 'Filters', qty: 6, minQty: 4, unit: 'each',
    requiredFor: ['ridgeline'], recommendedFor: [],
    lastUsed: 'Jun 20', usagePattern: 'Standard PM filter',
    aiRec: 'Adequate for Ridgeline PM.',
  },
  {
    id: 'filter-16x25', name: '16×25×1 Air Filter',
    category: 'Filters', qty: 2, minQty: 4, unit: 'each',
    requiredFor: [], recommendedFor: ['northgate'],
    lastUsed: 'Jun 15', usagePattern: 'Northgate CRAC filter size',
    aiRec: 'Below minimum. Consider restocking before the Northgate call.',
  },
  {
    id: 'filter-24x24', name: '24×24×2 MERV-8 Filter',
    category: 'Filters', qty: 4, minQty: 4, unit: 'each',
    requiredFor: [], recommendedFor: [],
    lastUsed: 'Jun 13', usagePattern: 'Commercial AHU MERV-8 filters',
    aiRec: 'Adequate stock.',
  },
  {
    id: 'filter-20x25', name: '20×25×4 MERV-11 Filter',
    category: 'Filters', qty: 2, minQty: 2, unit: 'each',
    requiredFor: [], recommendedFor: [],
    lastUsed: 'Jun 8', usagePattern: 'High-efficiency commercial units',
    aiRec: 'Stocked.',
  },
  // ── Fuses (4) ────────────────────────────────────────────────────────────────
  {
    id: 'fuse-3a', name: '3A Control Fuses',
    category: 'Fuses', qty: 0, minQty: 10, unit: 'each',
    requiredFor: [], recommendedFor: ['summit', 'northgate'],
    lastUsed: 'Jun 23', usagePattern: 'Replaced frequently on commercial units',
    aiRec: 'Stock is empty. Add to restock before departure.',
  },
  {
    id: 'fuse-15a', name: '15A Cartridge Fuses',
    category: 'Fuses', qty: 6, minQty: 5, unit: 'each',
    requiredFor: [], recommendedFor: [],
    lastUsed: 'Jun 18', usagePattern: 'Disconnect block fuses',
    aiRec: 'Stock is adequate.',
  },
  {
    id: 'fuse-30a', name: '30A Cartridge Fuses',
    category: 'Fuses', qty: 4, minQty: 4, unit: 'each',
    requiredFor: [], recommendedFor: [],
    lastUsed: 'Jun 14', usagePattern: 'Condenser disconnect fuses',
    aiRec: 'Good stock.',
  },
  {
    id: 'fuse-5a', name: '5A Control Fuses',
    category: 'Fuses', qty: 8, minQty: 5, unit: 'each',
    requiredFor: [], recommendedFor: [],
    lastUsed: 'Jun 20', usagePattern: 'Control board protection',
    aiRec: 'Adequate.',
  },
  // ── Chemicals (5) ────────────────────────────────────────────────────────────
  {
    id: 'coil-cleaner', name: 'Foam Coil Cleaner',
    category: 'Chemicals', qty: 2, minQty: 2, unit: 'can',
    requiredFor: ['summit'], recommendedFor: ['ridgeline'],
    lastUsed: 'Jun 26', usagePattern: 'Used on nearly every PM',
    aiRec: 'Required for Summit Medical condenser cleaning. Stock is ready.',
  },
  {
    id: 'contact-cleaner', name: 'Electrical Contact Cleaner',
    category: 'Chemicals', qty: 1, minQty: 1, unit: 'can',
    requiredFor: [], recommendedFor: [],
    lastUsed: 'Jun 20', usagePattern: 'Contactor and board cleaning',
    aiRec: 'Stocked.',
  },
  {
    id: 'evap-treatment', name: 'Evap Coil Treatment (Nu-Calgon)',
    category: 'Chemicals', qty: 1, minQty: 1, unit: 'gallon',
    requiredFor: [], recommendedFor: ['northgate'],
    lastUsed: 'Jun 16', usagePattern: 'CRAC evaporator coil PM',
    aiRec: 'Good to apply during Northgate CRAC PM.',
  },
  {
    id: 'drain-tabs', name: 'Drain Pan Treatment Tablets',
    category: 'Chemicals', qty: 12, minQty: 6, unit: 'each',
    requiredFor: [], recommendedFor: ['ridgeline'],
    lastUsed: 'Jun 20', usagePattern: 'Placed in drain pan during every PM',
    aiRec: 'Adequate stock.',
  },
  {
    id: 'leak-detect-spray', name: 'Leak Detection Spray',
    category: 'Chemicals', qty: 1, minQty: 1, unit: 'can',
    requiredFor: [], recommendedFor: ['summit'],
    lastUsed: 'Jun 25', usagePattern: 'Field verification of refrigerant leaks',
    aiRec: 'Use alongside electronic leak detector for visual confirmation.',
  },
  // ── Controls (3) ─────────────────────────────────────────────────────────────
  {
    id: 'humidifier-canister', name: 'Humidifier Canister (Liebert DS)',
    category: 'Controls', qty: 0, minQty: 1, unit: 'each',
    requiredFor: ['northgate'], recommendedFor: [],
    lastUsed: 'May 30', usagePattern: 'Scheduled PM — every 90 days at Northgate',
    aiRec: "Required for today's CRAC-3 PM. This call cannot be completed without it.",
  },
  {
    id: 'thermostat-7day', name: '7-Day Programmable Thermostat',
    category: 'Controls', qty: 1, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: [],
    lastUsed: 'Jun 10', usagePattern: 'Occasional replacement',
    aiRec: 'Good to carry as a spare.',
  },
  {
    id: 'pressure-switch', name: 'High-Pressure Safety Switch',
    category: 'Controls', qty: 0, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: ['summit'],
    lastUsed: 'Jun 3', usagePattern: 'Replaced when high-pressure lockout is tripped repeatedly',
    aiRec: 'Summit Medical RTU-3 has repeated high-pressure lockouts. Switch may need testing or replacement.',
  },
  // ── Tools (5) ────────────────────────────────────────────────────────────────
  {
    id: 'vacuum-pump', name: 'Vacuum Pump (2-stage)',
    category: 'Tools', qty: 1, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: ['summit'],
    lastUsed: 'Jun 26', usagePattern: 'Every refrigerant circuit opening',
    aiRec: 'Ready. Needed if Summit Medical requires refrigerant circuit work.',
  },
  {
    id: 'recovery-machine', name: 'Refrigerant Recovery Machine',
    category: 'Tools', qty: 1, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: ['summit'],
    lastUsed: 'Jun 20', usagePattern: 'Required before any system opening',
    aiRec: 'Ready. Required by EPA 608 for any refrigerant system work.',
  },
  {
    id: 'torch-kit', name: 'Torch Kit (MAPP Gas)',
    category: 'Tools', qty: 1, minQty: 1, unit: 'set',
    requiredFor: [], recommendedFor: [],
    lastUsed: 'Jun 14', usagePattern: 'Brazing copper line sets',
    aiRec: 'Ready. Check gas level before departure.',
  },
  {
    id: 'cordless-drill', name: 'Cordless Drill + Bits',
    category: 'Tools', qty: 1, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: [],
    lastUsed: 'Jun 26', usagePattern: 'Every service call',
    aiRec: 'Check battery charge before departure.',
  },
  {
    id: 'wire-stripper', name: 'Wire Stripper / Crimper',
    category: 'Tools', qty: 1, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: [],
    lastUsed: 'Jun 25', usagePattern: 'Electrical work on every call',
    aiRec: 'Stocked.',
  },
  // ── Test Instruments (5) ─────────────────────────────────────────────────────
  {
    id: 'manifold', name: 'Manifold Gauge Set',
    category: 'Test Instruments', qty: 1, minQty: 1, unit: 'set',
    requiredFor: ['summit'], recommendedFor: [],
    lastUsed: 'Jun 26', usagePattern: 'Every refrigerant call',
    aiRec: 'Required for RTU-3 head pressure diagnostics.',
  },
  {
    id: 'pressure-probes', name: 'Static Pressure Probes',
    category: 'Test Instruments', qty: 1, minQty: 1, unit: 'set',
    requiredFor: ['northgate', 'ridgeline'], recommendedFor: [],
    lastUsed: 'Jun 26', usagePattern: 'Required for CRAC and AHU PMs',
    aiRec: 'Needed for both Northgate and Ridgeline today.',
  },
  {
    id: 'multimeter', name: 'Digital Multimeter (Fluke 117)',
    category: 'Test Instruments', qty: 1, minQty: 1, unit: 'each',
    requiredFor: ['summit', 'northgate', 'ridgeline'], recommendedFor: [],
    lastUsed: 'Jun 26', usagePattern: 'Every call',
    aiRec: 'Essential — needed on all three calls today.',
  },
  {
    id: 'clamp-meter', name: 'Clamp Meter (Fluke 902)',
    category: 'Test Instruments', qty: 1, minQty: 1, unit: 'each',
    requiredFor: ['summit', 'ridgeline'], recommendedFor: [],
    lastUsed: 'Jun 26', usagePattern: 'Amp draw measurements',
    aiRec: 'Needed for AHU-5 motor amp verification at Ridgeline.',
  },
  {
    id: 'leak-detector', name: 'Electronic Refrigerant Leak Detector',
    category: 'Test Instruments', qty: 1, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: ['summit'],
    lastUsed: 'Jun 24', usagePattern: 'Every refrigerant call',
    aiRec: 'Use to verify leak-free connections after any refrigerant work.',
  },
  // ── PPE (5) ──────────────────────────────────────────────────────────────────
  {
    id: 'n95', name: 'N95 Respirator Masks',
    category: 'PPE', qty: 5, minQty: 5, unit: 'each',
    requiredFor: [], recommendedFor: [],
    lastUsed: 'Jun 25', usagePattern: 'Coil cleaning and chemical work',
    aiRec: "Adequate for today's route.",
  },
  {
    id: 'safety-glasses', name: 'Safety Glasses',
    category: 'PPE', qty: 2, minQty: 2, unit: 'pair',
    requiredFor: [], recommendedFor: [],
    lastUsed: 'Jun 26', usagePattern: 'Required on all sites',
    aiRec: 'Stocked.',
  },
  {
    id: 'nitrile-gloves', name: 'Nitrile Gloves (box)',
    category: 'PPE', qty: 1, minQty: 1, unit: 'box',
    requiredFor: [], recommendedFor: [],
    lastUsed: 'Jun 26', usagePattern: 'Chemical and refrigerant handling',
    aiRec: 'One box adequate for today.',
  },
  {
    id: 'ear-protection', name: 'Foam Ear Protection',
    category: 'PPE', qty: 10, minQty: 5, unit: 'each',
    requiredFor: [], recommendedFor: [],
    lastUsed: 'Jun 22', usagePattern: 'Mechanical room and loud equipment',
    aiRec: 'Good stock.',
  },
  {
    id: 'hard-hat', name: 'Hard Hat (Class E)',
    category: 'PPE', qty: 1, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: [],
    lastUsed: 'Jun 20', usagePattern: 'Required on all construction sites',
    aiRec: 'Stocked.',
  },
  // ── Miscellaneous (6) ────────────────────────────────────────────────────────
  {
    id: 'schrader-cores', name: 'Schrader Valve Cores (10-pk)',
    category: 'Miscellaneous', qty: 2, minQty: 1, unit: 'pack',
    requiredFor: [], recommendedFor: ['summit'],
    lastUsed: 'Jun 23', usagePattern: 'Replace on every refrigerant service',
    aiRec: 'Good stock.',
  },
  {
    id: 'teflon-tape', name: 'Teflon Thread Tape',
    category: 'Miscellaneous', qty: 3, minQty: 2, unit: 'roll',
    requiredFor: [], recommendedFor: [],
    lastUsed: 'Jun 21', usagePattern: 'Pipe fittings and connections',
    aiRec: 'Adequate.',
  },
  {
    id: 'copper-tubing', name: '1/4" OD Copper Tubing (5ft)',
    category: 'Miscellaneous', qty: 1, minQty: 1, unit: 'coil',
    requiredFor: [], recommendedFor: [],
    lastUsed: 'Jun 14', usagePattern: 'Refrigerant line patching',
    aiRec: 'One coil on hand.',
  },
  {
    id: 'wire-connectors', name: 'Wire Connectors (assorted)',
    category: 'Miscellaneous', qty: 1, minQty: 1, unit: 'bag',
    requiredFor: [], recommendedFor: [],
    lastUsed: 'Jun 26', usagePattern: 'Control wiring on every call',
    aiRec: 'Stocked.',
  },
  {
    id: 'elec-tape', name: 'Electrical Tape (3-pk)',
    category: 'Miscellaneous', qty: 2, minQty: 1, unit: 'each',
    requiredFor: [], recommendedFor: [],
    lastUsed: 'Jun 26', usagePattern: 'Wire insulation and labeling',
    aiRec: 'Adequate.',
  },
  {
    id: 'zip-ties', name: 'Cable Zip Ties (assorted)',
    category: 'Miscellaneous', qty: 1, minQty: 1, unit: 'bag',
    requiredFor: [], recommendedFor: [],
    lastUsed: 'Jun 24', usagePattern: 'Wire management and filter retention',
    aiRec: 'Stocked.',
  },
];

export const INITIAL_READINESS = computeOverallReadiness(INITIAL_INVENTORY);

export function aiVanSummary(inventory: InventoryItem[]): string {
  const missingRequired = inventory.filter(
    i => i.requiredFor.length > 0 && itemStatus(i) === 'missing',
  );
  const lowRequired = inventory.filter(
    i => i.requiredFor.length > 0 && itemStatus(i) === 'low',
  );
  const parts: string[] = [];
  if (missingRequired.length > 0) {
    const names  = missingRequired.map(i => i.name).join(' and ');
    const jobSet = [...new Set(missingRequired.flatMap(i => i.requiredFor))];
    const jobs   = jobSet.map(j => JOB_INFO[j]?.abbr ?? j).join(' and ');
    parts.push(`You're missing ${names} — required for ${jobs}. These calls cannot be completed without them.`);
  }
  if (lowRequired.length > 0) {
    const names = lowRequired.map(i => i.name).join(' and ');
    parts.push(`${names} ${lowRequired.length === 1 ? 'is' : 'are'} below minimum stock.`);
  }
  if (parts.length === 0) {
    return "Your truck is fully loaded. You're ready for today's complete route.";
  }
  parts.push("Consider stopping at the supply house before your second call.");
  return parts.join(' ');
}

export const AI_STOCK_LIST: { item: string; reason: string; ok: 'ready' | 'low' | 'missing' }[] = [
  { item: 'Foam Coil Cleaner',           reason: 'Summit Medical condenser cleaning',           ok: 'ready'   },
  { item: 'Manifold Gauge Set',          reason: 'RTU-3 head pressure diagnostics',             ok: 'ready'   },
  { item: 'R-410A (full cylinder)',       reason: 'Potential charge work at Summit',             ok: 'low'     },
  { item: 'Humidifier Canister',         reason: 'Northgate CRAC-3 scheduled PM',               ok: 'missing' },
  { item: 'Static Pressure Probes',      reason: 'Northgate + Ridgeline PM checks',             ok: 'ready'   },
  { item: '35/5 Dual Capacitor (×2)',    reason: 'RTU-3 repeated capacitor history',            ok: 'low'     },
  { item: 'Belt A-40',                   reason: 'AHU-5 belt inspection at Ridgeline',          ok: 'ready'   },
  { item: '3A Control Fuses (×10)',      reason: 'Common on all three sites — stock is empty',  ok: 'missing' },
  { item: 'Condenser Fan Motor 1/3 HP',  reason: 'RTU-3 suspected root cause — avoid return',  ok: 'missing' },
];
