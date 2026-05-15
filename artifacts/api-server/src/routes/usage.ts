import { Router, type IRouter, type Request, type Response } from "express";
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { freeUsage } from "@workspace/db";
import { sql, and, gt } from "drizzle-orm";
import { storage } from "../storage.js";
import { isTesterEmail } from "../lib/tester-whitelist.js";
import { computeStatus, remainingFree } from "../lib/usage-limits.js";

const usageRouter: IRouter = Router();

const SESSION_COOKIE = "unitdown_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function getIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const first = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(",")[0];
    return first.trim();
  }
  return req.ip ?? req.socket?.remoteAddress ?? "unknown";
}

function setSessionCookie(res: Response, sessionId: string) {
  res.cookie(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE * 1000,
    path: "/",
  });
}

async function getOrCreateSession(req: Request, res: Response, fingerprint: string) {
  const ip = getIp(req);
  const cookieSessionId: string | undefined = req.cookies?.[SESSION_COOKIE];

  // 1. Try to find by cookie session ID
  if (cookieSessionId) {
    const [byCookie] = await db
      .select()
      .from(freeUsage)
      .where(sql`${freeUsage.sessionId} = ${cookieSessionId}`);
    if (byCookie) {
      // Update IP + fingerprint if changed (soft-sync)
      if (byCookie.ip !== ip || byCookie.fingerprint !== fingerprint) {
        await db
          .update(freeUsage)
          .set({ ip, fingerprint, updatedAt: new Date() })
          .where(sql`${freeUsage.sessionId} = ${cookieSessionId}`);
      }
      return { ...byCookie, ip, fingerprint };
    }
  }

  // 2. Fingerprint match within last 30 days — anti-bypass (incognito, cleared cache etc.)
  if (fingerprint && fingerprint.length > 3) {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const byFingerprint = await db
      .select()
      .from(freeUsage)
      .where(
        and(
          sql`${freeUsage.fingerprint} = ${fingerprint}`,
          gt(freeUsage.createdAt, cutoff)
        )
      )
      .orderBy(sql`${freeUsage.useCount} DESC`)
      .limit(1);

    if (byFingerprint.length > 0) {
      const existing = byFingerprint[0];
      setSessionCookie(res, existing.sessionId);
      return existing;
    }
  }

  // 3. Create new session
  const newId = randomUUID();
  const [created] = await db
    .insert(freeUsage)
    .values({ sessionId: newId, ip, fingerprint })
    .returning();
  setSessionCookie(res, newId);
  return created;
}

// ── Per-account session for authenticated (Clerk) users ───────────────────────
async function getOrCreateClientSession(clientId: string, ip: string) {
  const [existing] = await db
    .select()
    .from(freeUsage)
    .where(sql`${freeUsage.sessionId} = ${clientId}`);

  if (existing) return existing;

  const [created] = await db
    .insert(freeUsage)
    .values({ sessionId: clientId, ip, fingerprint: "clerk-user" })
    .returning();

  return created;
}

// ── GET /api/usage/status ─────────────────────────────────────────────────────
usageRouter.get("/usage/status", async (req: Request, res: Response) => {
  const fingerprint = (req.query.fingerprint as string) ?? "";
  const clientId = req.query.clientId as string | undefined;
  const testerEmail = req.query.testerEmail as string | undefined;

  if (isTesterEmail(testerEmail)) {
    res.json({ isPro: true, useCount: 0, status: "pro", emailUnlocked: false, freeRemaining: 99 });
    return;
  }

  let isPro = false;
  if (clientId) {
    isPro = await storage.isProUser(clientId);
  }

  if (isPro) {
    res.json({ isPro: true, useCount: 0, status: "pro", emailUnlocked: false, freeRemaining: 99 });
    return;
  }

  // Only real Clerk users (user_xxx) get per-account quota.
  // Anonymous UUIDs passed as clientId still use the cookie-based session so
  // clearing localStorage cannot reset the usage counter.
  const isAuthenticated = typeof clientId === "string" && clientId.startsWith("user_");
  const session = isAuthenticated
    ? await getOrCreateClientSession(clientId!, getIp(req))
    : await getOrCreateSession(req, res, fingerprint);

  const status = computeStatus(session, isAuthenticated);

  res.json({
    isPro: false,
    useCount: session.useCount,
    status,
    emailUnlocked: session.emailUnlocked,
    emailUnlockUsed: session.emailUnlockUsed,
    freeRemaining: remainingFree(session, isAuthenticated),
  });
});

// ── POST /api/usage/gate ──────────────────────────────────────────────────────
// Read-only pre-flight check. Returns { allowed, status, useCount }.
// Does NOT increment. Increment happens in /api/hvac/diagnose on success.
usageRouter.post("/usage/gate", async (req: Request, res: Response) => {
  const { fingerprint = "", clientId, testerEmail } = req.body as { fingerprint?: string; clientId?: string; testerEmail?: string };

  if (isTesterEmail(testerEmail)) {
    res.json({ allowed: true, status: "pro", useCount: 0 });
    return;
  }

  let isPro = false;
  if (clientId) {
    isPro = await storage.isProUser(clientId);
  }

  if (isPro) {
    res.json({ allowed: true, status: "pro", useCount: 0 });
    return;
  }

  // Only real Clerk users (user_xxx) get per-account quota.
  const isAuthenticated = typeof clientId === "string" && clientId.startsWith("user_");
  const session = isAuthenticated
    ? await getOrCreateClientSession(clientId!, getIp(req))
    : await getOrCreateSession(req, res, fingerprint);

  const status = computeStatus(session, isAuthenticated);

  if (status !== "free") {
    res.json({
      allowed: false,
      status,
      useCount: session.useCount,
      freeRemaining: remainingFree(session, isAuthenticated),
    });
    return;
  }

  res.json({
    allowed: true,
    status: "free",
    useCount: session.useCount,
    freeRemaining: remainingFree(session, isAuthenticated),
  });
});

// ── POST /api/usage/email ─────────────────────────────────────────────────────
usageRouter.post("/usage/email", async (req: Request, res: Response) => {
  const { email, fingerprint = "" } = req.body as { email?: string; fingerprint?: string };

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: "Valid email required" });
    return;
  }

  const session = await getOrCreateSession(req, res, fingerprint);

  if (session.emailUnlocked) {
    res.json({ success: true, alreadyUnlocked: true });
    return;
  }

  await db
    .update(freeUsage)
    .set({ email, emailUnlocked: true, updatedAt: new Date() })
    .where(sql`${freeUsage.sessionId} = ${session.sessionId}`);

  res.json({ success: true });
});

export default usageRouter;
