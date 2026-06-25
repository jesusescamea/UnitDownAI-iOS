# UnitDown 2.0 — User Journeys

> This document describes the complete experience of UnitDown from a user's perspective. Every journey is designed around the real workflow of a commercial HVAC technician — not around app features.
>
> The central insight driving every journey: **technicians think in units, not in app screens.** UnitDown should feel like it thinks the same way.

---

## Journey 1 — First-Time Installation

**User goal:** Understand what UnitDown is and get to something useful within 60 seconds.

**Starting point:** App Store / web browser, never used UnitDown before.

**User type:** Any — new technician, experienced professional, student.

### Steps

1. **Install / open the web app**
   - No onboarding carousel. No 5-screen feature tour. No "enable notifications" gate.
   - The app opens directly to the hero — "Commercial HVAC Workspace" headline, diagnostic input, quick actions.
   - First impression communicates: *this is a workspace, not a diagnostic bot.*

2. **Guest exploration (optional)**
   - A logged-out user can immediately type symptoms and run a single demonstration diagnosis.
   - The result is shown in full — no truncation, no login wall mid-result.
   - After the result, a calm, non-blocking prompt: "Create a free account to save this and unlock your 7-day Pro Trial."
   - If dismissed: the diagnosis result stays visible. No forced redirect.

3. **Account creation**
   - Standard Clerk signup flow (email, Google, Apple). No modifications to this flow.
   - After account creation: brief, single-screen welcome — "Your Pro Trial starts now. 7 days, full access."
   - No lengthy onboarding form. Name is pulled from Clerk. No "tell us about yourself" step.

4. **Post-signup landing**
   - User lands on My Workspace.
   - The workspace is empty, but it doesn't feel broken: "Welcome to your workspace. Add your first unit to get started."
   - Two prominent actions: [+ Add Equipment] and [Run Diagnosis]
   - The trial status is shown subtly: "Pro Trial · 7 days · 25 diagnoses"

5. **First meaningful action**
   - The quickest path to value is: type symptoms → run diagnosis → see a professional result.
   - Longer path: add a unit → scan nameplate → save → timeline entry created automatically.

### Expected outcome
The user understands what UnitDown is, has an account, and has either run a diagnosis or added their first unit — all within 2–5 minutes.

### Opportunities to reduce friction
- Never ask for information that can be inferred (location from device, name from Clerk)
- Don't gate the first diagnosis behind account creation
- Show the Pro Trial status without requiring the user to navigate anywhere

---

## Journey 2 — First Nameplate Scan

**User goal:** Capture equipment nameplate data without typing.

**Starting point:** Technician is in front of a rooftop unit they've never logged before.

**User type:** Any — the scanner is free for all users.

### Steps

1. **Access the scanner**
   - From My Workspace: Quick Actions → [Scanner]
   - From Equipment Library: [+ Add Equipment] → [Scan Nameplate] (instead of manual entry)
   - From an existing unit: Equipment Detail → Photos tab → [+ Scan Nameplate]

2. **Camera opens**
   - No permissions wall on first use if camera was already granted. If not: standard system permission prompt.
   - Viewfinder with alignment guide. Simple instruction: "Align nameplate within the frame."

3. **Capture**
   - Single tap [Capture] button — large, thumb-reachable.
   - Processing takes < 2 seconds. Progress indicator shown.

4. **Review extracted data**
   - Extracted fields displayed in a clean editable list:
     - Manufacturer, Model, Serial, Refrigerant type, Voltage, Capacity, MCA, MOCP
   - Any field the OCR couldn't read is shown as blank (not as a wrong value).
   - Technician can edit any field inline.

5. **Save**
   - If launched from an existing unit: [Save to Unit Name] — one tap.
   - If launched as standalone: [Save as new unit] — prompts for a unit name/label, then saves.
   - Timeline entry created automatically: "Nameplate scanned — [date/time]"

6. **Confirmation**
   - Brief toast confirmation: "Nameplate saved to [Unit Name]"
   - Return to the unit record or the library.

### Expected outcome
Equipment nameplate data is captured in under 60 seconds, attached to the correct unit record, and available for all future AI diagnoses on that unit.

### Opportunities to reduce friction
- Pre-fill the unit picker with the most recently accessed unit
- Allow "retry" without leaving the scanner screen
- If a serial number already exists in the library, offer to match it to the existing record

---

## Journey 3 — First Equipment Record

**User goal:** Create a permanent record for a commercial HVAC unit.

**Starting point:** Technician is managing a new client or a unit not yet in their library.

**User type:** Free or Pro.

### Steps

1. **Initiate**
   - Equipment Library → [+ Add Equipment]
   - Two options presented: [Scan Nameplate] (recommended) or [Enter Manually]

2. **Via Nameplate Scan (preferred path)**
   - Scan → review → save → unit created automatically from nameplate data
   - Technician adds a label/nickname: "RTU-04 · Main Building"
   - Location (optional): building name, floor, rooftop area

3. **Via Manual Entry**
   - Short form: Unit name/label, Equipment type (dropdown), Manufacturer, Model, Serial (optional at creation)
   - No required fields beyond a name — technician can fill in details over time

4. **Unit created**
   - Equipment card appears in Library immediately
   - Timeline entry: "Unit created — [date/time]"
   - Status defaults to: Operational ✅

5. **Next action prompt**
   - After creation: "Unit added. What's next?"
   - [Run AI Diagnosis] | [Add Photo] | [Add Note] | [Done]

### Expected outcome
A complete equipment record exists in the library, ready to accumulate history, diagnoses, photos, and reminders.

### Opportunities to reduce friction
- Default status to Operational, never force the technician to pick a status on creation
- Allow incomplete records — not every field needs to be filled on day one
- Duplicate detection: warn if a serial number already exists in the library

---

## Journey 4 — First AI Diagnosis

**User goal:** Get a ranked, professional diagnostic report based on field observations.

**Starting point:** Technician is in front of a malfunctioning unit.

**User type:** Any.

### Steps

1. **Access the diagnostic input**
   - From My Workspace: [Run Diagnosis] quick action
   - From Equipment Detail: [▶ Run AI Diagnosis] (primary CTA, always visible)
   - From AI tab in nav: standalone input with optional unit selection

2. **Optionally attach to a unit**
   - If launched from Equipment Detail: unit is pre-selected
   - If launched standalone: "Select unit (optional)" — picker shows recent units
   - A diagnosis without a unit is valid. But the platform gently encourages attachment.

3. **Describe symptoms**
   - Large textarea. No character limits visible. Placeholder: "Describe symptoms, meter readings, sequence of operation, pressures, alarms, or control voltage observations..."
   - Example pills available for new users or when field is empty
   - No required format — technicians write how they think

4. **Submit**
   - [Run Diagnosis] button
   - Analyzing state: brief skeleton or pulsing indicator (< 3 seconds typical)

5. **View results**
   - Primary diagnosis displayed immediately: condition name, confidence %, ranked likely causes, first checks, meter checks, recommended action
   - Alternative diagnoses collapsible below
   - "Based on: [symptom excerpt]" shows the AI understood the input

6. **Save to unit**
   - If unit was attached: result saves automatically to the unit's timeline
   - If standalone: "Save to unit?" prompt with unit picker
   - Diagnosis entry in timeline: "[Condition name] · [confidence]% · [timestamp]"

7. **Free limit reached (if applicable)**
   - After the first daily diagnosis: "Your next diagnosis is available in X hours."
   - Upgrade prompt shown once, below the result — not blocking the result itself.

### Expected outcome
Technician has a ranked diagnosis with actionable first checks, attached to the correct unit record for future reference.

### Opportunities to reduce friction
- Pre-fill unit context when launched from Equipment Detail
- Store draft symptoms if app is backgrounded mid-entry
- Never truncate the result for Free users — the full diagnosis is always shown

---

## Journey 5 — Daily Technician Workflow

**User goal:** Efficiently manage a day with multiple job sites and units.

**Starting point:** Technician opening UnitDown at the start of the workday.

**User type:** Pro (ideal) or Free.

### Steps

1. **Morning check-in**
   - Opens My Workspace
   - Sees: today's activity summary, any reminders due (Pro), recently accessed units
   - Takes < 5 seconds to orient

2. **First job site — known unit**
   - Equipment Library → search "[unit name]" or scroll to recent
   - Opens Equipment Detail → reviews last timeline entry to see what was done last visit
   - Runs AI diagnosis if needed
   - Adds photo/note after completing work
   - Sets status to Operational ✅ or Needs Follow-up 🔶 as appropriate

3. **First job site — new unit**
   - Equipment Library → [+ Add Equipment] → Scan nameplate → save
   - Runs diagnosis in context of new unit
   - Timeline begins

4. **Between jobs**
   - Field Hub shows today's visited units and any open issues
   - Quick log (note, photo) accessible without opening full unit record

5. **Second job site**
   - Repeat of step 2 or 3
   - All activity accumulates in Calendar and Field Hub automatically

6. **End of day**
   - Field Hub shows complete summary: units visited, diagnoses run, open issues
   - No manual "save session" required — everything was logged in real time

### Expected outcome
Every unit visited has a timeline entry. Every diagnosis is attached. Every open issue has a status. The technician's day is documented without extra administrative effort.

### Opportunities to reduce friction
- Recent units should be sorted by last visited (most recent first)
- Field Hub should proactively surface "you were at RTU-04 last — did you want to add a follow-up?"
- Status changes should be a single tap from the Equipment Detail header

---

## Journey 6 — Searching Equipment

**User goal:** Find a specific unit quickly across a potentially large library.

**Starting point:** Equipment Library screen.

**User type:** Any.

### Steps

1. **Open Equipment Library**
   - Tap Library tab

2. **Search**
   - Search field is prominent and immediately focused on open
   - Search across: unit name/label, manufacturer, model, serial number, location tag
   - Results update in real time as technician types

3. **Filter (optional)**
   - Filter chips: All · RTU · Chiller · AHU · Split · Boiler · Needs Follow-up · Critical
   - Filters combine with search

4. **Open result**
   - Tap card to open Equipment Detail

### Expected outcome
Technician reaches the correct unit record in under 5 seconds.

### Opportunities to reduce friction
- Fuzzy search — "carrier 50" should find "Carrier 50XC"
- Barcode/QR search — point camera at equipment tag to find record (future enhancement)
- Recent searches shown when search field is focused but empty

---

## Journey 7 — Equipment Maintenance Workflow

**User goal:** Document a completed preventive maintenance visit and update the unit's record.

**Starting point:** Technician has just completed PM on a commercial unit.

**User type:** Any.

### Steps

1. **Open the unit record**
   - Equipment Library → find unit → open

2. **Add a timeline entry**
   - Equipment Detail → + tab → [Manual Log Entry]
   - Entry type: "PM Completed"
   - Notes: filters changed, coils cleaned, readings recorded, anomalies noted
   - Date/time: defaults to now (editable)

3. **Add photos**
   - + tab → [Add Photo]
   - Multiple photos in one session
   - Captions optional

4. **Update status**
   - If all clear: set status to Operational ✅
   - If something warrants monitoring: set to Monitoring 🔵

5. **Set next PM reminder (Pro)**
   - + tab → [Set Reminder]
   - Date, type (PM), notes
   - Appears in Calendar

6. **Confirm**
   - Timeline shows new PM entry
   - Photos visible in Photos tab
   - Status badge updated on equipment card

### Expected outcome
The unit's file is complete for this visit. Anyone opening this record in the future can see exactly what was done, when, and what was found.

### Opportunities to reduce friction
- "PM Completed" log type should auto-fill common fields (filter replacement, coil cleaning)
- Allow bulk photo add from camera roll
- Next PM date calculator: "Last PM: today. Recommend next: 90 days." with one-tap scheduling (Pro)

---

## Journey 8 — Return Visit Workflow

**User goal:** Complete a follow-up visit to a unit with a previously identified open issue.

**Starting point:** Technician has a reminder or knows from memory that a unit needs a return visit.

**User type:** Pro (reminders) or Free (manual recall).

### Steps

1. **Access the open issue**
   - Pro: Calendar → see scheduled reminder → tap → opens unit record
   - Free: Equipment Library → find unit with 🔶 (Needs Follow-up) status → open

2. **Review history**
   - Equipment Detail → Timeline tab
   - Last visit's diagnosis and notes are visible
   - Technician immediately knows what was left unresolved

3. **Complete the work**
   - Run a new AI diagnosis if needed
   - Add notes documenting what was done this visit
   - Add photos (before/after if needed)

4. **Mark issue resolved**
   - Update status: Needs Follow-up 🔶 → Operational ✅ (or Monitoring 🔵 if still watching)
   - Timeline entry created: "Return visit — issue resolved" or "Return visit — still monitoring"

5. **Close the reminder (Pro)**
   - Reminder in Calendar marked complete automatically when status is updated
   - Or manually dismissed from Calendar view

### Expected outcome
The unit's history shows a complete story: the original fault, the diagnosis, the first visit, the return, and the resolution. Any technician could understand the full history in under 30 seconds.

### Opportunities to reduce friction
- The return visit workflow should surface the original diagnosis automatically when a unit has "Needs Follow-up" status
- "Resolve and close reminder" as a single action
- Resolution notes field pre-filled with the original diagnosis for easy editing

---

## Journey 9 — Free → Pro Upgrade Journey

**User goal:** Upgrade to Pro at the natural moment when Free capacity runs out.

**Starting point:** Technician has been using Free for some time and has hit a capacity limit.

**User type:** Free user, power user who has outgrown Free.

### Trigger Scenarios

#### Scenario A: Equipment Library Full (10 units)

1. Technician taps [+ Add Equipment]
2. Instead of a blocking modal, an inline message appears below the Library:
   *"Your library has 10 units — the Free workspace maximum."*
   *"Upgrade to Pro for an unlimited equipment library."*
   [Upgrade to Pro] [Not now]
3. "Not now" dismisses the prompt. The equipment list is still fully accessible.
4. The [+ Add Equipment] button is not disabled — tapping it shows the same message.

#### Scenario B: Second Diagnosis Today

1. Technician submits a second diagnosis
2. Below the submit button (not blocking the input): *"You've used today's diagnosis. Next available in X hours."*
   [Upgrade for unlimited] [Remind me tomorrow]
3. The diagnostic input remains accessible — they can type and save their symptoms as a draft.

#### Scenario C: Future Reminder Attempted (Free User)

1. Technician taps [Set Reminder] in the + tab
2. A clear, calm explanation: *"Future reminders are a Pro feature."*
   *"Free records history. Pro manages the future."*
   [See what Pro includes] [Not now]
3. Not now closes the panel. No functionality is broken.

### Upgrade Flow (Web)

1. Technician taps [Upgrade to Pro] from any trigger point
2. Lands on Subscription page
3. Two options clearly presented: monthly or annual
4. Tap [Start Pro] → Stripe checkout (handled outside the app)
5. Return to app: status updates, Pro logo appears, all limits removed

### Expected outcome
The technician upgrades at a moment that makes sense to them, not at a moment engineered by the platform. The upgrade feels like a logical next step, not a rescue from a broken experience.

### Opportunities to reduce friction
- Remember dismissed prompts — never show the same prompt twice in one session
- Show clear before/after: "You currently have 10 units. Pro removes the limit entirely."
- Annual plan savings clearly highlighted: "Save $X vs monthly"
- Upgrade from any trigger point — the subscription page is not the only path

---

## Journey 10 — Future Business Customer (High-Level)

> **Note:** Business is not part of Phase 1 or Phase 2 implementation. This journey is documented for future reference only. No Business features are built until explicitly scoped.

**User goal:** A service company wants to manage their entire technician team and equipment portfolio from one platform.

**User type:** Service company owner or service manager. Team of 2–20 technicians.

### High-Level Path

1. **Discovery**
   - A Pro technician who owns a small company sees the Business teaser on the Subscription page
   - Clicks "Notify Me" — captured as a Business interest lead
   - Receives an email when Business launches

2. **Onboarding**
   - Company account created (separate from personal Pro account)
   - Owner invites technicians by email
   - Each technician connects their personal UnitDown account to the company account
   - Shared Equipment Library created — all company units visible to all technicians

3. **Daily use**
   - Individual technicians use their personal workspaces as before
   - All activity on shared units flows into the company Equipment Library
   - Manager sees a company-wide dashboard: which units have open issues, which technicians have visited which sites

4. **Billing**
   - Company billing replaces individual Pro subscriptions for the team
   - Per-seat pricing with company discount

### Key Design Principle for Business
Individual technicians should not feel like they've lost their personal workspace when their company gets a Business account. Personal Library and Company Library coexist — personal data remains personal.

---

## Journey Summary Table

| Journey | Starting Point | Key Moment | Outcome |
|---|---|---|---|
| First Installation | App Store / web | First diagnosis or first unit | Oriented, account created, trial active |
| First Nameplate Scan | In front of a unit | Capture → review → save | Nameplate attached to unit record |
| First Equipment Record | Empty library | Name → scan or type → save | First unit in library, timeline begins |
| First AI Diagnosis | Any screen | Submit symptoms → see result | Ranked diagnosis, saved to unit |
| Daily Workflow | Morning check-in | Multiple units visited | Full day documented automatically |
| Equipment Search | Library tab | Type → result in < 3 seconds | Correct unit found and opened |
| Maintenance Workflow | Completing a PM | Log + photo + status update | Complete PM record in timeline |
| Return Visit | Open reminder or 🔶 unit | Review history → complete work → resolve | Full story visible in timeline |
| Free → Pro Upgrade | Capacity overflow | Natural prompt → upgrade decision | Pro active, all limits removed |
| Business (Future) | Business teaser | Notify Me → launch → invite team | Company workspace active |

---

## Cross-Journey Principles

**Every journey should leave the unit's record better than it was found.**
A technician who visits a unit, runs a diagnosis, adds a photo, and sets a status has created something valuable — not just for themselves, but for any technician who touches that unit in the future.

**The app should feel like it's working with the technician, not waiting for them.**
Automatic timeline entries, automatic saves, context-aware pre-fills, and surfacing relevant history without asking — these are the details that make UnitDown feel intelligent.

**Upgrade moments are part of the journey, not interruptions to it.**
If the upgrade experience is jarring, technicians churn. If it feels like a natural next step, they convert. The journey design treats upgrade prompts as signposts, not roadblocks.

---

*Last updated: June 2026 — UnitDown 2.0 Feature Branch*
