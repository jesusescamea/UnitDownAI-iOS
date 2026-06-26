import { Router, type IRouter, type Request, type Response } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { AiPolishBody } from "@workspace/api-zod";

const aiPolishRouter: IRouter = Router();

const AI_POLISH_TIMEOUT_MS = 15_000;

// ─── Mode-specific writing instructions ───────────────────────────────────────

const MODE_INSTRUCTIONS: Record<string, string> = {
  professional:
    "Write client-facing professional documentation. Use complete sentences, formal HVAC industry language, and third-person voice where appropriate. Suitable for service reports delivered to building owners or facilities managers.",
  technician:
    "Use concise technical shorthand with commercial HVAC terminology. Abbreviations (RTU, AHU, TXV, HP, LP, MCA, MOCP, etc.) are expected and correct. Written for the next technician who opens this unit.",
  warranty:
    "Write objective manufacturer warranty documentation. All observed conditions and corrective actions must be explicitly stated. Third-person, factual, complete sentences. Suitable for filing a warranty claim.",
  "equipment-memory":
    "Write exactly 1–2 sentences. A brief summary that lets a future technician instantly understand the unit's service history and any recurring issues. No fluff.",
  "pm-summary":
    "Write a professional preventive maintenance summary suitable for client service records. Clear, organized, and professional. Include what was inspected, what was found, and what action was taken.",
  "email-customer":
    "Write in a friendly, jargon-free tone for a building owner or facilities manager. Explain the situation clearly without overwhelming technical detail. Reassuring, concise, and professional.",
  "work-order":
    "Write clean, structured work order documentation ready for office records and billing. Include the problem, the corrective action, and any follow-up required. Professional and complete.",
};

// ─── Base system prompt (fact-preservation is non-negotiable) ─────────────────

const BASE_SYSTEM_PROMPT = `You are an expert HVAC documentation specialist. Your sole job is to improve the clarity and professionalism of technician field notes.

STRICT RULES — never break these:
1. Do NOT add, invent, or fabricate any information. This includes repairs, diagnoses, pressures, temperatures, voltages, amperages, refrigerant values, model numbers, serial numbers, dates, customer names, unit types, or any technical fact not already present in the original text.
2. PRESERVE exactly: all numerical values, measurements, equipment identifiers, names, and dates as written in the original.
3. ONLY improve: grammar, punctuation, sentence structure, professional tone, and logical organization.
4. If you are unsure what a term or abbreviation means, keep the original phrasing — do not interpret or guess.
5. Output ONLY the improved text. No preamble, no explanation, no quotes, no markdown.`;

// ─── Speech interpretation prefix ────────────────────────────────────────────
//
// Appended when fromVoice=true. Speech recognition in the field frequently
// mishears HVAC terminology — this instructs the model to silently correct
// likely phonetic substitutions before applying the writing style.
//
// Common patterns:
//   "XV"           → TXV (thermostatic expansion valve)
//   "filter dryer" → filter drier
//   "freon"        → refrigerant (or specific type if mentioned)
//   "got to say"   → Arrived on site (mishearing of "Arrived on site")
//   Generic filler at the start → appropriate arrival phrase
//
// Numbers and measurements are always preserved exactly.

const VOICE_INTERPRETATION_PREFIX = `
STEP 1 — INTERPRET SPEECH (do this silently before writing anything):
The input is a raw voice recognition transcript from an HVAC technician in the field. Speech recognition commonly mishears technical terminology.

Before writing, silently correct likely speech recognition errors:
- Phonetic mishearings of HVAC terms: "XV" → TXV, "filter dryer" → filter drier, garbled abbreviations → their likely intended HVAC equivalent
- Opening phrases that are clearly misheard arrival/start phrases (e.g., "got to say", "wanna say", "had to say") → "Arrived on site" or equivalent
- Misheard brand names or refrigerant designations when context makes the correct term obvious
- Filler words that are obviously transcription noise (e.g., "um", "uh") → omit

NEVER alter: any number, weight, pressure, temperature, refrigerant amount, voltage, amperage, degree split, superheat, subcooling, or any other measurement. Preserve all quantities exactly as spoken.
If a word could be a mishearing of an HVAC term but you are not certain, keep the original.

STEP 2 — WRITE in the requested style using the corrected interpretation.`;

// ─── Route ────────────────────────────────────────────────────────────────────

aiPolishRouter.post("/ai/polish", async (req: Request, res: Response) => {
  const parsed = AiPolishBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }

  const { text, mode, fromVoice } = parsed.data;
  if (!text.trim()) {
    res.status(400).json({ error: "Text cannot be empty." });
    return;
  }

  const modeInstructions = MODE_INSTRUCTIONS[mode] ?? MODE_INSTRUCTIONS["professional"];
  const systemPrompt = fromVoice
    ? BASE_SYSTEM_PROMPT + VOICE_INTERPRETATION_PREFIX
    : BASE_SYSTEM_PROMPT;

  req.log.info({ mode, fromVoice: !!fromVoice, textLength: text.length }, "AI Polish requested");

  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), AI_POLISH_TIMEOUT_MS);

  try {
    let completion;
    try {
      completion = await openai.chat.completions.create(
        {
          model: "gpt-5.4",
          max_completion_tokens: 800,
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `WRITING STYLE: ${modeInstructions}\n\n${fromVoice ? "RAW VOICE TRANSCRIPT" : "ORIGINAL TEXT"}:\n${text}\n\nApply Step 1 (interpret) then Step 2 (write) following all strict rules above:`,
            },
          ],
        },
        { signal: abort.signal }
      );
    } finally {
      clearTimeout(timer);
    }

    const polished = completion.choices[0]?.message?.content?.trim() ?? text.trim();
    req.log.info({ mode, fromVoice: !!fromVoice, polishedLength: polished.length }, "AI Polish complete");
    res.json({ polished });
  } catch (err) {
    req.log.error({ err, mode }, "AI Polish failed");
    res.status(500).json({ error: "AI polish unavailable. Please try again." });
  }
});

export default aiPolishRouter;
