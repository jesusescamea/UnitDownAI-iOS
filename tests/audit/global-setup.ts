import { chromium, request } from "@playwright/test";

const BASE_URL = process.env.AUDIT_BASE_URL ?? "http://localhost:80";

export default async function globalSetup() {
  console.log(`\n🔍 UnitDown Field OS — Regression Audit`);
  console.log(`   Target: ${BASE_URL}`);
  console.log(`   Time:   ${new Date().toISOString()}\n`);

  // Verify API server is reachable
  try {
    const ctx = await request.newContext({ baseURL: BASE_URL });
    const res = await ctx.get("/api/healthz");
    if (!res.ok()) {
      console.error(`❌ API server not healthy (HTTP ${res.status()}). Start workflows first.`);
      process.exit(1);
    }
    const body = await res.json();
    if (body?.status !== "ok") {
      console.error(`❌ API healthz returned unexpected body:`, body);
      process.exit(1);
    }
    console.log(`✅ API server healthy`);
    await ctx.dispose();
  } catch (e) {
    console.error(`❌ Cannot reach API at ${BASE_URL}/api/healthz — is the API Server workflow running?`);
    console.error(`   Error: ${e}`);
    process.exit(1);
  }

  // Verify frontend is reachable
  try {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    const res = await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
    if (!res || res.status() >= 500) {
      console.error(`❌ Frontend returned HTTP ${res?.status()}. Is the web workflow running?`);
      await browser.close();
      process.exit(1);
    }
    console.log(`✅ Frontend reachable (HTTP ${res.status()})`);
    await browser.close();
  } catch (e) {
    console.error(`❌ Cannot reach frontend at ${BASE_URL}/ — is the web workflow running?`);
    process.exit(1);
  }

  // Warn if no auth state available
  const fs = await import("fs");
  const authStatePath = process.env.AUDIT_AUTH_STATE ?? ".auth/user.json";
  const hasAuth = fs.existsSync(new URL(authStatePath, `file://${__dirname}/`).pathname);
  if (!hasAuth) {
    console.log(`⚠️  No auth state found — authenticated tests will be skipped.`);
    console.log(`   Run: pnpm audit:setup-auth   (then sign in manually)`);
  } else {
    console.log(`✅ Auth state found — authenticated tests will run`);
  }

  console.log(`\n📋 Starting tests...\n`);
}
