import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Plus, Building2, MapPin, Loader2, Check } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CustomerOption {
  id: string;
  name: string;
  contactName?: string | null;
}

interface SiteOption {
  id: string;
  siteName: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
}

export interface CustomerSiteValue {
  customerId: string | null;
  siteId: string | null;
  customerName: string;
}

interface Props {
  clientId: string;
  initialCustomerId?: string | null;
  initialSiteId?: string | null;
  onChange: (val: CustomerSiteValue) => void;
  placeholder?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CustomerSiteField({
  clientId,
  initialCustomerId,
  initialSiteId,
  onChange,
  placeholder = "Search customers…",
}: Props) {
  const [query, setQuery]                       = useState("");
  const [results, setResults]                   = useState<CustomerOption[]>([]);
  const [searchLoading, setSearchLoading]       = useState(false);
  const [showDropdown, setShowDropdown]         = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [sites, setSites]                       = useState<SiteOption[]>([]);
  const [sitesLoading, setSitesLoading]         = useState(false);
  const [selectedSiteId, setSelectedSiteId]     = useState<string | null>(initialSiteId ?? null);
  const [creatingCustomer, setCreatingCustomer] = useState(false);

  const debounceRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef  = useRef<HTMLDivElement>(null);
  const inputRef      = useRef<HTMLInputElement>(null);

  // ── Load initial customer when initialCustomerId provided ─────────────────
  useEffect(() => {
    if (!initialCustomerId || !clientId) return;
    fetch(`/api/customers/${encodeURIComponent(initialCustomerId)}?clientId=${encodeURIComponent(clientId)}`)
      .then(r => r.ok ? r.json() as Promise<{ customer: { id: string; name: string; contactName?: string | null; sites?: SiteOption[] } }> : null)
      .then(data => {
        if (!data?.customer) return;
        const c: CustomerOption = { id: data.customer.id, name: data.customer.name, contactName: data.customer.contactName };
        setSelectedCustomer(c);
        setQuery(data.customer.name);
        const loadedSites = data.customer.sites ?? [];
        setSites(loadedSites);
        const validSite = loadedSites.find(s => s.id === initialSiteId);
        const sid = validSite ? initialSiteId ?? null : null;
        setSelectedSiteId(sid);
        onChange({ customerId: c.id, siteId: sid, customerName: c.name });
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCustomerId, clientId]);

  // ── Debounced customer search ─────────────────────────────────────────────
  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim() || !clientId) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/customers?clientId=${encodeURIComponent(clientId)}&q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const data = await res.json() as { customers: CustomerOption[] };
          setResults(data.customers ?? []);
        }
      } catch { setResults([]); }
      finally { setSearchLoading(false); }
    }, 280);
  }, [clientId]);

  // ── Fetch sites for a chosen customer ────────────────────────────────────
  async function fetchSites(customerId: string) {
    setSitesLoading(true);
    try {
      const res = await fetch(`/api/customers/${encodeURIComponent(customerId)}?clientId=${encodeURIComponent(clientId)}`);
      if (res.ok) {
        const data = await res.json() as { customer: { sites?: SiteOption[] } };
        setSites(data.customer.sites ?? []);
      }
    } catch { setSites([]); }
    finally { setSitesLoading(false); }
  }

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleInputChange(val: string) {
    setQuery(val);
    if (selectedCustomer && val !== selectedCustomer.name) {
      setSelectedCustomer(null);
      setSites([]);
      setSelectedSiteId(null);
      onChange({ customerId: null, siteId: null, customerName: val });
    }
    setShowDropdown(true);
    search(val);
  }

  function selectCustomer(c: CustomerOption) {
    setSelectedCustomer(c);
    setQuery(c.name);
    setShowDropdown(false);
    setResults([]);
    setSelectedSiteId(null);
    onChange({ customerId: c.id, siteId: null, customerName: c.name });
    void fetchSites(c.id);
  }

  async function createCustomer() {
    if (!query.trim() || !clientId || creatingCustomer) return;
    setCreatingCustomer(true);
    setShowDropdown(false);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, name: query.trim() }),
      });
      if (res.ok) {
        const data = await res.json() as { customer: { id: string; name: string } };
        const c: CustomerOption = { id: data.customer.id, name: data.customer.name };
        setSelectedCustomer(c);
        setQuery(c.name);
        setSites([]);
        setSelectedSiteId(null);
        onChange({ customerId: c.id, siteId: null, customerName: c.name });
      }
    } catch { /* keep query visible */ }
    finally { setCreatingCustomer(false); }
  }

  function selectSite(siteId: string | null) {
    setSelectedSiteId(siteId);
    onChange({ customerId: selectedCustomer?.id ?? null, siteId, customerName: selectedCustomer?.name ?? query });
  }

  function clearSelection() {
    setSelectedCustomer(null);
    setQuery("");
    setSites([]);
    setSelectedSiteId(null);
    setShowDropdown(false);
    setResults([]);
    onChange({ customerId: null, siteId: null, customerName: "" });
    inputRef.current?.focus();
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const isConfirmed = !!selectedCustomer;
  const showCreateOption = query.trim().length > 0 && !searchLoading && !isConfirmed;
  const exactMatch = results.some(r => r.name.toLowerCase() === query.trim().toLowerCase());

  return (
    <div className="space-y-2" ref={containerRef}>

      {/* ── Customer search input ──────────────────────────────────────────── */}
      <div className="relative">
        <div className={`flex items-center gap-2 border rounded-xl px-3 h-10 transition-colors ${
          isConfirmed
            ? "bg-blue-50 border-blue-300"
            : "bg-white border-slate-200 focus-within:border-blue-400"
        }`}>
          {isConfirmed
            ? <Building2 className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
            : <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          }
          <input
            ref={inputRef}
            value={query}
            onChange={e => handleInputChange(e.target.value)}
            onFocus={() => {
              if (query.trim() && !isConfirmed) {
                setShowDropdown(true);
                search(query);
              } else if (!isConfirmed) {
                setShowDropdown(true);
              }
            }}
            placeholder={placeholder}
            className="flex-1 text-sm bg-transparent outline-none text-slate-800 placeholder-slate-400 min-w-0"
          />
          {(creatingCustomer || (searchLoading && !isConfirmed)) && (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400 flex-shrink-0" />
          )}
          {(query || selectedCustomer) && !creatingCustomer && (
            <button type="button" onClick={clearSelection} className="text-slate-400 hover:text-slate-600 flex-shrink-0 p-0.5">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* ── Results dropdown ───────────────────────────────────────────── */}
        {showDropdown && (results.length > 0 || showCreateOption) && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden max-h-60 overflow-y-auto">
            {results.map(c => (
              <button
                key={c.id}
                type="button"
                onMouseDown={e => { e.preventDefault(); selectCustomer(c); }}
                className="w-full text-left px-3 py-2.5 hover:bg-blue-50 flex items-center gap-2.5 border-b border-slate-100 last:border-0 transition-colors"
              >
                <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{c.name}</p>
                  {c.contactName && <p className="text-xs text-slate-400 truncate">{c.contactName}</p>}
                </div>
              </button>
            ))}
            {showCreateOption && !exactMatch && (
              <button
                type="button"
                onMouseDown={e => { e.preventDefault(); void createCustomer(); }}
                className="w-full text-left px-3 py-2.5 hover:bg-emerald-50 flex items-center gap-2.5 border-t border-slate-100 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span className="text-sm text-emerald-700 font-semibold">
                  Create new customer: <em className="not-italic font-bold">"{query.trim()}"</em>
                </span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Site picker — shown after customer confirmed ───────────────────── */}
      {isConfirmed && (
        <div className="pl-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Site / Address</p>
          {sitesLoading ? (
            <div className="flex items-center gap-2 text-xs text-slate-400 py-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Loading sites…
            </div>
          ) : (
            <div className="space-y-1">
              {sites.map(site => {
                const addrParts = [site.address, site.city, site.state].filter(Boolean).join(", ");
                const sel = selectedSiteId === site.id;
                return (
                  <button
                    key={site.id}
                    type="button"
                    onClick={() => selectSite(sel ? null : site.id)}
                    className={`w-full text-left rounded-xl border px-3 py-2 flex items-center gap-2.5 transition-all active:scale-[0.99] ${
                      sel ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    <MapPin className="w-3 h-3 flex-shrink-0 text-slate-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{site.siteName}</p>
                      {addrParts && <p className="text-[10px] text-slate-400 truncate">{addrParts}</p>}
                    </div>
                    {sel && <Check className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />}
                  </button>
                );
              })}

              {/* No site option */}
              <button
                type="button"
                onClick={() => selectSite(null)}
                className={`w-full text-left rounded-xl border px-3 py-2 flex items-center gap-2.5 transition-all ${
                  selectedSiteId === null
                    ? "border-slate-400 bg-slate-100"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="w-3.5 h-3.5 flex-shrink-0 rounded-full border-2 border-slate-400 flex items-center justify-center">
                  {selectedSiteId === null && <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />}
                </div>
                <span className="text-xs text-slate-500 font-medium">No site / assign later</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
