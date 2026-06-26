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

PROCESSING PIPELINE (execute silently in this order):

═══════════════════════════════════════════
STAGE 1 — HVAC SPEECH CORRECTION
═══════════════════════════════════════════
Fix ONLY obvious speech-recognition errors using HVAC context and the vocabulary above.
This is NOT rewriting — preserve the technician's words, structure, and all numbers exactly.
Only correct clear phonetic mishearings.

Correction examples:
• "Richard system" → "recharge system"
• "XV" or "TVX" → "TXV"
• "scene pressure" → "suction pressure"
• "head pressure pressure" → "head pressure"
• "contact your" or "contactor" → "contactor"
• "filter dryer" → "filter drier"
• "410A" → "R-410A"
• "blower wheel assembly" stays as-is (already correct)
• Filler words (um, uh) → omit

SAFETY RULES — never break:
• Preserve ALL numerical values exactly as spoken — pressures, voltages, temperatures, amperages, amounts.
• Never fabricate any technical fact not explicitly present in the raw transcript.
• Never invent model numbers, serial numbers, refrigerant amounts, or dates.
• If a word could be an HVAC term but you are uncertain, preserve the original and flag it.

The corrected transcript goes in "correctedTranscript".

═══════════════════════════════════════════
STAGE 2 — REPORT SECTION GENERATION
═══════════════════════════════════════════
From the corrected transcript, populate each section.
Use professional HVAC service language. Complete sentences.
Omit any section where no information exists in the transcript (set to null).
NEVER invent content.

Sections:
• problem        — Reason for the service call or customer complaint (1–2 sentences)
• findings       — What the technician found: conditions observed, readings noted, components inspected
• workPerformed  — All repairs, adjustments, cleaning, replacements, and service actions taken
• partsReplaced  — Parts or components installed (one sentence listing them, or null)
• measurements   — Instrument readings: pressures, voltages, amperages, temperatures, subcooling, superheat, delta T (null if none mentioned)
• verification   — How the technician confirmed the repair was successful / unit back in operation
• recommendation — Return visits, follow-up actions, monitoring advice, customer advisories (null if none)

═══════════════════════════════════════════
STAGE 3 — STRUCTURED DATA EXTRACTION
═══════════════════════════════════════════
Extract discrete facts from the corrected transcript.
Use null for any field not present. Use false for boolean fields if not mentioned.
For workCategories, use these tags (include all that apply):
"PM", "Filter Change", "Belt Change", "Lubrication", "Drain Cleaning",
"Condenser Cleaning", "Evaporator Cleaning", "Refrigerant Work",
"Electrical Repair", "Mechanical Repair", "Control Repair",
"Thermostat Work", "Economizer Work", "VFD Work",
"Motor Replacement", "Compressor Replacement", "Fan Replacement",
"Blower Work", "Heat Section Work", "Combustion Work",
"Diagnostic", "Return Visit Scheduled"

RESPOND with ONLY a valid JSON object. No markdown. No explanation. Just JSON:
{
  "correctedTranscript": "<corrected transcript text>",
  "confidence": <integer 0–100>,
  "sections": {
    "problem":        "<text or null>",
    "findings":       "<text or null>",
    "workPerformed":  "<text or null>",
    "partsReplaced":  "<text or null>",
    "measurements":   "<text or null>",
    "verification":   "<text or null>",
    "recommendation": "<text or null>"
  },
  "structured": {
    "refrigerantType":      "<e.g. R-410A or null>",
    "refrigerantCharge":    "<total charge with units or null>",
    "refrigerantRecovered": "<amount recovered or null>",
    "refrigerantAdded":     "<amount added or null>",
    "modelNumber":          "<model or null>",
    "serialNumber":         "<serial or null>",
    "suctionPressure":      "<value with units or null>",
    "dischargePressure":    "<value with units or null>",
    "voltage":              "<value or null>",
    "amperage":             "<value or null>",
    "superheat":            "<value or null>",
    "subcooling":           "<value or null>",
    "deltaT":               "<value or null>",
    "splitTemp":            "<value or null>",
    "gasPressure":          "<value or null>",
    "partsReplaced":        ["<part name>"],
    "returnVisitRequired":  false,
    "followUpDate":         "<date string or null>",
    "safetyFlag":           "<safety concern or null>",
    "warrantyMention":      "<warranty info or null>",
    "workCategories":       ["<tag>"]
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
