import { Router, type Request, type Response } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const nameplateRouter = Router();

// Strict nameplate-only extraction prompt.
// Explicitly forbids analysing the unit cabinet or anything outside the data plate.
// Targets < 700 output tokens — keeps response under 2 KB.
const EXTRACT_PROMPT = `You are a specialized HVAC nameplate OCR extractor.

TASK: Locate the equipment data plate / nameplate label in this image and extract ONLY the text printed on that label.

IGNORE COMPLETELY:
- Unit cabinet, sheet metal, rooftop surface
- Wiring, pipes, conduit, ductwork
- Background, tools, people, jobsite conditions
- Any text or markings that are NOT on the nameplate label itself

NO NAMEPLATE FOUND:
If the image does not contain a clearly visible HVAC equipment data plate / nameplate label, stop immediately and return ONLY this JSON:
{
  "error": "No readable HVAC nameplate found",
  "confidence": 0,
  "missing_fields": ["manufacturer","modelNumber","serialNumber","equipmentType","systemType","voltage","phase","hertz","mca","mocp","rla","lra","refrigerantType","refrigerantCharge","coolingCapacity","heatingCapacity","capacityTons","gasType","manufactureDate"]
}

EXTRACTION RULES:
- Extract exactly what you can read on the nameplate label — nothing more.
- NEVER guess, infer, or hallucinate values. If a field is absent or unreadable, set it to null.
- If a field is partially readable, return the partial text as-is.
- confidence: integer 0–100 reflecting overall image clarity and nameplate legibility.
- missing_fields: list every key that you set to null.
- manufacturer: extract ONLY if the manufacturer name or brand is printed as text on the nameplate label itself. Do NOT infer the manufacturer from logos, cabinet color, unit shape, brand appearance, or visual style — even if you recognise the brand. If manufacturer text is not readable on the nameplate, set manufacturer to null.

Return ONLY the following JSON. No markdown. No explanation. No surrounding text.

{
  "manufacturer": string|null,
  "modelNumber": string|null,
  "serialNumber": string|null,
  "equipmentType": string|null,
  "systemType": string|null,
  "voltage": string|null,
  "phase": string|null,
  "hertz": string|null,
  "mca": string|null,
  "mocp": string|null,
  "rla": string|null,
  "lra": string|null,
  "refrigerantType": string|null,
  "refrigerantCharge": string|null,
  "coolingCapacity": string|null,
  "heatingCapacity": string|null,
  "capacityTons": string|null,
  "gasType": string|null,
  "manufactureDate": string|null,
  "confidence": number,
  "missing_fields": string[],
  "rawText": string
}

FIELD GUIDANCE:
equipmentType  — as printed (e.g. "Packaged Rooftop Unit", "Split System Condensing Unit", "Heat Pump Condenser")
systemType     — infer from nameplate indicators only: "heat pump" | "gas heat" | "electric heat" | "cooling-only"
voltage        — include all ratings exactly as printed (e.g. "208-230/1/60", "460/3/60")
hertz          — Hz rating, usually "60"
mca            — labeled MCA, Min Circuit Amps, Min. Circ. Amps
mocp           — labeled MOCP, Max Fuse, Max Overcurrent, Max Breaker, MOP
rla            — labeled RLA or FLA (Rated/Full Load Amps)
lra            — labeled LRA (Locked Rotor Amps)
refrigerantCharge — factory refrigerant charge in oz or lbs (e.g. "84 oz", "5.25 lbs")
coolingCapacity   — BTU/h or tons for cooling stage
heatingCapacity   — BTU/h or kW for heating stage
gasType        — natural gas, LP, propane, etc.
manufactureDate   — production date code decoded to month/year when possible
rawText        — every word visible on the nameplate, transcribed exactly as printed`;

// POST /api/nameplate/ocr
// Body: { imageBase64: string (base64, no data-URL prefix), mimeType: "image/jpeg" | "image/png" | "image/webp" }
nameplateRouter.post("/nameplate/ocr", async (req: Request, res: Response) => {
  const { imageBase64, mimeType } = req.body ?? {};

  if (typeof imageBase64 !== "string" || imageBase64.length < 100) {
    res.status(400).json({ error: "imageBase64 required" });
    return;
  }

  const imageSizeKB = Math.round(imageBase64.length * 0.75 / 1024);
  if (imageSizeKB > 500) {
    res.status(400).json({ error: "Scan image is too large. Move closer and scan only the nameplate." });
    return;
  }

  const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
  const mime = validTypes.includes(mimeType) ? mimeType : "image/jpeg";

  const dataUrl = `data:${mime};base64,${imageBase64}`;

  req.log?.info(
    { mimeType: mime, sizeKB: Math.round(imageBase64.length * 0.75 / 1024) },
    "Nameplate OCR request"
  );

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.4",
      // 900 tokens gives the no-nameplate early-exit path (19-field array) and
      // a full extraction enough headroom to complete without truncation.
      // detail:"auto" lets the model pick tile strategy after the frontend has
      // already resized the image — avoids excessive tiling on large originals.
      max_tokens: 900,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: EXTRACT_PROMPT },
            { type: "image_url", image_url: { url: dataUrl, detail: "auto" } },
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
