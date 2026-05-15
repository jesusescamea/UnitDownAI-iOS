import { hvacKnowledgeBase, type KnowledgeBaseEntry, type PriorityLevel } from "../data/hvacKnowledgeBase.js";

export type { PriorityLevel };

export interface DiagnosisEntry {
  id: string;
  title: string;
  category: string;
  whyThisFits: string;
  likelyCauses: string[];
  firstChecks: string[];
  meterChecks: string[];
  priorityLevel: PriorityLevel;
  confidencePercent: number;
  recommendedAction: string;
  riskNote: string;
}

export interface DiagnosisResult {
  primary: DiagnosisEntry;
  alternatives: DiagnosisEntry[];
}

// ─── Scoring weights ──────────────────────────────────────────────────────────

const SCORE_BRAND = 30;
const SCORE_EQUIPMENT = 20;
const SCORE_FAILURE_STAGE = 15;
const SCORE_TRIGGER = 12;
const SCORE_CLUE = 6;

// Penalty applied when a per-entry negative trigger matches the input
const NEGATIVE_TRIGGER_PENALTY = 50;
// Penalty applied to heating-category entries when a refrigeration context is detected
const NEGATIVE_CONTEXT_PENALTY = 45;

// ─── Refrigeration / heating context detection ────────────────────────────────

// These terms signal that the user is describing a refrigerant-side measurement,
// NOT a heating fault (e.g. "superheat" must NOT route to "No Heat" entries).
const REFRIGERATION_CONTEXT_TERMS = [
  "superheat", "subcooling", "suction pressure", "head pressure", "liquid line",
  "txv", "metering device", "filter drier", "refrigerant charge", "saturation temp",
  "saturation temperature", "psig", "suction line", "discharge pressure",
  "flash gas", "floodback", "flooding back", "evaporator starved",
];

// If any of these terms is also present, the user IS talking about a heating fault
// and the refrigeration-context penalty for heating entries is suppressed.
const HEATING_OVERRIDE_TERMS = [
  "no heat", "furnace", "burner", "flame", "ignitor", "igniter", "gas valve",
  "inducer", "rollout", "heat mode", "heating mode", "no heat call",
  "heating", "electric heating", "testing heating", "heating on",
  "temperature rise", "temp rise", "rat", "dat",
  // Oil heat terms
  "oil heat", "oil burner", "oil furnace", "primary control", "cad cell",
  "nozzle", "puffback", "lockout", "oil boiler",
  // Electric heat terms
  "electric heat", "heat strip", "heat strips", "sequencer", "heating element",
  "aux heat", "emergency heat", "heat kit", "heat stage",
];

// Categories that receive the refrigeration-context penalty
const HEATING_CATEGORIES = new Set(["No Heat"]);

// ─── Compressor-running contradiction detection ────────────────────────────────
// When the user explicitly states the compressor is running / engaged / started,
// any fault whose primary mechanism requires the compressor to NOT be running
// (locked rotor, seized, hard-start no-start) is physically impossible as the
// primary result. A locked-rotor compressor stalls; it does not run.
//
// Exception: if the user also mentions cycling / overload / trips-off, the
// compressor may only appear to run briefly before thermal protection trips —
// in that case we suppress the contradiction penalty and let normal scoring win.

const COMPRESSOR_RUNNING_TERMS = [
  "compressor running", "compressor is running", "compressor runs",
  "compressor starts", "compressor kicks on", "compressor came on",
  "compressor operating", "running but no cooling", "running but not cooling",
  "runs but no cool", "runs but not cooling", "compressor engaged",
  "compressor stays on", "compressor spinning", "compressor turning",
  "compressor on but", "unit running but no cool", "unit running no cool",
  "running no cool", "running no cooling",
];

const COMPRESSOR_CYCLING_TERMS = [
  "cycles off", "short cycle", "cycles out", "trips off", "trips breaker",
  "shuts off", "kicks off", "cuts off", "overload", "thermal overload",
  "thermal trip", "intermittent", "sometimes runs",
];

// ─── Time-behavior detection ──────────────────────────────────────────────────
// A unit that trips AFTER running N minutes is a RUNTIME (thermal/overload)
// fault, not a startup fault. Locked rotor and seized compressor faults cause
// an IMMEDIATE trip — never a delayed trip after 10–20 minutes of operation.
// When these terms are present, penalize startup-stage no-start entries.
const RUNTIME_FAULT_TIMING_TERMS = [
  "after running", "after startup", "minutes after", "10 minutes", "15 minutes",
  "after a while", "runs for", "runs then", "trips after", "while running",
  "after warmup", "after warm up", "after being on", "minutes into",
  "after it runs", "after it starts", "after several minutes",
  "runs for a few", "after a few minutes", "few minutes later",
  "after some time", "after it warms up", "after 10", "after 15",
];

// Penalty applied to startup/no-start entries when runtime timing is detected.
const RUNTIME_TIMING_PENALTY = 45;

// ─── Capacitor-confirmed-good detection ──────────────────────────────────────
// When the user states the capacitor has been tested and is good, entries
// whose primary first fix is "replace the capacitor" become much less likely.
const CAPACITOR_TESTED_GOOD_TERMS = [
  "capacitor tests good", "cap tests good", "capacitor is good", "cap is good",
  "capacitor ok", "cap ok", "capacitor tested good", "capacitor checked",
  "new capacitor", "replaced the capacitor", "capacitor replaced",
  "capacitor good", "capacitor reads good", "cap reads good",
  "capacitor fine", "replaced cap", "cap is fine", "cap checks out",
];

// IDs penalized when capacitor is confirmed good.
// bearing-failure-motor is included because "capacitor reads good, won't start"
// describes an electrical/winding/voltage fault, not a bearing noise complaint.
const CAPACITOR_GOOD_PENALIZED_IDS = new Set([
  "compressor-locked-rotor",
  "capacitor-failure",
  "bearing-failure-motor",
  "blower-motor-failure",         // lists "failed run capacitor" as a top cause
  "blower-motor-hum-capacitor",   // primary first fix is the run capacitor
  "condenser-fan-failure",        // lists "failed capacitor" as a top cause
]);
const CAPACITOR_GOOD_PENALTY = 42;

// ─── Blower-hum detection ──────────────────────────────────────────────────────
// When the user describes a blower that hums but won't rotate, the primary cause
// is a failed run capacitor (PSC motors) or a mechanical jam — the dedicated
// blower-hum-capacitor entry should score highest; the generic blower-failure
// entry is penalized so it becomes an alternative, not the primary result.
const BLOWER_HUM_TERMS = [
  "blower hums", "blower motor hums", "blower humming", "blower buzzes",
  "indoor fan hums", "indoor fan buzzes", "fan hums won't start",
  "blower hum", "blower buzz", "air handler fan hums", "blower just hums",
  "blower hums no spin", "blower hums but won't", "blower motor humming",
];

// Penalty applied to the general blower-failure entry when specific hum terms
// are detected — routes the complaint to the more specific hum/capacitor entry.
const BLOWER_HUM_GENERAL_PENALTY = 35;

// ─── Flame-proven contradiction detection ──────────────────────────────────────
// When the user confirms the burners/flame DID light and THEN dropped out,
// the ignition stage SUCCEEDED — the fault is in the flame-proving circuit
// (dirty flame sensor, poor ground, gas valve coil dropout).
// Broad ignition-failure entries are contradicted; the flame-dropout entry is boosted.
const FLAME_PROVEN_TERMS = [
  "burners light", "flame lights", "lights then goes out", "flame comes on then",
  "burners come on then", "fires then goes out", "lights for a second",
  "ignites then cuts out", "burners ignite then", "flame on then off",
  "lights briefly then", "flame then shuts off", "burners fire then",
  "flame dropout", "flame drops out", "proves then drops", "flame carryover",
  "lights up then shuts", "flame for a few seconds", "burners light then",
  "flame lights then", "fires then shuts", "lights for 2 seconds",
  "ignites then shuts", "burner lights then", "flame on then shuts",
];

// IDs penalized when the user confirms the flame proved (lit and then dropped out).
const FLAME_PROVEN_PENALIZED_IDS = new Set([
  "gas-ignition-failure",              // ignition succeeded — proving circuit failed
  "gas-heat-ignitor-glows-no-flame",   // gas DID deliver — flame lit and dropped out
  "gas-heat-ignitor-no-glow",          // igniter clearly energized if flame came on
]);
const FLAME_PROVEN_PENALTY = 50;

// ─── Blower-before-heat contradiction detection ──────────────────────────────
// When the user says the blower starts immediately on a heat call (before the
// ignition delay), the fault is in the control circuit or a prior limit trip —
// NOT in ignition, gas delivery, or the refrigeration circuit.
const BLOWER_IMMEDIATE_HEAT_TERMS = [
  "blower starts immediately", "fan starts right away heat", "blower on immediately",
  "blower before burners", "fan runs before heat", "blower before ignition",
  "fan on immediately heat", "blower right away heat", "blower starts instantly heat",
  "immediate blower heat", "fan before burners light",
];

const BLOWER_IMMEDIATE_PENALIZED_IDS = new Set([
  "gas-ignition-failure",
  "gas-heat-ignitor-glows-no-flame",
  "gas-heat-ignitor-no-glow",
  "gas-heat-pressure-switch-open",
  "gas-heat-rollout-trip",
  "inducer-motor-fault",
]);
const BLOWER_IMMEDIATE_PENALTY = 40;

// ─── Heating-mode-active contradiction ────────────────────────────────────────
// When the user explicitly describes a HEATING mode operation — electric heating,
// testing heating, heat strips, heat stage, RTU with a heat kit, RAT/DAT temp
// rise measurements, furnace/gas heat sequence — cooling-circuit diagnoses
// (refrigerant leak, high head pressure, weak cooling, no cool) are physically
// impossible as the primary result. A unit in heating mode is NOT operating the
// refrigeration cooling circuit (or is running it in reverse for heat pumps).
//
// Exception: if the user ALSO mentions a cooling context term (compressor,
// refrigerant, subcooling, no cool), the contradiction is not applied so that
// dual-mode or heat-pump refrigerant faults can still surface.

const HEATING_EXPLICIT_TERMS = [
  // Mode indicators
  "electric heating", "testing heating", "heating mode", "heat mode",
  "heating on", "heating rtu", "heat stage", "heat strip", "heat strips", "heat kit",
  "aux heat", "emergency heat", "no heat", "not heating", "won't heat",
  // Temperature rise context — only meaningful in a heating diagnosis
  "temperature rise", "temp rise", "no temperature rise", "low temperature rise",
  "no temp rise", "low temp rise",
  // Gas heat sequences
  "furnace", "burner", "ignitor", "igniter", "inducer", "gas valve", "rollout",
  // RTU electric heat specifics
  "heat call", "w terminal",
];

// Categories that are cooling-circuit-only — suppress when heating mode is active
const COOLING_CIRCUIT_CATEGORIES = new Set([
  "No Cool", "Refrigerant Imbalance", "Weak Cooling", "High Head Pressure",
]);

// Penalty applied to cooling-circuit entries when heating mode is confirmed active
const HEATING_MODE_ACTIVE_PENALTY = 65;

// Trigger phrases that belong exclusively to "compressor cannot start" faults.
// If the user says the compressor IS running, entries whose triggers include
// these phrases are contradiction candidates.
const NO_START_TRIGGER_PHRASES: ReadonlySet<string> = new Set([
  "compressor won't start",
  "compressor hums won't start",
  "hums then shuts off",
  "hard start",
  "locked rotor",
  "compressor seized",
  "compressor hums",
]);

/** True if the entry is a "compressor cannot start" type fault. */
function isNoStartEntry(entry: KnowledgeBaseEntry): boolean {
  return entry.triggers.some((t) => NO_START_TRIGGER_PHRASES.has(t.toLowerCase()));
}

// Penalty magnitude — higher than NEGATIVE_TRIGGER_PENALTY so that even
// entries with strong equipment/brand matches lose to capacity-fault entries.
const SYMPTOM_CONTRADICTION_PENALTY = 65;

// ─── Sequence-of-Operation Context Classifier ────────────────────────────────
// Detects which equipment sequence the user is describing and applies
// category-level penalties to prevent wrong-sequence entries from winning.

const CTX_HEATING_TERMS = [
  // Gas heat
  "inducer", "draft motor", "draft inducer", "pressure switch", "ignitor", "igniter",
  "flame sensor", "flame proving", "gas valve", "rollout", "limit switch", "burner",
  "heat exchanger", "no heat", "furnace", "heat call", "won't heat",
  // Oil heat
  "oil heat", "oil burner", "oil furnace", "cad cell", "primary control", "nozzle",
  "puffback", "oil lockout", "ignition transformer", "electrode", "oil boiler",
  "oil filter", "fuel line", "oil pump", "combustion chamber",
  // Electric heat
  "electric heat", "electric heating", "heat strip", "heat strips", "heating element", "sequencer",
  "aux heat", "emergency heat", "heat stage", "heat kit",
  // Gas heat sub-faults
  "hsi", "hot surface igniter", "flame dropout", "flame carryover",
  "gas shutoff", "manual gas valve", "gas pressure", "manifold pressure",
  "crossover ports", "flame rectification", "microamp", "flame sensor rod",
  // Mode / general heating indicators (word-boundary-safe: \bheating\b won't match superheating/overheating)
  "heating mode", "heat mode", "testing heating", "heating on", "heating rtu",
  // Airside temperature rise measurements — only meaningful in a heating context
  "temperature rise", "temp rise", "rat", "dat",
];

const CTX_COOLING_TERMS = [
  "compressor", "contactor", "condenser fan", "evaporator", "low suction",
  "high head", "superheat", "subcooling", "txv", "filter drier", "liquid line",
  "refrigerant",
];

const CTX_AIRFLOW_TERMS = [
  "blower", "supply fan", "return air", "static pressure", "belt", "pulley",
  "wheel", "vfd", "airflow", "no air",
];

const CTX_ECONOMIZER_TERMS = [
  "economizer", "outside air", "damper", "actuator", "mixed air", "enthalpy",
  "co2", "minimum position",
];

const CTX_ELECTRICAL_TERMS = [
  "24v", "transformer", "fuse", "board", "relay", "thermostat", "bas",
  "low voltage", "control voltage", "no output",
];

const CTX_DRAIN_TERMS = [
  "condensate", "drain", "pan", "trap", "water leak", "overflow",
];

const CTX_NOISE_TERMS = [
  "grinding", "squealing", "bearing", "vibration", "rattling", "shaft",
  "loose wheel", "scraping",
];

// Failure-indicator terms: when combined with an inducer-component term, they
// confirm a pre-ignition sequence fault rather than a generic motor/noise complaint.
const CTX_INDUCER_COMPONENT_TERMS = ["inducer", "draft motor", "draft inducer"];
const CTX_FAILURE_INDICATOR_TERMS = [
  "not starting", "won't start", "not running", "won't run", "does not come on",
  "not working", "dead", "failed", "won't come on", "not initiating",
];

interface SequenceContext {
  heating: boolean;
  cooling: boolean;
  airflow: boolean;
  economizer: boolean;
  electrical: boolean;
  drain: boolean;
  noise: boolean;
  /** True when text mentions an inducer/draft component + a failure-state indicator */
  inducerNotStarting: boolean;
}

function detectSequenceContext(text: string): SequenceContext {
  const inducerPresent = containsAnyWord(text, CTX_INDUCER_COMPONENT_TERMS).length > 0;
  const failurePresent = containsAnyWord(text, CTX_FAILURE_INDICATOR_TERMS).length > 0;
  return {
    heating: containsAnyWord(text, CTX_HEATING_TERMS).length > 0,
    cooling: containsAnyWord(text, CTX_COOLING_TERMS).length > 0,
    airflow: containsAnyWord(text, CTX_AIRFLOW_TERMS).length > 0,
    economizer: containsAnyWord(text, CTX_ECONOMIZER_TERMS).length > 0,
    electrical: containsAnyWord(text, CTX_ELECTRICAL_TERMS).length > 0,
    drain: containsAnyWord(text, CTX_DRAIN_TERMS).length > 0,
    noise: containsAnyWord(text, CTX_NOISE_TERMS).length > 0,
    inducerNotStarting: inducerPresent && failurePresent,
  };
}

// Penalty applied to wrong-sequence category entries (e.g. Noisy Unit during heating call)
const SEQ_CONTEXT_PENALTY = 50;

// ─── Fault Domain Router ──────────────────────────────────────────────────────
//
// Determines the PRIMARY failure domain from BEHAVIOR descriptions before the
// keyword scoring loop runs. This prevents narrative/contextual words (e.g. "fuse"
// appearing in a surge-damage entry's clues) from hijacking the result when the
// actual physical behavior belongs to a different domain.
//
// Domain detection is signal-based (what is physically happening), not
// narrative-based (what words surround the complaint).

// High-Voltage Electrical: overcurrent, dead short, grounded motor/compressor,
// phase loss, contactor weld, motor winding faults, fuse/breaker behavior.
const HV_ELECTRICAL_SIGNALS = [
  "fuse keeps popping", "fuse keeps blowing", "fuse pops", "fuse blows",
  "blowing fuses", "blowing the fuse", "keeps blowing fuse", "fuse blown",
  "main fuse", "main power fuse", "disconnect fuse", "line fuse",
  "breaker keeps tripping", "breaker trips immediately", "trips immediately",
  "trips instantly", "trips right away",
  "dead short", "grounded compressor", "grounded motor", "ground fault",
  "shorted to ground", "winding grounded", "winding short",
  "phase loss", "single phasing", "lost a phase",
  "contactor welded", "welded contactor", "contactor stuck closed",
  "burned wire", "burnt wire", "melted wiring", "melted wire",
  "megger", "megohm", "insulation breakdown",
];

// Low-Voltage / Controls: no 24V at any point, transformer faults, float switch,
// open safety chain — the low-voltage control circuit is broken.
const LV_CONTROLS_SIGNALS = [
  "no 24v", "no 24 volt", "no 24vac", "no control voltage",
  "transformer blown", "transformer failed", "transformer bad",
  "float switch", "condensate switch", "condensate safety",
  "open safety chain", "safety chain open", "safety lockout",
  "thermostat call lost", "lost thermostat signal",
];

// Refrigeration: the user is working with gauge readings or measured pressures.
const REFRIGERATION_DOMAIN_SIGNALS = [
  "suction pressure", "head pressure", "superheat", "subcooling",
  "txv failed", "filter drier", "refrigerant charge",
  "psig", "saturation temp", "suction line temp",
];

// Airflow: the user is describing a blower/airflow quantity complaint, not a
// refrigerant or electrical fault.
const AIRFLOW_DOMAIN_SIGNALS = [
  "no airflow", "weak airflow", "low airflow",
  "blower won't run", "blower not running", "blower failed",
  "indoor fan not running", "dirty filter", "clogged filter",
  "static pressure", "belt slipping", "belt broken",
  "wheel drag", "wheel dirty",
];

// Combustion / Heating: ignition sequence, gas heat components.
const COMBUSTION_DOMAIN_SIGNALS = [
  "inducer won't start", "inducer not starting",
  "rollout tripped", "rollout switch",
  "flame sensor", "ignitor won't glow",
  "igniter failed", "gas valve not opening",
  "burner won't light", "pressure switch open", "furnace won't fire",
];

// Mechanical: rotating-equipment noise or seizure.
const MECHANICAL_DOMAIN_SIGNALS = [
  "grinding noise", "squealing noise", "bearing noise",
  "bearing failed", "shaft seized", "wheel drag", "vibration",
  "rattling", "scraping noise", "loud noise",
];

// Sensor / Logic / Economizer: BAS logic, damper/actuator faults, sensor drift.
const SENSOR_LOGIC_DOMAIN_SIGNALS = [
  "economizer stuck", "economizer fault", "damper won't close",
  "actuator failed", "actuator fault", "sensor drift",
  "bas fault", "bms fault", "co2 sensor",
];

// Storm / surge context: when these are present alongside a fuse/breaker complaint,
// the "lightning-surge-damage" entry is legitimate — do NOT penalize it.
const STORM_CONTEXT_TERMS = [
  "lightning", "lightning strike", "storm", "power surge", "surge",
  "power outage", "outage", "after rain", "after storm",
  "hurricane", "flood", "flooded",
];

type FaultDomain =
  | "high-voltage-electrical"
  | "low-voltage-controls"
  | "refrigeration"
  | "airflow"
  | "combustion-heating"
  | "mechanical"
  | "sensor-logic-economizer"
  | "unknown";

interface DomainResult {
  domain: FaultDomain;
  stormContext: boolean;
}

function detectFaultDomain(text: string): DomainResult {
  const stormContext = containsAnyWord(text, STORM_CONTEXT_TERMS).length > 0;
  if (containsAnyWord(text, HV_ELECTRICAL_SIGNALS).length > 0) {
    return { domain: "high-voltage-electrical", stormContext };
  }
  if (containsAnyWord(text, LV_CONTROLS_SIGNALS).length > 0) {
    return { domain: "low-voltage-controls", stormContext };
  }
  if (containsAnyWord(text, REFRIGERATION_DOMAIN_SIGNALS).length > 0) {
    return { domain: "refrigeration", stormContext };
  }
  if (containsAnyWord(text, COMBUSTION_DOMAIN_SIGNALS).length > 0) {
    return { domain: "combustion-heating", stormContext };
  }
  if (containsAnyWord(text, MECHANICAL_DOMAIN_SIGNALS).length > 0) {
    return { domain: "mechanical", stormContext };
  }
  if (containsAnyWord(text, AIRFLOW_DOMAIN_SIGNALS).length > 0) {
    return { domain: "airflow", stormContext };
  }
  if (containsAnyWord(text, SENSOR_LOGIC_DOMAIN_SIGNALS).length > 0) {
    return { domain: "sensor-logic-economizer", stormContext };
  }
  return { domain: "unknown", stormContext };
}

// KB categories that are in-domain for each failure domain.
// Entries in an in-domain category receive a scoring boost when the domain is detected.
const DOMAIN_AFFINITY: Record<FaultDomain, string[]> = {
  "high-voltage-electrical":   ["Trips Breaker"],
  "low-voltage-controls":      ["Reset Helps Then Fails Again"],
  "refrigeration":             ["No Cool", "Refrigerant Imbalance", "Weak Cooling", "High Head Pressure"],
  "airflow":                   ["Weak Cooling"],
  "combustion-heating":        ["No Heat"],
  "mechanical":                ["Noisy Unit"],
  "sensor-logic-economizer":   ["After Rain Failure", "Reset Helps Then Fails Again"],
  "unknown":                   [],
};

// Entry IDs that are in a completely different domain from "high-voltage-electrical"
// and should be penalized when the HV electrical domain is detected WITHOUT storm context.
// "lightning-surge-damage" belongs to "After Rain Failure" — it is a post-storm fault,
// not a behavior-based overcurrent fault. Without storm context the engine must not
// confuse "fuse keeps popping" (overcurrent / ground fault) with surge damage.
const HV_ELECTRICAL_CROSS_DOMAIN_IDS = new Set([
  "lightning-surge-damage",
  "flood-damage-outdoor",
]);

const DOMAIN_BOOST   = 22;  // in-domain category entry boost
const DOMAIN_PENALTY = 60;  // out-of-domain entry penalty (when domain is strongly detected)

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Word-boundary-aware phrase match.
 * "heat" will NOT match inside "superheat"; "cool" will NOT match inside "subcooling".
 * Multi-word phrases are anchored at both edges (e.g. "\bno heat\b").
 */
function containsWord(text: string, phrase: string): boolean {
  const normalized = normalize(phrase);
  if (!normalized) return false;
  const pattern = new RegExp(`\\b${escapeRegex(normalized)}\\b`);
  return pattern.test(text);
}

function containsAnyWord(text: string, terms: string[]): string[] {
  return terms.filter((t) => containsWord(text, t));
}

function scoreEntry(text: string, entry: KnowledgeBaseEntry): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // Brand match
  const matchedBrands = containsAnyWord(text, entry.brands);
  if (matchedBrands.length > 0) {
    score += SCORE_BRAND * matchedBrands.length;
    reasons.push(`brand match: ${matchedBrands.join(", ")}`);
  }

  // Equipment type match
  const matchedEquipment = containsAnyWord(text, entry.equipment);
  if (matchedEquipment.length > 0) {
    score += SCORE_EQUIPMENT * matchedEquipment.length;
    reasons.push(`equipment match: ${matchedEquipment.join(", ")}`);
  }

  // Failure stage match
  const failureStageKeywords: Record<string, string[]> = {
    startup: ["startup", "start up", "starting", "when starting", "on startup", "start", "won't start", "hard start"],
    runtime: ["while running", "when running", "during operation", "at runtime", "after running", "running for"],
    cycling: ["cycles", "short cycle", "cycling", "cycles off", "on and off", "intermittently cycles"],
    intermittent: ["sometimes", "intermittent", "random", "occasionally", "works sometimes", "not always"],
    "post-storm": ["after storm", "after rain", "storm", "lightning", "power outage", "flood", "hurricane"],
    shutdown: ["shuts off", "turns off", "stops", "after shutdown"],
    seasonal: ["just this season", "this summer", "first time this year", "been a while"],
  };

  const stageWords = failureStageKeywords[entry.failureStage] ?? [];
  const matchedStage = containsAnyWord(text, stageWords);
  if (matchedStage.length > 0) {
    score += SCORE_FAILURE_STAGE;
    reasons.push(`failure pattern: ${entry.failureStage}`);
  }

  // Trigger phrase match (strong signal)
  const matchedTriggers = containsAnyWord(text, entry.triggers);
  if (matchedTriggers.length > 0) {
    score += SCORE_TRIGGER * matchedTriggers.length;
    reasons.push(`symptom match: ${matchedTriggers.slice(0, 3).join("; ")}`);
  }

  // Symptom clue match (softer signal)
  const matchedClues = containsAnyWord(text, entry.symptomClues);
  if (matchedClues.length > 0) {
    score += SCORE_CLUE * Math.min(matchedClues.length, 5); // cap at 5 clues
    if (matchedTriggers.length === 0) {
      // only mention clues if not already covered by triggers
      reasons.push(`related clues: ${matchedClues.slice(0, 3).join(", ")}`);
    }
  }

  return { score, reasons };
}

// ─── Technician-reasoning context maps ───────────────────────────────────────

/**
 * Step 3 — Discipline category: names the equipment system and discipline that
 * the complaint belongs to. Helps technicians orient to the correct sequence
 * of operation before any component-level diagnosis.
 */
const DISCIPLINE_LABEL: Record<string, string> = {
  "No Heat":             "Heating Sequence (gas heat / heat pump / electric heat)",
  "No Cool":             "Cooling Sequence (refrigeration circuit / electrical)",
  "Refrigerant Imbalance": "Refrigeration Circuit — Charge / Metering / Restriction",
  "Weak Cooling":        "Cooling Capacity — Airflow / Charge / Staging",
  "Noisy Unit":          "Mechanical — Rotating Equipment / Bearings / Refrigerant",
  "Water Leak":          "Condensate Management — Drain / Pan / Trap",
  "Trips Breaker":       "Electrical — Overcurrent / Ground Fault / Mechanical Overload",
  "Reset Helps Then Fails Again": "Controls / Safety Lockout — Returning Fault Condition",
  "High Head Pressure":  "Refrigeration Circuit — Condenser / Charge / Non-Condensables",
  "After Rain Failure":  "Electrical / Controls — Moisture Intrusion / Surge",
  "Runs Constantly":     "Controls — Contactor / Thermostat / Staging",
};

/**
 * Sequence-of-operation stop: identifies where the equipment sequence likely
 * halted based on the fault category.
 */
const SEQUENCE_STOP: Record<string, string> = {
  "No Heat":             "Sequence stopped before or during heating initiation. Walk the sequence: call for heat → inducer → pressure switch → igniter → gas valve → flame prove → blower.",
  "No Cool":             "Sequence stopped after the call-for-cooling stage. Walk: thermostat call → contactor → condenser fan → compressor → evaporator airflow → supply temp split.",
  "Refrigerant Imbalance": "Refrigeration circuit is running — fault is in pressure/temperature balance, not the initiation sequence.",
  "Weak Cooling":        "System is running but capacity is reduced — airflow and coil condition must be ruled out before refrigerant work.",
  "Noisy Unit":          "Unit is operating but a mechanical component is approaching failure.",
  "Water Leak":          "Condensate path is obstructed or compromised — verify primary drain before anything else.",
  "Trips Breaker":       "Overcurrent event — the protection device opened for a reason. Do not just reset; find the current draw source.",
  "Reset Helps Then Fails Again": "Fault is intermittent or a root cause is unresolved. Each lockout event is a clue — read the fault code before resetting.",
  "High Head Pressure":  "Condenser heat rejection is impaired. Verify airflow and coil condition before suspecting charge or non-condensables.",
  "After Rain Failure":  "Moisture entered the electrical or controls path — inspect low-voltage wiring, contactors, and boards before refrigerant components.",
  "Runs Constantly":     "Unit cannot complete the off-cycle — check contactor hold-in and thermostat wiring before refrigerant diagnosis.",
};

/**
 * Step 7 — Assumption warning: the most common incorrect diagnostic jump for
 * each category. Tells the technician what NOT to assume first.
 */
const ASSUMPTION_WARNING: Record<string, string> = {
  "No Heat":             "Do not condemn the gas valve, board, or igniter before confirming the full sequence ran — a tripped rollout or open limit is the most commonly missed cause.",
  "No Cool":             "Do not condemn the compressor or refrigerant charge before confirming contactor pull-in, capacitor spec, and voltage at the compressor terminals.",
  "Refrigerant Imbalance": "Do not add refrigerant without first confirming airflow — a dirty filter or frozen coil produces superheat and suction readings identical to a low-charge condition.",
  "Weak Cooling":        "Do not add refrigerant to a system with weak cooling — verify filter, coil, and economizer position first; overcharging a restricted system causes compressor damage.",
  "Noisy Unit":          "Do not replace the motor before confirming whether the noise source is mechanical (bearing) or refrigerant (slugging/liquid) — they require completely different repairs.",
  "Water Leak":          "Do not replace the pan or coil before snaking the drain and verifying the trap — 80% of water complaints are a clogged primary drain.",
  "Trips Breaker":       "Do not replace the breaker or motor based on the breaker trip alone — measure running amps first; a soft start or capacitor issue may be the real cause.",
  "Reset Helps Then Fails Again": "Do not clear the fault code and call it good — a returning lockout is a signal that the root cause (dirty coil, low charge, intermittent safety) is still present.",
  "High Head Pressure":  "Do not recover refrigerant to lower head pressure — verify condenser airflow and coil condition first; reclaim is the last step, not the first.",
  "After Rain Failure":  "Do not replace boards or sensors before inspecting and drying contactors, low-voltage terminals, and control wiring — water on contacts causes the same symptoms as a failed board.",
  "Runs Constantly":     "Do not add refrigerant to a unit that runs constantly — a stuck-open contactor or wired-on thermostat is the leading cause, not charge level.",
};

// ─── Entry-ID overrides: oil heat, electric heat, and gas sub-fault sequences ─
// These override the category-level SEQUENCE_STOP and ASSUMPTION_WARNING for
// entries that belong to "No Heat" but follow a completely different discipline
// than the gas-heat default wording.

const DISCIPLINE_BY_ID_PREFIX: Record<string, string> = {
  "oil-heat":                        "Oil Heat — Burner / Primary Control / Combustion",
  "electric-heat":                   "Electric Heat — Elements / Sequencer / Overcurrent",
  "gas-heat":                        "Gas Heat — Ignition / Combustion / Gas Supply / Limit String",
  "condenser-fan-reverse-rotation":  "Motor Rotation Fault — Phase Sequence / Wiring / Motor Configuration",
  "breaker-trips-after-running":     "Runtime Overload — Thermal / Sustained Overcurrent / High Head Pressure",
  "motor-no-start-capacitor-good":   "Motor No-Start — Voltage Path / Winding / Overload / Contactor / Mechanical Bind",
  "contactor-coil-no-pull-in":       "Cooling Electrical — Contactor Coil / Control Voltage / Mechanical Bind",
  "low-suction-airflow-restriction": "Refrigeration Circuit — Airflow Restriction Before Refrigerant Diagnosis",
  "afternoon-capacity-failure":      "Ambient-Dependent Fault — High Head Pressure / Condenser / Peak-Load Capacity",
  "gas-heat-flame-dropout":          "Gas Heat — Flame Proving Circuit (Flame Sensor / Ground / Gas Valve Hold-in)",
  "gas-heat-ignitor-no-glow":        "Gas Heat — Ignition Safety String / Board Igniter Command / Igniter Element",
  "gas-heat-immediate-blower":       "Gas Heat — Control Circuit / Limit Trip / Fan Relay (Blower Timing Fault)",
  "blower-motor-hum-capacitor":      "Airflow — Indoor Blower Motor / Run Capacitor / Mechanical Bind",
  "compressor-running-no-cooling":   "Cooling Capacity — Refrigerant Circuit / Airflow / Compressor Pumping",
  "control-voltage-no-power":        "Electrical Controls — Control Voltage Path / Transformer / Fuse / Disconnect",
  "low-voltage-path-fault":          "Electrical Controls — Y-Circuit Continuity / Safeties in Series / Board Y-Output",
  "low-delta-t-weak-cooling":        "Cooling Capacity — Airflow / Economizer / Condenser Before Refrigerant Work",
  "main-fuse-overcurrent":           "High-Voltage Electrical — Overcurrent / Ground Fault / Dead Short (Line-Voltage Level)",
};

const SEQ_STOP_BY_ID_PREFIX: Record<string, string> = {
  "condenser-fan-reverse-rotation":  "Rotation fault — the motor IS running but driving airflow in the wrong direction. This is a phase rotation, wiring, or configuration issue, NOT a mechanical failure. Branch immediately by motor type: 3-phase (swap any two line leads) → single-phase PSC (OEM wiring diagram / rotation leads / blade pitch) → ECM (OEM configuration / control signal). Do not replace the motor before identifying the root cause.",
  "breaker-trips-after-running":     "Runtime overload sequence: unit starts → runs 5–20 minutes → breaker trips. This is NOT a locked-rotor fault. Walk: condenser airflow and coil condition → condenser fan speed under sustained load → compressor amp draw vs. nameplate RLA → all high-current terminations → breaker condition.",
  "motor-no-start-capacitor-good":  "No-start with confirmed good capacitor — identify which motor first (compressor, condenser fan, blower). Then walk: line voltage present at motor terminals → contactor pull-in (24VAC at coil) → motor winding resistance (ohmmeter) → internal overload cooled and reset → mechanical bind (shaft by hand).",
  "contactor-coil-no-pull-in":       "Sequence stopped at contactor pull-in — control voltage IS present at the coil but the contactor is not closing. Walk: coil resistance (20–100 Ω) → manual plunger travel (smooth with firm spring return) → control voltage stability under load (hold 24 ±2VAC during pull-in attempt) → coil voltage rating match.",
  "low-suction-airflow-restriction": "Low suction detected — airflow must be CONFIRMED before refrigerant diagnosis. Restricted airflow and low charge produce identical gauge readings. Walk: filter MERV rating and condition → external static pressure → blower speed and amp draw → evaporator coil face → suction superheat with confirmed airflow.",
  "afternoon-capacity-failure":      "Fault is ambient-dependent — it may not reproduce during a morning service call. Walk: inspect condenser coil in peak-ambient conditions → observe condenser fan speed under sustained afternoon load → connect gauges during the failure window → record outdoor ambient temperature at time of trip.",
  "oil-heat":                  "Oil burner sequence: call for heat → primary control energizes → ignition transformer sparks → oil pump / nozzle atomize fuel → cad cell proves flame → burner runs → blower starts.",
  "electric-heat-open":        "Electric heat sequence: call for heat → sequencer heater coil receives 24V → sequencer contacts close (30–60 sec delay) → element receives 240V → amperage confirms heat strip active.",
  "electric-heat-sequencer":   "Electric heat staging sequence: W terminal energizes first sequencer → first stage elements close → second sequencer receives jumper signal → second stage closes after delay.",
  "electric-heat-stays":       "Thermostat satisfied → W terminal de-energizes → sequencer heater cools → sequencer contacts open → element loses 240V → amperage drops to zero.",
  "electric-heat-high":        "Overcurrent sequence: call for heat → elements energize → element shorts to frame → excessive current → breaker trips (this is correct protection behavior — find the shorted element, not the breaker).",
  "gas-heat-ignitor-glows":    "Gas heat sequence reached: inducer started → pressure switch proved → igniter glowed → gas valve commanded open → sequence stopped: no fuel delivery to burners.",
  "gas-heat-ignitor-no":       "Gas heat sequence reached: inducer started → pressure switch proved → ignition stage: sequence stopped before igniter energized — limit string open or board not commanding igniter.",
  "gas-heat-flame-dropout":    "Gas heat sequence reached: inducer → pressure switch → igniter → gas valve → burners lit → sequence stopped: flame dropped out within 2–7 seconds of ignition.",
  "gas-heat-immediate-blower": "Gas heat sequence: call for heat → blower started immediately (should not run until after ignition delay) — sequence logic suggests a prior overheat trip or stuck fan relay bypassing normal blower delay.",
  "gas-heat-rollout":          "Gas heat sequence reached ignition, but combustion gases reversed direction — sequence stopped by rollout safety. This is a life-safety condition: identify the reversal cause before restart.",
  "gas-heat-pressure-switch-o": "Gas heat sequence: inducer started → sequence stopped: pressure switch did not close — draft differential insufficient to prove inducer operation.",
  "gas-heat-pressure-switch-c": "Gas heat sequence anomaly: pressure switch proved without inducer running — contacts welded or switch jumpered; unit operates without verifying venting.",
  "blower-motor-hum-capacitor":     "Blower hum without rotation — motor is receiving voltage but cannot develop starting torque. TURN OFF POWER IMMEDIATELY to prevent winding damage from sustained locked-rotor current. Walk: run capacitor µF vs. nameplate (±6%) → wheel clear and spinning freely by hand → thermal overload cooled and reset → motor winding ohms. ECM motors do not use run capacitors — follow OEM diagnostic.",
  "compressor-running-no-cooling":  "Compressor is running — fault is in refrigerant or heat-transfer, NOT a start fault. Walk: indoor airflow and blower speed → gauge differential (suction vs. discharge) → suction superheat → subcooling → condenser coil and fan. Equalized pressures while compressor runs = valve failure, not low charge.",
  "control-voltage-no-power":       "No control voltage — trace the power path forward from the source. Walk: line voltage at main disconnect → transformer primary → transformer secondary (24–28VAC) → low-voltage fuse integrity → voltage at terminal block. Each step must confirm presence before advancing to the next component.",
  "low-voltage-path-fault":         "Control voltage at thermostat but not at contactor coil — the Y-circuit has an open. Walk: Y signal at thermostat sub-base → condensate float switch continuity → Y signal at air handler terminal block → board Y-output → series pressure/safety switches → Y signal at outdoor unit terminal. The break is at the first measurement point that reads 0V.",
  "low-delta-t-weak-cooling":       "Low temperature split — system is running but capacity is reduced. NOT automatically a low-charge fault. Walk the full checklist before gauges: blower speed/CFM vs. design (400 CFM/ton) → measurement location (supply plenum, not register) → economizer damper position → condenser coil condition → then refrigerant pressures only after these are confirmed.",
  "main-fuse-overcurrent":          "Line-voltage overcurrent event — the fuse is protecting against a real fault. DO NOT replace the fuse and restore power without first isolating the cause. Walk the isolation sequence: (1) disconnect compressor contactor load-side leads → restore power → if fuse holds, fault is downstream of contactor; (2) megger compressor windings to ground (500V, must read >1 MΩ); (3) inspect contactor for welded contacts; (4) test run capacitor (>6% low = replace before LRA test); (5) trace all conductors for rodent damage, pinched insulation, or burn marks.",
};

const ASSUMPTION_BY_ID_PREFIX: Record<string, string> = {
  "condenser-fan-reverse-rotation": "Do not replace the condenser fan motor or capacitor as the first step — a motor running backwards is operating, not failed. Replacing it with the same phase rotation, wiring, or blade orientation will reproduce the fault exactly. Always identify motor type and root cause (phase rotation, rotation lead wiring, blade pitch, ECM configuration) before ordering any parts.",
  "breaker-trips-after-running":    "Do not replace the breaker as the first step — the breaker is protecting against a real sustained overload. A new breaker with the same overloaded circuit will trip again or, worse, fail to protect. Find the overcurrent source (dirty coil, overheating motor, high-resistance connection) before replacing any overcurrent protection device.",
  "motor-no-start-capacitor-good":  "Do not condemn the motor before confirming voltage reaches its terminals — a pitted contactor, blown fuse, or open disconnect can prevent motor startup while the motor itself is perfectly functional. Verify line voltage at the motor terminals before any winding or capacitor test.",
  "contactor-coil-no-pull-in":       "Do not replace the transformer or control board before checking the contactor coil resistance (20–100 Ω is normal) and performing the manual plunger test — a burnt coil costs $30–50 and 15 minutes to replace. Confirm the coil voltage rating on the replacement contactor matches the original.",
  "low-suction-airflow-restriction": "Do not add refrigerant to a system with low suction pressure until airflow is confirmed adequate. Adding charge to an airflow-restricted system will overshoot when the restriction is cleared — causing floodback and compressor damage. Confirm suction superheat is above 20°F with verified normal airflow before any refrigerant work.",
  "afternoon-capacity-failure":      "Do not diagnose an afternoon-only failure during a morning service call — the fault may not reproduce until outdoor ambient reaches its daily peak. A system that 'works fine in the morning' has a load-dependent fault. Schedule an afternoon return visit or advise the customer to call during the failure event.",
  "oil-heat":                  "Do not reset the primary control more than once — repeated resets without finding root cause allow unburned oil to accumulate, creating a puffback risk. Diagnose before resetting.",
  "electric-heat-open":        "Do not condemn the sequencer or the breaker before testing each element's resistance. An open element produces zero amps on its circuit — confirm with ohmmeter before ordering parts.",
  "electric-heat-sequencer":   "Do not replace elements before confirming the sequencer is commanding them. A sequencer with failed contacts produces identical symptoms to an open element — test both before ordering.",
  "electric-heat-stays":       "Do not replace the thermostat before isolating control voltage at the board. Disconnecting the thermostat G and W wires at the board will determine whether the fault is in the thermostat, wiring, or board relay.",
  "electric-heat-high":        "Do not replace the breaker first — the breaker is protecting against a real fault. Test each element for short-to-ground before replacing the breaker.",
  "gas-heat-ignitor-glows":    "Do not condemn the gas valve before confirming manual shutoff is open, inlet gas pressure is correct, and 24VAC is reaching the valve operator — these are cheaper checks than a gas valve replacement.",
  "gas-heat-ignitor-no":       "Do not replace the board before confirming 120VAC is absent at the igniter and all safeties in the limit string are closed — the board's failure to energize the igniter is often the correct response to an open safety.",
  "gas-heat-flame-dropout":    "Do not replace the flame sensor board connection before cleaning the flame sensor rod — a dirty rod is the leading cause at zero parts cost. Measure microamps before condemning any part.",
  "gas-heat-immediate-blower": "Do not replace the blower motor before checking for a tripped limit or energized G terminal — the motor is almost certainly fine; the fault is in the control circuit or a prior safety event.",
  "gas-heat-rollout":          "Do not bypass or tape over the rollout switch under any circumstance — this is the primary protection against carbon monoxide intrusion. The root cause must be identified and corrected.",
  "gas-heat-pressure-switch-o": "Do not replace the pressure switch before measuring actual draft with a manometer and inspecting the hose and vent path — the switch is often the victim, not the cause.",
  "gas-heat-pressure-switch-c": "Do not operate the unit with a confirmed stuck-closed or bypassed pressure switch — this is a reportable safety violation. Replace the switch and identify why it failed before restart.",
  "blower-motor-hum-capacitor":    "Do not replace the blower motor before testing the run capacitor — a failed capacitor costs a fraction of a motor replacement and is the most common cause of a blower hum. Do not re-energize a stalled motor repeatedly; every additional locked-rotor cycle burns winding insulation and reduces the chance of motor salvage.",
  "compressor-running-no-cooling": "Do not add refrigerant when suction and discharge pressures are nearly equal while the compressor runs — equalized pressures indicate valve failure, not undercharge. Adding refrigerant to a non-pumping compressor overcharges the system and causes liquid floodback when the compressor is eventually replaced.",
  "control-voltage-no-power":      "Do not replace the transformer before confirming its primary is receiving line voltage. Check for a blown low-voltage control fuse before any other component — a shorted thermostat wire blowing the fuse is the leading cause of 'no 24V at the board' and costs nothing to diagnose.",
  "low-voltage-path-fault":        "Do not condemn the thermostat, control board, or contactor until the full Y-circuit path is traced with a voltmeter. Check the condensate float switch first — it is the most commonly overlooked series device in this fault pattern and takes 30 seconds to test.",
  "low-delta-t-weak-cooling":      "Do not add refrigerant based on a low delta-T reading alone. Confirm airflow is within design range, the economizer is at minimum position, and the condenser coil is clean before connecting gauges. Adding refrigerant to a high-airflow or economizer problem overcharges the system when the actual fault is later corrected.",
  "main-fuse-overcurrent":         "Do not upsize or bypass the fuse — a fuse blowing on main power is protecting against a real overcurrent or ground fault. Do not megger the compressor with leads still connected to the contactor; disconnect completely first. Do not condemn the compressor before replacing the run capacitor and retesting — a failed capacitor is the most common cause of preventable locked-rotor LRA events.",
};

/** Finds the most specific ID-prefix override for a given entry ID. */
function lookupByIdPrefix<T>(map: Record<string, T>, id: string): T | undefined {
  // Sort by prefix length descending so the most specific match wins
  const match = Object.keys(map)
    .filter((prefix) => id.startsWith(prefix))
    .sort((a, b) => b.length - a.length)[0];
  return match !== undefined ? map[match] : undefined;
}

/**
 * Builds the whyThisFits string for KB-direct results following the
 * 7-step technician-reasoning framework:
 *  Steps 1–2 — what matched (equipment / symptom indicators)
 *  Step 3    — discipline label + sequence stop
 *  Step 7    — assumption warning
 */
function buildWhyThisFits(reasons: string[], entry: KnowledgeBaseEntry): string {
  const discipline  =
    lookupByIdPrefix(DISCIPLINE_BY_ID_PREFIX, entry.id) ??
    DISCIPLINE_LABEL[entry.category]                     ??
    entry.category;
  const seqStop     =
    lookupByIdPrefix(SEQ_STOP_BY_ID_PREFIX, entry.id)   ??
    SEQUENCE_STOP[entry.category]                        ??
    `Fault is a ${entry.failureStage}-stage issue — follow sequence of operation from the start.`;
  const assumption  =
    lookupByIdPrefix(ASSUMPTION_BY_ID_PREFIX, entry.id) ??
    ASSUMPTION_WARNING[entry.category]                   ??
    "Follow systematic sequence of operation before condemning components.";

  // Step 1–2: what matched
  const matchParts: string[] = [];
  for (const reason of reasons) {
    if (reason.startsWith("brand match:")) {
      matchParts.push(`Equipment brand identified: ${reason.replace("brand match: ", "")}`);
    } else if (reason.startsWith("equipment match:")) {
      matchParts.push(`Equipment type: ${reason.replace("equipment match: ", "")}`);
    } else if (reason.startsWith("failure pattern:")) {
      matchParts.push(`Failure stage: ${reason.replace("failure pattern: ", "")}`);
    } else if (reason.startsWith("symptom match:")) {
      matchParts.push(`Symptom indicators matched: ${reason.replace("symptom match: ", "")}`);
    } else if (reason.startsWith("related clues:")) {
      matchParts.push(`Supporting clues: ${reason.replace("related clues: ", "")}`);
    }
  }

  const matchSummary = matchParts.length > 0
    ? matchParts.join(". ") + "."
    : `Symptoms are consistent with the ${entry.category} failure pattern.`;

  // Step 3 + 7 combined
  return `${matchSummary} Discipline: ${discipline}. ${seqStop} Caution: ${assumption}`;
}

function computeConfidence(
  score: number,
  baseConfidence: number,
  rank: number
): number {
  // Evidence-strength cap: prevents high confidence for ambiguous or single-clue matches.
  // score < 12  → one weak clue only → cap at 72% (ambiguous)
  // score < 30  → some evidence but not specific → cap at 82%
  // score < 54  → moderate evidence (trigger + equipment, or trigger + brand) → cap at 91%
  // score >= 54 → strong multi-signal match → cap at 97%
  let cap = score < 12 ? 72 : score < 30 ? 82 : score < 54 ? 91 : 97;

  // Override for high-specificity entries: if the entry has a very high confidenceBase
  // (≥ 92) and at least one trigger phrase matched (score ≥ SCORE_TRIGGER = 12), the
  // entry's trigger phrases are specific enough to justify bypassing the score cap.
  // This allows symptom-specific sub-fault entries to route KB-direct even without
  // brand/equipment context (e.g. "burners light then shut off" → flame-dropout entry).
  if (baseConfidence >= 92 && score >= SCORE_TRIGGER) {
    cap = Math.max(cap, 91);
  }

  const boost = Math.min(score * 0.6, 14);
  const penalty = rank === 1 ? 15 : rank === 2 ? 28 : 0;
  const raw = baseConfidence + boost - penalty;
  return Math.round(Math.max(35, Math.min(cap, raw)));
}

function entryToResult(
  entry: KnowledgeBaseEntry,
  reasons: string[],
  score: number,
  rank: number
): DiagnosisEntry {
  return {
    id: entry.id,
    title: entry.title,
    category: entry.category,
    whyThisFits: buildWhyThisFits(reasons, entry),
    likelyCauses: entry.likelyCauses,
    firstChecks: entry.firstChecks,
    meterChecks: entry.meterChecks,
    priorityLevel: entry.priority,
    confidencePercent: computeConfidence(score, entry.confidenceBase, rank),
    recommendedAction: entry.recommendedAction,
    riskNote: entry.riskNote,
  };
}

// ─── Generic fallback entries ─────────────────────────────────────────────────

function genericFallback(text: string): KnowledgeBaseEntry {
  const noCool = ["cool", "cold", "ac", "cooling", "warm air"];
  const noHeat = ["heat", "warm", "heating", "furnace", "hot air"];
  const isNoHeat = containsAnyWord(text, noHeat).length > containsAnyWord(text, noCool).length;

  if (isNoHeat) {
    return {
      id: "fallback-no-heat",
      title: "General No Heat — Category Unknown",
      category: "No Heat",
      equipment: [],
      brands: [],
      triggers: [],
      symptomClues: [],
      failureStage: "startup",
      confidenceBase: 55,
      priority: "high",
      likelyCauses: [
        "Tripped high-limit switch from restricted airflow or filter blockage",
        "Faulty ignition system (gas) or failed heat strip (electric)",
        "Reversing valve in wrong mode (heat pump systems)",
      ],
      firstChecks: [
        "Confirm thermostat mode is HEAT and setpoint exceeds room temperature",
        "Replace air filter — a blocked filter triggers the high-limit switch on nearly every gas furnace",
        "For gas units: verify gas supply is on and pilot or igniter is functioning",
      ],
      meterChecks: [
        "Voltmeter at thermostat: confirm 24VAC control power is present",
        "Voltmeter at gas valve terminals: 24VAC present = board commanding open",
      ],
      recommendedAction:
        "Replace the air filter and attempt a thermostat reset. If heat still does not come on, call a licensed HVAC technician for further diagnosis.",
      riskNote:
        "Do not bypass limit switches. Limit switches are safety devices that protect against overheating and carbon monoxide risk.",
    };
  }

  return {
    id: "fallback-no-cool",
    title: "General No Cool — Category Unknown",
    category: "No Cool",
    equipment: [],
    brands: [],
    triggers: [],
    symptomClues: [],
    failureStage: "runtime",
    confidenceBase: 55,
    priority: "high",
    likelyCauses: [
      "Low refrigerant charge from a leak — most common cause of gradual cooling loss",
      "Failed compressor or capacitor preventing refrigerant circulation",
      "Clogged filter or frozen coil blocking airflow",
    ],
    firstChecks: [
      "Confirm the thermostat is in COOL mode and setpoint is below room temperature",
      "Replace air filter — a clogged filter causes frozen coils and no cooling",
      "Inspect outdoor unit — confirm both compressor and condenser fan are running",
    ],
    meterChecks: [
      "Clamp meter on outdoor unit compressor lead: zero amps with contactor pulled in = compressor failure",
      "Capacitance meter on run capacitor: below rated µF = replace immediately",
    ],
    recommendedAction:
      "Replace the air filter and verify basic electrical operation. If the unit is running but not cooling, call a licensed technician for refrigerant pressure testing.",
    riskNote:
      "Operating with low refrigerant destroys the compressor. If the unit is running but not cooling at all, turn it off and call for service.",
  };
}

// ─── Main engine ──────────────────────────────────────────────────────────────

export function diagnoseByKnowledgeBase(symptoms: string): DiagnosisResult {
  const text = normalize(symptoms);

  // ── Context detection ──────────────────────────────────────────────────────
  // Determine whether the user is describing a refrigerant-side measurement.
  // If so, heating-category entries are penalized unless the user also
  // mentions an explicit heating override term (e.g. "furnace", "no heat").
  const refContextFound = containsAnyWord(text, REFRIGERATION_CONTEXT_TERMS);
  const heatOverrideFound = containsAnyWord(text, HEATING_OVERRIDE_TERMS);
  const isRefrigerationContext = refContextFound.length > 0 && heatOverrideFound.length === 0;

  // ── Compressor-running contradiction ──────────────────────────────────────
  // If the user explicitly states the compressor IS running, no-start faults
  // (locked rotor, seized, hard-start no-start) are physically impossible as
  // the primary result. Suppress them unless cycling/overload is also mentioned
  // (compressor may be running briefly then tripping on thermal overload).
  const compressorRunningDetected = containsAnyWord(text, COMPRESSOR_RUNNING_TERMS).length > 0;
  const compressorCyclingDetected = containsAnyWord(text, COMPRESSOR_CYCLING_TERMS).length > 0;
  const applyNoStartContradiction = compressorRunningDetected && !compressorCyclingDetected;

  // ── Time-behavior detection ────────────────────────────────────────────────
  // Trips AFTER N minutes = runtime/thermal fault, not instant locked-rotor.
  const runtimeTimingDetected = containsAnyWord(text, RUNTIME_FAULT_TIMING_TERMS).length > 0;

  // ── Capacitor-confirmed-good detection ────────────────────────────────────
  const capacitorGoodDetected = containsAnyWord(text, CAPACITOR_TESTED_GOOD_TERMS).length > 0;

  // ── Flame-proven detection ─────────────────────────────────────────────────
  // "Burners light then go out" = ignition SUCCEEDED; fault is flame sensor / proving.
  const flameLightsDetected = containsAnyWord(text, FLAME_PROVEN_TERMS).length > 0;

  // ── Blower-before-heat detection ───────────────────────────────────────────
  // Blower running immediately on heat call = control circuit / limit fault, not ignition.
  const blowerImmediateHeatDetected = containsAnyWord(text, BLOWER_IMMEDIATE_HEAT_TERMS).length > 0;

  // ── Blower-hum detection ─────────────────────────────────────────────────
  // Blower motor humming without rotation → run capacitor (PSC) or mechanical
  // jam. Boost the dedicated hum/capacitor entry; penalize the generic
  // blower-failure entry so it appears as an alternative, not the primary.
  const blowerHumDetected = containsAnyWord(text, BLOWER_HUM_TERMS).length > 0;

  // ── Sequence-of-operation context ─────────────────────────────────────────
  const ctx = detectSequenceContext(text);

  // ── Heating-mode-active contradiction ─────────────────────────────────────
  // User explicitly describes heating mode AND no cooling context is present.
  // Cooling-circuit diagnoses (refrigerant leak, no cool, high head pressure)
  // are physically impossible when the unit is operating in heating mode.
  const heatingModeActive =
    containsAnyWord(text, HEATING_EXPLICIT_TERMS).length > 0 && !ctx.cooling;

  // ── Fault domain detection ─────────────────────────────────────────────────
  // Identifies the primary physical failure domain before keyword scoring.
  // Used to boost in-domain KB entries and penalize cross-domain entries whose
  // clue words happen to match narrative context (e.g. "fuse" in a surge entry).
  const faultDomain = detectFaultDomain(text);
  const inDomainCategories = DOMAIN_AFFINITY[faultDomain.domain];

  // Score every entry and apply penalties
  const scored = hvacKnowledgeBase.map((entry) => {
    const { score, reasons } = scoreEntry(text, entry);
    let adjustedScore = score;

    // Per-entry negative trigger penalty
    if (entry.negativeTriggers && entry.negativeTriggers.length > 0) {
      const negMatches = containsAnyWord(text, entry.negativeTriggers);
      if (negMatches.length > 0) {
        adjustedScore -= NEGATIVE_TRIGGER_PENALTY;
      }
    }

    // Global refrigeration-context penalty for heating-category entries
    if (isRefrigerationContext && HEATING_CATEGORIES.has(entry.category)) {
      adjustedScore -= NEGATIVE_CONTEXT_PENALTY;
    }

    // ── Sequence-of-operation gates ─────────────────────────────────────────
    // Heating sequence active, no noise complaint → suppress Noisy Unit entries
    if (ctx.heating && !ctx.noise && entry.category === "Noisy Unit") {
      adjustedScore -= SEQ_CONTEXT_PENALTY;
    }
    // Inducer/draft motor not-starting pattern → boost the dedicated inducer entry
    if (ctx.inducerNotStarting && entry.id === "inducer-motor-fault") {
      adjustedScore += SCORE_TRIGGER * 3; // equivalent to 3 additional trigger phrase matches
    }

    // ── Compressor-running contradiction ──────────────────────────────────
    // If the user says the compressor IS running and this entry is a no-start
    // fault (locked rotor, seized, hard start), it is physically contradicted.
    // Apply a heavy penalty so capacity-fault entries rank above it.
    if (applyNoStartContradiction && isNoStartEntry(entry)) {
      adjustedScore -= SYMPTOM_CONTRADICTION_PENALTY;
    }

    // ── Runtime-timing contradiction ───────────────────────────────────────
    // If the user says the unit trips AFTER running N minutes, startup-stage
    // no-start entries (locked rotor, seized) are physically contradicted —
    // those faults trip immediately, never after sustained run time.
    if (runtimeTimingDetected && entry.failureStage === "startup" && isNoStartEntry(entry)) {
      adjustedScore -= RUNTIME_TIMING_PENALTY;
    }

    // ── Capacitor-confirmed-good contradiction ─────────────────────────────
    // When the user confirms the capacitor tests good, entries that prescribe
    // "replace the capacitor" as the primary fix are deprioritized.
    if (capacitorGoodDetected && CAPACITOR_GOOD_PENALIZED_IDS.has(entry.id)) {
      adjustedScore -= CAPACITOR_GOOD_PENALTY;
    }

    // ── Flame-proven contradiction ─────────────────────────────────────────
    // "Burners light then go out" = ignition SUCCEEDED. Broad ignition-failure
    // entries are contradicted; the dedicated flame-dropout entry is boosted.
    if (flameLightsDetected) {
      if (FLAME_PROVEN_PENALIZED_IDS.has(entry.id)) {
        adjustedScore -= FLAME_PROVEN_PENALTY;
      }
      if (entry.id === "gas-heat-flame-dropout") {
        adjustedScore += SCORE_TRIGGER * 3; // equivalent to 3 extra trigger matches
      }
    }

    // ── Blower-before-heat contradiction ──────────────────────────────────
    // Blower immediately on heat call = control/limit fault. Penalize entries
    // whose diagnosis requires the sequence to have not yet started.
    if (blowerImmediateHeatDetected) {
      if (BLOWER_IMMEDIATE_PENALIZED_IDS.has(entry.id)) {
        adjustedScore -= BLOWER_IMMEDIATE_PENALTY;
      }
      if (entry.id === "gas-heat-immediate-blower") {
        adjustedScore += SCORE_TRIGGER * 3;
      }
    }

    // ── Blower-hum boost / penalty ────────────────────────────────────────
    // A humming-but-not-spinning blower points to run capacitor (PSC) or
    // mechanical jam. Boost the dedicated hum/cap entry; penalize the general
    // blower-failure entry so it ranks as an alternative, not primary result.
    if (blowerHumDetected) {
      if (entry.id === "blower-motor-hum-capacitor") {
        adjustedScore += SCORE_TRIGGER * 2;
      }
      if (entry.id === "blower-motor-failure") {
        adjustedScore -= BLOWER_HUM_GENERAL_PENALTY;
      }
    }

    // ── Compressor-running boost for dedicated capacity-fault entry ────────
    // When the compressor is confirmed running (no-start contradiction active),
    // boost the capacity-fault entry above refrigerant-leak and other entries.
    if (applyNoStartContradiction && entry.id === "compressor-running-no-cooling") {
      adjustedScore += SCORE_TRIGGER * 3;
    }

    // ── Heating-mode-active contradiction ─────────────────────────────────
    // User is in HEATING mode with no cooling context → cooling-circuit faults
    // (refrigerant leak, high head pressure, weak cooling, no cool) are
    // physically impossible as the primary result.
    if (heatingModeActive && COOLING_CIRCUIT_CATEGORIES.has(entry.category)) {
      adjustedScore -= HEATING_MODE_ACTIVE_PENALTY;
    }

    // ── Fault domain routing ───────────────────────────────────────────────
    // In-domain boost: entry's category belongs to the detected failure domain.
    if (inDomainCategories.length > 0 && inDomainCategories.includes(entry.category)) {
      adjustedScore += DOMAIN_BOOST;
    }
    // Cross-domain penalty: entry belongs to an incompatible domain and does
    // NOT have storm context to justify it. Primary use-case: "fuse keeps
    // popping" (high-voltage-electrical) must NOT route to lightning-surge-damage
    // (After Rain Failure) unless the complaint also mentions a storm event.
    if (
      faultDomain.domain === "high-voltage-electrical" &&
      !faultDomain.stormContext &&
      HV_ELECTRICAL_CROSS_DOMAIN_IDS.has(entry.id)
    ) {
      adjustedScore -= DOMAIN_PENALTY;
    }

    return { entry, score: adjustedScore, reasons };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Filter to entries with meaningful scores
  const meaningful = scored.filter((s) => s.score >= SCORE_CLUE);

  if (meaningful.length === 0) {
    // No meaningful matches — return a generic fallback
    const fallback = genericFallback(text);
    const primary: DiagnosisEntry = {
      id: fallback.id,
      title: fallback.title,
      category: fallback.category,
      whyThisFits:
        "No specific brand, equipment type, or trigger phrase was identified. This is a general diagnostic based on the symptom description provided.",
      likelyCauses: fallback.likelyCauses,
      firstChecks: fallback.firstChecks,
      meterChecks: fallback.meterChecks,
      priorityLevel: fallback.priority,
      confidencePercent: 52,
      recommendedAction: fallback.recommendedAction,
      riskNote: fallback.riskNote,
    };
    return { primary, alternatives: [] };
  }

  // Build top 3
  const top = meaningful.slice(0, 3);
  const [first, second, third] = top;

  const primary = entryToResult(first.entry, first.reasons, first.score, 0);
  const alternatives: DiagnosisEntry[] = [];

  if (second) alternatives.push(entryToResult(second.entry, second.reasons, second.score, 1));
  if (third) alternatives.push(entryToResult(third.entry, third.reasons, third.score, 2));

  return { primary, alternatives };
}

// ─── Legacy wrapper (not used by routes but kept for safety) ──────────────────

export function diagnoseByRules(symptoms: string) {
  const result = diagnoseByKnowledgeBase(symptoms);
  return result.primary;
}
