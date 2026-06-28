import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ChevronLeft, ChevronRight, User, MapPin, Cpu,
  Calendar, ClipboardList, CheckCircle, AlertTriangle,
  Camera, Plus, Download,
} from 'lucide-react';
import type { TodayJob } from './mockData';
import type { CalendarEvent } from './dashboardData';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScheduleWizardResult {
  job: TodayJob;
  calEvent: CalendarEvent;
  isToday: boolean;
}

interface Props {
  onClose:      () => void;
  onCreate:     (result: ScheduleWizardResult) => void;
  defaultDate?: string;
}

interface WizardData {
  // Step 1 — Customer
  businessName:      string;
  contactName:       string;
  phone:             string;
  email:             string;
  // Step 2 — Site
  siteName:          string;
  serviceAddress:    string;
  cityState:         string;
  accessNotes:       string;
  specialNotes:      string;
  // Step 3 — Equipment
  equipmentType:     string;
  unitLabel:         string;
  manufacturer:      string;
  modelNumber:       string;
  serialNumber:      string;
  locationOnSite:    string;
  refrigerant:       string;
  voltage:           string;
  // Step 4 — Schedule
  jobType:           string;
  customJobTitle:    string;
  date:              string;
  timeWindow:        string;
  priority:          'emergency' | 'high' | 'normal' | 'pm';
  assignedTech:      string;
  complaint:         string;
  notes:             string;
}

const EMPTY: WizardData = {
  businessName: '', contactName: '', phone: '', email: '',
  siteName: '', serviceAddress: '', cityState: '', accessNotes: '', specialNotes: '',
  equipmentType: 'RTU (Packaged Rooftop Unit)', unitLabel: '', manufacturer: '',
  modelNumber: '', serialNumber: '', locationOnSite: '', refrigerant: '', voltage: '',
  jobType: 'Service Call', customJobTitle: '', date: new Date().toISOString().split('T')[0],
  timeWindow: '8:00 – 10:00 AM', priority: 'normal',
  assignedTech: 'Marcus Rivera', complaint: '', notes: '',
};

const EQUIPMENT_TYPES = [
  'RTU (Packaged Rooftop Unit)', 'AHU (Air Handler)', 'CRAC (Computer Room A/C)',
  'Chiller', 'Boiler', 'Split System', 'VRF / Mini-Split', 'Heat Pump',
  'Fan Coil Unit', 'Other',
];

const JOB_TYPES = ['Service Call', 'Preventive Maintenance (PM)', 'Follow-up', 'Emergency', 'Other'];

const TIME_WINDOWS = [
  '7:00 – 9:00 AM', '8:00 – 10:00 AM', '9:00 AM – 12:00 PM',
  '12:00 – 2:00 PM', '1:00 – 3:00 PM', '2:00 – 5:00 PM',
  'All Day', 'ASAP / Emergency',
];

const TECHS = ['Marcus Rivera', 'D. Carter', 'J. Williams', '(Call out / Unassigned)'];

const PRIORITY_OPTIONS: { value: WizardData['priority']; label: string; color: string }[] = [
  { value: 'normal',    label: 'Normal',    color: 'border-blue-600/60 bg-blue-900/20 text-blue-300' },
  { value: 'high',      label: 'High',      color: 'border-amber-600/60 bg-amber-900/20 text-amber-300' },
  { value: 'emergency', label: 'Emergency', color: 'border-red-600/60 bg-red-900/20 text-red-300' },
  { value: 'pm',        label: 'PM',        color: 'border-gray-600/60 bg-gray-800 text-gray-300' },
];

const STEPS = [
  { label: 'Customer', icon: User },
  { label: 'Site',     icon: MapPin },
  { label: 'Equipment',icon: Cpu },
  { label: 'Schedule', icon: Calendar },
  { label: 'Review',   icon: ClipboardList },
];

// ─── Saved equipment mock data (prototype) ────────────────────────────────────
// Derived from the same customers as EQUIPMENT_ATTENTION in dashboardData.ts.
// These are shown when the user's entered businessName matches a known site.
// In production this would come from GET /api/units?clientId=...

interface SavedEquipmentRecord {
  id:             string;
  unitLabel:      string;
  equipmentType:  string;
  manufacturer:   string;
  modelNumber:    string;
  serialNumber:   string;
  locationOnSite: string;
  lastService:    string;
  refrigerant:    string;
  voltage:        string;
  openIssue:      string | null;
}

const SAVED_EQUIPMENT_BY_CUSTOMER: Record<string, SavedEquipmentRecord[]> = {
  'summit medical plaza': [
    { id: 'eq-SMP-RTU3', unitLabel: 'RTU-3', equipmentType: 'RTU (Packaged Rooftop Unit)',
      manufacturer: 'Carrier', modelNumber: '50XCQ006', serialNumber: '4321A8876',
      locationOnSite: 'Rooftop, North Wing', lastService: 'Jun 27, 2026',
      refrigerant: 'R-410A', voltage: '208/230V 3-Phase',
      openIssue: 'Repeated Code 82 — High Pressure Lockout' },
    { id: 'eq-SMP-AHU1', unitLabel: 'AHU-1', equipmentType: 'AHU (Air Handler)',
      manufacturer: 'Carrier', modelNumber: 'CNPVP4821ALA', serialNumber: '3219C4421',
      locationOnSite: 'Basement, Mechanical Room', lastService: 'Mar 12, 2024',
      refrigerant: 'R-410A', voltage: '208/230V 1-Phase', openIssue: null },
  ],
  'northgate data center': [
    { id: 'eq-NDC-CRAC1', unitLabel: 'CRAC-1', equipmentType: 'CRAC (Computer Room A/C)',
      manufacturer: 'Liebert', modelNumber: 'DS150', serialNumber: '0921LD5431',
      locationOnSite: 'Server Room B', lastService: 'Jun 27, 2026',
      refrigerant: 'R-407C', voltage: '208/230V 3-Phase', openIssue: null },
  ],
  'ridgeline office park': [
    { id: 'eq-ROP-RTU7', unitLabel: 'RTU-7', equipmentType: 'RTU (Packaged Rooftop Unit)',
      manufacturer: 'Trane', modelNumber: 'YCD150', serialNumber: '7821TY3301',
      locationOnSite: 'Rooftop', lastService: 'Jun 27, 2026',
      refrigerant: 'R-410A', voltage: '460V 3-Phase', openIssue: null },
    { id: 'eq-ROP-RTU8', unitLabel: 'RTU-8', equipmentType: 'RTU (Packaged Rooftop Unit)',
      manufacturer: 'Trane', modelNumber: 'YCD090', serialNumber: '7821TY3302',
      locationOnSite: 'Rooftop', lastService: 'Apr 15, 2025',
      refrigerant: 'R-410A', voltage: '460V 3-Phase', openIssue: null },
    { id: 'eq-ROP-AHU1', unitLabel: 'AHU-1', equipmentType: 'AHU (Air Handler)',
      manufacturer: 'Trane', modelNumber: 'TAM8', serialNumber: '6612TR9901',
      locationOnSite: 'Mechanical Room', lastService: 'Apr 15, 2025',
      refrigerant: 'R-410A', voltage: '208/230V 1-Phase', openIssue: null },
  ],
};

function getSavedEquipment(businessName: string): SavedEquipmentRecord[] {
  const lower = businessName.toLowerCase().trim();
  if (!lower) return [];
  for (const [key, equip] of Object.entries(SAVED_EQUIPMENT_BY_CUSTOMER)) {
    if (lower.includes(key) || key.includes(lower)) return equip;
  }
  return [];
}

// ─── Saved customer & site mock data (prototype) ──────────────────────────────
// In production these would come from a real customer/site database.

interface SavedCustomerRecord {
  id:           string;
  businessName: string;
  contactName:  string;
  phone:        string;
  email:        string;
}

const SAVED_CUSTOMERS: SavedCustomerRecord[] = [
  { id: 'cust-SMP', businessName: 'Summit Medical Plaza',  contactName: 'Sarah Johnson', phone: '(214) 555-0100', email: 'sarah@summitmedical.com' },
  { id: 'cust-NDC', businessName: 'Northgate Data Center', contactName: 'Mike Torres',   phone: '(972) 555-0233', email: 'mtorres@northgatedc.com' },
  { id: 'cust-ROP', businessName: 'Ridgeline Office Park',  contactName: 'Dana Williams', phone: '(469) 555-0181', email: 'dwilliams@ridgelineop.com' },
  { id: 'cust-PMC', businessName: 'Parkway Medical Center', contactName: 'James Lee',     phone: '(214) 555-0340', email: 'jlee@parkwaymed.com' },
  { id: 'cust-LT',  businessName: 'Lakeside Tower',         contactName: 'Rachel Burns',  phone: '(972) 555-0422', email: 'rburns@lakesidetower.com' },
];

interface SavedSiteRecord {
  id:             string;
  siteName:       string;
  serviceAddress: string;
  cityState:      string;
  accessNotes:    string;
}

const SAVED_SITES_BY_CUSTOMER: Record<string, SavedSiteRecord[]> = {
  'cust-SMP': [
    { id: 'site-SMP-1', siteName: 'Main Building',      serviceAddress: '4521 Medical Drive', cityState: 'Dallas, TX 75201',   accessNotes: 'Badge required at main entrance. Roof hatch unlocked after 7 AM.' },
    { id: 'site-SMP-2', siteName: 'North Campus Annex', serviceAddress: '4533 Medical Drive', cityState: 'Dallas, TX 75201',   accessNotes: 'Park in Lot C. Check in with security.' },
  ],
  'cust-NDC': [
    { id: 'site-NDC-1', siteName: 'Data Center — Building 1', serviceAddress: '8800 Northgate Blvd', cityState: 'Plano, TX 75025',    accessNotes: 'Escort required. Call Mike on arrival.' },
  ],
  'cust-ROP': [
    { id: 'site-ROP-1', siteName: 'Building A — West Tower', serviceAddress: '1100 Ridgeline Pkwy', cityState: 'Irving, TX 75063',   accessNotes: 'Roof access via stairwell 3. Key on file.' },
    { id: 'site-ROP-2', siteName: 'Building B — East Tower', serviceAddress: '1120 Ridgeline Pkwy', cityState: 'Irving, TX 75063',   accessNotes: '' },
  ],
  'cust-PMC': [
    { id: 'site-PMC-1', siteName: 'Main Hospital',      serviceAddress: '2200 Parkway Blvd',  cityState: 'Garland, TX 75042',  accessNotes: 'Facilities entrance on south side.' },
  ],
  'cust-LT': [
    { id: 'site-LT-1',  siteName: 'Tower — Lobby Level', serviceAddress: '500 Lakeside Dr',   cityState: 'Addison, TX 75001',  accessNotes: 'Sign in with concierge.' },
  ],
};

function getSavedSites(customerId: string | null): SavedSiteRecord[] {
  if (!customerId) return [];
  return SAVED_SITES_BY_CUSTOMER[customerId] ?? [];
}

// ─── Field components ─────────────────────────────────────────────────────────

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
      {children}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <Label required={required}>{label}</Label>
      {children}
    </div>
  );
}

const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors';
const selectCls = 'w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors';
const textareaCls = 'w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors resize-none';

// ─── Main component ───────────────────────────────────────────────────────────

export function ScheduleJobWizard({ onClose, onCreate, defaultDate }: Props) {
  const [step, setStep]             = useState(0);
  const [data, setData]             = useState<WizardData>(() => ({
    ...EMPTY,
    date: defaultDate ?? EMPTY.date,
  }));
  const [errors, setErrors]         = useState<Partial<Record<keyof WizardData, string>>>({});
  const [customerMode, setCustomerMode]             = useState<'existing' | 'new'>('existing');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedSiteId, setSelectedSiteId]         = useState<string | null>(null);
  const [selectedEquipId, setSelectedEquipId]       = useState<string | null>(null);
  const [equipMode, setEquipMode]                   = useState<'manual' | null>(null);
  const [showScanNote,   setShowScanNote]   = useState(false);
  const [showImportNote, setShowImportNote] = useState(false);
  const [siteMode,       setSiteMode]       = useState<'saved' | 'new'>('saved');

  function set<K extends keyof WizardData>(key: K, value: WizardData[K]) {
    setData(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => { const e = { ...prev }; delete e[key]; return e; });
  }

  function selectEquipment(eq: SavedEquipmentRecord) {
    setSelectedEquipId(eq.id);
    setEquipMode(null);
    setShowScanNote(false);
    setShowImportNote(false);
    setData(prev => ({
      ...prev,
      equipmentType:  eq.equipmentType,
      unitLabel:      eq.unitLabel,
      manufacturer:   eq.manufacturer,
      modelNumber:    eq.modelNumber,
      serialNumber:   eq.serialNumber,
      locationOnSite: eq.locationOnSite,
      refrigerant:    eq.refrigerant,
      voltage:        eq.voltage,
    }));
  }

  function selectCustomer(cust: SavedCustomerRecord) {
    setSelectedCustomerId(cust.id);
    setSelectedSiteId(null);
    setSelectedEquipId(null);
    setEquipMode(null);
    setSiteMode('saved');
    setData(prev => ({
      ...prev,
      businessName:   cust.businessName,
      contactName:    cust.contactName,
      phone:          cust.phone,
      email:          cust.email,
      siteName:       '', serviceAddress: '', cityState: '', accessNotes: '', specialNotes: '',
      unitLabel:      '', manufacturer:   '', modelNumber:  '', serialNumber:  '',
      locationOnSite: '', refrigerant:    '', voltage:      '',
    }));
  }

  function selectSite(site: SavedSiteRecord) {
    setSelectedSiteId(site.id);
    setSelectedEquipId(null);
    setEquipMode(null);
    setData(prev => ({
      ...prev,
      siteName:       site.siteName,
      serviceAddress: site.serviceAddress,
      cityState:      site.cityState,
      accessNotes:    site.accessNotes,
    }));
  }

  const savedEquipment = getSavedEquipment(data.businessName);
  const savedSites     = getSavedSites(selectedCustomerId);

  function validate(): boolean {
    const e: typeof errors = {};
    if (!data.businessName.trim()) e.businessName = 'Business name is required';
    if (!data.complaint.trim())    e.complaint    = 'Complaint / task is required';
    if (!data.date)                e.date         = 'Date is required';
    if (data.jobType === 'Other' && !data.customJobTitle.trim())
      e.customJobTitle = 'Custom job title is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function canAdvance(): boolean {
    if (step === 0) return customerMode === 'existing'
      ? selectedCustomerId !== null
      : data.businessName.trim().length > 0;
    if (step === 3) {
      const baseOk = data.complaint.trim().length > 0 && !!data.date;
      const customOk = data.jobType !== 'Other' || data.customJobTitle.trim().length > 0;
      return baseOk && customOk;
    }
    return true;
  }

  const effectiveJobType = data.jobType === 'Other' && data.customJobTitle.trim()
    ? data.customJobTitle.trim()
    : data.jobType;

  function handleCreate() {
    if (!validate()) { setStep(3); return; } // jump back to schedule step if invalid

    const id = `SCHED-${Date.now()}`;
    const selectedDate = new Date(data.date + 'T00:00:00');
    const today = new Date();
    const isToday = selectedDate.toDateString() === today.toDateString();
    const dayNum  = selectedDate.getDate();

    const jobTypePriority: Record<string, WizardData['priority']> = {
      'Emergency': 'emergency',
      'Preventive Maintenance (PM)': 'pm',
    };
    const resolvedPriority = data.jobType in jobTypePriority
      ? jobTypePriority[data.jobType]
      : data.priority;

    const equipShort = data.unitLabel
      ? `${data.equipmentType.split(' ')[0]} · ${data.unitLabel}`
      : data.equipmentType.split(' ')[0];

    const job: TodayJob = {
      id,
      priority:      resolvedPriority,
      status:        'open',
      type:          effectiveJobType,
      customer:      data.businessName,
      unitTag:       [data.siteName, equipShort].filter(Boolean).join(' · '),
      model:         [data.manufacturer, data.modelNumber].filter(Boolean).join(' ') || '—',
      equipment:     [data.manufacturer, data.modelNumber, data.unitLabel].filter(Boolean).join(' ') || data.equipmentType,
      address:       [data.serviceAddress, data.cityState].filter(Boolean).join(', ') || '—',
      symptom:       data.complaint,
      driveTime:     '—',
      scheduledTime: data.timeWindow,
      techNote:      data.notes.trim() || null,
      dispatchNotes: [
        data.accessNotes   && `Access: ${data.accessNotes}`,
        data.specialNotes  && `Site notes: ${data.specialNotes}`,
        data.contactName   && `Contact: ${data.contactName}${data.phone ? ` · ${data.phone}` : ''}`,
        data.refrigerant   && `Refrigerant: ${data.refrigerant}`,
        data.voltage       && `Voltage: ${data.voltage}`,
      ].filter(Boolean) as string[],
      isPrototype: true,
    };

    const calEventType: CalendarEvent['type'] =
      resolvedPriority === 'emergency' ? 'emergency' :
      data.jobType.includes('PM')      ? 'pm' :
      data.jobType === 'Follow-up'     ? 'followup' : 'appointment';

    const calEvent: CalendarEvent = {
      day:   dayNum,
      type:  calEventType,
      label: `${job.customer} — ${effectiveJobType}`,
    };

    onCreate({ job, calEvent, isToday });
  }

  const StepIcon = STEPS[step].icon;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-gray-950"
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 pt-12 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <StepIcon size={16} className="text-blue-400" />
            <span className="font-bold text-white text-base">Schedule a Job</span>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-gray-800 flex items-center justify-center active:scale-90 transition-transform">
            <X size={15} className="text-gray-400" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-1 flex-1">
              <div className={`flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold flex-shrink-0 transition-colors ${
                i < step  ? 'bg-blue-500 text-white' :
                i === step ? 'bg-blue-600 text-white ring-2 ring-blue-400/50' :
                             'bg-gray-800 text-gray-500'
              }`}>
                {i < step ? <CheckCircle size={11} /> : i + 1}
              </div>
              <span className={`text-[9px] font-medium truncate transition-colors ${
                i === step ? 'text-blue-300' : i < step ? 'text-gray-400' : 'text-gray-600'
              }`}>{s.label}</span>
              {i < STEPS.length - 1 && <div className={`h-px flex-1 mx-1 transition-colors ${i < step ? 'bg-blue-500' : 'bg-gray-800'}`} />}
            </div>
          ))}
        </div>

        {/* Prototype label */}
        <div className="mt-2 flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <span className="text-[9px] text-amber-400/70 font-medium">Prototype — saved locally to this browser</span>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.18 }}
          >

            {/* ── Step 1: Customer ─────────────────────────────────────── */}
            {step === 0 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-base font-bold text-white">Customer Information</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Who called in the job?</p>
                </div>

                {/* Segmented control */}
                <div className="flex bg-gray-900 border border-gray-800 rounded-xl p-1 gap-1">
                  {(['existing', 'new'] as const).map(mode => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        if (mode === customerMode) return;
                        setCustomerMode(mode);
                        setSelectedCustomerId(null);
                        setSelectedSiteId(null);
                        setSelectedEquipId(null);
                        setEquipMode(null);
                        setSiteMode('saved');
                        setShowImportNote(false);
                        setData(prev => ({ ...EMPTY, date: prev.date }));
                        setErrors({});
                      }}
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                        customerMode === mode
                          ? 'bg-blue-600 text-white shadow'
                          : 'text-gray-400 hover:text-gray-300'
                      }`}
                    >
                      {mode === 'existing' ? 'Existing Customer' : 'New Customer'}
                    </button>
                  ))}
                </div>

                {/* ── Existing customer flow ──────────────────────────── */}
                {customerMode === 'existing' && (
                  <div className="space-y-3">
                    <Field label="Select customer">
                      <select
                        className={selectCls}
                        value={selectedCustomerId ?? ''}
                        onChange={e => {
                          const id = e.target.value;
                          if (!id) {
                            setSelectedCustomerId(null);
                            setSelectedSiteId(null);
                            setData(prev => ({ ...prev, businessName: '', contactName: '', phone: '', email: '' }));
                            return;
                          }
                          const cust = SAVED_CUSTOMERS.find(c => c.id === id);
                          if (cust) selectCustomer(cust);
                        }}
                      >
                        <option value="">Search or select customer…</option>
                        {SAVED_CUSTOMERS.map(c => (
                          <option key={c.id} value={c.id}>{c.businessName}</option>
                        ))}
                      </select>
                    </Field>

                    {selectedCustomerId && (() => {
                      const cust = SAVED_CUSTOMERS.find(c => c.id === selectedCustomerId);
                      return cust ? (
                        <motion.div
                          initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                          className="bg-gray-900 border border-blue-800/50 rounded-xl px-4 py-3 space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-white">{cust.businessName}</span>
                            <span className="text-[9px] bg-blue-950/60 text-blue-400 border border-blue-800/50 px-1.5 py-0.5 rounded-full font-medium">existing</span>
                          </div>
                          {cust.contactName && <div className="text-xs text-gray-400"><span className="text-gray-600 mr-1">Contact:</span>{cust.contactName}</div>}
                          {cust.phone       && <div className="text-xs text-gray-400"><span className="text-gray-600 mr-1">Phone:</span>{cust.phone}</div>}
                          {cust.email       && <div className="text-xs text-gray-400"><span className="text-gray-600 mr-1">Email:</span>{cust.email}</div>}
                        </motion.div>
                      ) : null;
                    })()}

                    {!selectedCustomerId && (
                      <p className="text-[10px] text-gray-600 text-center">Select a customer to continue, or switch to <strong className="text-gray-500">New Customer</strong> above.</p>
                    )}
                  </div>
                )}

                {/* ── New customer flow ───────────────────────────────── */}
                {customerMode === 'new' && (
                  <div className="space-y-3">
                    <Field label="Business name" required>
                      <input
                        className={`${inputCls} ${errors.businessName ? 'border-red-500' : ''}`}
                        placeholder="e.g. Acme Building Services"
                        value={data.businessName}
                        onChange={e => set('businessName', e.target.value)}
                        autoFocus
                      />
                      {errors.businessName && <p className="text-[10px] text-red-400 mt-1">{errors.businessName}</p>}
                    </Field>
                    <Field label="Contact name">
                      <input className={inputCls} placeholder="e.g. Sarah Johnson" value={data.contactName} onChange={e => set('contactName', e.target.value)} />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Phone">
                        <input className={inputCls} type="tel" placeholder="(214) 555-0100" value={data.phone} onChange={e => set('phone', e.target.value)} />
                      </Field>
                      <Field label="Email">
                        <input className={inputCls} type="email" placeholder="sarah@example.com" value={data.email} onChange={e => set('email', e.target.value)} />
                      </Field>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Step 2: Site ─────────────────────────────────────────── */}
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-base font-bold text-white">Site Information</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Where is this job?</p>
                </div>

                {/* ── Existing customer with saved sites — saved mode ─────── */}
                {customerMode === 'existing' && savedSites.length > 0 && siteMode === 'saved' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex-1">
                        Saved Sites — {data.businessName}
                      </span>
                      <span className="text-[9px] bg-amber-900/40 text-amber-400 border border-amber-800/50 px-1.5 py-0.5 rounded-full font-medium">prototype</span>
                    </div>
                    {savedSites.map(site => {
                      const isSelected = selectedSiteId === site.id;
                      return (
                        <button
                          key={site.id}
                          type="button"
                          onClick={() => selectSite(site)}
                          className={`w-full text-left rounded-xl border px-4 py-3 transition-all active:scale-[0.98] ${
                            isSelected
                              ? 'border-blue-500 bg-blue-950/40 ring-1 ring-blue-500/40'
                              : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-bold text-white">{site.siteName}</div>
                              <div className="text-xs text-gray-400 mt-0.5">{site.serviceAddress}</div>
                              <div className="text-[10px] text-gray-500">{site.cityState}</div>
                              {site.accessNotes && (
                                <div className="text-[10px] text-gray-500 mt-1">Access: {site.accessNotes}</div>
                              )}
                            </div>
                            <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center border-2 mt-0.5 transition-colors ${
                              isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-600'
                            }`}>
                              {isSelected && <CheckCircle size={11} className="text-white" />}
                            </div>
                          </div>
                        </button>
                      );
                    })}

                    {/* Add New Site button */}
                    <button
                      type="button"
                      onClick={() => {
                        setSiteMode('new');
                        setSelectedSiteId(null);
                        setData(prev => ({ ...prev, siteName: '', serviceAddress: '', cityState: '', accessNotes: '', specialNotes: '' }));
                      }}
                      className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-gray-700 rounded-xl text-sm text-gray-500 hover:border-blue-700 hover:text-blue-400 active:scale-[0.98] transition-all"
                    >
                      <Plus size={13} />
                      Add New Site
                    </button>
                  </div>
                )}

                {/* ── Manual site fields (new site, no saved sites, or new customer) */}
                {(!(customerMode === 'existing' && savedSites.length > 0) || siteMode === 'new') && (
                  <div className="space-y-3">
                    {siteMode === 'new' && customerMode === 'existing' && savedSites.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSiteMode('saved')}
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                      >
                        <ChevronLeft size={13} /> Back to saved sites
                      </button>
                    )}
                    <Field label="Site name / location">
                      <input className={inputCls} placeholder="e.g. North Campus Building A" value={data.siteName} onChange={e => set('siteName', e.target.value)} autoFocus={siteMode === 'new'} />
                    </Field>
                    <Field label="Service address">
                      <input className={inputCls} placeholder="4521 Medical Drive" value={data.serviceAddress} onChange={e => set('serviceAddress', e.target.value)} />
                    </Field>
                    <Field label="City, State">
                      <input className={inputCls} placeholder="Dallas, TX 75201" value={data.cityState} onChange={e => set('cityState', e.target.value)} />
                    </Field>
                    <Field label="Gate / access / badge notes">
                      <input className={inputCls} placeholder="e.g. Badge required at main entrance" value={data.accessNotes} onChange={e => set('accessNotes', e.target.value)} />
                    </Field>
                    <Field label="Roof / parking / special notes">
                      <textarea className={textareaCls} rows={3} placeholder="e.g. Roof hatch unlocked. Park in Lot C." value={data.specialNotes} onChange={e => set('specialNotes', e.target.value)} />
                    </Field>
                  </div>
                )}
              </div>
            )}

            {/* ── Step 3: Equipment ────────────────────────────────────── */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-base font-bold text-white">Equipment</h2>
                  <p className="text-xs text-gray-500 mt-0.5">What unit needs service?</p>
                </div>

                {/* ── Saved equipment at this site ───────────────────────── */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      {data.businessName.trim()
                        ? savedEquipment.length > 0
                          ? `Saved Equipment — ${data.businessName}`
                          : 'No saved equipment for this site'
                        : 'Saved Equipment'}
                    </span>
                    {savedEquipment.length > 0 && (
                      <span className="text-[9px] bg-amber-900/40 text-amber-400 border border-amber-800/50 px-1.5 py-0.5 rounded-full font-medium">prototype</span>
                    )}
                  </div>

                  {!data.businessName.trim() ? (
                    <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-center">
                      <p className="text-xs text-gray-500">Enter a customer name in step 1 to see saved equipment.</p>
                    </div>
                  ) : savedEquipment.length === 0 ? (
                    <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-center">
                      <p className="text-xs text-gray-500">No saved equipment for this site yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {savedEquipment.map(eq => {
                        const isSelected = selectedEquipId === eq.id;
                        return (
                          <button
                            key={eq.id}
                            type="button"
                            onClick={() => selectEquipment(eq)}
                            className={`w-full text-left rounded-xl border px-4 py-3 transition-all active:scale-[0.98] ${
                              isSelected
                                ? 'border-blue-500 bg-blue-950/40 ring-1 ring-blue-500/40'
                                : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-bold text-white">{eq.unitLabel}</span>
                                  <span className="text-[10px] text-blue-300/70">{eq.equipmentType.split(' ')[0]}</span>
                                  {eq.openIssue && (
                                    <span className="text-[9px] bg-amber-900/40 text-amber-400 px-1.5 py-0.5 rounded-full border border-amber-800/40 flex items-center gap-1">
                                      <AlertTriangle size={9} /> Open issue
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-300 mt-0.5">{eq.manufacturer} {eq.modelNumber}</div>
                                <div className="text-[10px] text-gray-500 mt-0.5">{eq.locationOnSite}</div>
                                {eq.serialNumber && (
                                  <div className="text-[9px] font-mono text-gray-600 mt-0.5">S/N: {eq.serialNumber}</div>
                                )}
                                {eq.openIssue && (
                                  <div className="text-[10px] text-amber-400/80 mt-1 leading-relaxed">{eq.openIssue}</div>
                                )}
                                <div className="text-[9px] text-gray-600 mt-1">Last service: {eq.lastService}</div>
                              </div>
                              <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center border-2 mt-0.5 transition-colors ${
                                isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-600'
                              }`}>
                                {isSelected && <CheckCircle size={11} className="text-white" />}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* ── Add new equipment ──────────────────────────────────── */}
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Add New Equipment</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => { setShowScanNote(s => !s); setEquipMode(null); setShowImportNote(false); }}
                      className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-all active:scale-95 ${
                        showScanNote
                          ? 'border-amber-600/60 bg-amber-950/30 text-amber-300'
                          : 'border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-600'
                      }`}
                    >
                      <Camera size={14} />
                      Scan Nameplate
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const next = equipMode === 'manual' ? null : 'manual';
                        setEquipMode(next);
                        setShowScanNote(false);
                        setShowImportNote(false);
                        if (next === 'manual') setSelectedEquipId(null);
                      }}
                      className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-all active:scale-95 ${
                        equipMode === 'manual'
                          ? 'border-blue-600/60 bg-blue-950/30 text-blue-300'
                          : 'border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-600'
                      }`}
                    >
                      <Plus size={14} />
                      Enter Manually
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setShowImportNote(s => !s); setShowScanNote(false); setEquipMode(null); }}
                    className={`w-full mt-2 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-all active:scale-95 ${
                      showImportNote
                        ? 'border-purple-600/60 bg-purple-950/30 text-purple-300'
                        : 'border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-600'
                    }`}
                  >
                    <Download size={14} />
                    Import Equipment
                  </button>

                  {/* Import note */}
                  {showImportNote && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                      className="mt-2 bg-purple-950/30 border border-purple-800/50 rounded-xl px-3 py-3"
                    >
                      <div className="flex items-start gap-2">
                        <Download size={13} className="text-purple-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-purple-300 mb-0.5">Equipment import not connected in prototype mode</p>
                          <p className="text-[10px] text-purple-400/80 leading-relaxed">
                            In production, import from a CSV, your CMMS, or a previous UnitDown export.
                            In the prototype, use <strong className="text-purple-300">Enter Manually</strong> or select from saved equipment above.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Scan note — always shown, never fakes success */}
                  {showScanNote && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                      className="mt-2 bg-amber-950/30 border border-amber-800/50 rounded-xl px-3 py-3"
                    >
                      <div className="flex items-start gap-2">
                        <AlertTriangle size={13} className="text-amber-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-amber-300 mb-0.5">Nameplate OCR not connected in prototype mode</p>
                          <p className="text-[10px] text-amber-400/80 leading-relaxed">
                            Camera-based nameplate scanning (OpenAI Vision) is available in the production app.
                            In the prototype, use <strong className="text-amber-300">Enter Manually</strong> or select from saved equipment above.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Manual entry fields */}
                  {equipMode === 'manual' && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                      className="mt-3 space-y-3 bg-gray-900 border border-gray-800 rounded-xl p-4"
                    >
                      <Field label="Equipment type">
                        <select className={selectCls} value={data.equipmentType} onChange={e => set('equipmentType', e.target.value)}>
                          {EQUIPMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </Field>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Unit label">
                          <input className={inputCls} placeholder="RTU-3, AHU-1" value={data.unitLabel} onChange={e => set('unitLabel', e.target.value)} />
                        </Field>
                        <Field label="Location on site">
                          <input className={inputCls} placeholder="Rooftop, N. Wing" value={data.locationOnSite} onChange={e => set('locationOnSite', e.target.value)} />
                        </Field>
                      </div>
                      <Field label="Manufacturer">
                        <input className={inputCls} placeholder="Carrier, Trane, Lennox…" value={data.manufacturer} onChange={e => set('manufacturer', e.target.value)} />
                      </Field>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Model number">
                          <input className={inputCls} placeholder="50XCQ006" value={data.modelNumber} onChange={e => set('modelNumber', e.target.value)} />
                        </Field>
                        <Field label="Serial number">
                          <input className={inputCls} placeholder="4321A8876" value={data.serialNumber} onChange={e => set('serialNumber', e.target.value)} />
                        </Field>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Refrigerant">
                          <input className={inputCls} placeholder="R-410A" value={data.refrigerant} onChange={e => set('refrigerant', e.target.value)} />
                        </Field>
                        <Field label="Voltage / phase">
                          <input className={inputCls} placeholder="208/230V 3-Ph" value={data.voltage} onChange={e => set('voltage', e.target.value)} />
                        </Field>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            )}

            {/* ── Step 4: Schedule ─────────────────────────────────────── */}
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-base font-bold text-white">Schedule & Dispatch</h2>
                  <p className="text-xs text-gray-500 mt-0.5">When and what?</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Job type">
                    <select
                      className={selectCls}
                      value={data.jobType}
                      onChange={e => {
                        const v = e.target.value;
                        set('jobType', v);
                        if (v !== 'Other') set('customJobTitle', '');
                      }}
                    >
                      {JOB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </Field>
                  <Field label="Priority">
                    <select className={selectCls} value={data.priority} onChange={e => set('priority', e.target.value as WizardData['priority'])}>
                      {PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </Field>
                </div>
                {data.jobType === 'Other' && (
                  <Field label="Custom job title" required>
                    <input
                      className={`${inputCls} ${errors.customJobTitle ? 'border-red-500' : ''}`}
                      placeholder="e.g. Start-up, warranty inspection, quote visit, controls check"
                      value={data.customJobTitle}
                      onChange={e => set('customJobTitle', e.target.value)}
                      autoFocus
                    />
                    {errors.customJobTitle && (
                      <p className="text-[10px] text-red-400 mt-1">{errors.customJobTitle}</p>
                    )}
                  </Field>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Date" required>
                    <input
                      className={`${inputCls} ${errors.date ? 'border-red-500' : ''}`}
                      type="date"
                      value={data.date}
                      onChange={e => set('date', e.target.value)}
                    />
                  </Field>
                  <Field label="Time window">
                    <select className={selectCls} value={data.timeWindow} onChange={e => set('timeWindow', e.target.value)}>
                      {TIME_WINDOWS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="Assigned technician">
                  <select className={selectCls} value={data.assignedTech} onChange={e => set('assignedTech', e.target.value)}>
                    {TECHS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Complaint / task" required>
                  <textarea
                    className={`${textareaCls} ${errors.complaint ? 'border-red-500' : ''}`}
                    rows={3}
                    placeholder="What does the customer report? What needs to be done?"
                    value={data.complaint}
                    onChange={e => set('complaint', e.target.value)}
                  />
                  {errors.complaint && <p className="text-[10px] text-red-400 mt-1">{errors.complaint}</p>}
                </Field>
                <Field label="Dispatch notes">
                  <textarea
                    className={textareaCls}
                    rows={2}
                    placeholder="Any notes for the tech? Parts to bring?"
                    value={data.notes}
                    onChange={e => set('notes', e.target.value)}
                  />
                </Field>
              </div>
            )}

            {/* ── Step 5: Review ───────────────────────────────────────── */}
            {step === 4 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-base font-bold text-white">Review & Create</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Confirm job details before scheduling</p>
                </div>

                <ReviewSection title="Customer">
                  <div className={`text-[9px] px-2 py-1 rounded-lg mb-2 inline-block border font-medium ${
                    customerMode === 'existing'
                      ? 'bg-blue-950/40 text-blue-400 border-blue-800/40'
                      : 'bg-gray-800 text-gray-400 border-gray-700'
                  }`}>
                    {customerMode === 'existing' ? 'Existing customer' : 'New customer'}
                  </div>
                  <ReviewRow label="Business"    value={data.businessName} />
                  <ReviewRow label="Contact"     value={data.contactName || '—'} />
                  <ReviewRow label="Phone"       value={data.phone || '—'} />
                  <ReviewRow label="Email"       value={data.email || '—'} />
                </ReviewSection>

                <ReviewSection title="Site">
                  <ReviewRow label="Site"        value={data.siteName || '—'} />
                  <ReviewRow label="Address"     value={[data.serviceAddress, data.cityState].filter(Boolean).join(', ') || '—'} />
                  {data.accessNotes   && <ReviewRow label="Access"    value={data.accessNotes} />}
                  {data.specialNotes  && <ReviewRow label="Notes"     value={data.specialNotes} />}
                </ReviewSection>

                <ReviewSection title="Equipment">
                  {selectedEquipId && (
                    <div className="text-[9px] bg-blue-950/40 text-blue-400 border border-blue-800/40 px-2 py-1 rounded-lg mb-2">
                      Linked from saved equipment record
                    </div>
                  )}
                  <ReviewRow label="Type"        value={data.equipmentType} />
                  {data.unitLabel      && <ReviewRow label="Unit label"  value={data.unitLabel} />}
                  {data.locationOnSite && <ReviewRow label="Location"    value={data.locationOnSite} />}
                  {data.manufacturer   && <ReviewRow label="Make"        value={data.manufacturer} />}
                  {data.modelNumber    && <ReviewRow label="Model"       value={data.modelNumber} />}
                  {data.serialNumber   && <ReviewRow label="Serial"      value={data.serialNumber} />}
                  {data.refrigerant    && <ReviewRow label="Refrigerant" value={data.refrigerant} />}
                  {data.voltage        && <ReviewRow label="Voltage"     value={data.voltage} />}
                </ReviewSection>

                <ReviewSection title="Schedule">
                  <ReviewRow label="Type"        value={effectiveJobType} />
                  <ReviewRow label="Date"        value={data.date ? new Date(data.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : '—'} />
                  <ReviewRow label="Time"        value={data.timeWindow} />
                  <ReviewRow label="Priority"    value={data.priority.charAt(0).toUpperCase() + data.priority.slice(1)} />
                  <ReviewRow label="Tech"        value={data.assignedTech} />
                  <ReviewRow label="Complaint"   value={data.complaint} />
                  {data.notes          && <ReviewRow label="Notes"   value={data.notes} />}
                </ReviewSection>

                {/* Today indicator */}
                {data.date && (() => {
                  const selected = new Date(data.date + 'T00:00:00');
                  const isToday = selected.toDateString() === new Date().toDateString();
                  return isToday ? (
                    <div className="flex items-center gap-2 bg-blue-950/40 border border-blue-800/60 rounded-xl px-3 py-2.5">
                      <CheckCircle size={14} className="text-blue-400 flex-shrink-0" />
                      <p className="text-xs text-blue-300">This job is scheduled for <strong>today</strong> — it will appear in Today's Jobs and the calendar.</p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 bg-gray-800/60 border border-gray-700 rounded-xl px-3 py-2.5">
                      <AlertTriangle size={14} className="text-gray-400 flex-shrink-0" />
                      <p className="text-xs text-gray-400">This job is not scheduled for today — it will appear on the calendar only.</p>
                    </div>
                  );
                })()}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 bg-gray-900 border-t border-gray-800 px-4 py-4 flex gap-3">
        {step > 0 ? (
          <button
            onClick={() => setStep(s => s - 1)}
            className="flex items-center gap-1.5 px-4 py-3 rounded-xl border border-gray-700 text-sm text-gray-300 active:scale-95 transition-transform"
          >
            <ChevronLeft size={15} />
            Back
          </button>
        ) : (
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-4 py-3 rounded-xl border border-gray-700 text-sm text-gray-400 active:scale-95 transition-transform"
          >
            Cancel
          </button>
        )}

        {step < STEPS.length - 1 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={!canAdvance()}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-bold transition-all active:scale-95 ${
              canAdvance()
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-600 cursor-not-allowed'
            }`}
          >
            Next
            <ChevronRight size={15} />
          </button>
        ) : (
          <button
            onClick={handleCreate}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 text-white text-sm font-bold active:scale-95 transition-transform"
          >
            <CheckCircle size={16} />
            Create Job
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Review helpers ───────────────────────────────────────────────────────────

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      <div className="px-4 py-2 border-b border-gray-800">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{title}</span>
      </div>
      <div className="px-4 py-3 space-y-2">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-[10px] text-gray-500 w-16 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-xs text-gray-200 flex-1 leading-relaxed">{value}</span>
    </div>
  );
}
