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
  // Electrical and controls
  "Relay", "Thermostat", "Economizer Controller",
  "VFD", "ECM", "PSC", "Phase Monitor",
  "Control Board", "Defrost Timer", "Sequencer",
  "Transformer", "Fuse Block", "Disconnect",
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
  // Expansion valve mishearings
  { speech: "TVX",              correction: "TXV" },
  { speech: "XV valve",         correction: "TXV" },
  { speech: "TX valve",         correction: "TXV" },
  // Filter component
  { speech: "filter dryer",     correction: "filter drier" },
  { speech: "filter driver",    correction: "filter drier" },
  // Common field phrase mishearings
  { speech: "Richard system",   correction: "recharged system" },
  { speech: "Richard the system", correction: "recharged the system" },
  { speech: "seen pressures",   correction: "checked system pressures" },
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
  // Refrigerant name normalization
  { speech: "R22",              correction: "R-22" },
  { speech: "R 22",             correction: "R-22" },
  { speech: "R410",             correction: "R-410A" },
  { speech: "R410A",            correction: "R-410A" },
  { speech: "R454",             correction: "R-454B" },
  { speech: "freon",            correction: "refrigerant (or specific type if mentioned in context)" },
  // Duplicate word suppression examples
  { speech: "pressure pressure", correction: "pressure" },
  { speech: "system system",     correction: "system" },
  { speech: "unit unit",         correction: "unit" },
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
