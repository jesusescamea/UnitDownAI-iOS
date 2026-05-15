const FP_KEY = "unitdown_fp";

function generateFingerprint(): string {
  try {
    const parts = [
      navigator.language ?? "",
      (navigator.languages ?? []).join(","),
      `${screen.width}x${screen.height}`,
      String(screen.colorDepth ?? ""),
      Intl.DateTimeFormat().resolvedOptions().timeZone ?? "",
      String(navigator.hardwareConcurrency ?? ""),
      navigator.userAgent ?? "",
    ];
    const raw = parts.join("|");
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      const ch = raw.charCodeAt(i);
      hash = ((hash << 5) - hash + ch) | 0;
    }
    return `fp_${Math.abs(hash).toString(36)}`;
  } catch {
    return `fp_${Math.random().toString(36).slice(2, 10)}`;
  }
}

export function getFingerprint(): string {
  try {
    const cached = localStorage.getItem(FP_KEY);
    if (cached) return cached;
  } catch {}
  const fp = generateFingerprint();
  try {
    localStorage.setItem(FP_KEY, fp);
  } catch {}
  return fp;
}
