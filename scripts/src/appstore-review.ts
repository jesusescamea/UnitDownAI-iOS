#!/usr/bin/env tsx
/**
 * UnitDown AI — App Store Screenshot Review
 *
 * Validates the generated screenshots and recommends the best 8 for submission.
 *
 * Usage:
 *   pnpm --filter @workspace/scripts run appstore:review
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../../..");
const OUTPUT_DIR = path.join(REPO_ROOT, "screenshots", "appstore");

// Expected output files in order
const EXPECTED_FILES: Array<{ file: string; label: string }> = [
  { file: "01-home.png",              label: "Home screen" },
  { file: "02-diagnostic-report.png", label: "AI Diagnostic Report" },
  { file: "03-likely-causes.png",     label: "Likely Causes" },
  { file: "04-meter-checks.png",      label: "Meter & Instrument Checks" },
  { file: "05-recommended-action.png",label: "Recommended Action" },
  { file: "06-equipment-timeline.png",label: "Equipment Timeline" },
  { file: "07-brand-guides.png",      label: "Brand Guides" },
  { file: "08-hvac-guides.png",       label: "HVAC Guides Library" },
  { file: "09-unit-details.png",      label: "Unit Details" },
  { file: "10-pro-membership.png",    label: "Pro Membership" },
];

// iPhone 16 Pro Max at 3× scale → 3870 × 8388 physical pixels
const EXPECTED_WIDTH  = 1290 * 3; // 3870
const EXPECTED_HEIGHT = 2796 * 3; // 8388

// File-size thresholds (KB) for content detection heuristics.
// Large screenshots (≥ 400 KB) tend to contain rich UI — photos, cards, charts.
// Very small screenshots (< 120 KB) are likely mostly white or pure text.
const RICH_CONTENT_MIN_KB   = 400;
const SPARSE_CONTENT_MAX_KB = 120;

// ── PNG header parsing ────────────────────────────────────────────────────────

interface PngDimensions { width: number; height: number }

function readPngDimensions(buf: Buffer): PngDimensions {
  // PNG spec: 8-byte signature, then IHDR chunk:
  //   4 bytes length | 4 bytes "IHDR" | 4 bytes width | 4 bytes height | …
  // Width starts at byte offset 16, height at 20.
  if (buf.length < 24) throw new Error("File too small to be a valid PNG.");
  const sig = buf.toString("hex", 0, 8);
  if (sig !== "89504e470d0a1a0a") throw new Error("Not a PNG file.");
  return {
    width:  buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
  };
}

// ── Analysis ──────────────────────────────────────────────────────────────────

interface ScreenshotResult {
  file:        string;
  label:       string;
  exists:      boolean;
  sizeKb:      number;
  width:       number;
  height:      number;
  dimOk:       boolean;
  sparseFlag:  boolean;  // likely empty / mostly-white content
  textHeavy:   boolean;  // likely very text-dense (small file despite correct dims)
  issues:      string[];
  score:       number;   // 0–100 — higher = better for App Store
}

function analyse(entry: { file: string; label: string }): ScreenshotResult {
  const filepath = path.join(OUTPUT_DIR, entry.file);
  const issues: string[] = [];

  if (!fs.existsSync(filepath)) {
    return {
      ...entry,
      exists:     false,
      sizeKb:     0,
      width:      0,
      height:     0,
      dimOk:      false,
      sparseFlag: false,
      textHeavy:  false,
      issues:     ["MISSING — run appstore:screenshots first"],
      score:      0,
    };
  }

  const buf     = fs.readFileSync(filepath);
  const sizeKb  = Math.round(buf.length / 1024);
  let   width   = 0;
  let   height  = 0;

  try {
    ({ width, height } = readPngDimensions(buf));
  } catch (e) {
    issues.push(`PNG header error: ${(e as Error).message}`);
  }

  const dimOk      = width === EXPECTED_WIDTH && height === EXPECTED_HEIGHT;
  const sparseFlag = sizeKb < SPARSE_CONTENT_MAX_KB;
  const textHeavy  = !sparseFlag && sizeKb < RICH_CONTENT_MIN_KB;

  if (!dimOk) {
    issues.push(
      `Dimensions ${width}×${height} px — expected ${EXPECTED_WIDTH}×${EXPECTED_HEIGHT} px`,
    );
  }
  if (sparseFlag) {
    issues.push(
      `File is only ${sizeKb} KB — screenshot may be blank or show an error/empty state`,
    );
  }
  if (textHeavy) {
    issues.push(
      `File is ${sizeKb} KB — content may be mostly text (flag for manual review)`,
    );
  }

  // Score: start at 100, deduct for each problem
  let score = 100;
  if (!dimOk)      score -= 40;
  if (sparseFlag)  score -= 35;
  if (textHeavy)   score -= 10;
  score = Math.max(0, score);

  return {
    ...entry,
    exists:    true,
    sizeKb,
    width,
    height,
    dimOk,
    sparseFlag,
    textHeavy,
    issues,
    score,
  };
}

// ── Reporting ─────────────────────────────────────────────────────────────────

function pad(s: string, n: number) { return s.padEnd(n); }
function col(s: string | number, n: number) { return String(s).padStart(n); }

function statusIcon(r: ScreenshotResult): string {
  if (!r.exists)       return "❌";
  if (r.sparseFlag)    return "⚠ ";
  if (!r.dimOk)        return "⚠ ";
  if (r.textHeavy)     return "🔍";
  return "✅";
}

function printReport(results: ScreenshotResult[]) {
  const total    = results.length;
  const ok       = results.filter((r) => r.exists && r.dimOk && !r.sparseFlag).length;
  const missing  = results.filter((r) => !r.exists).length;
  const warnings = results.filter((r) => r.exists && (r.sparseFlag || !r.dimOk)).length;

  console.log("\n══════════════════════════════════════════════════════════════");
  console.log("  UnitDown AI — App Store Screenshot Review");
  console.log(`  Directory: ${OUTPUT_DIR}`);
  console.log("══════════════════════════════════════════════════════════════\n");

  console.log(
    `${pad("File", 32)}  ${pad("Label", 28)}  ${col("KB", 6)}  ${col("W×H (px)", 18)}  ${col("Score", 5)}  Status`,
  );
  console.log("─".repeat(104));

  for (const r of results) {
    const dims = r.exists ? `${r.width}×${r.height}` : "—";
    console.log(
      `${statusIcon(r)}  ${pad(r.file, 30)}  ${pad(r.label, 28)}  ${col(r.sizeKb, 5)}  ${col(dims, 17)}  ${col(r.score, 4)}%`,
    );
    for (const issue of r.issues) {
      console.log(`     └─ ${issue}`);
    }
  }

  console.log("─".repeat(104));
  console.log(`\n  ${ok}/${total} screenshots passed · ${missing} missing · ${warnings} warnings\n`);
}

function printRecommendations(results: ScreenshotResult[]) {
  // Rank by score descending, then by original order for ties
  const ranked = [...results]
    .map((r, i) => ({ ...r, order: i }))
    .sort((a, b) => b.score - a.score || a.order - b.order);

  const top8    = ranked.slice(0, 8);
  const passing = top8.filter((r) => r.score >= 60);

  console.log("══════════════════════════════════════════════════════════════");
  console.log("  Recommended 8 screenshots for App Store submission");
  console.log("══════════════════════════════════════════════════════════════\n");

  console.log("  App Store Connect accepts up to 10 screenshots; Apple recommends 8.");
  console.log("  The first screenshot is shown in search results — make it count.\n");

  for (let i = 0; i < top8.length; i++) {
    const r   = top8[i];
    const pos = `${i + 1}.`;
    const ok  = r.score >= 60 ? "✅" : "⚠ ";
    console.log(`  ${ok} ${pos.padEnd(3)} ${r.file.padEnd(32)} ${r.label}`);
  }

  if (passing.length < 8) {
    const needed = 8 - passing.length;
    console.log(
      `\n  ⚠  Only ${passing.length} screenshots scored ≥ 60%. ` +
      `Re-run appstore:screenshots to fill ${needed} more slot(s).`,
    );
  }

  console.log("\n──────────────────────────────────────────────────────────────");
  console.log("  Apple requirements for iPhone 16 Pro Max:");
  console.log(`    • Dimensions: ${EXPECTED_WIDTH}×${EXPECTED_HEIGHT} px (1290×2796 @3×)`);
  console.log("    • Format: PNG or JPEG");
  console.log("    • No rounded corners, no device frames (App Store Connect adds them)");
  console.log("    • First screenshot appears in search results — use a compelling image");
  console.log("    • Screenshots do not need to be in order of app flow");
  console.log("──────────────────────────────────────────────────────────────\n");
}

// ── Main ──────────────────────────────────────────────────────────────────────

function main() {
  const results = EXPECTED_FILES.map(analyse);
  printReport(results);
  printRecommendations(results);

  const hasErrors = results.some((r) => !r.exists || r.sparseFlag || !r.dimOk);
  process.exit(hasErrors ? 1 : 0);
}

main();
