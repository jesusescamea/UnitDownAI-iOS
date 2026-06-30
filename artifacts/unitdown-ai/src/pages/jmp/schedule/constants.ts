export const SERVICE_TYPES = [
  'PM',
  'Service Call',
  'Leak Search',
  'Startup',
  'Commissioning',
  'Equipment Replacement',
  'Warranty',
  'Inspection',
  'Controls',
  'Filter Change',
  'Other',
] as const;

export type ServiceType = (typeof SERVICE_TYPES)[number];

export const QUICK_TIMES = [
  '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
  '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM',
];

// Parse voice date utterances into YYYY-MM-DD
export function parseVoiceDate(input: string): string {
  const lower = input.toLowerCase().trim();
  const now   = new Date();

  if (/\btoday\b/.test(lower)) return toYMD(now);

  if (/\btomorrow\b/.test(lower)) {
    const d = new Date(now); d.setDate(d.getDate() + 1); return toYMD(d);
  }
  if (/\bnext\s+week\b/.test(lower)) {
    const d = new Date(now); d.setDate(d.getDate() + 7); return toYMD(d);
  }

  // Try native Date parse as last resort (works for "June 15", "6/15", etc.)
  const parsed = new Date(input);
  if (!isNaN(parsed.getTime())) return toYMD(parsed);

  return input; // Keep as-is so user can see and edit
}

function toYMD(d: Date): string {
  return d.toISOString().split('T')[0];
}

// Parse voice time utterances into a formatted time string
export function parseVoiceTime(input: string): string {
  const lower = input.toLowerCase().trim();

  if (/\bnoon\b/.test(lower)) return '12:00 PM';
  if (/\bmidnight\b/.test(lower)) return '12:00 AM';

  const m = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m|p\.m)?/);
  if (m) {
    let hr  = parseInt(m[1], 10);
    const mn  = m[2] ?? '00';
    const ampm = m[3]?.replace(/\./g, '');
    let period: 'AM' | 'PM';

    if (ampm === 'pm') { period = 'PM'; }
    else if (ampm === 'am') { period = 'AM'; }
    else { period = (hr >= 1 && hr <= 6) ? 'PM' : 'AM'; }

    if (hr === 12) hr = period === 'AM' ? 0 : 12;
    else if (period === 'PM') hr += 12;

    const display12 = hr === 0 ? 12 : hr > 12 ? hr - 12 : hr;
    const displayPeriod = hr < 12 ? 'AM' : 'PM';
    return `${display12}:${mn.padStart(2, '0')} ${displayPeriod}`;
  }

  return input;
}

export function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

export function tomorrowStr(): string {
  const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0];
}
