/**
 * CustomersPage
 * Full customer/site management module for UnitDown Field OS.
 *
 * Screens (internal navigation, single page component):
 *   list          — search + list of customers
 *   detail        — customer info + sites + linked units + recent jobs
 *   form-customer — add or edit a customer
 *   form-site     — add or edit a site for the current customer
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'wouter';
import { useUser } from '@clerk/clerk-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Plus, Search, X, ChevronRight, Building2, Phone,
  Mail, MapPin, Wrench, Briefcase, Edit2, Archive, AlertTriangle,
  Loader2, CheckCircle, User, Users, Lock, FileText, StickyNote,
  ChevronDown, ChevronUp, PlusCircle, Link, Unlink, Activity, Trash2,
} from 'lucide-react';
import { AppNav } from '@/components/AppNav';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UnitRecord {
  id: string;
  nickname?: string | null;
  siteCustomerName?: string | null;
  manufacturer?: string | null;
  modelNumber?: string | null;
  serialNumber?: string | null;
  equipmentType?: string | null;
  location?: string | null;
  customerId?: string | null;
  siteId?: string | null;
}

interface JobRecord {
  id: string;
  customer?: string | null;
  site?: string | null;
  title?: string | null;
  status?: string | null;
  startedAt?: number | null;
  unitLabel?: string | null;
}

interface DiagnosticLog {
  id: string;
  unitId: string | null;
  symptoms: string;
  diagnosisTitle: string | null;
  confidencePercent: number | null;
  status: string;
  timestamp: number;
}

interface CustomerSite {
  id: string;
  customerId: string;
  siteName: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  accessNotes?: string | null;
  roofAccessNotes?: string | null;
  gateCode?: string | null;
  parkingNotes?: string | null;
  mainContact?: string | null;
  siteNotes?: string | null;
  isArchived?: boolean;
  units?: UnitRecord[];
}

interface Customer {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  billingNotes?: string | null;
  notes?: string | null;
  isArchived?: boolean;
  createdAt?: string;
  siteCount?: number;
  unitCount?: number;
  sites?: CustomerSite[];
  units?: UnitRecord[];
  recentJobs?: JobRecord[];
  diagnosticLogs?: DiagnosticLog[];
}

type Screen = 'list' | 'detail' | 'form-customer' | 'form-site';

// ─── Shared styling ───────────────────────────────────────────────────────────

const INPUT = 'w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors';
const TEXTAREA = `${INPUT} resize-none`;
const LABEL = 'block text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-1';
const SEL = `${INPUT} appearance-none`;

function formatDate(ts?: string | number | null): string {
  if (!ts) return '—';
  const date = typeof ts === 'number' ? new Date(ts) : new Date(ts);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(e.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function apiPatch<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(e.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function apiDelete(url: string): Promise<void> {
  const res = await fetch(url, { method: 'DELETE' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

// ─── Customer List Screen ─────────────────────────────────────────────────────

function CustomerCard({
  customer, onClick,
}: {
  customer: Customer;
  onClick:  () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-2xl bg-gray-900 border border-gray-800 active:scale-[0.98] transition-transform"
    >
      <div className="w-10 h-10 rounded-xl bg-blue-900/40 border border-blue-800/60 flex items-center justify-center flex-shrink-0">
        <Users size={18} className="text-blue-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-white text-sm truncate">{customer.name}</div>
        {customer.contactName && (
          <div className="text-[10px] text-gray-400 truncate">{customer.contactName}</div>
        )}
        {customer.phone && (
          <div className="text-[10px] text-gray-500 truncate">{customer.phone}</div>
        )}
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        {(customer.siteCount ?? 0) > 0 && (
          <div className="text-[9px] text-gray-500">
            {customer.siteCount} site{(customer.siteCount ?? 0) !== 1 ? 's' : ''}
          </div>
        )}
        {(customer.unitCount ?? 0) > 0 && (
          <div className="text-[9px] text-gray-500">
            {customer.unitCount} unit{(customer.unitCount ?? 0) !== 1 ? 's' : ''}
          </div>
        )}
        <ChevronRight size={14} className="text-gray-600" />
      </div>
    </button>
  );
}

function ListScreen({
  clientId,
  onSelect,
  onAdd,
}: {
  clientId: string;
  onSelect: (c: Customer) => void;
  onAdd:    () => void;
}) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery]         = useState('');
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (q: string) => {
    if (!clientId) {
      setLoading(true);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<{ customers: Customer[] }>(
        `/api/customers?clientId=${encodeURIComponent(clientId)}&q=${encodeURIComponent(q)}`
      );
      setCustomers(data.customers ?? []);
    } catch {
      setError('Failed to load customers.');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void load('');
  }, [load]);

  function handleSearch(q: string) {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void load(q), 350);
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-950">
      <AppNav active="customers" />

      <div className="max-w-2xl mx-auto w-full px-4 pt-4 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-extrabold text-white">Customers</h1>
            <p className="text-[11px] text-gray-400 mt-0.5">Manage customers, sites, and equipment</p>
          </div>
          <button
            onClick={onAdd}
            className="flex items-center gap-1.5 bg-blue-600 text-white font-bold text-xs px-3 py-2 rounded-xl active:scale-95 transition-transform"
          >
            <Plus size={14} /> Add
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
            placeholder="Search customers, contacts, phone…"
            value={query}
            onChange={e => handleSearch(e.target.value)}
          />
          {query && (
            <button onClick={() => handleSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X size={14} className="text-gray-500" />
            </button>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center pt-16">
            <Loader2 size={28} className="text-blue-500 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 pt-12 text-center">
            <AlertTriangle size={28} className="text-yellow-500" />
            <div className="text-sm text-gray-400">{error}</div>
            <button onClick={() => void load(query)} className="text-xs text-blue-400 px-3 py-1.5 rounded-lg bg-blue-950/30">Retry</button>
          </div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center gap-3 pt-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center">
              <Users size={28} className="text-gray-500" />
            </div>
            <div className="text-white font-bold text-sm">
              {query ? 'No matches' : 'No customers yet'}
            </div>
            <div className="text-xs text-gray-500">
              {query ? 'Try a different search.' : 'Tap Add to create your first customer.'}
            </div>
            {!query && (
              <button
                onClick={onAdd}
                className="mt-2 flex items-center gap-2 bg-blue-600 text-white font-bold text-sm px-4 py-3 rounded-2xl active:scale-95 transition-transform"
              >
                <Plus size={16} /> Add First Customer
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {customers.map(c => (
              <CustomerCard key={c.id} customer={c} onClick={() => onSelect(c)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Customer Detail Screen ───────────────────────────────────────────────────

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <div className="text-gray-500 mt-0.5 flex-shrink-0">{icon}</div>
      <div>
        <div className="text-[9px] text-gray-500 uppercase tracking-wider">{label}</div>
        <div className="text-sm text-white break-words">{value}</div>
      </div>
    </div>
  );
}

function SiteCard({
  site, onEdit, onArchive, onAddUnit, onAddEquipment, onOpenUnit,
}: {
  site:      CustomerSite;
  onEdit:    () => void;
  onArchive: () => void;
  onAddUnit: () => void;
  onAddEquipment: () => void;
  onOpenUnit: (unitId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const addr = [site.address, site.city, site.state, site.zip].filter(Boolean).join(', ');

  return (
    <div className="rounded-2xl bg-gray-900 border border-gray-800">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <div className="w-9 h-9 rounded-xl bg-orange-900/30 border border-orange-800/60 flex items-center justify-center flex-shrink-0">
          <Building2 size={16} className="text-orange-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-white text-sm truncate">{site.siteName}</div>
          {addr && <div className="text-[10px] text-gray-400 truncate">{addr}</div>}
          {(site.units?.length ?? 0) > 0 && (
            <div className="text-[9px] text-blue-400 mt-0.5">{site.units!.length} unit{site.units!.length !== 1 ? 's' : ''}</div>
          )}
        </div>
        <div className="flex-shrink-0 text-gray-600">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-gray-800 space-y-3">
              {/* Access info */}
              {(site.accessNotes || site.gateCode || site.roofAccessNotes || site.parkingNotes || site.mainContact || site.siteNotes) && (
                <div className="space-y-2">
                  {site.mainContact && (
                    <div className="flex items-start gap-2">
                      <User size={12} className="text-gray-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-[9px] text-gray-500">Main Contact</div>
                        <div className="text-xs text-white">{site.mainContact}</div>
                      </div>
                    </div>
                  )}
                  {site.gateCode && (
                    <div className="flex items-start gap-2">
                      <Lock size={12} className="text-gray-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-[9px] text-gray-500">Gate / Lockbox</div>
                        <div className="text-xs text-white font-mono">{site.gateCode}</div>
                      </div>
                    </div>
                  )}
                  {site.accessNotes && (
                    <div className="rounded-xl bg-gray-800/60 border border-gray-700 px-3 py-2">
                      <div className="text-[9px] text-gray-500 mb-1">Access Notes</div>
                      <div className="text-xs text-gray-300 whitespace-pre-wrap">{site.accessNotes}</div>
                    </div>
                  )}
                  {site.roofAccessNotes && (
                    <div className="rounded-xl bg-gray-800/60 border border-gray-700 px-3 py-2">
                      <div className="text-[9px] text-gray-500 mb-1">Roof Access</div>
                      <div className="text-xs text-gray-300 whitespace-pre-wrap">{site.roofAccessNotes}</div>
                    </div>
                  )}
                  {site.parkingNotes && (
                    <div className="rounded-xl bg-gray-800/60 border border-gray-700 px-3 py-2">
                      <div className="text-[9px] text-gray-500 mb-1">Parking</div>
                      <div className="text-xs text-gray-300 whitespace-pre-wrap">{site.parkingNotes}</div>
                    </div>
                  )}
                  {site.siteNotes && (
                    <div className="rounded-xl bg-gray-800/60 border border-gray-700 px-3 py-2">
                      <div className="text-[9px] text-gray-500 mb-1">Site Notes</div>
                      <div className="text-xs text-gray-300 whitespace-pre-wrap">{site.siteNotes}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Units at this site */}
              {(site.units?.length ?? 0) > 0 && (
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">Equipment</div>
                  <div className="space-y-1.5">
                    {site.units!.map(unit => (
                      <button
                        key={unit.id}
                        onClick={() => onOpenUnit(unit.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-left active:scale-[0.98] transition-transform"
                      >
                        <Wrench size={12} className="text-gray-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-white font-bold truncate">
                            {unit.nickname || unit.equipmentType || 'Unit'}
                          </div>
                          <div className="text-[9px] text-gray-500 truncate">
                            {[unit.manufacturer, unit.modelNumber].filter(Boolean).join(' ')}
                          </div>
                        </div>
                        <ChevronRight size={12} className="text-gray-600" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Site actions */}
              <div className="grid grid-cols-2 sm:flex gap-2 pt-1">
                <button onClick={onEdit} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gray-800 text-gray-300 text-xs font-bold active:bg-gray-700">
                  <Edit2 size={12} /> Edit Site
                </button>
                <button onClick={onAddEquipment} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-green-900/30 border border-green-800 text-green-400 text-xs font-bold active:bg-green-900/50">
                  <PlusCircle size={12} /> Add Unit
                </button>
                <button onClick={onAddUnit} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-blue-900/30 border border-blue-800 text-blue-400 text-xs font-bold active:bg-blue-900/50">
                  <Link size={12} /> Link Unit
                </button>
                <button onClick={onArchive} className="px-3 py-2 rounded-xl bg-gray-800 text-gray-500 active:bg-gray-700">
                  <Archive size={12} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DetailScreen({
  customerId,
  clientId,
  onBack,
  onEditCustomer,
  onAddSite,
  onEditSite,
  onRefresh,
  navigate,
}: {
  customerId:     string;
  clientId:       string;
  onBack:         () => void;
  onEditCustomer: (c: Customer) => void;
  onAddSite:      (c: Customer) => void;
  onEditSite:     (c: Customer, s: CustomerSite) => void;
  onRefresh:      () => void;
  navigate:       (path: string) => void;
}) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [showJobs, setShowJobs]   = useState(false);

  const load = useCallback(async () => {
    if (!clientId) {
      setLoading(true);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<{ customer: Customer }>(
        `/api/customers/${customerId}?clientId=${encodeURIComponent(clientId)}`
      );
      setCustomer(data.customer);
    } catch {
      setError('Failed to load customer details.');
    } finally {
      setLoading(false);
    }
  }, [customerId, clientId]);

  useEffect(() => { void load(); }, [load]);

  async function handleArchiveCustomer() {
    if (!customer) return;
    if (!confirm(`Delete "${customer.name}" from your active customer list? Equipment, jobs, and diagnostics remain saved.`)) return;
    setArchiving(true);
    try {
      await apiDelete(`/api/customers/${customer.id}?clientId=${encodeURIComponent(clientId)}`);
      onRefresh();
      onBack();
    } catch {
      alert('Failed to delete customer.');
    } finally {
      setArchiving(false);
    }
  }

  async function handleArchiveSite(siteId: string) {
    if (!confirm('Archive this site? Equipment linked to it will remain.')) return;
    try {
      await apiDelete(`/api/customer-sites/${siteId}?clientId=${encodeURIComponent(clientId)}`);
      void load();
    } catch {
      alert('Failed to archive site.');
    }
  }

  async function handleLinkUnit(siteId?: string) {
    if (!customer) return;
    const unitId = prompt('Enter the unit ID to link (from the Equipment page):');
    if (!unitId?.trim()) return;
    try {
      await apiPatch<unknown>(`/api/units/${unitId.trim()}/link-customer`, {
        clientId,
        customerId: customer.id,
        siteId: siteId ?? undefined,
      });
      void load();
    } catch {
      alert('Failed to link unit. Check the unit ID and try again.');
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-950">
        <AppNav active="customers" />
        <div className="flex justify-center pt-20">
          <Loader2 size={28} className="text-blue-500 animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-950">
        <AppNav active="customers" />
        <div className="flex flex-col items-center gap-3 pt-16 text-center px-4">
          <AlertTriangle size={28} className="text-yellow-500" />
          <div className="text-sm text-gray-400">{error ?? 'Customer not found.'}</div>
          <button onClick={onBack} className="text-xs text-blue-400 px-3 py-1.5 rounded-lg bg-blue-950/30">Go Back</button>
        </div>
      </div>
    );
  }

  const allUnits = [...(customer.units ?? []), ...(customer.sites ?? []).flatMap(s => s.units ?? [])];
  const recentJobs = customer.recentJobs ?? [];
  const diagnosticLogs = customer.diagnosticLogs ?? [];

  return (
    <div className="flex flex-col min-h-screen bg-gray-950">
      <AppNav active="customers" />

      <div className="max-w-2xl mx-auto w-full px-4 pt-4 pb-28">
        {/* Back + actions */}
        <div className="flex items-center gap-3 mb-4">
          <button onClick={onBack} className="w-8 h-8 rounded-xl bg-gray-800 flex items-center justify-center text-gray-400 active:bg-gray-700">
            <ArrowLeft size={16} />
          </button>
          <div className="flex-1" />
          <button
            onClick={() => onEditCustomer(customer)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-800 text-gray-300 text-xs font-bold active:bg-gray-700"
          >
            <Edit2 size={12} /> Edit
          </button>
          <button
            onClick={handleArchiveCustomer}
            disabled={archiving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/30 border border-red-900/50 text-red-400 text-xs font-bold active:bg-red-950/50 disabled:opacity-40"
          >
            <Trash2 size={12} /> Delete
          </button>
        </div>

        {/* Customer header */}
        <div className="rounded-2xl bg-gray-900 border border-gray-800 px-4 py-4 mb-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-blue-900/40 border border-blue-800/60 flex items-center justify-center">
              <Users size={22} className="text-blue-400" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-white">{customer.name}</h1>
              <div className="flex gap-2 mt-0.5">
                {(customer.sites?.length ?? 0) > 0 && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-gray-800 text-gray-400">
                    {customer.sites!.length} site{customer.sites!.length !== 1 ? 's' : ''}
                  </span>
                )}
                {allUnits.length > 0 && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-gray-800 text-gray-400">
                    {allUnits.length} unit{allUnits.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            <InfoRow icon={<User size={14} />}    label="Contact"        value={customer.contactName} />
            <InfoRow icon={<Phone size={14} />}   label="Phone"          value={customer.phone} />
            <InfoRow icon={<Mail size={14} />}    label="Email"          value={customer.email} />
            <InfoRow icon={<FileText size={14} />} label="Billing Notes"  value={customer.billingNotes} />
            <InfoRow icon={<StickyNote size={14} />} label="Notes"        value={customer.notes} />
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            onClick={() => navigate(`/job`)}
            className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-blue-900/30 border border-blue-800 text-blue-400 font-bold text-xs active:scale-[0.98] transition-transform"
          >
            <Plus size={14} /> Add Job
          </button>
          <button
            onClick={() => navigate(`/records/new?customerId=${encodeURIComponent(customer.id)}&customerName=${encodeURIComponent(customer.name)}`)}
            className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-green-900/30 border border-green-800 text-green-400 font-bold text-xs active:scale-[0.98] transition-transform"
          >
            <Plus size={14} /> Add Equipment
          </button>
        </div>

        {/* Sites */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sites / Locations</div>
            <button
              onClick={() => onAddSite(customer)}
              className="flex items-center gap-1 text-[10px] text-blue-400 px-2 py-1 rounded-lg bg-blue-950/30 active:bg-blue-950/50"
            >
              <Plus size={11} /> Add Site
            </button>
          </div>

          {(customer.sites?.length ?? 0) === 0 ? (
            <div className="rounded-2xl bg-gray-900 border border-gray-800 border-dashed flex flex-col items-center gap-2 py-6">
              <MapPin size={20} className="text-gray-600" />
              <div className="text-xs text-gray-500">No sites yet</div>
              <button onClick={() => onAddSite(customer)} className="text-[10px] text-blue-400 underline">Add first site</button>
            </div>
          ) : (
            <div className="space-y-2">
              {customer.sites!.map(site => (
                <SiteCard
                  key={site.id}
                  site={site}
                  onEdit={() => onEditSite(customer, site)}
                  onArchive={() => handleArchiveSite(site.id)}
                  onAddUnit={() => handleLinkUnit(site.id)}
                  onAddEquipment={() => navigate(`/records/new?customerId=${encodeURIComponent(customer.id)}&customerName=${encodeURIComponent(customer.name)}&siteId=${encodeURIComponent(site.id)}&siteName=${encodeURIComponent(site.siteName)}`)}
                  onOpenUnit={(unitId) => navigate(`/records/${unitId}`)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Unlinked units (at customer level, no specific site) */}
        {(customer.units?.length ?? 0) > 0 && (
          <div className="mb-4">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Equipment (No Site)</div>
            <div className="space-y-1.5">
              {customer.units!.map(unit => (
                <button
                  key={unit.id}
                  onClick={() => navigate(`/records/${unit.id}`)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-900 border border-gray-800 text-left active:scale-[0.98] transition-transform"
                >
                  <Wrench size={14} className="text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white font-bold truncate">
                      {unit.nickname || unit.equipmentType || 'Unit'}
                    </div>
                    <div className="text-[10px] text-gray-500 truncate">
                      {[unit.manufacturer, unit.modelNumber, unit.serialNumber].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-gray-600" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Link unit to customer (no site) */}
        <button
          onClick={() => handleLinkUnit(undefined)}
          className="w-full flex items-center justify-center gap-2 py-3 mb-4 rounded-2xl border border-gray-700 border-dashed text-gray-500 text-xs font-bold active:bg-gray-900"
        >
          <Link size={13} /> Link Existing Equipment
        </button>

        {/* Recent Jobs */}
        <div className="mb-4">
          <button
            onClick={() => setShowJobs(v => !v)}
            className="w-full flex items-center justify-between mb-2"
          >
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Jobs {recentJobs.length > 0 ? `(${recentJobs.length})` : ''}
            </div>
            {showJobs ? <ChevronUp size={14} className="text-gray-600" /> : <ChevronDown size={14} className="text-gray-600" />}
          </button>

          <AnimatePresence>
            {showJobs && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden"
              >
                {recentJobs.length === 0 ? (
                  <div className="rounded-2xl bg-gray-900 border border-gray-800 border-dashed text-xs text-gray-500 text-center py-5">No jobs found for this customer.</div>
                ) : (
                  <div className="space-y-1.5">
                    {recentJobs.map(job => (
                      <button
                        key={job.id}
                        onClick={() => navigate(`/job/${job.id}`)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-900 border border-gray-800 text-left active:scale-[0.98] transition-transform"
                      >
                        <Briefcase size={14} className="text-gray-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-white font-bold truncate">
                            {job.title || job.unitLabel || 'Service Call'}
                          </div>
                          <div className="flex gap-2 mt-0.5">
                            <span className="text-[9px] text-gray-500 truncate">{formatDate(job.startedAt)}</span>
                            {job.site && <span className="text-[9px] text-gray-500 truncate">{job.site}</span>}
                            {job.status && (
                              <span className={`text-[9px] px-1 rounded ${
                                job.status === 'completed' ? 'bg-green-900/40 text-green-400' :
                                job.status === 'active'    ? 'bg-blue-900/40 text-blue-400'   :
                                'bg-gray-800 text-gray-500'
                              }`}>{job.status}</span>
                            )}
                          </div>
                        </div>
                        <ChevronRight size={14} className="text-gray-600" />
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Diagnostic History */}
        <div>
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Diagnostic History {diagnosticLogs.length > 0 ? `(${diagnosticLogs.length})` : ''}
          </div>
          {diagnosticLogs.length === 0 ? (
            <div className="rounded-2xl bg-gray-900 border border-gray-800 border-dashed flex flex-col items-center gap-2 py-6 text-center px-4">
              <Activity size={20} className="text-gray-600" />
              <div className="text-xs text-gray-500">No diagnostics linked to this customer's equipment yet.</div>
              <button onClick={() => navigate('/diagnose')} className="text-[10px] text-blue-400 underline">Run diagnostic</button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {diagnosticLogs.map(log => (
                <button
                  key={log.id}
                  onClick={() => navigate(`/logs/${log.id}`)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-900 border border-gray-800 text-left active:scale-[0.98] transition-transform"
                >
                  <Activity size={14} className="text-blue-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white font-bold truncate">
                      {log.diagnosisTitle || log.symptoms || 'Diagnostic'}
                    </div>
                    <div className="flex gap-2 mt-0.5">
                      <span className="text-[9px] text-gray-500">{formatDate(log.timestamp)}</span>
                      <span className={`text-[9px] px-1 rounded ${
                        log.status === 'resolved' ? 'bg-green-900/40 text-green-400' :
                        log.status === 'monitoring' ? 'bg-blue-900/40 text-blue-400' :
                        'bg-amber-900/40 text-amber-400'
                      }`}>{log.status}</span>
                      {typeof log.confidencePercent === 'number' && (
                        <span className="text-[9px] text-gray-500">{log.confidencePercent}%</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-gray-600" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Customer Form ────────────────────────────────────────────────────────────

interface CustomerFormState {
  name:         string;
  address:      string;
  city:         string;
  state:        string;
  zip:          string;
  contactName:  string;
  phone:        string;
  email:        string;
  billingNotes: string;
  notes:        string;
}

function CustomerForm({
  clientId,
  existing,
  onSaved,
  onBack,
}: {
  clientId:  string;
  existing?: Customer;
  onSaved:   (c: Customer) => void;
  onBack:    () => void;
}) {
  const [form, setForm] = useState<CustomerFormState>({
    name:         existing?.name         ?? '',
    address:      existing?.address      ?? '',
    city:         existing?.city         ?? '',
    state:        existing?.state        ?? '',
    zip:          existing?.zip          ?? '',
    contactName:  existing?.contactName  ?? '',
    phone:        existing?.phone        ?? '',
    email:        existing?.email        ?? '',
    billingNotes: existing?.billingNotes ?? '',
    notes:        existing?.notes        ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  function set<K extends keyof CustomerFormState>(k: K, v: string) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Customer name is required.'); return; }
    setError(null);
    setSaving(true);
    try {
      const payload = {
        clientId,
        name:         form.name.trim()         || undefined,
        address:      form.address.trim()       || null,
        city:         form.city.trim()          || null,
        state:        form.state.trim()         || null,
        zip:          form.zip.trim()           || null,
        contactName:  form.contactName.trim()   || null,
        phone:        form.phone.trim()         || null,
        email:        form.email.trim()         || null,
        billingNotes: form.billingNotes.trim()  || null,
        notes:        form.notes.trim()         || null,
      };

      let result: Customer;
      if (existing) {
        const data = await apiPatch<{ customer: Customer }>(`/api/customers/${existing.id}`, payload);
        result = data.customer;
      } else {
        const data = await apiPost<{ customer: Customer }>('/api/customers', payload);
        result = data.customer;
      }
      onSaved(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save customer.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-950">
      <AppNav active="customers" />

      <div className="max-w-2xl mx-auto w-full px-4 pt-4 pb-28">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <button onClick={onBack} className="w-8 h-8 rounded-xl bg-gray-800 flex items-center justify-center text-gray-400 active:bg-gray-700">
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="font-bold text-white">{existing ? 'Edit Customer' : 'New Customer'}</div>
            <div className="text-[10px] text-gray-500">Customer or business information</div>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className={LABEL}>Business / Customer Name *</label>
            <input className={INPUT} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Acme Property Management" autoFocus />
          </div>
          <div>
            <label className={LABEL}>Street Address</label>
            <input className={INPUT} value={form.address} onChange={e => set('address', e.target.value)} placeholder="123 Industrial Blvd" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-1">
              <label className={LABEL}>City</label>
              <input className={INPUT} value={form.city} onChange={e => set('city', e.target.value)} placeholder="Austin" />
            </div>
            <div>
              <label className={LABEL}>State</label>
              <input className={INPUT} value={form.state} onChange={e => set('state', e.target.value)} placeholder="TX" maxLength={2} />
            </div>
            <div>
              <label className={LABEL}>ZIP</label>
              <input className={INPUT} value={form.zip} onChange={e => set('zip', e.target.value)} placeholder="78701" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Contact Name</label>
              <input className={INPUT} value={form.contactName} onChange={e => set('contactName', e.target.value)} placeholder="John Smith" />
            </div>
            <div>
              <label className={LABEL}>Phone</label>
              <input className={INPUT} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(555) 555-0100" type="tel" />
            </div>
          </div>
          <div>
            <label className={LABEL}>Email</label>
            <input className={INPUT} value={form.email} onChange={e => set('email', e.target.value)} placeholder="contact@acme.com" type="email" />
          </div>
          <div>
            <label className={LABEL}>Billing Notes</label>
            <textarea className={TEXTAREA} rows={2} value={form.billingNotes} onChange={e => set('billingNotes', e.target.value)} placeholder="NET 30, invoice to AP dept, PO required…" />
          </div>
          <div>
            <label className={LABEL}>Internal Notes</label>
            <textarea className={TEXTAREA} rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Preferred tech, service history, preferences…" />
          </div>

          {error && (
            <div className="rounded-xl bg-red-950/30 border border-red-800/50 px-3 py-2 text-xs text-red-400">{error}</div>
          )}
        </div>

        {/* Save */}
        <div className="fixed bottom-0 left-0 right-0 sm:static sm:mt-6 px-4 pb-8 sm:pb-0 pt-3 bg-gray-950 sm:bg-transparent border-t border-gray-800 sm:border-0">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-4 rounded-2xl text-sm active:scale-[0.98] transition-all disabled:opacity-40"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
            {saving ? 'Saving…' : existing ? 'Save Changes' : 'Create Customer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Site Form ────────────────────────────────────────────────────────────────

interface SiteFormState {
  siteName:        string;
  address:         string;
  city:            string;
  state:           string;
  zip:             string;
  accessNotes:     string;
  roofAccessNotes: string;
  gateCode:        string;
  parkingNotes:    string;
  mainContact:     string;
  siteNotes:       string;
}

function SiteForm({
  clientId,
  customer,
  existing,
  onSaved,
  onBack,
}: {
  clientId:  string;
  customer:  Customer;
  existing?: CustomerSite;
  onSaved:   (s: CustomerSite) => void;
  onBack:    () => void;
}) {
  const [form, setForm] = useState<SiteFormState>({
    siteName:        existing?.siteName        ?? '',
    address:         existing?.address         ?? '',
    city:            existing?.city            ?? '',
    state:           existing?.state           ?? '',
    zip:             existing?.zip             ?? '',
    accessNotes:     existing?.accessNotes     ?? '',
    roofAccessNotes: existing?.roofAccessNotes ?? '',
    gateCode:        existing?.gateCode        ?? '',
    parkingNotes:    existing?.parkingNotes    ?? '',
    mainContact:     existing?.mainContact     ?? '',
    siteNotes:       existing?.siteNotes       ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  function set<K extends keyof SiteFormState>(k: K, v: string) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  async function handleSave() {
    if (!form.siteName.trim()) { setError('Site name is required.'); return; }
    setError(null);
    setSaving(true);
    try {
      const payload = {
        clientId,
        siteName:        form.siteName.trim()        || undefined,
        address:         form.address.trim()         || null,
        city:            form.city.trim()            || null,
        state:           form.state.trim()           || null,
        zip:             form.zip.trim()             || null,
        accessNotes:     form.accessNotes.trim()     || null,
        roofAccessNotes: form.roofAccessNotes.trim() || null,
        gateCode:        form.gateCode.trim()        || null,
        parkingNotes:    form.parkingNotes.trim()    || null,
        mainContact:     form.mainContact.trim()     || null,
        siteNotes:       form.siteNotes.trim()       || null,
      };

      let result: CustomerSite;
      if (existing) {
        const data = await apiPatch<{ site: CustomerSite }>(`/api/customer-sites/${existing.id}`, payload);
        result = data.site;
      } else {
        const data = await apiPost<{ site: CustomerSite }>(`/api/customers/${customer.id}/sites`, payload);
        result = data.site;
      }
      onSaved(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save site.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-950">
      <AppNav active="customers" />

      <div className="max-w-2xl mx-auto w-full px-4 pt-4 pb-28">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <button onClick={onBack} className="w-8 h-8 rounded-xl bg-gray-800 flex items-center justify-center text-gray-400 active:bg-gray-700">
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="font-bold text-white">{existing ? 'Edit Site' : 'Add Site'}</div>
            <div className="text-[10px] text-gray-500">{customer.name}</div>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className={LABEL}>Site Name *</label>
            <input className={INPUT} value={form.siteName} onChange={e => set('siteName', e.target.value)} placeholder="Main Building, Rooftop A, North Campus…" autoFocus />
          </div>
          <div>
            <label className={LABEL}>Street Address</label>
            <input className={INPUT} value={form.address} onChange={e => set('address', e.target.value)} placeholder="123 Industrial Blvd" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-1">
              <label className={LABEL}>City</label>
              <input className={INPUT} value={form.city} onChange={e => set('city', e.target.value)} placeholder="Redding" />
            </div>
            <div>
              <label className={LABEL}>State</label>
              <input className={INPUT} value={form.state} onChange={e => set('state', e.target.value)} placeholder="CA" maxLength={2} />
            </div>
            <div>
              <label className={LABEL}>ZIP</label>
              <input className={INPUT} value={form.zip} onChange={e => set('zip', e.target.value)} placeholder="96001" />
            </div>
          </div>

          <div className="pt-1">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Access Information</div>
            <div className="space-y-3">
              <div>
                <label className={LABEL}>Main Contact at Site</label>
                <input className={INPUT} value={form.mainContact} onChange={e => set('mainContact', e.target.value)} placeholder="Facilities manager name / phone" />
              </div>
              <div>
                <label className={LABEL}>Gate Code / Lockbox</label>
                <input className={INPUT} value={form.gateCode} onChange={e => set('gateCode', e.target.value)} placeholder="#1234, lockbox on west gate…" />
              </div>
              <div>
                <label className={LABEL}>Access Notes</label>
                <textarea className={TEXTAREA} rows={2} value={form.accessNotes} onChange={e => set('accessNotes', e.target.value)} placeholder="Badge required, call before entry, check in at front desk…" />
              </div>
              <div>
                <label className={LABEL}>Roof Access Notes</label>
                <textarea className={TEXTAREA} rows={2} value={form.roofAccessNotes} onChange={e => set('roofAccessNotes', e.target.value)} placeholder="Roof hatch key at front desk, parapet ladder on south side…" />
              </div>
              <div>
                <label className={LABEL}>Parking Notes</label>
                <textarea className={TEXTAREA} rows={1} value={form.parkingNotes} onChange={e => set('parkingNotes', e.target.value)} placeholder="Loading dock only, vehicle permit required…" />
              </div>
              <div>
                <label className={LABEL}>Site Notes</label>
                <textarea className={TEXTAREA} rows={2} value={form.siteNotes} onChange={e => set('siteNotes', e.target.value)} placeholder="Any other notes about this location…" />
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-red-950/30 border border-red-800/50 px-3 py-2 text-xs text-red-400">{error}</div>
          )}
        </div>

        {/* Save */}
        <div className="fixed bottom-0 left-0 right-0 sm:static sm:mt-6 px-4 pb-8 sm:pb-0 pt-3 bg-gray-950 sm:bg-transparent border-t border-gray-800 sm:border-0">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-4 rounded-2xl text-sm active:scale-[0.98] transition-all disabled:opacity-40"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
            {saving ? 'Saving…' : existing ? 'Save Site' : 'Add Site'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CustomersPage({ customerId }: { customerId?: string }) {
  const [, navigate] = useLocation();
  const { user }     = useUser();
  const clientId     = user?.id ?? '';

  const [screen, setScreen]             = useState<Screen>(customerId ? 'detail' : 'list');
  const [selectedCustomer, setSelected] = useState<Customer | null>(null);
  const [editingSite, setEditingSite]   = useState<CustomerSite | null>(null);
  const [listKey, setListKey]           = useState(0); // increment to force list reload

  useEffect(() => {
    if (customerId) {
      setScreen('detail');
    } else if (screen === 'detail' && !selectedCustomer) {
      setScreen('list');
    }
  }, [customerId, screen, selectedCustomer]);

  function handleSelectCustomer(c: Customer) {
    setSelected(c);
    navigate(`/customers/${c.id}`);
    setScreen('detail');
  }

  function handleEditCustomer(c: Customer) {
    setSelected(c);
    setScreen('form-customer');
  }

  function handleAddSite(c: Customer) {
    setSelected(c);
    setEditingSite(null);
    setScreen('form-site');
  }

  function handleEditSite(c: Customer, s: CustomerSite) {
    setSelected(c);
    setEditingSite(s);
    setScreen('form-site');
  }

  function handleCustomerSaved(c: Customer) {
    setSelected(c);
    setListKey(k => k + 1);
    navigate(`/customers/${c.id}`);
    setScreen('detail');
  }

  function handleSiteSaved(_s: CustomerSite) {
    setScreen('detail');
  }

  function handleListRefresh() {
    setListKey(k => k + 1);
  }

  return (
    <AnimatePresence mode="wait">
      {screen === 'list' && (
        <motion.div key={`list-${listKey}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
          <ListScreen
            clientId={clientId}
            onSelect={handleSelectCustomer}
            onAdd={() => { setSelected(null); setScreen('form-customer'); }}
          />
        </motion.div>
      )}

      {screen === 'detail' && (selectedCustomer || customerId) && (
        <motion.div key={`detail-${customerId ?? selectedCustomer?.id}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.15 }}>
          <DetailScreen
            customerId={customerId ?? selectedCustomer!.id}
            clientId={clientId}
            onBack={() => { navigate('/customers'); setSelected(null); setScreen('list'); }}
            onEditCustomer={handleEditCustomer}
            onAddSite={handleAddSite}
            onEditSite={handleEditSite}
            onRefresh={handleListRefresh}
            navigate={navigate}
          />
        </motion.div>
      )}

      {screen === 'form-customer' && (
        <motion.div key="form-customer" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} transition={{ duration: 0.15 }}>
          <CustomerForm
            clientId={clientId}
            existing={selectedCustomer ?? undefined}
            onSaved={handleCustomerSaved}
            onBack={() => setScreen(selectedCustomer ? 'detail' : 'list')}
          />
        </motion.div>
      )}

      {screen === 'form-site' && selectedCustomer && (
        <motion.div key="form-site" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} transition={{ duration: 0.15 }}>
          <SiteForm
            clientId={clientId}
            customer={selectedCustomer}
            existing={editingSite ?? undefined}
            onSaved={handleSiteSaved}
            onBack={() => setScreen('detail')}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
