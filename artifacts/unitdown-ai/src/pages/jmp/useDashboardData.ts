/**
 * useDashboardData — real data layer for DashboardView
 *
 * Fetches jobs, units, and diagnostic-logs from the live API and maps them
 * to the TodayJob / CalendarEvent / DashboardStat / EquipmentAttention /
 * RecentActivity shapes that DashboardView renders.
 *
 * Where no real data exists the hook returns empty arrays so DashboardView
 * can show honest empty states rather than falling back to prototype mock data.
 */

import { useState, useEffect } from 'react';
import type { TodayJob } from './mockData';
import type {
  CalendarEvent,
  EquipmentAttention,
  DashboardStat,
  RecentActivity,
} from './dashboardData';

// ─── Raw API shapes ───────────────────────────────────────────────────────────

interface ApiJob {
  id: string;
  customer?: string | null;
  site?: string | null;
  unitLabel?: string | null;
  title?: string | null;
  status: string;
  startedAt: number;
  updatedAt: number;
  completedAt?: number | null;
}

interface ApiUnit {
  id: string;
  nickname?: string | null;
  siteCustomerName?: string | null;
  location?: string | null;
  manufacturer?: string | null;
  modelNumber?: string | null;
  equipmentType?: string | null;
  isArchived: boolean;
  updatedAt: string;
}

interface ApiDiagnosticLog {
  id: string;
  unitId?: string | null;
  symptoms: string;
  diagnosisTitle?: string | null;
  status: string;
  timestamp: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relTime(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 86_400_000);
  if (diff === 0) {
    const hrs = Math.floor((Date.now() - ts) / 3_600_000);
    if (hrs === 0) return 'Just now';
    return `${hrs}h ago`;
  }
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return `${diff}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ─── Mapping functions ────────────────────────────────────────────────────────

function mapJob(job: ApiJob): TodayJob {
  const t = new Date(job.startedAt);
  return {
    id: job.id,
    priority: 'normal',
    status:
      job.status === 'active'    ? 'in-progress' :
      job.status === 'completed' ? 'complete'     : 'open',
    type: 'Service Call',
    customer: job.customer ?? job.site ?? 'Service Call',
    unitTag:  job.unitLabel ?? '—',
    model:    '—',
    equipment: job.unitLabel ?? '—',
    address:   job.site ?? '—',
    symptom:   job.title ?? 'Service call',
    driveTime: '—',
    scheduledTime: t.toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: true,
    }),
    techNote:      null,
    dispatchNotes: undefined,
    isPrototype:   false,
  };
}

function jobToCalEvent(job: ApiJob): CalendarEvent {
  return {
    day:   new Date(job.startedAt).getDate(),
    type:  job.status === 'completed' ? 'completed' : 'appointment',
    label: job.customer ?? job.title ?? 'Job',
  };
}

const ACTIVE_STATUSES = new Set([
  'unresolved', 'monitoring', 'waiting-on-parts', 'return-visit', 'customer-callback',
]);

function buildEquipmentItems(
  units: ApiUnit[],
  logs: ApiDiagnosticLog[],
): EquipmentAttention[] {
  const result: EquipmentAttention[] = [];
  for (const unit of units.filter(u => !u.isArchived)) {
    const unitLogs = logs
      .filter(l => l.unitId === unit.id && ACTIVE_STATUSES.has(l.status))
      .sort((a, b) => b.timestamp - a.timestamp);
    if (unitLogs.length === 0) continue;

    const latest = unitLogs[0];
    const sev: 'high' | 'medium' | 'low' =
      latest.status === 'unresolved'         ? 'high'   :
      latest.status === 'waiting-on-parts'   ? 'medium' : 'low';

    result.push({
      id:       unit.id,
      unit:     unit.nickname ?? unit.modelNumber ?? 'Equipment',
      unitTag:  unit.location ?? '—',
      model:    [unit.manufacturer, unit.modelNumber].filter(Boolean).join(' ') || '—',
      customer: unit.siteCustomerName ?? '—',
      location: unit.location ?? '—',
      issue:    latest.diagnosisTitle ?? latest.symptoms.slice(0, 80),
      detail:   `${unitLogs.length} active issue${unitLogs.length !== 1 ? 's' : ''} on record.`,
      severity: sev,
      visits:   unitLogs.length,
      period:   'recent',
      lastService: relTime(latest.timestamp),
      aiInsight: {
        pattern:   latest.diagnosisTitle ?? 'Unresolved issue',
        stats:     [`${unitLogs.length} open log${unitLogs.length !== 1 ? 's' : ''}`],
        analysis:  'Review the diagnostic logs for this unit to identify the pattern.',
        rootCauses:    [latest.symptoms.slice(0, 120)],
        suggestedParts: [],
      },
      serviceHistory: unitLogs.slice(0, 3).map(l => ({
        date: new Date(l.timestamp).toLocaleDateString(undefined, {
          month: 'short', day: 'numeric', year: 'numeric',
        }),
        tech:    '—',
        type:    'Diagnosis',
        summary: l.diagnosisTitle ?? l.symptoms.slice(0, 80),
      })),
    });

    if (result.length >= 5) break;
  }
  return result;
}

function buildActivity(
  logs: ApiDiagnosticLog[],
  units: ApiUnit[],
): RecentActivity[] {
  const unitMap = new Map(units.map(u => [u.id, u]));
  return logs.slice(0, 8).map(l => {
    const unit = l.unitId ? unitMap.get(l.unitId) : undefined;
    return {
      id:        l.id,
      type:      'usr' as const,
      summary:   l.diagnosisTitle ?? l.symptoms.slice(0, 80),
      customer:  unit?.siteCustomerName ?? '',
      equipment: unit?.nickname ?? unit?.modelNumber ?? l.unitId ?? 'Equipment',
      timeLabel: relTime(l.timestamp),
      icon:      '🔍',
    };
  });
}

function buildStats(
  jobs: ApiJob[],
  units: ApiUnit[],
  logs: ApiDiagnosticLog[],
): DashboardStat[] {
  const activeJobs   = jobs.filter(j => j.status === 'active');
  const activeUnits  = units.filter(u => !u.isArchived);
  const openIssues   = logs.filter(l => ACTIVE_STATUSES.has(l.status)).length;

  return [
    {
      id:          'jobs',
      label:       "Today's Jobs",
      value:       jobs.length,
      subtitle:    jobs.length === 0 ? 'none today' : `${activeJobs.length} active`,
      icon:        '🔧',
      color:       jobs.length > 0 ? 'bg-amber-950/40' : 'bg-gray-900',
      borderColor: jobs.length > 0 ? 'border-amber-800/60' : 'border-gray-800',
      urgent:      jobs.length > 0,
    },
    {
      id:          'progress',
      label:       'In Progress',
      value:       activeJobs.length,
      subtitle:    activeJobs.length === 0 ? 'none active' : 'in field',
      icon:        '▶',
      color:       'bg-gray-900',
      borderColor: 'border-gray-800',
      urgent:      false,
    },
    {
      id:          'units',
      label:       'Saved Units',
      value:       activeUnits.length,
      subtitle:    'in records',
      icon:        '🏢',
      color:       'bg-blue-950/40',
      borderColor: 'border-blue-800/60',
      urgent:      false,
    },
    {
      id:          'issues',
      label:       'Open Issues',
      value:       openIssues,
      subtitle:    openIssues === 0 ? 'all clear' : 'need attention',
      icon:        '⚠️',
      color:       openIssues > 0 ? 'bg-orange-950/40' : 'bg-gray-900',
      borderColor: openIssues > 0 ? 'border-orange-800/60' : 'border-gray-800',
      urgent:      openIssues > 0,
    },
    {
      id:          'diagnoses',
      label:       'Diagnoses',
      value:       logs.length,
      subtitle:    'total logged',
      icon:        '📋',
      color:       'bg-gray-900',
      borderColor: 'border-gray-800',
      urgent:      false,
    },
  ];
}

// ─── Public hook ──────────────────────────────────────────────────────────────

export interface DashboardData {
  realJobs:      TodayJob[];
  realCalEvents: CalendarEvent[];
  realStats:     DashboardStat[];
  realEquipment: EquipmentAttention[];
  realActivity:  RecentActivity[];
  loading:       boolean;
}

export function useDashboardData(clientId: string): DashboardData {
  const [loading, setLoading] = useState(true);
  const [jobs,    setJobs]    = useState<ApiJob[]>([]);
  const [units,   setUnits]   = useState<ApiUnit[]>([]);
  const [logs,    setLogs]    = useState<ApiDiagnosticLog[]>([]);

  useEffect(() => {
    if (!clientId) { setLoading(false); return; }
    setLoading(true);
    const cid = encodeURIComponent(clientId);
    Promise.all([
      fetch(`/api/jobs?clientId=${cid}`)
        .then(r => r.ok ? r.json() as Promise<{ jobs: ApiJob[] }> : { jobs: [] as ApiJob[] }),
      fetch(`/api/units?clientId=${cid}`)
        .then(r => r.ok ? r.json() as Promise<{ units: ApiUnit[] }> : { units: [] as ApiUnit[] }),
      fetch(`/api/diagnostic-logs?clientId=${cid}`)
        .then(r => r.ok ? r.json() as Promise<{ logs: ApiDiagnosticLog[] }> : { logs: [] as ApiDiagnosticLog[] }),
    ])
      .then(([jobsRes, unitsRes, logsRes]) => {
        setJobs(jobsRes.jobs   ?? []);
        setUnits(unitsRes.units ?? []);
        setLogs(logsRes.logs   ?? []);
      })
      .catch(() => { /* stay on empty state on network error */ })
      .finally(() => setLoading(false));
  }, [clientId]);

  return {
    realJobs:      jobs.map(mapJob),
    realCalEvents: jobs.map(jobToCalEvent),
    realStats:     buildStats(jobs, units, logs),
    realEquipment: buildEquipmentItems(units, logs),
    realActivity:  buildActivity(logs, units),
    loading,
  };
}
