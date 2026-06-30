import { Router, type IRouter, type Request, type Response } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { z } from "zod/v4";

const speakScheduleRouter: IRouter = Router();

const TIMEOUT_MS = 30_000;

function validateClientId(id: unknown): id is string {
  return typeof id === "string" && id.startsWith("user_") && id.length < 200;
}

const DraftJobSchema = z.object({
  jobNumber:       z.string().optional().default(""),
  customerName:    z.string().optional().default(""),
  siteName:        z.string().optional().default(""),
  location:        z.string().optional().default(""),
  appointmentDate: z.string().optional().default(""),
  appointmentTime: z.string().optional().default(""),
  timeWindow:      z.string().optional().default(""),
  jobType:         z.string().optional().default("Service Call"),
  priority:        z.enum(["emergency", "high", "normal", "pm"]).optional().default("normal"),
  phoneNumber:     z.string().optional().default(""),
  contactName:     z.string().optional().default(""),
  complaintOrTask: z.string().optional().default(""),
  notes:           z.string().optional().default(""),
});

const AiResponseSchema = z.object({
  jobs: z.array(DraftJobSchema),
});

function buildSystemPrompt(today: string): string {
  const todayDate = new Date(today + "T12:00:00");
  const tomorrowDate = new Date(todayDate);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = tomorrowDate.toISOString().split("T")[0];
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const todayDow = todayDate.getDay();

  // Next weekday dates for day-name resolution
  const nextDays: Record<string, string> = {};
  for (let i = 1; i <= 7; i++) {
    const d = new Date(todayDate);
    d.setDate(d.getDate() + i);
    nextDays[dayNames[d.getDay()]] = d.toISOString().split("T")[0];
  }
  const nextDayLines = Object.entries(nextDays)
    .map(([name, date]) => `  - "${name}" = ${date}`)
    .join("\n");

  return `You are a scheduling assistant for commercial HVAC field technicians. Extract every job or appointment from a spoken daily schedule transcript.

Today is: ${today} (${dayNames[todayDow]})
Tomorrow is: ${tomorrow}
Next weekdays:
${nextDayLines}

Return a JSON object: { "jobs": [ ... ] }

Each job object fields (use "" for unknown):
- jobNumber: Work order / Lennox job number (e.g. "2606-37730"). Lennox format is NNNN-NNNNN.
- customerName: Business or customer name (e.g. "Lowe's", "Best Buy", "Cinemark").
- siteName: Site or building name if different from customer.
- location: City, neighborhood, or address (e.g. "Lincoln", "North Sac", "Redding").
- appointmentDate: YYYY-MM-DD. Resolve: "today"=${today}, "tomorrow"=${tomorrow}, weekday names as above.
- appointmentTime: "H:MM AM" or "H:MM PM". Bare numbers < 12 = AM, >= 12 = PM unless context says otherwise. "7:30" = "7:30 AM", "10" = "10:00 AM".
- timeWindow: If a range is mentioned, e.g. "7:00 AM – 8:00 AM". Otherwise "".
- jobType: One of: "Service Call", "PM", "Maintenance", "Warranty", "Return Visit", "Vendor Meet", "Emergency", "Inspection". Map: "serv"/"service call"→"Service Call", "PM survey"/"pm"→"PM", "vendor meet"→"Vendor Meet", "return visit"→"Return Visit", "no cool"/"no cooling"→"Service Call", "maintenance"→"Maintenance", "warranty"→"Warranty".
- priority: "emergency"|"high"|"normal"|"pm". Map: "emergency"/"no heat in winter"→"emergency", "no cool"/"no cooling"→"high", "pm"/"maintenance"/"survey"→"pm", all else→"normal".
- phoneNumber: Phone number if mentioned. "POC 510-472-1230" → "510-472-1230".
- contactName: Contact person name if mentioned.
- complaintOrTask: What needs to be done. E.g. "No cooling RTU 3", "PM survey", "Vendor meet".
- notes: Any other details.

Time sequencing rules:
- "first call" = first in the list, use its stated time or the earliest time mentioned.
- "second call"/"then" = after the previous job.
- "after that" = after the previous job.
- If times are only partially given, estimate reasonable gaps (1-2 hours).
- If a job count is stated ("six jobs"), extract that many.

HVAC recognition:
- "2606-XXXXX" → jobNumber (Lennox)
- "serv" → Service Call
- "PM survey" → jobType=PM, complaintOrTask="PM survey"
- "no cool" / "no cooling" → complaintOrTask="No cooling", priority=high
- "RTU N" → include in complaintOrTask (e.g. "RTU 3 no cooling")
- "POC XXXXXXXXXX" → phoneNumber
- "vendor meet" → jobType=Vendor Meet

Return ONLY the JSON object. No commentary or markdown.`;
}

speakScheduleRouter.post("/speak-schedule/parse", async (req: Request, res: Response) => {
  const { clientId, transcript, today } = req.body ?? {};

  if (!validateClientId(clientId)) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  if (!transcript || typeof transcript !== "string" || !transcript.trim()) {
    res.status(400).json({ error: "transcript required" });
    return;
  }

  const todayStr =
    typeof today === "string" && /^\d{4}-\d{2}-\d{2}$/.test(today)
      ? today
      : new Date().toISOString().split("T")[0];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const completion = await openai.chat.completions.create(
      {
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        temperature: 0.1,
        messages: [
          { role: "system", content: buildSystemPrompt(todayStr) },
          {
            role: "user",
            content: `Parse this spoken HVAC schedule into structured jobs:\n\n${transcript.trim().slice(0, 3000)}`,
          },
        ],
      },
    );

    clearTimeout(timeout);

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsed: z.infer<typeof AiResponseSchema>;

    try {
      const obj = JSON.parse(raw) as unknown;
      parsed = AiResponseSchema.parse(obj);
    } catch {
      parsed = { jobs: [] };
    }

    const ts = Date.now();
    const importedJobs = parsed.jobs.map((job, i) => ({
      id:              `voice_${ts}_${i}`,
      source:          "voice" as const,
      jobNumber:       job.jobNumber,
      customer:        job.customerName || job.siteName || "",
      site:            job.siteName || "",
      address:         job.location || "",
      appointmentDate: job.appointmentDate || todayStr,
      appointmentTime: job.appointmentTime || "",
      timeWindow:      job.timeWindow || "",
      phone:           job.phoneNumber || "",
      technician:      "",
      jobType:         job.jobType || "Service Call",
      priority:        job.priority,
      complaint:       job.complaintOrTask || "",
      notes:           job.notes || "",
      equipment:       "",
      attachments:     [] as string[],
      rawData:         { transcript: transcript.trim().slice(0, 500), jobIndex: i },
      importedAt:      new Date().toISOString(),
      status:          "pending" as const,
    }));

    res.json({ jobs: importedJobs });
  } catch (err: unknown) {
    clearTimeout(timeout);
    req.log?.error(err, "speak-schedule/parse failed");
    res.status(500).json({ error: "Failed to parse schedule. Please try again." });
  }
});

export default speakScheduleRouter;
