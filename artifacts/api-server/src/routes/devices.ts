import { Router, type Request, type Response } from "express";
import { db, userDevices } from "@workspace/db";
import { eq, and, gte, countDistinct } from "drizzle-orm";
import { randomUUID } from "crypto";

const devicesRouter = Router();

const SUSPICIOUS_DEVICE_THRESHOLD = 6;
const SUSPICIOUS_WINDOW_DAYS = 7;

function validateClientId(clientId: unknown): clientId is string {
  return typeof clientId === "string" && clientId.startsWith("user_") && clientId.length < 200;
}

function sanitizeString(v: unknown, maxLen = 200): string {
  if (typeof v !== "string") return "";
  return v.slice(0, maxLen).trim();
}

// ─── POST /api/devices/register ───────────────────────────────────────────────
// Called once per app-load by an authenticated user. Upserts the device row
// based on (userId, fingerprint). Returns { device, isNew }.
// Never modifies auth — purely informational.
devicesRouter.post("/devices/register", async (req: Request, res: Response) => {
  const { clientId, fingerprint, deviceName, deviceType, browser, os } = req.body ?? {};

  if (!validateClientId(clientId)) {
    res.status(401).json({ error: "Authenticated user required" });
    return;
  }

  const fp = sanitizeString(fingerprint, 512);
  if (!fp) {
    res.status(400).json({ error: "fingerprint required" });
    return;
  }

  try {
    // Look up existing device for this user + fingerprint
    const [existing] = await db
      .select()
      .from(userDevices)
      .where(and(eq(userDevices.userId, clientId), eq(userDevices.fingerprint, fp)));

    if (existing) {
      // Update last-seen and clear the isNew flag
      await db
        .update(userDevices)
        .set({
          lastSeenAt: new Date(),
          isNew: false,
          seenCount: existing.seenCount + 1,
          deviceName: sanitizeString(deviceName, 200) || existing.deviceName,
          deviceType: sanitizeString(deviceType, 50) || existing.deviceType,
          browser: sanitizeString(browser, 100) || existing.browser,
          os: sanitizeString(os, 100) || existing.os,
        })
        .where(eq(userDevices.id, existing.id));

      const [updated] = await db
        .select()
        .from(userDevices)
        .where(eq(userDevices.id, existing.id));

      res.json({ device: updated, isNew: false });
      return;
    }

    // New device — insert with isNew = true
    const id = `dev_${randomUUID()}`;
    await db.insert(userDevices).values({
      id,
      userId: clientId,
      fingerprint: fp,
      deviceName: sanitizeString(deviceName, 200) || "Unknown device",
      deviceType: sanitizeString(deviceType, 50) || "unknown",
      browser: sanitizeString(browser, 100) || null,
      os: sanitizeString(os, 100) || null,
      isNew: true,
      isTrusted: true,
      seenCount: 1,
    });

    const [created] = await db
      .select()
      .from(userDevices)
      .where(eq(userDevices.id, id));

    res.status(201).json({ device: created, isNew: true });
  } catch (err: any) {
    req.log?.error(err, "Failed to register device");
    res.status(500).json({ error: "Failed to register device" });
  }
});

// ─── GET /api/devices?clientId= ───────────────────────────────────────────────
// Returns all devices for the authenticated user, newest first.
// Also returns { suspicious: true } if ≥ SUSPICIOUS_DEVICE_THRESHOLD distinct
// devices have been seen in the last SUSPICIOUS_WINDOW_DAYS days.
devicesRouter.get("/devices", async (req: Request, res: Response) => {
  const clientId = req.query.clientId as string;
  if (!validateClientId(clientId)) {
    res.status(401).json({ error: "Authenticated user required" });
    return;
  }

  try {
    const devices = await db
      .select()
      .from(userDevices)
      .where(eq(userDevices.userId, clientId))
      .orderBy(userDevices.lastSeenAt);

    // Sort descending by lastSeenAt (drizzle desc import causes compat issues with older builds)
    devices.sort((a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime());

    // Suspicious activity check: count distinct devices seen recently
    const windowStart = new Date(Date.now() - SUSPICIOUS_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const [{ count }] = await db
      .select({ count: countDistinct(userDevices.fingerprint) })
      .from(userDevices)
      .where(and(eq(userDevices.userId, clientId), gte(userDevices.lastSeenAt, windowStart)));

    const suspicious = Number(count) >= SUSPICIOUS_DEVICE_THRESHOLD;

    res.json({
      devices: devices.map((d) => ({
        id: d.id,
        deviceName: d.deviceName,
        deviceType: d.deviceType,
        browser: d.browser,
        os: d.os,
        isNew: d.isNew,
        isTrusted: d.isTrusted,
        firstSeenAt: d.firstSeenAt.toISOString(),
        lastSeenAt: d.lastSeenAt.toISOString(),
        seenCount: d.seenCount,
      })),
      suspicious,
      suspiciousThreshold: SUSPICIOUS_DEVICE_THRESHOLD,
    });
  } catch (err: any) {
    if (err?.code === "42P01") { res.json({ devices: [], suspicious: false }); return; }
    req.log?.error(err, "Failed to list devices");
    res.status(500).json({ error: "Failed to list devices" });
  }
});

// ─── DELETE /api/devices/:id?clientId= ────────────────────────────────────────
// Removes a device from the user's trusted list. Ownership-checked.
devicesRouter.delete("/devices/:id", async (req: Request, res: Response) => {
  const clientId = req.query.clientId as string;
  if (!validateClientId(clientId)) {
    res.status(401).json({ error: "Authenticated user required" });
    return;
  }

  const deviceId = String(req.params.id);

  try {
    const [existing] = await db
      .select()
      .from(userDevices)
      .where(and(eq(userDevices.id, deviceId), eq(userDevices.userId, clientId)));

    if (!existing) {
      res.status(404).json({ error: "Device not found" });
      return;
    }

    await db
      .delete(userDevices)
      .where(and(eq(userDevices.id, deviceId), eq(userDevices.userId, clientId)));

    res.json({ ok: true });
  } catch (err: any) {
    req.log?.error(err, "Failed to remove device");
    res.status(500).json({ error: "Failed to remove device" });
  }
});

export default devicesRouter;
