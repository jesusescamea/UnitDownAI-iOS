# Job Mode Production Audit

**Prototype version:** June 2026
**Standard:** UnitDown Service Standard (USS)
**Scope:** All interactive behaviors in `/jobmode-prototype`

---

## Audit Summary

| Status | Count |
|---|---|
| ✅ Real (user input, no false data) | 3 |
| ⚠ Hybrid (real form, mock defaults or suggestions) | 4 |
| 🧪 Prototype only (no persistence, fake or hardcoded behavior) | 8 |

---

## Behavior-by-Behavior Audit

### 1. Nameplate Capture
**Status:** 🧪 Prototype — safe staged flow (fixed)
**Current behavior:** Runs simulated image quality checks. Always returns "Not detected." for all fields. User may enter data manually (source: manual) or explicitly select sample Carrier RTU data via "Use Sample Nameplate" button (source: prototype, clearly labeled). Never auto-populates from a scanned image.
**Saves data:** In-memory only.
**Persists across refresh:** No.
**False data risk:** None — manual entry is user-provided; sample data is explicit opt-in and labeled.
**Production requirement:** Real OCR (e.g., Google Vision, AWS Textract, OpenAI Vision) → `NameplateScanResult` with per-field confidence. Type contract is already in `lib/types.ts`.

---

### 2. Voice Note
**Status:** 🧪 Prototype — fake
**Current behavior:** "Recording" is a 4-second timer. Transcript is randomly selected from a preset library of 8 HVAC sentences in `mockData.ts`. Confidence % is `88 + Math.random() * 10`. Label: "🧪 Prototype — Random transcript · Not real audio."
**Saves data:** Random string in-memory.
**Persists:** No.
**False data risk:** High — transcript looks like real transcription output.
**Production requirement:** `MediaRecorder` API → Blob upload to object storage → Whisper API → real transcript + real confidence score from model.

---

### 3. Photo Capture
**Status:** 🧪 Prototype — fake
**Current behavior:** No camera access. "Take Photo" saves a color label string to in-memory state. Activity card shows a colored rectangle with emoji. Label: "🧪 Prototype — No real camera."
**Saves data:** Color label only.
**Persists:** No.
**False data risk:** Low — clearly a placeholder.
**Production requirement:** `<input type="file" capture="environment">` or `getUserMedia` → upload to object storage → `imageUrl` stored in `job_timeline_events.metadata`.

---

### 4. Alarm Code Entry
**Status:** ✅ Real — user-driven
**Current behavior:** User types a code. `FAULT_CODES` map returns a real description. Pre-populated code `82` is editable.
**Saves data:** In-memory only.
**Persists:** No.
**False data risk:** Low — code and description are user-entered.
**Production requirement:** Persist to `job_timeline_events`. Extend `FAULT_CODES` per equipment make/model. Long-term: OEM fault code database.

---

### 5. Measurements (Initial + Verification)
**Status:** ⚠ Hybrid — real form, mock defaults
**Current behavior:** Fields are pre-filled with `INITIAL_MEASUREMENTS` values (e.g., Head: 385 psi, Superheat: 24°F). User can edit. Status colors hardcoded per field. Verification pre-fills "after" values from `verificationValue`. Label: "🧪 Prototype — Values pre-filled from mock data."
**Saves data:** In-memory only.
**Persists:** No.
**False data risk:** Medium — if user saves without editing, mock values are logged as real readings.
**Production requirement:** Start with blank fields. Compute normal ranges dynamically from equipment refrigerant type and ambient conditions.

---

### 6. Part / Material Entry
**Status:** ⚠ Hybrid — real custom entry, mock suggestions
**Current behavior:** Three hardcoded "suggested" parts ("Condenser Coil Cleaning", "R-410A Refrigerant", "Dual Run Capacitor") with pre-written detail strings. Custom entry is user-typed and real. Label: "🧪 Mock data" badge on suggestions.
**Saves data:** In-memory only.
**Persists:** No.
**False data risk:** Medium — suggestions appear diagnostic but are hardcoded for this specific scenario.
**Production requirement:** AI-suggested from measurements + alarms. Parts link to van inventory (`inventory_items` table). Quantity and pricing from real inventory.

---

### 7. Recommendations
**Status:** ⚠ Hybrid — real selection, mock suggestions
**Current behavior:** 5 hardcoded recommendations shown as pre-selected. User can deselect, set priority, add notes, or type custom entries. Label: "🧪 Mock" badge on suggestion list.
**Saves data:** In-memory only.
**Persists:** No.
**False data risk:** Medium — suggestions appear AI-generated but are static.
**Production requirement:** GPT call over timeline events + measurements + equipment history → ranked recommendations. User selection persists to `job_timeline_events`.

---

### 8. Customer Summary
**Status:** 🧪 Prototype — hardcoded content
**Current behavior:** Three hardcoded paragraphs about a Carrier RTU coil cleaning. Does not reflect actual session activities. Label: "🧪 Prototype — Hardcoded content."
**Saves data:** Marks `jobState = 'CUSTOMER_REVIEWED'` in-memory.
**Persists:** No.
**False data risk:** High — presents invented content as if AI-generated from session work.
**Production requirement:** GPT call over `job_timeline_events` → plain-language customer summary. Customer acknowledgment stored in record (digital signature or timestamped confirmation).

---

### 9. AI Field Assist
**Status:** 🧪 Prototype — hardcoded responses
**Current behavior:** 4 preset prompts each have a hardcoded multi-line response. Typewriter animation makes them look AI-generated. Header now shows "🧪 Prototype · Hardcoded responses."
**Saves data:** Nothing.
**False data risk:** High — users may act on responses that are scenario-specific fiction.
**Production requirement:** Real OpenAI call with equipment context (make, model, measurements, alarms, service history) as system prompt.

---

### 10. Note Entry
**Status:** ✅ Real — user-driven
**Current behavior:** Free-text textarea. User types real content. Saved in-memory as-typed.
**False data risk:** None.
**Production requirement:** Persist to `job_timeline_events` with `type: 'note'`.

---

### 11. Complete Job / USR Generation Ceremony
**Status:** 🧪 Prototype — timer animation only
**Current behavior:** Multi-step animation runs on fixed timers. USR ID is the hardcoded `MOCK_JOB.usrId`. No API call is made. No data is written. Completion screen now labeled "🧪 Prototype Complete" with disclaimer.
**Saves data:** Nothing.
**Persists:** No.
**False data risk:** High — ceremony implies real record creation and transmission.
**Production requirement:** POST to `/api/jobs/:id/complete` → server assigns permanent USR ID, compiles timeline, runs AI summary, stores to `job_timeline_events`, notifies office via webhook.

---

### 12. Service Record View
**Status:** 🧪 Prototype — static sample data
**Current behavior:** Renders entirely from `MOCK_JOB` + `MOCK_EQUIPMENT` + `INITIAL_MEASUREMENTS`. Does not reflect activities logged in the session. Banner: "🧪 Prototype Record — Sample data only."
**Saves data:** Nothing.
**Persists:** No.
**False data risk:** High — looks like a real completed record.
**Production requirement:** Compiled server-side from `job_timeline_events`. Returned as a structured `ServiceRecord` type. Downloadable as PDF.

---

### 13. My Van
**Status:** ⚠ Hybrid — real local state, mock supply/nearby data
**Current behavior:** Inventory adjustments are real within session (useState). Readiness scores computed from local logic. Supply house data and nearby techs are hardcoded. Shelf Scan and Scan Receipt are placeholders.
**Saves data:** In-memory only.
**Persists:** No.
**Production requirement:** Inventory persists to `van_inventory` table. Supply house integration (real API). Nearby tech availability from real dispatch data.

---

### 14. Tool Checklist
**Status:** ⚠ Hybrid — real local state
**Current behavior:** Check/uncheck persists within session. Readiness score computed from state.
**Saves data:** In-memory only.
**Persists:** No.
**Production requirement:** Persist to `tool_checklist_logs` table keyed by technician + date.

---

## Risk Register

| Risk | Severity | Feature |
|---|---|---|
| Voice transcripts look real but are random | HIGH | Voice Note |
| Customer summary appears AI-generated; is hardcoded | HIGH | Customer Summary |
| USR ceremony implies real data was stored and transmitted | HIGH | Completion / USR |
| AI Field Assist responses are hardcoded but look live | HIGH | AI Assist |
| Service Record shows sample data, not session data | HIGH | Service Record View |
| Measurement defaults saved without editing = false readings | MEDIUM | Measurements |
| Part suggestions appear diagnostic but are hardcoded | MEDIUM | Parts |
| Recommendation suggestions appear AI-generated | MEDIUM | Recommendations |

---

## Required Production Fixes (ordered by safety impact)

1. **Persistence layer** — Every `addActivity` must write to `job_timeline_events` before the next activity. Nothing should be lost on refresh.
2. **Voice transcription** — Replace random preset with real `MediaRecorder` + Whisper transcription.
3. **Customer summary** — Replace hardcoded text with GPT over actual timeline events.
4. **USR generation** — Server-assigned permanent ID, real compilation, real storage.
5. **Service Record View** — Compile from real `job_timeline_events`, not static mock.
6. **AI Field Assist** — Real GPT call with live equipment context.
7. **Measurement defaults** — Start blank. No pre-filled values. Status ranges from refrigerant spec.
8. **Part suggestions** — AI from alarms + measurements. Link to van inventory.
9. **Recommendation suggestions** — GPT over timeline events.
10. **Photo capture** — Real camera → object storage → URL stored in record.
11. **Nameplate OCR** — Real image analysis → `NameplateScanResult`. Type is ready.
12. **Van inventory persistence** — `van_inventory` table, not useState.
13. **Tool checklist persistence** — `tool_checklist_logs` table.

---

## Recommended Build Order

### Phase 1 — Persistence (stop losing data)
- Write every `addActivity` to `job_timeline_events` immediately
- Write parts, measurements, recommendations to their tables
- Rehydrate state from open job on page load
- Offline sync queue: IndexedDB → server (architecture already designed in Job Mode offline memory)

### Phase 2 — Real AI
- Voice transcription (Whisper)
- Customer summary (GPT over timeline)
- AI Field Assist (GPT with equipment context)
- Recommendation suggestions (GPT over measurements + alarms)

### Phase 3 — Media
- Photo capture (`getUserMedia` or file input → object storage)
- Nameplate OCR (Vision API → `NameplateScanResult`)

### Phase 4 — Record Generation
- Real USR ID (server-side, globally unique, permanent)
- Service Record compiled server-side from `job_timeline_events`
- PDF export (puppeteer or react-pdf)
- Office notification (webhook or email)

### Phase 5 — Operational Intelligence
- Van inventory persistence + supply house API
- Tool checklist persistence
- Part suggestions from AI + live van inventory
- Measurement ranges from equipment refrigerant spec

---

## Definition of Done — Production Job Mode

A Job Mode session is production-ready when all of the following are true:

- [ ] Every activity is written to `job_timeline_events` before the next activity starts
- [ ] Data survives a page refresh (offline sync: IndexedDB → server)
- [ ] Voice notes use real audio capture and real speech-to-text; no preset transcripts
- [ ] Photos are real images stored in object storage; no color placeholders
- [ ] Nameplate capture returns real OCR results or explicit manual entry — never auto-populated or invented
- [ ] Customer summary is AI-generated from actual `job_timeline_events`, not hardcoded text
- [ ] USR ID is server-assigned, globally unique, permanent, and stored in the database
- [ ] Service Record is compiled server-side from `job_timeline_events`, not from mock data
- [ ] AI Field Assist uses live equipment context as the system prompt, not preset responses
- [ ] Part suggestions come from AI analysis of alarms + measurements, not a hardcoded list
- [ ] Measurement fields start blank; no pre-filled mock values
- [ ] Recommendation suggestions are GPT-generated from actual findings
- [ ] A completed job produces a downloadable, shareable UnitDown Service Record PDF
- [ ] The prototype `🧪` label is removed; replaced with real status indicators
- [ ] All data is keyed to real technician, real work order, real equipment IDs

---

*Last updated: June 2026*
*Owner: UnitDown Engineering*
