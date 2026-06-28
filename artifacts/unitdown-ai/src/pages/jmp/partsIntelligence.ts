// ─── UnitDown Parts Intelligence — Master Database ────────────────────────────
// Phase 1: Data structures and knowledge base.
// Phase 2–7: Matching helpers, equipment context, van inventory linkage.
//
// TRUTHFULNESS RULE: Never invent OEM part numbers. Never claim a part fits
// unless specs are verified by the technician. Use "Verify before install" at
// all decision points.

import type { InventoryItem } from './vanData';
import { itemStatus } from './vanData';

// ─── Core types ───────────────────────────────────────────────────────────────

export type PartCategory =
  | 'Compressors'
  | 'Condenser Fan Motors'
  | 'Blower Motors'
  | 'ECM Motors'
  | 'VFDs'
  | 'Ignition Controls'
  | 'Control Boards'
  | 'Economizer Boards'
  | 'Contactors'
  | 'Relays'
  | 'Transformers'
  | 'Capacitors'
  | 'Pressure Switches'
  | 'Sensors / Thermistors'
  | 'Flame Sensors'
  | 'Ignitors'
  | 'Gas Valves'
  | 'Belts'
  | 'Bearings'
  | 'Pulleys / Sheaves'
  | 'Filters'
  | 'Drain Parts'
  | 'Refrigerant Components'
  | 'TXVs / EEVs'
  | 'Solenoids'
  | 'Actuators'
  | 'Dampers'
  | 'Fuses'
  | 'Wire / Terminals'
  | 'Hardware'
  | 'Cleaning Chemicals'
  | 'Refrigerant'
  | 'Miscellaneous';

/** An individual input field required or optional for a part record. */
export interface SpecField {
  key:          string;
  label:        string;
  placeholder?: string;
  unit?:        string;
  type:         'text' | 'number' | 'select';
  options?:     string[];
  critical?:    boolean;    // if true, warn when empty before saving
}

/** A photo the technician should capture for this part event. */
export interface PhotoRequirement {
  label:    string;
  timing:   'before' | 'during' | 'after' | 'any';
  required: boolean;
  note?:    string;
}

/** A measurement the technician should capture related to this part. */
export interface MeasurementRequirement {
  label:    string;
  unit:     string;
  timing:   'before' | 'during' | 'after' | 'any';
  required: boolean;
  note?:    string;
}

/** Full definition of a part type in the UnitDown Parts Intelligence system. */
export interface PartTypeDefinition {
  partType:              string;
  category:              PartCategory;
  commonNames:           string[];
  requiredSpecs:         SpecField[];
  optionalSpecs:         SpecField[];
  compatibilityFields:   string[];
  safetyNotes:           string[];
  installNotes:          string[];
  commonFailureSymptoms: string[];
  requiredPhotos:        PhotoRequirement[];
  requiredMeasurements:  MeasurementRequirement[];
  inventoryTrackingUnit: 'each' | 'lbs' | 'feet' | 'roll' | 'pack' | 'box' | 'cylinder' | 'set';
  vanInventoryCategory?: string;  // maps to ItemCategory in vanData
  searchKeywords:        string[];
  oemLookupWarning?:     string;  // shown when Phase 5 lookup would be triggered
}

// ─── Equipment context (Phase 6) ─────────────────────────────────────────────

export interface EquipmentContext {
  equipmentType?: string;
  make?:          string;
  model?:         string;
  serial?:        string;
  voltage?:       string;
  phase?:         string;
  refrigerant?:   string;
  capacity?:      string;
}

export interface EquipmentPartsContext {
  estimatedBuildYear:       string | null;
  knownPartFamilies:        string[];
  recommendedSpecsToVerify: string[];
  likelyFailureParts:       string[];
  requiredLookupWarnings:   string[];
  compatibilityConfidence:  'high' | 'medium' | 'low' | 'none';
  confidenceNotes:          string[];
}

// ─── Van inventory match (Phase 7) ───────────────────────────────────────────

export type VanMatchStatus =
  | 'in-stock'
  | 'low-stock'
  | 'out-of-stock'
  | 'possible-substitute'
  | 'not-stocked'
  | 'verify-before-install';

export interface VanInventoryMatch {
  status:               VanMatchStatus;
  itemId?:              string;
  itemName?:            string;
  qty?:                 number;
  missingVerifications: string[];
  note:                 string;
}

// ─── Online lookup placeholder (Phase 5) ─────────────────────────────────────

export interface OnlineLookupResult {
  connected:              false;
  message:                string;
  futureFields: {
    supplier:                string;
    price:                   number;
    availability:            string;
    pickupTimeMin:           number;
    shippingTimeDays:        number;
    oemMatchConfidence:      'exact' | 'probable' | 'unknown';
    universalCompatibility:  'confirmed' | 'probable' | 'verify';
    sourceUrl:               string;
  };
}

export const ONLINE_LOOKUP_PLACEHOLDER: OnlineLookupResult = {
  connected: false,
  message:   'Exact OEM part matching not connected yet. Verify with manufacturer parts lookup.',
  futureFields: {
    supplier: '', price: 0, availability: '', pickupTimeMin: 0,
    shippingTimeDays: 0, oemMatchConfidence: 'unknown',
    universalCompatibility: 'verify', sourceUrl: '',
  },
};

// ─── Parts Master Database ────────────────────────────────────────────────────
// Every entry is authored from real commercial HVAC field knowledge.
// OEM part numbers are NEVER hardcoded here — technician must verify.

export const PARTS_MASTER: Record<string, PartTypeDefinition> = {

  'Condenser Fan Motor': {
    partType: 'Condenser Fan Motor', category: 'Condenser Fan Motors',
    commonNames: ['condenser motor', 'condenser fan', 'outdoor fan motor', 'OFM'],
    vanInventoryCategory: 'Motors',
    inventoryTrackingUnit: 'each',
    searchKeywords: ['motor', 'condenser', 'fan', 'outdoor', 'OFM', 'rooftop fan'],
    requiredSpecs: [
      { key: 'hp',           label: 'Horsepower (HP)',    type: 'select',  options: ['1/6', '1/4', '1/3', '1/2', '3/4', '1', '1.5'], critical: true },
      { key: 'voltage',      label: 'Voltage',            type: 'select',  options: ['115V', '208/230V', '460V', '575V'],           critical: true },
      { key: 'phase',        label: 'Phase',              type: 'select',  options: ['1-Phase', '3-Phase'],                         critical: true },
      { key: 'rpm',          label: 'RPM',                type: 'select',  options: ['825', '1075', '1100', '1625'],                critical: true },
      { key: 'rotation',     label: 'Rotation (shaft end)', type: 'select', options: ['CW', 'CCW'],                                 critical: true },
      { key: 'shaft_dia',    label: 'Shaft Diameter',     type: 'select',  options: ['1/2"', '5/8"', '3/4"'],                      critical: true },
      { key: 'mount',        label: 'Mount Type',         type: 'select',  options: ['Belly-band', 'Stud-mount', 'Cradle'],         critical: false },
      { key: 'cap_mfd',      label: 'Capacitor (µF)',     type: 'number',  unit: 'µF',  placeholder: 'e.g. 5',                     critical: false },
    ],
    optionalSpecs: [
      { key: 'frame',        label: 'Frame',              type: 'select',  options: ['48', '56', '56Z', '42'] },
      { key: 'oem_part',     label: 'OEM Part Number',    type: 'text',    placeholder: 'From unit nameplate or service manual' },
      { key: 'brand',        label: 'Replacement Brand',  type: 'text',    placeholder: 'e.g. Genteq, AO Smith, Fasco' },
    ],
    compatibilityFields: ['HP', 'Voltage', 'Phase', 'RPM', 'Rotation', 'Shaft diameter', 'Mount type'],
    safetyNotes: [
      'Disconnect and lock out / tag out before removal.',
      'Verify capacitor µF rating — most condenser fan motors require a separate run capacitor.',
      'Confirm rotation direction with blade pitch — wrong rotation pushes air wrong way.',
    ],
    installNotes: [
      'Match HP, RPM, voltage, and rotation exactly before installing.',
      'Belly-band mount: measure motor OD, not just HP rating.',
      'Run motor at startup — verify airflow direction and amp draw.',
      'Label old wiring before removing from motor terminals.',
    ],
    commonFailureSymptoms: [
      'High head pressure with condenser fan not spinning',
      'Fan spins but motor is hot to touch / trips overload',
      'Fan motor hums but will not start (capacitor related)',
      'Intermittent cooling loss — fan stops under high ambient',
    ],
    requiredPhotos: [
      { label: 'Old motor nameplate',         timing: 'before', required: true,  note: 'Capture HP, voltage, RPM, rotation, frame' },
      { label: 'Wiring before disconnection', timing: 'before', required: true,  note: 'Photo wiring colors and terminal labels' },
      { label: 'Motor installed',             timing: 'after',  required: true },
      { label: 'Amp draw at startup',         timing: 'after',  required: false, note: 'Clamp meter on L1 with motor running' },
    ],
    requiredMeasurements: [
      { label: 'Voltage at motor terminals',   unit: 'V',  timing: 'before', required: true,  note: 'Measure before condemning motor' },
      { label: 'Amp draw after install',       unit: 'A',  timing: 'after',  required: true,  note: 'Compare to motor FLA nameplate' },
      { label: 'Head pressure after 10 min',  unit: 'psi', timing: 'after', required: false, note: 'Confirm condenser heat rejection improving' },
    ],
    oemLookupWarning: 'OEM motor matching not connected. Cross-reference HP, voltage, RPM, rotation, and frame with your supplier catalog. Do not install without verifying all critical specs.',
  },

  'Blower Motor (PSC)': {
    partType: 'Blower Motor (PSC)', category: 'Blower Motors',
    commonNames: ['blower motor', 'indoor fan motor', 'PSC motor', 'evaporator fan motor', 'IFM'],
    vanInventoryCategory: 'Motors',
    inventoryTrackingUnit: 'each',
    searchKeywords: ['blower', 'PSC', 'indoor', 'evaporator', 'fan motor', 'air handler', 'AHU motor'],
    requiredSpecs: [
      { key: 'hp',        label: 'Horsepower (HP)',      type: 'select', options: ['1/6', '1/4', '1/3', '1/2', '3/4', '1', '1.5', '2', '3'], critical: true },
      { key: 'voltage',   label: 'Voltage',              type: 'select', options: ['115V', '208/230V', '460V'], critical: true },
      { key: 'speeds',    label: 'Speeds',               type: 'select', options: ['1', '2', '3', '4'],        critical: true },
      { key: 'rpm',       label: 'Full Speed RPM',       type: 'select', options: ['900', '1075', '1100', '1625'], critical: true },
      { key: 'rotation',  label: 'Rotation',             type: 'select', options: ['CW', 'CCW'],               critical: true },
      { key: 'shaft_dia', label: 'Shaft Diameter',       type: 'select', options: ['1/2"', '5/8"', '3/4"', '1"'], critical: false },
    ],
    optionalSpecs: [
      { key: 'frame',    label: 'Frame',                 type: 'select', options: ['48', '56', '56Z', '42'] },
      { key: 'oem_part', label: 'OEM Part Number',       type: 'text',   placeholder: 'From unit nameplate or service manual' },
      { key: 'cap_mfd',  label: 'Capacitor Required (µF)', type: 'number', unit: 'µF', placeholder: 'e.g. 7.5' },
    ],
    compatibilityFields: ['HP', 'Voltage', 'Speeds', 'RPM', 'Rotation'],
    safetyNotes: [
      'Disconnect and lock out / tag out before removal.',
      'Multi-speed motors: label every speed tap wire before disconnecting.',
    ],
    installNotes: [
      'Match all speed tap wires to original wiring diagram.',
      'Check belt alignment if belt-drive application.',
      'Verify amp draw on all speeds after install.',
    ],
    commonFailureSymptoms: [
      'No airflow from supply registers', 'Blower only runs on some speeds',
      'Loud humming from air handler', 'Motor trips overload intermittently',
    ],
    requiredPhotos: [
      { label: 'Old motor nameplate',         timing: 'before', required: true },
      { label: 'Wiring diagram / harness',    timing: 'before', required: true, note: 'All speed taps must be documented' },
      { label: 'Installed motor',             timing: 'after',  required: true },
    ],
    requiredMeasurements: [
      { label: 'Amp draw (high speed)',       unit: 'A',  timing: 'after', required: true },
      { label: 'Voltage at motor terminals',  unit: 'V',  timing: 'before', required: true },
    ],
    oemLookupWarning: 'Exact OEM matching not connected. Verify HP, voltage, speeds, and rotation with supplier before ordering.',
  },

  'ECM Motor': {
    partType: 'ECM Motor', category: 'ECM Motors',
    commonNames: ['ECM', 'variable speed blower', 'X13 motor', 'Evergreen', 'Genteq ECM'],
    vanInventoryCategory: 'Motors',
    inventoryTrackingUnit: 'each',
    searchKeywords: ['ECM', 'variable speed', 'Evergreen', 'X13', 'Genteq', 'Regal-Beloit', 'VS motor'],
    requiredSpecs: [
      { key: 'oem_board', label: 'OEM Module / Part Number', type: 'text', placeholder: 'Critical — ECMs are model-specific', critical: true },
      { key: 'voltage',   label: 'Supply Voltage',           type: 'select', options: ['115V', '208/230V', '277V', '460V'], critical: true },
      { key: 'platform',  label: 'ECM Platform',             type: 'select', options: ['Genteq / Regal-Beloit', 'Evergreen (drop-in)', 'OEM-specific', 'Unknown'], critical: true },
    ],
    optionalSpecs: [
      { key: 'hp',      label: 'HP', type: 'select', options: ['1/3', '1/2', '3/4', '1', '1.5', '2'] },
      { key: 'cfm',     label: 'Airflow (CFM)', type: 'number', unit: 'CFM' },
    ],
    compatibilityFields: ['OEM Part Number', 'ECM Platform', 'Voltage'],
    safetyNotes: [
      'ECM motors are largely OEM-specific. Installing wrong module causes damage.',
      'Do not install without confirming part number with manufacturer or service manual.',
      'Disconnect power before removing — ECM modules store charge briefly after shutoff.',
    ],
    installNotes: [
      'ECM module and motor are often sold separately — confirm you have both.',
      '"Drop-in" Evergreen types require programming tap-plug for CFM setting.',
      'Never force connector — ECM harnesses are keyed and fragile.',
    ],
    commonFailureSymptoms: [
      'Blower does not run despite 24V signal at terminal',
      'Blower runs at wrong speed or hunts',
      'Communication fault codes on thermostat or control board',
    ],
    requiredPhotos: [
      { label: 'Old ECM module label',         timing: 'before', required: true,  note: 'Part number, revision, and connector layout' },
      { label: 'Harness connector orientation', timing: 'before', required: true },
      { label: 'Module installed',              timing: 'after',  required: true },
    ],
    requiredMeasurements: [
      { label: '24V signal at control input',   unit: 'V',  timing: 'before', required: true },
      { label: 'Supply voltage at motor',       unit: 'V',  timing: 'before', required: true },
      { label: 'Amp draw at full speed',        unit: 'A',  timing: 'after',  required: true },
    ],
    oemLookupWarning: 'ECM motors require exact OEM matching. Universal replacements (Evergreen, X13) are available for some platforms but require technician verification. Exact OEM lookup not connected — verify with manufacturer.',
  },

  'Compressor': {
    partType: 'Compressor', category: 'Compressors',
    commonNames: ['compressor', 'reciprocating compressor', 'scroll compressor', 'rotary compressor'],
    inventoryTrackingUnit: 'each',
    searchKeywords: ['compressor', 'scroll', 'reciprocating', 'rotary', 'comp'],
    requiredSpecs: [
      { key: 'tonnage',    label: 'Tonnage / Capacity',   type: 'text',   placeholder: 'e.g. 7.5 Ton',  critical: true },
      { key: 'voltage',    label: 'Voltage',              type: 'select', options: ['115V', '208/230V', '460V', '575V'], critical: true },
      { key: 'phase',      label: 'Phase',                type: 'select', options: ['1-Phase', '3-Phase'], critical: true },
      { key: 'refrigerant',label: 'Refrigerant',          type: 'select', options: ['R-410A', 'R-22', 'R-407C', 'R-448A', 'R-454B'], critical: true },
      { key: 'oem_part',   label: 'OEM Part Number',      type: 'text',   placeholder: 'From nameplate or service manual', critical: true },
      { key: 'compressor_type', label: 'Compressor Type', type: 'select', options: ['Scroll', 'Reciprocating', 'Rotary', 'Screw'], critical: false },
    ],
    optionalSpecs: [
      { key: 'brand',   label: 'Brand',         type: 'text', placeholder: 'e.g. Copeland, Carrier, Trane' },
      { key: 'model',   label: 'Compressor Model', type: 'text', placeholder: 'From compressor nameplate' },
      { key: 'oil_type',label: 'Oil Type',      type: 'select', options: ['POE 32', 'POE 68', 'Alkylbenzene', 'Mineral'] },
    ],
    compatibilityFields: ['Tonnage', 'Voltage', 'Phase', 'Refrigerant', 'OEM Part Number'],
    safetyNotes: [
      'EPA 608 certification required — recover all refrigerant before removal.',
      'Compressors must be replaced in the off-cycle only.',
      'Install new filter-drier whenever compressor is replaced.',
      'Flush system if compressor burned out — contamination will destroy replacement.',
    ],
    installNotes: [
      'Add oil charge per manufacturer specs for refrigerant type and compressor model.',
      'Replace filter-drier, sight glass, and check for acid if burnout confirmed.',
      'Leak test all connections to 300–500 psi before evacuation.',
      'Triple evacuate and hold vacuum to 250 microns minimum before charging.',
    ],
    commonFailureSymptoms: [
      'Compressor locked out — no amp draw', 'Compressor trips breaker on start',
      'System runs but no cooling — compressor spinning but not pumping',
      'Loud grinding or clattering noise from compressor',
    ],
    requiredPhotos: [
      { label: 'Compressor nameplate',              timing: 'before', required: true },
      { label: 'Old compressor terminals / wiring', timing: 'before', required: true },
      { label: 'Refrigerant recovery in progress',  timing: 'during', required: true },
      { label: 'New filter-drier',                  timing: 'after',  required: true },
      { label: 'Micron gauge reading (evacuation)', timing: 'after',  required: true },
      { label: 'Compressor installed',              timing: 'after',  required: true },
    ],
    requiredMeasurements: [
      { label: 'Suction pressure before',   unit: 'psi', timing: 'before', required: true },
      { label: 'Head pressure before',      unit: 'psi', timing: 'before', required: true },
      { label: 'Motor winding resistance',  unit: 'Ω',   timing: 'before', required: true, note: 'C-S, C-R, R-S — compare to spec' },
      { label: 'Acid test result',          unit: '',    timing: 'before', required: true },
      { label: 'Micron level (evacuation)', unit: 'µm',  timing: 'during', required: true, note: 'Target: 250 microns or lower, stable' },
      { label: 'Amp draw after startup',    unit: 'A',   timing: 'after',  required: true },
      { label: 'Suction pressure after',    unit: 'psi', timing: 'after',  required: true },
      { label: 'Superheat after',           unit: '°F',  timing: 'after',  required: true },
    ],
    oemLookupWarning: 'Exact OEM compressor matching not connected. Confirm model and serial with manufacturer parts lookup before ordering. Never order compressor by tonnage alone.',
  },

  'Contactor': {
    partType: 'Contactor', category: 'Contactors',
    commonNames: ['contactor', '2-pole contactor', '3-pole contactor', 'compressor contactor'],
    vanInventoryCategory: 'Contactors',
    inventoryTrackingUnit: 'each',
    searchKeywords: ['contactor', '2-pole', '3-pole', 'compressor', 'contacts', 'pitting', 'arcing'],
    requiredSpecs: [
      { key: 'poles',      label: 'Poles',            type: 'select', options: ['2-Pole', '3-Pole', '4-Pole'],          critical: true },
      { key: 'amps',       label: 'Amp Rating',       type: 'select', options: ['20A', '25A', '30A', '40A', '50A', '60A', '75A'], critical: true },
      { key: 'coil_v',    label: 'Coil Voltage',      type: 'select', options: ['24V', '208V', '230V', '460V', '480V'], critical: true },
    ],
    optionalSpecs: [
      { key: 'brand',     label: 'Brand',             type: 'text', placeholder: 'e.g. Honeywell, Siemens, White-Rodgers' },
      { key: 'oem_part',  label: 'OEM Part Number',   type: 'text', placeholder: 'Optional — universal replaces most' },
    ],
    compatibilityFields: ['Poles', 'Amp rating', 'Coil voltage'],
    safetyNotes: [
      'Lock out / tag out before replacing — line voltage on top contacts.',
      'Do not attempt to clean pitted contacts — replace.',
    ],
    installNotes: [
      'Verify coil voltage before installing — 24V and 208V models look identical.',
      'Inspect wiring insulation — pitted contacts cause heat damage to adjacent wires.',
    ],
    commonFailureSymptoms: [
      'Compressor or fan not energizing despite thermostat call',
      'Visible arcing or burnt smell at contactor',
      'Contacts pitted or fused (unit will not shut off)',
    ],
    requiredPhotos: [
      { label: 'Old contactor (contact face)', timing: 'before', required: true, note: 'Document pitting / arcing damage' },
      { label: 'Wiring layout',               timing: 'before', required: true },
      { label: 'New contactor installed',      timing: 'after',  required: true },
    ],
    requiredMeasurements: [
      { label: '24V coil voltage (thermostat Y call)', unit: 'V', timing: 'before', required: true },
      { label: 'Voltage across open contacts (L1–T1)', unit: 'V', timing: 'before', required: false, note: 'Confirms contacts not fused' },
    ],
    oemLookupWarning: 'Universal contactors fit most applications. Confirm poles, amps, and coil voltage only — OEM part number not required.',
  },

  'Capacitor': {
    partType: 'Capacitor', category: 'Capacitors',
    commonNames: ['capacitor', 'dual run cap', 'run cap', 'dual capacitor', 'start cap', 'motor start capacitor'],
    vanInventoryCategory: 'Capacitors',
    inventoryTrackingUnit: 'each',
    searchKeywords: ['capacitor', 'cap', 'run', 'start', 'dual', 'MFD', 'µF', 'round', 'oval'],
    requiredSpecs: [
      { key: 'type',    label: 'Capacitor Type',    type: 'select', options: ['Dual Run', 'Single Run', 'Start'], critical: true },
      { key: 'mfd_run', label: 'Run µF (main)',      type: 'text', placeholder: 'e.g. 35',   unit: 'µF', critical: true },
      { key: 'mfd_sec', label: 'Second µF (fan)',    type: 'text', placeholder: 'e.g. 5 (dual cap only)', unit: 'µF', critical: false },
      { key: 'voltage', label: 'Voltage Rating',    type: 'select', options: ['370V', '440V', '370/440V'], critical: true },
    ],
    optionalSpecs: [
      { key: 'old_reading', label: 'Old Cap Reading (measured)', type: 'text', placeholder: 'e.g. 31 µF (spec 35 µF)', unit: 'µF' },
    ],
    compatibilityFields: ['µF rating', 'Voltage rating', 'Type (run/start/dual)'],
    safetyNotes: [
      'Discharge capacitor before touching terminals — use discharge resistor tool.',
      'Even when unit is off, capacitors can hold dangerous charge.',
    ],
    installNotes: [
      'Match µF ratings exactly. ±5% is acceptable, never go lower for run caps.',
      '440V can replace 370V (higher rating is always safe), not vice versa.',
      'Record old capacitor reading before discarding for the service record.',
    ],
    commonFailureSymptoms: [
      'Motor hums but does not start', 'Motor starts hard / slowly',
      'Capacitor visually bulging or leaking', 'Low µF reading on meter',
    ],
    requiredPhotos: [
      { label: 'Old capacitor label', timing: 'before', required: true, note: 'Capture full µF / voltage ratings' },
      { label: 'Old capacitor condition', timing: 'before', required: false, note: 'Show any bulging or oil leakage' },
      { label: 'New capacitor installed', timing: 'after', required: true },
    ],
    requiredMeasurements: [
      { label: 'Old capacitor reading', unit: 'µF', timing: 'before', required: true, note: 'Measure with capacitance meter before removing' },
      { label: 'New capacitor reading', unit: 'µF', timing: 'after',  required: false, note: 'Optional verification of new cap' },
    ],
    oemLookupWarning: 'Universal capacitors fit all standard commercial HVAC. Match µF rating and voltage only.',
  },

  'Control Board': {
    partType: 'Control Board', category: 'Control Boards',
    commonNames: ['control board', 'circuit board', 'IFC', 'integrated furnace control', 'main board', 'PCB'],
    vanInventoryCategory: 'Controls',
    inventoryTrackingUnit: 'each',
    searchKeywords: ['control board', 'circuit board', 'IFC', 'PCB', 'main board', 'furnace control', 'RTU board'],
    requiredSpecs: [
      { key: 'oem_board', label: 'OEM Board Number', type: 'text', placeholder: 'From old board, nameplate, or service manual', critical: true },
      { key: 'unit_model', label: 'Unit Model Number', type: 'text', placeholder: 'Required — board is model-specific', critical: true },
      { key: 'unit_serial', label: 'Unit Serial Number', type: 'text', placeholder: 'Required for warranty and record', critical: true },
      { key: 'voltage',    label: 'Control Voltage',   type: 'select', options: ['24V', '120V', '208V', '240V'], critical: true },
    ],
    optionalSpecs: [
      { key: 'dip_sw',  label: 'DIP Switch Settings', type: 'text', placeholder: 'Document from old board before removal' },
      { key: 'revision',label: 'Board Revision',       type: 'text', placeholder: 'e.g. Rev. C, if shown on board' },
    ],
    compatibilityFields: ['OEM Board Number', 'Unit Model', 'Control voltage'],
    safetyNotes: [
      'Lock out / tag out before replacement — line voltage feeds board.',
      'Control boards are static-sensitive — ground yourself before handling.',
      'Document all DIP switch settings before removing old board.',
    ],
    installNotes: [
      'Transfer DIP switch settings from old board to new board.',
      'Confirm board part number matches service manual — not just visual similarity.',
      'After install: clear fault codes and run through full cycle test.',
    ],
    commonFailureSymptoms: [
      'Unit will not energize any outputs despite inputs present',
      'Random or repeated fault codes after verifying other components',
      'Burnt areas or failed relay on board (visible damage)',
    ],
    requiredPhotos: [
      { label: 'Old board (full face)',     timing: 'before', required: true,  note: 'DIP switches and all connector positions' },
      { label: 'Old board (wiring layout)', timing: 'before', required: true,  note: 'All harness connectors before removal' },
      { label: 'New board installed',       timing: 'after',  required: true },
    ],
    requiredMeasurements: [
      { label: '24V at R-C (thermostat)', unit: 'V', timing: 'before', required: true },
      { label: 'Transformer secondary',   unit: 'V', timing: 'before', required: true, note: 'Confirm transformer ok before blaming board' },
    ],
    oemLookupWarning: 'Control boards require exact OEM part number. Visual similarity is not sufficient. Verify part number with manufacturer lookup — not connected yet.',
  },

  'Gas Valve': {
    partType: 'Gas Valve', category: 'Gas Valves',
    commonNames: ['gas valve', 'combination gas valve', 'redundant gas valve'],
    inventoryTrackingUnit: 'each',
    searchKeywords: ['gas valve', 'combination', 'redundant', 'Honeywell VR', 'gas', 'NG', 'LP'],
    requiredSpecs: [
      { key: 'gas_type',  label: 'Gas Type',          type: 'select', options: ['Natural Gas (NG)', 'Propane (LP)'],         critical: true },
      { key: 'voltage',   label: 'Valve Voltage',      type: 'select', options: ['24V', '120V'],                             critical: true },
      { key: 'stages',    label: 'Stages',             type: 'select', options: ['1-Stage', '2-Stage', 'Modulating'],        critical: true },
      { key: 'inlet_psi', label: 'Inlet Gas Pressure', type: 'number', unit: 'in-WC', placeholder: 'Measure with manometer', critical: true },
      { key: 'oem_part',  label: 'OEM Part Number',    type: 'text',   placeholder: 'From valve or service manual',          critical: false },
    ],
    optionalSpecs: [
      { key: 'outlet_psi', label: 'Outlet / Manifold Pressure', type: 'number', unit: 'in-WC', placeholder: 'NG: ~3.5, LP: ~10' },
      { key: 'pipe_size',  label: 'Pipe Connection Size',        type: 'select', options: ['1/2"', '3/4"', '1"'] },
    ],
    compatibilityFields: ['Gas type', 'Voltage', 'Stages', 'Inlet pressure', 'Pipe size'],
    safetyNotes: [
      'Shut off gas at manual service valve before removing.',
      'CO monitor active during and after replacement.',
      'Pressure test all joints with soap solution after install.',
      'Never use open flame to check for gas leaks.',
    ],
    installNotes: [
      'Apply pipe thread sealant rated for gas service — not standard Teflon tape on LP.',
      'Verify inlet and manifold pressure with manometer after install.',
      'Allow full heat cycle test — observe ignition sequence and flame signal.',
    ],
    commonFailureSymptoms: [
      'No ignition — ignitor glows but valve does not open',
      'Lockout on "no flame" with good flame sensor',
      'Low gas pressure at burner manifold',
    ],
    requiredPhotos: [
      { label: 'Old valve (full view)',      timing: 'before', required: true },
      { label: 'Piping configuration',       timing: 'before', required: true },
      { label: 'Pressure test with soap',    timing: 'after',  required: true },
      { label: 'Flame observed on first call', timing: 'after', required: true },
    ],
    requiredMeasurements: [
      { label: 'Inlet gas pressure (static)', unit: 'in-WC', timing: 'before', required: true },
      { label: 'Inlet gas pressure (running)', unit: 'in-WC', timing: 'after', required: true },
      { label: 'Manifold pressure',           unit: 'in-WC', timing: 'after', required: true },
      { label: 'Valve coil voltage (Y call)', unit: 'V',      timing: 'before', required: true },
    ],
    oemLookupWarning: 'Gas valve selection requires matching gas type, inlet pressure, and stages. OEM lookup not connected — verify with manufacturer service manual.',
  },

  'Transformer': {
    partType: 'Transformer', category: 'Transformers',
    commonNames: ['control transformer', '24V transformer', 'step-down transformer'],
    vanInventoryCategory: 'Transformers',
    inventoryTrackingUnit: 'each',
    searchKeywords: ['transformer', 'xfmr', '24V', 'control voltage', '40VA', '75VA'],
    requiredSpecs: [
      { key: 'va',         label: 'VA Rating',         type: 'select', options: ['20VA', '40VA', '50VA', '75VA', '100VA'],         critical: true },
      { key: 'primary',    label: 'Primary Voltage',   type: 'select', options: ['120V', '208V', '230V', '208/230V', '460V'],      critical: true },
      { key: 'secondary',  label: 'Secondary Voltage', type: 'select', options: ['24V', '12V'],                                   critical: true },
    ],
    optionalSpecs: [
      { key: 'fused',  label: 'Internal Fuse?', type: 'select', options: ['Yes', 'No', 'Unknown'] },
    ],
    compatibilityFields: ['VA rating', 'Primary voltage', 'Secondary voltage'],
    safetyNotes: ['Lock out / tag out — line voltage feeds primary.', 'Check secondary for short before installing — shorted secondary destroys transformer.'],
    installNotes: ['Verify no short circuit on secondary (24V circuit) before energizing new transformer.'],
    commonFailureSymptoms: ['No 24V in system', 'Transformer hot to touch', 'Fuse blown immediately on 24V circuit'],
    requiredPhotos: [
      { label: 'Old transformer label', timing: 'before', required: true },
      { label: 'New transformer installed', timing: 'after', required: true },
    ],
    requiredMeasurements: [
      { label: 'Primary voltage at input',   unit: 'V', timing: 'before', required: true },
      { label: 'Secondary voltage (new)',    unit: 'V', timing: 'after',  required: true },
    ],
    oemLookupWarning: 'Universal transformers match by VA rating and primary/secondary voltage only.',
  },

  'Pressure Switch': {
    partType: 'Pressure Switch', category: 'Pressure Switches',
    commonNames: ['pressure switch', 'high-pressure switch', 'low-pressure switch', 'HP/LP switch', 'draft pressure switch'],
    vanInventoryCategory: 'Pressure Switches',
    inventoryTrackingUnit: 'each',
    searchKeywords: ['pressure switch', 'high pressure', 'low pressure', 'HP', 'LP', 'lockout', 'safety', 'draft'],
    requiredSpecs: [
      { key: 'type',    label: 'Switch Type',      type: 'select', options: ['High Pressure', 'Low Pressure', 'Dual Pressure', 'Draft / Inducer'], critical: true },
      { key: 'setpoint',label: 'Set Point',        type: 'text',   placeholder: 'e.g. 610 psi open / 490 psi close', unit: 'psi', critical: true },
      { key: 'reset',   label: 'Reset Type',       type: 'select', options: ['Auto Reset', 'Manual Reset'],           critical: true },
      { key: 'oem_part',label: 'OEM Part Number',  type: 'text',   placeholder: 'From old switch or service manual',  critical: false },
    ],
    optionalSpecs: [
      { key: 'connection', label: 'Connection Size', type: 'select', options: ['1/4" SAE', '3/8" SAE', 'Flare', 'Schrader'] },
    ],
    compatibilityFields: ['Type (HP/LP)', 'Set point', 'Reset type', 'Refrigerant compatibility'],
    safetyNotes: ['Recover refrigerant before removing — switch is in refrigerant circuit.', 'Verify switch is actually failed, not tripped due to actual system fault.'],
    installNotes: ['Verify root cause of pressure condition before replacing switch — switch failure is uncommon.', 'Leak check switch connection after install.'],
    commonFailureSymptoms: ['Unit locks out on high-pressure fault', 'HP/LP switch open with no apparent cause', 'Manually reset required after every cycle'],
    requiredPhotos: [
      { label: 'Old switch label / set point', timing: 'before', required: true },
      { label: 'Switch installed',             timing: 'after',  required: true },
    ],
    requiredMeasurements: [
      { label: 'System pressure at lockout',   unit: 'psi', timing: 'before', required: true },
      { label: 'Switch continuity (old)',       unit: 'Ω',   timing: 'before', required: false, note: 'Confirm open/close at rated pressure' },
    ],
    oemLookupWarning: 'Pressure switch set points are safety-critical. Exact OEM part number required — do not substitute without verifying set point matches original.',
  },

  'Ignitor': {
    partType: 'Ignitor', category: 'Ignitors',
    commonNames: ['hot surface ignitor', 'HSI', 'silicon carbide ignitor', 'silicon nitride ignitor', 'glow ignitor'],
    inventoryTrackingUnit: 'each',
    searchKeywords: ['ignitor', 'HSI', 'hot surface', 'silicon carbide', 'silicon nitride', 'glow', 'ignition'],
    requiredSpecs: [
      { key: 'type',    label: 'Ignitor Material',  type: 'select', options: ['Silicon Carbide', 'Silicon Nitride', 'Unknown'], critical: true },
      { key: 'voltage', label: 'Voltage',           type: 'select', options: ['120V', '208/230V', '24V'],                     critical: true },
      { key: 'oem_part',label: 'OEM Part Number',   type: 'text',   placeholder: 'From old ignitor or service manual',         critical: false },
    ],
    optionalSpecs: [
      { key: 'resistance', label: 'Resistance (cold)', type: 'number', unit: 'Ω', placeholder: 'Measure before removing' },
    ],
    compatibilityFields: ['Ignitor type', 'Voltage', 'OEM Part Number'],
    safetyNotes: ['Handle silicon carbide ignitors with a cloth — skin oil causes premature failure.', 'Lock out gas and power before removal.'],
    installNotes: ['Never touch ignitor with bare hands.', 'Verify ignitor glows orange/white before first gas call.', 'Silicon nitride is more durable than silicon carbide — check for universal replacement.'],
    commonFailureSymptoms: ['Unit locks out — no ignition', 'Ignitor visible cracks or breaks', 'High resistance reading on cold ignitor (silicon carbide > 90Ω suspect)'],
    requiredPhotos: [
      { label: 'Old ignitor condition', timing: 'before', required: true, note: 'Show any cracking or damage' },
      { label: 'New ignitor installed', timing: 'after',  required: true },
      { label: 'Ignitor glowing on first call', timing: 'after', required: false },
    ],
    requiredMeasurements: [
      { label: 'Ignitor resistance (cold)', unit: 'Ω', timing: 'before', required: true, note: 'Silicon carbide 40–90Ω; silicon nitride 10–30Ω' },
      { label: 'Voltage at ignitor on call', unit: 'V', timing: 'after', required: true },
    ],
    oemLookupWarning: 'Many ignitors are OEM-specific. Universal replacements exist for common models — verify voltage and mounting before ordering.',
  },

  'Flame Sensor': {
    partType: 'Flame Sensor', category: 'Flame Sensors',
    commonNames: ['flame sensor', 'flame rod', 'rectifier', 'flame detector'],
    inventoryTrackingUnit: 'each',
    searchKeywords: ['flame sensor', 'flame rod', 'micro amp', 'rectification', 'flameout', 'sensor rod'],
    requiredSpecs: [
      { key: 'oem_part', label: 'OEM Part Number', type: 'text', placeholder: 'Most are model-specific', critical: false },
    ],
    optionalSpecs: [
      { key: 'ua_reading', label: 'Flame Signal (µA) — old sensor', type: 'number', unit: 'µA', placeholder: 'Measure while flame is active' },
    ],
    compatibilityFields: ['OEM Part Number', 'Unit Model'],
    safetyNotes: ['Always measure flame signal (µA) first — most "failed" sensors just need cleaning.', 'Lock out gas and power before removing.'],
    installNotes: ['Clean sensor rod with fine steel wool or emery cloth before replacing.', 'If µA > 1.0 after cleaning, sensor is probably ok — look for other causes.'],
    commonFailureSymptoms: ['Furnace lights then locks out after 5–10 seconds', 'Flame signal below 1.5 µA (typical spec is 2–8 µA)', 'Sensor rod visible oxidation or coating'],
    requiredPhotos: [
      { label: 'Flame sensor condition (before)', timing: 'before', required: true },
      { label: 'New sensor installed',            timing: 'after',  required: true },
    ],
    requiredMeasurements: [
      { label: 'Flame signal µA (before cleaning)', unit: 'µA', timing: 'before', required: true },
      { label: 'Flame signal µA (after cleaning)',  unit: 'µA', timing: 'before', required: true, note: 'If still < 1.0 after cleaning, replace' },
      { label: 'Flame signal µA (after install)',   unit: 'µA', timing: 'after',  required: true, note: 'Target: 2–8 µA (verify with service manual)' },
    ],
    oemLookupWarning: 'Flame sensors are highly model-specific. Verify OEM part number before ordering — universal replacements rare.',
  },

  'TXV / EEV': {
    partType: 'TXV / EEV', category: 'TXVs / EEVs',
    commonNames: ['TXV', 'thermal expansion valve', 'EEV', 'electronic expansion valve', 'metering device'],
    inventoryTrackingUnit: 'each',
    searchKeywords: ['TXV', 'expansion valve', 'EEV', 'metering', 'thermostatic', 'TEV'],
    requiredSpecs: [
      { key: 'refrigerant', label: 'Refrigerant',      type: 'select', options: ['R-410A', 'R-22', 'R-407C', 'R-448A'], critical: true },
      { key: 'tonnage',     label: 'Tonnage / Capacity', type: 'text', placeholder: 'e.g. 7.5 Ton',                    critical: true },
      { key: 'type',        label: 'Type',             type: 'select', options: ['TXV (thermostatic)', 'EEV (electronic)'], critical: true },
      { key: 'oem_part',   label: 'OEM Part Number',   type: 'text', placeholder: 'From valve or service manual',      critical: false },
    ],
    optionalSpecs: [
      { key: 'conn_in',  label: 'Liquid Line Connection', type: 'select', options: ['1/4"', '3/8"', '1/2"', '5/8"', '7/8"'] },
      { key: 'conn_out', label: 'Suction Line Connection', type: 'select', options: ['1/2"', '5/8"', '7/8"', '1-1/8"'] },
    ],
    compatibilityFields: ['Refrigerant', 'Tonnage', 'Connection sizes'],
    safetyNotes: ['Recover refrigerant before opening system.', 'Nitrogen purge when brazing — never braze with refrigerant in system.'],
    installNotes: ['Braze in nitrogen flow to prevent oxidation.', 'Install bulb per manufacturer orientation — typically suction line at 4-5 o\'clock position.', 'Pressure test, evacuate, and verify superheat after install.'],
    commonFailureSymptoms: ['High superheat despite good refrigerant charge', 'Flooding — very low superheat, liquid in suction line', 'Hunting superheat / unstable system'],
    requiredPhotos: [
      { label: 'Old valve',         timing: 'before', required: true },
      { label: 'Bulb orientation',  timing: 'before', required: true },
      { label: 'Valve installed',   timing: 'after',  required: true },
      { label: 'Bulb installed',    timing: 'after',  required: true },
    ],
    requiredMeasurements: [
      { label: 'Superheat before',  unit: '°F', timing: 'before', required: true },
      { label: 'Subcooling before', unit: '°F', timing: 'before', required: true },
      { label: 'Superheat after',   unit: '°F', timing: 'after',  required: true, note: 'Verify 8–12°F or per equipment spec' },
    ],
    oemLookupWarning: 'TXV/EEV selection is refrigerant-specific and tonnage-critical. Exact OEM lookup not connected — verify with manufacturer.',
  },

  'Belt': {
    partType: 'Belt', category: 'Belts',
    commonNames: ['drive belt', 'V-belt', 'cogged belt', 'poly belt', 'AHU belt'],
    vanInventoryCategory: 'Belts',
    inventoryTrackingUnit: 'each',
    searchKeywords: ['belt', 'V-belt', 'cogged', 'sheave', 'pulleys', 'AHU', 'air handler belt', '3VX', 'A-belt', 'B-belt'],
    requiredSpecs: [
      { key: 'belt_num', label: 'Belt Number / Size', type: 'text', placeholder: 'e.g. A-40, 3VX425, B-65', critical: true },
      { key: 'type',     label: 'Belt Type',         type: 'select', options: ['A (classical)', 'B (classical)', 'C (classical)', '3VX (cogged)', '5VX (cogged)', 'SPC (metric)', 'Poly-V'], critical: false },
    ],
    optionalSpecs: [
      { key: 'brand',    label: 'Brand',             type: 'text', placeholder: 'e.g. Gates, Goodyear, Dayco' },
      { key: 'qty',      label: 'Quantity',          type: 'number', placeholder: 'e.g. 1 or 2 (matched set)' },
    ],
    compatibilityFields: ['Belt number', 'Belt type', 'Width', 'Length'],
    safetyNotes: ['Lock out / tag out before removing belt.', 'Never pry belt onto sheave — loosen motor mount to install.'],
    installNotes: ['Replace belts in matched sets if multiple belts.', 'Check sheave alignment and condition — worn sheaves destroy belts.', 'Tension per manufacturer spec — over-tensioning damages bearings.'],
    commonFailureSymptoms: ['Squealing at startup', 'Belt slipping under load', 'Visible cracking, fraying, or glazing on belt', 'Vibration from blower section'],
    requiredPhotos: [
      { label: 'Old belt condition', timing: 'before', required: true },
      { label: 'Belt number (old)',  timing: 'before', required: true },
      { label: 'Belt installed',     timing: 'after',  required: true },
    ],
    requiredMeasurements: [
      { label: 'Belt tension (deflection)', unit: 'in', timing: 'after', required: false, note: 'Typically 1/2"–1" deflection at midspan under 5 lbs force' },
      { label: 'Blower RPM after',          unit: 'RPM', timing: 'after', required: false },
    ],
    oemLookupWarning: 'Belts are universal — match belt number from old belt or sheave drive plate. OEM lookup not required.',
  },

  'Filter': {
    partType: 'Filter', category: 'Filters',
    commonNames: ['air filter', 'return air filter', 'MERV filter', 'pleated filter', 'media filter'],
    vanInventoryCategory: 'Filters',
    inventoryTrackingUnit: 'each',
    searchKeywords: ['filter', 'MERV', 'air filter', 'pleated', 'media', 'return air', 'filtration'],
    requiredSpecs: [
      { key: 'size',    label: 'Filter Size (W × H × D)',  type: 'text', placeholder: 'e.g. 20 × 24 × 2', critical: true },
      { key: 'merv',    label: 'MERV Rating',              type: 'select', options: ['MERV 8', 'MERV 11', 'MERV 13', 'MERV 15', 'MERV 16', 'HEPA equivalent'], critical: false },
    ],
    optionalSpecs: [
      { key: 'type',  label: 'Filter Type',  type: 'select', options: ['Pleated', 'Fiberglass', 'Electrostatic', 'Media / Box filter', 'HEPA', 'Carbon'] },
      { key: 'brand', label: 'Brand',        type: 'text', placeholder: 'e.g. Flanders, Filtrete, American Air Filter' },
    ],
    compatibilityFields: ['Size (W × H × D)', 'MERV rating'],
    safetyNotes: ['Increasing MERV too high can restrict airflow and damage equipment — verify static pressure tolerance.'],
    installNotes: ['Note airflow direction arrow on filter frame — install in correct direction.', 'Log filter replacement date and MERV rating for PM record.'],
    commonFailureSymptoms: ['High static pressure', 'Low airflow', 'Dirty evaporator coil (filter bypassed or oversized MERV)'],
    requiredPhotos: [
      { label: 'Dirty filter (before)', timing: 'before', required: false, note: 'Document condition for customer report' },
      { label: 'New filter installed',  timing: 'after',  required: false },
    ],
    requiredMeasurements: [
      { label: 'Static pressure (after)', unit: 'in-WG', timing: 'after', required: false, note: 'If high static pressure was the complaint' },
    ],
    oemLookupWarning: 'Filters are universal — match by size and MERV rating only.',
  },

  'Relay': {
    partType: 'Relay', category: 'Relays',
    commonNames: ['relay', 'fan relay', 'time-delay relay', 'sequencer relay', 'DPDT relay', 'SPDT relay'],
    vanInventoryCategory: 'Relays',
    inventoryTrackingUnit: 'each',
    searchKeywords: ['relay', 'fan relay', 'time delay', 'sequencer', 'DPDT', 'SPDT', '24V relay'],
    requiredSpecs: [
      { key: 'coil_v',  label: 'Coil Voltage',  type: 'select', options: ['24V', '120V', '208V', '230V'], critical: true },
      { key: 'type',    label: 'Relay Type',    type: 'select', options: ['SPDT', 'DPDT', 'SPST', 'Time-delay', 'Sequencer'], critical: true },
      { key: 'rating',  label: 'Contact Rating', type: 'text',  placeholder: 'e.g. 20A 240V', critical: false },
    ],
    optionalSpecs: [
      { key: 'delay',   label: 'Delay Time (if time-delay)', type: 'select', options: ['30-sec', '1-min', '2-min', '3-min', '5-min', 'Adjustable'] },
      { key: 'oem_part',label: 'OEM Part Number',            type: 'text', placeholder: 'From old relay or service manual' },
    ],
    compatibilityFields: ['Coil voltage', 'Contact rating', 'Relay type'],
    safetyNotes: ['Lock out / tag out before replacing.'],
    installNotes: ['Verify coil voltage before installing.', 'For time-delay relays: set delay per service manual specification.'],
    commonFailureSymptoms: ['Output device not energizing despite input signal', 'Relay clicks but output contacts not closing', 'Relay coil hums but plunger not pulling in'],
    requiredPhotos: [
      { label: 'Old relay label',       timing: 'before', required: true },
      { label: 'New relay installed',   timing: 'after',  required: true },
    ],
    requiredMeasurements: [
      { label: 'Coil voltage at relay (signal)', unit: 'V', timing: 'before', required: true },
      { label: 'Output voltage after install',   unit: 'V', timing: 'after',  required: true },
    ],
    oemLookupWarning: 'Universal relays match by coil voltage and contact rating. OEM number not required for most applications.',
  },

  'Ignition Control': {
    partType: 'Ignition Control', category: 'Ignition Controls',
    commonNames: ['ignition control board', 'IFC', 'ignition module', 'gas furnace control'],
    inventoryTrackingUnit: 'each',
    searchKeywords: ['ignition control', 'IFC', 'furnace control', 'ignition module', 'HSI control'],
    requiredSpecs: [
      { key: 'oem_part',   label: 'OEM Part Number', type: 'text', placeholder: 'Critical — ignition controls are model-specific', critical: true },
      { key: 'voltage',    label: 'Control Voltage', type: 'select', options: ['24V', '120V'], critical: true },
      { key: 'ignition_type', label: 'Ignition Type', type: 'select', options: ['Hot Surface (HSI)', 'Direct Spark (DSI)', 'Intermittent Pilot (IPI)'], critical: true },
    ],
    optionalSpecs: [
      { key: 'unit_model', label: 'Unit Model', type: 'text', placeholder: 'Required to source correct board' },
    ],
    compatibilityFields: ['OEM Part Number', 'Ignition type', 'Control voltage'],
    safetyNotes: ['Lock out gas and power before removing.', 'Ground yourself — static damage destroys ignition controls.'],
    installNotes: ['Verify ignitor type matches control (HSI vs. DSI).', 'Run full ignition cycle test and verify flame signal µA.'],
    commonFailureSymptoms: ['No ignition attempt despite thermostat call', 'Fault code for ignition lockout on control', 'Ignitor glows but no valve opening'],
    requiredPhotos: [
      { label: 'Old control label',   timing: 'before', required: true },
      { label: 'Wiring layout',       timing: 'before', required: true },
      { label: 'New control installed', timing: 'after', required: true },
    ],
    requiredMeasurements: [
      { label: '24V at control input', unit: 'V', timing: 'before', required: true },
      { label: 'Flame signal µA',      unit: 'µA', timing: 'after', required: true },
    ],
    oemLookupWarning: 'Ignition controls require exact OEM part match. Do not substitute by visual similarity. OEM lookup not connected.',
  },

  'Fuse': {
    partType: 'Fuse', category: 'Fuses',
    commonNames: ['fuse', 'control fuse', 'circuit fuse', 'cartridge fuse', 'AGC fuse', 'MDA fuse', 'FRN fuse'],
    vanInventoryCategory: 'Fuses',
    inventoryTrackingUnit: 'each',
    searchKeywords: ['fuse', 'AGC', 'MDA', 'FRN', 'time delay', 'fast blow', 'cartridge', '3A', '5A', 'MDL'],
    requiredSpecs: [
      { key: 'amps',   label: 'Amperage Rating', type: 'text',   placeholder: 'e.g. 3A, 5A, 15A',         critical: true },
      { key: 'type',   label: 'Fuse Type',       type: 'select', options: ['AGC (glass tube fast-blow)', 'MDL (glass tube slow-blow)', 'MDA (ceramic slow-blow)', 'FRN (Class RK5 slow-blow)', 'FRS (Class RK1 fast-blow)', 'Other'], critical: true },
      { key: 'voltage',label: 'Voltage Rating',  type: 'select', options: ['32V', '120V', '250V', '500V', '600V'], critical: false },
    ],
    optionalSpecs: [
      { key: 'size', label: 'Physical Size', type: 'select', options: ['1/4" × 1"', '1/4" × 1-1/4"', '13/32" × 1-1/2"', 'Other'] },
    ],
    compatibilityFields: ['Amperage', 'Fuse type', 'Voltage rating'],
    safetyNotes: ['Never bypass a blown fuse — find the cause before replacing.', 'Never replace with a higher-rated fuse.'],
    installNotes: ['Verify cause of blown fuse before replacing.', 'Replace with exact amperage and type.'],
    commonFailureSymptoms: ['Control circuit dead', 'Specific component not energizing', 'Fuse visibly blown'],
    requiredPhotos: [
      { label: 'Blown fuse', timing: 'before', required: false, note: 'Document failed fuse for service record' },
    ],
    requiredMeasurements: [
      { label: 'Fuse continuity (old)', unit: 'Ω', timing: 'before', required: true, note: 'Confirm open fuse, not control issue' },
    ],
    oemLookupWarning: 'Fuses are universal — match amperage and fuse type exactly. Never upsize.',
  },

  'VFD': {
    partType: 'VFD', category: 'VFDs',
    commonNames: ['VFD', 'variable frequency drive', 'inverter drive', 'adjustable speed drive', 'ASD'],
    vanInventoryCategory: 'Controls',
    inventoryTrackingUnit: 'each',
    searchKeywords: ['VFD', 'variable frequency', 'inverter', 'drive', 'ASD', 'motor drive', 'speed control'],
    requiredSpecs: [
      { key: 'hp',      label: 'Motor HP',       type: 'select', options: ['1/4', '1/3', '1/2', '3/4', '1', '1.5', '2', '3', '5', '7.5', '10', '15', '20'], critical: true },
      { key: 'voltage', label: 'Input Voltage',  type: 'select', options: ['115V 1φ', '208/230V 1φ', '208/230V 3φ', '460V 3φ', '575V 3φ'],  critical: true },
      { key: 'oem_part',label: 'OEM Part Number',type: 'text',   placeholder: 'From nameplate or service manual',    critical: false },
    ],
    optionalSpecs: [
      { key: 'brand',     label: 'Brand',       type: 'text', placeholder: 'e.g. Danfoss, Schneider, AutomationDirect' },
      { key: 'parameter', label: 'Programming Profile', type: 'text', placeholder: 'Document parameter set from old drive' },
    ],
    compatibilityFields: ['HP', 'Input voltage', 'Output phase'],
    safetyNotes: ['VFDs store charge — wait 5 minutes after power off before opening enclosure.', 'Verify input/output voltage before replacing.'],
    installNotes: ['Transfer all programming parameters from old drive.', 'Verify motor nameplate matches VFD output rating.', 'Run auto-tune sequence per manufacturer if available.'],
    commonFailureSymptoms: ['Drive faults and will not restart', 'Motor runs erratically or trips on overload', 'Drive display blank or frozen'],
    requiredPhotos: [
      { label: 'Old drive nameplate / part number', timing: 'before', required: true },
      { label: 'Drive installed',                   timing: 'after',  required: true },
    ],
    requiredMeasurements: [
      { label: 'Input voltage at drive', unit: 'V', timing: 'before', required: true },
      { label: 'Motor amp draw after',   unit: 'A', timing: 'after',  required: true },
    ],
    oemLookupWarning: 'VFDs require exact HP and voltage matching. OEM part lookup not connected — verify with drive manufacturer.',
  },

  'Bearing': {
    partType: 'Bearing', category: 'Bearings',
    commonNames: ['pillow block bearing', 'bearing', 'ball bearing', 'shaft bearing', 'flanged bearing'],
    vanInventoryCategory: 'Bearings',
    inventoryTrackingUnit: 'each',
    searchKeywords: ['bearing', 'pillow block', 'shaft', 'vibration', 'seized', 'AHU bearing'],
    requiredSpecs: [
      { key: 'bore',  label: 'Bore Size (shaft diameter)', type: 'select', options: ['1/2"', '9/16"', '5/8"', '3/4"', '7/8"', '1"', '1-1/8"', '1-1/4"', '1-3/16"'], critical: true },
      { key: 'type',  label: 'Bearing Type',              type: 'select', options: ['Pillow block (UCFL)', 'Flanged (UCFL)', 'Take-up frame', 'Mounted ball bearing'], critical: true },
    ],
    optionalSpecs: [
      { key: 'brand',     label: 'Brand',          type: 'text', placeholder: 'e.g. Browning, Dodge, Rexnord' },
      { key: 'lube_type', label: 'Grease Type',    type: 'select', options: ['NLGI 2 general purpose', 'High-temp grease', 'Food-grade'] },
    ],
    compatibilityFields: ['Bore size', 'Bearing type', 'Housing style'],
    safetyNotes: ['Lock out / tag out before removing.', 'Wear eye protection — seized bearings may shatter.'],
    installNotes: ['Align bearing with shaft before tightening set screws.', 'Grease before startup and after running 15 minutes.', 'Check alignment and vibration after install.'],
    commonFailureSymptoms: ['Grinding / screeching from AHU', 'Blower shaft wobbly', 'Excessive vibration under load'],
    requiredPhotos: [
      { label: 'Failed bearing', timing: 'before', required: true },
      { label: 'Bearing installed', timing: 'after', required: true },
    ],
    requiredMeasurements: [
      { label: 'Vibration level (after install)', unit: 'in/s', timing: 'after', required: false, note: 'Use vibration meter if available' },
    ],
    oemLookupWarning: 'Bearings are universal — match bore size and housing type. No OEM lookup needed.',
  },

  'Refrigerant': {
    partType: 'Refrigerant', category: 'Refrigerant',
    commonNames: ['refrigerant', 'R-410A', 'R-22', 'R-407C', 'R-448A', 'R-454B', 'freon', 'charge'],
    vanInventoryCategory: 'Refrigerant',
    inventoryTrackingUnit: 'lbs',
    searchKeywords: ['refrigerant', 'charge', 'R-410A', 'R-22', 'freon', 'lbs', 'recharge', 'recover'],
    requiredSpecs: [
      { key: 'type',    label: 'Refrigerant Type',     type: 'select', options: ['R-410A', 'R-22', 'R-407C', 'R-448A', 'R-454B', 'R-134a', 'R-32', 'Other'], critical: true },
      { key: 'lbs_added',label: 'Amount Added (lbs)',  type: 'number', unit: 'lbs', placeholder: 'e.g. 0.75',                                            critical: true },
      { key: 'superheat',label: 'Target Superheat',    type: 'number', unit: '°F',  placeholder: 'Per manufacturer spec',                                critical: false },
    ],
    optionalSpecs: [
      { key: 'leak_found', label: 'Leak Found?',        type: 'select', options: ['Yes — location noted', 'No leak found', 'Suspected slow leak'] },
      { key: 'leak_loc',   label: 'Leak Location',      type: 'text',   placeholder: 'e.g. Schrader core, flare fitting, evaporator' },
    ],
    compatibilityFields: ['Refrigerant type', 'System refrigerant from nameplate'],
    safetyNotes: [
      'EPA Section 608 certification required to purchase and handle.',
      'Never mix refrigerant types — match nameplate exactly.',
      'R-22 is illegal to vent — recover and reclaim.',
    ],
    installNotes: [
      'Never add refrigerant without diagnosing charge level (superheat/subcooling method).',
      'If undercharged — find and fix the leak. Charging without repair is a temporary fix.',
      'Document total weight added for service record.',
    ],
    commonFailureSymptoms: ['High superheat', 'Low suction pressure', 'Ice on suction line'],
    requiredPhotos: [
      { label: 'Pressure gauges while charging', timing: 'during', required: true },
    ],
    requiredMeasurements: [
      { label: 'Suction pressure',  unit: 'psi', timing: 'before', required: true },
      { label: 'Superheat before',  unit: '°F',  timing: 'before', required: true },
      { label: 'Subcooling before', unit: '°F',  timing: 'before', required: true },
      { label: 'Suction pressure after',  unit: 'psi', timing: 'after', required: true },
      { label: 'Superheat after',         unit: '°F',  timing: 'after', required: true },
      { label: 'Subcooling after',        unit: '°F',  timing: 'after', required: true },
    ],
    oemLookupWarning: 'Refrigerant type must match nameplate exactly. No substitution without OEM authorization.',
  },

  'Cleaning Chemical': {
    partType: 'Cleaning Chemical', category: 'Cleaning Chemicals',
    commonNames: ['coil cleaner', 'Nu-Brite', 'foam cleaner', 'no-rinse cleaner', 'drain cleaner', 'degreaser'],
    vanInventoryCategory: 'Chemicals',
    inventoryTrackingUnit: 'each',
    searchKeywords: ['cleaner', 'chemical', 'Nu-Brite', 'foam', 'coil', 'drain', 'degreaser', 'sanitizer'],
    requiredSpecs: [
      { key: 'product',  label: 'Product Name',       type: 'text',   placeholder: 'e.g. Nu-Brite, Foam Gun Ready', critical: true },
      { key: 'applied_to',label: 'Applied To',        type: 'select', options: ['Condenser coil', 'Evaporator coil', 'Drain pan', 'Drain line', 'Blower wheel', 'Other'], critical: true },
    ],
    optionalSpecs: [
      { key: 'qty_used', label: 'Quantity Used', type: 'number', unit: 'oz/can' },
    ],
    compatibilityFields: ['Surface material (aluminum vs. copper)', 'Application type'],
    safetyNotes: ['Wear PPE — coil cleaners are caustic.', 'Protect wiring, electrical components, and painted surfaces from acid-based cleaners.'],
    installNotes: ['Allow proper dwell time before rinsing.', 'No-rinse products must still be applied carefully to avoid drain backup.'],
    commonFailureSymptoms: ['Fouled condenser reducing heat rejection', 'Dirty evaporator restricting airflow or causing freeze-up'],
    requiredPhotos: [
      { label: 'Coil before cleaning', timing: 'before', required: true },
      { label: 'Coil after cleaning',  timing: 'after',  required: true },
    ],
    requiredMeasurements: [
      { label: 'Head pressure before', unit: 'psi', timing: 'before', required: false },
      { label: 'Head pressure after',  unit: 'psi', timing: 'after',  required: false, note: 'Confirm heat rejection improved after condenser cleaning' },
    ],
    oemLookupWarning: 'Select product based on coil material and fouling type. Check manufacturer SDS for compatibility.',
  },

  'Sensor / Thermistor': {
    partType: 'Sensor / Thermistor', category: 'Sensors / Thermistors',
    commonNames: ['thermistor', 'temperature sensor', 'outdoor air sensor', 'return air sensor', 'discharge sensor', 'NTC thermistor'],
    vanInventoryCategory: 'Sensors',
    inventoryTrackingUnit: 'each',
    searchKeywords: ['sensor', 'thermistor', 'NTC', 'temperature', 'OAT sensor', 'RAT sensor', 'discharge temp'],
    requiredSpecs: [
      { key: 'sensor_type', label: 'Sensor Type',     type: 'select', options: ['Outdoor Air (OAT)', 'Return Air (RAT)', 'Supply Air (SAT)', 'Discharge Line', 'Mixed Air', 'Duct Temp', 'Leaving Water', 'Entering Water', 'Other'], critical: true },
      { key: 'oem_part',    label: 'OEM Part Number', type: 'text',   placeholder: 'Most are model-specific',  critical: false },
    ],
    optionalSpecs: [
      { key: 'resistance', label: 'Resistance at 77°F (25°C)', type: 'number', unit: 'Ω', placeholder: 'e.g. 10kΩ typical' },
    ],
    compatibilityFields: ['Sensor type', 'Resistance curve (NTC)', 'OEM Part Number'],
    safetyNotes: [],
    installNotes: ['Verify resistance curve matches OEM spec — NTC sensors are not interchangeable by type alone.', 'Mount in same location as original — avoid heat sources or drafts.'],
    commonFailureSymptoms: ['Fault code for sensor open or short', 'Economizer control erratic', 'Unit cycling on or off at wrong temperatures'],
    requiredPhotos: [
      { label: 'Old sensor location', timing: 'before', required: true },
      { label: 'New sensor installed', timing: 'after', required: true },
    ],
    requiredMeasurements: [
      { label: 'Sensor resistance at known temp', unit: 'Ω', timing: 'before', required: true, note: 'Compare to OEM resistance table' },
      { label: 'Sensor reading after install',    unit: '°F', timing: 'after', required: true, note: 'Compare to a reference thermometer' },
    ],
    oemLookupWarning: 'Sensors are OEM-specific — resistance curves vary between manufacturers. Exact part lookup not connected.',
  },

  'Solenoid Valve': {
    partType: 'Solenoid Valve', category: 'Solenoids',
    commonNames: ['solenoid valve', 'liquid line solenoid', 'EEV solenoid', 'reversing valve solenoid'],
    inventoryTrackingUnit: 'each',
    searchKeywords: ['solenoid', 'liquid line', 'valve solenoid', 'coil solenoid'],
    requiredSpecs: [
      { key: 'voltage',  label: 'Coil Voltage',     type: 'select', options: ['24V', '120V', '208/230V'], critical: true },
      { key: 'fluid',    label: 'Fluid / Service',  type: 'select', options: ['Refrigerant', 'Water', 'Air', 'Glycol'], critical: true },
      { key: 'port',     label: 'Port Size',        type: 'select', options: ['1/4"', '3/8"', '1/2"', '3/4"', '1"'], critical: false },
    ],
    optionalSpecs: [
      { key: 'oem_part', label: 'OEM Part Number', type: 'text', placeholder: 'From valve body label' },
    ],
    compatibilityFields: ['Coil voltage', 'Port size', 'Refrigerant type'],
    safetyNotes: ['Recover refrigerant if in refrigerant circuit.', 'Verify coil voltage — wrong voltage burns coil.'],
    installNotes: ['Check flow direction arrow on valve body.', 'Test open/closed after install with a call signal.'],
    commonFailureSymptoms: ['Valve stuck closed — no flow on energize', 'Coil burned out — no 24V draw'],
    requiredPhotos: [
      { label: 'Old solenoid label', timing: 'before', required: true },
      { label: 'Solenoid installed', timing: 'after',  required: true },
    ],
    requiredMeasurements: [
      { label: 'Coil voltage at energize', unit: 'V', timing: 'before', required: true },
    ],
    oemLookupWarning: 'Solenoid valves may be OEM-specific. Verify coil voltage and port size before ordering universal replacement.',
  },

  'Economizer Board': {
    partType: 'Economizer Board', category: 'Economizer Boards',
    commonNames: ['economizer board', 'economizer controller', 'econ controller', 'outside air controller'],
    inventoryTrackingUnit: 'each',
    searchKeywords: ['economizer', 'econ', 'outside air', 'OAT controller', 'economizer board'],
    requiredSpecs: [
      { key: 'oem_part',   label: 'OEM Part Number', type: 'text', placeholder: 'From board or service manual', critical: true },
      { key: 'unit_model', label: 'Unit Model',      type: 'text', placeholder: 'Board is model-specific',      critical: true },
      { key: 'dip_sw',     label: 'DIP Switch Settings', type: 'text', placeholder: 'Document from old board', critical: true },
    ],
    optionalSpecs: [
      { key: 'strategy',  label: 'Control Strategy', type: 'select', options: ['Fixed dry-bulb', 'Differential dry-bulb', 'Enthalpy', 'Differential enthalpy'] },
    ],
    compatibilityFields: ['OEM Part Number', 'Unit Model', 'Control strategy'],
    safetyNotes: ['Lock out / tag out before removing.', 'Document all wiring and DIP settings before removal.'],
    installNotes: ['Transfer DIP switch settings from old board exactly.', 'Run full economizer cycle test — verify damper full open and full close on command.'],
    commonFailureSymptoms: ['Economizer damper not responding', 'Fault code for economizer on control board', 'Damper stuck open causing high humidity'],
    requiredPhotos: [
      { label: 'Old board (DIP switches visible)', timing: 'before', required: true },
      { label: 'Wiring layout',                   timing: 'before', required: true },
      { label: 'New board installed',              timing: 'after',  required: true },
    ],
    requiredMeasurements: [
      { label: 'OAT sensor reading',  unit: '°F', timing: 'after', required: true },
      { label: 'Damper position signal', unit: 'V', timing: 'after', required: false, note: '0–10V or 2–10V per board spec' },
    ],
    oemLookupWarning: 'Economizer boards are OEM-specific. Visual similarity is not sufficient — verify OEM part number.',
  },

  'Actuator': {
    partType: 'Actuator', category: 'Actuators',
    commonNames: ['actuator', 'damper actuator', 'valve actuator', 'modulating actuator', 'spring return actuator'],
    inventoryTrackingUnit: 'each',
    searchKeywords: ['actuator', 'damper drive', 'Belimo', 'Johnson Controls actuator', 'modulating', 'spring return'],
    requiredSpecs: [
      { key: 'voltage',    label: 'Supply Voltage',   type: 'select', options: ['24V', '120V', '230V'],    critical: true },
      { key: 'signal',     label: 'Control Signal',   type: 'select', options: ['On/Off', '0–10V', '2–10V', '4–20mA', 'Floating (3-wire)'], critical: true },
      { key: 'torque',     label: 'Torque (in-lb)',   type: 'text',   placeholder: 'e.g. 35, 70, 133',    critical: false },
      { key: 'fail_pos',   label: 'Fail Position',    type: 'select', options: ['Fail closed', 'Fail open', 'Fail last position', 'Spring return'], critical: true },
    ],
    optionalSpecs: [
      { key: 'brand',    label: 'Brand',              type: 'text', placeholder: 'e.g. Belimo, Siemens, Johnson Controls' },
      { key: 'oem_part', label: 'OEM Part Number',   type: 'text' },
    ],
    compatibilityFields: ['Supply voltage', 'Control signal type', 'Torque', 'Fail position'],
    safetyNotes: ['Verify fail position before install — critical for safety in economizer and heating applications.'],
    installNotes: ['Verify shaft coupling size and engagement.', 'Calibrate actuator range after install (0% and 100% positions).'],
    commonFailureSymptoms: ['Damper not modulating', 'Actuator gear strip (grinding noise)', 'Fault code for actuator feedback error'],
    requiredPhotos: [
      { label: 'Old actuator label', timing: 'before', required: true },
      { label: 'Actuator installed', timing: 'after',  required: true },
    ],
    requiredMeasurements: [
      { label: 'Control signal (mA or V)', unit: '', timing: 'after', required: true, note: 'Verify actuator responds to full range signal' },
    ],
    oemLookupWarning: 'Actuator selection depends on torque, signal type, and fail position. Universal replacements available from Belimo and others — verify compatibility.',
  },

  'Drain Parts': {
    partType: 'Drain Parts', category: 'Drain Parts',
    commonNames: ['condensate drain', 'drain pan', 'float switch', 'drain line', 'trap', 'condensate pump'],
    vanInventoryCategory: 'Drain Parts',
    inventoryTrackingUnit: 'each',
    searchKeywords: ['drain', 'condensate', 'float switch', 'drain pan', 'clog', 'overflow', 'condensate pump'],
    requiredSpecs: [
      { key: 'part_type', label: 'Part Type', type: 'select', options: ['Float switch', 'Condensate pump', 'Drain pan replacement', 'Drain line / tubing', 'P-trap / trap primer', 'Other'], critical: true },
    ],
    optionalSpecs: [
      { key: 'connection', label: 'Connection Size', type: 'select', options: ['3/4"', '1"', '1-1/4"', '1-1/2"', '2"'] },
    ],
    compatibilityFields: ['Part type', 'Connection size'],
    safetyNotes: ['Algae treatment appropriate for HVAC drain pans — do not over-dose.'],
    installNotes: ['Float switches: test shutoff before leaving — water overflows cause extensive property damage.', 'Flush drain line after clearing — verify full flow through condensate line.'],
    commonFailureSymptoms: ['Drain pan overflow', 'Condensate backup — unit flooding', 'Algae plugging drain line', 'Float switch shutting unit off'],
    requiredPhotos: [
      { label: 'Drain pan condition', timing: 'before', required: true },
      { label: 'Drain clear (water flowing)', timing: 'after', required: false },
    ],
    requiredMeasurements: [],
    oemLookupWarning: 'Drain parts are universal — match part type and connection size.',
  },

  'Hardware': {
    partType: 'Hardware', category: 'Hardware',
    commonNames: ['screws', 'bolts', 'nuts', 'washers', 'anchors', 'standoffs', 'vibration isolators', 'sheet metal screws'],
    vanInventoryCategory: 'Screws / Hardware',
    inventoryTrackingUnit: 'each',
    searchKeywords: ['hardware', 'screws', 'bolts', 'nuts', 'washers', 'anchors', 'isolators'],
    requiredSpecs: [
      { key: 'description', label: 'Description', type: 'text', placeholder: 'e.g. #10-16 × 3/4" hex head SMS, qty 6', critical: true },
    ],
    optionalSpecs: [],
    compatibilityFields: [],
    safetyNotes: [],
    installNotes: ['Use proper torque — over-tightening sheet metal screws strips housing.'],
    commonFailureSymptoms: [],
    requiredPhotos: [],
    requiredMeasurements: [],
    oemLookupWarning: 'Hardware is universal — match thread pitch, length, and head style.',
  },

  'Wire / Terminals': {
    partType: 'Wire / Terminals', category: 'Wire / Terminals',
    commonNames: ['wire', 'terminals', 'heat shrink', 'connectors', 'wire nuts', 'butt connectors', 'ring terminals'],
    vanInventoryCategory: 'Wire / Terminals',
    inventoryTrackingUnit: 'feet',
    searchKeywords: ['wire', 'terminals', 'heat shrink', 'connector', 'pigtail', 'butt splice', 'ring terminal'],
    requiredSpecs: [
      { key: 'gauge',    label: 'Wire Gauge (AWG)',  type: 'select', options: ['18 AWG', '16 AWG', '14 AWG', '12 AWG', '10 AWG'], critical: false },
      { key: 'type',     label: 'Type',              type: 'select', options: ['Thermostat wire', 'Low-voltage control', 'Line voltage', 'High-temp silicone', 'Coaxial'], critical: false },
      { key: 'terminal', label: 'Terminal Type',     type: 'select', options: ['Wire nut', 'Heat shrink butt connector', 'Ring terminal', 'Spade terminal', 'High-temp push-on'], critical: false },
    ],
    optionalSpecs: [],
    compatibilityFields: ['Wire gauge', 'Temperature rating'],
    safetyNotes: ['Never use electrical tape alone on control circuits — use proper connectors or heat shrink.'],
    installNotes: ['Route wire away from heat sources.', 'Secure wire with proper strain relief.'],
    commonFailureSymptoms: ['Intermittent faults from chafed wire', 'Failed connection causing open in control circuit'],
    requiredPhotos: [],
    requiredMeasurements: [],
    oemLookupWarning: 'Wiring materials are universal — match gauge, insulation rating, and connector type.',
  },

  'Pulley / Sheave': {
    partType: 'Pulley / Sheave', category: 'Pulleys / Sheaves',
    commonNames: ['sheave', 'pulley', 'V-belt pulley', 'adjustable sheave', 'blower sheave', 'motor sheave'],
    inventoryTrackingUnit: 'each',
    searchKeywords: ['sheave', 'pulley', 'drive', 'adjustable', 'motor sheave', 'blower sheave', 'RPM'],
    requiredSpecs: [
      { key: 'bore',    label: 'Bore Size',         type: 'select', options: ['1/2"', '5/8"', '3/4"', '7/8"', '1"', '1-1/8"', '1-1/4"', '1-3/8"', '1-7/16"'], critical: true },
      { key: 'od',      label: 'Outside Diameter',  type: 'text',   placeholder: 'e.g. 4.5"',    unit: '"', critical: true },
      { key: 'grooves', label: 'Number of Grooves', type: 'select', options: ['1', '2', '3'],    critical: false },
      { key: 'type',    label: 'Fixed or Adjustable', type: 'select', options: ['Fixed', 'Adjustable (variable pitch)'], critical: false },
    ],
    optionalSpecs: [
      { key: 'belt_type', label: 'Belt Type (matched)',  type: 'select', options: ['A', 'B', '3V', '5V', 'SPC'] },
    ],
    compatibilityFields: ['Bore size', 'Groove number', 'Belt type'],
    safetyNotes: ['Lock out / tag out before removing.', 'Check sheave for groove wear — worn grooves destroy new belts.'],
    installNotes: ['Align sheaves before tensioning belt.', 'Check alignment with straight edge after install.', 'Adjustable sheaves: record turns-from-closed for air balancing.'],
    commonFailureSymptoms: ['Belt slipping despite correct tension', 'Visible wear in V-groove', 'Vibration from drive system'],
    requiredPhotos: [
      { label: 'Old sheave (groove condition)', timing: 'before', required: true },
      { label: 'Sheave installed + alignment',  timing: 'after',  required: true },
    ],
    requiredMeasurements: [
      { label: 'Blower RPM after', unit: 'RPM', timing: 'after', required: false },
    ],
    oemLookupWarning: 'Sheaves are universal — match bore, OD, and number of grooves to belt type.',
  },

  'Damper': {
    partType: 'Damper', category: 'Dampers',
    commonNames: ['damper', 'outside air damper', 'exhaust damper', 'return air damper', 'zone damper', 'bypass damper'],
    inventoryTrackingUnit: 'each',
    searchKeywords: ['damper', 'OA damper', 'exhaust', 'zone', 'motorized damper', 'blade', 'economizer damper'],
    requiredSpecs: [
      { key: 'type',    label: 'Damper Type',    type: 'select', options: ['Outside Air (OA)', 'Return Air (RA)', 'Exhaust', 'Zone', 'Bypass', 'Volume Control (VCD)'], critical: true },
      { key: 'size',    label: 'Damper Size',    type: 'text',   placeholder: 'W × H in inches', critical: true },
      { key: 'actuation',label: 'Actuation',    type: 'select', options: ['Motor-driven', 'Spring-return', 'Manual', 'Pneumatic'], critical: true },
    ],
    optionalSpecs: [
      { key: 'fail_pos', label: 'Fail Position', type: 'select', options: ['Fail closed', 'Fail open', 'Fail last'] },
    ],
    compatibilityFields: ['Type', 'Size', 'Actuation method'],
    safetyNotes: ['OA dampers: fail-closed is required in many climate zones — verify code compliance.'],
    installNotes: ['Test full open and full close before completing job.', 'Verify blade sealing — light leakage in closed position is unacceptable on OA dampers.'],
    commonFailureSymptoms: ['OA damper stuck open — high humidity', 'Zone pressure issues', 'Economizer fault from damper position sensor'],
    requiredPhotos: [
      { label: 'Damper installed', timing: 'after', required: true },
      { label: 'Damper full open', timing: 'after', required: false },
      { label: 'Damper full close', timing: 'after', required: false },
    ],
    requiredMeasurements: [],
    oemLookupWarning: 'Dampers vary by size and application. Verify with equipment drawings before ordering.',
  },

  'Miscellaneous': {
    partType: 'Miscellaneous', category: 'Miscellaneous',
    commonNames: ['misc', 'miscellaneous', 'other material', 'service material', 'consumable'],
    inventoryTrackingUnit: 'each',
    searchKeywords: ['misc', 'other', 'miscellaneous', 'consumable', 'material'],
    requiredSpecs: [
      { key: 'description', label: 'Description', type: 'text', placeholder: 'Describe the part or material used', critical: true },
    ],
    optionalSpecs: [
      { key: 'source', label: 'Source', type: 'select', options: ['Van stock', 'Shop stock', 'Supply house', 'Customer supplied', 'Unknown'] },
    ],
    compatibilityFields: [],
    safetyNotes: [],
    installNotes: [],
    commonFailureSymptoms: [],
    requiredPhotos: [],
    requiredMeasurements: [],
    oemLookupWarning: '',
  },
};

// ─── Helper: search parts ─────────────────────────────────────────────────────

/** Returns part types whose name, keywords, or common names match the query. */
export function searchParts(query: string): string[] {
  const q = query.toLowerCase().trim();
  if (!q) return Object.keys(PARTS_MASTER);
  return Object.entries(PARTS_MASTER)
    .filter(([type, def]) => {
      return (
        type.toLowerCase().includes(q) ||
        def.category.toLowerCase().includes(q) ||
        def.commonNames.some(n => n.toLowerCase().includes(q)) ||
        def.searchKeywords.some(k => k.toLowerCase().includes(q))
      );
    })
    .map(([type]) => type);
}

/** Returns all part types grouped by category. */
export function getPartsByCategory(): Record<PartCategory, string[]> {
  const out: Partial<Record<PartCategory, string[]>> = {};
  for (const [type, def] of Object.entries(PARTS_MASTER)) {
    if (!out[def.category]) out[def.category] = [];
    out[def.category]!.push(type);
  }
  return out as Record<PartCategory, string[]>;
}

// ─── Phase 6: Equipment context ───────────────────────────────────────────────
// This is a deterministic inference helper — NOT a real OEM lookup.
// Always disclose confidence level and require technician verification.

export function getEquipmentPartsContext(ctx: EquipmentContext): EquipmentPartsContext {
  const warnings: string[] = [];
  const notes:    string[] = [];
  let confidence: EquipmentPartsContext['compatibilityConfidence'] = 'none';
  const likelyParts: string[] = [];
  const toVerify:    string[] = [];

  // Serial-based year decode (manufacturer-specific, often undocumented)
  let estimatedBuildYear: string | null = null;
  if (ctx.serial) {
    const s = ctx.serial.trim();
    // Carrier: 4th char = decade, 5th char = year (e.g. '4321A8876' → '2021')
    if (ctx.make?.toLowerCase().includes('carrier') && s.length >= 5) {
      const decadeCode: Record<string,string> = { '4': '2020s', '3': '2010s', '2': '2000s', '1': '1990s' };
      const decade = decadeCode[s[3]];
      const yearDigit = parseInt(s[4] ?? '');
      if (decade && !isNaN(yearDigit)) {
        estimatedBuildYear = `${decade.slice(0, 3)}${yearDigit}`;
      } else {
        warnings.push('Serial decoding not verified for this Carrier model — confirm install date.');
      }
    } else {
      warnings.push(`Serial decoding not verified for "${ctx.make ?? 'this manufacturer'}". Confirm install date manually.`);
    }
  }

  // Voltage + phase → part family narrowing
  if (ctx.voltage && ctx.phase) {
    if (ctx.phase === '3-Phase') {
      toVerify.push('3-phase contactors (3-pole)', '3-phase motor windings', 'Motor direction on 3φ');
    }
    if (ctx.voltage?.includes('460')) {
      toVerify.push('460V motor verification', '460V→24V control transformer');
    }
    notes.push(`Voltage confirmed ${ctx.voltage} — verify all replacement parts match this voltage.`);
    confidence = 'medium';
  }

  // Equipment type → likely failure parts
  const eqType = (ctx.equipmentType ?? '').toLowerCase();
  if (eqType.includes('rtu') || eqType.includes('rooftop') || eqType.includes('packaged')) {
    likelyParts.push('Condenser Fan Motor', 'Capacitor', 'Contactor', 'Control Board', 'Filter');
    toVerify.push('Condenser fan rotation direction', 'Capacitor µF and voltage rating', 'Filter size');
  }
  if (eqType.includes('ahu') || eqType.includes('air handler')) {
    likelyParts.push('Blower Motor (PSC)', 'Belt', 'Bearing', 'Filter', 'Transformer');
    toVerify.push('Belt size from drive plate', 'Blower RPM', 'Motor HP and speeds');
  }
  if (eqType.includes('crac') || eqType.includes('computer room')) {
    likelyParts.push('Condenser Fan Motor', 'Relay', 'Capacitor', 'ECM Motor', 'Filter');
    toVerify.push('CRAC manufacturer service manual for part numbers', 'Downflow or upflow airflow');
  }
  if (eqType.includes('chiller')) {
    likelyParts.push('Compressor', 'Pressure Switch', 'TXV / EEV', 'Refrigerant');
    toVerify.push('Refrigerant type from nameplate', 'Compressor OEM part number');
    warnings.push('Chiller repairs require manufacturer-specific parts. OEM lookup not connected.');
  }

  // Refrigerant warnings
  if (ctx.refrigerant) {
    if (ctx.refrigerant.includes('R-22')) {
      warnings.push('R-22 system — EPA 608 required. Recovery only; recharging restricted.');
      notes.push('Parts for R-22 systems may require OEM sourcing — supply is limited.');
    }
    if (ctx.refrigerant.includes('R-410A')) {
      notes.push('R-410A system — high-pressure rated components required.');
    }
  }

  // Model parsing confidence
  if (ctx.model) {
    if (ctx.make?.toLowerCase().includes('carrier') && ctx.model.length >= 6) {
      notes.push(`Model "${ctx.model}" detected — Carrier part lookup not connected. Use manufacturer's ProductXpert or HVAC Brain for OEM parts.`);
      if (confidence === 'none') confidence = 'low';
    } else {
      notes.push(`Model parsing confidence low for "${ctx.make ?? 'unknown make'}". Verify parts with manufacturer service manual.`);
    }
  } else {
    warnings.push('No model number available — spec-based replacement only. Verify all parts before ordering.');
  }

  if (warnings.length > 0 && confidence === 'none') confidence = 'low';

  return {
    estimatedBuildYear,
    knownPartFamilies:        likelyParts,
    recommendedSpecsToVerify: toVerify,
    likelyFailureParts:       likelyParts,
    requiredLookupWarnings:   warnings,
    compatibilityConfidence:  confidence,
    confidenceNotes:          notes,
  };
}

// ─── Phase 7: Van inventory matching ─────────────────────────────────────────
// Matches a selected part type to the best available van stock.
// Never claims compatibility without technician verification.

export function matchVanInventory(
  partDef: PartTypeDefinition,
  inventory: InventoryItem[],
): VanInventoryMatch {
  const cat = partDef.vanInventoryCategory;
  const criticalSpecs = partDef.requiredSpecs
    .filter(s => s.critical)
    .map(s => s.label);

  if (!cat) {
    return {
      status: 'not-stocked',
      missingVerifications: criticalSpecs,
      note: 'This part type is not typically stocked in van. Source from shop or supply house.',
    };
  }

  const candidates = inventory.filter(item => item.category === cat);

  if (candidates.length === 0) {
    return {
      status: 'not-stocked',
      missingVerifications: criticalSpecs,
      note: `No ${cat} items in van inventory. Source from shop or supply house.`,
    };
  }

  // Prefer in-stock items
  const inStock = candidates.filter(item => itemStatus(item) !== 'missing');
  if (inStock.length > 0) {
    const best = inStock[0];
    const status = itemStatus(best);
    return {
      status:               status === 'low' ? 'low-stock' : 'in-stock',
      itemId:               best.id,
      itemName:             best.name,
      qty:                  best.qty,
      missingVerifications: criticalSpecs,
      note:                 status === 'low'
        ? `${best.name} — ${best.qty} remaining (min: ${best.minQty}). Verify specs before install.`
        : `${best.name} — ${best.qty} in van. Verify specs match unit requirements before install.`,
    };
  }

  // All out of stock — check for substitutes
  const withSubs = candidates.find(item => (item.substitutes?.length ?? 0) > 0);
  if (withSubs) {
    const sub = withSubs.substitutes![0];
    if (sub.compatible) {
      return {
        status:               'possible-substitute',
        itemId:               withSubs.id,
        itemName:             sub.name,
        qty:                  0,
        missingVerifications: criticalSpecs,
        note:                 `Possible substitute: ${sub.name}. ${sub.note} — Verify before install.`,
      };
    }
  }

  return {
    status:               'out-of-stock',
    missingVerifications: criticalSpecs,
    note:                 `All ${cat} items out of stock in van. Order from supply house or bring from shop.`,
  };
}
