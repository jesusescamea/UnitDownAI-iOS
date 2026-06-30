import { useState, useCallback } from 'react';

export interface NameplateFields {
  manufacturer?:      string | null;
  modelNumber?:       string | null;
  serialNumber?:      string | null;
  equipmentType?:     string | null;
  systemType?:        string | null;
  voltage?:           string | null;
  phase?:             string | null;
  hertz?:             string | null;
  mca?:               string | null;
  mocp?:              string | null;
  rla?:               string | null;
  lra?:               string | null;
  refrigerantType?:   string | null;
  refrigerantCharge?: string | null;
  coolingCapacity?:   string | null;
  heatingCapacity?:   string | null;
  capacityTons?:      string | null;
  gasType?:           string | null;
  manufactureDate?:   string | null;
  confidence?:           number;
  reviewFields?:         string[];
  missing_fields?:       string[];
  rawText?:              string;
  filterSize?:           string | null;
  filterQty?:            string | null;
  beltSize?:             string | null;
  beltQty?:              string | null;
  beltNotes?:            string | null;
  maintenanceVerifiedAt?: string | null;
}

export interface UnassignedScan {
  id:          string;
  scannedAt:   string;   // ISO timestamp
  fields:      NameplateFields;
  note:        string;
  pendingSync: boolean;  // true = not yet linked/saved to backend
}

// ─── Local-only storage ───────────────────────────────────────────────────────
// Unassigned scans are stored entirely in localStorage.
// Images (blobs) are NOT persisted — only structured OCR data.
// pendingSync = true until the scan is linked to an equipment record.
// Sync to backend is a future feature (backend endpoint not yet implemented).

const LS_KEY = 'unitdown_unassigned_scans_v1';

function load(): UnassignedScan[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as UnassignedScan[]) : [];
  } catch { return []; }
}

function persist(scans: UnassignedScan[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(scans)); } catch { /* storage full */ }
}

export function useUnassignedScans() {
  const [scans, setScans] = useState<UnassignedScan[]>(() => load());

  const addScan = useCallback((fields: NameplateFields, note = ''): UnassignedScan => {
    const scan: UnassignedScan = {
      id:          `US-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      scannedAt:   new Date().toISOString(),
      fields,
      note,
      pendingSync: true,
    };
    setScans(prev => {
      const next = [scan, ...prev];
      persist(next);
      return next;
    });
    return scan;
  }, []);

  const updateNote = useCallback((id: string, note: string) => {
    setScans(prev => {
      const next = prev.map(s => s.id === id ? { ...s, note } : s);
      persist(next);
      return next;
    });
  }, []);

  const markLinked = useCallback((id: string) => {
    setScans(prev => {
      const next = prev.map(s => s.id === id ? { ...s, pendingSync: false } : s);
      persist(next);
      return next;
    });
  }, []);

  const removeScan = useCallback((id: string) => {
    setScans(prev => {
      const next = prev.filter(s => s.id !== id);
      persist(next);
      return next;
    });
  }, []);

  const pendingCount = scans.filter(s => s.pendingSync).length;

  return { scans, pendingCount, addScan, updateNote, markLinked, removeScan };
}
