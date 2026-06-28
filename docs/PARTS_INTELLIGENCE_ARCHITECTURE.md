# UnitDown Parts Intelligence Architecture

## Purpose

UnitDown Parts Intelligence gives technicians a structured, honest, knowledge-based system for logging, selecting, and tracking parts used on commercial HVAC service calls. It is **not a supplier catalog** and **never invents OEM part numbers**. It is a spec-collection and safety-guidance layer that improves service record quality and reduces return trips.

---

## North Star Goal

Every part logged in a UnitDown job should carry enough information that:
- A future technician knows exactly what was replaced and why.
- An OEM can confirm compatibility based on recorded specs.
- A facility manager can audit parts cost and frequency.
- A supply house can identify a reorder SKU without calling the tech.

---

## Phase Summary

| Phase | Status | Description |
|-------|--------|-------------|
| 1 | ✅ Built | HVAC Parts Master Database — 30+ part types with specs, photos, measurements, safety notes |
| 2 | ✅ Built | Equipment-to-Parts Matching — `getEquipmentPartsContext()` helper |
| 3 | ✅ Built | Add Part Flow — 2-step intelligent modal in Job Mode |
| 4 | ✅ Built | Manual Entry — always available, no required fields to block save |
| 5 | ✅ Placeholder | Online Replacement Lookup — "Coming Soon" button, schema defined |
| 6 | ✅ Built | Model/Serial Intelligence — `getEquipmentPartsContext()` with honest confidence levels |
| 7 | ✅ Built | Van Inventory Integration — `matchVanInventory()` links part type to current van stock |
| 8 | ✅ Partial | Service Record Integration — part events added to job timeline and `PartRecord[]` |
| 9 | ✅ Enforced | Safety / Truthfulness — language rules enforced throughout |
| 10 | 🔲 Planned | UI Placement — My Van, Equipment Detail, Restock |

---

## File Locations

| File | Purpose |
|------|---------|
| `artifacts/unitdown-ai/src/pages/jmp/partsIntelligence.ts` | Master database, types, all helper functions |
| `artifacts/unitdown-ai/src/pages/jmp/ActiveJobView.tsx` | `PartModal` — primary Add Part UI in Job Mode |
| `artifacts/unitdown-ai/src/pages/jmp/vanData.ts` | Van inventory (`INITIAL_INVENTORY`, `InventoryItem`) |
| `artifacts/unitdown-ai/src/pages/jmp/types.ts` | `PartRecord`, `ActivityType`, job state types |

---

## Phase 1 — Parts Master Database

### File
`artifacts/unitdown-ai/src/pages/jmp/partsIntelligence.ts`

### Part Categories (all 30+)

| Category | Part Types Included |
|----------|-------------------|
| Compressors | Compressor |
| Condenser Fan Motors | Condenser Fan Motor |
| Blower Motors | Blower Motor (PSC) |
| ECM Motors | ECM Motor |
| VFDs | VFD |
| Ignition Controls | Ignition Control |
| Control Boards | Control Board |
| Economizer Boards | Economizer Board |
| Contactors | Contactor |
| Relays | Relay |
| Transformers | Transformer |
| Capacitors | Capacitor |
| Pressure Switches | Pressure Switch |
| Sensors / Thermistors | Sensor / Thermistor |
| Flame Sensors | Flame Sensor |
| Ignitors | Ignitor |
| Gas Valves | Gas Valve |
| Belts | Belt |
| Bearings | Bearing |
| Pulleys / Sheaves | Pulley / Sheave |
| Filters | Filter |
| Drain Parts | Drain Parts |
| TXVs / EEVs | TXV / EEV |
| Solenoids | Solenoid Valve |
| Actuators | Actuator |
| Dampers | Damper |
| Fuses | Fuse |
| Wire / Terminals | Wire / Terminals |
| Hardware | Hardware |
| Cleaning Chemicals | Cleaning Chemical |
| Refrigerant | Refrigerant |
| Miscellaneous | Miscellaneous |

### PartTypeDefinition shape

```typescript
interface PartTypeDefinition {
  partType:              string;
  category:              PartCategory;
  commonNames:           string[];          // search aliases
  requiredSpecs:         SpecField[];       // form fields — critical ones block with warning
  optionalSpecs:         SpecField[];       // form fields — shown but not critical
  compatibilityFields:   string[];          // what must be verified before install
  safetyNotes:           string[];          // shown as amber warnings in modal
  installNotes:          string[];          // shown as informational tips
  commonFailureSymptoms: string[];          // future: used to suggest part from symptom
  requiredPhotos:        PhotoRequirement[];// photo checklist shown in modal
  requiredMeasurements:  MeasurementRequirement[];
  inventoryTrackingUnit: 'each' | 'lbs' | 'feet' | 'roll' | 'pack' | 'box' | 'cylinder' | 'set';
  vanInventoryCategory?: string;            // links to ItemCategory in vanData.ts
  searchKeywords:        string[];          // for full-text search
  oemLookupWarning?:     string;            // shown when online lookup would be triggered
}
```

---

## Phase 2 — Equipment-to-Parts Matching

### Function
```typescript
getEquipmentPartsContext(ctx: EquipmentContext): EquipmentPartsContext
```

### What it does
- Estimates build year from serial number (manufacturer-specific heuristics — disclosed as uncertain)
- Narrows likely failure parts by equipment type (RTU → condenser fan, capacitor, contactor)
- Flags refrigerant-specific warnings (R-22 recovery, R-410A high pressure)
- Returns `compatibilityConfidence: 'high' | 'medium' | 'low' | 'none'`
- Always discloses what it does not know

### Truthfulness rules
- `"Serial decoding not verified for this manufacturer. Confirm install date manually."`
- `"Model parsing confidence low. Verify parts with manufacturer service manual."`
- Never invents OEM part numbers
- All outputs require technician verification before ordering

---

## Phase 3 — Add Part Flow

### UI location
`ActiveJobView.tsx` → `PartModal` (triggered by "Log Part / Repair" button)

### Step 1 — What are you replacing?
- Search box (searches `partType`, `commonNames`, `searchKeywords`)
- Scrollable list of all matching part types
- Manual Entry fallback

### Step 2 — Smart part form
After selecting a part type, the modal shows:
1. **Equipment context card** — Make, model, type, refrigerant, voltage from `MOCK_EQUIPMENT`
2. **Van inventory match** — Calls `matchVanInventory()` to show in-stock/low/out-of-stock status
3. **Required specs form** — Dynamic fields from `partDef.requiredSpecs` with `*` for critical
4. **Required photos checklist** — `partDef.requiredPhotos.filter(p => p.required)`
5. **Safety notes** — Amber warning box from `partDef.safetyNotes`
6. **Online lookup placeholder** — "Coming Soon" button (Phase 5 hook)
7. **Notes textarea** — Free-form detail
8. **Qty stepper** — Default 1
9. **Save button** — Calls `onSave(partType, specString + notes, qty)`

### Missing specs behavior
- Critical missing specs show an amber warning before save
- Save is always allowed — missing info is noted, not blocked
- Warning text: "Missing required specs: [list]. You can save without them but they are needed for the service record."

---

## Phase 4 — Manual Entry

Always accessible from the part selector. Fields:
- Part name / description (required to save)
- Source: Van stock / Shop stock / Supply house / Customer supplied / Unknown
- Notes
- Quantity

No spec fields are shown in manual mode. The technician is responsible for all spec documentation.

---

## Phase 5 — Online Replacement Lookup (Placeholder)

### Current state
A "Search Replacement Online" button is shown in the part form step. It is disabled with a "Coming Soon" label.

### Future integration target
```typescript
interface OnlineLookupResult {
  supplier:               string;  // e.g. "Ferguson HVAC", "Grainger", "Johnstone"
  price:                  number;
  availability:           'In Stock' | 'Low Stock' | 'Out of Stock' | 'Special Order';
  pickupTimeMin:          number;
  shippingTimeDays:       number;
  oemMatchConfidence:     'exact' | 'probable' | 'unknown';
  universalCompatibility: 'confirmed' | 'probable' | 'verify';
  sourceUrl:              string;
}
```

Planned supplier integrations:
- Manufacturer lookup (Carrier ProductXpert, Lennox ProParts, Trane Parts Advisor)
- Grainger
- Johnstone Supply
- Ferguson HVAC
- Internal company stock
- Google search fallback (unverified — clearly labeled)

---

## Phase 6 — Model/Serial Intelligence

### Function
`getEquipmentPartsContext(ctx: EquipmentContext): EquipmentPartsContext`

### Serial decode status

| Manufacturer | Decode Status |
|-------------|--------------|
| Carrier | Partial — decade/year from positions 4–5 |
| Trane | Not implemented |
| Lennox | Not implemented |
| York | Not implemented |
| Daikin | Not implemented |
| All others | "Serial decoding not verified" |

### Confidence levels

| Confidence | Meaning |
|-----------|---------|
| `'high'` | Make, model, serial, voltage, phase all present and decoded |
| `'medium'` | Voltage and phase known; model present |
| `'low'` | Partial data; heuristic suggestions only |
| `'none'` | No equipment data available |

---

## Phase 7 — Van Inventory Integration

### Function
`matchVanInventory(partDef, inventory): VanInventoryMatch`

### Van match status codes

| Status | Meaning | Display color |
|--------|---------|---------------|
| `'in-stock'` | Part category has stock in van; verify specs before install | Green |
| `'low-stock'` | Stock present but below minimum | Amber |
| `'out-of-stock'` | Part category in van but quantity = 0 | Red |
| `'possible-substitute'` | Compatible substitute available per `SubstituteItem` | Blue |
| `'not-stocked'` | Part category not tracked in van at all | Gray |
| `'verify-before-install'` | Stock found but critical specs are missing | Amber |

### Category mapping (partsIntelligence → vanData)

| Part Type | `vanInventoryCategory` |
|-----------|----------------------|
| Condenser Fan Motor | `'Motors'` |
| Blower Motor | `'Motors'` |
| ECM Motor | `'Motors'` |
| Contactor | `'Contactors'` |
| Relay | `'Relays'` |
| Transformer | `'Transformers'` |
| Capacitor | `'Capacitors'` |
| Control Board | `'Controls'` |
| Pressure Switch | `'Pressure Switches'` |
| Sensor / Thermistor | `'Sensors'` |
| Belt | `'Belts'` |
| Bearing | `'Bearings'` |
| Filter | `'Filters'` |
| Fuse | `'Fuses'` |
| Refrigerant | `'Refrigerant'` |
| Drain Parts | `'Drain Parts'` |
| Cleaning Chemical | `'Chemicals'` |
| Wire / Terminals | `'Wire / Terminals'` |
| Hardware | `'Screws / Hardware'` |
| VFD | `'Controls'` |
| Compressor | _(not typically van-stocked)_ |
| Gas Valve | _(not typically van-stocked)_ |
| TXV / EEV | _(not typically van-stocked)_ |

---

## Phase 8 — Service Record Integration

When a part is saved from the modal:
- `ADD_PART` action dispatches `PartRecord` to prototype state
- `ADD_ACTIVITY` adds a `type: 'part'` event to the job timeline
- Job state advances to `REPAIR_IN_PROGRESS` (if not already past that state)

### Future `PartRecord` enrichment (not yet implemented)
```typescript
interface PartRecord {
  id:                  string;
  name:                string;
  qty:                 number;
  detail:              string;
  // Future fields:
  partType?:           string;
  category?:           PartCategory;
  specs?:              Record<string, string>;
  source?:             'van' | 'shop' | 'supply-house' | 'customer' | 'unknown';
  vanItemId?:          string;
  technicianVerified?: boolean;
  oemPartNumber?:      string;
  photos?:             string[];
}
```

---

## Phase 9 — Safety / Truthfulness Rules

These rules are enforced in all UI copy and function outputs:

| Rule | Implementation |
|------|---------------|
| Never invent OEM part numbers | `oemLookupWarning` always says "not connected yet" |
| Never claim a part fits | Van match always says "Verify before install" |
| Disclose confidence | `compatibilityConfidence` shown as 'low' / 'medium' / 'none' |
| Serial decode uncertainty | Always disclosed with "not verified for this manufacturer" |
| Save never blocked | Missing critical specs show amber warning, not a hard block |
| Technician confirmation required | All spec fields labeled "Verify before install" |

### Approved language patterns

```
"Possible match — verify before install"
"Exact OEM part matching not connected yet. Verify with manufacturer parts lookup."
"Specs required before recommendation"
"Serial decoding not verified for this manufacturer."
"Model parsing confidence low."
"Technician confirmation required"
```

---

## Phase 10 — UI Placement Roadmap

| Surface | Status | What to show |
|---------|--------|-------------|
| Job Mode — Add Activity | ✅ Implemented | Full 2-step PartModal |
| My Van (inventory tab) | 🔲 Planned | Link van item → parts intelligence data sheet |
| Equipment Detail Page | 🔲 Planned | "Common failure parts for this unit" section |
| Service Record | 🔲 Planned | Parts used section with full spec metadata |
| Restock Tab | 🔲 Planned | Link restock item → part type intelligence |

---

## Adding a New Part Type

1. Open `artifacts/unitdown-ai/src/pages/jmp/partsIntelligence.ts`
2. Add a new entry to `PARTS_MASTER` with the `PartTypeDefinition` shape
3. Fill in: `partType`, `category`, `commonNames`, `requiredSpecs`, `optionalSpecs`, `safetyNotes`, `requiredPhotos`, `requiredMeasurements`, `inventoryTrackingUnit`, `searchKeywords`
4. Set `vanInventoryCategory` to the matching `ItemCategory` from `vanData.ts` (or leave undefined if not van-stocked)
5. Set `oemLookupWarning` to honest language about what is not connected
6. Run `pnpm --filter @workspace/unitdown-ai run typecheck`

---

## USR Integration (Future)

When Parts Intelligence is fully connected to the UnitDown Service Record (USR):

```
USR-2026-004921
└── Parts Used
    ├── Condenser Fan Motor (1)
    │   ├── HP: 1/3 · Voltage: 208/230V · Phase: 1φ · RPM: 1075
    │   ├── Rotation: CCW · Shaft: 5/8" · Mount: Belly-band
    │   ├── Van stock: Possible match — verified by technician ✓
    │   ├── Photos: old motor label, wiring before, installed
    │   └── Amp draw after: 3.2A (FLA 3.5A) ✓
    └── R-410A Refrigerant (0.75 lbs)
        ├── Superheat before: 24°F → after: 9°F ✓
        └── Leak found: No leak located — monitor on next visit
```

This becomes a permanent equipment memory record, visible to future contractors with customer authorization.
