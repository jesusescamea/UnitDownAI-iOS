import { useState, useCallback } from 'react';
import type { ImportedJob, ImportStatus } from './types';

const LS_KEY = 'unitdown_dispatch_inbox_v1';

function load(): ImportedJob[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as ImportedJob[]) : [];
  } catch {
    return [];
  }
}

function save(jobs: ImportedJob[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(jobs));
  } catch { /* storage full — silent */ }
}

export function useDispatchInbox() {
  const [jobs, setJobs] = useState<ImportedJob[]>(() => load());

  const addJobs = useCallback((incoming: ImportedJob[]) => {
    setJobs(prev => {
      const existing = new Set(prev.map(j => j.jobNumber).filter(Boolean));
      const merged = [...prev];
      for (const job of incoming) {
        const isDup = job.jobNumber && existing.has(job.jobNumber);
        merged.push(isDup ? { ...job, status: 'duplicate', duplicateOf: prev.find(p => p.jobNumber === job.jobNumber)?.id } : job);
      }
      save(merged);
      return merged;
    });
  }, []);

  const updateStatus = useCallback((id: string, status: ImportStatus) => {
    setJobs(prev => {
      const next = prev.map(j => j.id === id ? { ...j, status } : j);
      save(next);
      return next;
    });
  }, []);

  const removeJob = useCallback((id: string) => {
    setJobs(prev => {
      const next = prev.filter(j => j.id !== id);
      save(next);
      return next;
    });
  }, []);

  const updateJob = useCallback((updated: ImportedJob) => {
    setJobs(prev => {
      const exists = prev.some(j => j.id === updated.id);
      const next = exists ? prev.map(j => j.id === updated.id ? updated : j) : [...prev, updated];
      save(next);
      return next;
    });
  }, []);

  const acceptAll = useCallback(() => {
    setJobs(prev => {
      const next = prev.map(j => j.status === 'pending' ? { ...j, status: 'accepted' as ImportStatus } : j);
      save(next);
      return next;
    });
  }, []);

  const clearAccepted = useCallback(() => {
    setJobs(prev => {
      const next = prev.filter(j => j.status !== 'accepted');
      save(next);
      return next;
    });
  }, []);

  const pendingJobs  = jobs.filter(j => j.status === 'pending');
  const acceptedJobs = jobs.filter(j => j.status === 'accepted');
  const dupJobs      = jobs.filter(j => j.status === 'duplicate');

  return { jobs, pendingJobs, acceptedJobs, dupJobs, addJobs, updateJob, updateStatus, removeJob, acceptAll, clearAccepted };
}
