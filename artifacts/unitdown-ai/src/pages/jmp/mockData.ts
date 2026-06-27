import type { MeasurementReading } from './types';

export const MOCK_JOB = {
  id: 'JM-2026-0047',
  customer: 'Summit Medical Plaza',
  address: '4521 Medical Drive, Dallas TX 75201',
  equipment: 'Carrier 50XCQ006 — RTU-3',
  equipmentShort: 'RTU-3',
  location: 'Rooftop, North Wing',
  symptom: 'Unit not cooling — high pressure alarm active',
  technician: 'Marcus Rivera',
  techInitials: 'MR',
  date: 'June 27, 2026',
  dispatcher: 'Sarah (office)',
  priority: 'High' as const,
  dispatchTime: '07:45',
  arrivalTime: '08:14',
  usrId: 'USR-2026-004921',
  weather: '91°F · Partly Cloudy · Humidity 62%',
};

export const MOCK_EQUIPMENT = {
  make: 'Carrier',
  model: '50XCQ006006',
  serial: '4321A8876',
  capacity: '7.5 Ton',
  refrigerant: 'R-410A',
  voltage: '208/230V 3-Phase',
  installDate: 'March 2019 (est.)',
  age: '7 years',
  location: 'Rooftop — North Wing',
  type: 'Packaged Rooftop Unit',
};

export const MOCK_HISTORY = [
  { date: 'Apr 2025', tech: 'D. Carter', summary: 'Code 82 — High Pressure. Cleared alarm, recommended condenser coil cleaning.' },
  { date: 'Aug 2024', tech: 'M. Rivera', summary: 'Code 82 — High Pressure. Cleared and restarted. Coil restriction suspected.' },
  { date: 'Mar 2024', tech: 'D. Carter', summary: 'Preventive Maintenance. Belt replaced (3VX425). All readings within spec.' },
];

export const INITIAL_MEASUREMENTS: MeasurementReading[] = [
  { label: 'Supply Air', value: '61', unit: '°F', status: 'warn', target: '55–58°F', verificationValue: '56', verificationStatus: 'ok' },
  { label: 'Return Air', value: '72', unit: '°F', status: 'ok', target: '—', verificationValue: '72', verificationStatus: 'ok' },
  { label: 'Delta T', value: '11', unit: '°F', status: 'warn', target: '15–20°F', verificationValue: '16', verificationStatus: 'ok' },
  { label: 'Suction Pressure', value: '115', unit: 'psi', status: 'ok', target: '118–125', verificationValue: '121', verificationStatus: 'ok' },
  { label: 'Head Pressure', value: '385', unit: 'psi', status: 'alert', target: '260–290', verificationValue: '278', verificationStatus: 'ok' },
  { label: 'Superheat', value: '24', unit: '°F', status: 'alert', target: '8–12°F', verificationValue: '9', verificationStatus: 'ok' },
  { label: 'Subcooling', value: '8', unit: '°F', status: 'warn', target: '10–15°F', verificationValue: '13', verificationStatus: 'ok' },
  { label: 'L1 Amps', value: '18.4', unit: 'A', status: 'ok', target: 'max 20A', verificationValue: '16.2', verificationStatus: 'ok' },
  { label: 'Voltage', value: '208', unit: 'V', status: 'ok', target: '208V', verificationValue: '208', verificationStatus: 'ok' },
];

export const SUGGESTED_RECOMMENDATIONS = [
  'Schedule annual condenser coil cleaning — recommend every spring before cooling season.',
  'Monitor refrigerant charge — added 0.75 lbs R-410A. Possible slow leak; recommend leak check on next visit.',
  'Contactors showing arcing and pitting — recommend replacement within 6 months to prevent no-cool on next hot day.',
  'Consider BACnet-connected controls for remote fault code monitoring — would have caught Code 82 earlier.',
];

export const FAULT_CODES: Record<string, string> = {
  '82': 'High Refrigerant Pressure — Compressor cutout. Common causes: dirty condenser coil, refrigerant overcharge, non-condensables, failed TXV.',
  '81': 'Low Refrigerant Pressure — Compressor cutout. Common causes: low charge, restriction in liquid line, TXV failure.',
  '31': 'Low Ambient Lockout — Unit disabled below 40°F outdoor temp.',
  '22': 'Compressor High Temperature — Check oil level, check discharge line temp.',
  '14': 'Indoor Fan Fault — Check belt, motor, and VFD if equipped.',
};

export const JOB_STATE_LABELS: Record<string, string> = {
  ARRIVED: '📍 Arrived',
  EQUIPMENT_VERIFIED: '🔖 Equipment Verified',
  INITIAL_OBSERVATION: '👁 Observing',
  MEASUREMENTS_CAPTURED: '📈 Readings Captured',
  ROOT_CAUSE_IDENTIFIED: '🔍 Root Cause Found',
  REPAIR_IN_PROGRESS: '🔧 Repairing',
  REPAIR_COMPLETED: '✅ Repair Done',
  VERIFICATION_COMPLETE: '✓ Verified',
  RECOMMENDATIONS_ADDED: '📋 Recommendations',
  CUSTOMER_REVIEWED: '👤 Customer Reviewed',
};

// ─── Voice note library — 20 realistic HVAC transcripts ──────────────────────
export const VOICE_NOTE_LIBRARY = [
  "Compressor pulling in but condenser fan isn't starting. Going to check the contactor and capacitor before I do anything else.",
  "Economizer damper is stuck around 40 percent. Actuator looks seized. Going to bypass it for now and note it in the record.",
  "Indoor blower sounds normal, airflow feels restricted at the supply diffusers. I think filters are the issue before I even get to the unit.",
  "Found oil around the Schrader valve on the suction line. That's a leak point. Going to log it and check the charge.",
  "Unit short cycling. Compressor runs about 90 seconds then cuts out on high pressure. Code 82 is active and it's not clearing on its own.",
  "Low suction pressure — 85 psi on R-410A, should be around 120. System is undercharged. Going to check for leaks before I add any refrigerant.",
  "Head at 385, suction at 115. Delta T is only 11 degrees. Coil restriction is my first suspect — matches the history on this unit.",
  "Checking the wiring diagram. Control board is showing a Y1 call but the contactor isn't pulling in. Going to check the thermostat signal first.",
  "Capacitor is reading 31 microfarad on a 35 mike cap. That's 11 percent low — outside tolerance. That's the weak link right here.",
  "Code 82 came back 30 seconds after I cleared it. This is not a nuisance trip. Something is actively holding head pressure above cutout.",
  "Filters are completely plugged. I can barely push air through by hand. No wonder it's not cooling — there's no airflow at all.",
  "Coil cleaning is in progress. Heavy fouling — cottonwood debris and biological growth throughout the coil face. This hasn't been cleaned in at least two cooling seasons.",
  "Adding refrigerant now. Watching superheat come down. Subcooling just hit 13 — that's in spec. I'm going to stop there.",
  "Replaced the dual capacitor. 35 and 5 microfarad, 440 volt. Starting amp draw is back down to 16 amps. That's right where it should be.",
  "Belt was tracking to one side — pulley alignment was off. Adjusted tension and alignment. Going to run it and listen before I button it up.",
  "Customer says the problem is mostly in the afternoons on hot days. That's a classic condenser fouling pattern — unit can't reject heat when it's hottest outside.",
  "Building engineer says the unit was serviced last month by another company. No documentation, no record of what was done. Starting fresh.",
  "Verification readings look good. Head pressure down to 278, superheat is sitting at 9 degrees. System is performing correctly.",
  "Unit has been running about 15 minutes. All readings stable. Delta T is 16 degrees — right where it should be. Customer should be feeling the difference inside.",
  "Going to take nameplate and log everything before I start the diagnostic. Serial number, model, refrigerant type. Want the record to be complete from the beginning.",
];

export function randomVoiceNote(): string {
  return VOICE_NOTE_LIBRARY[Math.floor(Math.random() * VOICE_NOTE_LIBRARY.length)];
}

// ─── Today's job list ─────────────────────────────────────────────────────────
export interface TodayJob {
  id: string;
  priority: 'emergency' | 'high' | 'normal' | 'pm';
  status: 'open' | 'in-progress' | 'complete';
  type: string;
  customer: string;
  equipment: string;
  address: string;
  symptom: string;
  driveTime: string;
  scheduledTime: string;
  techNote: string | null;
  isPrototype: boolean;
}

export const TODAY_JOBS: TodayJob[] = [
  {
    id: 'JM-2026-0047',
    priority: 'high',
    status: 'open',
    type: 'Service Call',
    customer: 'Summit Medical Plaza',
    equipment: 'Carrier 50XCQ006 — RTU-3',
    address: '4521 Medical Drive, Dallas TX 75201',
    symptom: 'Unit not cooling — high pressure alarm active. Code 82.',
    driveTime: '12 min',
    scheduledTime: '08:00',
    techNote: 'Code 82 on last 2 visits. Previous tech noted coil restriction.',
    isPrototype: true,
  },
  {
    id: 'PM-2026-0148',
    priority: 'pm',
    status: 'open',
    type: 'Preventive Maintenance',
    customer: 'Northgate Data Center',
    equipment: 'Liebert DS150 — CRAC-1',
    address: '8800 Northgate Blvd, Dallas TX 75243',
    symptom: 'Annual PM — filter change, coil inspection, belt check.',
    driveTime: '28 min',
    scheduledTime: '13:00',
    techNote: 'Critical facility. Badge required at security gate.',
    isPrototype: false,
  },
  {
    id: 'PM-2026-0149',
    priority: 'pm',
    status: 'open',
    type: 'Preventive Maintenance',
    customer: 'Ridgeline Office Park',
    equipment: 'Trane YCD150 — RTU-7',
    address: '3200 Ridgeline Drive, Plano TX 75023',
    symptom: 'Quarterly PM — filter change and inspection.',
    driveTime: '35 min',
    scheduledTime: '15:30',
    techNote: null,
    isPrototype: false,
  },
];

export const FOLLOW_UP_ITEMS = [
  {
    customer: 'Northgate Data Center',
    equipment: 'CRAC-3',
    issue: 'Humidifier canister replacement — noted at last PM',
    priority: 'medium' as const,
    dueDate: 'Aug 1, 2026',
    daysDue: 35,
  },
  {
    customer: 'Parkway Medical Center',
    equipment: 'AHU-5',
    issue: 'Bearing noise on supply fan motor — quoted replacement',
    priority: 'high' as const,
    dueDate: 'Jul 10, 2026',
    daysDue: 13,
  },
];

// ─── AI Assist responses ──────────────────────────────────────────────────────
export interface AiPrompt {
  label: string;
  icon: string;
  response: string;
}

export const AI_ASSIST_PROMPTS: AiPrompt[] = [
  {
    label: 'What should I check next?',
    icon: '🔍',
    response: `Based on 385 psi head + 24°F superheat + Code 82 history, here's the priority order:

1. **Condenser coil** — inspect for fouling, debris, biological growth. Code 82 on 2 of last 3 visits points directly here. Previous tech documented restriction but never cleaned it.

2. **Condenser fan** — confirm it's running, correct rotation, pulling adequate amps.

3. **Refrigerant charge** — subcooling at 8°F (target 10–15) suggests possible undercharge. But clean the coil first — a restricted coil can mimic undercharge.

Start with the coil. If it's as fouled as the history suggests, that alone may resolve the Code 82.`,
  },
  {
    label: 'Explain Code 82',
    icon: '⚡',
    response: `**Carrier Code 82 — High Refrigerant Pressure Lockout**

Compressor cut out on high discharge pressure. Carrier's lockout setpoint on this model: ~425 psi R-410A.

**Your current head: 385 psi** — approaching cutout. Unit is protecting the compressor.

**Most common causes on Carrier 50XCQ (in order):**
• Dirty or blocked condenser coil ← most likely given history
• Failed or slow condenser fan motor
• Refrigerant overcharge
• Non-condensables in system
• TXV failure or restriction

**Pattern note:** Code 82 appeared on 2 of 3 last visits to this unit. That's a pattern — not random faults.`,
  },
  {
    label: 'Compare to last visit',
    icon: '📊',
    response: `**RTU-3 Trend — Today vs. April 2025 (14 months ago):**

| Reading | Apr 2025 | Today | Change |
|---------|----------|-------|--------|
| Head Pressure | 362 psi | 385 psi | ↑ 23 |
| Superheat | 19°F | 24°F | ↑ 5 |
| Supply Air | 59°F | 61°F | ↑ 2 |

All three trending worse over 14 months. No coil cleaning was performed on either of the last two visits.

**Assessment:** Progressive condenser fouling. Annual cleaning in spring would likely prevent these service calls. Equipment is otherwise in good condition for its age.`,
  },
  {
    label: 'Sequence of operation',
    icon: '⚙️',
    response: `**Carrier 50XCQ006 Cooling Sequence:**

1. Thermostat Y1 call received
2. Indoor fan relay energizes → fan starts
3. Compressor contactor K1 closes
4. Condenser fan motor starts
5. System builds to operating pressure (3–8 min)
6. Pressures stabilize at steady-state

**Protection circuits active:**
• High pressure switch: opens at 425 psi → K1 drops out
• Auto-reset: pressure must drop before restart
• Low pressure cutout: opens below ~50 psi

**Current condition:** High discharge pressure is tripping the high pressure switch, preventing sustained compressor operation. Unit short cycling on Code 82.`,
  },
  {
    label: 'How much refrigerant?',
    icon: '🌡️',
    response: `**Charge estimate based on current readings:**

Subcooling: 8°F (target 10–15°F for R-410A liquid line)
Deficit: ~4–5°F subcooling

**Estimated:** 0.5–1.0 lbs R-410A — use subcooling method to confirm.

⚠️ **Important:** High head pressure from coil fouling can mimic undercharge. Both conditions reduce subcooling.

**Recommended sequence:**
1. Clean condenser coil first
2. Run system to stable operating pressures
3. Recheck subcooling
4. Add charge only if subcooling is still below 10°F after cleaning

Adding refrigerant to a restricted system can cause overcharge when the restriction is removed.`,
  },
];
