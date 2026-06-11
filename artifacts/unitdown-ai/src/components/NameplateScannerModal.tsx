import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { X, Camera, Loader2, Upload, Pencil } from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────
const ANALYSIS_W      = 160;     // analysis canvas width (px)
const ANALYSIS_SKIP   = 6;       // analyse every 6th RAF frame ≈ 10 fps
const STABLE_MS       = 1_000;   // wall-clock ms of continuous stability required
const MOVE_MAD_THRESH = 10;      // mean-abs-diff in gray levels that counts as "moving"
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

// ─── Types ────────────────────────────────────────────────────────────────────
type Phase = "scanning" | "capturing" | "manual";

type Guidance =
  | "too_dark"
  | "glare"
  | "overexposed"
  | "find_plate"      // nothing / wrong object in frame
  | "move_closer"     // something present but too far
  | "center_plate"    // plate partially visible — needs centering
  | "too_blurry"
  | "good";           // nameplate detected + quality OK → accumulating stable time

interface FrameResult {
  qualifies:          boolean;
  guidance:           Guidance;
  edgeDensity:        number;
  nameplateDetected:  boolean;
  gray?:              Uint8ClampedArray; // for movement detection between frames
}

interface Guide { x: number; y: number; w: number; h: number }

interface Props {
  onCapture: (blob: Blob, previewUrl: string) => void;
  onClose:   () => void;
}

// ─── Guidance → display maps ──────────────────────────────────────────────────
const INSTRUCTION: Record<Guidance, string> = {
  too_dark:     "Use more light",
  glare:        "Reduce glare",
  overexposed:  "Reduce glare",
  find_plate:   "Find the equipment data plate",
  move_closer:  "Move closer",
  center_plate: "Center the data plate",
  too_blurry:   "Hold steady",
  good:         "Data plate found — hold steady",
};

const GUIDE_CLR: Record<Guidance, string> = {
  too_dark:     "rgba(239,68,68,0.80)",
  glare:        "rgba(239,68,68,0.80)",
  overexposed:  "rgba(239,68,68,0.80)",
  find_plate:   "rgba(245,158,11,0.80)",
  move_closer:  "rgba(245,158,11,0.80)",
  center_plate: "rgba(245,158,11,0.80)",
  too_blurry:   "rgba(239,68,68,0.80)",
  good:         "rgba(59,130,246,0.85)",
};

const TEXT_CLR: Record<Guidance, string> = {
  too_dark:     "#fca5a5",
  glare:        "#fca5a5",
  overexposed:  "#fca5a5",
  find_plate:   "#fcd34d",
  move_closer:  "#fcd34d",
  center_plate: "#fcd34d",
  too_blurry:   "#fca5a5",
  good:         "#93c5fd",
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
// Returns detected (full criteria), activeCount, and span for partial-plate hinting.
function detectNameplateBands(
  gray: Uint8ClampedArray,
  W:    number,
  H:    number,
): { detected: boolean; activeCount: number; span: number } {
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
  if (activeCount === 0) return { detected: false, activeCount: 0, span: 0 };

  const firstIdx = activeMask.findIndex(Boolean);
  const lastIdx  = activeMask.lastIndexOf(true);
  const span     = lastIdx - firstIdx + 1;
  const detected = activeCount >= BANDS_NEEDED && span >= SPAN_NEEDED;
  return { detected, activeCount, span };
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
    ({ qualifies: false, guidance: g, edgeDensity: 0, nameplateDetected: false });

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
  if (brightness  < BRIGHT_MIN)  return { qualifies: false, guidance: "too_dark",    edgeDensity, nameplateDetected: false, gray };
  if (glareRatio  > GLARE_MAX)   return { qualifies: false, guidance: "glare",       edgeDensity, nameplateDetected: false, gray };
  if (brightness  > BRIGHT_MAX)  return { qualifies: false, guidance: "overexposed", edgeDensity, nameplateDetected: false, gray };
  if (edgeDensity < EDGE_CLOSER) return { qualifies: false, guidance: "find_plate",  edgeDensity, nameplateDetected: false };
  if (edgeDensity < EDGE_MIN)    return { qualifies: false, guidance: "move_closer", edgeDensity, nameplateDetected: false, gray };
  if (sharpness   < SHARP_MIN)   return { qualifies: false, guidance: "too_blurry",  edgeDensity, nameplateDetected: false, gray };

  // ── Nameplate band gate ───────────────────────────────────────────────────
  const { detected, activeCount } = detectNameplateBands(gray, W, H);
  if (!detected) {
    // 2+ active bands = plate partially in frame → guide to center rather than "find"
    const guidance: Guidance = activeCount >= 2 ? "center_plate" : "find_plate";
    return { qualifies: false, guidance, edgeDensity, nameplateDetected: false, gray };
  }

  return { qualifies: true, guidance: "good", edgeDensity, nameplateDetected: true, gray };
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
  video:   HTMLVideoElement,
  guide:   Guide,
  maxPx  = 1200,
  quality = 0.75,
): Promise<{ blob: Blob; previewUrl: string }> {
  const { x, y, w, h } = getCropCoords(video, guide);
  const s   = Math.min(1, maxPx / Math.max(w, h));
  const cvs = document.createElement("canvas");
  cvs.width  = Math.max(1, Math.round(w * s));
  cvs.height = Math.max(1, Math.round(h * s));
  const ctx  = cvs.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(video, x, y, w, h, 0, 0, cvs.width, cvs.height);
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
  maxPx  = 1200,
  quality = 0.75,
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

  // Guide frame: landscape nameplate ratio (~16:9), 88 % wide, slightly above centre
  const guide = useMemo<Guide | null>(() => {
    const { w, h } = containerSize;
    if (!w || !h) return null;
    const gW = Math.round(w * 0.88);
    const gH = Math.min(Math.round(gW * 0.54), Math.round(h * 0.50));
    return {
      x: Math.round((w - gW) / 2),
      y: Math.round((h - gH) / 2) - Math.round(h * 0.05),
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
          // Camera still settling — reset timer but keep showing "hold steady"
          stableStartRef.current = null;
          setStableProgress(0);
          setGuidance("good");
          setInstruction("Hold steady");
          return;
        }

        // ── Stability accumulation ──────────────────────────────────────────
        const now = Date.now();
        if (stableStartRef.current === null) {
          stableStartRef.current = now;
          console.log("[Scanner] Nameplate detected + camera stable — starting 1 s hold timer");
        }

        const elapsed  = now - stableStartRef.current;
        const progress = Math.min(100, Math.round((elapsed / STABLE_MS) * 100));
        setStableProgress(progress);
        setGuidance("good");
        setInstruction("Data plate found — hold steady");

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
      console.log("[Scanner] Manual capture triggered");
      const result = await captureFrame(video, g);
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
    (guidance === "find_plate" || guidance === "move_closer" || guidance === "center_plate")
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
    <div className="fixed inset-0 z-[200] bg-black flex flex-col" style={{ touchAction: "none" }}>

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
                    ? "Get the data plate to fill the guide frame"
                    : guidance === "center_plate"
                    ? "Move the plate to fill the guide frame"
                    : "Fill the frame · Avoid glare · Hold steady"}
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
              Scanning…
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

      {/* ── Bottom bar ───────────────────────────────────────────────────────── */}
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
                  ? `Plate found — holding steady… ${stableProgress}%`
                  : "Scanning for data plate…"}
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
