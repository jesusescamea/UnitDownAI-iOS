import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ChevronLeft, ChevronRight, User, MapPin, Cpu,
  Calendar, ClipboardList, CheckCircle, AlertTriangle,
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
  // Step 4 — Schedule
  jobType:           string;
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
  modelNumber: '', serialNumber: '', locationOnSite: '',
  jobType: 'Service Call', date: new Date().toISOString().split('T')[0],
  timeWindow: '8:00 – 10:00 AM', priority: 'normal',
  assignedTech: 'Marcus Rivera', complaint: '', notes: '',
};

const EQUIPMENT_TYPES = [
  'RTU (Packaged Rooftop Unit)', 'AHU (Air Handler)', 'CRAC (Computer Room A/C)',
  'Chiller', 'Boiler', 'Split System', 'VRF / Mini-Split', 'Heat Pump',
  'Fan Coil Unit', 'Other',
];

const JOB_TYPES = ['Service Call', 'Preventive Maintenance (PM)', 'Follow-up', 'Emergency'];

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
  const [step, setStep]     = useState(0);
  const [data, setData]     = useState<WizardData>(() => ({
    ...EMPTY,
    date: defaultDate ?? EMPTY.date,
  }));
  const [errors, setErrors] = useState<Partial<Record<keyof WizardData, string>>>({});

  function set<K extends keyof WizardData>(key: K, value: WizardData[K]) {
    setData(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => { const e = { ...prev }; delete e[key]; return e; });
  }

  function validate(): boolean {
    const e: typeof errors = {};
    if (!data.businessName.trim()) e.businessName = 'Business name is required';
    if (!data.complaint.trim())    e.complaint    = 'Complaint / task is required';
    if (!data.date)                e.date         = 'Date is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function canAdvance(): boolean {
    if (step === 0) return data.businessName.trim().length > 0;
    if (step === 3) return data.complaint.trim().length > 0 && !!data.date;
    return true;
  }

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
      type:          data.jobType,
      customer:      [data.businessName, data.siteName].filter(Boolean).join(' — '),
      unitTag:       equipShort + (data.locationOnSite ? ` · ${data.locationOnSite}` : ''),
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
      label: `${job.customer} — ${data.jobType}`,
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
                <Field label="Business name" required>
                  <input
                    className={`${inputCls} ${errors.businessName ? 'border-red-500' : ''}`}
                    placeholder="e.g. Summit Medical Plaza"
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

            {/* ── Step 2: Site ─────────────────────────────────────────── */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-base font-bold text-white">Site Information</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Where is this job?</p>
                </div>
                <Field label="Site name / location">
                  <input className={inputCls} placeholder="e.g. North Campus Building A" value={data.siteName} onChange={e => set('siteName', e.target.value)} />
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

            {/* ── Step 3: Equipment ────────────────────────────────────── */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-base font-bold text-white">Equipment</h2>
                  <p className="text-xs text-gray-500 mt-0.5">What unit needs service?</p>
                </div>
                <Field label="Equipment type">
                  <select className={selectCls} value={data.equipmentType} onChange={e => set('equipmentType', e.target.value)}>
                    {EQUIPMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Unit label">
                    <input className={inputCls} placeholder="e.g. RTU-3, AHU-1" value={data.unitLabel} onChange={e => set('unitLabel', e.target.value)} />
                  </Field>
                  <Field label="Location on site">
                    <input className={inputCls} placeholder="e.g. Rooftop, N. Wing" value={data.locationOnSite} onChange={e => set('locationOnSite', e.target.value)} />
                  </Field>
                </div>
                <Field label="Manufacturer">
                  <input className={inputCls} placeholder="e.g. Carrier, Trane, Lennox" value={data.manufacturer} onChange={e => set('manufacturer', e.target.value)} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Model number">
                    <input className={inputCls} placeholder="e.g. 50XCQ006" value={data.modelNumber} onChange={e => set('modelNumber', e.target.value)} />
                  </Field>
                  <Field label="Serial number">
                    <input className={inputCls} placeholder="e.g. 4321A8876" value={data.serialNumber} onChange={e => set('serialNumber', e.target.value)} />
                  </Field>
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
                    <select className={selectCls} value={data.jobType} onChange={e => set('jobType', e.target.value)}>
                      {JOB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </Field>
                  <Field label="Priority">
                    <select className={selectCls} value={data.priority} onChange={e => set('priority', e.target.value as WizardData['priority'])}>
                      {PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </Field>
                </div>
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
                  <ReviewRow label="Type"        value={data.equipmentType} />
                  {data.unitLabel      && <ReviewRow label="Unit label"  value={data.unitLabel} />}
                  {data.locationOnSite && <ReviewRow label="Location"    value={data.locationOnSite} />}
                  {data.manufacturer   && <ReviewRow label="Make"        value={data.manufacturer} />}
                  {data.modelNumber    && <ReviewRow label="Model"       value={data.modelNumber} />}
                  {data.serialNumber   && <ReviewRow label="Serial"      value={data.serialNumber} />}
                </ReviewSection>

                <ReviewSection title="Schedule">
                  <ReviewRow label="Type"        value={data.jobType} />
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
