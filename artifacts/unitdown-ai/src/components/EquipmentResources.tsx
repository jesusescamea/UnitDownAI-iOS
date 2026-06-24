import { useState, useEffect } from "react";
import {
  BookOpen, Wrench, Zap, List, Package, AlertTriangle,
  CheckSquare, Globe, FolderOpen, ExternalLink, ChevronDown,
  ChevronRight, ShieldCheck, Eye, HelpCircle, Loader2,
} from "lucide-react";

// ─── Types (mirrors server-side shape) ────────────────────────────────────────

type ResourceType =
  | "installation_manual"
  | "service_manual"
  | "wiring_diagram"
  | "sequence_of_operation"
  | "parts_guide"
  | "fault_codes"
  | "startup_checklist"
  | "product_page"
  | "documentation_portal";

type ResourceStatus = "official" | "public" | "unverified";

interface Resource {
  id: string;
  type: ResourceType;
  title: string;
  url: string;
  status: ResourceStatus;
  notes?: string;
  docNumber?: string;
  coversSizes?: string;
  addedAt: string;
}

interface FamilyInfo {
  familyId: string;
  manufacturer: string;
  series: string;
  description: string;
  matchType: "prefix" | "manufacturer" | "none";
  matchedPrefix: string | null;
  coversModels: string | null;
}

interface ResourcesResponse {
  match: FamilyInfo | null;
  resources: Resource[];
  universalResources: Resource[];
  totalResources: number;
}

// ─── Icon & label maps ────────────────────────────────────────────────────────

const TYPE_META: Record<ResourceType, { Icon: React.ElementType; label: string; color: string; bg: string }> = {
  installation_manual:    { Icon: BookOpen,   label: "Installation Manual",     color: "text-blue-600",   bg: "bg-blue-50" },
  service_manual:         { Icon: Wrench,     label: "Service Manual",          color: "text-orange-600", bg: "bg-orange-50" },
  wiring_diagram:         { Icon: Zap,        label: "Wiring Diagram",          color: "text-yellow-600", bg: "bg-yellow-50" },
  sequence_of_operation:  { Icon: List,       label: "Sequence of Operation",   color: "text-purple-600", bg: "bg-purple-50" },
  parts_guide:            { Icon: Package,    label: "Parts Guide",             color: "text-slate-600",  bg: "bg-slate-50" },
  fault_codes:            { Icon: AlertTriangle, label: "Fault Codes",          color: "text-red-600",    bg: "bg-red-50" },
  startup_checklist:      { Icon: CheckSquare, label: "Startup Checklist",      color: "text-emerald-600",bg: "bg-emerald-50" },
  product_page:           { Icon: Globe,      label: "Product Page",            color: "text-slate-500",  bg: "bg-slate-50" },
  documentation_portal:   { Icon: FolderOpen, label: "Documentation Portal",   color: "text-indigo-600", bg: "bg-indigo-50" },
};

const STATUS_META: Record<ResourceStatus, { Icon: React.ElementType; label: string; className: string }> = {
  official:   { Icon: ShieldCheck, label: "Official",   className: "bg-blue-100 text-blue-700 border-blue-200" },
  public:     { Icon: Eye,         label: "Public",     className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  unverified: { Icon: HelpCircle,  label: "Unverified", className: "bg-amber-100 text-amber-700 border-amber-200" },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function ResourceCard({ resource }: { resource: Resource }) {
  const [expanded, setExpanded] = useState(false);
  const typeMeta = TYPE_META[resource.type] ?? TYPE_META.documentation_portal;
  const statusMeta = STATUS_META[resource.status];

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Header row — always visible */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left px-3.5 py-3 active:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {/* Type icon */}
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${typeMeta.bg}`}>
            <typeMeta.Icon className={`w-4 h-4 ${typeMeta.color}`} />
          </div>

          {/* Title + type label */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">{resource.title}</p>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className={`text-xs font-semibold ${typeMeta.color}`}>{typeMeta.label}</span>
              {resource.coversSizes && (
                <>
                  <span className="text-slate-300 text-xs">·</span>
                  <span className="text-xs text-slate-400">{resource.coversSizes}</span>
                </>
              )}
            </div>
          </div>

          {/* Status badge */}
          <div className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold flex-shrink-0 ${statusMeta.className}`}>
            <statusMeta.Icon className="w-3 h-3" />
            {statusMeta.label}
          </div>

          {/* Expand chevron */}
          <ChevronDown
            className={`w-4 h-4 text-slate-300 flex-shrink-0 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-3.5 pb-3.5 border-t border-slate-100 pt-3 space-y-3">
          {resource.notes && (
            <p className="text-xs text-slate-600 leading-relaxed">{resource.notes}</p>
          )}
          {resource.docNumber && (
            <div className="bg-slate-50 rounded-lg px-3 py-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-0.5">Document Number</p>
              <p className="text-xs text-slate-700 font-mono leading-snug">{resource.docNumber}</p>
            </div>
          )}
          {resource.status === "unverified" && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <HelpCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                This link has not been recently verified. Confirm it opens the correct document before relying on it.
              </p>
            </div>
          )}
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl py-2.5 text-sm transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open Resource
          </a>
        </div>
      )}
    </div>
  );
}

// ─── Match badge ──────────────────────────────────────────────────────────────

function MatchBadge({ match }: { match: FamilyInfo }) {
  if (match.matchType === "prefix" && match.matchedPrefix) {
    return (
      <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full px-2.5 py-0.5 text-xs font-semibold">
        <ChevronRight className="w-3 h-3" />
        Matched by model prefix "{match.matchedPrefix}"
      </span>
    );
  }
  if (match.matchType === "manufacturer") {
    return (
      <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 border border-blue-200 rounded-full px-2.5 py-0.5 text-xs font-semibold">
        <ChevronRight className="w-3 h-3" />
        Matched by manufacturer name
      </span>
    );
  }
  return null;
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  modelNumber: string | null | undefined;
  manufacturer: string | null | undefined;
}

export default function EquipmentResources({ modelNumber, manufacturer }: Props) {
  const [data, setData] = useState<ResourcesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!modelNumber && !manufacturer) return;

    setLoading(true);
    setError(false);
    setData(null);

    const params = new URLSearchParams();
    if (modelNumber)  params.set("model", modelNumber);
    if (manufacturer) params.set("manufacturer", manufacturer);

    fetch(`/api/resources?${params.toString()}`)
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((json: ResourcesResponse) => setData(json))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [modelNumber, manufacturer]);

  // Don't render if there's nothing to work with
  if (!modelNumber && !manufacturer) return null;

  const hasResources = data && data.totalResources > 0;

  return (
    <div>
      {/* Section header */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="flex items-center justify-between w-full mb-3 group"
      >
        <div>
          <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wide text-left">
            Equipment Resources
          </p>
          {data && (
            <p className="text-xs text-slate-400 mt-0.5 text-left">
              {data.totalResources} resource{data.totalResources !== 1 ? "s" : ""}
              {data.match ? ` · ${data.match.series}` : ""}
            </p>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-300 transition-transform duration-200 ${collapsed ? "-rotate-90" : ""}`}
        />
      </button>

      {collapsed ? null : (
        <>
          {/* Loading */}
          {loading && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3">
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />
              <p className="text-sm text-slate-500">Looking up resources…</p>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Could not load resources. Check your connection and try refreshing.</p>
            </div>
          )}

          {/* No match — still show universal resources */}
          {data && !data.match && !loading && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-3">
              <p className="text-xs font-bold text-amber-700 mb-0.5">No specific resources found</p>
              <p className="text-xs text-amber-600 leading-relaxed">
                {modelNumber
                  ? `Model "${modelNumber}" didn't match a known model family. Resources for this brand may be added in a future update.`
                  : "No model number is saved for this unit."}
                {" "}Universal HVAC resources are shown below.
              </p>
            </div>
          )}

          {/* Match info */}
          {data?.match && !loading && (
            <div className="bg-white rounded-2xl border border-slate-200 px-4 py-3 mb-3">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 leading-snug">{data.match.series}</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{data.match.description}</p>
                  {data.match.coversModels && (
                    <p className="text-xs text-slate-400 mt-1">
                      <span className="font-semibold">Covers: </span>{data.match.coversModels}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-2">
                <MatchBadge match={data.match} />
              </div>
            </div>
          )}

          {/* Family resources */}
          {hasResources && !loading && (
            <div className="space-y-2 mb-2">
              {data.resources.map((r) => (
                <ResourceCard key={r.id} resource={r} />
              ))}
            </div>
          )}

          {/* Universal resources */}
          {data && data.universalResources.length > 0 && !loading && (
            <>
              {data.resources.length > 0 && (
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mt-4 mb-2">
                  Universal Resources
                </p>
              )}
              <div className="space-y-2">
                {data.universalResources.map((r) => (
                  <ResourceCard key={r.id} resource={r} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
