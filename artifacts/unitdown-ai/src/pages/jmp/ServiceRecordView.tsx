import { motion } from 'framer-motion';
import { CheckCircle, Download, Share2, Building2, Calendar, User, Clock, Thermometer, Wrench, Star, ChevronRight } from 'lucide-react';
import { MOCK_JOB, MOCK_EQUIPMENT, INITIAL_MEASUREMENTS } from './mockData';
import type { PrototypeState } from './types';

interface Props {
  state: PrototypeState;
  onDone: () => void;
}

const statusColor = (s: string) => s === 'ok' ? 'text-green-600' : s === 'warn' ? 'text-amber-600' : 'text-red-600';
const statusBg = (s: string) => s === 'ok' ? 'bg-green-50' : s === 'warn' ? 'bg-amber-50' : 'bg-red-50';

export function ServiceRecordView({ state, onDone }: Props) {
  const initial = state.initialMeasurements ?? INITIAL_MEASUREMENTS;
  const verification = state.verificationMeasurements;
  const now = new Date();
  const totalMins = Math.floor(state.elapsedSeconds / 60);
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  const jobDuration = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* USR Header */}
      <div className="bg-gray-900 text-white px-4 pt-12 pb-6">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle size={16} className="text-green-400" />
          <span className="text-xs font-bold uppercase tracking-widest text-green-400">Office Ready</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight mb-1">UnitDown Service Record</h1>
        <div className="font-mono text-orange-400 text-lg font-bold">{MOCK_JOB.usrId}</div>
        <div className="mt-3 text-xs text-gray-400">Generated {MOCK_JOB.date} · Permanent record</div>
      </div>

      <div className="px-4 py-5 space-y-5">
        {/* Job Summary */}
        <Section title="Job Summary" icon="📋">
          <Row label="Work Order" value={MOCK_JOB.id} mono />
          <Row label="USR ID" value={MOCK_JOB.usrId} mono />
          <Row label="Customer" value={MOCK_JOB.customer} />
          <Row label="Address" value={MOCK_JOB.address} />
          <Row label="Date" value={MOCK_JOB.date} />
          <Row label="Technician" value={MOCK_JOB.technician} />
          <Row label="Arrival" value={`08:14 · ${jobDuration} on site`} />
          <Row label="Outdoor Temp" value="91°F · Partly Cloudy" />
          <Row label="Priority" value="High" valueColor="text-orange-600" />
        </Section>

        {/* Equipment */}
        <Section title="Equipment" icon="🔧">
          <Row label="Description" value="Carrier Packaged Rooftop Unit" />
          <Row label="Model" value={MOCK_EQUIPMENT.model} mono />
          <Row label="Serial" value={MOCK_EQUIPMENT.serial} mono />
          <Row label="Capacity" value={MOCK_EQUIPMENT.capacity} />
          <Row label="Refrigerant" value={MOCK_EQUIPMENT.refrigerant} />
          <Row label="Voltage" value={MOCK_EQUIPMENT.voltage} />
          <Row label="Location" value={MOCK_EQUIPMENT.location} />
          <Row label="Est. Install" value={MOCK_EQUIPMENT.installDate} />
          <Row label="Equipment Age" value={MOCK_EQUIPMENT.age} />
        </Section>

        {/* Reported Symptom */}
        <Section title="Reported Symptom" icon="⚠️">
          <div className="text-sm text-gray-800 leading-relaxed p-1">
            {MOCK_JOB.symptom}
          </div>
        </Section>

        {/* Active Alarms */}
        <Section title="Active Alarms" icon="⚡">
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <div className="font-semibold text-red-700 text-sm">Code 82 — High Refrigerant Pressure</div>
            <div className="text-xs text-red-600 mt-0.5">Compressor cutout active on arrival</div>
          </div>
        </Section>

        {/* Initial Measurements */}
        <Section title="Initial Measurements" icon="📈">
          <div className="text-xs text-gray-500 mb-3 font-medium">Recorded at 08:19 · Before repair</div>
          <div className="space-y-2">
            {initial.map((m, i) => (
              <div key={i} className={`flex items-center justify-between rounded-xl px-3 py-2.5 ${statusBg(m.status)}`}>
                <div>
                  <div className="text-xs text-gray-500">{m.label}</div>
                  <div className={`font-bold text-sm ${statusColor(m.status)}`}>{m.value} {m.unit}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-400">Target</div>
                  <div className="text-xs font-medium text-gray-600">{m.target ?? '—'}</div>
                </div>
                {m.status !== 'ok' && (
                  <div className={`ml-2 text-xs font-bold px-2 py-0.5 rounded-full ${m.status === 'alert' ? 'bg-red-200 text-red-700' : 'bg-amber-200 text-amber-700'}`}>
                    {m.status === 'alert' ? '↑ HIGH' : '↓ LOW'}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>

        {/* Diagnosis */}
        <Section title="Root Cause Diagnosis" icon="🔍">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-3">
            <div className="font-semibold text-blue-800 text-sm mb-1">Condenser coil fouling + refrigerant undercharge</div>
            <div className="text-xs text-blue-700 leading-relaxed">
              High head pressure (385 psi, target 260–290) combined with elevated superheat (24°F, target 8–12°F) and reduced delta T (11°F, target 15–20°F) indicates restricted condenser airflow. Condenser coil found heavily fouled with cottonwood debris and biological growth. System also undercharged by approximately 0.75 lbs R-410A — consistent with a slow leak or normal seasonal loss.
            </div>
          </div>
          <div className="text-xs text-gray-500">
            Finding consistent with Code 82 history — appeared on 2 of last 3 visits. Previous recommendation for coil cleaning was documented but not completed.
          </div>
        </Section>

        {/* Repair */}
        <Section title="Repair Performed" icon="🔧">
          {state.parts.length > 0 ? (
            <div className="space-y-2">
              {state.parts.map((p, i) => (
                <div key={i} className="border border-gray-200 rounded-xl p-3">
                  <div className="font-medium text-sm text-gray-800">{p.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{p.detail}</div>
                  {p.qty > 1 && <div className="text-xs text-gray-400 mt-0.5">Qty: {p.qty}</div>}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="border border-gray-200 rounded-xl p-3">
                <div className="font-medium text-sm text-gray-800">Condenser Coil Chemical Cleaning</div>
                <div className="text-xs text-gray-500 mt-0.5">Nu-Brite applied, rinsed thoroughly — heavy fouling removed</div>
              </div>
              <div className="border border-gray-200 rounded-xl p-3">
                <div className="font-medium text-sm text-gray-800">R-410A Refrigerant Added</div>
                <div className="text-xs text-gray-500 mt-0.5">0.75 lbs added — system was undercharged</div>
              </div>
              <div className="border border-gray-200 rounded-xl p-3">
                <div className="font-medium text-sm text-gray-800">Dual Run Capacitor 35/5 µF 440V</div>
                <div className="text-xs text-gray-500 mt-0.5">Replaced — old cap tested at 31 µF (spec: 35 µF)</div>
              </div>
            </div>
          )}
        </Section>

        {/* Verification measurements */}
        {verification && (
          <Section title="Verification Measurements" icon="✅">
            <div className="text-xs text-gray-500 mb-3 font-medium">Recorded after repair · System confirmed within spec</div>
            <div className="space-y-2">
              {initial.map((m, i) => {
                const after = verification[i];
                const improved = after && after.status === 'ok' && m.status !== 'ok';
                return (
                  <div key={i} className="flex items-center gap-3 rounded-xl bg-green-50 border border-green-100 px-3 py-2.5">
                    <div className="flex-1">
                      <div className="text-xs text-gray-500">{m.label}</div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-gray-400 line-through">{m.value}</span>
                        <span className="text-green-600 text-sm font-bold">{after ? after.value : m.value} {m.unit}</span>
                        {improved && <span className="text-xs text-green-600">✓</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* Recommendations */}
        {state.recommendations.length > 0 && (
          <Section title="Recommendations" icon="📋">
            <div className="space-y-2">
              {state.recommendations.map((r, i) => (
                <div key={i} className="flex gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                  <span className="text-amber-500 font-bold text-sm flex-shrink-0">→</span>
                  <p className="text-sm text-gray-700 leading-relaxed">{r}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Customer Summary */}
        <Section title="Customer Summary" icon="👤">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <p className="text-sm text-gray-700 leading-relaxed mb-3">
              Your Carrier rooftop unit (RTU-3) was not cooling properly due to a clogged condenser coil and slightly low refrigerant level. We cleaned the coil, added refrigerant, and replaced a weak capacitor. The unit is now cooling correctly — indoor supply air dropped from 61°F to 56°F and all readings are within normal range.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed">
              We recommend scheduling annual coil cleaning each spring to prevent this from recurring, and we'd like to check the refrigerant level again on your next visit to rule out a small leak.
            </p>
          </div>
        </Section>

        {/* AI Quality Score */}
        <Section title="Record Quality" icon="⭐">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-3xl font-bold text-green-600">97%</div>
              <div className="text-xs text-gray-500 mt-0.5">Office Ready Score</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500 mb-1">AI Confidence</div>
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} size={14} fill={s <= 5 ? '#f59e0b' : 'none'} className="text-amber-400" />
                ))}
              </div>
              <div className="text-xs text-green-600 font-medium mt-1">High confidence</div>
            </div>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full" style={{ width: '97%' }} />
          </div>
          <div className="text-xs text-gray-400 mt-2">
            Nameplate captured · Measurements before & after · Repair documented · Recommendations added
          </div>
        </Section>

        {/* Footer info */}
        <div className="text-center text-xs text-gray-400 py-4 border-t border-gray-200">
          <div className="font-mono font-bold text-gray-600 mb-1">{MOCK_JOB.usrId}</div>
          <div>Generated by UnitDown AI · {MOCK_JOB.date}</div>
          <div className="mt-1">Equipment history updated · Office notified</div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <button className="flex items-center justify-center gap-2 border-2 border-gray-200 rounded-xl py-3 text-sm font-semibold text-gray-700">
            <Share2 size={15} />
            Share with Customer
          </button>
          <button className="flex items-center justify-center gap-2 border-2 border-gray-200 rounded-xl py-3 text-sm font-semibold text-gray-700">
            <Download size={15} />
            Send to Office
          </button>
        </div>
        <button
          onClick={onDone}
          className="w-full bg-gray-900 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2"
        >
          <span>Ready for Next Call</span>
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
    >
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <span>{icon}</span>
        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">{title}</span>
      </div>
      <div className="px-4 py-3">{children}</div>
    </motion.div>
  );
}

function Row({ label, value, mono, valueColor }: { label: string; value: string; mono?: boolean; valueColor?: string }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-xs font-medium text-right max-w-[60%] ${mono ? 'font-mono' : ''} ${valueColor ?? 'text-gray-800'}`}>{value}</span>
    </div>
  );
}
