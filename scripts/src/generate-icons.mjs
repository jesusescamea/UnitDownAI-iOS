/**
 * Pure Node.js PWA icon generator — no external dependencies.
 * Writes icon-192.png, icon-512.png, icon-maskable.png to
 * artifacts/unitdown-ai/public/
 */

import { deflateSync } from "zlib";
import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dir, "../../artifacts/unitdown-ai/public");

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
  const len = Buffer.allocUnsafe(4);
  len.writeUInt32BE(data.length);
  const payload = Buffer.concat([t, data]);
  const crc = Buffer.allocUnsafe(4);
  crc.writeUInt32BE(crc32(payload));
  return Buffer.concat([len, payload, crc]);
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  ihdr[10] = ihdr[11] = ihdr[12] = 0;

  // Build raw scanlines (filter byte 0 = None per row)
  const raw = Buffer.allocUnsafe((1 + width * 4) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0;
    for (let x = 0; x < width; x++) {
      const src = (y * width + x) * 4;
      const dst = y * (1 + width * 4) + 1 + x * 4;
      raw[dst]     = rgba[src];
      raw[dst + 1] = rgba[src + 1];
      raw[dst + 2] = rgba[src + 2];
      raw[dst + 3] = rgba[src + 3];
    }
  }

  return Buffer.concat([
    sig,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ── Geometry helpers ───────────────────────────────────────────────────────────

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

// Distance from point to an arc (only the portion between startA and endA in radians)
function distToArc(px, py, cx, cy, r, startA, endA) {
  const angle = Math.atan2(py - cy, px - cx);
  // Normalize angle to [startA, endA] range
  const clamped = Math.max(startA, Math.min(endA, angle));
  const nearX = cx + r * Math.cos(clamped);
  const nearY = cy + r * Math.sin(clamped);
  return Math.hypot(px - nearX, py - nearY);
}

function isInsideRoundedRect(x, y, w, h, r) {
  if (x < 0 || y < 0 || x >= w || y >= h) return false;
  if (x < r && y < r) return Math.hypot(x - r, y - r) <= r;
  if (x > w - r && y < r) return Math.hypot(x - (w - r), y - r) <= r;
  if (x < r && y > h - r) return Math.hypot(x - r, y - (h - r)) <= r;
  if (x > w - r && y > h - r) return Math.hypot(x - (w - r), y - (h - r)) <= r;
  return true;
}

// ── Icon drawing ───────────────────────────────────────────────────────────────
// All coordinates in 512×512 space.

function isWhitePixel(x, y) {
  const STROKE_U = 29;         // half of 58px stroke
  const STROKE_CHEV = 23;      // half of 46px stroke

  // ── U letterform ──────────────────────────────────────────────────────────
  // Left vertical bar: from (148, 80) to (148, 310)
  const dLeft  = distToSegment(x, y, 148, 80, 148, 310);
  // Right vertical bar: from (364, 80) to (364, 310)
  const dRight = distToSegment(x, y, 364, 80, 364, 310);
  // Bottom semicircle arc: center (256, 310), radius 108, from π to 2π (bottom)
  const dArc   = distToArc(x, y, 256, 310, 108, Math.PI, 2 * Math.PI);

  const dU = Math.min(dLeft, dRight, dArc);
  if (dU <= STROKE_U) return true;

  // ── Downward chevron ──────────────────────────────────────────────────────
  // Left arm: from (200, 430) to (256, 490)
  const dChevL = distToSegment(x, y, 200, 430, 256, 490);
  // Right arm: from (256, 490) to (312, 430)
  const dChevR = distToSegment(x, y, 256, 490, 312, 430);
  if (Math.min(dChevL, dChevR) <= STROKE_CHEV) return true;

  return false;
}

function isWhitePixelMaskable(x, y) {
  // Same design scaled into 80% safe zone for maskable icon
  const STROKE_U = 24;
  const STROKE_CHEV = 19;

  const dLeft  = distToSegment(x, y, 170, 103, 170, 279);
  const dRight = distToSegment(x, y, 342, 103, 342, 279);
  const dArc   = distToArc(x, y, 256, 279, 86, Math.PI, 2 * Math.PI);
  const dU = Math.min(dLeft, dRight, dArc);
  if (dU <= STROKE_U) return true;

  const dChevL = distToSegment(x, y, 214, 367, 256, 411);
  const dChevR = distToSegment(x, y, 256, 411, 298, 367);
  if (Math.min(dChevL, dChevR) <= STROKE_CHEV) return true;

  return false;
}

// ── Render functions ───────────────────────────────────────────────────────────

// Brand blue
const BLUE_R = 37, BLUE_G = 99, BLUE_B = 235;

function renderIcon(size) {
  const scale = 512 / size;
  const rgba = new Uint8Array(size * size * 4);
  const CORNER_R = Math.round(96 / scale);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const sx = x * scale + scale / 2;
      const sy = y * scale + scale / 2;
      const i = (y * size + x) * 4;

      if (!isInsideRoundedRect(x, y, size, size, CORNER_R)) {
        // Outside rounded rect → fully transparent (white on white fallback)
        rgba[i] = 255; rgba[i+1] = 255; rgba[i+2] = 255; rgba[i+3] = 0;
        continue;
      }
      if (isWhitePixel(sx, sy)) {
        rgba[i] = 255; rgba[i+1] = 255; rgba[i+2] = 255; rgba[i+3] = 255;
      } else {
        rgba[i] = BLUE_R; rgba[i+1] = BLUE_G; rgba[i+2] = BLUE_B; rgba[i+3] = 255;
      }
    }
  }
  return rgba;
}

function renderMaskable(size) {
  const scale = 512 / size;
  const rgba = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const sx = x * scale + scale / 2;
      const sy = y * scale + scale / 2;
      const i = (y * size + x) * 4;

      // Full-bleed blue background (no rounded corners)
      if (isWhitePixelMaskable(sx, sy)) {
        rgba[i] = 255; rgba[i+1] = 255; rgba[i+2] = 255; rgba[i+3] = 255;
      } else {
        rgba[i] = BLUE_R; rgba[i+1] = BLUE_G; rgba[i+2] = BLUE_B; rgba[i+3] = 255;
      }
    }
  }
  return rgba;
}

// ── Generate all icons ─────────────────────────────────────────────────────────

console.log("Generating icon-192.png...");
writeFileSync(`${OUT}/icon-192.png`, encodePNG(192, 192, renderIcon(192)));
console.log("Generating icon-512.png...");
writeFileSync(`${OUT}/icon-512.png`, encodePNG(512, 512, renderIcon(512)));
console.log("Generating icon-maskable.png...");
writeFileSync(`${OUT}/icon-maskable.png`, encodePNG(512, 512, renderMaskable(512)));
console.log("Done. Icons written to", OUT);
