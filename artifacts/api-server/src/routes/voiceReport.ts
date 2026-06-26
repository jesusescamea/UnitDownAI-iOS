import { Router, type IRouter, type Request, type Response } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { z } from "zod/v4";
import { buildHvacDictionaryPrompt } from "../data/hvacDictionary";

const voiceReportRouter: IRouter = Router();

const VOICE_REPORT_TIMEOUT_MS = 50_000;

// ─── Request validation ───────────────────────────────────────────────────────

const UserVoiceCorrectionSchema = z.object({
  original:  z.string(),
  preferred: z.string(),
  count:     z.number().int().min(1),
});

const VoiceReportBodySchema = z.object({
  rawTranscript:   z.string().min(1),
  userCorrections: z.array(UserVoiceCorrectionSchema).optional(),
});

// ─── AI response shape ────────────────────────────────────────────────────────

const ReportSectionsSchema = z.object({
  problem:        z.string().nullable(),
  findings:       z.string().nullable(),
  workPerformed:  z.string().nullable(),
  partsReplaced:  z.string().nullable(),
  measurements:   z.string().nullable(),
  verification:   z.string().nullable(),
  recommendation: z.string().nullable(),
});

const StructuredDataSchema = z.object({
  refrigerantType:      z.string().nullable(),
  refrigerantCharge:    z.string().nullable(),
  refrigerantRecovered: z.string().nullable(),
  refrigerantAdded:     z.string().nullable(),
  modelNumber:          z.string().nullable(),
  serialNumber:         z.string().nullable(),
  suctionPressure:      z.string().nullable(),
  dischargePressure:    z.string().nullable(),
  voltage:              z.string().nullable(),
  amperage:             z.string().nullable(),
  superheat:            z.string().nullable(),
  subcooling:           z.string().nullable(),
  deltaT:               z.string().nullable(),
  splitTemp:            z.string().nullable(),
  gasPressure:          z.string().nullable(),
  partsReplaced:        z.array(z.string()),
  returnVisitRequired:  z.boolean(),
  followUpDate:         z.string().nullable(),
  safetyFlag:           z.string().nullable(),
  warrantyMention:      z.string().nullable(),
  workCategories:       z.array(z.string()),
});

const UncertainPhraseSchema = z.object({
  original:   z.string(),
  suggested:  z.string(),
  confidence: z.number().int().min(0).max(100),
});

const AiReportOutputSchema = z.object({
  correctedTranscript: z.string(),
  confidence:          z.number().int().min(0).max(100),
  sections:            ReportSectionsSchema,
  structured:          StructuredDataSchema,
  uncertainPhrases:    z.array(UncertainPhraseSchema),
});

// ─── Fallback ─────────────────────────────────────────────────────────────────

function buildFallback(rawTranscript: string): z.infer<typeof AiReportOutputSchema> {
  return {
    correctedTranscript: rawTranscript,
    confidence: 50,
    sections: {
      problem: rawTranscript,
      findings: null,
      workPerformed: null,
      partsReplaced: null,
      measurements: null,
      verification: null,
      recommendation: null,
    },
    structured: {
      refrigerantType: null,
      refrigerantCharge: null,
      refrigerantRecovered: null,
      refrigerantAdded: null,
      modelNumber: null,
      serialNumber: null,
      suctionPressure: null,
      dischargePressure: null,
      voltage: null,
      amperage: null,
      superheat: null,
      subcooling: null,
      deltaT: null,
      splitTemp: null,
      gasPressure: null,
      partsReplaced: [],
      returnVisitRequired: false,
      followUpDate: null,
      safetyFlag: null,
      warrantyMention: null,
      workCategories: [],
    },
    uncertainPhrases: [],
  };
}

// ─── Prompts ──────────────────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  return `You are UnitDown's Smart Service Report Engine — a commercial HVAC AI that generates complete, structured service reports from technician voice notes.

${buildHvacDictionaryPrompt()}

PROCESSING PIPELINE (execute in this exact order — structured extraction BEFORE section writing):

═══════════════════════════════════════════
STAGE 1 — HVAC SPEECH CORRECTION
═══════════════════════════════════════════
Fix ONLY obvious speech-recognition errors using HVAC context and the vocabulary above.
This is NOT rewriting — preserve the technician's words, structure, and all numbers exactly.
Only correct clear phonetic mishearings.

Correction examples:
• "Richard system" → "recharged the system"
• "XV" or "TVX" → "TXV"
• "scene pressure" / "seen pressure" → "suction pressure"
• "head pressure pressure" → "discharge pressure"
• "contact your" / "contact her" → "contactor"
• "filter dryer" → "filter drier"
• "410A" / "R410" → "R-410A"
• "407" / "407C" → "R-407C"
• "22 refrigerant" / bare "22" in refrigerant context → "R-22"
• "EEM" / "EZM" → "ECM"
• "equalizer" in HVAC context → "economizer"
• "blower wheel assembly" → stays as-is (already correct)
• Filler words (um, uh, like, you know) → omit

SAFETY RULES — never break:
• Preserve ALL numerical values exactly as spoken — pressures, voltages, temperatures, amperages, amounts.
• Never fabricate any technical fact not explicitly present in the raw transcript.
• Never invent model numbers, serial numbers, refrigerant amounts, or dates.

The corrected transcript goes in "correctedTranscript".

═══════════════════════════════════════════
STAGE 2 — STRUCTURED DATA EXTRACTION  ← DO THIS BEFORE WRITING SECTIONS
═══════════════════════════════════════════
Extract every discrete fact from the corrected transcript into the "structured" object.
Always include engineering units in extracted values:
• Pressures: "72 psi" (never bare "72")
• Temperatures, superheat, subcooling, delta-T, split: "12°F" (never bare "12")
• Voltage: "460 VAC" or "208 VAC" (never "460 volts")
• Amperage: "24.3 A" (never "24.3 amps")
• Refrigerant: full designation "R-410A" (never "410A" or "Freon")
• Gas pressure: "3.5 in. W.C." or appropriate unit

Use null for any field not mentioned. Use false for boolean fields if not mentioned.
For workCategories, include all that apply:
"PM", "Filter Change", "Belt Change", "Lubrication", "Drain Cleaning",
"Condenser Cleaning", "Evaporator Cleaning", "Refrigerant Work",
"Electrical Repair", "Mechanical Repair", "Control Repair",
"Thermostat Work", "Economizer Work", "VFD Work",
"Motor Replacement", "Compressor Replacement", "Fan Replacement",
"Blower Work", "Heat Section Work", "Combustion Work",
"Diagnostic", "Return Visit Scheduled"

═══════════════════════════════════════════
STAGE 3 — REPORT SECTION GENERATION
═══════════════════════════════════════════
Now write the report sections. Use the "structured" values you just extracted as the
authoritative source of truth for all numbers, units, and facts.

MANDATORY WRITING RULES:

1. VOICE — Implied first-person service report. NEVER write "Technician" or "The technician".
   Correct: "Arrived on site...", "Connected manifold gauges...", "Replaced the contactor.",
            "Verified proper cooling.", "Responded to a no-cooling complaint."
   Wrong:   "Technician arrived...", "The technician replaced..."

2. TRUST EXTRACTION — You already extracted structured data. Use those values in narratives.
   NEVER write "unclear", "possibly", or hedge a value you have already extracted.
   If structured.suctionPressure = "72 psi" → write "72 psi suction pressure" in Findings.
   If structured.superheat = "12°F" → write "12°F superheat" in Findings/Measurements.

3. ENGINEERING UNITS — Always include units in section narratives. Same rules as Stage 2.
   72 psi, 260 psi, 12°F, 9°F, 460 VAC, 24.3 A, R-410A — never bare numbers.

4. FINDINGS FORMAT — When measurements were taken, lead with the instrument action and
   list readings as bullet points:
   "Connected manifold gauges and measured:\n• 72 psi suction pressure\n• 260 psi discharge pressure\n• 12°F superheat\n• 9°F subcooling"

5. VERIFICATION — Must be specific to the actual work performed. Never generic.
   • After refrigerant work with a delta-T/split-temp: "Verified proper cooling with a [X]°F temperature split."
   • After refrigerant work without a split: "Verified proper system pressures and cooling operation."
   • After compressor/electrical replacement: "Verified compressor start and run, confirmed proper amperage draw."
   • After motor/fan replacement: "Verified fan and motor operation. Confirmed proper airflow."
   • After heat section / ignitor / gas valve work: "Verified ignition sequence and proper heat output."
   • After economizer work: "Verified economizer sequence and damper operation."
   • After VFD work: "Verified VFD programming and blower operation across speed range."
   • After PM / cleaning only: "Verified proper airflow and system operation."
   • After drain cleaning: "Verified condensate drainage and float switch operation."

6. BREVITY — Each section: 1–4 concise sentences or a short bulleted list. No padding.

7. NEVER INVENT — Do not fabricate any value not present in the corrected transcript.

Sections to populate (omit with null if no information exists):
• problem        — Reason for the call. "Responded to a [complaint] on [unit]." (1–2 sentences)
• findings       — What was found. Use bullet list if measurements present. (2–6 lines)
• workPerformed  — All actions taken. Short declarative sentences. (2–6 lines)
• partsReplaced  — Parts installed. One sentence listing them. null if none.
• measurements   — Instrument readings formatted with units. null if already fully covered in findings.
• verification   — Specific confirmation of successful repair per rule 5 above.
• recommendation — Return visits, monitoring, customer advisories. null if none.

RESPOND with ONLY a valid JSON object. No markdown. No explanation. Just JSON.
Field order matters — "structured" comes before "sections" so you populate facts first:
{
  "correctedTranscript": "<corrected transcript text>",
  "confidence": <integer 0–100>,
  "structured": {
    "refrigerantType":      "<full designation e.g. R-410A or null>",
    "refrigerantCharge":    "<total charge with units or null>",
    "refrigerantRecovered": "<amount recovered with units or null>",
    "refrigerantAdded":     "<amount added with units or null>",
    "modelNumber":          "<model or null>",
    "serialNumber":         "<serial or null>",
    "suctionPressure":      "<value with psi or null>",
    "dischargePressure":    "<value with psi or null>",
    "voltage":              "<value with VAC or null>",
    "amperage":             "<value with A or null>",
    "superheat":            "<value with °F or null>",
    "subcooling":           "<value with °F or null>",
    "deltaT":               "<value with °F or null>",
    "splitTemp":            "<value with °F or null>",
    "gasPressure":          "<value with units or null>",
    "partsReplaced":        ["<exact part name>"],
    "returnVisitRequired":  false,
    "followUpDate":         "<date string or null>",
    "safetyFlag":           "<safety concern or null>",
    "warrantyMention":      "<warranty info or null>",
    "workCategories":       ["<tag>"]
  },
  "sections": {
    "problem":        "<text or null>",
    "findings":       "<text or null>",
    "workPerformed":  "<text or null>",
    "partsReplaced":  "<text or null>",
    "measurements":   "<text or null>",
    "verification":   "<text or null>",
    "recommendation": "<text or null>"
  },
  "uncertainPhrases": [
    { "original": "<phrase as heard>", "suggested": "<HVAC interpretation>", "confidence": <0–100> }
  ]
}`;
}

function buildUserCorrectionNote(
  corrections: Array<{ original: string; preferred: string; count: number }>,
): string {
  if (!corrections.length) return "";
  const lines = corrections.map(
    (c) =>
      `  When this technician says "${c.original}", they prefer "${c.preferred}" (confirmed ${c.count}× in prior sessions).`,
  );
  return `\nTECHNICIAN VOCABULARY PROFILE (apply these corrections first):\n${lines.join("\n")}\n`;
}

// ─── Route ────────────────────────────────────────────────────────────────────

voiceReportRouter.post("/ai/voice/report", async (req: Request, res: Response) => {
  const parsed = VoiceReportBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }

  const { rawTranscript, userCorrections = [] } = parsed.data;

  req.log.info(
    { transcriptLength: rawTranscript.length, correctionCount: userCorrections.length },
    "Voice report requested",
  );

  const correctionNote = buildUserCorrectionNote(userCorrections);
  const userMessage = `${correctionNote}RAW VOICE TRANSCRIPT:\n${rawTranscript}\n\nExecute all three stages and return the JSON object:`;

  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), VOICE_REPORT_TIMEOUT_MS);

  try {
    let completion;
    try {
      completion = await openai.chat.completions.create(
        {
          model:                 "gpt-5.4",
          max_completion_tokens: 3000,
          response_format:       { type: "json_object" },
          messages: [
            { role: "system", content: buildSystemPrompt() },
            { role: "user",   content: userMessage },
          ],
        },
        { signal: abort.signal },
      );
    } finally {
      clearTimeout(timer);
    }

    const rawJson = completion.choices[0]?.message?.content ?? "{}";

    let aiOutput: z.infer<typeof AiReportOutputSchema>;
    try {
      aiOutput = AiReportOutputSchema.parse(JSON.parse(rawJson));
    } catch {
      req.log.warn(
        { rawJsonSnippet: rawJson.slice(0, 300) },
        "Voice report JSON parse/validation failed — using fallback",
      );
      aiOutput = buildFallback(rawTranscript);
    }

    req.log.info(
      {
        confidence:       aiOutput.confidence,
        uncertainCount:   aiOutput.uncertainPhrases.length,
        workCategories:   aiOutput.structured.workCategories,
        returnVisit:      aiOutput.structured.returnVisitRequired,
      },
      "Voice report complete",
    );

    res.json(aiOutput);
  } catch (err) {
    req.log.error({ err }, "Voice report failed");
    res.status(500).json({ error: "Service report generation unavailable. Please try again." });
  }
});

export default voiceReportRouter;
