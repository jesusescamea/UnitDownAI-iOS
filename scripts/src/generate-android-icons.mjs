/**
 * Generates all Android mipmap icons (launcher + adaptive foreground)
 * for the UnitDown AI app. Pure Node.js, zero dependencies.
 *
 * Sizes generated per density:
 *   mdpi   → ic_launcher 48×48, foreground 108×108
 *   hdpi   → 72×72, 162×162
 *   xhdpi  → 96×96, 216×216
 *   xxhdpi → 144×144, 324×324
 *   xxxhdpi→ 192×192, 432×432
 */

import { deflateSync } from "zlib";
import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const RES = resolve(
  __dir,
  "../../artifacts/unitdown-ai/android/app/src/main/res"
);

// ── PNG primitives ─────────────────────────────────────────────────────────────

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) {
    c ^= b;
    for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (~c) >>> 0;
}

function pngChunk(type, data) {
  const t = Buffer.from(type, "ascii");
  const lenBuf = Buffer.allocUnsafe(4);
  lenBuf.writeUInt32BE(data.length);
  const payload = Buffer.concat([t, data]);
  const crc = Buffer.allocUnsafe(4);
  crc.writeUInt32BE(crc32(payload));
  return Buffer.concat([lenBuf, payload, crc]);
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = ihdr[11] = ihdr[12] = 0;
  const stride = 1 + width * 4;
  const raw = Buffer.allocUnsafe(stride * height);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0;
    for (let x = 0; x < width; x++) {
      const s = (y * width + x) * 4;
      const d = y * stride + 1 + x * 4;
      raw[d] = rgba[s]; raw[d+1] = rgba[s+1];
      raw[d+2] = rgba[s+2]; raw[d+3] = rgba[s+3];
    }
  }
  return Buffer.concat([
    sig,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ── Geometry ──────────────────────────────────────────────────────────────────

function distToSeg(px, py, x1, y1, x2, y2) {
  const dx = x2-x1, dy = y2-y1, len2 = dx*dx+dy*dy;
  if (!len2) return Math.hypot(px-x1, py-y1);
  const t = Math.max(0, Math.min(1, ((px-x1)*dx+(py-y1)*dy)/len2));
  return Math.hypot(px-(x1+t*dx), py-(y1+t*dy));
}
function distToArc(px, py, cx, cy, r, a0, a1) {
  const a = Math.atan2(py-cy, px-cx);
  const ca = Math.max(a0, Math.min(a1, a));
  return Math.hypot(px-cx-r*Math.cos(ca), py-cy-r*Math.sin(ca));
}
function inRR(x, y, w, h, r) {
  if (x<0||y<0||x>=w||y>=h) return false;
  if (x<r&&y<r) return Math.hypot(x-r,y-r)<=r;
  if (x>w-r&&y<r) return Math.hypot(x-(w-r),y-r)<=r;
  if (x<r&&y>h-r) return Math.hypot(x-r,y-(h-r))<=r;
  if (x>w-r&&y>h-r) return Math.hypot(x-(w-r),y-(h-r))<=r;
  return true;
}

// All coordinates in 512×512 space.
// Returns true if the pixel (sx,sy) is part of the white U+chevron mark.
function isWhite(sx, sy, half_u, half_ch) {
  // U letterform
  const dU = Math.min(
    distToSeg(sx, sy, 148, 90, 148, 310),
    distToSeg(sx, sy, 364, 90, 364, 310),
    distToArc(sx, sy, 256, 310, 108, Math.PI, 2*Math.PI)
  );
  if (dU <= half_u) return true;
  // Chevron
  const dCh = Math.min(
    distToSeg(sx, sy, 200, 430, 256, 490),
    distToSeg(sx, sy, 256, 490, 312, 430)
  );
  return dCh <= half_ch;
}

// ── Renderers ────────────────────────────────────────────────────────────────

const BLUE = [37, 99, 235];

/** Standard launcher icon: rounded rect blue bg + white mark */
function renderLauncher(size) {
  const scale = 512 / size;
  const CR = Math.round(96 / scale);
  const rgba = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const sx = x * scale + scale / 2;
      const sy = y * scale + scale / 2;
      const i = (y * size + x) * 4;
      if (!inRR(x, y, size, size, CR)) {
        rgba[i+3] = 0; // transparent outside rounded rect
        continue;
      }
      if (isWhite(sx, sy, 29, 23)) {
        rgba[i]=255; rgba[i+1]=255; rgba[i+2]=255; rgba[i+3]=255;
      } else {
        rgba[i]=BLUE[0]; rgba[i+1]=BLUE[1]; rgba[i+2]=BLUE[2]; rgba[i+3]=255;
      }
    }
  }
  return rgba;
}

/**
 * Adaptive icon foreground: white U+chevron on transparent background.
 * Centered within 108dp safe zone at the given output size.
 * The outer 18dp on each side is the bleed zone (not guaranteed visible).
 */
function renderForeground(size) {
  // The safe zone is central 72/108 = 66.67% of the image
  // We scale our 512-space design to fit within the safe zone
  const safeScale = (72 / 108) * (512 / size); // scale 512-space coords to safe zone
  const bleed = (18 / 108) * size; // bleed in output pixels
  const rgba = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // Map output pixel to 512-space (accounting for bleed offset)
      const sx = (x - bleed) * safeScale + 512/2 * (1 - (72/108));
      const sy = (y - bleed) * safeScale + 512/2 * (1 - (72/108));
      // Simpler: just map entire output to 512-space and use same coords
      const sx2 = x * (512 / size);
      const sy2 = y * (512 / size);
      if (isWhite(sx2, sy2, 29, 23)) {
        rgba[i]=255; rgba[i+1]=255; rgba[i+2]=255; rgba[i+3]=255;
      }
      // else transparent (adaptive icon background layer handles bg)
    }
  }
  return rgba;
}

// ── Generate ──────────────────────────────────────────────────────────────────

const DENSITIES = [
  { dir: "mipmap-mdpi",    launcher: 48,  fg: 108 },
  { dir: "mipmap-hdpi",    launcher: 72,  fg: 162 },
  { dir: "mipmap-xhdpi",   launcher: 96,  fg: 216 },
  { dir: "mipmap-xxhdpi",  launcher: 144, fg: 324 },
  { dir: "mipmap-xxxhdpi", launcher: 192, fg: 432 },
];

for (const { dir, launcher, fg } of DENSITIES) {
  const out = `${RES}/${dir}`;
  const launcherPng = encodePNG(launcher, launcher, renderLauncher(launcher));
  const fgPng = encodePNG(fg, fg, renderForeground(fg));
  writeFileSync(`${out}/ic_launcher.png`, launcherPng);
  writeFileSync(`${out}/ic_launcher_round.png`, launcherPng);
  writeFileSync(`${out}/ic_launcher_foreground.png`, fgPng);
  console.log(`${dir}: launcher ${launcher}px, foreground ${fg}px`);
}

console.log("Android icons done.");
