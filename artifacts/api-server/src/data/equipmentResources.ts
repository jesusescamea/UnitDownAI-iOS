// ─── Equipment Resources Database ─────────────────────────────────────────────
// Static resource registry for public/official HVAC equipment documentation.
//
// ADMIN NOTES:
//   • Add new model families by appending to MODEL_FAMILIES below.
//   • Add new resources by appending to a family's `resources` array.
//   • modelPrefixes are matched most-specific-first (longer prefixes first).
//   • status values: "official" | "public" | "unverified"
//       official   — hosted on the manufacturer's own domain or by AHRI/ACCA.
//       public     — publicly accessible stable URL, not official manufacturer domain.
//       unverified — link found but currency/accuracy is not confirmed.
//   • Prefer documentation portal pages over direct PDF links (portals are stable).
//   • If you know a manufacturer document number, put it in docNumber so
//     technicians can search for it even if the direct URL changes.

export type ResourceType =
  | "installation_manual"
  | "service_manual"
  | "wiring_diagram"
  | "sequence_of_operation"
  | "parts_guide"
  | "fault_codes"
  | "startup_checklist"
  | "product_page"
  | "documentation_portal";

export type ResourceStatus = "official" | "public" | "unverified";

export interface EquipmentResource {
  id: string;
  type: ResourceType;
  title: string;
  url: string;
  status: ResourceStatus;
  notes?: string;
  docNumber?: string;    // manufacturer document number for searching
  coversSizes?: string;  // e.g. "2–12.5 tons"
  addedAt: string;       // ISO date — helps admin track when entry was added/verified
}

export interface ModelFamily {
  id: string;
  manufacturer: string;
  series: string;
  description: string;
  modelPrefixes: string[];   // uppercase, ordered most-specific first
  coversModels?: string;     // human-readable examples: "LGH060, LGH092, LGH120…"
  resources: EquipmentResource[];
}

// ─── Universal resources (shown for any unit regardless of model) ─────────────

export const UNIVERSAL_RESOURCES: EquipmentResource[] = [
  {
    id: "ahri-directory",
    type: "product_page",
    title: "AHRI Certified Equipment Directory",
    url: "https://www.ahridirectory.org/Search/SearchHome",
    status: "official",
    notes: "Enter model number to retrieve certified efficiency ratings, capacity, and electrical data.",
    addedAt: "2024-01-01",
  },
  {
    id: "epa-608-refrigerant",
    type: "documentation_portal",
    title: "EPA Section 608 Refrigerant Regulations",
    url: "https://www.epa.gov/section608",
    status: "official",
    notes: "Federal regulations for handling refrigerants (certification, venting, recordkeeping).",
    addedAt: "2024-01-01",
  },
];

// ─── Model family definitions ─────────────────────────────────────────────────

export const MODEL_FAMILIES: ModelFamily[] = [

  // ── Lennox LGH / LCH / LGC ──────────────────────────────────────────────
  {
    id: "lennox-lgh-lch-lgc",
    manufacturer: "Lennox",
    series: "LGH / LCH / LGC Commercial Packaged Rooftop",
    description: "Lennox light commercial packaged rooftop units. LGH = gas heat/electric cool, LCH = electric heat/electric cool, LGC = cooling only. Covers 2–25 ton range.",
    modelPrefixes: ["LGH", "LCH", "LGC", "LGR", "LCA"],
    coversModels: "LGH060, LGH092, LGH120, LGH150, LCH060, LGC060…",
    resources: [
      {
        id: "lennox-lgh-iom",
        type: "installation_manual",
        title: "LGH / LCH Installation, Operation & Maintenance Manual",
        url: "https://www.lennox.com/resources",
        status: "official",
        docNumber: "P506047-01 / P507195-01 (varies by tonnage — search on Lennox Resources)",
        notes: "Navigate to Lennox Resources and search 'LGH IOM' or your model number. Covers installation, refrigerant charging, and startup procedures.",
        coversSizes: "2–12.5 tons",
        addedAt: "2024-01-01",
      },
      {
        id: "lennox-pros-portal",
        type: "documentation_portal",
        title: "Lennox Pro — Service & Technical Documentation Portal",
        url: "https://www.lennoxpros.com/",
        status: "official",
        notes: "Dealer account required for full access. Contains service manuals, wiring diagrams, fault codes, and parts data for all LGH/LCH models.",
        addedAt: "2024-01-01",
      },
      {
        id: "lennox-commercial-resources",
        type: "documentation_portal",
        title: "Lennox Commercial Resources",
        url: "https://www.lennox.com/resources",
        status: "official",
        notes: "Public section of Lennox resources library. Use the search/filter to locate LGH technical documents.",
        addedAt: "2024-01-01",
      },
      {
        id: "lennox-lgh-fault-codes",
        type: "fault_codes",
        title: "LGH / LCH Fault Code Reference",
        url: "https://www.lennoxpros.com/",
        status: "official",
        notes: "Fault/error codes are documented in the Service Manual. Flash codes are also on the IFC board label. Lennox Pro portal is the authoritative source.",
        addedAt: "2024-01-01",
      },
      {
        id: "lennox-lgh-parts",
        type: "parts_guide",
        title: "Lennox Parts Search",
        url: "https://www.lennoxpros.com/",
        status: "official",
        notes: "Lennox Pro portal includes parts catalog and replacement part cross-references by model number.",
        addedAt: "2024-01-01",
      },
      {
        id: "lennox-lgh-wiring-notes",
        type: "wiring_diagram",
        title: "LGH / LCH Wiring Diagrams",
        url: "https://www.lennoxpros.com/",
        status: "official",
        notes: "Wiring diagrams are included in the Service Manual packet. Unit-specific diagrams are also affixed inside the control box access panel.",
        addedAt: "2024-01-01",
      },
    ],
  },

  // ── Carrier 48xx — Packaged Gas/Electric Rooftop ─────────────────────────
  {
    id: "carrier-48-packaged",
    manufacturer: "Carrier",
    series: "48 Series Packaged Gas/Electric Rooftop",
    description: "Carrier commercial packaged gas heating / electric cooling rooftop units. Includes 48HC, 48TJ, 48JX, 48XD, and related sub-series.",
    modelPrefixes: ["48HC", "48TJ", "48JX", "48XD", "48XC", "48VD", "48EH", "48"],
    coversModels: "48HC016, 48TJD006, 48XD014, 48JX series…",
    resources: [
      {
        id: "carrier-48-literature",
        type: "documentation_portal",
        title: "Carrier Literature Library — 48 Series",
        url: "https://www.carrier.com/commercial/en/us/literature/",
        status: "official",
        notes: "Search by model number prefix (e.g. '48TJ') to find the Installation, Operation & Maintenance manuals and technical data.",
        addedAt: "2024-01-01",
      },
      {
        id: "carrier-tech-support",
        type: "documentation_portal",
        title: "Carrier Commercial Technical Support",
        url: "https://www.carrier.com/commercial/en/us/technical-support/",
        status: "official",
        notes: "Technical support resources including FAQs, service bulletins, and contact information for field support.",
        addedAt: "2024-01-01",
      },
      {
        id: "carrier-productpro",
        type: "documentation_portal",
        title: "Carrier ProductPro (Contractor Portal)",
        url: "https://www.carrier.com/commercial/",
        status: "official",
        notes: "Carrier's contractor/dealer portal for accessing service literature, parts, and technical data. Registration required for full access.",
        addedAt: "2024-01-01",
      },
      {
        id: "carrier-48-fault-codes",
        type: "fault_codes",
        title: "Carrier 48 Series Fault / Alert Codes",
        url: "https://www.carrier.com/commercial/en/us/literature/",
        status: "official",
        notes: "Fault codes are documented in the Installation and Service manuals. Search the Carrier Literature Library for your specific 48-series model.",
        addedAt: "2024-01-01",
      },
      {
        id: "carrier-parts-select",
        type: "parts_guide",
        title: "Carrier Parts Select",
        url: "https://www.carrier.com/commercial/en/us/parts/",
        status: "official",
        notes: "Official Carrier parts portal. Enter your model and serial number to find replacement parts.",
        addedAt: "2024-01-01",
      },
    ],
  },

  // ── Carrier 50xx — Packaged Heat Pump Rooftop ────────────────────────────
  {
    id: "carrier-50-heat-pump",
    manufacturer: "Carrier",
    series: "50 Series Packaged Heat Pump Rooftop",
    description: "Carrier commercial packaged heat pump rooftop units. Includes 50XC, 50XP, 50TF, 50TQ, 50TFQ, and related sub-series.",
    modelPrefixes: ["50XC", "50XP", "50TF", "50TQ", "50HQ", "50"],
    coversModels: "50XC series, 50TFQ series…",
    resources: [
      {
        id: "carrier-50-literature",
        type: "documentation_portal",
        title: "Carrier Literature Library — 50 Series",
        url: "https://www.carrier.com/commercial/en/us/literature/",
        status: "official",
        notes: "Search by model number prefix (e.g. '50XC') for IOM manuals, wiring, and startup guides.",
        addedAt: "2024-01-01",
      },
      {
        id: "carrier-50-heat-pump-tech-support",
        type: "documentation_portal",
        title: "Carrier Commercial Technical Support",
        url: "https://www.carrier.com/commercial/en/us/technical-support/",
        status: "official",
        notes: "Service bulletins and field support resources for Carrier heat pump rooftops.",
        addedAt: "2024-01-01",
      },
      {
        id: "carrier-50-parts",
        type: "parts_guide",
        title: "Carrier Parts Select",
        url: "https://www.carrier.com/commercial/en/us/parts/",
        status: "official",
        notes: "Enter model and serial for replacement parts.",
        addedAt: "2024-01-01",
      },
    ],
  },

  // ── Trane YSC / YHC — Commercial Packaged Rooftop ───────────────────────
  {
    id: "trane-ysc-yhc",
    manufacturer: "Trane",
    series: "YSC / YHC Commercial Packaged Rooftop",
    description: "Trane commercial packaged rooftop units. YSC = single-zone cooling/gas heat, YHC = high-efficiency, YCD = cooling & dedicated outdoor air. Covers 3–50 ton range.",
    modelPrefixes: ["YSCE", "YSCH", "YSHC", "YSC", "YHC", "YCD", "YCH"],
    coversModels: "YSC060, YSC090, YHC060, YCD series…",
    resources: [
      {
        id: "trane-lit-portal",
        type: "documentation_portal",
        title: "Trane Bookstore — Literature & Manuals",
        url: "https://www.trane.com/commercial/north-america/us/en/",
        status: "official",
        notes: "Navigate to the Products section and select your model for IOM manuals, engineering data, and technical publications.",
        addedAt: "2024-01-01",
      },
      {
        id: "trane-ysc-iom",
        type: "installation_manual",
        title: "Trane YSC / YHC Installation, Operation & Maintenance",
        url: "https://www.trane.com/content/dam/Trane/us/productsystems/",
        status: "unverified",
        docNumber: "IOM-YSC / UM-YSC-1 (search Trane bookstore for current revision)",
        notes: "Trane publishes IOM manuals on their website. URL structure may change — search the Trane Bookstore for the most current version.",
        addedAt: "2024-01-01",
      },
      {
        id: "trane-parts-portal",
        type: "parts_guide",
        title: "Trane Parts & Supplies",
        url: "https://www.trane.com/commercial/north-america/us/en/parts-and-supplies/",
        status: "official",
        notes: "Trane official parts portal. Search by model or part number.",
        addedAt: "2024-01-01",
      },
      {
        id: "trane-tech-resources",
        type: "documentation_portal",
        title: "Trane Technician Resources",
        url: "https://www.trane.com/commercial/north-america/us/en/",
        status: "official",
        notes: "Trane provides service bulletin archives, diagnostic tools, and field reference guides through their commercial portal.",
        addedAt: "2024-01-01",
      },
      {
        id: "trane-ysc-fault-codes",
        type: "fault_codes",
        title: "Trane YSC / YHC Fault Codes & Diagnostics",
        url: "https://www.trane.com/commercial/north-america/us/en/",
        status: "official",
        notes: "Fault and alert codes are documented in the Service Factory Training and IOM. The Trane technician portal contains diagnostic decision trees by model.",
        addedAt: "2024-01-01",
      },
    ],
  },

  // ── York ZJ / ZF / ZH — Predator Packaged Rooftop ───────────────────────
  {
    id: "york-predator-sunline",
    manufacturer: "York",
    series: "York Predator / Sunline ZJ / ZF / ZH Packaged Rooftop",
    description: "Johnson Controls / York commercial packaged rooftop units. ZJ = gas/electric, ZF = cooling only, ZH = heat pump. Also covers related Sunline and Sunline Commercial series.",
    modelPrefixes: ["ZJDN", "ZJDU", "ZFDN", "ZFDU", "ZHDN", "ZHDU", "ZXDN", "ZJ", "ZF", "ZH", "ZT", "ZW"],
    coversModels: "ZJ048, ZJ060, ZJ072, ZF036, ZH048…",
    resources: [
      {
        id: "york-hvacpartners",
        type: "documentation_portal",
        title: "Johnson Controls / York HVAC Partners Portal",
        url: "https://hvacpartners.com/",
        status: "official",
        notes: "Johnson Controls' official contractor portal for York, Luxaire, and Champion brands. Account required for full document access. Contains IOM, service, wiring, and parts docs.",
        addedAt: "2024-01-01",
      },
      {
        id: "york-jci-product",
        type: "product_page",
        title: "Johnson Controls / York Rooftop Systems",
        url: "https://www.johnsoncontrols.com/hvac/rooftop-systems",
        status: "official",
        notes: "Product overview and specification sheets for York packaged rooftop units.",
        addedAt: "2024-01-01",
      },
      {
        id: "york-parts-portal",
        type: "parts_guide",
        title: "York / JCI Parts — HVAC Partners",
        url: "https://hvacpartners.com/",
        status: "official",
        notes: "Log in to the HVAC Partners portal to access parts catalogs, cross-references, and order history.",
        addedAt: "2024-01-01",
      },
      {
        id: "york-predator-fault-codes",
        type: "fault_codes",
        title: "York Predator / Sunline Fault Codes",
        url: "https://hvacpartners.com/",
        status: "official",
        notes: "Fault codes and LED flash sequences documented in the YZ IOM and Service Manual available via HVAC Partners portal.",
        addedAt: "2024-01-01",
      },
      {
        id: "york-zj-startup",
        type: "startup_checklist",
        title: "York Predator Startup Checklist",
        url: "https://hvacpartners.com/",
        status: "unverified",
        notes: "Startup / commissioning checklist is included in the York IOM. HVAC Partners portal has the current revision.",
        addedAt: "2024-01-01",
      },
    ],
  },

];

// ─── Model-family matching ────────────────────────────────────────────────────

export type MatchType = "prefix" | "manufacturer" | "none";

export interface FamilyMatch {
  family: ModelFamily;
  matchType: MatchType;
  matchedPrefix: string | null;
}

/**
 * Matches a model number (and optionally manufacturer name) to the best
 * model family in the registry. Returns null when no family matches.
 *
 * Priority:
 *   1. Exact model prefix match (most specific prefix wins).
 *   2. Manufacturer name match (returns first family for that manufacturer).
 *   3. No match → null.
 */
export function matchModelFamily(
  model: string | null | undefined,
  manufacturer: string | null | undefined,
): FamilyMatch | null {
  const m = (model ?? "").toUpperCase().trim();
  const mfg = (manufacturer ?? "").toUpperCase().trim();

  if (m) {
    // Sort each family's prefixes longest-first so the most-specific prefix wins.
    for (const family of MODEL_FAMILIES) {
      const sorted = [...family.modelPrefixes].sort((a, b) => b.length - a.length);
      for (const prefix of sorted) {
        if (m.startsWith(prefix.toUpperCase())) {
          return { family, matchType: "prefix", matchedPrefix: prefix };
        }
      }
    }
  }

  // Fall back: manufacturer name match
  if (mfg) {
    for (const family of MODEL_FAMILIES) {
      const famMfg = family.manufacturer.toUpperCase();
      if (mfg.includes(famMfg) || famMfg.includes(mfg)) {
        return { family, matchType: "manufacturer", matchedPrefix: null };
      }
    }
  }

  return null;
}
