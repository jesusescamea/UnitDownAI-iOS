/**
 * serverAuth — unified request authentication for UnitDown API
 *
 * Priority order:
 *   1. Owner bypass  (ENABLE_OWNER_BYPASS + OWNER_BYPASS_TOKEN + OWNER_USER_ID)
 *   2. Clerk JWT     (CLERK_SECRET_KEY must be present; clerkMiddleware must have run)
 *
 * NEVER expose OWNER_BYPASS_TOKEN to the frontend — it is server-only.
 */

import type { Request, Response, RequestHandler } from "express";
import { clerkMiddleware, getAuth } from "@clerk/express";

// ─── Lazy singleton: only mount clerkMiddleware when key is present ────────────

let _clerkHandler: RequestHandler | null | undefined = undefined;

function getClerkHandler(): RequestHandler | null {
  if (_clerkHandler !== undefined) return _clerkHandler;
  const secretKey = process.env["CLERK_SECRET_KEY"];
  if (!secretKey) {
    _clerkHandler = null;
  } else {
    _clerkHandler = clerkMiddleware({ secretKey });
  }
  return _clerkHandler;
}

// ─── Owner-bypass config ───────────────────────────────────────────────────────

function ownerBypassEnabled(): boolean {
  return process.env["ENABLE_OWNER_BYPASS"] === "true";
}

function checkOwnerBypass(token: string | null): string | null {
  if (!ownerBypassEnabled()) return null;
  const bypassToken = process.env["OWNER_BYPASS_TOKEN"];
  const userId      = process.env["OWNER_USER_ID"];
  if (!bypassToken || !userId) return null;
  if (token === bypassToken) return userId;
  return null;
}

// ─── Express middleware that populates Clerk auth context ─────────────────────
// Mount this on any router that needs Clerk JWT support.
// It is a no-op (calls next()) when CLERK_SECRET_KEY is absent.

export function conditionalClerkMiddleware(): RequestHandler {
  return (req, res, next) => {
    const handler = getClerkHandler();
    if (handler) return handler(req, res, next);
    return next();
  };
}

// ─── Auth resolver — call inside a route handler after middleware has run ─────

export interface AuthResult {
  userId: string;
  method: "owner_bypass" | "clerk";
  email?: string;
}

export function resolveAuth(req: Request, res: Response): AuthResult | null {
  const authHeader = req.headers["authorization"] as string | undefined;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  // 1. Owner bypass
  const bypassUserId = checkOwnerBypass(token);
  if (bypassUserId) {
    return {
      userId: bypassUserId,
      method: "owner_bypass",
      email: process.env["OWNER_EMAIL"] ?? undefined,
    };
  }

  // 2. Clerk JWT  (only attempt if clerkMiddleware actually ran, i.e. secret key is present)
  const secretKey = process.env["CLERK_SECRET_KEY"];
  if (secretKey) {
    const { userId } = getAuth(req);
    if (userId) {
      return { userId, method: "clerk" };
    }
  }

  // Nothing worked
  if (!secretKey) {
    res.status(401).json({
      error: "Authentication not configured — CLERK_SECRET_KEY is missing on the server",
    });
  } else {
    res.status(401).json({ error: "Authentication required" });
  }
  return null;
}

// ─── Convenience helper: resolveAuth + early-return null on failure ────────────

export function requireAuth(req: Request, res: Response): string | null {
  const result = resolveAuth(req, res);
  return result ? result.userId : null;
}

// ─── Auth-debug payload (no secrets) ─────────────────────────────────────────

export function buildAuthDebugPayload(req: Request): Record<string, unknown> {
  const secretKey      = process.env["CLERK_SECRET_KEY"];
  const bypassEnabled  = ownerBypassEnabled();
  const bypassToken    = process.env["OWNER_BYPASS_TOKEN"];
  const ownerUserId    = process.env["OWNER_USER_ID"];
  const ownerEmail     = process.env["OWNER_EMAIL"];

  const authHeader = req.headers["authorization"] as string | undefined;
  const tokenPresent = Boolean(authHeader?.startsWith("Bearer "));

  const result = resolveAuth(req, { json: () => {}, status: () => ({ json: () => {} }) } as unknown as Response);

  return {
    clerkSecretKeyConfigured: Boolean(secretKey),
    clerkSecretKeyPrefix:     secretKey ? secretKey.slice(0, 10) + "…" : null,
    ownerBypassEnabled:       bypassEnabled,
    ownerBypassTokenSet:      Boolean(bypassToken),
    ownerUserIdSet:           Boolean(ownerUserId),
    ownerEmailSet:            Boolean(ownerEmail),
    requestHasBearerToken:    tokenPresent,
    authResult: result
      ? { userId: result.userId, method: result.method }
      : null,
  };
}
