import crypto from "node:crypto";

function getSecret(): string {
  return process.env.TOKEN_ENCRYPTION_KEY ?? "dev-insecure-fallback-key-change-in-prod";
}

export function signState(data: Record<string, string>): string {
  const payloadB64 = Buffer.from(JSON.stringify(data)).toString("base64url");
  const sig = crypto.createHmac("sha256", getSecret()).update(payloadB64).digest("base64url");
  return `${payloadB64}.${sig}`;
}

export function verifyState(state: string): Record<string, string> | null {
  try {
    const dotIdx = state.lastIndexOf(".");
    if (dotIdx < 0) return null;
    const payloadB64 = state.slice(0, dotIdx);
    const sig        = state.slice(dotIdx + 1);
    const expected   = crypto.createHmac("sha256", getSecret()).update(payloadB64).digest("base64url");
    if (sig.length !== expected.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(sig, "utf8"), Buffer.from(expected, "utf8"))) return null;
    return JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as Record<string, string>;
  } catch {
    return null;
  }
}
