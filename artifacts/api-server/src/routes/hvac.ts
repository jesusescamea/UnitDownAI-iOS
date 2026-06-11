import { Router, type IRouter, type Request, type Response } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { DiagnoseHvacBody, DiagnoseHvacResponse } from "@workspace/api-zod";
import { diagnoseByKnowledgeBase } from "../lib/hvac-diagnostics.js";
import { storage } from "../storage.js";
import { isTesterEmail } from "../lib/tester-whitelist.js";
import { db } from "@workspace/db";
import { freeUsage } from "@workspace/db";
import { sql } from "drizzle-orm";
import { computeStatus, FREE_AUTH_USES } from "../lib/usage-limits.js";

const hvacRouter: IRouter = Router();

const AI_TIMEOUT_MS = 7_000;
const KB_INSTANT_THRESHOLD = 75; // confidence % — return KB immediately, skip AI

type HvacEntry = {
  id: string;
  title: string;
  category: string;
  whyThisFits: string;
  likelyCauses: string[];
  firstChecks: string[];
  meterChecks: string[];
  priorityLevel: "low" | "medium" | "high" | "critical";
  confidencePercent: number;
  recommendedAction: string;
  riskNote: string;
};

type FullResult = {
  primary: HvacEntry;
  alternatives: HvacEntry[];
};

function toLiteEntry(entry: HvacEntry): HvacEntry {
  return {
    ...entry,
    likelyCauses: entry.likelyCauses.slice(0, 1),
    firstChecks: entry.firstChecks.slice(0, 2),
    meterChecks: [],
  };
}

function buildResponse(full: FullResult, shouldReturnFull: boolean) {
  if (shouldReturnFull) {
    return { ...full, isPro: true };
  }
  return {
    primary: toLiteEntry(full.primary),
    alternatives: [],
    isPro: false,
  };
}

// Increment the free usage count for this session after a successful diagnosis.
async function incrementSession(sessionId: string, session: { useCount: number }) {
  await db
    .update(freeUsage)
    .set({ useCount: session.useCount + 1, updatedAt: new Date() })
    .where(sql`${freeUsage.sessionId} = ${sessionId}`);
}

hvacRouter.post("/hvac/diagnose", async (req: Request, res: Response) => {
  const parsed = DiagnoseHvacBody.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }

  const { symptoms, clientId, testerEmail } = parsed.data;

  req.log.info({ symptoms: symptoms.slice(0, 120) }, "Diagnosis started");

  // Google Play closed testing whitelist — remove or replace after testing.
  const isPro = isTesterEmail(testerEmail) || await storage.isProUser(clientId);
  req.log.info({ clientId: clientId ?? "anonymous", isPro }, "Diagnose request tier");

  // ── Server-side usage gate (backstop) ────────────────────────────────────────
  // The gate endpoint is read-only; this is where the increment actually happens.
  // When clientId is provided (Clerk user), use the per-account session so that
  // a freshly-logged-in user is not blocked by their old anonymous browser session.
  let freeSession: (typeof freeUsage.$inferSelect) | null = null;
  if (!isPro) {
    // Only Clerk user IDs (user_xxx) are stable per-account identifiers.
    // Anonymous localStorage UUIDs are NOT the same as the cookie-based session
    // IDs that the gate creates — using clientId for anon users would never find
    // the session and the backstop check would silently skip, allowing unlimited
    // diagnoses. Always use the session cookie for non-Clerk users.
    const isAuthClient = typeof clientId === "string" && clientId.startsWith("user_");
    const sessionLookupId: string | undefined = isAuthClient
      ? clientId
      : (req as any).cookies?.unitdown_session;

    if (sessionLookupId) {
      const [session] = await db
        .select()
        .from(freeUsage)
        .where(sql`${freeUsage.sessionId} = ${sessionLookupId}`);

      if (session) {
        const backstopStatus = computeStatus(session, isAuthClient);
        if (backstopStatus !== "free") {
          res.status(429).json({ error: "Usage limit reached", status: backstopStatus });
          return;
        }
        freeSession = session;
      } else if (isAuthClient) {
        // Clerk user with no session yet (gate creates it; this is a safety net).
        // Allow the request — their count will be 0 and will be created on increment.
        freeSession = null;
      }
      // Anonymous user with no cookie session: allow once (gate should have run
      // first and set the cookie; if not, the server cannot track this request).
    }
  }

  // All free-tier uses get full results (within the allowed limit).
  const shouldReturnFull = isPro || !freeSession || freeSession.useCount < FREE_AUTH_USES;

  // ── Step 1: Knowledge-base scoring ─────────────────────────────────────────
  const kbResult = diagnoseByKnowledgeBase(symptoms);
  req.log.info(
    { id: kbResult.primary.id, confidence: kbResult.primary.confidencePercent, title: kbResult.primary.title },
    "KB scoring complete"
  );
  if (kbResult._debug) {
    req.log.info(
      {
        faultDomain: kbResult._debug.faultDomain,
        controlDropoutSignals: kbResult._debug.controlDropoutSignals,
        pressureCyclingSignals: kbResult._debug.pressureCyclingSignals,
        shortCycleBroadWords: kbResult._debug.shortCycleBroadWords,
        top5: kbResult._debug.top5,
        penaltiesApplied: kbResult._debug.penaltiesApplied,
        normalizedInput: kbResult._debug.normalizedInput,
      },
      "KB scoring debug"
    );
  }

  // Strong KB match — return immediately without AI call.
  if (kbResult.primary.confidencePercent >= KB_INSTANT_THRESHOLD) {
    req.log.info(
      { id: kbResult.primary.id, confidence: kbResult.primary.confidencePercent },
      "Knowledge-base diagnosis matched — returning instantly"
    );
    const finalResult = buildResponse(kbResult as FullResult, shouldReturnFull);
    const validated = DiagnoseHvacResponse.safeParse(finalResult);
    if (validated.success) {
      req.log.info({ id: kbResult.primary.id }, "Sending validated KB response");
      if (freeSession) {
        await incrementSession(freeSession.sessionId, freeSession).catch((err) =>
          req.log.error({ err }, "Failed to increment session count after KB hit")
        );
      }
      res.json(validated.data);
      return;
    }
    req.log.warn(
      { issues: validated.error?.flatten() },
      "KB result did not pass Zod validation — falling through to AI"
    );
  } else {
    req.log.info(
      { id: kbResult.primary.id, confidence: kbResult.primary.confidencePercent },
      "KB confidence below threshold — using AI with KB context"
    );
  }

  // ── Step 2: AI augmentation ─────────────────────────────────────────────────
  req.log.info("Sending to AI for high-confidence diagnosis");

  const kbContext =
    kbResult.primary.id.startsWith("fallback")
      ? "No matching knowledge base entry found."
      : `Knowledge base best guess: "${kbResult.primary.title}" (${kbResult.primary.confidencePercent}% confidence). Use this as a starting point.`;

  const systemPrompt = `You are UnitDown AI — a senior commercial HVAC journeyman diagnostic engine.
You reason like a licensed commercial refrigeration and HVAC technician using sequence-of-operation logic, not like a residential homeowner guide or a generic AI assistant.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7-STEP DIAGNOSTIC FRAMEWORK
Apply all 7 steps to every complaint. Map each step to the correct JSON field as described below.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STEP 1 — EQUIPMENT TYPE DETECTION
Identify the specific equipment from the complaint:
  RTU / package unit / split system / chiller / air handler / fan coil / heat pump / PTAC / VRF / mini-split
If no equipment is stated, infer from context clues (e.g. "inducer" = gas-fired packaged or split system).
→ Output: include in "title" (e.g. "Carrier RTU —") and "whyThisFits" (e.g. "Equipment type: commercial RTU")

STEP 2 — SYMPTOM CLASS DETECTION
Classify the symptom into one of these classes:
  No Cool | No Heat | Weak Cooling | Trips Breaker | Noisy Unit | Water Leak | Refrigerant Imbalance | Reset Helps Then Fails Again | High Head Pressure | After Rain Failure | Runs Constantly
→ Output: "category" field

STEP 3 — DISCIPLINE CATEGORY DETECTION
Identify the equipment system and discipline:
  Heating Sequence | Cooling/Refrigeration Circuit | Airflow/Blower | Economizer | Electrical/Controls | Condensate Management | Mechanical/Rotating
→ Output: start "whyThisFits" with: "Equipment type: [type]. Symptom class: [class]. Discipline: [discipline]. Sequence stopped at: [specific step where operation halted]."

STEP 4 — RANKED LIKELY CAUSES
Rank by: (A) most statistically common → (B) cheapest to repair → (C) earliest in sequence → (D) easiest to test → (E) catastrophic/expensive parts LAST.
NEVER list compressor, gas valve, TXV, heat exchanger, or control board as primary cause unless confirming evidence (fault code, measured amperage, specific test result) is present in the complaint.

Commercial ranking rules — enforce strictly:
  "compressor hums" → 1) capacitor 2) voltage sag/contactor 3) hard start 4) locked rotor
  "inducer won't start" → 1) no heat call at W terminal 2) board not energizing output 3) open rollout/limit safety 4) pressure switch fault 5) failed inducer motor
  "blower won't run" → 1) no fan signal 2) run capacitor 3) relay/contact 4) ECM module 5) motor winding
  "no cool" → 1) thermostat call 2) breaker/disconnect 3) contactor 4) capacitor 5) low charge/freeze 6) compressor last
  "no heat" → walk the gas heat sequence step by step; do not jump to gas valve or board
→ Output: "likelyCauses" array, ordered most common to most expensive

STEP 5 — FIRST CHECKS (field technician sequence)
Follow the sequence of operation; always start before the first component that could fail.
Do not start checks at the suspected failed component — start one step upstream.
Gas heat: verify call → read fault code → check safeties → check inducer voltage → check igniter → check gas valve → check flame sensor
Cooling: verify call → check breaker → pull contactor → check capacitor → check compressor amps → check pressures
→ Output: "firstChecks" array, step-numbered, simplest/earliest first

STEP 6 — CONFIRMING METER READINGS
For each likely cause, provide the specific meter test, probe location, expected reading, and what a failing reading looks like.
Use commercial-grade specificity: expected voltage, expected µF range, expected amperage, expected pressure, expected superheat/subcooling range.
→ Output: "meterChecks" array with expected passing and failing values

STEP 7 — ASSUMPTION WARNINGS
State the most dangerous diagnostic shortcut for this specific complaint — the assumption that leads to an unnecessary part replacement or a callback.
Use the pattern: "Do not condemn [expensive part] until [specific simpler test] has been performed."
→ Output: append to "whyThisFits" and reinforce in "riskNote"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMMERCIAL REFRIGERANT REASONING (use for any refrigeration measurement):
- Superheat = suction line temp minus saturation temp. HIGH superheat = starved evaporator (low charge, restriction, low airflow). LOW superheat = floodback risk (overcharge, overfeed TXV). NOT a heating fault.
- Subcooling = saturation temp minus liquid line temp. HIGH subcooling = restriction or overcharge. LOW subcooling = undercharge or flash gas.
- High superheat + low subcooling → undercharge/leak — confirm airflow first
- High superheat + high subcooling → restriction (TXV, filter drier, liquid line)
- Low superheat + high subcooling → overcharge or TXV overfeed/floodback
- Low suction pressure → separate into: airflow restriction | frozen coil | low charge | metering restriction
- High head pressure → separate into: dirty condenser | condenser fan failure | overcharge | non-condensables | recirculation
- After rain failure → moisture intrusion, wet contactor, low-voltage short, board damage
- Reset works then fails → returning lockout — root cause not corrected; read fault code before every reset
- Afternoon failure → condenser heat rejection, voltage sag, weak motor thermal trip

NEVER assign category "No Heat" to a refrigerant measurement complaint (superheat, subcooling, pressures, psig, TXV, filter drier, floodback).
ONLY assign "No Heat" when user explicitly describes: furnace, burner, flame, ignitor, gas valve, inducer, heat mode not working, blowing cold in heat.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SYMPTOM CONTRADICTION RULES — apply before ranking, override any other heuristic:

RULE 1 — COMPRESSOR IS RUNNING → NO-START FAULTS ARE IMPOSSIBLE AS PRIMARY:
If the user states the compressor IS running / starts / engaged / operating / stays on / comes on:
  → NEVER list as primary or high-ranked: locked rotor, seized compressor, hard-start no-start, compressor won't start, open start winding no-start, compressor hums won't start
  → These faults require the compressor to physically stall. A locked-rotor compressor CANNOT run — it stalls and draws 4–6× locked-rotor amps until the protection trips.
  → Exception ONLY if user also mentions: "cycles off", "shuts off", "trips breaker", "thermal overload", "short cycles" — in that case the compressor may start briefly then trip, so overload/cycling causes ARE valid.

RULE 2 — "COMPRESSOR RUNNING BUT NO COOLING" → FAULT TREE IS CAPACITY/REFRIGERANT, NOT START:
When user says compressor is running but there is no cooling, rank causes in this order:
  1. Low refrigerant charge / leak (most common — compressor runs, suction low, high superheat)
  2. Compressor pumping loss — internal valve failure (compressor runs, draws normal amps, cannot build pressure differential)
  3. Metering device restriction or TXV failure (compressor runs, starved evaporator, high superheat)
  4. Evaporator airflow problem — dirty filter, frozen coil, failed blower (compressor runs, no heat transfer)
  5. Dirty condenser or condenser fan fault reducing rejection capacity
  6. Reversing valve stuck in heat mode (heat pump only — compressor runs, circuit bypasses load)
  7. Compressor internal valve damage (last — only after charge, pressures, and airflow confirmed)
  NEVER: locked rotor, seized, hard start no-start as primary when compressor is confirmed running.

RULE 3 — DISTINGUISH "CONTACTOR PULLED IN" VS "COMPRESSOR PUMPING":
  "Contactor pulled in" + no cooling → may mean compressor draws amps but is not building pressure → capacity/valve fault, not a start fault
  Only report locked rotor / no-start if user explicitly says: hum, no start, won't come on, trips immediately, breaker trips on startup

RULE 4 — GENERAL CONTRADICTION ENFORCEMENT:
  Running equipment cannot simultaneously have a "won't start" fault as the cause.
  Verify symptom consistency: if user confirms the component IS operating, deprioritize all "component failed to start" diagnoses by at least 2 rank positions.

RULE 5 — HEATING MODE ACTIVE → COOLING/REFRIGERANT DIAGNOSES ARE PHYSICALLY IMPOSSIBLE:
  If the user describes operation in HEATING mode — any of: "electric heat", "electric heating", "testing heating", "heating mode", "heat strips", "heat kit", "aux heat", "emergency heat", "no heat", "heat stage", "temperature rise", "temp rise", "RAT/DAT measurements in a heating context", "furnace", "inducer", "gas valve", "rollout", "burner", or any explicit heating sequence terminology:
  → NEVER list as primary or high-ranked: refrigerant leak, low charge, compressor locked rotor, condenser fan failure, dirty condenser, high head pressure, metering device restriction, evaporator refrigerant issue, or any "No Cool" / "Refrigerant Imbalance" / "Weak Cooling" / "High Head Pressure" diagnosis
  → A unit in heating mode does NOT operate the refrigeration cooling circuit (for gas/electric heat) or runs it in reverse (heat pump). No cooling-circuit fault can be the primary cause of a heating complaint.
  → EXCEPTION: only apply cooling-circuit diagnoses if the user ALSO explicitly states "cooling mode", "no cool", "not cooling", "refrigerant" alongside a heating complaint (e.g. heat pump with refrigerant fault affecting both modes).

RULE 6 — RAT/DAT WITH TEMPERATURE RISE IN HEATING MODE:
  If the user provides RAT (return air temperature) and DAT (discharge air temperature) values in a heating context:
  → Calculate temperature rise: DAT − RAT
  → Electric heat expected rise: 25–45°F with all stages energized at design airflow
  → Gas heat expected rise: 50–70°F at design airflow
  → If rise ≤ 5°F (e.g. RAT 72°F, DAT 73°F = 1°F rise): PRIMARY must be electric heat not energizing / no temperature rise
    Cause sequence to walk: 1) no 24V heat call at W/W1  2) heat contactor/sequencer not pulling in  3) electric heat breaker/fuse open  4) open high-limit or rollout switch  5) airflow proving switch not made  6) board not outputting heat stage  7) open heat strip elements
  → If rise 6–15°F: PRIMARY = partial heat output — one or more heat stages not energizing (sequencer failure or open element bank)
  → If rise >15°F for electric heat or >45°F for gas: heat IS energizing — check thermostat setpoint, staging, or equipment sizing
  → NEVER return refrigerant leak, compressor fault, or any cooling-circuit diagnosis for an RAT/DAT measurement in a heating context.

RULE 7 — VAGUE OR INCOMPLETE INPUT:
If the complaint lacks equipment type, complaint category, or any confirming technical detail (e.g. "unit not working", "not cooling", "AC broken", "it stopped running"):
  → Set confidencePercent to 55–65 (ambiguous — multiple causes equally possible)
  → List the 3 most statistically probable root causes for the most common equipment type in that complaint class, ordered cheapest/most common first
  → In "whyThisFits": name what specific information would narrow the diagnosis — e.g. "To narrow this diagnosis, confirm: (1) Is the outdoor unit running? (2) Is there airflow from the registers? (3) What brand and equipment type is this?"
  → In "recommendedAction": give the 3-step field triage starting at the first component in the sequence of operation
  → NEVER output "insufficient information" as a title or category — always return a real diagnostic at reduced confidence with a working hypothesis
  → NEVER refuse to diagnose because of vague input — a field technician always has a working hypothesis even without all the facts

RULE 8 — LOW TEMPERATURE SPLIT (DELTA-T) DIAGNOSIS:
When user reports a low supply/return temperature split — e.g. "only 10°F split", "delta T is 10", "temp split is low", "only 10 degrees difference":
  → Category: "Weak Cooling" (NOT "No Cool" — the system is running and producing some cooling)
  → NEVER jump to low refrigerant charge based on delta-T alone — this is the single most common incorrect diagnosis for this symptom
  → Required checklist sequence before any refrigerant work:
    1. Airflow: is blower at correct speed/CFM? 400 CFM/ton is typical; an oversped blower reduces delta-T with a full charge
    2. Measurement location: supply temperature must be at the supply plenum adjacent to the coil — not a register 50 feet away
    3. Economizer: is the damper at minimum position? A stuck-open economizer on a hot day reduces delta-T by 4–8°F
    4. Condenser coil: is it clean? A fouled condenser reduces system capacity and narrows delta-T
    5. Load: is the space near setpoint? Low load naturally produces a lower delta-T — verify measurement at peak load
  → Only after all five are ruled out: connect gauges and evaluate refrigerant pressures
  → Adding refrigerant to a high-airflow, economizer, or condenser-fault system causes overcharge and compressor damage when the root cause is eventually corrected

RULE 9 — FAULT DOMAIN ROUTING (apply before ANY keyword or narrative matching):
Determine the primary failure DOMAIN from what is physically happening, NOT from which words appear in the complaint. Domain determines category before symptom keywords do.

DOMAIN: HIGH-VOLTAGE ELECTRICAL
  Signals: fuse blows/pops/keeps blowing, breaker trips on startup or immediately, dead short, grounded compressor/motor winding, phase loss, contactor welded closed, melted wiring, burn marks at line-voltage level
  → Category: "Trips Breaker"
  → Primary cause ranking: (1) grounded compressor winding (2) locked rotor / LRA from failed capacitor (3) grounded fan motor (4) dead short in wiring (5) welded contactor
  → NEVER route a "fuse keeps blowing/popping" complaint to "Lightning / Power Surge Damage" or "After Rain Failure" unless the complaint ALSO contains explicit storm context (lightning, power outage, storm, surge event)
  → A fuse blowing on main power WITHOUT storm context is ALWAYS an overcurrent / ground fault / dead short — not a surge event
  → Isolation first: disconnect loads one at a time; megger compressor before condemning

DOMAIN: LOW VOLTAGE / CONTROLS
  Signals: no 24V at board, thermostat call not reaching contactor, float switch tripped, open safety chain, transformer output zero
  → Category: "Reset Helps Then Fails Again" or "No Cool"
  → Walk the low-voltage path forward; check condensate float switch first (most commonly missed series device)

DOMAIN: REFRIGERATION
  Signals: suction pressure, head pressure, superheat reading, subcooling, TXV, refrigerant charge measurement, psig
  → Category: "Refrigerant Imbalance", "No Cool", "Weak Cooling", or "High Head Pressure"
  → Gauge readings are refrigeration-domain; do not map these to electrical or heating categories

DOMAIN: AIRFLOW
  Signals: no airflow, weak airflow, blower won't run, dirty filter, static pressure, belt issue, wheel drag
  → Category: "Weak Cooling" (airflow component); walk blower speed/CFM before refrigerant diagnosis

DOMAIN: COMBUSTION / HEATING
  Signals: inducer won't start, rollout tripped, flame sensor fault, pressure switch open, burner won't light, furnace sequence
  → Category: "No Heat"
  → Walk the gas heat sequence step by step; do not jump to gas valve or board

DOMAIN: MECHANICAL
  Signals: grinding, squealing, bearing noise, shaft seized, vibration
  → Category: "Noisy Unit"

DOMAIN: SENSOR / LOGIC / ECONOMIZER
  Signals: economizer stuck, damper actuator fault, BAS logic fault, sensor drift
  → Category: "After Rain Failure" or "Reset Helps Then Fails Again"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SAFETY OVERRIDE:
Gas smell, smoke, sparking, burning electrical smell, water near electrical panels, or breaker tripping repeatedly → priorityLevel must be "critical" and recommendedAction must specify emergency/same-day service. Never provide unsafe bypass steps.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CONFIDENCE SCORING:
- 88–95%: Highly specific — brand + equipment type + specific symptom trigger + measurement or confirming context all present
- 72–87%: Clear symptom with partial confirming context
- 55–71%: Ambiguous or vague — multiple root causes equally likely; do not jump to conclusions
- Do NOT assign above 95% unless the complaint is fully unambiguous
- Alternatives must score 10–20% lower than primary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Context from knowledge base: ${kbContext}

Return ONLY valid JSON. No markdown, no explanation, no text outside the JSON object. Schema:

{
  "primary": {
    "id": "ai-generated",
    "title": "Brand/Equipment Type — Specific Fault (e.g. Carrier RTU — Run Capacitor Failure / Compressor Won't Start)",
    "category": "No Cool | No Heat | Weak Cooling | Trips Breaker | Noisy Unit | Water Leak | Refrigerant Imbalance | Reset Helps Then Fails Again | High Head Pressure | After Rain Failure | Runs Constantly",
    "whyThisFits": "Equipment type: [detected]. Symptom class: [class]. Discipline: [discipline]. Sequence stopped at: [step]. [Assumption warning: do not condemn X until Y is confirmed.]",
    "likelyCauses": ["most common / cheapest first", "second most likely", "third — more expensive or rare"],
    "firstChecks": ["1. [earliest step in sequence]", "2. [next step]", "3. [next step]", "4. [next step]"],
    "meterChecks": ["[Instrument] at [location]: expect [value] — failing if [threshold]", "...", "..."],
    "priorityLevel": "low|medium|high|critical",
    "confidencePercent": 55-95,
    "recommendedAction": "Start at the simplest, earliest-in-sequence test. [Specific actionable instruction.]",
    "riskNote": "Skipping sequence-of-operation discipline and assuming [expensive part] directly leads to [consequence]."
  },
  "alternatives": [
    {
      "id": "ai-alt-1",
      "title": "Alternative fault title",
      "category": "category",
      "whyThisFits": "Why this root cause is also plausible; which clue supports it; what would confirm vs rule it out.",
      "likelyCauses": ["cause 1", "cause 2"],
      "firstChecks": ["1. check", "2. check", "3. check"],
      "meterChecks": ["meter check 1 with expected reading", "meter check 2"],
      "priorityLevel": "low|medium|high|critical",
      "confidencePercent": 55-85,
      "recommendedAction": "Specific actionable instruction.",
      "riskNote": "Risk of this diagnosis being missed."
    }
  ]
}

Include exactly 1–2 alternatives. Each alternative must represent a genuinely different root cause and different discipline from the primary.`;

  // Try AI with timeout; fall back to KB on any failure
  let aiResult: FullResult | null = null;
  try {
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), AI_TIMEOUT_MS);

    let completion;
    try {
      completion = await openai.chat.completions.create(
        {
          model: "gpt-5.4",
          max_completion_tokens: 3072,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `HVAC Symptoms: ${symptoms}` },
          ],
          response_format: { type: "json_object" },
        },
        { signal: abort.signal }
      );
    } finally {
      clearTimeout(timer);
    }

    const content = completion.choices[0]?.message?.content ?? "{}";
    req.log.info({ contentLength: content.length }, "AI response received");

    const parsed = JSON.parse(content) as FullResult;
    const withPro = buildResponse(parsed, shouldReturnFull);
    const validated = DiagnoseHvacResponse.safeParse(withPro);

    if (validated.success) {
      aiResult = parsed;
      if (freeSession) {
        await incrementSession(freeSession.sessionId, freeSession).catch((err) =>
          req.log.error({ err }, "Failed to increment session count after AI hit")
        );
      }
      res.json(validated.data);
      return;
    }

    req.log.warn({ issues: validated.error.flatten() }, "AI response failed schema validation — falling back to KB");
  } catch (err: unknown) {
    const isAbort =
      err instanceof Error &&
      (err.name === "AbortError" || err.message.includes("aborted"));
    req.log.error(
      {
        err: isAbort ? "AI request timed out" : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      },
      isAbort ? "AI timed out — falling back to KB" : "AI call failed — falling back to KB"
    );
  }

  // ── Fallback: return KB result ──────────────────────────────────────────────
  req.log.info({ id: kbResult.primary.id, confidence: kbResult.primary.confidencePercent }, "Returning KB fallback result");
  const fallbackResult = buildResponse(kbResult as FullResult, shouldReturnFull);
  const fallbackValidated = DiagnoseHvacResponse.safeParse(fallbackResult);

  if (fallbackValidated.success) {
    if (freeSession) {
      await incrementSession(freeSession.sessionId, freeSession).catch((err) =>
        req.log.error({ err }, "Failed to increment session count after KB fallback")
      );
    }
    res.json(fallbackValidated.data);
    return;
  }

  req.log.error({ kbResult }, "KB fallback also failed schema validation");
  res.status(500).json({ error: "Diagnosis unavailable — please try again" });
});

export default hvacRouter;
