/**
 * HVAC Voice Intelligence Dictionary
 *
 * Provides domain vocabulary and known speech-recognition corrections
 * to the AI voice interpretation pipeline. Keeping this in a dedicated
 * module makes it easy to expand the dictionary as the product grows.
 */

// ─── Correct HVAC vocabulary ──────────────────────────────────────────────────

export const HVAC_TERMS: string[] = [
  // Equipment types
  "RTU", "AHU", "MAU", "MUA", "Split System", "Package Unit", "Heat Pump",
  "Exhaust Fan", "Grease Fan", "Fan Coil Unit", "FCU", "DOAS", "ERV", "HRV",
  "Chiller", "Cooling Tower", "Boiler", "Air Handler", "Rooftop Unit",
  // System components
  "Compressor", "Condenser", "Evaporator", "Economizer",
  "Filter Drier", "TXV", "EXV", "EEV", "Metering Device",
  "Contactor", "Capacitor", "Crankcase Heater",
  "Receiver", "Accumulator", "Sight Glass",
  "Liquid Line", "Suction Line", "Discharge Line",
  "Service Valve", "Ball Valve", "Schrader Valve",
  "Reversing Valve", "Defrost Board",
  "Float Switch", "Pressure Switch", "High Pressure Switch", "Low Pressure Switch",
  "Relief Valve", "Check Valve",
  // Fan and blower components
  "Condenser Fan Motor", "Condenser Fan Blade", "Condenser Fan",
  "Blower Wheel", "Blower Motor", "Blower Assembly", "Blower Housing",
  "Evaporator Fan Motor", "Indoor Fan Motor",
  "Hail Guard", "Hail Screen",
  // Heat section components
  "Heat Exchanger", "Primary Heat Exchanger", "Secondary Heat Exchanger",
  "Inducer Motor", "Combustion Blower", "Rollout Switch",
  "Flame Sensor", "Hot Surface Ignitor", "Ignitor", "Pilot Assembly",
  "Gas Valve", "Burner Assembly", "Pressure Manifold",
  // Electrical and controls
  "Relay", "Thermostat", "Economizer Controller",
  "VFD", "ECM", "ECM Motor", "PSC Motor", "PSC", "Phase Monitor",
  "Control Board", "Defrost Timer", "Sequencer",
  "Transformer", "Fuse Block", "Disconnect",
  "Compressor Contactor", "Fan Contactor",
  // Refrigerants
  "R-22", "R-410A", "R-454B", "R-32", "R-407C", "R-134a",
  "R-404A", "R-448A", "R-449A",
  // Instruments and tools
  "Manifold Gauges", "Micron Gauge", "Clamp Meter",
  "Recovery Machine", "Vacuum Pump", "Nitrogen",
  "Refrigerant Scale", "Leak Detector",
  // Measurements and parameters
  "Subcooling", "Superheat", "Static Pressure", "External Static Pressure",
  "Head Pressure", "Suction Pressure", "Discharge Pressure",
  "Temperature Split", "Delta T", "CFM", "RPM",
  "Amperage", "Voltage", "Ohms", "Megohms",
  "Wet Bulb", "Dry Bulb", "Dew Point",
  "MCA", "MOCP",
  // Procedures
  "Pressure Test", "Leak Search", "Evacuation", "Triple Evacuation",
  "Nitrogen Purge", "Recovery", "Recharge", "Brazing",
  "Flush", "Commissioning", "Startup",
  // Manufacturers
  "Carrier", "Lennox", "York", "Daikin", "AAON", "Trane",
  "Johnson Controls", "Honeywell", "Belimo", "Copeland",
  "Danfoss", "Sporlan", "Parker", "Emerson",
  "Liebert", "McQuay", "Climate Master",
];

// ─── Known speech-recognition → correct HVAC term ────────────────────────────
// Ordered most-specific (multi-word) to least-specific so the AI resolves
// compound phrases before single words.

export const SPEECH_CORRECTIONS: Array<{ speech: string; correction: string }> = [
  // ── Expansion valve mishearings ──────────────────────────────────────────────
  { speech: "TVX",              correction: "TXV" },
  { speech: "XV valve",         correction: "TXV" },
  { speech: "TX valve",         correction: "TXV" },
  { speech: "XV",               correction: "TXV" },
  // ── Contactor mishearings ────────────────────────────────────────────────────
  { speech: "contact her",      correction: "contactor" },
  { speech: "contact tour",     correction: "contactor" },
  { speech: "contact or",       correction: "contactor" },
  { speech: "contactor",        correction: "contactor" },  // preserve
  { speech: "compressor contactor", correction: "compressor contactor" }, // preserve
  // ── Filter component ─────────────────────────────────────────────────────────
  { speech: "filter dryer",     correction: "filter drier" },
  { speech: "filter driver",    correction: "filter drier" },
  // ── RTU mishearings ──────────────────────────────────────────────────────────
  { speech: "R2 unit",          correction: "RTU" },
  { speech: "RTO unit",         correction: "RTU" },
  { speech: "RTO",              correction: "RTU" },
  { speech: "R-T-U",            correction: "RTU" },
  // ── Blower and fan mishearings ───────────────────────────────────────────────
  { speech: "blower will",      correction: "blower wheel" },
  { speech: "blower hill",      correction: "blower wheel" },
  { speech: "blower wheel",     correction: "blower wheel" }, // preserve
  { speech: "condenser fan",    correction: "condenser fan" }, // preserve
  { speech: "hail guard",       correction: "hail guard" },   // preserve
  // ── Heat exchanger ───────────────────────────────────────────────────────────
  { speech: "heat exchanger",   correction: "heat exchanger" }, // preserve
  // ── ECM motor mishearings ────────────────────────────────────────────────────
  { speech: "EEM motor",        correction: "ECM motor" },
  { speech: "EEM",              correction: "ECM" },
  { speech: "EZM",              correction: "ECM" },
  { speech: "E-C-M",            correction: "ECM" },
  // ── Economizer mishearings ───────────────────────────────────────────────────
  { speech: "equalizer",        correction: "economizer" },
  { speech: "economizer",       correction: "economizer" }, // preserve
  // ── VFD ──────────────────────────────────────────────────────────────────────
  { speech: "VFD",              correction: "VFD" },         // preserve
  { speech: "variable frequency drive", correction: "VFD" },
  // ── Pressure mishearings ─────────────────────────────────────────────────────
  { speech: "scene pressure",   correction: "suction pressure" },
  { speech: "seen pressure",    correction: "suction pressure" },
  { speech: "scene pressures",  correction: "suction pressure" },
  { speech: "seen pressures",   correction: "system pressures" },
  { speech: "pressure pressure", correction: "pressure" },
  // Note: "head pressure" is a real HVAC synonym for discharge pressure — normalized below
  { speech: "head pressure",    correction: "discharge pressure (head pressure)" },
  // ── Common field phrase mishearings ──────────────────────────────────────────
  { speech: "Richard system",   correction: "recharged system" },
  { speech: "Richard the system", correction: "recharged the system" },
  { speech: "hooked gauges",    correction: "connected manifold gauges" },
  { speech: "hook gauges",      correction: "connected manifold gauges" },
  { speech: "ran gauges",       correction: "connected manifold gauges" },
  { speech: "put a vacuum",     correction: "pulled vacuum" },
  { speech: "running good",     correction: "operating normally" },
  { speech: "running great",    correction: "operating normally" },
  { speech: "compressor ain't starting", correction: "compressor failed to start" },
  { speech: "ain't coming on",  correction: "failed to energize" },
  { speech: "condenser dirty",  correction: "condenser coil fouled" },
  { speech: "heat bum",         correction: "heat pump" },
  { speech: "split stem",       correction: "split system" },
  { speech: "system system",    correction: "system" },
  { speech: "unit unit",        correction: "unit" },
  // ── Refrigerant name normalization ───────────────────────────────────────────
  // Full normalizations — most specific first
  { speech: "R410A",            correction: "R-410A" },
  { speech: "R 410A",           correction: "R-410A" },
  { speech: "R410",             correction: "R-410A" },
  { speech: "410A",             correction: "R-410A" },
  { speech: "410",              correction: "R-410A" },
  { speech: "R407C",            correction: "R-407C" },
  { speech: "R-407",            correction: "R-407C" },
  { speech: "407C",             correction: "R-407C" },
  { speech: "407",              correction: "R-407C" },
  { speech: "R22",              correction: "R-22" },
  { speech: "R 22",             correction: "R-22" },
  { speech: "22 refrigerant",   correction: "R-22" },
  { speech: "22",               correction: "R-22" }, // only when clearly a refrigerant reference
  { speech: "R454B",            correction: "R-454B" },
  { speech: "R 454",            correction: "R-454B" },
  { speech: "454B",             correction: "R-454B" },
  { speech: "R32",              correction: "R-32" },
  { speech: "freon",            correction: "refrigerant" },
  { speech: "Freon",            correction: "refrigerant" },
];

// ─── Prompt fragment ──────────────────────────────────────────────────────────
// Compact string ready to embed directly into the AI system prompt.

export function buildHvacDictionaryPrompt(): string {
  const terms = HVAC_TERMS.join(", ");

  const corrections = SPEECH_CORRECTIONS.map(
    (c) => `  "${c.speech}" → "${c.correction}"`,
  ).join("\n");

  return `HVAC VOCABULARY (always prefer these exact spellings and capitalisations):
${terms}

KNOWN SPEECH RECOGNITION CORRECTIONS (apply when surrounding context confirms the HVAC interpretation):
${corrections}`;
}
