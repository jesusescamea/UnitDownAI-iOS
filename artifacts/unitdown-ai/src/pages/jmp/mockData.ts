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

export const SUGGESTED_PARTS_BY_CONTEXT: Record<string, { name: string; detail: string }[]> = {
  coil: [
    { name: 'Nu-Brite Coil Cleaner', detail: '1 can — chemical rinse applied to condenser coil' },
  ],
  refrigerant: [
    { name: 'R-410A Refrigerant', detail: '0.75 lbs added — system was 0.75 lbs undercharged' },
  ],
  capacitor: [
    { name: 'Dual Run Capacitor 35/5 µF 440V', detail: 'Replaced — old cap tested at 31 µF (should be 35 µF)' },
  ],
  generic: [
    { name: 'Nu-Brite Coil Cleaner', detail: '1 can — condenser coil chemical rinse' },
    { name: 'R-410A Refrigerant', detail: '0.75 lbs added' },
    { name: 'Dual Run Capacitor 35/5 µF 440V', detail: 'Replaced weak capacitor' },
  ],
};

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
