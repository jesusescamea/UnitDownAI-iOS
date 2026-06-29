import type { ProviderDefinition } from '../types';

// ─── Provider registry ─────────────────────────────────────────────────────────
// Every provider is 'available'. No Coming Soon. Each either works fully or
// opens a useful fallback / setup flow — the technician is never left at a
// dead end.

export const PROVIDERS: ProviderDefinition[] = [
  // ── Manual / text ───────────────────────────────────────────────────────────
  {
    id:       'manual',
    name:     'Manual Job',
    tagline:  'Enter job details by hand',
    status:   'available',
    category: 'manual',
  },
  {
    id:       'paste',
    name:     'Paste Schedule',
    tagline:  'Paste dispatch text — AI extracts jobs',
    status:   'available',
    category: 'manual',
  },

  // ── File ────────────────────────────────────────────────────────────────────
  {
    id:       'csv',
    name:     'Import CSV',
    tagline:  'Upload a .csv from any scheduler',
    status:   'available',
    category: 'file',
  },
  {
    id:       'ics',
    name:     'Calendar File (.ics)',
    tagline:  'Upload from Google, Apple, or Outlook',
    status:   'available',
    category: 'file',
  },
  {
    id:       'pdf',
    name:     'Import PDF',
    tagline:  'Upload a schedule or work order PDF',
    status:   'available',
    category: 'file',
  },
  {
    id:       'scan_ocr',
    name:     'Scan Schedule',
    tagline:  'Photograph a printed dispatch sheet',
    status:   'available',
    category: 'file',
  },

  // ── Calendar ────────────────────────────────────────────────────────────────
  {
    id:       'google_calendar',
    name:     'Google Calendar',
    tagline:  'Import via .ics file or paste event text',
    status:   'available',
    category: 'calendar',
  },
  {
    id:       'apple_calendar',
    name:     'Apple Calendar',
    tagline:  'Import via .ics file or paste event text',
    status:   'available',
    category: 'calendar',
  },
  {
    id:       'outlook_calendar',
    name:     'Outlook Calendar',
    tagline:  'Import via .ics file, paste, or manual entry',
    status:   'available',
    category: 'calendar',
  },

  // ── Email ────────────────────────────────────────────────────────────────────
  {
    id:       'gmail',
    name:     'Gmail',
    tagline:  'Import dispatch emails from Gmail',
    status:   'available',
    category: 'email',
  },
  {
    id:       'outlook_email',
    name:     'Outlook Email',
    tagline:  'Import dispatch emails from Outlook',
    status:   'available',
    category: 'email',
  },

  // ── Field dispatch platforms ─────────────────────────────────────────────────
  {
    id:       'servicetitan',
    name:     'ServiceTitan',
    tagline:  'Import jobs via CSV export or API',
    status:   'available',
    category: 'dispatch',
  },
  {
    id:       'fieldedge',
    name:     'FieldEdge',
    tagline:  'Import jobs via CSV export or API',
    status:   'available',
    category: 'dispatch',
  },
  {
    id:       'housecall_pro',
    name:     'Housecall Pro',
    tagline:  'Import jobs via CSV export or API',
    status:   'available',
    category: 'dispatch',
  },
  {
    id:       'custom_api',
    name:     'Custom API',
    tagline:  'Connect any dispatch system via REST',
    status:   'available',
    category: 'dispatch',
  },
];

export const CATEGORY_LABELS: Record<string, string> = {
  manual:   'Enter Manually',
  file:     'Import File',
  calendar: 'Calendar',
  email:    'Email',
  dispatch: 'Dispatch Platforms',
};

export const AVAILABLE_PROVIDERS = PROVIDERS.filter(p => p.status === 'available');
