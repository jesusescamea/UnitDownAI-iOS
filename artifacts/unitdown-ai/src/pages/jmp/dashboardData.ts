// ─── Dashboard-specific mock data ─────────────────────────────────────────────

export interface CalendarEvent {
  day: number;
  type: 'pm' | 'training' | 'appointment' | 'vacation' | 'emergency' | 'followup' | 'completed';
  label: string;
}

export const JUNE_EVENTS: CalendarEvent[] = [
  { day: 2,  type: 'completed',   label: 'PM Complete' },
  { day: 5,  type: 'training',    label: 'EPA Section 608 Review — 9am, Office' },
  { day: 12, type: 'pm',          label: 'Quarterly PM — RTU' },
  { day: 15, type: 'followup',    label: 'Follow-up: AHU bearing quote due' },
  { day: 20, type: 'emergency',   label: 'Emergency call — rooftop unit alarm' },
  { day: 22, type: 'vacation',    label: 'Vacation Day' },
  { day: 23, type: 'vacation',    label: 'Vacation Day' },
  { day: 25, type: 'completed',   label: 'PM Complete' },
  { day: 27, type: 'appointment', label: 'Service calls scheduled' },
  { day: 30, type: 'followup',    label: 'Refrigerant leak check follow-up' },
];

export const EVENT_COLORS: Record<CalendarEvent['type'], string> = {
  appointment: 'bg-orange-500',
  pm:          'bg-blue-500',
  emergency:   'bg-red-500',
  completed:   'bg-green-500',
  followup:    'bg-yellow-400',
  training:    'bg-teal-500',
  vacation:    'bg-gray-500',
};

export const EVENT_LABELS: Record<CalendarEvent['type'], string> = {
  appointment: 'Service Call',
  pm:          'PM',
  emergency:   'Emergency',
  completed:   'Completed',
  followup:    'Follow-up',
  training:    'Training',
  vacation:    'Vacation',
};

// ─── Equipment Intelligence ────────────────────────────────────────────────────

export interface AiInsight {
  pattern: string;
  stats: string[];
  analysis: string;
  rootCauses: string[];
  suggestedParts: string[];
}

export interface EqServiceHistory {
  date: string;
  tech: string;
  type: string;
  summary: string;
  alarms?: string[];
  parts?: string[];
}

export interface EquipmentAttention {
  id: string;
  unit: string;
  unitTag: string;
  model: string;
  customer: string;
  location: string;
  issue: string;
  detail: string;
  severity: 'high' | 'medium' | 'low';
  visits: number;
  period: string;
  lastService: string;
  aiInsight: AiInsight;
  serviceHistory: EqServiceHistory[];
  measurements?: { label: string; value: string; trend?: 'up' | 'down' | 'stable' }[];
}

export const EQUIPMENT_ATTENTION: EquipmentAttention[] = [
  {
    id: 'AHU-5-PMC',
    unit: 'Parkway Medical Center',
    unitTag: 'Mech Room B · AHU-5',
    model: 'Trane AHU-5',
    customer: 'Parkway Medical Center',
    location: 'Mechanical Room B',
    issue: 'Escalating bearing vibration',
    detail: 'Supply fan motor vibration 0.12 in/s → 0.31 in/s over last 2 visits. Approaching alarm threshold.',
    severity: 'medium',
    visits: 2,
    period: '6 months',
    lastService: 'Yesterday',
    aiInsight: {
      pattern: 'Progressive vibration increase over 3 readings',
      stats: ['0.12 → 0.31 in/s', '2 visits, 6 months', 'Approaching 0.4 in/s alarm'],
      analysis: 'A bearing that is progressively worsening over multiple visits rarely fails in isolation. Progressive vibration increase points to a mechanical root cause that the bearing is reacting to — not originating from.',
      rootCauses: [
        'Worn or misaligned sheaves on belt drive',
        'Pulley misalignment creating radial load',
        'Motor shaft runout or bent shaft',
        'Belt tension too tight',
        'Motor mounting feet loose or soft-footing',
        'Resonance from structural attachment point',
      ],
      suggestedParts: ['Replacement bearings', 'Sheave set', 'Belt set', 'Vibration meter', 'Motor alignment tool'],
    },
    serviceHistory: [
      { date: 'Jun 26, 2026', tech: '—', type: 'Service Call', summary: 'Vibration at 0.31 in/s. Fan motor quoted for replacement.' },
      { date: 'Jan 8, 2026',  tech: '—', type: 'PM',           summary: 'Vibration first noted at 0.12 in/s. Logged for monitoring.' },
      { date: 'Jul 2025',     tech: '—', type: 'PM',           summary: 'Routine PM. No abnormal readings. Belts replaced.' },
    ],
    measurements: [
      { label: 'Vibration',    value: '0.31 in/s', trend: 'up' },
      { label: 'Motor Amps',   value: '14.2 A',    trend: 'up' },
      { label: 'Supply CFM',   value: '4,200',     trend: 'stable' },
    ],
  },
];

// ─── Office Messages ──────────────────────────────────────────────────────────

export interface OfficeMessage {
  id: string;
  from: string;
  preview: string;
  time: string;
  unread: boolean;
  urgent: boolean;
}

export const OFFICE_MESSAGES: OfficeMessage[] = [
  {
    id: 'msg-1',
    from: 'Sarah (Dispatch)',
    preview: 'Job schedule updated — check your route for today.',
    time: '7:12 AM',
    unread: true,
    urgent: false,
  },
  {
    id: 'msg-2',
    from: 'Parts Dept.',
    preview: 'R-410A cylinder restocked — on your truck.',
    time: 'Yesterday',
    unread: true,
    urgent: false,
  },
  {
    id: 'msg-3',
    from: 'Mike (Supervisor)',
    preview: 'Training reminder: EPA Section 608 renewal due August 1. Online test link in email.',
    time: 'Jun 25',
    unread: false,
    urgent: false,
  },
];

// ─── Recent Activity ──────────────────────────────────────────────────────────

export interface RecentActivity {
  id: string;
  type: 'usr' | 'recommendation' | 'pm' | 'arrival' | 'emergency' | 'part' | 'note' | 'quote';
  summary: string;
  customer: string;
  equipment: string;
  timeLabel: string;
  icon: string;
}

export const RECENT_ACTIVITY: RecentActivity[] = [
  { id: 'ra-1', type: 'usr',            summary: 'USR Generated — USR-2026-004920',                customer: 'Parkway Medical Center', equipment: 'AHU-5',         timeLabel: 'Yesterday 4:47 PM', icon: '📄' },
  { id: 'ra-2', type: 'recommendation', summary: 'Recommendation added — fan motor quoted',         customer: 'Parkway Medical Center', equipment: 'AHU-5',         timeLabel: 'Yesterday 3:21 PM', icon: '📋' },
  { id: 'ra-3', type: 'pm',             summary: 'PM Completed — quarterly service',                customer: 'Lakeside Tower',         equipment: 'RTU-2',         timeLabel: 'Jun 25 2:10 PM',    icon: '✅' },
  { id: 'ra-4', type: 'emergency',      summary: 'Emergency call — rooftop unit high temp alarm',    customer: 'Commercial Customer',   equipment: 'CRAC Unit',     timeLabel: 'Jun 20 11:34 AM',   icon: '🚨' },
  { id: 'ra-5', type: 'note',           summary: 'Note logged — unit restarted, monitoring O/N',    customer: 'Commercial Customer',   equipment: 'CRAC Unit',     timeLabel: 'Jun 20 12:05 PM',   icon: '📝' },
  { id: 'ra-6', type: 'pm',             summary: 'Annual PM — all readings in spec',                customer: 'Commercial Customer',   equipment: 'CRAC Unit',     timeLabel: 'Jun 2 1:45 PM',     icon: '✅' },
];

// ─── Dashboard stat tiles ──────────────────────────────────────────────────────

export interface DashboardStat {
  id: string;
  label: string;
  value: number | string;
  subtitle: string;
  icon: string;
  color: string;
  borderColor: string;
  urgent: boolean;
}

export const DASHBOARD_STATS: DashboardStat[] = [
  { id: 'jobs',      label: "Today's Jobs",     value: 0,   subtitle: 'no jobs scheduled', icon: '🔧', color: 'bg-amber-950/40',  borderColor: 'border-amber-800/60',  urgent: false },
  { id: 'progress',  label: 'In Progress',      value: 0,   subtitle: 'none active',       icon: '▶',  color: 'bg-gray-900',      borderColor: 'border-gray-800',      urgent: false },
  { id: 'pms',       label: 'PMs Due',          value: 0,   subtitle: 'none this week',    icon: '📅', color: 'bg-blue-950/40',   borderColor: 'border-blue-800/60',   urgent: false },
  { id: 'followups', label: 'Follow-Ups',       value: 0,   subtitle: 'none pending',      icon: '🔁', color: 'bg-orange-950/40', borderColor: 'border-orange-800/60', urgent: false },
  { id: 'quotes',    label: 'Open Quotes',      value: 0,   subtitle: 'none open',         icon: '💬', color: 'bg-gray-900',      borderColor: 'border-gray-800',      urgent: false },
  { id: 'parts',     label: 'Waiting on Parts', value: 0,   subtitle: 'none pending',      icon: '📦', color: 'bg-gray-900',      borderColor: 'border-gray-800',      urgent: false },
  { id: 'messages',  label: 'Messages',         value: 0,   subtitle: 'inbox empty',       icon: '💬', color: 'bg-purple-950/40', borderColor: 'border-purple-800/60', urgent: false },
  { id: 'training',  label: 'Training Due',     value: '!', subtitle: 'EPA 608 — Aug 1',   icon: '🎓', color: 'bg-green-950/40',  borderColor: 'border-green-800/60',  urgent: false },
];
