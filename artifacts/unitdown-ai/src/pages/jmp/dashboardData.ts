// ─── Dashboard-specific mock data ─────────────────────────────────────────────

export interface CalendarEvent {
  day: number;
  type: 'pm' | 'training' | 'appointment' | 'vacation' | 'emergency' | 'followup' | 'completed';
  label: string;
}

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
    id: 'RTU-3',
    unit: 'Summit Medical Plaza',
    unitTag: 'North Roof · RTU-3',
    model: 'Carrier 50XCQ006',
    customer: 'Summit Medical Plaza',
    location: 'Rooftop, North Wing',
    issue: 'Repeated Code 82',
    detail: 'High pressure lockout on 3 of last 4 visits. Coil cleaning deferred twice.',
    severity: 'high',
    visits: 3,
    period: '12 months',
    lastService: 'Today',
    aiInsight: {
      pattern: 'Repeated Code 82 — High Pressure Lockout',
      stats: ['3 lockouts', '3 visits in 12 mo.', '2 condenser cleanings'],
      analysis: 'Repeated condenser cleaning has not resolved the high-pressure condition. When cleaning alone fails to correct Code 82, the root cause is likely upstream of the coil — restricted airflow, fan performance, or refrigerant system issues.',
      rootCauses: [
        'Condenser airflow restriction (blocked inlet/discharge)',
        'Condenser fan not reaching rated RPM',
        'Refrigerant overcharge',
        'Non-condensables in the refrigerant circuit',
        'Liquid line restriction',
        'Failed or incorrect TXV',
      ],
      suggestedParts: ['Dual run capacitor', 'Contactor', 'Coil cleaner', 'Pressure gauges', 'Refrigerant'],
    },
    serviceHistory: [
      { date: 'Jun 27, 2026', tech: '—', type: 'Service Call', summary: 'Code 82 active. Unit not cooling.', alarms: ['Code 82 — High Pressure'] },
      { date: 'Apr 15, 2025', tech: '—', type: 'Service Call', summary: 'Code 82. Cleared alarm, recommended condenser cleaning. Deferred.', alarms: ['Code 82 — High Pressure'] },
      { date: 'Aug 3, 2024',  tech: '—', type: 'Service Call', summary: 'Code 82. Cleared and restarted. Condenser cleaning deferred again.', alarms: ['Code 82 — High Pressure'] },
      { date: 'Mar 12, 2024', tech: '—', type: 'PM',           summary: 'Annual PM. Belt replaced (3VX425). All readings within spec.', parts: ['Belt 3VX425'] },
    ],
    measurements: [
      { label: 'Head Pressure',  value: '385 psi', trend: 'up' },
      { label: 'Superheat',      value: '24°F',    trend: 'up' },
      { label: 'Supply Air',     value: '61°F',    trend: 'stable' },
      { label: 'Delta T',        value: '11°F',    trend: 'down' },
    ],
  },
  {
    id: 'AHU-5',
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
  {
    id: 'CRAC-3',
    unit: 'Northgate Data Center',
    unitTag: 'Server Room C · CRAC-3',
    model: 'Liebert DS150',
    customer: 'Northgate Data Center',
    location: 'Server Room C',
    issue: 'Humidifier canister overdue',
    detail: 'Canister replacement noted at last PM. Now 35 days past recommended interval.',
    severity: 'low',
    visits: 1,
    period: '3 months',
    lastService: 'Jun 2',
    aiInsight: {
      pattern: 'Humidifier canister past service interval',
      stats: ['35 days overdue', '1 deferred replacement', 'Humidity trending -4%'],
      analysis: 'A scaled canister increases resistance in the humidifier circuit, reducing output and stressing the heating element. In data center environments, low humidity is a static discharge risk. The longer the deferral, the more likely the canister will fail mid-cycle rather than at a scheduled replacement.',
      rootCauses: [
        'High mineral content in local water supply (scale buildup)',
        'Incorrect canister specification for water hardness',
        'Deferred PM schedule causing accelerated scaling',
      ],
      suggestedParts: ['Humidifier canister (Liebert DS-series)', 'Water treatment tablets', 'Descaling solution'],
    },
    serviceHistory: [
      { date: 'Jun 2, 2026',  tech: '—', type: 'PM', summary: 'Annual PM. Canister noted as needing replacement. Deferred pending parts order.', parts: ['Canister on order'] },
      { date: 'Feb 5, 2026',  tech: '—', type: 'PM', summary: 'Quarterly PM. Canister at 80% life. Noted for replacement at next PM.' },
      { date: 'Jun 20, 2025', tech: '—', type: 'Emergency', summary: 'High temperature alarm. Low humidity contributing factor. Canister replaced.', alarms: ['High Temp Alarm'] },
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
  { id: 'ra-4', type: 'emergency',      summary: 'Emergency call — CRAC-1 high temp alarm',         customer: 'Northgate Data Center',  equipment: 'Liebert CRAC-1',timeLabel: 'Jun 20 11:34 AM',   icon: '🚨' },
  { id: 'ra-5', type: 'note',           summary: 'Note logged — unit restarted, monitoring O/N',    customer: 'Northgate Data Center',  equipment: 'Liebert CRAC-1',timeLabel: 'Jun 20 12:05 PM',   icon: '📝' },
  { id: 'ra-6', type: 'pm',             summary: 'Annual PM — all readings in spec',                customer: 'Northgate Data Center',  equipment: 'CRAC-1',        timeLabel: 'Jun 2 1:45 PM',     icon: '✅' },
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
  { id: 'jobs',      label: "Today's Jobs",     value: 3,   subtitle: '1 high priority',   icon: '🔧', color: 'bg-amber-950/40',  borderColor: 'border-amber-800/60',  urgent: true  },
  { id: 'progress',  label: 'In Progress',      value: 0,   subtitle: 'none active',       icon: '▶',  color: 'bg-gray-900',      borderColor: 'border-gray-800',      urgent: false },
  { id: 'pms',       label: 'PMs Due',          value: 2,   subtitle: 'this week',         icon: '📅', color: 'bg-blue-950/40',   borderColor: 'border-blue-800/60',   urgent: false },
  { id: 'followups', label: 'Follow-Ups',       value: 2,   subtitle: '1 due in 13 days',  icon: '🔁', color: 'bg-orange-950/40', borderColor: 'border-orange-800/60', urgent: false },
  { id: 'quotes',    label: 'Open Quotes',      value: 1,   subtitle: 'AHU-5 motor quote', icon: '💬', color: 'bg-gray-900',      borderColor: 'border-gray-800',      urgent: false },
  { id: 'parts',     label: 'Waiting on Parts', value: 1,   subtitle: 'CRAC-3 canister',   icon: '📦', color: 'bg-gray-900',      borderColor: 'border-gray-800',      urgent: false },
  { id: 'messages',  label: 'Messages',         value: 2,   subtitle: '2 unread',          icon: '💬', color: 'bg-purple-950/40', borderColor: 'border-purple-800/60', urgent: false },
  { id: 'training',  label: 'Training Due',     value: '!', subtitle: 'EPA 608 — Aug 1',   icon: '🎓', color: 'bg-green-950/40',  borderColor: 'border-green-800/60',  urgent: false },
];
