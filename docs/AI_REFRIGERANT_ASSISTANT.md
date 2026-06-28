# AI Refrigerant Assistant

**UnitDown Parts Intelligence — Phase 8**

> "This app was built by someone who actually works in commercial HVAC."

---

## Overview

The AI Refrigerant Assistant is UnitDown's flagship diagnostic tool — a full-screen, mobile-first interactive experience that walks HVAC technicians through refrigerant diagnostics using job context, equipment history, and real-time calculated guidance.

It is not a static PT chart. It is a senior technician standing beside you.

---

## Entry Points

| Trigger | Location |
|---------|----------|
| FAB Menu → "Refrigerant Check" | Active Job View |
| AI Field Assistant (phrase match) | AI Assist modal |
| Measurement Session | Any time pressures are entered |
| Equipment Detail | Future |
| Service Record Review | Future |

**Trigger phrases recognized (future NLP):**
- superheat, subcooling, PT chart, saturation temperature
- analog gauges, charging, refrigerant, suction pressure, head pressure

---

## Screens

### Overview (Home)
- Auto-fills equipment context: Make · Model · Unit Tag · Customer
- Refrigerant badge with auto-detect from nameplate
- Metering device (TXV/orifice)
- Weather (outdoor ambient, humidity)
- Auto-filled current readings from job measurement session
- Refrigerant switcher (5 refrigerants)
- One-tap navigation to all sub-tools
- Truthfulness notice about PT reference values

### PT Chart (Interactive)
- SVG curve for the active refrigerant — fully rendered from the offline PT table
- Faded curves for all other refrigerants visible simultaneously
- Tap anywhere on the chart to read pressure + temperature at that point
- Enter pressure → glowing dot animates to exact position on curve
- Crosshair lines drop from dot to both axes
- Animated conversion: `120 PSI → PT Lookup → 41°F Saturation`
- "Use for Superheat →" / "Use for Subcooling →" transfer buttons
- Per-refrigerant info card: GWP, status, typical suction/discharge ranges, notes

### Superheat Builder
Step-by-step card flow:
1. **Suction Pressure** (auto-filled from job: 115 PSIG)
2. **PT Lookup → Saturation Temperature** (animated, from offline table)
3. **Suction Line Temperature** (clamp reading entry)
4. **Animated Subtraction** → Superheat result with full AnimatedGauge

**AnimatedGauge** shows color zones (blue/green/orange/red) with animated needle and glow dot at current value.

**AI Interpretation** context-aware for this specific unit, using:
- MOCK_HISTORY (recurring Code 82 / condenser fouling)
- Current ambient (91°F)
- Equipment type (TXV)
- Manufacturer guidance (TXV target: 8–12°F)

### Subcooling Builder
Mirror of Superheat Builder using head pressure and liquid line temperature.
- Formula: Condensing Sat. Temp − Liquid Line Temp = Subcooling
- Gauge zones calibrated for subcooling targets

### AI Analysis
Full equipment-specific interpretation combining:
- Superheat + subcooling (if both entered)
- Head pressure context (elevated = condenser issue first)
- Service history (Code 82 recurring pattern)
- Ambient conditions
- "Before Adjusting Refrigerant" checklist — always present

### Teach Me Mode
7-step animated walkthrough:
1. Connect gauges
2. Read blue gauge
3. Find saturation temperature on PT chart
4. Clamp suction line
5. Subtract → superheat
6. Compare to target
7. AI interpretation

Auto-advances every 3.2 seconds. Pause/resume/reset. Tap any step to jump.

### Analog Gauge Mode
5-step guided flow for technicians using traditional manifold gauges:
- No digital concepts
- Exactly how apprentices are trained
- Each step has a clear "proceed" button
- Back navigation

---

## Refrigerant Support

| Refrigerant | Status | GWP | Notes |
|-------------|--------|-----|-------|
| R-410A | Current (phasing down) | 2088 | Default for most commercial RTUs |
| R-22 | Phase-out | 1810 | Reclaimed only, no new production |
| R-454B | Next-gen | 467 | A2L, required for new equip 2025+ |
| R-32 | Next-gen | 675 | A2L, common in mini-splits |
| R-407C | Phasing out | 1774 | Zeotropic blend with temperature glide |

PT data is stored offline in `refrigerantData.ts`. No network required.

---

## Data Layer (`refrigerantData.ts`)

### PT Tables
- Individual tables per refrigerant with 25–30 data points each
- R-410A calibrated to real job context: 115 PSIG → ~37.9°F, 385 PSIG → ~104.7°F
- Based on Clausius-Clapeyron approximation, anchored to field-verified values

### Key Functions
```typescript
getSaturationTemp(ref, psig)           // pressure → temperature (interpolated)
getSaturationPressure(ref, tempF)      // temperature → pressure (interpolated)
getPTTable(ref)                        // full table for chart rendering
interpretSuperheat(sh, ref, metering)  // returns { band, label, color }
interpretSubcooling(sc, ref)           // returns { band, label, color }
detectRefrigerant(nameplateString)     // parses nameplate text → refrigerant ID
```

### Interpretation Bands

**Superheat:**
- `low` — possible overcharge or floodback (blue)
- `target` — within range (green)
- `high` — slightly above target (amber)
- `very-high` — significantly elevated (red)

**Subcooling:**
- `low` — possible undercharge or restriction (blue)
- `target` — within range (green)
- `high` — slightly above target (amber)
- `very-high` — possible overcharge (red)

---

## Timeline Integration

When readings are logged via "Log to Timeline," an activity is created:
```typescript
{
  type: 'measurement',
  title: 'Refrigerant Check',
  subtitle: 'Suction Pressure: 115 psi · Superheat: 14.1 °F · ...',
  measurements: MeasurementReading[],  // full structured array
}
```

Measurements stored:
- Suction Pressure (PSIG)
- Suction Saturation Temp (°F)
- Suction Line Temp (°F)
- Superheat (°F) — with status: ok / warn / alert
- Head Pressure (PSIG) — with status
- Condensing Saturation Temp (°F)
- Liquid Line Temp (°F)
- Subcooling (°F) — with status

---

## Equipment Memory (Future)

Architecture is ready for:
- Previous superheat / subcooling trend storage
- Seasonal comparison
- Stored to `equipment_timeline` via `event.metadata.refrigerantHistory`

---

## Future Enhancement Hooks

| Feature | Status | Hook |
|---------|--------|------|
| Bluetooth gauges (Fieldpiece, Testo, UEI) | Planned | `useBTGauge()` hook stub |
| MeasureQuick integration | Planned | API bridge |
| Manufacturer charging charts | Planned | `OEMChargingChart` component slot |
| OEM PT lookup | Planned | `Phase 5` OEM lookup API |
| Live graph overlays | Planned | Second SVG layer on PT chart |
| Multiple refrigerant comparison | Planned | Multi-curve toggle |
| Subcooling correction for liquid line height | Planned | `elevationCorrection` param |

---

## What Is Real vs. Placeholder

| Feature | Status |
|---------|--------|
| PT chart curves (SVG) | ✅ Real — rendered from offline data tables |
| Interpolated PT lookup | ✅ Real — linear interpolation between data points |
| Superheat/subcooling math | ✅ Real — actual formula |
| Animated gauge | ✅ Real — SVG arc gauge with spring animation |
| Teach Me auto-advance | ✅ Real — timed step progression |
| Analog Mode steps | ✅ Real |
| AI Interpretation | ✅ Real text for this unit — uses MOCK_HISTORY + equipment |
| Equipment context | ✅ Auto-filled from MOCK_EQUIPMENT / MOCK_JOB |
| Timeline logging | ✅ Real — creates measurement activity |
| OEM lookup | 🔶 Placeholder ("Coming Soon") — Phase 5 |
| Bluetooth gauge input | 🔶 Not yet implemented |
| Manufacturer charging tables | 🔶 Not yet implemented |
| PT data accuracy | ⚠️ Reference values — field-calibrated but not certified |

---

## Truthfulness Standards

The same truthfulness rules from Parts Intelligence apply:

1. **Never invent PT data** — all values from tables, interpolated honestly
2. **Always show accuracy notice** — "Always verify manufacturer specifications"
3. **Never recommend refrigerant addition** without ruling out mechanical causes first
4. **AI interpretation is unit-specific** — not generic HVAC answers
5. **Manufacturer target ranges** disclosed as typical/reference only
6. **Temperature glide** on R-407C noted — not hidden

---

## Files

| File | Purpose |
|------|---------|
| `src/pages/jmp/refrigerantData.ts` | Offline PT tables, interpolation, interpretation |
| `src/pages/jmp/RefrigerantAssistant.tsx` | Full modal component (all 7 screens) |
| `src/pages/jmp/types.ts` | `ModalType` extended with `'refrigerant-assistant'` |
| `src/pages/jmp/ActiveJobView.tsx` | Import, FabMenu button, modal render |

---

## How to Test

1. Navigate to `/jobmode-prototype`
2. Tap **active** in the stage nav → Start Job
3. Tap the **+** FAB button → **Refrigerant Check**
4. **Overview**: verify equipment context auto-fills (Carrier 50XCQ, R-410A, 91°F)
5. **PT Chart**: enter `115` → Lookup → verify ~37–38°F saturation; tap the chart curve at various points
6. **Superheat**: tap "PT Lookup →", enter clamp temp (e.g. `62`), tap Calculate → verify ~24°F superheat with amber gauge
7. **Subcooling**: enter `385` → PT Lookup → enter liquid line temp (e.g. `95`), verify result
8. **AI Analysis**: verify equipment-specific text references Code 82 history and condenser fouling
9. **Teach Me**: tap Start → watch 7 steps auto-advance
10. **Analog Mode**: walk through 5 steps
11. **Log to Timeline**: verify measurement activity appears in job feed

---

## Recommended Next Phase

### Phase 9A: Connect to Real Job Data
- Replace `MOCK_EQUIPMENT` with live job equipment context
- Auto-fill readings from `initialMeasurements` in `PrototypeState`
- Refrigerant auto-detected from nameplate result

### Phase 9B: AI Phrase Routing
- Add phrase detection in AI Assist modal
- Keywords: superheat, subcooling, PT chart, saturation, charging, gauges
- Route to RefrigerantAssistant directly from AI chat

### Phase 9C: Offline-First Production Data
- Move PT tables into app's local storage on first load
- `service-worker` cache PT JSON for true offline access
- Consider NIST REFPROP API for more precise values (cloud-only, graceful fallback)
