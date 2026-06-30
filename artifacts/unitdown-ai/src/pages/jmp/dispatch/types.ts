export type ProviderType =
  | 'paste'
  | 'csv'
  | 'ics'
  | 'manual'
  | 'voice'
  | 'outlook_calendar'
  | 'outlook_email'
  | 'google_calendar'
  | 'gmail'
  | 'apple_calendar'
  | 'scan_ocr'
  | 'pdf'
  | 'servicetitan'
  | 'fieldedge'
  | 'housecall_pro'
  | 'custom_api';

export type ImportStatus   = 'pending' | 'accepted' | 'skipped' | 'duplicate';
export type JobPriority    = 'emergency' | 'high' | 'normal' | 'pm';
export type ProviderStatus = 'available' | 'coming_soon';

// ─── Normalized job model ──────────────────────────────────────────────────────
// Every import source produces this shape regardless of origin.

export interface ImportedJob {
  id:              string;   // client-generated UUID
  source:          ProviderType;
  jobNumber:       string;
  customer:        string;
  site:            string;
  address:         string;
  appointmentDate: string;   // YYYY-MM-DD
  appointmentTime: string;   // e.g. "8:00 AM"
  timeWindow:      string;   // e.g. "8:00 – 10:00 AM"
  phone:           string;
  technician:      string;
  jobType:         string;
  priority:        JobPriority;
  complaint:       string;
  notes:           string;
  equipment:       string;
  attachments:     string[];
  rawData:         unknown;  // original unparsed payload for audit trail
  importedAt:      string;   // ISO timestamp
  status:          ImportStatus;
  duplicateOf?:    string;   // id of existing job if flagged as duplicate
  // ── AI-extracted extras (voice / Talk Schedule) ──
  partsNeeded?:    string[];
  toolsNeeded?:    string[];
  reminders?:      string[];
  manufacturer?:   string;
  equipmentModel?: string;
}

export interface ParseResult {
  jobs:      Partial<ImportedJob>[];
  error?:    string;
  warnings?: string[];
}

export interface ProviderDefinition {
  id:          ProviderType;
  name:        string;
  tagline:     string;
  status:      ProviderStatus;
  category:    'manual' | 'file' | 'calendar' | 'email' | 'dispatch';
}
