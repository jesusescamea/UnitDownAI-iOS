import type { ProviderDefinition } from '../types';

// ─── Provider registry ─────────────────────────────────────────────────────────
// Add future providers here. Status drives UI — never fake a connection.
//
// 'available'  → UI opens the import sheet immediately
// 'coming_soon' → UI shows "Coming Soon" label; tile is not tappable

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
    tagline:  'Upload a .csv file from any scheduler',
    status:   'available',
    category: 'file',
  },
  {
    id:       'ics',
    name:     'Import Calendar File (.ics)',
    tagline:  'Upload from Google, Apple, or Outlook Calendar',
    status:   'available',
    category: 'file',
  },
  {
    id:       'pdf',
    name:     'Import PDF',
    tagline:  'Upload a schedule or work order PDF',
    status:   'coming_soon',
    category: 'file',
  },
  {
    id:       'scan_ocr',
    name:     'Scan Schedule',
    tagline:  'Photograph a printed schedule',
    status:   'coming_soon',
    category: 'file',
  },

  // ── Calendar / email ────────────────────────────────────────────────────────
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
  {
    id:       'gmail',
    name:     'Gmail',
    tagline:  'Parse dispatch emails from Gmail',
    status:   'coming_soon',
    category: 'email',
  },
  {
    id:       'outlook_email',
    name:     'Outlook Email',
    tagline:  'Parse dispatch emails from Outlook',
    status:   'coming_soon',
    category: 'email',
  },

  // ── Field dispatch platforms ─────────────────────────────────────────────────
  {
    id:       'servicetitan',
    name:     'ServiceTitan',
    tagline:  'Sync jobs via ServiceTitan API',
    status:   'coming_soon',
    category: 'dispatch',
  },
  {
    id:       'fieldedge',
    name:     'FieldEdge',
    tagline:  'Sync jobs via FieldEdge API',
    status:   'coming_soon',
    category: 'dispatch',
  },
  {
    id:       'housecall_pro',
    name:     'Housecall Pro',
    tagline:  'Sync jobs via Housecall Pro API',
    status:   'coming_soon',
    category: 'dispatch',
  },
  {
    id:       'custom_api',
    name:     'Custom API',
    tagline:  'Connect any dispatch system via REST',
    status:   'coming_soon',
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
