import { Router, type Request, type Response } from "express";
import { db, oauthTokens } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { encryptToken, decryptToken, isEncryptionConfigured } from "../lib/tokenEncryption";
import { signState, verifyState } from "../lib/oauthState";

const router = Router();

// ─── Config ───────────────────────────────────────────────────────────────────

const GG_CLIENT_ID     = () => process.env.GOOGLE_CLIENT_ID;
const GG_CLIENT_SECRET = () => process.env.GOOGLE_CLIENT_SECRET;
const GG_REDIRECT_URI  = () => process.env.GOOGLE_REDIRECT_URI;

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/gmail.readonly",
  "email",
  "profile",
];

function isConfigured(): boolean {
  return !!(GG_CLIENT_ID() && GG_CLIENT_SECRET() && GG_REDIRECT_URI() && isEncryptionConfigured());
}

function validateClientId(clientId: unknown): clientId is string {
  return typeof clientId === "string" && clientId.startsWith("user_") && clientId.length < 200;
}

// ─── Popup result page ─────────────────────────────────────────────────────────

function popupPage(success: boolean, message: string, provider = "google"): string {
  const icon  = success ? "✓" : "✗";
  const color = success ? "#34d399" : "#f87171";
  const script = success
    ? `if(window.opener){window.opener.postMessage({type:'oauth_success',provider:'${provider}'},'*')}setTimeout(function(){window.close()},2000);`
    : `if(window.opener){window.opener.postMessage({type:'oauth_error',error:'${message.replace(/'/g, "\\'")}'},'*')}setTimeout(function(){window.close()},3000);`;
  return `<!DOCTYPE html><html><head><title>${success ? "Connected" : "Error"}</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;padding:16px;box-sizing:border-box"><div style="text-align:center;max-width:320px"><div style="font-size:48px;margin-bottom:16px">${icon}</div><div style="font-size:18px;font-weight:700;color:${color}">${message}</div><p style="color:#94a3b8;margin-top:12px;font-size:14px">You can close this window.</p></div><script>${script}</script></body></html>`;
}

// ─── Token refresh helper ──────────────────────────────────────────────────────

async function getValidAccessToken(userId: string): Promise<string | null> {
  let rows: (typeof oauthTokens.$inferSelect)[];
  try {
    rows = await db.select().from(oauthTokens).where(
      and(eq(oauthTokens.userId, userId), eq(oauthTokens.provider, "google"))
    );
  } catch {
    return null;
  }

  if (!rows.length) return null;
  const row = rows[0];

  const nearExpiry = row.expiresAt && Date.now() > (row.expiresAt - 300_000);
  if (nearExpiry && row.refreshToken && GG_CLIENT_ID() && GG_CLIENT_SECRET()) {
    try {
      const refreshed = decryptToken(row.refreshToken);
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id:     GG_CLIENT_ID()!,
          client_secret: GG_CLIENT_SECRET()!,
          refresh_token: refreshed,
          grant_type:    "refresh_token",
        }),
      });
      if (tokenRes.ok) {
        const t = await tokenRes.json() as { access_token: string; expires_in?: number };
        const expiresAt = t.expires_in ? Date.now() + t.expires_in * 1000 : null;
        await db.update(oauthTokens).set({
          accessToken: encryptToken(t.access_token),
          expiresAt:   expiresAt ?? undefined,
          updatedAt:   new Date(),
        }).where(and(eq(oauthTokens.userId, userId), eq(oauthTokens.provider, "google")));
        return t.access_token;
      }
    } catch { /* fall through to existing token */ }
  }

  try { return decryptToken(row.accessToken); } catch { return null; }
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /api/integrations/google/status
router.get("/integrations/google/status", async (req: Request, res: Response) => {
  if (!isConfigured()) { res.json({ configured: false, connected: false }); return; }
  const clientId = req.query.clientId as string;
  if (!validateClientId(clientId)) { res.status(401).json({ error: "Authentication required" }); return; }
  try {
    const rows = await db.select({ id: oauthTokens.id }).from(oauthTokens).where(
      and(eq(oauthTokens.userId, clientId), eq(oauthTokens.provider, "google"))
    );
    res.json({ configured: true, connected: rows.length > 0 });
  } catch (err: any) {
    if (err?.code === "42P01") { res.json({ configured: true, connected: false }); return; }
    req.log?.error(err, "Failed to check Google status");
    res.status(500).json({ error: "Status check failed" });
  }
});

// GET /api/integrations/google/auth-url
router.get("/integrations/google/auth-url", (req: Request, res: Response) => {
  if (!isConfigured()) { res.status(503).json({ error: "Google integration not configured" }); return; }
  const clientId = req.query.clientId as string;
  if (!validateClientId(clientId)) { res.status(401).json({ error: "Authentication required" }); return; }

  const state  = signState({ userId: clientId, provider: "google", ts: String(Date.now()) });
  const params = new URLSearchParams({
    client_id:     GG_CLIENT_ID()!,
    redirect_uri:  GG_REDIRECT_URI()!,
    response_type: "code",
    scope:         SCOPES.join(" "),
    state,
    access_type:   "offline",
    prompt:        "consent select_account",
  });
  res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
});

// GET /api/integrations/google/callback
router.get("/integrations/google/callback", async (req: Request, res: Response) => {
  const { code, state, error } = req.query as Record<string, string>;

  if (error) { res.send(popupPage(false, "Connection cancelled", "google")); return; }
  if (!code || !state) { res.send(popupPage(false, "Missing parameters", "google")); return; }

  const stateData = verifyState(state);
  if (!stateData?.userId) { res.send(popupPage(false, "Invalid request", "google")); return; }
  if (!GG_CLIENT_ID() || !GG_CLIENT_SECRET() || !GG_REDIRECT_URI()) {
    res.send(popupPage(false, "Server configuration error", "google")); return;
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id:     GG_CLIENT_ID()!,
        client_secret: GG_CLIENT_SECRET()!,
        code,
        redirect_uri:  GG_REDIRECT_URI()!,
        grant_type:    "authorization_code",
      }),
    });
    if (!tokenRes.ok) {
      const body = await tokenRes.text();
      req.log?.error({ status: tokenRes.status, body }, "Google token exchange failed");
      res.send(popupPage(false, "Token exchange failed", "google"));
      return;
    }

    const t = await tokenRes.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
    };

    const expiresAt = t.expires_in ? Date.now() + t.expires_in * 1000 : null;
    const id        = `ot_${stateData.userId}_google`;

    await db.insert(oauthTokens).values({
      id,
      userId:       stateData.userId,
      provider:     "google",
      accessToken:  encryptToken(t.access_token),
      refreshToken: t.refresh_token ? encryptToken(t.refresh_token) : null,
      expiresAt:    expiresAt ?? undefined,
      scope:        t.scope ?? SCOPES.join(" "),
    }).onConflictDoUpdate({
      target: oauthTokens.id,
      set: {
        accessToken:  encryptToken(t.access_token),
        refreshToken: t.refresh_token ? encryptToken(t.refresh_token) : null,
        expiresAt:    expiresAt ?? undefined,
        scope:        t.scope ?? SCOPES.join(" "),
        updatedAt:    new Date(),
      },
    });

    req.log?.info({ userId: stateData.userId }, "Google tokens stored");
    res.send(popupPage(true, "Google Connected!", "google"));
  } catch (err: any) {
    req.log?.error(err, "Google callback error");
    res.send(popupPage(false, "Connection failed", "google"));
  }
});

// GET /api/integrations/google/calendar/events
router.get("/integrations/google/calendar/events", async (req: Request, res: Response) => {
  if (!isConfigured()) { res.status(503).json({ error: "Not configured" }); return; }
  const clientId = req.query.clientId as string;
  if (!validateClientId(clientId)) { res.status(401).json({ error: "Authentication required" }); return; }

  const accessToken = await getValidAccessToken(clientId);
  if (!accessToken) { res.status(401).json({ error: "Not connected — reconnect Google" }); return; }

  try {
    const now = new Date().toISOString();
    const end = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now}&timeMax=${end}&singleEvents=true&orderBy=startTime&maxResults=25&fields=items(id,summary,start,end,location,description)`;

    const eventsRes = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!eventsRes.ok) {
      if (eventsRes.status === 401) {
        await db.delete(oauthTokens).where(and(eq(oauthTokens.userId, clientId), eq(oauthTokens.provider, "google")));
        res.status(401).json({ error: "Token expired — reconnect Google" });
      } else {
        res.status(502).json({ error: "Failed to fetch calendar events" });
      }
      return;
    }
    const data = await eventsRes.json() as { items?: unknown[] };
    res.json({ events: data.items ?? [] });
  } catch (err: any) {
    req.log?.error(err, "Google calendar fetch error");
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

// GET /api/integrations/google/mail
router.get("/integrations/google/mail", async (req: Request, res: Response) => {
  if (!isConfigured()) { res.status(503).json({ error: "Not configured" }); return; }
  const clientId = req.query.clientId as string;
  if (!validateClientId(clientId)) { res.status(401).json({ error: "Authentication required" }); return; }

  const accessToken = await getValidAccessToken(clientId);
  if (!accessToken) { res.status(401).json({ error: "Not connected — reconnect Google" }); return; }

  try {
    // List recent message IDs
    const since   = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000);
    const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=after:${since}&maxResults=20&fields=messages(id)`;
    const listRes = await fetch(listUrl, { headers: { Authorization: `Bearer ${accessToken}` } });

    if (!listRes.ok) {
      if (listRes.status === 401) {
        await db.delete(oauthTokens).where(and(eq(oauthTokens.userId, clientId), eq(oauthTokens.provider, "google")));
        res.status(401).json({ error: "Token expired — reconnect Google" });
      } else {
        res.status(502).json({ error: "Failed to fetch emails" });
      }
      return;
    }

    const listData = await listRes.json() as { messages?: { id: string }[] };
    const ids = (listData.messages ?? []).slice(0, 20);

    // Fetch each message metadata in parallel (batch up to 10)
    const messages = await Promise.all(
      ids.slice(0, 10).map(async ({ id }) => {
        try {
          const msgRes = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          if (!msgRes.ok) return null;
          return await msgRes.json();
        } catch { return null; }
      })
    );

    res.json({ messages: messages.filter(Boolean) });
  } catch (err: any) {
    req.log?.error(err, "Gmail fetch error");
    res.status(500).json({ error: "Failed to fetch emails" });
  }
});

// DELETE /api/integrations/google/disconnect
router.delete("/integrations/google/disconnect", async (req: Request, res: Response) => {
  const clientId = (req.query.clientId ?? req.body?.clientId) as string;
  if (!validateClientId(clientId)) { res.status(401).json({ error: "Authentication required" }); return; }
  try {
    // Optionally revoke the token at Google
    const rows = await db.select({ accessToken: oauthTokens.accessToken }).from(oauthTokens).where(
      and(eq(oauthTokens.userId, clientId), eq(oauthTokens.provider, "google"))
    );
    if (rows.length) {
      try {
        const token = decryptToken(rows[0].accessToken);
        await fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, { method: "POST" });
      } catch { /* revoke is best-effort */ }
    }
    await db.delete(oauthTokens).where(and(eq(oauthTokens.userId, clientId), eq(oauthTokens.provider, "google")));
    res.json({ disconnected: true });
  } catch (err: any) {
    req.log?.error(err, "Google disconnect error");
    res.status(500).json({ error: "Failed to disconnect" });
  }
});

export default router;
