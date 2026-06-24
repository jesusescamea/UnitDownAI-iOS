import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { X, Camera, Loader2, Upload, Pencil } from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────
const ANALYSIS_W      = 160;     // analysis canvas width (px)
const ANALYSIS_SKIP   = 6;       // analyse every 6th RAF frame ≈ 10 fps
const STABLE_MS       = 500;     // wall-clock ms of continuous stability required (was 1000)
const MOVE_MAD_THRESH = 18;      // mean-abs-diff in gray levels that counts as "moving" (was 10)
const HINT_MS         = 30_000;  // show hint after 30 s; scanner keeps running

// Image-quality thresholds
const BRIGHT_MIN  = 50;
const BRIGHT_MAX  = 215;
const GLARE_MAX   = 0.10;
const SHARP_MIN   = 40;
const EDGE_MIN    = 0.07;
const EDGE_CLOSER = 0.04;
const EDGE_THRESH = 20;

// Nameplate-pattern thresholds
const BAND_COUNT      = 10;
const BAND_EDGE_FLOOR = 0.05;
const BANDS_NEEDED    = 4;
const SPAN_NEEDED     = 5;

// Progress ring geometry
const RING_R       = 28;
const RING_CIRCUMF = 2 * Math.PI * RING_R;

// Readability thresholds
const COVERAGE_MIN    = 0.40;              // plate must fill ≥ 40 % of guide frame height
const TEXT_HEIGHT_MIN = 4;                 // min estimated char height in analysis canvas px (≈30 px in capture)
const SKEW_MAX_DEG    = 15;               // max tilt angle before "Straighten camera"
const OCR_CONF_MIN    = 50;               // min heuristic OCR confidence score (0–100)
const CAPTURE_SCALE   = 1200 / ANALYSIS_W; // ≈7.5× — convert analysis-canvas px → capture-image px

// ─── Types ────────────────────────────────────────────────────────────────────
type Phase = "scanning" | "capturing" | "manual";

type Guidance =
  | "too_dark"
  | "glare"
  | "overexposed"
  | "find_plate"      // nothing / wrong object in frame
  | "move_closer"     // something present but too far / text too small
  | "center_plate"    // plate partially visible — needs centering
  | "too_blurry"
  | "straighten"      // skew angle too high
  | "unreadable"      // nameplate found but text not legible enough — move closer
  | "good";           // nameplate detected + readable + quality OK

interface FrameResult {
  qualifies:            boolean;
  guidance:             Guidance;
  edgeDensity:          number;
  nameplateDetected:    boolean;
  readabilityDetected:  boolean;
  gray?:                Uint8ClampedArray; // for movement detection between frames
}

interface Guide { x: number; y: number; w: number; h: number }

interface Props {
  onCapture: (blob: Blob, previewUrl: string) => void;
  onClose:   () => void;
}

// ─── Guidance → display maps ──────────────────────────────────────────────────
const INSTRUCTION: Record<Guidance, string> = {
  too_dark:    "Use more light",
  glare:       "Reduce glare",
  overexposed: "Reduce glare",
  find_plate:  "Center nameplate",
  move_closer: "Move closer",
  center_plate:"Center nameplate",
  too_blurry:  "Hold steady",
  straighten:  "Straighten camera",
  unreadable:  "Move closer — text must be visible",
  good:        "Nameplate detected",
};

const GUIDE_CLR: Record<Guidance, string> = {
  too_dark:    "rgba(239,68,68,0.80)",
  glare:       "rgba(239,68,68,0.80)",
  overexposed: "rgba(239,68,68,0.80)",
  find_plate:  "rgba(245,158,11,0.80)",
  move_closer: "rgba(245,158,11,0.80)",
  center_plate:"rgba(245,158,11,0.80)",
  too_blurry:  "rgba(239,68,68,0.80)",
  straighten:  "rgba(245,158,11,0.80)",
  unreadable:  "rgba(245,158,11,0.80)",
  good:        "rgba(59,130,246,0.85)",
};

const TEXT_CLR: Record<Guidance, string> = {
  too_dark:    "#fca5a5",
  glare:       "#fca5a5",
  overexposed: "#fca5a5",
  find_plate:  "#fcd34d",
  move_closer: "#fcd34d",
  center_plate:"#fcd34d",
  too_blurry:  "#fca5a5",
  straighten:  "#fcd34d",
  unreadable:  "#fcd34d",
  good:        "#93c5fd",
};

// ─── Movement detection ────────────────────────────────────────────────────────
// Mean absolute difference between two gray frames.
// Returns a value in [0, 255]; anything above MOVE_MAD_THRESH means the camera moved.
function frameMad(a: Uint8ClampedArray, b: Uint8ClampedArray): number {
  const len = Math.min(a.length, b.length);
  if (len === 0) return 0;
  let sum = 0;
  for (let i = 0; i < len; i++) sum += Math.abs(a[i] - b[i]);
  return sum / len;
}

// ─── Nameplate pattern detection ──────────────────────────────────────────────
// Divides the gray frame into BAND_COUNT horizontal bands and marks each band
// "active" when it contains enough horizontal edges (top/bottom of text strokes).
// Returns detected, activeCount, span, firstIdx, and bandH for readability estimation.
function detectNameplateBands(
  gray: Uint8ClampedArray,
  W:    number,
  H:    number,
): { detected: boolean; activeCount: number; span: number; firstIdx: number; bandH: number } {
  const bandH      = Math.max(2, Math.floor(H / BAND_COUNT));
  const activeMask = new Array<boolean>(BAND_COUNT).fill(false);

  for (let b = 0; b < BAND_COUNT; b++) {
    const rStart = Math.max(1, b * bandH);
    const rEnd   = Math.min((b + 1) * bandH, H - 1);
    if (rEnd <= rStart) continue;

    let edgePx = 0, total = 0;
    for (let row = rStart; row < rEnd; row++) {
      for (let col = 1; col < W - 1; col++) {
        if (Math.abs(gray[(row + 1) * W + col] - gray[(row - 1) * W + col]) > 18) edgePx++;
        total++;
      }
    }
    activeMask[b] = total > 0 && edgePx / total > BAND_EDGE_FLOOR;
  }

  const activeCount = activeMask.filter(Boolean).length;
  if (activeCount === 0) return { detected: false, activeCount: 0, span: 0, firstIdx: 0, bandH };

  const firstIdx = activeMask.findIndex(Boolean);
  const lastIdx  = activeMask.lastIndexOf(true);
  const span     = lastIdx - firstIdx + 1;
  const detected = activeCount >= BANDS_NEEDED && span >= SPAN_NEEDED;
  return { detected, activeCount, span, firstIdx, bandH };
}

// ─── Readability estimation ────────────────────────────────────────────────────
// Called only after the nameplate band gate passes (nameplateDetected = true).
// Estimates whether the text in the active region is large enough, straight enough,
// and clear enough for OCR to succeed.
//
// Metrics:
//   coverage    — fraction of guide frame height occupied by the active band region
//   textCharH   — estimated character height in analysis-canvas pixels
//   skewDeg     — tilt angle derived from top-half vs bottom-half edge centroid shift
//   charDensity — Sobel edge density inside the active region (text pixel richness)
//   ocrConfidence — weighted heuristic (0–100)
//
// Returns a guidance string if the check fails, null if everything passes.
interface ReadabilityResult {
  readable:      boolean;
  guidance:      Guidance | null;
  textCharH:     number;    // analysis-canvas px
  coveragePct:   number;    // 0–1
  skewDeg:       number;    // absolute degrees
  charDensity:   number;
  ocrConfidence: number;    // 0–100
}

function estimateReadability(
  gray:        Uint8ClampedArray,
  W:           number,
  H:           number,
  bandH:       number,
  activeCount: number,
  span:        number,
  firstIdx:    number,
  sharpness:   number,
): ReadabilityResult {
  const FAIL = (g: Guidance, rest: Partial<ReadabilityResult> = {}): ReadabilityResult =>
    ({ readable: false, guidance: g, textCharH: 0, coveragePct: 0, skewDeg: 0, charDensity: 0, ocrConfidence: 0, ...rest });

  // 1. Frame coverage — does the plate fill enough of the guide frame?
  const coveragePct = span / BAND_COUNT;
  if (coveragePct < COVERAGE_MIN) return FAIL("move_closer", { coveragePct });

  // 2. Estimated character height
  //    Active region spans (span × bandH) canvas-pixels vertically, containing activeCount text rows.
  //    Characters are roughly 60 % of row pitch.
  const textRowH  = (span * bandH) / Math.max(1, activeCount);
  const textCharH = textRowH * 0.6;
  if (textCharH < TEXT_HEIGHT_MIN) return FAIL("move_closer", { textCharH, coveragePct });

  // 3. Skew estimation
  //    Split the active region into top and bottom halves.
  //    Compute the horizontal centre-of-mass of horizontal edges in each half.
  //    The centroid shift per half-height gives the tilt angle.
  const activeStart = firstIdx * bandH;
  const activeEnd   = Math.min((firstIdx + span) * bandH, H - 1);
  const midY        = (activeStart + activeEnd) / 2;

  let topSumX = 0, topN = 0, botSumX = 0, botN = 0;
  for (let row = Math.max(1, activeStart); row < Math.min(activeEnd, H - 1); row++) {
    for (let col = 0; col < W; col++) {
      const gy = Math.abs(gray[(row + 1) * W + col] - gray[(row - 1) * W + col]);
      if (gy > 18) {
        if (row < midY) { topSumX += col; topN++; }
        else             { botSumX += col; botN++; }
      }
    }
  }
  let skewDeg = 0;
  if (topN >= 5 && botN >= 5) {
    const topCx  = topSumX / topN;
    const botCx  = botSumX / botN;
    const halfH  = (activeEnd - activeStart) / 2;
    skewDeg = Math.abs(Math.atan2(botCx - topCx, halfH) * (180 / Math.PI));
  }
  if (skewDeg > SKEW_MAX_DEG) return FAIL("straighten", { textCharH, coveragePct, skewDeg });

  // 4. Character density — Sobel edge density within the active region
  let activeEdge = 0, activeTotal = 0;
  for (let row = Math.max(1, activeStart); row < Math.min(activeEnd, H - 1); row++) {
    for (let col = 1; col < W - 1; col++) {
      const gx =
        (gray[(row-1)*W+(col+1)] + 2*gray[row*W+(col+1)] + gray[(row+1)*W+(col+1)]) -
        (gray[(row-1)*W+(col-1)] + 2*gray[row*W+(col-1)] + gray[(row+1)*W+(col-1)]);
      const gy =
        (gray[(row+1)*W+(col-1)] + 2*gray[(row+1)*W+col] + gray[(row+1)*W+(col+1)]) -
        (gray[(row-1)*W+(col-1)] + 2*gray[(row-1)*W+col] + gray[(row-1)*W+(col+1)]);
      if (Math.abs(gx) + Math.abs(gy) > EDGE_THRESH) activeEdge++;
      activeTotal++;
    }
  }
  const charDensity = activeTotal > 0 ? activeEdge / activeTotal : 0;

  // 5. Heuristic OCR confidence (0–100)
  //    Weights: text height 40 %, character density 35 %, sharpness 25 %
  //    Each component saturates at a "good" reference value.
  const heightScore  = Math.min(1, textCharH / 8) * 40;
  const densityScore = Math.min(1, charDensity / 0.15) * 35;
  const sharpScore   = Math.min(1, sharpness / 200) * 25;
  const ocrConfidence = Math.min(100, Math.round(heightScore + densityScore + sharpScore));

  if (ocrConfidence < OCR_CONF_MIN) {
    return FAIL("unreadable", { textCharH, coveragePct, skewDeg, charDensity, ocrConfidence });
  }

  return { readable: true, guidance: null, textCharH, coveragePct, skewDeg, charDensity, ocrConfidence };
}

// ─── Frame quality + nameplate analysis ───────────────────────────────────────
// Runs five independent checks: brightness, glare, sharpness (Laplacian),
// edge density (Sobel), and nameplate-band pattern.
// Returns the gray array so the caller can compare consecutive frames for movement.
function analyzeFrame(
  video:  HTMLVideoElement,
  canvas: HTMLCanvasElement,
  guide:  Guide,
): FrameResult {
  const vW = video.videoWidth,  vH = video.videoHeight;
  const dW = video.clientWidth, dH = video.clientHeight;

  const FAIL = (g: Guidance): FrameResult =>
    ({ qualifies: false, guidance: g, edgeDensity: 0, nameplateDetected: false, readabilityDetected: false });

  if (!vW || !vH) return FAIL("find_plate");

  const scale = Math.max(dW / vW, dH / vH);
  const ox    = (dW - vW * scale) / 2;
  const oy    = (dH - vH * scale) / 2;
  const sx    = Math.max(0, (guide.x - ox) / scale);
  const sy    = Math.max(0, (guide.y - oy) / scale);
  const sw    = Math.min(guide.w / scale, vW - sx);
  const sh    = Math.min(guide.h / scale, vH - sy);

  const aH = Math.max(1, Math.round(ANALYSIS_W * (sh / sw)));
  canvas.width  = ANALYSIS_W;
  canvas.height = aH;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return FAIL("find_plate");
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, ANALYSIS_W, aH);

  const { data } = ctx.getImageData(0, 0, ANALYSIS_W, aH);
  const total = ANALYSIS_W * aH;
  const W     = ANALYSIS_W;
  const H     = aH;

  // ── Pass 1: luminance, brightness, glare ─────────────────────────────────
  const gray       = new Uint8ClampedArray(total);
  let   brightSum  = 0;
  let   glareCount = 0;

  for (let i = 0; i < total; i++) {
    const lum = (data[i * 4] * 77 + data[i * 4 + 1] * 150 + data[i * 4 + 2] * 29) >> 8;
    gray[i]    = lum;
    brightSum  += lum;
    if (data[i * 4] > 248 && data[i * 4 + 1] > 248 && data[i * 4 + 2] > 248) glareCount++;
  }

  const brightness = brightSum / total;
  const glareRatio = glareCount / total;

  // ── Pass 2: Laplacian variance (sharpness) + Sobel edge density ──────────
  let lapSum = 0, lapSumSq = 0, edgePx = 0, n = 0;

  for (let row = 1; row < H - 1; row++) {
    for (let col = 1; col < W - 1; col++) {
      const idx = row * W + col;
      const lap =
        -4 * gray[idx]
        + gray[(row - 1) * W + col]
        + gray[(row + 1) * W + col]
        + gray[row * W + (col - 1)]
        + gray[row * W + (col + 1)];
      lapSum   += lap;
      lapSumSq += lap * lap;

      const gx =
        (gray[(row-1)*W+(col+1)] + 2*gray[row*W+(col+1)] + gray[(row+1)*W+(col+1)]) -
        (gray[(row-1)*W+(col-1)] + 2*gray[row*W+(col-1)] + gray[(row+1)*W+(col-1)]);
      const gy =
        (gray[(row+1)*W+(col-1)] + 2*gray[(row+1)*W+col] + gray[(row+1)*W+(col+1)]) -
        (gray[(row-1)*W+(col-1)] + 2*gray[(row-1)*W+col] + gray[(row-1)*W+(col+1)]);
      if (Math.abs(gx) + Math.abs(gy) > EDGE_THRESH) edgePx++;
      n++;
    }
  }

  const lapMean     = lapSum / (n || 1);
  const sharpness   = n > 0 ? lapSumSq / n - lapMean * lapMean : 0;
  const edgeDensity = n > 0 ? edgePx / n : 0;

  // ── Quality gate ─────────────────────────────────────────────────────────
  if (brightness  < BRIGHT_MIN)  return { qualifies: false, guidance: "too_dark",    edgeDensity, nameplateDetected: false, readabilityDetected: false, gray };
  if (glareRatio  > GLARE_MAX)   return { qualifies: false, guidance: "glare",       edgeDensity, nameplateDetected: false, readabilityDetected: false, gray };
  if (brightness  > BRIGHT_MAX)  return { qualifies: false, guidance: "overexposed", edgeDensity, nameplateDetected: false, readabilityDetected: false, gray };
  if (edgeDensity < EDGE_CLOSER) return { qualifies: false, guidance: "find_plate",  edgeDensity, nameplateDetected: false, readabilityDetected: false };
  if (edgeDensity < EDGE_MIN)    return { qualifies: false, guidance: "move_closer", edgeDensity, nameplateDetected: false, readabilityDetected: false, gray };
  if (sharpness   < SHARP_MIN)   return { qualifies: false, guidance: "too_blurry",  edgeDensity, nameplateDetected: false, readabilityDetected: false, gray };

  // ── Nameplate band gate ───────────────────────────────────────────────────
  const { detected, activeCount, span, firstIdx, bandH } = detectNameplateBands(gray, W, H);
  if (!detected) {
    const guidance: Guidance = activeCount >= 2 ? "center_plate" : "find_plate";
    return { qualifies: false, guidance, edgeDensity, nameplateDetected: false, readabilityDetected: false, gray };
  }

  // ── Readability gate ──────────────────────────────────────────────────────
  // Nameplate pattern is confirmed. Now estimate whether the text is large enough,
  // straight enough, and clear enough for OCR to succeed reliably.
  const readability = estimateReadability(gray, W, H, bandH, activeCount, span, firstIdx, sharpness);

  console.log(
    `[Scanner] Readability: charH=${readability.textCharH.toFixed(1)}px(≈${(readability.textCharH * CAPTURE_SCALE).toFixed(0)}px capture)` +
    ` cov=${(readability.coveragePct * 100).toFixed(0)}%` +
    ` skew=${readability.skewDeg.toFixed(1)}°` +
    ` density=${readability.charDensity.toFixed(3)}` +
    ` ocrConf=${readability.ocrConfidence}` +
    ` → ${readability.readable ? "PASS" : "FAIL:" + readability.guidance}`
  );

  if (!readability.readable) {
    return {
      qualifies:           false,
      guidance:            readability.guidance!,
      edgeDensity,
      nameplateDetected:   true,   // plate IS there — readability blocks capture
      readabilityDetected: false,
      gray,
    };
  }

  return { qualifies: true, guidance: "good", edgeDensity, nameplateDetected: true, readabilityDetected: true, gray };
}

// ─── Image preprocessing for OCR ──────────────────────────────────────────────
// Applies adaptive contrast boost + 3×3 unsharp-mask sharpening in-place.
// Run after drawImage() and before toBlob() to improve legibility of faded,
// glare-washed, or low-contrast nameplates before sending to the OCR API.
function preprocessForOCR(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  if (w < 2 || h < 2) return;
  const raw = ctx.getImageData(0, 0, w, h);
  const src = new Uint8ClampedArray(raw.data); // snapshot of original pixels
  const n   = w * h;

  // Compute mean luminance to choose adaptive contrast factor
  let lumSum = 0;
  for (let i = 0; i < n; i++) lumSum += (src[i * 4] * 77 + src[i * 4 + 1] * 150 + src[i * 4 + 2] * 29) >> 8;
  const meanLum = lumSum / n;
  // More aggressive boost when image is dark or washed-out
  const cf = (meanLum < 90 || meanLum > 185) ? 1.45 : 1.30;

  // Pass 1: contrast boost → intermediate buffer
  const contrast = new Uint8ClampedArray(src.length);
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    contrast[o]     = Math.min(255, Math.max(0, Math.round((src[o]     - 128) * cf + 128)));
    contrast[o + 1] = Math.min(255, Math.max(0, Math.round((src[o + 1] - 128) * cf + 128)));
    contrast[o + 2] = Math.min(255, Math.max(0, Math.round((src[o + 2] - 128) * cf + 128)));
    contrast[o + 3] = 255;
  }

  // Pass 2: unsharp-mask kernel [0,−1,0; −1,5,−1; 0,−1,0] — reads contrast[], writes raw.data
  const d = raw.data;
  d.set(contrast); // pre-fill edges with contrast-boosted values
  for (let row = 1; row < h - 1; row++) {
    for (let col = 1; col < w - 1; col++) {
      const i = (row * w + col) * 4;
      for (let c = 0; c < 3; c++) {
        d[i + c] = Math.min(255, Math.max(0,
          5 * contrast[i + c]
          - contrast[((row - 1) * w + col) * 4 + c]
          - contrast[((row + 1) * w + col) * 4 + c]
          - contrast[(row * w + col - 1)    * 4 + c]
          - contrast[(row * w + col + 1)    * 4 + c],
        ));
      }
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(raw, 0, 0);
}

// ─── Capture helpers ──────────────────────────────────────────────────────────
function getCropCoords(video: HTMLVideoElement, guide: Guide) {
  const vW = video.videoWidth,  vH = video.videoHeight;
  const dW = video.clientWidth, dH = video.clientHeight;
  if (!vW || !vH) return { x: 0, y: 0, w: vW, h: vH };
  const scale = Math.max(dW / vW, dH / vH);
  const ox = (dW - vW * scale) / 2;
  const oy = (dH - vH * scale) / 2;
  const x  = Math.max(0, (guide.x - ox) / scale);
  const y  = Math.max(0, (guide.y - oy) / scale);
  return { x, y, w: Math.min(guide.w / scale, vW - x), h: Math.min(guide.h / scale, vH - y) };
}

async function captureFrame(
  video:       HTMLVideoElement,
  guide:       Guide,
  maxPx      = 1600,
  quality    = 0.85,
  cropToGuide = true,
): Promise<{ blob: Blob; previewUrl: string }> {
  const cvs = document.createElement("canvas");
  const ctx  = cvs.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  if (cropToGuide) {
    // Auto-scan: crop tightly to the guide box for highest nameplate pixel density
    const { x, y, w, h } = getCropCoords(video, guide);
    const s = Math.min(1, maxPx / Math.max(w, h));
    cvs.width  = Math.max(1, Math.round(w * s));
    cvs.height = Math.max(1, Math.round(h * s));
    ctx.drawImage(video, x, y, w, h, 0, 0, cvs.width, cvs.height);
  } else {
    // Manual shot: capture the full frame so the tech's own framing is used as-is
    const vW = video.videoWidth  || 1;
    const vH = video.videoHeight || 1;
    const s  = Math.min(1, maxPx / Math.max(vW, vH));
    cvs.width  = Math.max(1, Math.round(vW * s));
    cvs.height = Math.max(1, Math.round(vH * s));
    ctx.drawImage(video, 0, 0, vW, vH, 0, 0, cvs.width, cvs.height);
  }

  preprocessForOCR(ctx, cvs.width, cvs.height);

  return new Promise((resolve, reject) => {
    cvs.toBlob(
      (blob) => blob
        ? resolve({ blob, previewUrl: URL.createObjectURL(blob) })
        : reject(new Error("Capture failed")),
      "image/jpeg",
      quality,
    );
  });
}

async function resizeFile(
  file:    File,
  maxPx  = 1600,
  quality = 0.85,
): Promise<{ blob: Blob; previewUrl: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const s = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width  * s));
      const h = Math.max(1, Math.round(img.height * s));
      const cvs = document.createElement("canvas");
      cvs.width = w; cvs.height = h;
      const ctx = cvs.getContext("2d");
      if (!ctx) { reject(new Error("Canvas unavailable")); return; }
      ctx.drawImage(img, 0, 0, w, h);
      preprocessForOCR(ctx, w, h);
      cvs.toBlob(
        (blob) => blob
          ? resolve({ blob, previewUrl: URL.createObjectURL(blob) })
          : reject(new Error("Resize failed")),
        "image/jpeg",
        quality,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image load failed")); };
    img.src = url;
  });
}

// ─── Component ────────────────────────────────────────────────────────────────
const CORNER = 22;

export default function NameplateScannerModal({ onCapture, onClose }: Props) {
  const videoRef          = useRef<HTMLVideoElement>(null);
  const streamRef         = useRef<MediaStream | null>(null);
  const containerRef      = useRef<HTMLDivElement>(null);
  const analysisCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef      = useRef<HTMLInputElement>(null);
  const rafIdRef          = useRef<number | null>(null);

  // Refs for RAF loop (avoid stale closures)
  const phaseRef        = useRef<Phase>("scanning");
  const isCapturingRef  = useRef(false);                      // duplicate-capture lock
  const stableStartRef  = useRef<number | null>(null);        // wall-clock when stability began
  const prevGrayRef     = useRef<Uint8ClampedArray | null>(null); // previous frame's gray data
  const frameCountRef   = useRef(0);
  const startTimeRef    = useRef(Date.now());
  const guideRef        = useRef<Guide | null>(null);
  const showHintRef     = useRef(false);

  // React state (drives UI redraws)
  const [phaseState,     setPhaseState]     = useState<Phase>("scanning");
  const [guidance,       setGuidance]       = useState<Guidance>("find_plate");
  const [instruction,    setInstruction]    = useState("Find the equipment data plate");
  const [stableProgress, setStableProgress] = useState(0);
  const [showHint,       setShowHint]       = useState(false);
  const [cameraError,    setCameraError]    = useState<string | null>(null);
  const [containerSize,  setContainerSize]  = useState({ w: 0, h: 0 });
  const [isLandscape,    setIsLandscape]    = useState(() => typeof window !== "undefined" && window.innerWidth > window.innerHeight);

  const setPhase = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  }, []);

  // Off-screen analysis canvas (created once)
  useEffect(() => { analysisCanvasRef.current = document.createElement("canvas"); }, []);

  // Track container size for guide computation
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const sync = () => setContainerSize({ w: el.clientWidth, h: el.clientHeight });
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Track orientation so we can switch between bottom-bar (portrait) and
  // right-sidebar (landscape) button layouts without relying on CSS media queries,
  // which don't fire fast enough during device rotation inside a fixed overlay.
  useEffect(() => {
    const update = () => setIsLandscape(window.innerWidth > window.innerHeight);
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  // Guide frame — adapts to container orientation:
  //   Portrait  (h ≥ w): vertical 3:4 box — taller than wide — to frame tall data plates
  //   Landscape (w > h): compact centred block (42 % wide × 62 % tall) instead of a
  //                      wall-to-wall strip that doesn't fit horizontal nameplates well
  //
  // Instruction text is anchored to guide.y + guide.h so it always sits directly
  // below the bottom edge of the box in both orientations — no extra changes needed there.
  const guide = useMemo<Guide | null>(() => {
    const { w, h } = containerSize;
    if (!w || !h) return null;

    const isPortrait = h >= w;

    let gW: number, gH: number;
    if (isPortrait) {
      // Portrait: tall vertical rectangle occupying ~3/4 of the camera area.
      // Width = 63 % of container; height up to 76 % of container, capped at 2.1× width
      // so it stays a proper tall rectangle and never becomes an extreme sliver.
      gW = Math.round(w * 0.63);
      gH = Math.min(Math.round(h * 0.76), Math.round(gW * 2.1));
    } else {
      // Landscape: wide box covering ~2/3 of camera area.
      // Width = 74 % of container; height up to 84 % of container, capped at 0.75× width
      // so the box stays naturally wider-than-tall in landscape orientation.
      gW = Math.round(w * 0.74);
      gH = Math.min(Math.round(h * 0.84), Math.round(gW * 0.75));
    }

    return {
      x: Math.round((w - gW) / 2),
      // Portrait: nudge 5 % above true centre for comfortable one-handed framing
      // Landscape: true centre (less vertical room to spare)
      y: Math.round((h - gH) / 2) - (isPortrait ? Math.round(h * 0.05) : 0),
      w: gW,
      h: gH,
    };
  }, [containerSize]);

  useEffect(() => { guideRef.current = guide; }, [guide]);

  // Start rear camera
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (!active) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch (err: any) {
        if (!active) return;
        const msg =
          err?.name === "NotAllowedError" ? "Camera access denied. Allow camera access in your browser settings and try again." :
          err?.name === "NotFoundError"   ? "No camera found on this device." :
                                            "Camera unavailable on this device.";
        setCameraError(msg);
        setPhase("manual");
      }
    })();
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [setPhase]);

  // Lock body scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // ─── Auto-capture RAF loop ─────────────────────────────────────────────────
  // Stability is measured in wall-clock time, not frame count, so device
  // performance variation does not affect the required hold duration.
  //
  // Capture requires ALL of:
  //   1. quality checks pass (brightness, glare, sharpness, edge density)
  //   2. nameplate band pattern detected
  //   3. camera is not moving (frame-to-frame MAD ≤ MOVE_MAD_THRESH)
  //   4. all of the above have held continuously for ≥ STABLE_MS (1 second)
  //
  // Any single failure resets the stability timer back to zero.
  useEffect(() => {
    startTimeRef.current = Date.now();

    function loop() {
      if (phaseRef.current !== "scanning") return;

      rafIdRef.current = requestAnimationFrame(loop);
      frameCountRef.current++;
      if (frameCountRef.current % ANALYSIS_SKIP !== 0) return;

      // Show 30-second hint — loop keeps running
      if (!showHintRef.current && Date.now() - startTimeRef.current > HINT_MS) {
        showHintRef.current = true;
        setShowHint(true);
        console.log("[Scanner] 30s elapsed — showing manual fallback hint");
      }

      const video   = videoRef.current;
      const aCanvas = analysisCanvasRef.current;
      const g       = guideRef.current;

      if (!video || video.readyState < 2 || !aCanvas || !g) {
        setGuidance("find_plate");
        setInstruction(INSTRUCTION.find_plate);
        return;
      }

      const { qualifies, guidance: gState, gray } = analyzeFrame(video, aCanvas, g);

      if (qualifies && gray) {
        // ── Movement check ─────────────────────────────────────────────────
        let isMoving = false;
        if (prevGrayRef.current && prevGrayRef.current.length === gray.length) {
          const mad = frameMad(prevGrayRef.current, gray);
          if (mad > MOVE_MAD_THRESH) {
            isMoving = true;
            if (stableStartRef.current !== null) {
              console.log(`[Scanner] Movement detected (MAD=${mad.toFixed(1)}) — resetting stability timer`);
            }
          }
        }
        prevGrayRef.current = gray;

        if (isMoving) {
          // Camera still settling — reset timer but plate is still detected
          stableStartRef.current = null;
          setStableProgress(0);
          setGuidance("good");
          setInstruction("Nameplate detected");
          return;
        }

        // ── Stability accumulation ──────────────────────────────────────────
        const now = Date.now();
        if (stableStartRef.current === null) {
          stableStartRef.current = now;
          console.log("[Scanner] Nameplate detected + camera stable — starting 0.5 s hold timer");
        }

        const elapsed  = now - stableStartRef.current;
        const progress = Math.min(100, Math.round((elapsed / STABLE_MS) * 100));
        setStableProgress(progress);
        setGuidance("good");
        setInstruction("Reading model / serial");

        if (elapsed >= STABLE_MS && !isCapturingRef.current) {
          isCapturingRef.current = true;
          if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
          console.log(`[Scanner] Held stable for ${elapsed} ms — triggering auto-capture`);
          setPhase("capturing");
          doCapture();
        }

      } else {
        // ── Quality or band gate failed — reset all stability state ─────────
        const wasStable = stableStartRef.current !== null;
        if (wasStable) {
          console.log(`[Scanner] Stability broken — guidance: ${gState}`);
        }
        stableStartRef.current = null;
        prevGrayRef.current    = gray ?? null; // keep gray for next frame comparison when available
        setStableProgress(0);
        setGuidance(gState);
        setInstruction(INSTRUCTION[gState]);
      }
    }

    rafIdRef.current = requestAnimationFrame(loop);
    return () => { if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current); };
  }, []); // intentionally empty — all mutable state accessed via refs

  // ─── Capture ───────────────────────────────────────────────────────────────
  async function doCapture() {
    if (!isCapturingRef.current) isCapturingRef.current = true;
    const video = videoRef.current;
    const g     = guideRef.current;
    if (!video || !g) {
      console.log("[Scanner] doCapture: no video or guide — falling back to manual");
      isCapturingRef.current = false;
      setPhase("manual");
      return;
    }
    try {
      console.log("[Scanner] Capturing frame…");
      const result = await captureFrame(video, g);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      console.log("[Scanner] Capture complete — handing off to OCR");
      onCapture(result.blob, result.previewUrl);
    } catch (err) {
      console.warn("[Scanner] Capture failed:", err);
      isCapturingRef.current = false;
      setPhase("manual");
    }
  }

  const handleManualCapture = useCallback(async () => {
    if (isCapturingRef.current) return;
    isCapturingRef.current = true;
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    setPhase("capturing");
    const video = videoRef.current;
    const g     = guideRef.current;
    if (!video || !g) {
      isCapturingRef.current = false;
      setPhase("manual");
      return;
    }
    try {
      console.log("[Scanner] Manual capture triggered — full frame");
      const result = await captureFrame(video, g, 1600, 0.85, false); // full frame, no guide crop
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      onCapture(result.blob, result.previewUrl);
    } catch {
      isCapturingRef.current = false;
      setPhase("manual");
    }
  }, [onCapture, setPhase]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (isCapturingRef.current) return;
    isCapturingRef.current = true;
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    setPhase("capturing");
    try {
      console.log("[Scanner] File upload — resizing before OCR");
      const result = await resizeFile(file);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      onCapture(result.blob, result.previewUrl);
    } catch {
      isCapturingRef.current = false;
      setPhase("manual");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [onCapture, setPhase]);

  // ─── Derived render values ─────────────────────────────────────────────────
  const isCapturing = phaseState === "capturing";
  const isManual    = phaseState === "manual";
  const isScanning  = phaseState === "scanning";
  const isStable    = stableProgress > 0 && !isCapturing;

  // Guide border: green when fully stable, blue while holding, amber/red otherwise
  const guideColor =
    stableProgress >= 100 ? "rgba(34,197,94,0.90)"  :
    stableProgress > 0    ? GUIDE_CLR.good           :
                            GUIDE_CLR[guidance];

  // Corner bracket colour
  const cornerClr =
    stableProgress >= 100 ? "#4ade80" :
    stableProgress > 0    ? "#60a5fa" :
    (guidance === "find_plate" || guidance === "move_closer" || guidance === "center_plate" ||
     guidance === "straighten" || guidance === "unreadable")
      ? "#fbbf24" : "#f87171";

  // Instruction text colour
  const textClr =
    stableProgress >= 100 ? "#4ade80" :
    stableProgress > 0    ? "#93c5fd" :
    TEXT_CLR[guidance];

  // Ring arc colour
  const ringStroke = stableProgress >= 100 ? "#4ade80" : "#3b82f6";
  const ringOffset = RING_CIRCUMF * (1 - stableProgress / 100);

  return (
    <div className={`fixed inset-0 z-[200] bg-black flex ${isLandscape ? "flex-row" : "flex-col"}`} style={{ touchAction: "none" }}>

      {/* ── Camera viewport ────────────────────────────────────────────────── */}
      <div ref={containerRef} className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          autoPlay playsInline muted
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Camera error overlay */}
        {cameraError && (
          <div className="absolute inset-0 flex items-center justify-center p-8 bg-black/85">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center max-w-xs">
              <p className="text-white text-sm font-semibold leading-relaxed">{cameraError}</p>
              <p className="text-white/55 text-xs mt-2 leading-relaxed">
                Camera access is needed to scan a nameplate.
                You can still upload a photo or enter fields manually below.
              </p>
            </div>
          </div>
        )}

        {/* Guide frame + corners + feedback (hidden during capture) */}
        {guide && !isCapturing && !cameraError && (
          <>
            {/* Dark vignette with guide-frame cutout */}
            <div style={{
              position: "absolute",
              top: guide.y, left: guide.x,
              width: guide.w, height: guide.h,
              borderRadius: 10,
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.62)",
              border: `2px solid ${guideColor}`,
              pointerEvents: "none",
              transition: "border-color 0.25s",
            }} />

            {/* Colour-coded corner brackets */}
            {([
              [guide.y - 2,                    guide.x - 2,                    { borderTop:    `3px solid ${cornerClr}`, borderLeft:   `3px solid ${cornerClr}` }],
              [guide.y - 2,                    guide.x + guide.w - CORNER + 2, { borderTop:    `3px solid ${cornerClr}`, borderRight:  `3px solid ${cornerClr}` }],
              [guide.y + guide.h - CORNER + 2, guide.x - 2,                    { borderBottom: `3px solid ${cornerClr}`, borderLeft:   `3px solid ${cornerClr}` }],
              [guide.y + guide.h - CORNER + 2, guide.x + guide.w - CORNER + 2, { borderBottom: `3px solid ${cornerClr}`, borderRight:  `3px solid ${cornerClr}` }],
            ] as [number, number, React.CSSProperties][]).map(([top, left, bdr], i) => (
              <div key={i} style={{
                position: "absolute", top, left,
                width: CORNER, height: CORNER,
                pointerEvents: "none",
                transition: "border-color 0.25s",
                ...bdr,
              }} />
            ))}

            {/* Instruction area — below guide frame */}
            <div style={{
              position: "absolute",
              top: guide.y + guide.h + 14,
              left: 0, right: 0,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
              pointerEvents: "none",
            }}>
              {/* Primary instruction */}
              <p
                className="text-sm font-bold text-center px-6 leading-snug"
                style={{ color: textClr, textShadow: "0 1px 6px rgba(0,0,0,0.95)", transition: "color 0.25s" }}
              >
                {instruction}
              </p>

              {/* Progress ring — visible during 1-second hold */}
              {isStable && (
                <svg
                  width={72} height={72}
                  viewBox="0 0 72 72"
                  aria-label={`Hold steady — ${stableProgress}% stable`}
                  style={{ display: "block", marginTop: 2 }}
                >
                  {/* Track */}
                  <circle
                    cx={36} cy={36} r={RING_R}
                    fill="none"
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth={5}
                  />
                  {/* Fill arc */}
                  <circle
                    cx={36} cy={36} r={RING_R}
                    fill="none"
                    stroke={ringStroke}
                    strokeWidth={5}
                    strokeDasharray={RING_CIRCUMF}
                    strokeDashoffset={ringOffset}
                    strokeLinecap="round"
                    transform="rotate(-90 36 36)"
                    style={{ transition: "stroke-dashoffset 0.12s ease-out, stroke 0.25s" }}
                  />
                  {/* Percentage label */}
                  <text
                    x={36} y={41}
                    textAnchor="middle"
                    fill="white"
                    fontSize={13}
                    fontWeight="bold"
                    fontFamily="system-ui, -apple-system, sans-serif"
                  >
                    {stableProgress}%
                  </text>
                </svg>
              )}

              {/* Contextual sub-hint — only when not in stable state */}
              {!isStable && (
                <p
                  className="text-xs text-center px-8 leading-relaxed"
                  style={{ color: "rgba(255,255,255,0.48)", textShadow: "0 1px 4px rgba(0,0,0,0.85)" }}
                >
                  {guidance === "find_plate"
                    ? "Aim at the metal label showing MODEL, SERIAL, VOLTS, and electrical data"
                    : guidance === "move_closer"
                    ? "Fill the frame with the nameplate — text must be large enough to read"
                    : guidance === "center_plate"
                    ? "Keep the nameplate centered in the frame"
                    : guidance === "straighten"
                    ? "Rotate phone so the plate sits level in the frame"
                    : guidance === "unreadable"
                    ? "Move closer until each character is clearly visible"
                    : "Nameplate detected — reading…"}
                </p>
              )}

              {/* 30 s hint */}
              {showHint && !isStable && (
                <p
                  className="text-xs text-center px-6 mt-0.5 font-medium"
                  style={{ color: "rgba(255,200,100,0.90)", textShadow: "0 1px 4px rgba(0,0,0,0.9)" }}
                >
                  Still scanning — move closer or use manual capture below
                </p>
              )}
            </div>
          </>
        )}

        {/* Scanning overlay — shown while capturing */}
        {isCapturing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40">
            <Loader2 className="w-10 h-10 text-white animate-spin" />
            <p className="text-white text-sm font-bold" style={{ textShadow: "0 1px 6px rgba(0,0,0,0.9)" }}>
              Captured
            </p>
          </div>
        )}

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center text-white transition-colors"
          style={{ background: "rgba(0,0,0,0.55)" }}
          aria-label="Close scanner"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ── Controls: portrait → bottom bar  |  landscape → right sidebar ─────── */}
      {isLandscape ? (

        /* ── Landscape: narrow right sidebar, buttons stacked vertically ──────── *
         * Frees the full screen height for the camera viewport so the guide box   *
         * has room to breathe instead of being squished by a bottom bar.          */
        <div
          className="flex-shrink-0 flex flex-col items-stretch"
          style={{ background: "#000", width: 86, padding: "10px 6px 20px" }}
        >
          {/* Compact pulse dot — replaces the text scan-status row */}
          {isScanning && !cameraError && (
            <div className="flex justify-center py-2">
              {isStable
                ? <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                : <div className="w-2 h-2 rounded-full border-2 border-white/30 animate-pulse" />}
            </div>
          )}

          {/* Push buttons toward vertical centre */}
          <div className="flex-1" />

          {/* Vertical button stack */}
          {!isCapturing && (
            <div className="flex flex-col gap-2">

              {/* Take Photo */}
              <button
                onClick={handleManualCapture}
                disabled={isCapturing || !!cameraError}
                className={[
                  "flex flex-col items-center justify-center gap-1 py-3 rounded-2xl w-full",
                  "text-xs font-semibold transition-colors disabled:opacity-40",
                  isManual && !cameraError
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-white/10 hover:bg-white/[0.18] text-white/75",
                ].join(" ")}
              >
                <Camera className="w-4 h-4" />
                <span className="text-[10px] leading-tight text-center">Take Photo</span>
              </button>

              {/* Upload */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isCapturing}
                className="flex flex-col items-center justify-center gap-1 py-3 rounded-2xl w-full text-[10px] font-semibold bg-white/10 hover:bg-white/[0.18] text-white/75 transition-colors disabled:opacity-40"
              >
                <Upload className="w-4 h-4" />
                <span className="leading-tight text-center">Upload</span>
              </button>

              {/* Enter Manually */}
              <button
                onClick={onClose}
                disabled={isCapturing}
                className="flex flex-col items-center justify-center gap-1 py-3 rounded-2xl w-full text-[10px] font-semibold bg-white/10 hover:bg-white/[0.18] text-white/75 transition-colors disabled:opacity-40"
              >
                <Pencil className="w-4 h-4" />
                <span className="leading-tight text-center">Manual</span>
              </button>

            </div>
          )}

          <div className="flex-1" />
        </div>

      ) : (

        /* ── Portrait: bottom bar — layout unchanged from before ─────────────── */
        <div className="flex-shrink-0" style={{ background: "#000" }}>

          {/* Scan-status row */}
          {isScanning && !cameraError && (
            <div className="flex items-center justify-between px-5 pt-3 pb-1">
              <div className="flex items-center gap-2">
                {isStable ? (
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse flex-shrink-0" />
                ) : (
                  <div className="w-2 h-2 rounded-full border-2 border-white/30 animate-pulse flex-shrink-0" />
                )}
                <span className="text-white/60 text-xs">
                  {isStable
                    ? `Reading model / serial… ${stableProgress}%`
                    : "Scanning for nameplate…"}
                </span>
              </div>
            </div>
          )}

          {/* Always-visible manual controls (except while capturing) */}
          {!isCapturing && (
            <div className="px-4 pt-2 pb-6">
              <div className="flex gap-2">

                {/* Take Photo */}
                <button
                  onClick={handleManualCapture}
                  disabled={isCapturing || !!cameraError}
                  className={[
                    "flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-2xl",
                    "text-xs font-semibold transition-colors disabled:opacity-40",
                    isManual && !cameraError
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-white/10 hover:bg-white/[0.18] text-white/75",
                  ].join(" ")}
                >
                  <Camera className="w-4 h-4" />
                  Take Photo
                </button>

                {/* Upload Image */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isCapturing}
                  className="flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-2xl text-xs font-semibold bg-white/10 hover:bg-white/[0.18] text-white/75 transition-colors disabled:opacity-40"
                >
                  <Upload className="w-4 h-4" />
                  Upload
                </button>

                {/* Enter Manually */}
                <button
                  onClick={onClose}
                  disabled={isCapturing}
                  className="flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-2xl text-xs font-semibold bg-white/10 hover:bg-white/[0.18] text-white/75 transition-colors disabled:opacity-40"
                >
                  <Pencil className="w-4 h-4" />
                  Enter Manually
                </button>

              </div>
            </div>
          )}
        </div>

      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileUpload}
      />
    </div>
  );
}
