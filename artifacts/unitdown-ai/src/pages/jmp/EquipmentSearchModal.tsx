import { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Search, ChevronRight, AlertTriangle, CheckCircle,
  Cpu, RefreshCw, Loader2, Building2, MapPin,
} from 'lucide-react';

interface UnitRecord {
  id: string;
  nickname?: string;
  manufacturer?: string;
  modelNumber?: string;
  serialNumber?: string;
  equipmentType?: string;
  locationOnSite?: string;
  customer?: string;
  site?: string;
  healthStatus?: 'critical' | 'follow-up' | 'monitoring' | 'operational';
  lastServiceDate?: string;
  isFavorite?: boolean;
}

function healthBadge(status?: string) {
  switch (status) {
    case 'critical':    return { label: 'Critical',     cls: 'bg-red-900/40 text-red-400 border-red-800/40' };
    case 'follow-up':   return { label: 'Follow-up',    cls: 'bg-amber-900/40 text-amber-400 border-amber-800/40' };
    case 'monitoring':  return { label: 'Monitoring',   cls: 'bg-yellow-900/40 text-yellow-400 border-yellow-800/40' };
    case 'operational': return { label: 'Operational',  cls: 'bg-green-900/40 text-green-400 border-green-800/40' };
    default:            return null;
  }
}

interface Props {
  onClose: () => void;
}

export function EquipmentSearchModal({ onClose }: Props) {
  const { user } = useUser();
  const [, navigate] = useLocation();
  const [query, setQuery] = useState('');
  const [units, setUnits] = useState<UnitRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clientId = user?.id ?? '';

  async function fetchUnits(q: string) {
    if (!clientId) { setError('Sign in to search your equipment records.'); return; }
    setLoading(true);
    setError(null);
    try {
      const cid = encodeURIComponent(clientId);
      const params = q.trim() ? `clientId=${cid}&q=${encodeURIComponent(q.trim())}` : `clientId=${cid}`;
      const res = await fetch(`/api/units?${params}`);
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json() as { units?: UnitRecord[] } | UnitRecord[];
      const list: UnitRecord[] = Array.isArray(data) ? data : (data.units ?? []);
      setUnits(list);
      setFetched(true);
    } catch (e) {
      setError('Could not load equipment. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUnits('');
    setTimeout(() => inputRef.current?.focus(), 150);
  }, []);

  useEffect(() => {
    if (!fetched) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchUnits(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const filtered = units.filter(u => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return [
      u.nickname, u.manufacturer, u.modelNumber, u.serialNumber,
      u.equipmentType, u.locationOnSite, u.customer, u.site,
    ].some(f => f?.toLowerCase().includes(q));
  });

  function openRecord(id: string) {
    onClose();
    navigate(`/records/${id}`);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-gray-950"
    >
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 pt-12 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Search size={16} className="text-blue-400" />
            <span className="font-bold text-white text-base">Search Equipment</span>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl bg-gray-800 flex items-center justify-center active:scale-90 transition-transform">
            <X size={15} className="text-gray-400" />
          </button>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Customer, unit, model, serial…"
            className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
          {loading && (
            <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 animate-spin" />
          )}
        </div>
        {units.length > 0 && (
          <div className="mt-2 text-[10px] text-gray-500">
            {filtered.length} of {units.length} unit{units.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {error ? (
            <motion.div key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-64 px-8 text-center gap-4">
              <AlertTriangle size={32} className="text-amber-400" />
              <p className="text-sm text-gray-300">{error}</p>
              <button onClick={() => fetchUnits(query)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-xl text-sm font-semibold text-white active:scale-95 transition-transform">
                <RefreshCw size={13} /> Retry
              </button>
            </motion.div>
          ) : loading && !fetched ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-64 gap-3">
              <Loader2 size={28} className="text-blue-400 animate-spin" />
              <p className="text-sm text-gray-400">Loading equipment records…</p>
            </motion.div>
          ) : filtered.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-64 px-8 text-center gap-3">
              <Cpu size={32} className="text-gray-600" />
              <div>
                <p className="text-sm font-semibold text-white mb-1">
                  {query ? 'No results found' : 'No equipment records yet'}
                </p>
                <p className="text-xs text-gray-500">
                  {query
                    ? `No equipment matched "${query}". Try a different search.`
                    : 'Add equipment by scanning a nameplate or creating a record.'}
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="divide-y divide-gray-800/60">
              {filtered.map(u => {
                const badge = healthBadge(u.healthStatus);
                const title = u.nickname || [u.manufacturer, u.modelNumber].filter(Boolean).join(' ') || 'Unknown Unit';
                return (
                  <button key={u.id} onClick={() => openRecord(u.id)}
                    className="w-full text-left px-4 py-4 flex items-start gap-3 active:bg-gray-900 transition-colors">
                    {/* Icon */}
                    <div className="w-9 h-9 rounded-xl bg-blue-900/30 border border-blue-800/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Cpu size={16} className="text-blue-400" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-white truncate">{title}</span>
                            {badge && (
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${badge.cls}`}>
                                {badge.label}
                              </span>
                            )}
                          </div>
                          {(u.manufacturer || u.modelNumber) && title !== `${u.manufacturer} ${u.modelNumber}` && (
                            <div className="text-xs text-gray-400 mt-0.5 truncate">
                              {[u.manufacturer, u.modelNumber].filter(Boolean).join(' ')}
                            </div>
                          )}
                          {u.serialNumber && (
                            <div className="text-[10px] font-mono text-gray-600 mt-0.5">S/N: {u.serialNumber}</div>
                          )}
                        </div>
                        <ChevronRight size={14} className="text-gray-600 flex-shrink-0 mt-1" />
                      </div>

                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                        {u.customer && (
                          <div className="flex items-center gap-1">
                            <Building2 size={10} className="text-gray-600 flex-shrink-0" />
                            <span className="text-[10px] text-gray-500 truncate max-w-[140px]">{u.customer}</span>
                          </div>
                        )}
                        {(u.site || u.locationOnSite) && (
                          <div className="flex items-center gap-1">
                            <MapPin size={10} className="text-gray-600 flex-shrink-0" />
                            <span className="text-[10px] text-gray-500 truncate max-w-[140px]">{u.site || u.locationOnSite}</span>
                          </div>
                        )}
                        {u.equipmentType && (
                          <span className="text-[10px] text-blue-400/70">{u.equipmentType.split(' ')[0]}</span>
                        )}
                      </div>

                      {u.lastServiceDate && (
                        <div className="flex items-center gap-1 mt-1">
                          <CheckCircle size={10} className="text-gray-600" />
                          <span className="text-[9px] text-gray-600">Last service: {u.lastServiceDate}</span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-800 bg-gray-900 flex-shrink-0">
        <p className="text-[10px] text-gray-600 text-center">
          Tap any record to view full equipment history and diagnostics
        </p>
      </div>
    </motion.div>
  );
}
