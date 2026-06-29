// ─── Dispatch Inbox — Import Parsers ─────────────────────────────────────────
// Each parser returns Partial<ImportedJob>[] — the caller merges with defaults.

import type { ImportedJob, ProviderType, JobPriority } from './types';

function uid(): string {
  return `DI-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

function isoNow(): string {
  return new Date().toISOString();
}

function guessPriority(text: string): JobPriority {
  const t = text.toLowerCase();
  if (t.includes('emergency') || t.includes('urgent') || t.includes('asap')) return 'emergency';
  if (t.includes('high priority') || t.includes('high pri')) return 'high';
  if (t.includes(' pm ') || t.includes('preventive') || t.includes('maintenance')) return 'pm';
  return 'normal';
}

function defaultJob(source: ProviderType): ImportedJob {
  return {
    id: uid(),
    source,
    jobNumber: '',
    customer: '',
    site: '',
    address: '',
    appointmentDate: new Date().toISOString().split('T')[0],
    appointmentTime: '',
    timeWindow: '',
    phone: '',
    technician: '',
    jobType: 'Service Call',
    priority: 'normal',
    complaint: '',
    notes: '',
    equipment: '',
    attachments: [],
    rawData: '',
    importedAt: isoNow(),
    status: 'pending',
  };
}

// ─── Paste / text parser ──────────────────────────────────────────────────────
// Extracts one or more jobs from free-form pasted dispatch text.
// Uses heuristic line parsing — works with many dispatch formats.

export function parsePastedText(text: string): ImportedJob[] {
  if (!text.trim()) return [];

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const jobs: ImportedJob[] = [];

  // Detect if text contains multiple job blocks (look for repeating Job #, WO#, etc.)
  const jobBreakPattern = /^(job\s*#?|work\s*order\s*#?|wo\s*#?|dispatch\s*#?)/i;
  const blocks: string[][] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (jobBreakPattern.test(line) && current.length > 0) {
      blocks.push(current);
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) blocks.push(current);

  // Parse each block into a job
  for (const block of blocks) {
    const job = defaultJob('paste');
    job.rawData = block.join('\n');

    for (const line of block) {
      const lower = line.toLowerCase();

      // Job number
      const jobNumMatch = line.match(/(?:job\s*#?|wo\s*#?|work\s*order\s*#?|dispatch\s*#?)\s*:?\s*([A-Z0-9\-]+)/i);
      if (jobNumMatch) job.jobNumber = jobNumMatch[1];

      // Customer
      const custMatch = line.match(/(?:customer|client|account)\s*:?\s*(.+)/i);
      if (custMatch) job.customer = custMatch[1].trim();

      // Address
      const addrMatch = line.match(/(?:address|location|site\s*address)\s*:?\s*(.+)/i);
      if (addrMatch) job.address = addrMatch[1].trim();

      // Site / building
      const siteMatch = line.match(/(?:site|building|facility)\s*:?\s*(.+)/i);
      if (siteMatch && !job.site) job.site = siteMatch[1].trim();

      // Time / window
      const timeMatch = line.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?(?:\s*[-–]\s*\d{1,2}:\d{2}\s*(?:AM|PM)?)?)/i);
      if (timeMatch && !job.appointmentTime) {
        const t = timeMatch[1];
        if (t.includes('–') || t.includes('-')) job.timeWindow = t;
        else job.appointmentTime = t;
      }

      // Date
      const dateMatch = line.match(/(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})/i);
      if (dateMatch && !job.appointmentDate.startsWith('20')) job.appointmentDate = dateMatch[1];

      // Phone
      const phoneMatch = line.match(/(\(?\d{3}\)?[\s.\-]\d{3}[\s.\-]\d{4})/);
      if (phoneMatch) job.phone = phoneMatch[1];

      // Equipment
      const equipMatch = line.match(/(?:unit|equipment|hvac|system|rtu|ahu|chiller|boiler)\s*:?\s*(.+)/i);
      if (equipMatch) job.equipment = equipMatch[1].trim();

      // Complaint / symptom
      const complaintMatch = line.match(/(?:complaint|symptom|issue|problem|report|description)\s*:?\s*(.+)/i);
      if (complaintMatch) job.complaint = complaintMatch[1].trim();

      // Tech
      const techMatch = line.match(/(?:tech(?:nician)?|assigned\s*to|assign)\s*:?\s*(.+)/i);
      if (techMatch) job.technician = techMatch[1].trim();

      // Job type
      if (lower.includes('preventive') || lower.includes(' pm ')) job.jobType = 'Preventive Maintenance';
      else if (lower.includes('follow') && lower.includes('up')) job.jobType = 'Follow-up';
      else if (lower.includes('install')) job.jobType = 'Installation';

      // Priority from text
      const p = guessPriority(line);
      if (p !== 'normal') job.priority = p;
    }

    // Fallback: if customer is still empty, use first meaningful line
    if (!job.customer && block.length > 0) {
      const firstMeaningful = block.find(l => !l.match(/^(job|wo|work order|dispatch)/i));
      if (firstMeaningful) job.customer = firstMeaningful.trim();
    }

    jobs.push(job);
  }

  return jobs;
}

// ─── CSV parser ───────────────────────────────────────────────────────────────
// Accepts RFC 4180 CSV. Column headers are matched case-insensitively and by
// common alias names used by different dispatch platforms.

const FIELD_ALIASES: Record<keyof ImportedJob, string[]> = {
  jobNumber:       ['job #', 'job number', 'job num', 'wo #', 'wo number', 'work order', 'order #', 'id'],
  customer:        ['customer', 'client', 'account', 'customer name', 'business'],
  site:            ['site', 'building', 'facility', 'site name', 'location name'],
  address:         ['address', 'street', 'service address', 'site address', 'job address'],
  appointmentDate: ['date', 'appointment date', 'scheduled date', 'job date', 'service date'],
  appointmentTime: ['time', 'appointment time', 'start time', 'scheduled time'],
  timeWindow:      ['window', 'time window', 'arrival window', 'arrival time'],
  phone:           ['phone', 'tel', 'telephone', 'contact phone', 'customer phone'],
  technician:      ['tech', 'technician', 'assigned to', 'employee', 'rep'],
  jobType:         ['type', 'job type', 'service type', 'call type'],
  priority:        ['priority', 'pri', 'urgency', 'severity'],
  complaint:       ['complaint', 'symptom', 'issue', 'problem', 'description', 'notes', 'work description'],
  notes:           ['notes', 'dispatch notes', 'internal notes', 'comments'],
  equipment:       ['unit', 'equipment', 'asset', 'hvac unit', 'asset tag'],
  // fields not CSV-populated
  id: [], source: [], attachments: [], rawData: [], importedAt: [], status: [], duplicateOf: [],
};

function matchHeader(header: string): keyof ImportedJob | null {
  const normalized = header.toLowerCase().trim();
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    if (aliases.some(a => a === normalized || normalized.includes(a) || a.includes(normalized))) {
      return field as keyof ImportedJob;
    }
  }
  return null;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let inQuote = false;
  let current = '';
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { current += '"'; i++; }
      else inQuote = !inQuote;
    } else if (ch === ',' && !inQuote) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseCSV(text: string): ImportedJob[] {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const fieldMap: Array<keyof ImportedJob | null> = headers.map(matchHeader);

  const jobs: ImportedJob[] = [];

  for (let r = 1; r < lines.length; r++) {
    const cols = parseCSVLine(lines[r]);
    if (cols.every(c => !c)) continue;

    const job = defaultJob('csv');
    job.rawData = lines[r];

    fieldMap.forEach((field, i) => {
      if (!field || i >= cols.length) return;
      const val = cols[i]?.trim() ?? '';
      if (!val) return;

      if (field === 'priority') {
        job.priority = guessPriority(val) !== 'normal' ? guessPriority(val) : (val.toLowerCase() as JobPriority) ?? 'normal';
      } else if (field === 'attachments' || field === 'source' || field === 'id' || field === 'rawData' || field === 'importedAt' || field === 'status' || field === 'duplicateOf') {
        // skip
      } else {
        (job as Record<string, unknown>)[field] = val;
      }
    });

    // Normalize priority if it came from CSV as free text
    if (!['emergency', 'high', 'normal', 'pm'].includes(job.priority)) {
      job.priority = guessPriority(job.priority as unknown as string);
    }

    jobs.push(job);
  }

  return jobs;
}
