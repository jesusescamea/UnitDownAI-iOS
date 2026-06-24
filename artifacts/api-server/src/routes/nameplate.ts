import { Router, type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import { openai } from "@workspace/integrations-openai-ai-server";

const nameplateRouter = Router();

// ─── Multer upload middleware ─────────────────────────────────────────────────
// Accepts multipart/form-data with a single "file" field.
// Stores the upload in memory (buffer) — no disk I/O.
// Hard limits: 2 MB file size, JPEG / PNG / WebP only.

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 }, // 4 MB — large enough for 1600 px captures
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file type. Please upload a JPEG, PNG, or WebP image."));
    }
  },
});

// Wraps multer so that file-size and file-filter errors return clean JSON
// instead of propagating as unhandled middleware errors.
function uploadMiddleware(req: Request, res: Response, next: NextFunction) {
  upload.single("file")(req, res, (err: any) => {
    if (!err) { next(); return; }
    const message =
      err?.code === "LIMIT_FILE_SIZE"
        ? "Image is too large. Please retake closer or use scan mode."
        : (err?.message ?? "Upload failed");
    res.status(400).json({ error: message });
  });
}

// HVAC nameplate extraction prompt — rooftop-field hardened.
const EXTRACT_PROMPT = `You are a specialized HVAC nameplate OCR extractor.

TASK: Locate the equipment data plate / nameplate label in this image and extract ONLY the text printed on that label.

IGNORE COMPLETELY:
- Unit cabinet, sheet metal, rooftop surface
- Wiring, pipes, conduit, ductwork
- Background, tools, people, jobsite conditions
- Any text or markings that are NOT on the nameplate label itself

NO NAMEPLATE FOUND:
Only use this path when there is NO visible nameplate at all in the image:
{
  "error": "No readable HVAC nameplate found",
  "confidence": 0,
  "missing_fields": ["manufacturer","modelNumber","serialNumber","equipmentType","systemType","voltage","phase","hertz","mca","mocp","rla","lra","refrigerantType","refrigerantCharge","coolingCapacity","heatingCapacity","capacityTons","gasType","manufactureDate"],
  "reviewFields": []
}

LOW CONFIDENCE / PARTIAL / GLARE-AFFECTED IMAGES:
If a nameplate IS visible but image quality is poor, glare-affected, angled, or partially readable:
- DO NOT return the error key. Always attempt extraction.
- Populate every field you can read, even if uncertain.
- Add partially-readable or OCR-corrected field keys to "reviewFields".
- Set confidence to your actual estimate (can be as low as 10).
- Return the full JSON schema — never return only the error object when a nameplate is present.

EXTRACTION RULES:
- Extract exactly what you can read on the nameplate label — nothing more.
- NEVER guess, infer, or hallucinate values. If a field is absent or unreadable, set it to null.
- If a field is partially readable, return the partial text and add the key to reviewFields.
- confidence: integer 0–100 reflecting overall image clarity and nameplate legibility.
- missing_fields: list every key you set to null.
- reviewFields: list every key you populated but are uncertain about (partially read, OCR-corrected, low-confidence).
- manufacturer: extract ONLY if the manufacturer name or brand is printed as text on the nameplate label itself. Do NOT infer from logos, cabinet color, unit shape, or visual style. If not readable, set to null.

HVAC TEXT NORMALIZATION (apply silently; add corrected key to reviewFields):
- Voltage: "2081230" → "208/230"; "208 230" → "208/230"; "460 3 60" → "460/3/60"
- Refrigerant: "R41OA" or "R-41OA" or "R4l0A" → "R-410A"; "R22" → "R-22"; "R32" → "R-32"
- OCR digit/letter confusion (apply only when field context supports it):
  * voltage, mca, mocp, rla, lra fields: capital-O → 0 where a digit is expected
  * model/serial: lowercase-l or capital-I → 1 only when surrounded by digits
  * refrigerantType: O → 0 when it would form a known refrigerant (e.g. R-41OA → R-410A)

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
  "reviewFields": string[],
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
// Body: multipart/form-data — field name "file", JPEG/PNG/WebP image
nameplateRouter.post(
  "/nameplate/ocr",
  uploadMiddleware,
  async (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ error: "No image file provided" });
      return;
    }

    const { buffer, mimetype, size } = req.file;

    req.log?.info(
      { mimeType: mimetype, sizeKB: Math.round(size / 1024) },
      "Nameplate OCR request",
    );

    // Convert buffer to base64 for the OpenAI Vision API
    const imageBase64 = buffer.toString("base64");
    const dataUrl = `data:${mimetype};base64,${imageBase64}`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-5.4",
        // 1400 tokens gives the full schema (reviewFields + missing_fields + rawText)
        // and the no-nameplate path ample headroom without truncation.
        max_completion_tokens: 1400,
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
      res.status(500).json({ error: "OCR failed. You can enter nameplate fields manually." });
    }
  },
);

export default nameplateRouter;
