export type ConversationIntent = 'schedule_job' | 'reminder' | 'note' | 'other';
export type CustomerType = 'existing' | 'new';

export type StepId =
  | 'INTENT'
  | 'NEW_OR_EXISTING'
  | 'CUSTOMER_SEARCH'
  | 'CUSTOMER_NAME'
  | 'SITE_NAME'
  | 'SERVICE_TYPE'
  | 'SERVICE_OTHER'
  | 'DATE'
  | 'TIME'
  | 'NOTES'
  | 'CONFIRM'
  | 'REMINDER_TEXT'
  | 'REMINDER_DATE'
  | 'NOTE_TEXT';

export interface CustomerMatch {
  name: string;
  site?: string;
  address?: string;
}

export interface ConversationData {
  intent: ConversationIntent | '';
  customerType: CustomerType | '';
  customerName: string;
  selectedCustomer: CustomerMatch | null;
  siteName: string;
  address: string;
  serviceType: string;
  serviceOtherDesc: string;
  date: string;
  time: string;
  notes: string;
  reminderText: string;
  reminderDate: string;
  noteText: string;
}

export const EMPTY_DATA: ConversationData = {
  intent: '',
  customerType: '',
  customerName: '',
  selectedCustomer: null,
  siteName: '',
  address: '',
  serviceType: '',
  serviceOtherDesc: '',
  date: '',
  time: '',
  notes: '',
  reminderText: '',
  reminderDate: '',
  noteText: '',
};

// ── Step path computation ────────────────────────────────────────────────────

export function getPath(data: ConversationData): StepId[] {
  const { intent, customerType, serviceType } = data;

  if (!intent) return ['INTENT'];

  if (intent === 'reminder') {
    return ['INTENT', 'REMINDER_TEXT', 'REMINDER_DATE', 'CONFIRM'];
  }

  if (intent === 'note' || intent === 'other') {
    return ['INTENT', 'NOTE_TEXT', 'CONFIRM'];
  }

  // schedule_job
  const path: StepId[] = ['INTENT', 'NEW_OR_EXISTING'];
  if (!customerType) return path;

  if (customerType === 'existing') {
    path.push('CUSTOMER_SEARCH');
  } else {
    path.push('CUSTOMER_NAME', 'SITE_NAME');
  }

  path.push('SERVICE_TYPE');
  if (serviceType === 'Other') path.push('SERVICE_OTHER');
  path.push('DATE', 'TIME', 'NOTES', 'CONFIRM');

  return path;
}

// ── Step display labels ──────────────────────────────────────────────────────

export const STEP_LABEL: Record<StepId, string> = {
  INTENT:         'What to do',
  NEW_OR_EXISTING:'Customer type',
  CUSTOMER_SEARCH:'Find customer',
  CUSTOMER_NAME:  'Customer name',
  SITE_NAME:      'Site / location',
  SERVICE_TYPE:   'Service type',
  SERVICE_OTHER:  'Service description',
  DATE:           'Date',
  TIME:           'Time',
  NOTES:          'Notes',
  CONFIRM:        'Confirm',
  REMINDER_TEXT:  'Reminder',
  REMINDER_DATE:  'When',
  NOTE_TEXT:      'Note',
};
