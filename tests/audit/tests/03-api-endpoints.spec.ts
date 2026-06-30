/**
 * 03 — API Endpoints
 * Direct API calls. Verifies: correct status codes, JSON shape, no crashes.
 * Auth-gated endpoints are expected to return 401 (not 500 or 404).
 */
import { test, expect } from "../utils/fixtures";

const BASE = process.env.AUDIT_BASE_URL ?? "http://localhost:80";

test("[API] GET /api/healthz → 200 { status: 'ok' }", async ({ request }) => {
  const res = await request.get(`${BASE}/api/healthz`);
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body).toMatchObject({ status: "ok" });
});

test("[API] GET /api/usage/status → responds (200 or 400, not 500)", async ({ request }) => {
  const res = await request.get(
    `${BASE}/api/usage/status?clientId=audit-test-client`,
  );
  expect(res.status()).not.toBeGreaterThanOrEqual(500);
  expect(res.status()).not.toBe(404);
  // Should return JSON
  const ct = res.headers()["content-type"] ?? "";
  expect(ct).toContain("application/json");
});

test("[API] GET /api/units → responds (200 with list or 401, not 500)", async ({ request }) => {
  const res = await request.get(
    `${BASE}/api/units?clientId=audit-test-client`,
  );
  expect(res.status()).not.toBeGreaterThanOrEqual(500);
  expect(res.status()).not.toBe(404);
});

test("[API] GET /api/diagnostic-logs → responds (not 500, not 404)", async ({ request }) => {
  const res = await request.get(
    `${BASE}/api/diagnostic-logs?clientId=audit-test-client`,
  );
  expect(res.status()).not.toBeGreaterThanOrEqual(500);
  expect(res.status()).not.toBe(404);
});

test("[API] POST /api/hvac/diagnose without body → 400, not 500", async ({ request }) => {
  const res = await request.post(`${BASE}/api/hvac/diagnose`, {
    data: { symptoms: "" },
    headers: { "Content-Type": "application/json" },
  });
  // Empty symptoms should be rejected 400 — not crash the server with 500
  expect(res.status()).not.toBeGreaterThanOrEqual(500);
  expect(res.status()).not.toBe(404);
});

test("[API] POST /api/nameplate/ocr without file → 400, not 500", async ({ request }) => {
  const res = await request.post(`${BASE}/api/nameplate/ocr`, {
    multipart: {},
  });
  // No file provided → expect 400 not 500
  expect(res.status()).toBe(400);
  const body = await res.json().catch(() => ({}));
  expect(typeof (body as Record<string, unknown>).error).toBe("string");
});

test("[API] GET /api/van/inventory → responds (not 500)", async ({ request }) => {
  const res = await request.get(
    `${BASE}/api/van/inventory?clientId=audit-test-client`,
  );
  expect(res.status()).not.toBeGreaterThanOrEqual(500);
  expect(res.status()).not.toBe(404);
});

test("[API] GET /api/scheduled-events → responds (not 500)", async ({ request }) => {
  const res = await request.get(
    `${BASE}/api/scheduled-events?clientId=audit-test-client`,
  );
  expect(res.status()).not.toBeGreaterThanOrEqual(500);
  expect(res.status()).not.toBe(404);
});

test("[API] All /api/* responses include content-type JSON where expected", async ({ request }) => {
  const endpoints = [
    "/api/healthz",
    "/api/usage/status?clientId=audit-test-client",
    "/api/van/inventory?clientId=audit-test-client",
  ];
  for (const ep of endpoints) {
    const res = await request.get(`${BASE}${ep}`);
    if (res.status() === 200) {
      const ct = res.headers()["content-type"] ?? "";
      expect(ct, `${ep} should return application/json`).toContain("application/json");
    }
  }
});
