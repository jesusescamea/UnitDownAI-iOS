// ─── Dashboard-specific mock data ─────────────────────────────────────────────
// Kept separate from mockData.ts so the active-job data stays clean

export interface CalendarEvent {
  day: number; // day of month (June 2026)
  type: 'pm' | 'training' | 'appointment' | 'vacation' | 'emergency' | 'followup' | 'completed';
  label: string;
}

// June 2026 — today is June 27 (Saturday)
export const JUNE_EVENTS: CalendarEvent[] = [
  { day: 2,  type: 'completed',   label: 'PM Complete — Northgate Data Center' },
  { day: 5,  type: 'training',    label: 'EPA Section 608 Review — 9am, Office' },
  { day: 12, type: 'pm',          label: 'Quarterly PM — Lakeside Tower RTU-2' },
  { day: 15, type: 'followup',    label: 'Follow-up: AHU-5 bearing quote due' },
  { day: 20, type: 'emergency',   label: 'Emergency Call — Northgate CRAC-1 alarm' },
  { day: 22, type: 'vacation',    label: 'Vacation Day' },
  { day: 23, type: 'vacation',    label: 'Vacation Day' },
  { day: 25, type: 'completed',   label: 'PM Complete — Lakeside Tower RTU-2' },
  { day: 27, type: 'appointment', label: '3 jobs assigned — Summit Medical, Northgate, Ridgeline' },
  { day: 30, type: 'followup',    label: 'Refrigerant leak check — Summit Medical RTU-3' },
];

export const EVENT_COLORS: Record<CalendarEvent['type'], string> = {
  appointment: 'bg-orange-500',   // Service Call  = Orange
  pm:          'bg-blue-500',     // PM            = Blue
  emergency:   'bg-red-500',      // Emergency     = Red
  completed:   'bg-green-500',    // Completed     = Green
  followup:    'bg-yellow-400',   // Follow-up     = Yellow
  training:    'bg-teal-500',     // Training      = Teal
  vacation:    'bg-gray-500',     // Vacation      = Gray
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

export interface EquipmentAttention {
  id: string;
  unit: string;
  customer: string;
  location: string;
  issue: string;
  detail: string;
  severity: 'high' | 'medium' | 'low';
  visits: number;
  period: string;
  lastService: string;
}

export const EQUIPMENT_ATTENTION: EquipmentAttention[] = [
  {
    id: 'RTU-3',
    unit: 'Carrier 50XCQ006 — RTU-3',
    customer: 'Summit Medical Plaza',
    location: 'Rooftop, North Wing',
    issue: 'Repeated Code 82',
    detail: 'High pressure lockout on 3 of last 4 visits. Coil cleaning deferred twice.',
    severity: 'high',
    visits: 3,
    period: '12 months',
    lastService: 'Today',
  },
  {
    id: 'AHU-5',
    unit: 'Trane AHU-5',
    customer: 'Parkway Medical Center',
    location: 'Mechanical Room B',
    issue: 'Bearing vibration increasing',
    detail: 'Supply fan motor vibration 0.12 in/s → 0.31 in/s over last 2 visits. Approaching alarm threshold.',
    severity: 'medium',
    visits: 2,
    period: '6 months',
    lastService: 'Yesterday',
  },
  {
    id: 'CRAC-3',
    unit: 'Liebert DS150 — CRAC-3',
    customer: 'Northgate Data Center',
    location: 'Server Room C',
    issue: 'Humidifier canister overdue',
    detail: 'Canister replacement noted at last PM. Now 35 days past recommended interval.',
    severity: 'low',
    visits: 1,
    period: '3 months',
    lastService: 'Jun 2',
  },
];

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
    preview: 'Northgate shifted to 1:00pm per customer request — badge access confirmed at main gate.',
    time: '7:12 AM',
    unread: true,
    urgent: false,
  },
  {
    id: 'msg-2',
    from: 'Parts Dept.',
    preview: 'R-410A cylinder restocked — on your truck. Dual cap 35/5µF also pulled for RTU-3 if needed.',
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
  {
    id: 'ra-1',
    type: 'usr',
    summary: 'USR Generated — USR-2026-004920',
    customer: 'Parkway Medical Center',
    equipment: 'AHU-5',
    timeLabel: 'Yesterday 4:47 PM',
    icon: '📄',
  },
  {
    id: 'ra-2',
    type: 'recommendation',
    summary: 'Recommendation added — fan motor replacement quoted',
    customer: 'Parkway Medical Center',
    equipment: 'AHU-5',
    timeLabel: 'Yesterday 3:21 PM',
    icon: '📋',
  },
  {
    id: 'ra-3',
    type: 'pm',
    summary: 'PM Completed — quarterly service',
    customer: 'Lakeside Tower',
    equipment: 'RTU-2',
    timeLabel: 'Jun 25 2:10 PM',
    icon: '✅',
  },
  {
    id: 'ra-4',
    type: 'emergency',
    summary: 'Emergency call — CRAC-1 high temp alarm',
    customer: 'Northgate Data Center',
    equipment: 'Liebert CRAC-1',
    timeLabel: 'Jun 20 11:34 AM',
    icon: '🚨',
  },
  {
    id: 'ra-5',
    type: 'note',
    summary: 'Note logged — unit restarted, monitoring overnight',
    customer: 'Northgate Data Center',
    equipment: 'Liebert CRAC-1',
    timeLabel: 'Jun 20 12:05 PM',
    icon: '📝',
  },
  {
    id: 'ra-6',
    type: 'pm',
    summary: 'Annual PM — all readings in spec',
    customer: 'Northgate Data Center',
    equipment: 'CRAC-1',
    timeLabel: 'Jun 2 1:45 PM',
    icon: '✅',
  },
];

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
  { id: 'jobs',      label: "Today's Jobs",    value: 3,   subtitle: '1 high priority',   icon: '🔧', color: 'bg-amber-950/40',  borderColor: 'border-amber-800/60',  urgent: true  },
  { id: 'progress',  label: 'In Progress',     value: 0,   subtitle: 'none active',       icon: '▶',  color: 'bg-gray-900',      borderColor: 'border-gray-800',      urgent: false },
  { id: 'pms',       label: 'PMs Due',         value: 2,   subtitle: 'this week',         icon: '📅', color: 'bg-blue-950/40',   borderColor: 'border-blue-800/60',   urgent: false },
  { id: 'followups', label: 'Follow-Ups',      value: 2,   subtitle: '1 due in 13 days',  icon: '🔁', color: 'bg-orange-950/40', borderColor: 'border-orange-800/60', urgent: false },
  { id: 'quotes',    label: 'Open Quotes',     value: 1,   subtitle: 'AHU-5 motor quote', icon: '💬', color: 'bg-gray-900',      borderColor: 'border-gray-800',      urgent: false },
  { id: 'parts',     label: 'Waiting on Parts',value: 1,   subtitle: 'CRAC-3 canister',   icon: '📦', color: 'bg-gray-900',      borderColor: 'border-gray-800',      urgent: false },
  { id: 'messages',  label: 'Messages',        value: 2,   subtitle: '2 unread',          icon: '💬', color: 'bg-purple-950/40', borderColor: 'border-purple-800/60', urgent: false },
  { id: 'training',  label: 'Training Due',    value: '!', subtitle: 'EPA 608 — Aug 1',   icon: '🎓', color: 'bg-green-950/40',  borderColor: 'border-green-800/60',  urgent: false },
];
