/**
 * Generates all PWA and Android icons from the UnitDown AI brand mark:
 * the ThermometerSnowflake icon (lucide-react) — white on #2563eb blue.
 *
 * Run from the scripts/ directory:
 *   cd scripts && node src/generate-brand-icons.mjs
 *
 * Requires @resvg/resvg-js (already in scripts/package.json).
 */

import { Resvg } from "@resvg/resvg-js";
import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const PUBLIC = resolve(__dir, "../../artifacts/unitdown-ai/public");
const ANDROID_RES = resolve(
  __dir,
  "../../artifacts/unitdown-ai/android/app/src/main/res"
);

// ── Brand SVG paths ───────────────────────────────────────────────────────────
// Exact ThermometerSnowflake paths from lucide-react v0.545.0 (24×24 viewBox).
// Stroke only, no fill — rendered white on the blue background.
const PATHS = `
  <path d="m10 20-1.25-2.5L6 18"/>
  <path d="M10 4 8.75 6.5 6 6"/>
  <path d="M10.585 15H10"/>
  <path d="M2 12h6.5L10 9"/>
  <path d="M20 14.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0z"/>
  <path d="m4 10 1.5 2L4 14"/>
  <path d="m7 21 3-6-1.5-3"/>
  <path d="m7 3 3 6h2"/>
`;

// ── SVG builders ──────────────────────────────────────────────────────────────

/**
 * Standard launcher icon: rounded-rect blue background + centered white mark.
 * The icon occupies 62.5% of the container (matches the website header ratio).
 */
function makeIconSvg(cornerRadius = 96) {
  const SIZE = 512;
  const MARGIN = SIZE * 0.1875; // 96px each side → 320px icon area
  const ICON = SIZE - MARGIN * 2; // 320px
  const SCALE = ICON / 24;        // 13.333…

  return `<svg width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${SIZE}" height="${SIZE}" rx="${cornerRadius}" fill="#2563eb"/>
  <g transform="translate(${MARGIN},${MARGIN}) scale(${SCALE})"
     stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none">
    ${PATHS}
  </g>
</svg>`;
}

/**
 * Maskable icon: full-bleed blue background (no rounded corners).
 * Icon content sits within the central 72/108 = 66.67% safe zone.
 */
function makeMaskableSvg() {
  const SIZE = 512;
  // Safe zone = 72/108 of total = 341px; leave further padding inside it
  const ICON = SIZE * 0.51;       // 261px — comfortably inside the safe zone
  const MARGIN = (SIZE - ICON) / 2;
  const SCALE = ICON / 24;

  return `<svg width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${SIZE}" height="${SIZE}" fill="#2563eb"/>
  <g transform="translate(${MARGIN},${MARGIN}) scale(${SCALE})"
     stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none">
    ${PATHS}
  </g>
</svg>`;
}

/**
 * Adaptive icon foreground: transparent background, white mark.
 * Android composites this over the background layer at runtime.
 * Keep icon within central 72/108 safe zone (with extra breathing room).
 */
function makeForegroundSvg() {
  const SIZE = 512;
  const ICON = SIZE * 0.51;
  const MARGIN = (SIZE - ICON) / 2;
  const SCALE = ICON / 24;

  return `<svg width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(${MARGIN},${MARGIN}) scale(${SCALE})"
     stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none">
    ${PATHS}
  </g>
</svg>`;
}

// ── Renderer ──────────────────────────────────────────────────────────────────

function renderPng(svgString, outputPx) {
  const resvg = new Resvg(svgString, {
    fitTo: { mode: "width", value: outputPx },
  });
  return Buffer.from(resvg.render().asPng());
}

// ── PWA icons ─────────────────────────────────────────────────────────────────

const iconSvg = makeIconSvg(96);
const maskableSvg = makeMaskableSvg();

writeFileSync(`${PUBLIC}/icon-192.png`, renderPng(iconSvg, 192));
console.log("✓ public/icon-192.png");

writeFileSync(`${PUBLIC}/icon-512.png`, renderPng(iconSvg, 512));
console.log("✓ public/icon-512.png");

writeFileSync(`${PUBLIC}/icon-maskable.png`, renderPng(maskableSvg, 512));
console.log("✓ public/icon-maskable.png");

// ── Android icons ─────────────────────────────────────────────────────────────

const fgSvg = makeForegroundSvg();

const DENSITIES = [
  { dir: "mipmap-mdpi",    launcher: 48,  fg: 108 },
  { dir: "mipmap-hdpi",    launcher: 72,  fg: 162 },
  { dir: "mipmap-xhdpi",   launcher: 96,  fg: 216 },
  { dir: "mipmap-xxhdpi",  launcher: 144, fg: 324 },
  { dir: "mipmap-xxxhdpi", launcher: 192, fg: 432 },
];

for (const { dir, launcher, fg } of DENSITIES) {
  const base = `${ANDROID_RES}/${dir}`;
  writeFileSync(`${base}/ic_launcher.png`,            renderPng(iconSvg, launcher));
  writeFileSync(`${base}/ic_launcher_round.png`,      renderPng(iconSvg, launcher));
  writeFileSync(`${base}/ic_launcher_foreground.png`, renderPng(fgSvg, fg));
  console.log(`✓ ${dir}: launcher ${launcher}px, fg ${fg}px`);
}

console.log("\nAll brand icons replaced with ThermometerSnowflake mark.");
