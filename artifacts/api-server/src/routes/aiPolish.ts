import { Router, type IRouter, type Request, type Response } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { AiPolishBody } from "@workspace/api-zod";

const aiPolishRouter: IRouter = Router();

const AI_POLISH_TIMEOUT_MS = 12_000;

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

// ─── System prompt (fact-preservation is non-negotiable) ─────────────────────

const SYSTEM_PROMPT = `You are an expert HVAC documentation specialist. Your sole job is to improve the clarity and professionalism of technician field notes.

STRICT RULES — never break these:
1. Do NOT add, invent, or fabricate any information. This includes repairs, diagnoses, pressures, temperatures, voltages, amperages, refrigerant values, model numbers, serial numbers, dates, customer names, unit types, or any technical fact not already present in the original text.
2. PRESERVE exactly: all numerical values, measurements, equipment identifiers, names, and dates as written in the original.
3. ONLY improve: grammar, punctuation, sentence structure, professional tone, and logical organization.
4. If you are unsure what a term or abbreviation means, keep the original phrasing — do not interpret or guess.
5. Output ONLY the improved text. No preamble, no explanation, no quotes, no markdown.`;

// ─── Route ────────────────────────────────────────────────────────────────────

aiPolishRouter.post("/ai/polish", async (req: Request, res: Response) => {
  const parsed = AiPolishBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }

  const { text, mode } = parsed.data;
  if (!text.trim()) {
    res.status(400).json({ error: "Text cannot be empty." });
    return;
  }

  const modeInstructions = MODE_INSTRUCTIONS[mode] ?? MODE_INSTRUCTIONS["professional"];

  req.log.info({ mode, textLength: text.length }, "AI Polish requested");

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
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: `WRITING STYLE: ${modeInstructions}\n\nORIGINAL TEXT:\n${text}\n\nImprove the text following the strict rules above:`,
            },
          ],
        },
        { signal: abort.signal }
      );
    } finally {
      clearTimeout(timer);
    }

    const polished = completion.choices[0]?.message?.content?.trim() ?? text.trim();
    req.log.info({ mode, polishedLength: polished.length }, "AI Polish complete");
    res.json({ polished });
  } catch (err) {
    req.log.error({ err, mode }, "AI Polish failed");
    res.status(500).json({ error: "AI polish unavailable. Please try again." });
  }
});

export default aiPolishRouter;
