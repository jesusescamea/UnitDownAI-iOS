import { Router, type Request, type Response } from "express";
import { db, oauthTokens } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { encryptToken, decryptToken, isEncryptionConfigured } from "../lib/tokenEncryption";
import { signState, verifyState } from "../lib/oauthState";

const router = Router();

// ─── Config ───────────────────────────────────────────────────────────────────

const MS_CLIENT_ID     = () => process.env.MICROSOFT_CLIENT_ID;
const MS_CLIENT_SECRET = () => process.env.MICROSOFT_CLIENT_SECRET;
const MS_REDIRECT_URI  = () => process.env.MICROSOFT_REDIRECT_URI;
const MS_TENANT_ID     = () => process.env.MICROSOFT_TENANT_ID ?? "common";

const SCOPES = ["Calendars.Read", "Mail.Read", "offline_access", "User.Read"];

function isConfigured(): boolean {
  return !!(MS_CLIENT_ID() && MS_CLIENT_SECRET() && MS_REDIRECT_URI() && isEncryptionConfigured());
}

function validateClientId(clientId: unknown): clientId is string {
  return typeof clientId === "string" && clientId.startsWith("user_") && clientId.length < 200;
}

// ─── Popup result page ─────────────────────────────────────────────────────────

function popupPage(success: boolean, message: string, provider = "outlook"): string {
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
      and(eq(oauthTokens.userId, userId), eq(oauthTokens.provider, "outlook"))
    );
  } catch {
    return null;
  }

  if (!rows.length) return null;
  const row = rows[0];

  const nearExpiry = row.expiresAt && Date.now() > (row.expiresAt - 300_000);
  if (nearExpiry && row.refreshToken && MS_CLIENT_ID() && MS_CLIENT_SECRET()) {
    try {
      const refreshed = decryptToken(row.refreshToken);
      const tokenRes = await fetch(
        `https://login.microsoftonline.com/${MS_TENANT_ID()}/oauth2/v2.0/token`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id:     MS_CLIENT_ID()!,
            client_secret: MS_CLIENT_SECRET()!,
            refresh_token: refreshed,
            grant_type:    "refresh_token",
            scope:         SCOPES.join(" "),
          }),
        }
      );
      if (tokenRes.ok) {
        const t = await tokenRes.json() as { access_token: string; refresh_token?: string; expires_in?: number };
        const expiresAt = t.expires_in ? Date.now() + t.expires_in * 1000 : null;
        await db.update(oauthTokens).set({
          accessToken:  encryptToken(t.access_token),
          refreshToken: t.refresh_token ? encryptToken(t.refresh_token) : row.refreshToken,
          expiresAt:    expiresAt ?? undefined,
          updatedAt:    new Date(),
        }).where(and(eq(oauthTokens.userId, userId), eq(oauthTokens.provider, "outlook")));
        return t.access_token;
      }
    } catch { /* fall through to existing token */ }
  }

  try { return decryptToken(row.accessToken); } catch { return null; }
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /api/integrations/outlook/status
router.get("/integrations/outlook/status", async (req: Request, res: Response) => {
  if (!isConfigured()) { res.json({ configured: false, connected: false }); return; }
  const clientId = req.query.clientId as string;
  if (!validateClientId(clientId)) { res.status(401).json({ error: "Authentication required" }); return; }
  try {
    const rows = await db.select({ id: oauthTokens.id }).from(oauthTokens).where(
      and(eq(oauthTokens.userId, clientId), eq(oauthTokens.provider, "outlook"))
    );
    res.json({ configured: true, connected: rows.length > 0 });
  } catch (err: any) {
    if (err?.code === "42P01") { res.json({ configured: true, connected: false }); return; }
    req.log?.error(err, "Failed to check Outlook status");
    res.status(500).json({ error: "Status check failed" });
  }
});

// GET /api/integrations/outlook/auth-url
router.get("/integrations/outlook/auth-url", (req: Request, res: Response) => {
  if (!isConfigured()) { res.status(503).json({ error: "Outlook integration not configured" }); return; }
  const clientId = req.query.clientId as string;
  if (!validateClientId(clientId)) { res.status(401).json({ error: "Authentication required" }); return; }

  const state  = signState({ userId: clientId, provider: "outlook", ts: String(Date.now()) });
  const params = new URLSearchParams({
    client_id:     MS_CLIENT_ID()!,
    response_type: "code",
    redirect_uri:  MS_REDIRECT_URI()!,
    scope:         SCOPES.join(" "),
    state,
    response_mode: "query",
    prompt:        "select_account",
  });
  res.json({ url: `https://login.microsoftonline.com/${MS_TENANT_ID()}/oauth2/v2.0/authorize?${params}` });
});

// GET /api/integrations/outlook/callback
router.get("/integrations/outlook/callback", async (req: Request, res: Response) => {
  const { code, state, error } = req.query as Record<string, string>;

  if (error) {
    res.send(popupPage(false, "Connection cancelled", "outlook"));
    return;
  }
  if (!code || !state) {
    res.send(popupPage(false, "Missing parameters", "outlook"));
    return;
  }

  const stateData = verifyState(state);
  if (!stateData?.userId) {
    res.send(popupPage(false, "Invalid request", "outlook"));
    return;
  }
  if (!MS_CLIENT_ID() || !MS_CLIENT_SECRET() || !MS_REDIRECT_URI()) {
    res.send(popupPage(false, "Server configuration error", "outlook"));
    return;
  }

  try {
    const tokenRes = await fetch(
      `https://login.microsoftonline.com/${MS_TENANT_ID()}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id:     MS_CLIENT_ID()!,
          client_secret: MS_CLIENT_SECRET()!,
          code,
          redirect_uri:  MS_REDIRECT_URI()!,
          grant_type:    "authorization_code",
        }),
      }
    );
    if (!tokenRes.ok) {
      const body = await tokenRes.text();
      req.log?.error({ status: tokenRes.status, body }, "Outlook token exchange failed");
      res.send(popupPage(false, "Token exchange failed", "outlook"));
      return;
    }

    const t = await tokenRes.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
    };

    const expiresAt = t.expires_in ? Date.now() + t.expires_in * 1000 : null;
    const id        = `ot_${stateData.userId}_outlook`;

    await db.insert(oauthTokens).values({
      id,
      userId:       stateData.userId,
      provider:     "outlook",
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

    req.log?.info({ userId: stateData.userId }, "Outlook tokens stored");
    res.send(popupPage(true, "Outlook Connected!", "outlook"));
  } catch (err: any) {
    req.log?.error(err, "Outlook callback error");
    res.send(popupPage(false, "Connection failed", "outlook"));
  }
});

// GET /api/integrations/outlook/calendar/events
router.get("/integrations/outlook/calendar/events", async (req: Request, res: Response) => {
  if (!isConfigured()) { res.status(503).json({ error: "Not configured" }); return; }
  const clientId = req.query.clientId as string;
  if (!validateClientId(clientId)) { res.status(401).json({ error: "Authentication required" }); return; }

  const accessToken = await getValidAccessToken(clientId);
  if (!accessToken) { res.status(401).json({ error: "Not connected — reconnect Outlook" }); return; }

  try {
    const now = new Date().toISOString();
    const end = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const url = `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${now}&endDateTime=${end}&$select=id,subject,start,end,location,bodyPreview,body&$top=25&$orderby=start/dateTime`;

    const eventsRes = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}`, Prefer: 'outlook.timezone="UTC"' },
    });
    if (!eventsRes.ok) {
      const body = await eventsRes.text();
      req.log?.warn({ status: eventsRes.status, body }, "Graph calendar fetch failed");
      if (eventsRes.status === 401) {
        await db.delete(oauthTokens).where(and(eq(oauthTokens.userId, clientId), eq(oauthTokens.provider, "outlook")));
        res.status(401).json({ error: "Token expired — reconnect Outlook" });
      } else {
        res.status(502).json({ error: "Failed to fetch calendar events" });
      }
      return;
    }
    const data = await eventsRes.json() as { value?: unknown[] };
    res.json({ events: data.value ?? [] });
  } catch (err: any) {
    req.log?.error(err, "Outlook calendar fetch error");
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

// GET /api/integrations/outlook/mail
router.get("/integrations/outlook/mail", async (req: Request, res: Response) => {
  if (!isConfigured()) { res.status(503).json({ error: "Not configured" }); return; }
  const clientId = req.query.clientId as string;
  if (!validateClientId(clientId)) { res.status(401).json({ error: "Authentication required" }); return; }

  const accessToken = await getValidAccessToken(clientId);
  if (!accessToken) { res.status(401).json({ error: "Not connected — reconnect Outlook" }); return; }

  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const url   = `https://graph.microsoft.com/v1.0/me/messages?$filter=receivedDateTime ge ${since}&$select=id,subject,from,receivedDateTime,bodyPreview,body&$top=20&$orderby=receivedDateTime desc`;

    const mailRes = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!mailRes.ok) {
      if (mailRes.status === 401) {
        await db.delete(oauthTokens).where(and(eq(oauthTokens.userId, clientId), eq(oauthTokens.provider, "outlook")));
        res.status(401).json({ error: "Token expired — reconnect Outlook" });
      } else {
        res.status(502).json({ error: "Failed to fetch emails" });
      }
      return;
    }
    const data = await mailRes.json() as { value?: unknown[] };
    res.json({ messages: data.value ?? [] });
  } catch (err: any) {
    req.log?.error(err, "Outlook mail fetch error");
    res.status(500).json({ error: "Failed to fetch emails" });
  }
});

// DELETE /api/integrations/outlook/disconnect
router.delete("/integrations/outlook/disconnect", async (req: Request, res: Response) => {
  const clientId = (req.query.clientId ?? req.body?.clientId) as string;
  if (!validateClientId(clientId)) { res.status(401).json({ error: "Authentication required" }); return; }
  try {
    await db.delete(oauthTokens).where(and(eq(oauthTokens.userId, clientId), eq(oauthTokens.provider, "outlook")));
    res.json({ disconnected: true });
  } catch (err: any) {
    req.log?.error(err, "Outlook disconnect error");
    res.status(500).json({ error: "Failed to disconnect" });
  }
});

export default router;
