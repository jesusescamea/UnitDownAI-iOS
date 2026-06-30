// ─── HVAC Maintenance Parts Lookup ────────────────────────────────────────────
// Provides filter and belt size lookups based on manufacturer + model number.
//
// Rules:
//   - NEVER derive belt/filter sizes from tonnage alone.
//   - Only return high/medium confidence when there is documented basis.
//   - Uncertain matches return verify_required.
//   - OEM part numbers are only populated when known with certainty.
//
// Matching algorithm:
//   1. Normalize manufacturer (lowercase) and model (uppercase, stripped).
//   2. Walk the MATCHERS array in order — first match wins.
//   3. Fall back to manufacturer-level generic guidance.
//   4. If still no match: verify_required with null specs.

export interface PartsLookupResult {
  filterSize:    string | null;
  filterQty:     string | null;
  beltSize:      string | null;
  beltQty:       string | null;
  beltType:      string | null;
  beltNotes:     string | null;
  oemFilterPart: string | null;
  oemBeltPart:   string | null;
  confidence:    "high" | "medium" | "verify_required";
  source:        string | null;
  notes:         string | null;
}

interface Matcher {
  mfgRe:    RegExp;   // match against lowercase manufacturer
  modelRe:  RegExp;   // match against uppercase stripped model
  result:   Omit<PartsLookupResult, never>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normMfg(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}
function normModel(s: string | null | undefined): string {
  return (s ?? "").toUpperCase().replace(/[\s\-\.]/g, "");
}

// ─── Matcher table ────────────────────────────────────────────────────────────
// Ordered: more specific patterns first.

const MATCHERS: Matcher[] = [

  // ── Lennox LGH / LCH / LCA (Packaged Rooftop Units) ──────────────────────
  // Model structure: LGH[cap][volt][phase][options]
  // Cap codes: 036=3T, 042=3.5T, 048=4T, 060=5T, 072=6T, 090=7.5T, 120=10T

  {
    mfgRe:   /lennox/,
    modelRe: /^L[GC][HCA]036/,
    result: {
      filterSize: "16x25x2", filterQty: "2",
      beltSize: null, beltQty: null, beltType: "V-belt (B-section)",
      beltNotes: "Belt size varies by blower option — verify against unit service label or IOM",
      oemFilterPart: null, oemBeltPart: null,
      confidence: "medium",
      source: "Lennox IOM — LGH/LCH 036 Series",
      notes: "3-ton single cabinet. Confirm filter quantity matches actual filter rack configuration.",
    },
  },
  {
    mfgRe:   /lennox/,
    modelRe: /^L[GC][HCA]042/,
    result: {
      filterSize: "16x25x2", filterQty: "2",
      beltSize: null, beltQty: null, beltType: "V-belt (B-section)",
      beltNotes: "Belt size varies by blower option — verify against unit service label or IOM",
      oemFilterPart: null, oemBeltPart: null,
      confidence: "medium",
      source: "Lennox IOM — LGH/LCH 042 Series",
      notes: "3.5-ton unit. Confirm filter quantity — some cabinets use 4 filters.",
    },
  },
  {
    mfgRe:   /lennox/,
    modelRe: /^L[GC][HCA]048/,
    result: {
      filterSize: "20x25x2", filterQty: "2",
      beltSize: null, beltQty: null, beltType: "V-belt (B-section)",
      beltNotes: "Belt size varies by blower option — check service sticker inside access panel",
      oemFilterPart: null, oemBeltPart: null,
      confidence: "medium",
      source: "Lennox IOM — LGH/LCH 048 Series",
      notes: "4-ton unit.",
    },
  },
  {
    mfgRe:   /lennox/,
    modelRe: /^L[GC][HCA]060/,
    result: {
      filterSize: "20x25x2", filterQty: "4",
      beltSize: null, beltQty: null, beltType: "V-belt (B-section)",
      beltNotes: "5-ton blower drive belt size depends on selected blower option — verify with IOM or service label",
      oemFilterPart: null, oemBeltPart: null,
      confidence: "medium",
      source: "Lennox IOM — LGH/LCH 060 Series",
      notes: "5-ton unit. Dual filter banks — 4 filters total in standard configuration.",
    },
  },
  {
    mfgRe:   /lennox/,
    modelRe: /^L[GC][HCA]072/,
    result: {
      filterSize: "20x25x2", filterQty: "4",
      beltSize: null, beltQty: null, beltType: "V-belt (B-section)",
      beltNotes: "6-ton — verify belt size with IOM or unit service sticker",
      oemFilterPart: null, oemBeltPart: null,
      confidence: "medium",
      source: "Lennox IOM — LGH/LCH 072 Series",
      notes: "6-ton unit.",
    },
  },
  {
    mfgRe:   /lennox/,
    modelRe: /^L[GC][HCA]090/,
    result: {
      filterSize: "20x25x2", filterQty: "6",
      beltSize: null, beltQty: null, beltType: "V-belt (B-section)",
      beltNotes: "7.5-ton — verify belt size with IOM. May use dual-belt drive on larger blower options.",
      oemFilterPart: null, oemBeltPart: null,
      confidence: "medium",
      source: "Lennox IOM — LGH/LCH 090 Series",
      notes: "7.5-ton unit. Confirm filter rack layout — larger cabinets may have 2-bank filter array.",
    },
  },
  {
    mfgRe:   /lennox/,
    modelRe: /^L[GC][HCA]120/,
    result: {
      filterSize: "20x25x2", filterQty: "8",
      beltSize: null, beltQty: null, beltType: "V-belt (B-section)",
      beltNotes: "10-ton — verify belt size with IOM. Typically uses dual-belt blower drive.",
      oemFilterPart: null, oemBeltPart: null,
      confidence: "medium",
      source: "Lennox IOM — LGH/LCH 120 Series",
      notes: "10-ton unit.",
    },
  },

  // Lennox generic (other LGH/LCH/LCA variants not matched above)
  {
    mfgRe:   /lennox/,
    modelRe: /^L[GC][HCA]/,
    result: {
      filterSize: "20x25x2", filterQty: null,
      beltSize: null, beltQty: null, beltType: "V-belt (B-section)",
      beltNotes: "Verify filter quantity and belt size against unit IOM or service label inside access panel",
      oemFilterPart: null, oemBeltPart: null,
      confidence: "verify_required",
      source: "Lennox Packaged RTU family",
      notes: "Lennox packaged RTU — exact filter count and belt size not confirmed for this model suffix. Verify before ordering.",
    },
  },

  // ── Carrier 48 Series (Packaged Gas/Electric) ─────────────────────────────
  // 48LC = small commercial (1.5–5T); 48TF = 5–12.5T; 48XL/48HJ etc.
  // Filter: depends on cabinet height / tonnage code embedded in model

  {
    mfgRe:   /carrier|carlyle/,
    modelRe: /^48[A-Z]{2}0(17|21|24)/,   // ~1.5–2T
    result: {
      filterSize: "16x20x1", filterQty: "1",
      beltSize: null, beltQty: null, beltType: "V-belt",
      beltNotes: "Verify belt size — check inside unit service label or Carrier 48-series IOM",
      oemFilterPart: null, oemBeltPart: null,
      confidence: "medium",
      source: "Carrier 48-Series IOM",
      notes: "Small-frame Carrier packaged unit. Single throwaway filter typical.",
    },
  },
  {
    mfgRe:   /carrier|carlyle/,
    modelRe: /^48[A-Z]{2}0(30|36|42)/,   // 2.5–3.5T
    result: {
      filterSize: "20x20x2", filterQty: "2",
      beltSize: null, beltQty: null, beltType: "V-belt (B-section)",
      beltNotes: "Verify belt size — check unit service sticker or Carrier IOM for this model",
      oemFilterPart: null, oemBeltPart: null,
      confidence: "medium",
      source: "Carrier 48-Series IOM",
      notes: "Mid-frame Carrier packaged unit.",
    },
  },
  {
    mfgRe:   /carrier|carlyle/,
    modelRe: /^48[A-Z]{2}0(48|60)/,      // 4–5T
    result: {
      filterSize: "20x25x2", filterQty: "2",
      beltSize: null, beltQty: null, beltType: "V-belt (B-section)",
      beltNotes: "Verify belt size — check unit service sticker or Carrier IOM for this model",
      oemFilterPart: null, oemBeltPart: null,
      confidence: "medium",
      source: "Carrier 48-Series IOM",
      notes: "4–5-ton Carrier packaged unit.",
    },
  },
  {
    mfgRe:   /carrier|carlyle/,
    modelRe: /^48[A-Z]{2}(072|090|102|120)/,  // 6–10T larger
    result: {
      filterSize: "20x25x2", filterQty: "4",
      beltSize: null, beltQty: null, beltType: "V-belt (B-section)",
      beltNotes: "Larger tonnage — verify filter count (may be 4–8) and belt size with IOM",
      oemFilterPart: null, oemBeltPart: null,
      confidence: "verify_required",
      source: "Carrier 48-Series IOM",
      notes: "Large-frame Carrier packaged unit. Verify exact filter quantity before ordering.",
    },
  },
  // Carrier 50 series (heat pump packaged)
  {
    mfgRe:   /carrier|carlyle/,
    modelRe: /^50[A-Z]{2}/,
    result: {
      filterSize: "20x25x2", filterQty: null,
      beltSize: null, beltQty: null, beltType: "V-belt (B-section)",
      beltNotes: "Verify filter qty and belt size with IOM — varies by cabinet size",
      oemFilterPart: null, oemBeltPart: null,
      confidence: "verify_required",
      source: "Carrier 50-Series IOM",
      notes: "Carrier packaged heat pump. Filter count and belt size depend on cabinet configuration.",
    },
  },

  // ── York / Luxaire / Comet (ZF/ZB/ZH Packaged RTU) ───────────────────────
  {
    mfgRe:   /york|luxaire|comet/,
    modelRe: /^ZF[A-Z]\d{2}N?N?[0-9](024|030|036)/,
    result: {
      filterSize: "16x25x2", filterQty: "2",
      beltSize: null, beltQty: null, beltType: "V-belt (B-section)",
      beltNotes: "Verify belt size with York/Johnson Controls IOM for ZF series",
      oemFilterPart: null, oemBeltPart: null,
      confidence: "medium",
      source: "York ZF-Series IOM",
      notes: "York packaged RTU, 2–3 ton range.",
    },
  },
  {
    mfgRe:   /york|luxaire|comet/,
    modelRe: /^ZF[A-Z]\d{2}N?N?[0-9](048|060)/,
    result: {
      filterSize: "20x25x2", filterQty: "2",
      beltSize: null, beltQty: null, beltType: "V-belt (B-section)",
      beltNotes: "Verify belt size with York/Johnson Controls IOM for ZF series",
      oemFilterPart: null, oemBeltPart: null,
      confidence: "medium",
      source: "York ZF-Series IOM",
      notes: "York packaged RTU, 4–5 ton range.",
    },
  },
  {
    mfgRe:   /york|luxaire|comet/,
    modelRe: /^Z[FBH]/,
    result: {
      filterSize: null, filterQty: null,
      beltSize: null, beltQty: null, beltType: "V-belt (B-section)",
      beltNotes: "Verify filter size, qty, and belt size against York IOM or unit service label",
      oemFilterPart: null, oemBeltPart: null,
      confidence: "verify_required",
      source: "York Packaged RTU family",
      notes: "York packaged unit — verify filter and belt specs before ordering.",
    },
  },

  // ── Trane YCD / WCD / WCC (Packaged Gas Heat / Heat Pump RTU) ─────────────
  {
    mfgRe:   /trane|american.?standard/,
    modelRe: /^(YCD|WCD|WCC)[0-9]{3}/,
    result: {
      filterSize: "20x25x2", filterQty: null,
      beltSize: null, beltQty: null, beltType: "V-belt (B-section)",
      beltNotes: "Filter qty and belt size depend on cabinet size — refer to Trane installation manual",
      oemFilterPart: null, oemBeltPart: null,
      confidence: "verify_required",
      source: "Trane YCD/WCD/WCC IOM",
      notes: "Trane packaged rooftop unit. Verify filter count (typically 2–8 depending on tonnage) and belt size from unit nameplate/IOM.",
    },
  },

  // ── Rheem / Ruud RLNL / RKRL / RKNL (Packaged Gas/Electric RTU) ──────────
  {
    mfgRe:   /rheem|ruud/,
    modelRe: /^R[KL]N[A-Z]L?(024|030|036)/,
    result: {
      filterSize: "16x25x2", filterQty: "2",
      beltSize: null, beltQty: null, beltType: "V-belt (B-section)",
      beltNotes: "Verify belt size — check Rheem/Ruud IOM or unit service sticker",
      oemFilterPart: null, oemBeltPart: null,
      confidence: "medium",
      source: "Rheem/Ruud IOM — Commercial Packaged",
      notes: "2–3 ton Rheem/Ruud packaged unit.",
    },
  },
  {
    mfgRe:   /rheem|ruud/,
    modelRe: /^R[KL]N[A-Z]L?(048|060)/,
    result: {
      filterSize: "20x25x2", filterQty: "2",
      beltSize: null, beltQty: null, beltType: "V-belt (B-section)",
      beltNotes: "Verify belt size — check Rheem/Ruud IOM or unit service sticker",
      oemFilterPart: null, oemBeltPart: null,
      confidence: "medium",
      source: "Rheem/Ruud IOM — Commercial Packaged",
      notes: "4–5 ton Rheem/Ruud packaged unit.",
    },
  },
  {
    mfgRe:   /rheem|ruud/,
    modelRe: /^R[KL]/,
    result: {
      filterSize: null, filterQty: null,
      beltSize: null, beltQty: null, beltType: "V-belt (B-section)",
      beltNotes: "Verify filter size, qty, and belt size with Rheem/Ruud IOM",
      oemFilterPart: null, oemBeltPart: null,
      confidence: "verify_required",
      source: "Rheem/Ruud Packaged RTU family",
      notes: "Verify all specs before ordering.",
    },
  },

  // ── Goodman / Daikin / Amana (GPG / DPG / APG Packaged Gas RTU) ──────────
  {
    mfgRe:   /goodman|daikin|amana/,
    modelRe: /^[GDA]PG(14|15)[A-Z]\d(024|030|036)/,
    result: {
      filterSize: "16x25x2", filterQty: "2",
      beltSize: null, beltQty: null, beltType: "V-belt (B-section)",
      beltNotes: "Belt drive not standard on all Goodman/Daikin packaged units — verify if belt-driven blower is present",
      oemFilterPart: null, oemBeltPart: null,
      confidence: "medium",
      source: "Goodman/Daikin GPG/DPG IOM",
      notes: "2–3 ton packaged gas RTU. Some models use direct-drive blowers (no belt).",
    },
  },
  {
    mfgRe:   /goodman|daikin|amana/,
    modelRe: /^[GDA]PG(14|15)[A-Z]\d(048|060)/,
    result: {
      filterSize: "20x25x2", filterQty: "2",
      beltSize: null, beltQty: null, beltType: "V-belt (B-section)",
      beltNotes: "Belt drive not standard on all models — verify if belt-driven blower is present",
      oemFilterPart: null, oemBeltPart: null,
      confidence: "medium",
      source: "Goodman/Daikin GPG/DPG IOM",
      notes: "4–5 ton packaged gas RTU.",
    },
  },

  // ── AAON RN / RQ / RL (Custom Packaged RTU) ──────────────────────────────
  // AAON units are highly customized — filter and belt specs vary significantly
  {
    mfgRe:   /aaon/,
    modelRe: /^R[NQLS]/,
    result: {
      filterSize: null, filterQty: null,
      beltSize: null, beltQty: null, beltType: "V-belt or Cogged belt",
      beltNotes: "AAON units are customized at factory — filter and belt specs are unit-specific. Always verify against AAON submittal or unit label.",
      oemFilterPart: null, oemBeltPart: null,
      confidence: "verify_required",
      source: "AAON Engineering — Unit-Specific Submittals",
      notes: "AAON packaged units are built to order. Filter sizes, quantities, and belt sizes must be verified against the unit-specific submittal package or the maintenance label inside the unit.",
    },
  },

  // ── Split System Air Handler (generic AHU guidance) ───────────────────────
  {
    mfgRe:   /.*/,
    modelRe: /^(AHU|AH|CBX|FBX|FEM|FCU|MBR)/,
    result: {
      filterSize: null, filterQty: null,
      beltSize: null, beltQty: null, beltType: "V-belt (B or A section) or Direct Drive",
      beltNotes: "Measure existing belt or check unit service manual for belt cross-reference",
      oemFilterPart: null, oemBeltPart: null,
      confidence: "verify_required",
      source: null,
      notes: "Air handler — filter size and drive type (belt vs. direct) vary by unit. Measure existing filter or check filter rack label.",
    },
  },
];

// ─── Lookup function ──────────────────────────────────────────────────────────

export function lookupParts(
  manufacturer: string | null | undefined,
  modelNumber:  string | null | undefined,
): PartsLookupResult {
  const mfg   = normMfg(manufacturer);
  const model = normModel(modelNumber);

  for (const m of MATCHERS) {
    if (m.mfgRe.test(mfg) && m.modelRe.test(model)) {
      return m.result;
    }
  }

  // No match — return verify_required with no specs
  return {
    filterSize: null, filterQty: null,
    beltSize: null, beltQty: null, beltType: null,
    beltNotes: "No match found for this model — measure existing filter(s) and check unit service label for belt cross-reference",
    oemFilterPart: null, oemBeltPart: null,
    confidence: "verify_required",
    source: null,
    notes: manufacturer
      ? `No parts data on file for ${manufacturer}${modelNumber ? ' ' + modelNumber : ''}. Manually enter and confirm sizes to save to this unit's record.`
      : "Enter manufacturer and model number to search for maintenance parts data.",
  };
}
