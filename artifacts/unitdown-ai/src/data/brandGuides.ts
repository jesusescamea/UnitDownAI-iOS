// ─── Brand Guides Data ────────────────────────────────────────────────────────
// Add guide content here. null sections show "Guide coming soon."
// Future: import from brand-specific files (e.g. lennox.ts, carrier.ts) and
// spread into the entries below.

export interface GuideSection {
  items: string[];
}

export interface BrandGuide {
  id: string;
  name: string;
  accentBorder: string;
  accentText: string;
  accentBg: string;
  faultCodes: GuideSection | null;
  controls: GuideSection | null;
  startup: GuideSection | null;
  commonIssues: GuideSection | null;
  notes: GuideSection | null;
}

export const BRAND_GUIDES: BrandGuide[] = [
  {
    id: "lennox",
    name: "Lennox",
    accentBorder: "border-red-700",
    accentText: "text-red-400",
    accentBg: "bg-red-950/40",
    faultCodes: null,
    controls: null,
    startup: null,
    commonIssues: null,
    notes: null,
  },
  {
    id: "carrier",
    name: "Carrier",
    accentBorder: "border-blue-700",
    accentText: "text-blue-400",
    accentBg: "bg-blue-950/40",
    faultCodes: null,
    controls: null,
    startup: null,
    commonIssues: null,
    notes: null,
  },
  {
    id: "trane",
    name: "Trane",
    accentBorder: "border-red-800",
    accentText: "text-red-300",
    accentBg: "bg-red-950/30",
    faultCodes: null,
    controls: null,
    startup: null,
    commonIssues: null,
    notes: null,
  },
  {
    id: "york",
    name: "York",
    accentBorder: "border-yellow-700",
    accentText: "text-yellow-400",
    accentBg: "bg-yellow-950/30",
    faultCodes: null,
    controls: null,
    startup: null,
    commonIssues: null,
    notes: null,
  },
  {
    id: "daikin",
    name: "Daikin",
    accentBorder: "border-sky-700",
    accentText: "text-sky-400",
    accentBg: "bg-sky-950/40",
    faultCodes: null,
    controls: null,
    startup: null,
    commonIssues: null,
    notes: null,
  },
  {
    id: "aaon",
    name: "Aaon",
    accentBorder: "border-emerald-700",
    accentText: "text-emerald-400",
    accentBg: "bg-emerald-950/30",
    faultCodes: null,
    controls: null,
    startup: null,
    commonIssues: null,
    notes: null,
  },
  {
    id: "generic-rtu",
    name: "Generic RTU",
    accentBorder: "border-slate-600",
    accentText: "text-slate-300",
    accentBg: "bg-slate-800/40",
    faultCodes: null,
    controls: null,
    startup: null,
    commonIssues: null,
    notes: null,
  },
];

// ─── Section labels ────────────────────────────────────────────────────────────
// Keep in sync with the BrandGuide interface keys above.
export const GUIDE_SECTIONS: { key: keyof Pick<BrandGuide, "faultCodes" | "controls" | "startup" | "commonIssues" | "notes">; label: string }[] = [
  { key: "faultCodes",    label: "Fault Codes"       },
  { key: "controls",      label: "Controls"           },
  { key: "startup",       label: "Startup / Test Mode"},
  { key: "commonIssues",  label: "Common Issues"      },
  { key: "notes",         label: "Notes"              },
];
