import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// ─── Clerk: register allowed redirect URLs ────────────────────────────────────
// Clerk validates the redirect URL after sign-in against its allowed-redirect-
// URL list. By default the Replit-provisioned live instance only knows about
// Replit-owned domains. This function adds the custom production domain
// (unitdown.org) and every entry in REPLIT_DOMAINS so that auth works on all
// configured domains without any manual dashboard intervention.
async function initClerkRedirectUrls() {
  try {
    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) return;
    if (!secretKey.startsWith("sk_live_")) {
      logger.info("Clerk: dev key detected — skipping redirect URL registration");
      return;
    }

    // Hard-coded custom domain + everything in the REPLIT_DOMAINS env var
    const domains = new Set<string>([
      "https://unitdown.org",
      "https://www.unitdown.org",
    ]);
    const replitDomains = (process.env.REPLIT_DOMAINS ?? "").split(",").filter(Boolean);
    for (const d of replitDomains) {
      domains.add(`https://${d.trim()}`);
    }

    // Fetch the current allowed-redirect-URL list from the Clerk BAPI
    const listRes = await fetch("https://api.clerk.com/v1/redirect_urls", {
      headers: { Authorization: `Bearer ${secretKey}` },
    });
    const listed = (await listRes.json()) as { id: string; url: string }[];
    const existingUrls = new Set(Array.isArray(listed) ? listed.map((r) => r.url) : []);

    // Add any missing URLs
    for (const url of domains) {
      if (existingUrls.has(url)) continue;
      const addRes = await fetch("https://api.clerk.com/v1/redirect_urls", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });
      if (addRes.ok) {
        logger.info({ url }, "Clerk: registered allowed redirect URL");
      } else {
        const body = await addRes.json();
        logger.warn({ url, body }, "Clerk: failed to register redirect URL");
      }
    }

    logger.info({ count: domains.size }, "Clerk: allowed redirect URLs verified");
  } catch (err: any) {
    logger.warn({ err: err.message }, "Clerk: redirect URL setup failed (non-fatal)");
  }
}

// ─── Clerk: patch instance display_config to remove stale / broken URLs ──────
// When unitdown.org was attached as a custom domain in Replit Publishing,
// Clerk's instance display_config was automatically updated to use:
//   - accounts.unitdown.org   (for sign_in_url, sign_up_url, after_sign_out_*)
//   - unit-down-ai-new.replit.app (for home_url, after_sign_in_url, after_sign_up_url)
//
// The accounts.unitdown.org subdomain has NO DNS record (NXDOMAIN), so any
// Clerk flow that redirects to it — OAuth callbacks, sign-out — fails with
// DNS_PROBE_FINISHED_NXDOMAIN on the client. The ClerkProvider in main.tsx
// overrides these at the SDK level, but we also patch the Clerk instance
// directly so the stored config stays clean for all surfaces.
async function initClerkInstanceUrls() {
  try {
    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) return;
    if (!secretKey.startsWith("sk_live_")) {
      logger.info("Clerk: dev key detected — skipping instance URL patch");
      return;
    }

    const PRODUCTION_URL = "https://unitdown.org";

    // All URL fields that must point to unitdown.org, never to
    // accounts.unitdown.org or the old replit.app domain. These map directly
    // to the PATCH /v1/instance request body fields supported by Clerk's BAPI.
    const TARGET_URLS: Record<string, string> = {
      home_url:               PRODUCTION_URL,
      sign_in_url:            `${PRODUCTION_URL}/login`,
      sign_up_url:            `${PRODUCTION_URL}/signup`,
      after_sign_in_url:      PRODUCTION_URL,
      after_sign_up_url:      PRODUCTION_URL,
      after_sign_out_one_url: PRODUCTION_URL,
      after_sign_out_all_url: PRODUCTION_URL,
      after_switch_session_url: PRODUCTION_URL,
    };

    // Read the current instance config so we can diff before patching.
    const getRes = await fetch("https://api.clerk.com/v1/instance", {
      headers: { Authorization: `Bearer ${secretKey}` },
    });

    if (!getRes.ok) {
      const body = await getRes.text();
      logger.warn({ status: getRes.status, body }, "Clerk: failed to read instance config");
      return;
    }

    const instance = (await getRes.json()) as Record<string, unknown>;

    // Build a patch body containing only the fields that are currently stale.
    const patchBody: Record<string, string> = {};
    for (const [field, target] of Object.entries(TARGET_URLS)) {
      if (instance[field] !== target) {
        patchBody[field] = target;
      }
    }

    if (Object.keys(patchBody).length === 0) {
      logger.info("Clerk: all instance URLs already correct — no patch needed");
      return;
    }

    logger.info(
      { staleFields: Object.keys(patchBody), patchBody },
      "Clerk: patching stale instance URLs",
    );

    const patchRes = await fetch("https://api.clerk.com/v1/instance", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(patchBody),
    });

    if (patchRes.ok) {
      logger.info({ patchedFields: Object.keys(patchBody) }, "Clerk: instance URLs patched");
    } else {
      const body = await patchRes.json().catch(() => ({}));
      logger.warn({ status: patchRes.status, body }, "Clerk: instance PATCH failed (non-fatal)");
    }
  } catch (err: any) {
    logger.warn({ err: err.message }, "Clerk: instance URL patch failed (non-fatal)");
  }
}

await Promise.all([
  initClerkRedirectUrls(),
  initClerkInstanceUrls(),
]);

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
