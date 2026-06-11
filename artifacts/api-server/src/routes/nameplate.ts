import { Router, type Request, type Response } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const nameplateRouter = Router();

const EXTRACT_PROMPT = `You are an HVAC nameplate data extraction assistant. The user has uploaded a photo of an HVAC equipment nameplate.

Extract every field you can read clearly. For any field that is unclear, partially obscured, or not present on this nameplate, set it to null.

IMPORTANT RULES:
- Do NOT guess or infer values that are not visible.
- Only extract what you can actually read on the nameplate.
- If a field is ambiguous, set it to null and flag it in "uncertainFields".
- Return ONLY valid JSON — no markdown, no explanation.

Return this exact JSON structure:
{
  "manufacturer": string | null,
  "modelNumber": string | null,
  "serialNumber": string | null,
  "equipmentType": string | null,
  "systemType": string | null,
  "refrigerantType": string | null,
  "voltage": string | null,
  "phase": string | null,
  "mca": string | null,
  "mocp": string | null,
  "rla": string | null,
  "lra": string | null,
  "capacityTons": string | null,
  "manufactureDate": string | null,
  "rawText": string,
  "uncertainFields": string[],
  "otherData": string | null
}

For "equipmentType": extract as written (e.g., "Packaged Rooftop Unit", "Air-Cooled Condensing Unit", "Split System Condensing Unit", "Heat Pump").
For "systemType": infer from nameplate indicators — "heat pump", "gas heat", "electric heat", or "cooling-only".
For "voltage": include all voltage ratings if multiple (e.g., "208-230/1/60" or "460/3/60").
For "phase": extract as number string if visible (e.g., "1", "3").
For "mca": look for "MCA", "Min Circuit Amps", or "Min. Circ. Amps".
For "mocp": look for "MOCP", "Max Fuse", "Max Overcurrent", "Max Breaker".
For "rla" / "lra": look for "RLA", "FLA", "LRA", "RLA/LRA".
For "capacityTons": look for tonnage, BTU/h (divide by 12000 for tons), or "tons".
For "rawText": transcribe ALL visible text from the nameplate exactly as you read it.
For "uncertainFields": list field names you could only partially read.`;

// POST /api/nameplate/ocr
// Body: { imageBase64: string (base64 data, no prefix), mimeType: "image/jpeg" | "image/png" | "image/webp" }
nameplateRouter.post("/nameplate/ocr", async (req: Request, res: Response) => {
  const { imageBase64, mimeType } = req.body ?? {};

  if (typeof imageBase64 !== "string" || imageBase64.length < 100) {
    res.status(400).json({ error: "imageBase64 required" });
    return;
  }

  const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
  const mime = validTypes.includes(mimeType) ? mimeType : "image/jpeg";

  const dataUrl = `data:${mime};base64,${imageBase64}`;

  req.log?.info({ mimeType: mime, size: imageBase64.length }, "Nameplate OCR request");

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_tokens: 1200,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: EXTRACT_PROMPT },
            { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
          ],
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    req.log?.info({ rawLength: raw.length }, "Nameplate OCR response received");

    let extracted: Record<string, unknown> = {};
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) extracted = JSON.parse(jsonMatch[0]);
    } catch {
      req.log?.warn("Nameplate OCR: failed to parse JSON from model response");
    }

    res.json({ extracted, rawResponse: raw });
  } catch (err: any) {
    req.log?.error(err, "Nameplate OCR failed");
    res.status(500).json({ error: "OCR failed — please try again or enter fields manually" });
  }
});

export default nameplateRouter;
