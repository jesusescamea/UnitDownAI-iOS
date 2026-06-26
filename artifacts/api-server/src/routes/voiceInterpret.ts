import { Router, type IRouter, type Request, type Response } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { z } from "zod/v4";
import { buildHvacDictionaryPrompt } from "../data/hvacDictionary";

const voiceInterpretRouter: IRouter = Router();

const VOICE_INTERPRET_TIMEOUT_MS = 35_000;

// ─── Request validation ───────────────────────────────────────────────────────

const UserVoiceCorrectionSchema = z.object({
  original:  z.string(),
  preferred: z.string(),
  count:     z.number().int().min(1),
});

const VoiceInterpretBodySchema = z.object({
  rawTranscript:   z.string().min(1),
  userCorrections: z.array(UserVoiceCorrectionSchema).optional(),
});

// ─── AI response shape ────────────────────────────────────────────────────────

const MemoryExtractsSchema = z.object({
  componentsReplaced: z.array(z.string()),
  repairsPerformed:   z.array(z.string()),
  refrigerantType:    z.string().nullable(),
  refrigerantAmount:  z.string().nullable(),
  followUp:           z.string().nullable(),
  pmReminders:        z.string().nullable(),
  observedConditions: z.string().nullable(),
  warrantyInfo:       z.string().nullable(),
});

const UncertainPhraseSchema = z.object({
  original:   z.string(),
  suggested:  z.string(),
  confidence: z.number().int().min(0).max(100),
});

const AiOutputSchema = z.object({
  original:         z.string(),
  professional:     z.string(),
  customer:         z.string(),
  confidence:       z.number().int().min(0).max(100),
  uncertainPhrases: z.array(UncertainPhraseSchema),
  memoryExtracts:   MemoryExtractsSchema,
});

// ─── Fallback when the AI returns malformed JSON ──────────────────────────────

function buildFallback(rawTranscript: string): z.infer<typeof AiOutputSchema> {
  return {
    original:         rawTranscript,
    professional:     rawTranscript,
    customer:         rawTranscript,
    confidence:       50,
    uncertainPhrases: [],
    memoryExtracts: {
      componentsReplaced: [],
      repairsPerformed:   [],
      refrigerantType:    null,
      refrigerantAmount:  null,
      followUp:           null,
      pmReminders:        null,
      observedConditions: null,
      warrantyInfo:       null,
    },
  };
}

// ─── System prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  return `You are UnitDown's HVAC Voice Intelligence Engine — an expert system that combines deep commercial HVAC knowledge with intelligent speech-recognition correction.

Your job is to take a raw voice transcript from a commercial HVAC technician and produce professional field documentation.

${buildHvacDictionaryPrompt()}

PROCESSING PIPELINE (execute silently in this order):
1. INTERPRET: Apply HVAC context to correct likely speech-recognition errors. Use the vocabulary and corrections above as your primary guide. When context makes an HVAC term obvious, prefer the correct HVAC spelling.
2. EVALUATE: Score overall interpretation confidence 0–100. Flag any phrase where you are less than 85% confident in the correction as an uncertainPhrase.
3. GENERATE: Produce all three documentation versions from the corrected interpretation (not from the raw transcript).
4. EXTRACT: Pull discrete facts for Equipment Memory.

SAFETY RULES — never break these:
• Never fabricate repairs, replaced parts, pressures, temperatures, refrigerant types or amounts, voltages, amperages, or any technical fact not explicitly present in the raw transcript.
• Preserve ALL numerical values exactly as spoken — weights, pressures, voltages, temperatures, amperages, measurements.
• If a word could be an HVAC term but you are not certain, preserve the original word and flag it in uncertainPhrases with a lower confidence score.
• The "original" field must be the raw transcript exactly as received — no changes of any kind.
• Do NOT add invented context, dates, technician names, or equipment identifiers that were not in the transcript.

DOCUMENTATION STYLES:
• professional: Written like an experienced commercial HVAC technician documenting work for another technician, office manager, or service company. Complete sentences, professional HVAC terminology, proper grammar, no unnecessary filler words.
• customer: Written for someone with absolutely no HVAC knowledge. Plain English only, avoid abbreviations, explain what happened, what was repaired, and the result. Reassuring, concise, and jargon-free.

RESPOND with ONLY a valid JSON object. No markdown, no explanation, no preamble. Just the JSON:
{
  "original": "<raw transcript exactly as received>",
  "professional": "<professional HVAC service documentation>",
  "customer": "<plain English for building owner or facilities manager>",
  "confidence": <integer 0–100>,
  "uncertainPhrases": [
    { "original": "<phrase as heard in transcript>", "suggested": "<HVAC interpretation>", "confidence": <integer 0–100> }
  ],
  "memoryExtracts": {
    "componentsReplaced": ["<component name>"],
    "repairsPerformed": ["<repair description>"],
    "refrigerantType": "<refrigerant type or null>",
    "refrigerantAmount": "<amount with units or null>",
    "followUp": "<follow-up work needed or null>",
    "pmReminders": "<PM reminder or null>",
    "observedConditions": "<notable conditions observed or null>",
    "warrantyInfo": "<warranty-relevant information or null>"
  }
}`;
}

function buildUserCorrectionNote(
  corrections: Array<{ original: string; preferred: string; count: number }>,
): string {
  if (!corrections.length) return "";
  const lines = corrections.map(
    (c) =>
      `  When the technician says "${c.original}", they prefer "${c.preferred}" (confirmed ${c.count}× in prior sessions).`,
  );
  return `\nTECHNICIAN VOCABULARY PROFILE (personal preferences learned over time — apply these first):\n${lines.join("\n")}\n`;
}

// ─── Route ────────────────────────────────────────────────────────────────────

voiceInterpretRouter.post("/ai/voice/interpret", async (req: Request, res: Response) => {
  const parsed = VoiceInterpretBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }

  const { rawTranscript, userCorrections = [] } = parsed.data;

  req.log.info(
    { transcriptLength: rawTranscript.length, correctionCount: userCorrections.length },
    "Voice interpret requested",
  );

  const correctionNote = buildUserCorrectionNote(userCorrections);
  const userMessage = `${correctionNote}RAW VOICE TRANSCRIPT:\n${rawTranscript}\n\nApply the full processing pipeline and return the JSON object:`;

  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), VOICE_INTERPRET_TIMEOUT_MS);

  try {
    let completion;
    try {
      completion = await openai.chat.completions.create(
        {
          model:                 "gpt-5.4",
          max_completion_tokens: 2000,
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

    let aiOutput: z.infer<typeof AiOutputSchema>;
    try {
      aiOutput = AiOutputSchema.parse(JSON.parse(rawJson));
    } catch {
      req.log.warn(
        { rawJsonSnippet: rawJson.slice(0, 300) },
        "Voice interpret JSON parse/validation failed — using fallback",
      );
      aiOutput = buildFallback(rawTranscript);
    }

    req.log.info(
      { confidence: aiOutput.confidence, uncertainCount: aiOutput.uncertainPhrases.length },
      "Voice interpret complete",
    );

    res.json(aiOutput);
  } catch (err) {
    req.log.error({ err }, "Voice interpret failed");
    res.status(500).json({ error: "Voice interpretation unavailable. Please try again." });
  }
});

export default voiceInterpretRouter;
