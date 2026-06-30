import { Router, type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import { openai } from "@workspace/integrations-openai-ai-server";
import { lookupParts } from "../data/partsLookup.js";

const nameplateRouter = Router();

// ─── Multer upload middleware ─────────────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 }, // 4 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Unsupported file type. Please upload a JPEG, PNG, or WebP image."));
  },
});

function uploadMiddleware(req: Request, res: Response, next: NextFunction) {
  upload.single("file")(req, res, (err: any) => {
    if (!err) { next(); return; }
    const message =
      err?.code === "LIMIT_FILE_SIZE"
        ? "Image is too large. Please retake closer or use scan mode."
        : (err?.message ?? "Upload failed");
    res.status(400).json({ error: message });
  });
}

// ─── Vision extraction prompt ─────────────────────────────────────────────────
// Two-phase approach: (1) detect and crop the nameplate region, (2) extract fields.
const EXTRACT_PROMPT = `You are an HVAC equipment nameplate OCR specialist.

PHASE 1 — DETECT THE NAMEPLATE LABEL:
Identify the equipment data plate / nameplate label in this image.
The nameplate is a rectangular label (white, silver, or brushed metal) affixed to the HVAC unit body.
It contains dense text: MODEL, SERIAL, VOLTS, AMPS, BTU, refrigerant data, electrical ratings.
It is NOT the unit cabinet, conduit, wiring, ductwork, screws, shadows, or background.
Focus EXCLUSIVELY on the printed text within that rectangular label boundary.
Ignore everything outside the label perimeter.

PHASE 2 — TRANSCRIBE ALL NAMEPLATE TEXT:
Read every character visible on that label and output it verbatim in rawText.
Preserve spacing, slashes, dashes. Include all numbers, abbreviations, units.
This transcript is the primary source for all field extraction.

PHASE 3 — EXTRACT STRUCTURED FIELDS:
Map the rawText to the output fields using these label patterns:

  modelNumber       ← M/N  MODEL  MODEL NO  MODEL NUMBER  CATALOG NO  CATALOG NUMBER
  serialNumber      ← S/N  SERIAL  SERIAL NO  SERIAL NUMBER
  voltage           ← VOLTS  VOLTAGE  VOLT (include phase/hz suffix if on same line)
  phase             ← PH  PHASE  (digit 1 or 3)
  hertz             ← HZ  HERTZ  (usually 60)
  mca               ← MIN CKT AMPACITY  MIN. CKT. AMP  MCA  MIN CIRCUIT AMPS
  mocp              ← MAX FUSE OR CKT BKR  MAX OVERCURRENT  MOCP  MOP  MAX BREAKER  MAX FUSE
  rla               ← COMP RLA  COMPRESSOR RLA  RLA  FLA  (compressor amps, not fan motor)
  lra               ← LRA  LOCKED ROTOR AMPS
  refrigerantType   ← REFRIGERANT  CONTAINS  (the designation: R-410A, R-22, etc.)
  refrigerantCharge ← oz or lbs quantity next to refrigerant type
  coolingCapacity   ← COOLING BTUH  BTUH COOLING  COOLING OUTPUT  NET COOLING CAPACITY
  heatingCapacity   ← HEATING INPUT  HEATING OUTPUT  GAS INPUT  HEATING BTUH
  capacityTons      ← explicit tons rating, or derive by dividing coolingCapacity BTUH by 12000
  gasType           ← NAT GAS  NATURAL GAS  LP  PROPANE  L.P.
  manufacturer      ← brand name IF printed as text on the nameplate (LENNOX, CARRIER, etc.)
  equipmentType     ← as printed; also INFER using model prefix rules below
  systemType        ← as printed; also INFER using model + nameplate data rules below
  manufactureDate   ← any date code printed; also decode serial number format if recognizable

EQUIPMENT TYPE INFERENCE (add to reviewFields when inferred, not printed):
  - Lennox LGH / LCH / LGC / LGR / LCA prefix → "Packaged Rooftop Unit"
  - Carrier 48xx / 50xx prefix → "Packaged Rooftop Unit"
  - York YCD / YHC / ZFx / ZBx prefix → "Packaged Rooftop Unit"
  - Trane YCD / WCC / WCD prefix → "Packaged Rooftop Unit"
  - AAON RN / RQ / RL / CL prefix → "Packaged Rooftop Unit"
  - Text on label: ROOFTOP / RTU / PACKAGED UNIT / PACKAGE AIR → "Packaged Rooftop Unit"
  - Text on label: SPLIT SYSTEM → "Split System"
  - Text on label: HEAT PUMP → "Heat Pump"

SYSTEM TYPE INFERENCE (add to reviewFields when inferred, not printed):
  - Lennox LGH prefix (G = Gas) → "gas heat"
  - Lennox LCH prefix (C = Cooling only / elec heat) → "electric heat"
  - HEAT PUMP or HP visible in model/nameplate → "heat pump"
  - Heating BTU/input data present AND cooling data present → "gas heat"
  - Refrigerant/cooling data only, no heating → "cooling-only"

MANUFACTURE DATE DECODING (add to reviewFields when decoded, not printed):
  Many manufacturers encode date in the first 4 serial digits as WWYY or YYWW:
  - Try WW=first-2-digits, YY=next-2-digits: valid if WW is 01–52
  - If WW > 52, try YYWW reversed: YY=first-2, WW=next-2
  - Convert YY < 50 → 20YY; YY ≥ 50 → 19YY
  - Convert week number to approximate month (week ÷ 4.33, rounded up)
  - Example: serial "0613XXXXX" → WW=06, YY=2013 → "Feb 2013"

NO NAMEPLATE FOUND:
Return this ONLY if no nameplate label is visible anywhere in the image:
{"error":"No readable HVAC nameplate found","confidence":0,"missing_fields":[],"reviewFields":[],"rawText":""}

LOW CONFIDENCE / PARTIAL / GLARE:
If a nameplate IS visible but partly obscured or glare-affected:
- ALWAYS attempt extraction. Never return the error object when a nameplate is present.
- Populate every field you can read even if uncertain.
- Add uncertain field keys to reviewFields. Set confidence to your honest estimate (min 10).
- Return the full JSON structure.

HVAC TEXT NORMALIZATION (apply silently; add key to reviewFields if corrected):
- Voltage: "208 230" → "208/230"; "460 3 60" → "460/3/60"; "2081230" → "208/230"
- Refrigerant: "R41OA" / "R-41OA" / "R4l0A" / "R41OA" → "R-410A"
  "R22" → "R-22"; "R32" → "R-32"; "R134A" → "R-134A"; "R407C" → "R-407C"
- OCR letter/digit (field-context only):
  * voltage/mca/mocp/rla/lra: capital-O → 0 where a digit is expected
  * model/serial: lowercase-l or capital-I → 1 only when flanked by digits
  * refrigerantType: O → 0 to form a known refrigerant

Return ONLY valid JSON. No markdown fences, no prose, no explanation:
{
  "manufacturer": string|null,
  "modelNumber": string|null,
  "serialNumber": string|null,
  "equipmentType": string|null,
  "systemType": string|null,
  "voltage": string|null,
  "phase": string|null,
  "hertz": string|null,
  "mca": string|null,
  "mocp": string|null,
  "rla": string|null,
  "lra": string|null,
  "refrigerantType": string|null,
  "refrigerantCharge": string|null,
  "coolingCapacity": string|null,
  "heatingCapacity": string|null,
  "capacityTons": string|null,
  "gasType": string|null,
  "manufactureDate": string|null,
  "confidence": number,
  "missing_fields": string[],
  "reviewFields": string[],
  "rawText": string
}`;

// ─── Type aliases ─────────────────────────────────────────────────────────────
type FieldMap = Record<string, string | null | undefined>;

// ─── Server-side HVAC regex parser ───────────────────────────────────────────
// Parses rawText using HVAC-specific regex patterns.
// Acts as a supplement/fallback to the vision extraction.
function parseHvacText(raw: string): FieldMap {
  const result: FieldMap = {};
  if (!raw) return result;

  // ── Model Number ──────────────────────────────────────────────────────────
  // M/N, MODEL, MODEL NO, MODEL NUMBER, CATALOG NO
  const modelM = raw.match(
    /(?:^|\n|\s)(?:M\/N|MODEL\s*(?:NO\.?|NUMBER)?|CATALOG\s*(?:NO\.?|NUMBER)?)\s*[:\-]?\s*([A-Z][A-Z0-9\-]{3,24})/im
  );
  if (modelM) result.modelNumber = modelM[1].trim();

  // ── Serial Number ─────────────────────────────────────────────────────────
  const serialM = raw.match(
    /(?:^|\n|\s)(?:S\/N|SERIAL\s*(?:NO\.?|NUMBER)?)\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-]{5,19})/im
  );
  if (serialM) result.serialNumber = serialM[1].trim();

  // ── Voltage ───────────────────────────────────────────────────────────────
  const voltM = raw.match(/(?:VOLTS?|VOLTAGE)\s*[:\-]?\s*([\d\-\/]+(?:\/\d+)*)/i);
  if (voltM) {
    let v = voltM[1].trim().replace(/(\d+)\s+(\d+)/g, "$1/$2");
    result.voltage = v;
  }

  // ── Phase ─────────────────────────────────────────────────────────────────
  const phM = raw.match(/\bPH(?:ASE)?\s*[:\-]?\s*([13])\b/i);
  if (phM) result.phase = phM[1];

  // ── Hertz ─────────────────────────────────────────────────────────────────
  const hzM =
    raw.match(/\bHZ\s*[:\-]?\s*(60|50)\b/i) ||
    raw.match(/\b(60|50)\s*HZ\b/i);
  if (hzM) result.hertz = hzM[1];

  // ── MCA ───────────────────────────────────────────────────────────────────
  const mcaM = raw.match(
    /(?:MIN\.?\s*(?:CKT\.?\s*)?AMP(?:ACITY|S)?|MCA|MIN\s*CIRCUIT\s*AMPS?)\s*[:\-]?\s*([\d\.]+)/i
  );
  if (mcaM) result.mca = mcaM[1];

  // ── MOCP ──────────────────────────────────────────────────────────────────
  const mocpM = raw.match(
    /(?:MAX\.?\s*(?:FUSE\s*(?:OR\s*)?(?:CKT\.?\s*)?BKR?\.?|BREAKER|OVERCURRENT)|MOCP|MOP|MAX\s*FUSE)\s*[:\-]?\s*([\d\.]+)/i
  );
  if (mocpM) result.mocp = mocpM[1];

  // ── RLA / FLA ─────────────────────────────────────────────────────────────
  const rlaM = raw.match(/(?:COMP\.?\s*)?(?:RLA|FLA)\s*[:\-]?\s*([\d\.]+)/i);
  if (rlaM) result.rla = rlaM[1];

  // ── LRA ───────────────────────────────────────────────────────────────────
  const lraM = raw.match(/\bLRA\s*[:\-]?\s*([\d\.]+)/i);
  if (lraM) result.lra = lraM[1];

  // ── Refrigerant type ──────────────────────────────────────────────────────
  const refM =
    raw.match(/(?:CONTAINS?|REFRIGERANT)\s*[:\-]?\s*(R-?[\dA-Z]{2,6})/i) ||
    raw.match(/\b(R-?4[01][0OlI][A-Z]?)\b/i) ||
    raw.match(/\b(R-?22|R-?32|R-?134A?|R-?407C?|R-?404A?|R-?408A?)\b/i);
  if (refM) {
    let ref = refM[1].toUpperCase().trim();
    if (!ref.startsWith("R-")) ref = "R-" + ref.slice(1);
    // Common OCR substitutions
    ref = ref
      .replace(/R-41OA/i, "R-410A")
      .replace(/R-4l0A/i, "R-410A")
      .replace(/R-4I0A/i, "R-410A")
      .replace(/R-41(?:O|0)A/i, "R-410A");
    result.refrigerantType = ref;
  }

  // ── Refrigerant charge ────────────────────────────────────────────────────
  const chargeM = raw.match(
    /(?:CHARGE|CONTAINS?|REFRIGERANT)[^\n]{0,40}?([\d\.]+)\s*(OZ|LBS?)\b/i
  );
  if (chargeM) {
    result.refrigerantCharge = `${chargeM[1]} ${chargeM[2].toLowerCase()}`;
  }

  // ── Cooling capacity ──────────────────────────────────────────────────────
  const coolM =
    raw.match(
      /(?:COOL(?:ING)?\s*(?:BTUH?|CAPACITY|OUTPUT)|NET\s*COOL(?:ING)?)\s*[:\-]?\s*([\d,]+)/i
    ) || raw.match(/\b(\d{5,6})\s*BTUH?\b/i);
  if (coolM) {
    const btuh = parseInt(coolM[1].replace(/,/g, ""), 10);
    if (btuh >= 12_000 && btuh <= 600_000) {
      result.coolingCapacity = btuh.toLocaleString() + " BTUH";
      result.capacityTons = (btuh / 12_000).toFixed(1);
    }
  }

  // ── Heating capacity ──────────────────────────────────────────────────────
  const heatM = raw.match(
    /(?:HEAT(?:ING)?\s*(?:INPUT|OUTPUT|BTUH?|CAPACITY)|GAS\s*INPUT)\s*[:\-]?\s*([\d,]+)/i
  );
  if (heatM) {
    const btuh = parseInt(heatM[1].replace(/,/g, ""), 10);
    if (btuh >= 1_000 && btuh <= 2_000_000) {
      result.heatingCapacity = btuh.toLocaleString() + " BTUH";
    }
  }

  // ── Gas type ──────────────────────────────────────────────────────────────
  const gasM = raw.match(/\b(NAT(?:URAL)?\s*GAS|NATURAL\s*GAS|L\.?P\.?|PROPANE)\b/i);
  if (gasM) result.gasType = gasM[1].replace(/\s+/g, " ").trim();

  // ── Manufacturer (known brands) ───────────────────────────────────────────
  const mfgM = raw.match(
    /\b(LENNOX|CARRIER|TRANE|YORK|DAIKIN|RHEEM|RUUD|GOODMAN|AMANA|AMERICAN\s*STANDARD|MCQUAY|AAON|HEATCRAFT|CLIMATE\s*MASTER|REZNOR|NORTEK|WEIL[- ]MCLAIN)\b/i
  );
  if (mfgM) {
    result.manufacturer = mfgM[1]
      .trim()
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  }

  return result;
}

// ─── Equipment type inference ─────────────────────────────────────────────────
function inferEquipmentType(
  model: string | null,
  rawText: string
): { value: string; inferred: boolean } | null {
  const m = (model ?? "").toUpperCase();
  const t = rawText.toUpperCase();

  // Explicit text printed on nameplate — highest priority
  if (/\b(?:ROOFTOP|RTU|PACKAGED\s+(?:ROOF\s*TOP\s*)?UNIT|PACKAGE\s+(?:AIR|UNIT))\b/.test(t))
    return { value: "Packaged Rooftop Unit", inferred: false };
  if (/\bSPLIT[\s-]+SYSTEM\b/.test(t))
    return { value: "Split System Condensing Unit", inferred: false };
  if (/\bHEAT[\s-]+PUMP\b/.test(t))
    return { value: "Heat Pump", inferred: false };
  if (/\bCONDENSING\s+UNIT\b/.test(t))
    return { value: "Condensing Unit", inferred: false };
  if (/\bAIR\s+HANDLER\b/.test(t))
    return { value: "Air Handler", inferred: false };

  // Lennox rooftop model prefix: LGH / LCH / LGC / LGR / LCA
  if (/^LG[HCRA]|^LCH/.test(m)) return { value: "Packaged Rooftop Unit", inferred: true };
  // Carrier RTU: 48xx = gas/elec, 50xx = heat pump package
  if (/^4[89]\w/.test(m) || /^50[A-Z]/.test(m)) return { value: "Packaged Rooftop Unit", inferred: true };
  // Trane RTU
  if (/^YCD|^YHC|^YCH|^WCC|^WCD/.test(m)) return { value: "Packaged Rooftop Unit", inferred: true };
  // York RTU
  if (/^ZF[A-Z]|^ZB[A-Z]|^ZH[A-Z]/.test(m)) return { value: "Packaged Rooftop Unit", inferred: true };
  // AAON RTU
  if (/^RN|^RQ|^RL-|^RL\d|^CL-/.test(m)) return { value: "Packaged Rooftop Unit", inferred: true };

  return null;
}

// ─── System type inference ────────────────────────────────────────────────────
function inferSystemType(
  model: string | null,
  rawText: string
): { value: string; inferred: boolean } | null {
  const m = (model ?? "").toUpperCase();
  const t = rawText.toUpperCase();

  // Explicit text on nameplate — highest priority
  if (/\bHEAT\s*PUMP\b/.test(t)) return { value: "heat pump", inferred: false };
  if (/\bELECTRIC\s*HEAT\b/.test(t)) return { value: "electric heat", inferred: false };

  // Presence detectors
  const hasGas = /\b(?:GAS|BTU\s*INPUT|HEATING\s*INPUT|NAT\s*GAS|PROPANE|FURNACE)\b/.test(t);
  const hasCooling = /\b(?:COOL(?:ING)?|BTUH|REFRIGERANT|R-\d+|COMP(?:RESSOR)?)\b/.test(t);
  const hasHP = /\bREVERSING\s*VALVE\b|\bHP\b/.test(t);

  // Lennox model letter encoding:
  //   LGH = gas heat packaged; LCH = electric heat; LCA = cooling only
  if (/^LGH/.test(m)) return { value: "gas heat", inferred: true };
  if (/^LCH/.test(m)) return { value: "electric heat", inferred: true };
  if (/^LCA/.test(m)) return { value: "cooling-only", inferred: true };

  // Carrier: 48 = gas heat package, 50 = heat pump package
  if (/^48/.test(m)) return { value: "gas heat", inferred: true };
  if (/^50/.test(m)) return { value: "heat pump", inferred: true };

  if (hasHP) return { value: "heat pump", inferred: true };
  if (hasGas && hasCooling) return { value: "gas heat", inferred: true };
  if (hasGas && !hasCooling) return { value: "gas heat", inferred: true };
  if (hasCooling && !hasGas) return { value: "cooling-only", inferred: true };

  return null;
}

// ─── Carrier serial number year-letter table ──────────────────────────────────
// Carrier (and Bryant / Payne / ICP) encode manufacture year as the FIRST
// character of the serial number using an alphabetic table (skipping I, O, Q, U, Z).
// Format: [year-letter][2-digit week][sequence digits]
const CARRIER_YEAR_MAP: Record<string, number> = {
  A:2000, B:2001, C:2002, D:2003, E:2004, F:2005, G:2006, H:2007,
  J:2008, K:2009, L:2010, M:2011, N:2012, P:2013, R:2014, S:2015,
  T:2016, V:2017, W:2018, X:2019, Y:2020,
};

function decodeCarrierSerial(serial: string): string | null {
  const m = serial.match(/^([A-HJKLMNPRSTVWXY])(\d{2})/i);
  if (!m) return null;
  const year = CARRIER_YEAR_MAP[m[1].toUpperCase()];
  const week = parseInt(m[2], 10);
  if (!year || week < 1 || week > 52) return null;
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${MONTHS[Math.max(0, Math.min(11, Math.ceil(week / 4.34) - 1))]} ${year}`;
}

// ─── Goodman / Daikin / Amana serial number decade-letter table ───────────────
// Format: [decade-letter][year-digit][2-digit week][sequence]
// Decade: D=2000s, E=2010s, F=2020s
function decodeGoodmanSerial(serial: string): string | null {
  const m = serial.match(/^([DEF])(\d)(\d{2})/i);
  if (!m) return null;
  const decade  = { D: 2000, E: 2010, F: 2020 }[m[1].toUpperCase() as 'D'|'E'|'F'];
  if (!decade) return null;
  const year = decade + parseInt(m[2], 10);
  const week = parseInt(m[3], 10);
  if (week < 1 || week > 52) return null;
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${MONTHS[Math.max(0, Math.min(11, Math.ceil(week / 4.34) - 1))]} ${year}`;
}

// ─── Serial number → manufacture date decoder ─────────────────────────────────
// Attempts brand-specific formats first, then generic WWYY / YYWW patterns.
// Returns null when the pattern is ambiguous or yields an implausible date.
function decodeSerialDate(serial: string | null): string | null {
  if (!serial) return null;

  // Brand-specific decoders first — they are unambiguous when they match
  const carrierDate  = decodeCarrierSerial(serial);
  if (carrierDate)  return carrierDate;

  const goodmanDate  = decodeGoodmanSerial(serial);
  if (goodmanDate)  return goodmanDate;

  // Generic WWYY / YYWW decode (covers Lennox, Trane, York, Rheem, and most others)
  const digits = serial.replace(/\D/g, "").slice(0, 4);
  if (digits.length < 4) return null;

  const a = parseInt(digits.slice(0, 2), 10); // first pair
  const b = parseInt(digits.slice(2, 4), 10); // second pair

  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const weekToMonth = (ww: number) => MONTHS[Math.max(0, Math.min(11, Math.ceil(ww / 4.34) - 1))];
  const toYear = (yy: number) => yy + (yy < 50 ? 2000 : 1900);
  const plausibleYear = (y: number) => y >= 1990 && y <= 2040;

  // Try WWYY: a=week, b=year
  if (a >= 1 && a <= 52) {
    const year = toYear(b);
    if (plausibleYear(year)) return `${weekToMonth(a)} ${year}`;
  }
  // Try YYWW: a=year, b=week
  if (b >= 1 && b <= 52) {
    const year = toYear(a);
    if (plausibleYear(year)) return `${weekToMonth(b)} ${year}`;
  }

  return null;
}

// ─── Capacity tons from model number ──────────────────────────────────────────
// Most manufacturers encode nominal tonnage as a 3-digit segment inside the
// model number.  The segment must be flanked by a letter on at least one side.
// 018=1.5T, 024=2T, 030=2.5T, 036=3T, 042=3.5T, 048=4T, 060=5T,
// 072=6T, 090=7.5T, 102=8.5T, 120=10T
const TONS_MAP: Record<string, string> = {
  "018": "1.5", "024": "2.0", "030": "2.5", "036": "3.0", "042": "3.5",
  "048": "4.0", "060": "5.0", "072": "6.0", "090": "7.5", "102": "8.5",
  "120": "10.0",
};

function inferCapacityTonsFromModel(model: string | null): string | null {
  if (!model) return null;
  const m = model.toUpperCase().replace(/[\s\-]/g, "");
  for (const [code, tons] of Object.entries(TONS_MAP)) {
    // Code between letters: e.g. LGH060P4M → 060 flanked by H and P
    if (new RegExp(`[A-Z]${code}[A-Z]`).test(m)) return tons;
    // Code at end after a letter: e.g. XC2060 → 060 after 0 (digit), but try letter boundary
    if (new RegExp(`[A-Z]${code}$`).test(m)) return tons;
    // Code at start before a letter: e.g. 060T → occasionally used
    if (new RegExp(`^${code}[A-Z]`).test(m)) return tons;
  }
  return null;
}

// ─── Result merge ─────────────────────────────────────────────────────────────
// Vision result is the primary source. Server-side parser fills nulls.
// Inference rules handle equipment/system type and manufacture date.
function mergeExtractions(
  vision: Record<string, unknown>,
  parsed: FieldMap,
  rawText: string,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...vision };
  const review = new Set<string>((vision.reviewFields ?? []) as string[]);

  const STRING_FIELDS = [
    "manufacturer", "modelNumber", "serialNumber",
    "voltage", "phase", "hertz",
    "mca", "mocp", "rla", "lra",
    "refrigerantType", "refrigerantCharge",
    "coolingCapacity", "heatingCapacity", "capacityTons",
    "gasType", "manufactureDate",
  ];

  // Fill any null vision fields with server-side parser results
  for (const field of STRING_FIELDS) {
    const visionVal = out[field];
    const parsedVal = parsed[field];
    if (!visionVal && parsedVal) {
      out[field] = parsedVal;
      review.add(field);
    }
  }

  // ── Equipment type inference ──────────────────────────────────────────────
  if (!out.equipmentType) {
    const inf = inferEquipmentType(out.modelNumber as string | null, rawText);
    if (inf) {
      out.equipmentType = inf.value;
      if (inf.inferred) review.add("equipmentType");
    }
  }

  // ── System type inference ─────────────────────────────────────────────────
  if (!out.systemType) {
    const inf = inferSystemType(out.modelNumber as string | null, rawText);
    if (inf) {
      out.systemType = inf.value;
      if (inf.inferred) review.add("systemType");
    }
  }

  // ── Manufacture date from serial ──────────────────────────────────────────
  if (!out.manufactureDate && out.serialNumber) {
    const decoded = decodeSerialDate(out.serialNumber as string);
    if (decoded) {
      out.manufactureDate = decoded;
      review.add("manufactureDate");
    }
  }

  // ── Capacity tons from model number ───────────────────────────────────────
  // Fills the gap when the nameplate does not print tons explicitly but the
  // model number contains the standard 3-digit tonnage segment (036, 048, etc.)
  if (!out.capacityTons && out.modelNumber) {
    const inferredTons = inferCapacityTonsFromModel(out.modelNumber as string);
    if (inferredTons) {
      out.capacityTons = inferredTons;
      review.add("capacityTons");
    }
  }

  // ── Voltage normalization ─────────────────────────────────────────────────
  if (typeof out.voltage === "string") {
    const norm = out.voltage
      .replace(/[Oo]/g, "0")              // O → 0
      .replace(/(\d)\s+(\d)/g, "$1/$2");  // "460 3" → "460/3"
    if (norm !== out.voltage) {
      out.voltage = norm;
      review.add("voltage");
    }
  }

  // ── Refrigerant normalization ─────────────────────────────────────────────
  if (typeof out.refrigerantType === "string") {
    let ref = out.refrigerantType.toUpperCase().trim();
    if (/^R\d/.test(ref)) ref = "R-" + ref.slice(1); // ensure dash
    ref = ref
      .replace(/R-41OA/i, "R-410A")
      .replace(/R-4l0A/i, "R-410A")
      .replace(/R-4I0A/i, "R-410A");
    if (ref !== out.refrigerantType) {
      out.refrigerantType = ref;
      review.add("refrigerantType");
    }
  }

  // ── Recompute missing_fields from final merged state ──────────────────────
  const ALL_FIELDS = [
    "manufacturer", "modelNumber", "serialNumber", "equipmentType", "systemType",
    "voltage", "phase", "hertz", "mca", "mocp", "rla", "lra",
    "refrigerantType", "refrigerantCharge", "coolingCapacity", "heatingCapacity",
    "capacityTons", "gasType", "manufactureDate",
  ];
  out.missing_fields = ALL_FIELDS.filter((f) => !out[f]);
  out.reviewFields = Array.from(review).filter((f) => out[f]); // only keys that have values

  return out;
}

// ─── POST /api/nameplate/ocr ──────────────────────────────────────────────────
nameplateRouter.post(
  "/nameplate/ocr",
  uploadMiddleware,
  async (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ error: "No image file provided" });
      return;
    }

    const { buffer, mimetype, size } = req.file;
    req.log?.info({ mimeType: mimetype, sizeKB: Math.round(size / 1024) }, "Nameplate OCR request");

    const imageBase64 = buffer.toString("base64");
    const dataUrl = `data:${mimetype};base64,${imageBase64}`;

    try {
      // ── Pass 1: Vision API — extract rawText + structured fields ─────────
      const completion = await openai.chat.completions.create({
        model: "gpt-5.4",
        max_completion_tokens: 1600, // generous headroom for full schema + rawText
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: EXTRACT_PROMPT },
              { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
            ],
          },
        ],
      });

      const rawResponse = completion.choices[0]?.message?.content ?? "";
      req.log?.info({ rawLength: rawResponse.length }, "Nameplate vision response received");

      // ── Parse JSON from vision response ───────────────────────────────────
      let visionResult: Record<string, unknown> = {};
      try {
        const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) visionResult = JSON.parse(jsonMatch[0]);
      } catch {
        req.log?.warn("Nameplate OCR: failed to parse JSON from vision response");
      }

      // ── Check for hard "no nameplate" result ──────────────────────────────
      if (typeof visionResult.error === "string" && !visionResult.modelNumber) {
        res.json({ extracted: visionResult, rawResponse, debug: { phase: "no-nameplate" } });
        return;
      }

      const rawText = (visionResult.rawText as string) ?? "";

      // ── Pass 2: Server-side HVAC regex parser on rawText ──────────────────
      const parsedFields = parseHvacText(rawText);

      req.log?.info(
        { parsedKeys: Object.keys(parsedFields).filter((k) => parsedFields[k]) },
        "Server-side HVAC parser result",
      );

      // ── Merge vision + parser + inferences ────────────────────────────────
      const extracted = mergeExtractions(visionResult, parsedFields, rawText);

      // ── Debug payload (appended to response for testing) ──────────────────
      const debug = {
        visionFieldsFound: Object.keys(visionResult).filter(
          (k) => !["confidence","missing_fields","reviewFields","rawText"].includes(k) && visionResult[k]
        ),
        parserFieldsFound: Object.keys(parsedFields).filter((k) => parsedFields[k]),
        inferredFields: (extracted.reviewFields as string[]).filter(
          (f) => !Object.keys(parsedFields).includes(f) &&
                 !Object.keys(visionResult).filter((k) => visionResult[k]).includes(f)
        ),
        confidence: extracted.confidence,
        rawTextLength: rawText.length,
      };

      req.log?.info(
        {
          confidence: extracted.confidence,
          fieldsPopulated: (extracted.missing_fields as string[]).length
            ? 19 - (extracted.missing_fields as string[]).length
            : "all",
          reviewFields: extracted.reviewFields,
        },
        "Nameplate OCR complete",
      );

      res.json({ extracted, rawResponse, debug });
    } catch (err: any) {
      req.log?.error(err, "Nameplate OCR failed");
      res.status(500).json({ error: "OCR failed. You can enter nameplate fields manually." });
    }
  },
);

// ─── POST /api/nameplate/parts ────────────────────────────────────────────────
// Returns filter/belt size lookup for a given manufacturer + model number.
// Does NOT require authentication — lookup is entirely from static data.
// Body: { manufacturer?: string; modelNumber?: string }
nameplateRouter.post("/nameplate/parts", async (req: Request, res: Response) => {
  const { manufacturer, modelNumber } = req.body ?? {};
  const parts = lookupParts(
    typeof manufacturer === "string" ? manufacturer : null,
    typeof modelNumber  === "string" ? modelNumber  : null,
  );
  res.json({ parts });
});

export default nameplateRouter;
