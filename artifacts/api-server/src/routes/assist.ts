import { Router, type IRouter, type Request, type Response } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const assistRouter: IRouter = Router();

const ASSIST_TIMEOUT_MS = 22_000;

interface MeasurementItem {
  label: string;
  value: string | number;
  unit?: string;
  status?: string;
}

interface EquipmentContext {
  make?: string;
  model?: string;
  refrigerant?: string;
  capacity?: string;
  voltage?: string;
  unitTag?: string;
  customer?: string;
  site?: string;
  faultCodes?: string[];
  measurements?: MeasurementItem[];
}

interface SessionContext {
  serviceHistory?: string;
  weather?: string;
  timeOnSite?: string;
}

// ─── Build a rich system prompt from equipment + session context ───────────────

function buildSystemPrompt(ec: EquipmentContext, sc: SessionContext): string {
  const lines: string[] = [];

  lines.push(`You are an expert commercial HVAC field assistant. A technician is on-site working a service call and is asking for your help.`);
  lines.push(``);
  lines.push(`RESPOND AS A SENIOR HVAC TECHNICIAN would — direct, technically precise, and immediately useful. The tech is standing next to the equipment right now.`);
  lines.push(``);

  if (ec.make || ec.model || ec.refrigerant) {
    lines.push(`== EQUIPMENT ON SITE ==`);
    if (ec.unitTag) lines.push(`Unit Tag: ${ec.unitTag}`);
    if (ec.make || ec.model) lines.push(`Make/Model: ${ec.make ?? ''}${ec.model ? ' ' + ec.model : ''}`);
    if (ec.capacity) lines.push(`Capacity: ${ec.capacity}`);
    if (ec.refrigerant) lines.push(`Refrigerant: ${ec.refrigerant}`);
    if (ec.voltage) lines.push(`Voltage: ${ec.voltage}`);
    if (ec.customer) lines.push(`Customer: ${ec.customer}`);
    if (ec.site) lines.push(`Site: ${ec.site}`);
    lines.push(``);
  }

  if (ec.faultCodes?.length) {
    lines.push(`== ACTIVE FAULT CODES ==`);
    lines.push(ec.faultCodes.join(`, `));
    lines.push(``);
  }

  if (ec.measurements?.length) {
    lines.push(`== CURRENT MEASUREMENTS ==`);
    for (const m of ec.measurements) {
      const status = m.status && m.status !== 'ok' ? ` ← ${m.status.toUpperCase()}` : '';
      lines.push(`${m.label}: ${m.value}${m.unit ? ' ' + m.unit : ''}${status}`);
    }
    lines.push(``);
  }

  if (sc.serviceHistory) {
    lines.push(`== SERVICE HISTORY ==`);
    lines.push(sc.serviceHistory);
    lines.push(``);
  }

  if (sc.weather) {
    lines.push(`== CURRENT CONDITIONS ==`);
    lines.push(`Weather: ${sc.weather}`);
    lines.push(``);
  }

  lines.push(`== RULES ==`);
  lines.push(`1. Answer the specific question asked — do not give a generic HVAC lecture.`);
  lines.push(`2. Reference the actual equipment data above where relevant.`);
  lines.push(`3. When fault codes appear in history as a pattern, note that explicitly.`);
  lines.push(`4. Do NOT invent values, model numbers, or service history not provided above.`);
  lines.push(`5. If a specific value is unknown, say so — do not guess.`);
  lines.push(`6. Format with line breaks for mobile readability. Bold text with **text** is supported.`);
  lines.push(`7. Be concise — the technician is in the field, not in a classroom.`);
  lines.push(`8. Safety notes always come first if relevant.`);

  return lines.join(`\n`);
}

// ─── POST /api/hvac/assist ────────────────────────────────────────────────────

assistRouter.post("/hvac/assist", async (req: Request, res: Response) => {
  const { question, equipmentContext, sessionContext } = req.body as {
    question?: unknown;
    equipmentContext?: EquipmentContext;
    sessionContext?: SessionContext;
  };

  if (!question || typeof question !== "string" || !question.trim()) {
    res.status(400).json({ error: "question is required" });
    return;
  }

  const q = question.trim().slice(0, 1000);
  const ec: EquipmentContext = typeof equipmentContext === "object" && equipmentContext !== null ? equipmentContext : {};
  const sc: SessionContext = typeof sessionContext === "object" && sessionContext !== null ? sessionContext : {};

  req.log.info({ question: q.slice(0, 120) }, "AI field assist request");

  const systemPrompt = buildSystemPrompt(ec, sc);

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), ASSIST_TIMEOUT_MS);

  try {
    const completion = await openai.chat.completions.create(
      {
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: q },
        ],
        max_tokens: 700,
        temperature: 0.25,
      },
      { signal: ac.signal },
    );

    clearTimeout(timer);

    const answer = completion.choices[0]?.message?.content ?? "Unable to generate a response. Please try again.";
    req.log.info({ tokens: completion.usage?.total_tokens }, "AI assist complete");

    res.json({ answer });
  } catch (err) {
    clearTimeout(timer);
    const msg = err instanceof Error ? err.message : "Unknown error";
    req.log.error({ err: msg }, "AI assist failed");

    if ((err as Error)?.name === "AbortError") {
      res.status(504).json({ error: "AI assistant timed out. Please try again." });
      return;
    }

    res.status(500).json({ error: "AI assistant unavailable. Please try again." });
  }
});

export default assistRouter;
