// ─── Dispatch Inbox — Import Parsers ─────────────────────────────────────────
// Each parser returns ImportedJob[] — ready to add to inbox.

import type { ImportedJob, ProviderType, JobPriority } from './types';

// ─── OAuth calendar event → ImportedJob ──────────────────────────────────────
// Converts a raw calendar event object (Microsoft Graph or Google Calendar API)
// into a normalized ImportedJob. Works with either format.

interface AnyCalendarEvent {
  id?:          string;
  subject?:     string;
  summary?:     string;
  start?:       { dateTime?: string; date?: string };
  end?:         { dateTime?: string; date?: string };
  location?:    string | { displayName?: string };
  description?: string;
  bodyPreview?: string;
  body?:        { content?: string; contentType?: string };
}

interface AnyMailMessage {
  subject?:         string;
  from?:            { emailAddress?: { name?: string; address?: string } };
  receivedDateTime?: string;
  bodyPreview?:     string;
  snippet?:         string;
  payload?:         { headers?: { name: string; value: string }[] };
}

export function calendarEventToImportedJob(event: AnyCalendarEvent, source: ProviderType): ImportedJob {
  const job = defaultJob(source);
  job.rawData = event;

  const summary     = event.subject ?? event.summary ?? '';
  const description = event.description ?? event.body?.content ?? event.bodyPreview ?? '';
  const location    = typeof event.location === 'string'
    ? event.location
    : (event.location?.displayName ?? '');

  if (event.start?.dateTime) {
    const dt = new Date(event.start.dateTime);
    job.appointmentDate = dt.toISOString().split('T')[0];
    job.appointmentTime = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (event.start?.date) {
    job.appointmentDate = event.start.date;
  }

  if (event.end?.dateTime && job.appointmentTime) {
    const endDt = new Date(event.end.dateTime);
    const endTime = endDt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    job.timeWindow = `${job.appointmentTime} – ${endTime}`;
    job.appointmentTime = '';
  }

  if (location) job.address = location;

  if (summary) {
    const splitMatch = summary.match(/^(.+?)\s*[-–|]\s*(.+)$/);
    if (splitMatch) {
      job.customer  = splitMatch[1].trim();
      job.complaint = splitMatch[2].trim();
    } else {
      job.customer = summary.trim();
    }
  }

  if (description) {
    const phoneMatch = description.match(/(\(?\d{3}\)?[\s.\-]\d{3}[\s.\-]\d{4})/);
    if (phoneMatch) job.phone = phoneMatch[1];

    const jobNumMatch = description.match(/(?:job|wo|work\s*order|dispatch|ticket)\s*#?\s*:?\s*([A-Z0-9\-]+)/i);
    if (jobNumMatch) job.jobNumber = jobNumMatch[1];

    if (!job.complaint) {
      const complaintMatch = description.match(/(?:complaint|symptom|issue|problem|task|description)\s*:?\s*(.+?)(?:\n|$)/i);
      if (complaintMatch) job.complaint = complaintMatch[1].trim();
    }

    if (!job.notes) job.notes = description.replace(/<[^>]+>/g, '').trim().slice(0, 500);
  }

  const allText = [summary, description, location].filter(Boolean).join(' ');
  job.jobType  = guessJobType(allText);
  job.priority = guessPriority(allText);

  if (!job.customer) job.customer = summary || 'Calendar Event';
  return job;
}

export function emailToImportedJob(message: AnyMailMessage, source: ProviderType): ImportedJob {
  const subject = message.subject ?? message.payload?.headers?.find(h => h.name === 'Subject')?.value ?? '';
  const from    = message.from?.emailAddress?.name ?? message.payload?.headers?.find(h => h.name === 'From')?.value ?? '';
  const body    = message.bodyPreview ?? message.snippet ?? '';

  const combined = [subject, body].filter(Boolean).join('\n');
  const parsed   = parsePastedText(combined);

  if (parsed.length > 0) {
    return { ...parsed[0], source, rawData: message };
  }

  const job    = defaultJob(source);
  job.rawData  = message;
  job.customer = from;
  job.complaint = subject;
  job.notes    = body;
  job.jobType  = guessJobType(combined);
  job.priority = guessPriority(combined);
  return job;
}

function uid(): string {
  return `DI-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

function isoNow(): string {
  return new Date().toISOString();
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function guessPriority(text: string): JobPriority {
  const t = text.toLowerCase();
  if (t.includes('emergency') || t.includes('urgent') || t.includes('asap')) return 'emergency';
  if (t.includes('high priority') || t.includes('high pri')) return 'high';
  if (t.includes(' pm ') || t.includes('preventive') || t.includes('preventative') || t.includes('maintenance')) return 'pm';
  return 'normal';
}

function guessJobType(text: string): string {
  const t = text.toLowerCase();
  if (t.includes('pm survey') || t.includes('survey')) return 'PM Survey';
  if (t.includes('pm') || t.includes('preventive') || t.includes('preventative') || t.includes('maintenance')) return 'Preventive Maintenance';
  if (t.includes('emergency') || t.includes('urgent')) return 'Emergency';
  if (t.includes('install')) return 'Installation';
  if (t.includes('follow') && t.includes('up')) return 'Follow-up';
  if (t.includes('startup') || t.includes('start up') || t.includes('start-up')) return 'Startup';
  if (t.includes('warranty')) return 'Warranty';
  if (t.includes('inspection')) return 'Inspection';
  if (t.includes('serv') || t.includes('service') || t.includes('repair')) return 'Service Call';
  return 'Service Call';
}

function defaultJob(source: ProviderType): ImportedJob {
  return {
    id: uid(),
    source,
    jobNumber: '',
    customer: '',
    site: '',
    address: '',
    appointmentDate: todayISO(),
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

// ─── Semicolon-delimited format ────────────────────────────────────────────────
// Handles: "2606-37730 ; Lowes; serv; 7:00 AM; Lincoln; Vendor meet 10 am; POC 510-472-1230"

function parseSemicolonLine(line: string): ImportedJob | null {
  const parts = line.split(';').map(p => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;

  const job = defaultJob('paste');
  job.rawData = line;

  const jobNumMatch = parts[0]?.match(/(\d{4}-\d{4,7}|\d{5,10})/);
  if (jobNumMatch) job.jobNumber = jobNumMatch[1];

  if (parts[1]) job.customer = parts[1].trim();

  const typeAndKeywords = parts.slice(2).join(' ').toLowerCase();
  job.jobType = guessJobType(typeAndKeywords);
  job.priority = guessPriority(typeAndKeywords);

  for (const part of parts) {
    const timeMatch = part.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?(?:\s*[-–]\s*\d{1,2}:\d{2}\s*(?:AM|PM)?)?)/i);
    if (timeMatch && !job.appointmentTime) {
      const t = timeMatch[1].trim();
      if (t.includes('–') || t.includes('-')) job.timeWindow = t;
      else job.appointmentTime = t;
    }

    const phoneMatch = part.match(/(\(?\d{3}\)?[\s.\-]\d{3}[\s.\-]\d{4})/);
    if (phoneMatch) job.phone = phoneMatch[1];
  }

  // Location: part that's not a time, phone, type-keyword, or job number
  const timeRx = /\d{1,2}:\d{2}/;
  const phoneRx = /\d{3}[\s.\-]\d{4}/;
  const typeWords = /^(serv|pm|survey|warranty|inspection|startup|install|emergency|urgent|follow|vendor)/i;
  for (const part of parts.slice(2)) {
    if (!timeRx.test(part) && !phoneRx.test(part) && !typeWords.test(part) && part.length > 2) {
      if (!job.site) { job.site = part; continue; }
      if (!job.notes) { job.notes = part; }
    }
  }

  if (!job.customer) return null;
  return job;
}

// ─── Paste / text parser ──────────────────────────────────────────────────────

export function parsePastedText(text: string): ImportedJob[] {
  if (!text.trim()) return [];

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Detect semicolon-delimited dispatch format
  const semiLines = lines.filter(l => (l.match(/;/g) ?? []).length >= 2);
  if (semiLines.length > 0 && semiLines.length >= Math.floor(lines.length * 0.5)) {
    const jobs: ImportedJob[] = [];
    for (const line of lines) {
      if ((line.match(/;/g) ?? []).length < 1) continue;
      const job = parseSemicolonLine(line);
      if (job) jobs.push(job);
    }
    if (jobs.length > 0) return jobs;
  }

  // Standard label:value block parser
  const jobs: ImportedJob[] = [];
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

  for (const block of blocks) {
    const job = defaultJob('paste');
    job.rawData = block.join('\n');
    const blockText = block.join(' ');

    for (const line of block) {
      const jobNumMatch = line.match(/(?:job\s*#?|wo\s*#?|work\s*order\s*#?|dispatch\s*#?)\s*:?\s*([A-Z0-9\-]+)/i);
      if (jobNumMatch) job.jobNumber = jobNumMatch[1];

      const custMatch = line.match(/(?:customer|client|account)\s*:?\s*(.+)/i);
      if (custMatch) job.customer = custMatch[1].trim();

      const addrMatch = line.match(/(?:address|location|site\s*address)\s*:?\s*(.+)/i);
      if (addrMatch) job.address = addrMatch[1].trim();

      const siteMatch = line.match(/(?:site|building|facility)\s*:?\s*(.+)/i);
      if (siteMatch && !job.site) job.site = siteMatch[1].trim();

      const timeMatch = line.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?(?:\s*[-–]\s*\d{1,2}:\d{2}\s*(?:AM|PM)?)?)/i);
      if (timeMatch && !job.appointmentTime) {
        const t = timeMatch[1].trim();
        if (t.includes('–') || t.includes('-')) job.timeWindow = t;
        else job.appointmentTime = t;
      }

      const dateMatch = line.match(/(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})/i);
      if (dateMatch) job.appointmentDate = dateMatch[1];

      const phoneMatch = line.match(/(\(?\d{3}\)?[\s.\-]\d{3}[\s.\-]\d{4})/);
      if (phoneMatch) job.phone = phoneMatch[1];

      const equipMatch = line.match(/(?:unit|equipment|hvac|system|rtu|ahu|chiller|boiler)\s*:?\s*(.+)/i);
      if (equipMatch) job.equipment = equipMatch[1].trim();

      const complaintMatch = line.match(/(?:complaint|symptom|issue|problem|report|description|task)\s*:?\s*(.+)/i);
      if (complaintMatch) job.complaint = complaintMatch[1].trim();

      const techMatch = line.match(/(?:tech(?:nician)?|assigned\s*to|assign)\s*:?\s*(.+)/i);
      if (techMatch) job.technician = techMatch[1].trim();
    }

    job.jobType = guessJobType(blockText);
    job.priority = guessPriority(blockText) !== 'normal' ? guessPriority(blockText) : job.priority;

    if (!job.customer && block.length > 0) {
      const firstMeaningful = block.find(l => !l.match(/^(job|wo|work order|dispatch)/i));
      if (firstMeaningful) job.customer = firstMeaningful.trim();
    }

    jobs.push(job);
  }

  return jobs;
}

// ─── CSV parser ───────────────────────────────────────────────────────────────

const FIELD_ALIASES: Record<keyof ImportedJob, string[]> = {
  jobNumber:       ['job #', 'job number', 'job num', 'wo #', 'wo number', 'work order', 'order #', 'id'],
  customer:        ['customer', 'client', 'account', 'customer name', 'business'],
  site:            ['site', 'building', 'facility', 'site name', 'location name'],
  address:         ['address', 'street', 'service address', 'site address', 'job address', 'location'],
  appointmentDate: ['date', 'appointment date', 'scheduled date', 'job date', 'service date', 'start date'],
  appointmentTime: ['time', 'appointment time', 'start time', 'scheduled time', 'start'],
  timeWindow:      ['window', 'time window', 'arrival window', 'arrival time', 'end', 'end time'],
  phone:           ['phone', 'tel', 'telephone', 'contact phone', 'customer phone'],
  technician:      ['tech', 'technician', 'assigned to', 'employee', 'rep'],
  jobType:         ['type', 'job type', 'service type', 'call type'],
  priority:        ['priority', 'pri', 'urgency', 'severity'],
  complaint:       ['complaint', 'symptom', 'issue', 'problem', 'description', 'work description', 'task'],
  notes:           ['notes', 'dispatch notes', 'internal notes', 'comments'],
  equipment:       ['unit', 'equipment', 'asset', 'hvac unit', 'asset tag'],
  id: [], source: [], attachments: [], rawData: [], importedAt: [], status: [], duplicateOf: [],
  partsNeeded: [], toolsNeeded: [], reminders: [], manufacturer: [], equipmentModel: [],
};

function matchHeader(header: string): keyof ImportedJob | null {
  const normalized = header.toLowerCase().trim().replace(/[#\s]+/g, ' ').trim();
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
        const p = guessPriority(val);
        job.priority = p !== 'normal' ? p : (['emergency', 'high', 'normal', 'pm'].includes(val.toLowerCase()) ? val.toLowerCase() as JobPriority : 'normal');
      } else if (field === 'attachments' || field === 'source' || field === 'id' || field === 'rawData' || field === 'importedAt' || field === 'status' || field === 'duplicateOf') {
        // skip system fields
      } else {
        (job as unknown as Record<string, unknown>)[field] = val;
      }
    });

    if (!['emergency', 'high', 'normal', 'pm'].includes(job.priority)) {
      job.priority = guessPriority(job.priority as unknown as string);
    }

    if (job.jobType) job.jobType = guessJobType(job.jobType);

    jobs.push(job);
  }

  return jobs;
}

// ─── ICS / iCalendar parser ────────────────────────────────────────────────────
// Parses VEVENT blocks from .ics files exported from any calendar app.

function parseICSDate(val: string): string {
  const dateOnly = val.split('T')[0].replace(/[^0-9]/g, '');
  if (dateOnly.length === 8) {
    return `${dateOnly.slice(0, 4)}-${dateOnly.slice(4, 6)}-${dateOnly.slice(6, 8)}`;
  }
  return todayISO();
}

function parseICSTime(val: string): string {
  if (!val.includes('T')) return '';
  const timePart = val.split('T')[1]?.replace('Z', '').replace(/[^0-9]/g, '') ?? '';
  if (timePart.length < 4) return '';
  const h = parseInt(timePart.slice(0, 2), 10);
  const m = timePart.slice(2, 4);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${period}`;
}

function unfoldICS(text: string): string {
  return text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
}

function getICSProp(lines: string[], prop: string): string {
  for (const line of lines) {
    if (line.toUpperCase().startsWith(prop.toUpperCase() + ':') || line.toUpperCase().startsWith(prop.toUpperCase() + ';')) {
      const colonIdx = line.indexOf(':');
      return colonIdx >= 0 ? line.slice(colonIdx + 1).replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\').trim() : '';
    }
  }
  return '';
}

export function parseICS(text: string): ImportedJob[] {
  const unfolded = unfoldICS(text);
  const rawBlocks = unfolded.split(/BEGIN:VEVENT/i).slice(1);
  const jobs: ImportedJob[] = [];

  for (const block of rawBlocks) {
    const endIdx = block.search(/END:VEVENT/i);
    const content = endIdx >= 0 ? block.slice(0, endIdx) : block;
    const lines = content.split(/\r?\n/).filter(l => l.trim());

    const job = defaultJob('ics');
    job.rawData = content;

    const summary    = getICSProp(lines, 'SUMMARY');
    const location   = getICSProp(lines, 'LOCATION');
    const description = getICSProp(lines, 'DESCRIPTION');
    const dtStart    = getICSProp(lines, 'DTSTART');
    const dtEnd      = getICSProp(lines, 'DTEND');

    // Parse date/time
    if (dtStart) {
      job.appointmentDate = parseICSDate(dtStart);
      const t = parseICSTime(dtStart);
      if (t) job.appointmentTime = t;
    }
    if (dtEnd) {
      const endTime = parseICSTime(dtEnd);
      if (endTime && job.appointmentTime) {
        job.timeWindow = `${job.appointmentTime} – ${endTime}`;
        job.appointmentTime = '';
      }
    }

    // Location → address
    if (location) job.address = location.replace(/\\n/g, ', ').trim();

    // Summary: try "Customer - Task" or "Customer | Task" splits
    if (summary) {
      const splitMatch = summary.match(/^(.+?)\s*[-–|]\s*(.+)$/);
      if (splitMatch) {
        job.customer = splitMatch[1].trim();
        job.complaint = splitMatch[2].trim();
      } else {
        job.customer = summary.trim();
      }
    }

    // Description: extract phone, job number, complaint, notes
    if (description) {
      const phoneMatch = description.match(/(\(?\d{3}\)?[\s.\-]\d{3}[\s.\-]\d{4})/);
      if (phoneMatch) job.phone = phoneMatch[1];

      const jobNumMatch = description.match(/(?:job|wo|work\s*order|dispatch|ticket)\s*#?\s*:?\s*([A-Z0-9\-]+)/i);
      if (jobNumMatch) job.jobNumber = jobNumMatch[1];

      const complaintMatch = description.match(/(?:complaint|symptom|issue|problem|task|work|description)\s*:?\s*(.+?)(?:\n|$)/i);
      if (complaintMatch && !job.complaint) job.complaint = complaintMatch[1].trim();

      if (!job.notes) {
        job.notes = description.replace(/\\n/g, '\n').trim().slice(0, 500);
      }
    }

    // Infer job type and priority from all text
    const allText = [summary, description, location].filter(Boolean).join(' ');
    job.jobType = guessJobType(allText);
    job.priority = guessPriority(allText);
    if (job.priority === 'pm') job.priority = 'pm';

    if (!job.customer) job.customer = summary || 'Calendar Event';

    jobs.push(job);
  }

  return jobs;
}
