import { Router, type Request, type Response } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, unitPhotos, PHOTO_CATEGORIES } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";

const unitPhotosRouter = Router();
const objectStorageService = new ObjectStorageService();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getClientId(req: Request): string | null {
  return (req.query.clientId as string | undefined)?.trim() || null;
}

// ─── OCR prompt for field photos ─────────────────────────────────────────────

const PHOTO_OCR_PROMPT = `You are a field technician's assistant extracting readable text from HVAC photos.

Extract ALL readable text visible in this image. Focus on:
- Handwritten notes (wiring colors, sequences, labels, settings)
- DIP switch positions (ON/OFF, switch numbers, binary patterns)
- Control board terminal labels (input/output labels, connector labels)
- Wiring diagram text (wire numbers, colors, component names)
- Phasing order notation (L1, L2, L3, T1, T2, T3)
- Model numbers, serial numbers, part numbers visible in panel
- Voltage and amperage markings or labels
- Any visible settings, jumpers, or configurations

Output ONLY the extracted text, preserving structure with line breaks where applicable.
Group related items on the same line where they appear together in the image.
If the image contains no readable text, output exactly: NO_TEXT_FOUND`;

// ─── Async OCR — fires after photo is saved, never blocks response ─────────

async function runOcrAsync(
  photoId: string,
  objectPath: string,
  logger: Request["log"],
): Promise<void> {
  try {
    // Build a serving URL to pass to OpenAI vision
    // The sidecar/GCS approach: we download the bytes and pass as base64
    const gcsFile = await objectStorageService.getObjectEntityFile(objectPath);
    const response = await objectStorageService.downloadObject(gcsFile);
    if (!response.ok || !response.body) {
      logger.warn({ photoId }, "OCR: could not fetch image bytes from storage");
      return;
    }

    const arrayBuf = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuf).toString("base64");
    // Determine MIME type from Content-Type header (default to jpeg)
    const contentType = response.headers.get("content-type") ?? "image/jpeg";

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: PHOTO_OCR_PROMPT },
            {
              type: "image_url",
              image_url: {
                url: `data:${contentType};base64,${base64}`,
                detail: "high",
              },
            },
          ],
        },
      ],
    });

    const extracted = completion.choices[0]?.message?.content?.trim() ?? "";
    if (!extracted || extracted === "NO_TEXT_FOUND") {
      logger.info({ photoId }, "OCR: no text found");
      return;
    }

    await db
      .update(unitPhotos)
      .set({ ocrText: extracted, updatedAt: new Date() })
      .where(eq(unitPhotos.id, photoId));

    logger.info({ photoId, chars: extracted.length }, "OCR: text extracted and saved");
  } catch (err) {
    // OCR failure is silent — photo is already saved
    logger.warn({ err, photoId }, "OCR: extraction failed (non-fatal)");
  }
}

// ─── GET /units/:unitId/photos ────────────────────────────────────────────────

unitPhotosRouter.get("/units/:unitId/photos", async (req: Request, res: Response) => {
  const unitId = String(req.params.unitId);
  const clientId = getClientId(req);

  if (!clientId) {
    res.status(400).json({ error: "clientId required" });
    return;
  }

  try {
    const photos = await db
      .select()
      .from(unitPhotos)
      .where(and(eq(unitPhotos.unitId, unitId), eq(unitPhotos.userId, clientId)))
      .orderBy(desc(unitPhotos.createdAt));

    // Build serving URLs for each photo
    const withUrls = photos.map((p) => ({
      ...p,
      imageUrl: `/api/storage${p.objectPath}`,
    }));

    res.json({ photos: withUrls });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch unit photos");
    res.status(500).json({ error: "Failed to fetch photos" });
  }
});

// ─── POST /units/:unitId/photos ───────────────────────────────────────────────

const PostPhotoBody = z.object({
  objectPath: z.string().startsWith("/objects/"),
  category: z.enum(PHOTO_CATEGORIES).default("other"),
  note: z.string().max(1000).optional(),
});

unitPhotosRouter.post("/units/:unitId/photos", async (req: Request, res: Response) => {
  const unitId = String(req.params.unitId);
  const clientId = getClientId(req);

  if (!clientId) {
    res.status(400).json({ error: "clientId required" });
    return;
  }

  const parsed = PostPhotoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid fields", details: parsed.error.issues });
    return;
  }

  const { objectPath, category, note } = parsed.data;
  const id = randomUUID();

  try {
    const [photo] = await db
      .insert(unitPhotos)
      .values({
        id,
        unitId,
        userId: clientId,
        objectPath,
        category,
        note: note ?? null,
        ocrText: null,
      })
      .returning();

    req.log.info({ unitId, photoId: id, category }, "Unit photo saved");

    // Fire OCR asynchronously — never blocks the response
    runOcrAsync(id, objectPath, req.log);

    res.status(201).json({
      photo: { ...photo, imageUrl: `/api/storage${photo.objectPath}` },
    });
  } catch (err) {
    req.log.error({ err }, "Failed to save unit photo");
    res.status(500).json({ error: "Failed to save photo" });
  }
});

// ─── PATCH /units/:unitId/photos/:photoId ────────────────────────────────────

const PatchPhotoBody = z.object({
  category: z.enum(PHOTO_CATEGORIES).optional(),
  note: z.string().max(1000).optional(),
});

unitPhotosRouter.patch(
  "/units/:unitId/photos/:photoId",
  async (req: Request, res: Response) => {
    const unitId = String(req.params.unitId);
    const photoId = String(req.params.photoId);
    const clientId = getClientId(req);

    if (!clientId) {
      res.status(400).json({ error: "clientId required" });
      return;
    }

    const parsed = PatchPhotoBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid fields" });
      return;
    }

    const updates: Partial<typeof unitPhotos.$inferInsert> = { updatedAt: new Date() };
    if (parsed.data.category !== undefined) updates.category = parsed.data.category;
    if (parsed.data.note !== undefined) updates.note = parsed.data.note;

    try {
      const [updated] = await db
        .update(unitPhotos)
        .set(updates)
        .where(
          and(
            eq(unitPhotos.id, photoId),
            eq(unitPhotos.unitId, unitId),
            eq(unitPhotos.userId, clientId),
          ),
        )
        .returning();

      if (!updated) {
        res.status(404).json({ error: "Photo not found" });
        return;
      }

      res.json({ photo: { ...updated, imageUrl: `/api/storage${updated.objectPath}` } });
    } catch (err) {
      req.log.error({ err }, "Failed to update unit photo");
      res.status(500).json({ error: "Failed to update photo" });
    }
  },
);

// ─── DELETE /units/:unitId/photos/:photoId ────────────────────────────────────

unitPhotosRouter.delete(
  "/units/:unitId/photos/:photoId",
  async (req: Request, res: Response) => {
    const unitId = String(req.params.unitId);
    const photoId = String(req.params.photoId);
    const clientId = getClientId(req);

    if (!clientId) {
      res.status(400).json({ error: "clientId required" });
      return;
    }

    try {
      // Fetch first to get objectPath for GCS deletion
      const [photo] = await db
        .select()
        .from(unitPhotos)
        .where(
          and(
            eq(unitPhotos.id, photoId),
            eq(unitPhotos.unitId, unitId),
            eq(unitPhotos.userId, clientId),
          ),
        )
        .limit(1);

      if (!photo) {
        res.status(404).json({ error: "Photo not found" });
        return;
      }

      // Delete from DB
      await db
        .delete(unitPhotos)
        .where(eq(unitPhotos.id, photoId));

      // Best-effort GCS cleanup — non-fatal if it fails
      try {
        const gcsFile = await objectStorageService.getObjectEntityFile(photo.objectPath);
        await gcsFile.delete();
      } catch (storageErr) {
        req.log.warn({ err: storageErr, photoId }, "GCS object delete failed (non-fatal)");
      }

      req.log.info({ unitId, photoId }, "Unit photo deleted");
      res.json({ success: true });
    } catch (err) {
      req.log.error({ err }, "Failed to delete unit photo");
      res.status(500).json({ error: "Failed to delete photo" });
    }
  },
);

export default unitPhotosRouter;
