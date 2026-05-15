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

await initClerkRedirectUrls();

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
