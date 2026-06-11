import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { X, Camera, Loader2, Upload, Pencil } from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────
const ANALYSIS_W    = 160;    // analysis canvas width (px)
const ANALYSIS_SKIP = 6;      // analyse every 6th RAF frame ≈ 10 fps
const STABLE_NEEDED = 15;     // consecutive qualifying frames ≈ 1.5 s
const HINT_MS       = 30_000; // show hint after 30 s, scanner keeps running

// Image-quality pass thresholds
const BRIGHT_MIN  = 50;   // mean luminance floor
const BRIGHT_MAX  = 215;  // mean luminance ceiling
const GLARE_MAX   = 0.10; // fraction of near-white pixels
const SHARP_MIN   = 40;   // Laplacian variance floor
const EDGE_MIN    = 0.07; // Sobel edge-pixel fraction (content present)
const EDGE_CLOSER = 0.04; // below → nothing in frame; 0.04–0.07 → too far
const EDGE_THRESH = 20;   // per-pixel Sobel magnitude threshold

// Nameplate-pattern detection thresholds
const BAND_COUNT      = 10;   // vertical bands to slice the frame into
const BAND_EDGE_FLOOR = 0.05; // fraction of horizontal edges per band to call it "active"
const BANDS_NEEDED    = 4;    // minimum active bands (= text rows)
const SPAN_NEEDED     = 5;    // active bands must span this many positions (out of BAND_COUNT)

// ─── Types ────────────────────────────────────────────────────────────────────
type Phase = "scanning" | "capturing" | "manual";

type Guidance =
  | "too_dark"
  | "glare"
  | "overexposed"
  | "find_plate"    // nothing / wrong object in frame
  | "move_closer"   // something present but too far / too few rows
  | "too_blurry"
  | "good";         // nameplate detected + quality OK → start stability

interface FrameResult {
  qualifies:          boolean;
  guidance:           Guidance;
  edgeDensity:        number;
  nameplateDetected:  boolean;
}

interface Guide { x: number; y: number; w: number; h: number }

interface Props {
  onCapture: (blob: Blob, previewUrl: string) => void;
  onClose:   () => void;
}

// ─── Guidance → display maps ──────────────────────────────────────────────────
const INSTRUCTION: Record<Guidance, string> = {
  too_dark:   "Use more light",
  glare:      "Reduce glare",
  overexposed:"Reduce glare",
  find_plate: "Find the equipment data plate",
  move_closer:"Move closer",
  too_blurry: "Hold steady",
  good:       "Data plate found — hold steady",
};

// Guide-frame border colour
const GUIDE_CLR: Record<Guidance, string> = {
  too_dark:   "rgba(239,68,68,0.80)",
  glare:      "rgba(239,68,68,0.80)",
  overexposed:"rgba(239,68,68,0.80)",
  find_plate: "rgba(245,158,11,0.80)",
  move_closer:"rgba(245,158,11,0.80)",
  too_blurry: "rgba(239,68,68,0.80)",
  good:       "rgba(59,130,246,0.85)",
};

// Instruction text colour
const TEXT_CLR: Record<Guidance, string> = {
  too_dark:   "#fca5a5",
  glare:      "#fca5a5",
  overexposed:"#fca5a5",
  find_plate: "#fcd34d",
  move_closer:"#fcd34d",
  too_blurry: "#fca5a5",
  good:       "#93c5fd",
};

// ─── Nameplate pattern detection ──────────────────────────────────────────────
// Divides the gray frame into BAND_COUNT horizontal bands.
// Each band is "active" when it contains enough horizontal edges (top/bottom
// edges of text strokes → simplified vertical gradient).
// A real HVAC nameplate has many labeled rows distributed across the full height;
// a cabinet panel, blank wall, hand, or warning sticker does not.
function detectNameplateBands(
  gray: Uint8ClampedArray,
  W:    number,
  H:    number,
): boolean {
  const bandH     = Math.max(2, Math.floor(H / BAND_COUNT));
  const activeMask = new Array<boolean>(BAND_COUNT).fill(false);

  for (let b = 0; b < BAND_COUNT; b++) {
    const rStart = Math.max(1, b * bandH);
    const rEnd   = Math.min((b + 1) * bandH, H - 1);
    if (rEnd <= rStart) continue;

    let edgePx = 0;
    let total  = 0;

    for (let row = rStart; row < rEnd; row++) {
      for (let col = 1; col < W - 1; col++) {
        // Vertical gradient magnitude = horizontal edge strength
        const gy = Math.abs(gray[(row + 1) * W + col] - gray[(row - 1) * W + col]);
        if (gy > 18) edgePx++;
        total++;
      }
    }

    activeMask[b] = total > 0 && edgePx / total > BAND_EDGE_FLOOR;
  }

  const activeCount = activeMask.filter(Boolean).length;
  if (activeCount < BANDS_NEEDED) return false;

  // Active bands must be spread across the height, not all clustered together
  // (a single warning sticker has 1–3 adjacent bands; a nameplate spans the plate)
  const firstIdx  = activeMask.findIndex(Boolean);
  const lastIdx   = activeMask.lastIndexOf(true);
  return lastIdx - firstIdx + 1 >= SPAN_NEEDED;
}

// ─── Frame quality + nameplate analysis ───────────────────────────────────────
// Renders the guide region to a small canvas and runs five independent checks:
//   1. brightness    2. glare    3. sharpness (Laplacian)
//   4. edge density (Sobel, overall content present)
//   5. nameplate-band pattern (multi-row text distribution)
// A frame *qualifies* only when ALL five pass.
function analyzeFrame(
  video:  HTMLVideoElement,
  canvas: HTMLCanvasElement,
  guide:  Guide,
): FrameResult {
  const vW = video.videoWidth;
  const vH = video.videoHeight;
  const dW = video.clientWidth;
  const dH = video.clientHeight;

  const FAIL = (g: Guidance): FrameResult =>
    ({ qualifies: false, guidance: g, edgeDensity: 0, nameplateDetected: false });

  if (!vW || !vH) return FAIL("find_plate");

  // Map display-coord guide → intrinsic video pixels (object-fit: cover)
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
  const total    = ANALYSIS_W * aH;
  const W        = ANALYSIS_W;
  const H        = aH;

  // ── Pass 1: luminance, brightness, glare ─────────────────────────────────
  const gray      = new Uint8ClampedArray(total);
  let   brightSum = 0;
  let   glareCount = 0;

  for (let i = 0; i < total; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const lum = (r * 77 + g * 150 + b * 29) >> 8; // BT.601 integer approx
    gray[i]    = lum;
    brightSum  += lum;
    if (r > 248 && g > 248 && b > 248) glareCount++;
  }

  const brightness = brightSum / total;
  const glareRatio = glareCount / total;

  // ── Pass 2: Laplacian variance (sharpness) + Sobel edge density ──────────
  let lapSum   = 0;
  let lapSumSq = 0;
  let edgePx   = 0;
  let n        = 0;

  for (let row = 1; row < H - 1; row++) {
    for (let col = 1; col < W - 1; col++) {
      const idx = row * W + col;

      // 5-point Laplacian
      const lap =
        -4 * gray[idx]
        + gray[(row - 1) * W + col]
        + gray[(row + 1) * W + col]
        + gray[row * W + (col - 1)]
        + gray[row * W + (col + 1)];
      lapSum   += lap;
      lapSumSq += lap * lap;

      // 3×3 Sobel
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

  // ── Quality gate (priority: most blocking issue first) ────────────────────
  if (brightness  < BRIGHT_MIN)  return { qualifies: false, guidance: "too_dark",   edgeDensity, nameplateDetected: false };
  if (glareRatio  > GLARE_MAX)   return { qualifies: false, guidance: "glare",      edgeDensity, nameplateDetected: false };
  if (brightness  > BRIGHT_MAX)  return { qualifies: false, guidance: "overexposed",edgeDensity, nameplateDetected: false };
  if (edgeDensity < EDGE_CLOSER) return { qualifies: false, guidance: "find_plate", edgeDensity, nameplateDetected: false };
  if (edgeDensity < EDGE_MIN)    return { qualifies: false, guidance: "move_closer",edgeDensity, nameplateDetected: false };
  if (sharpness   < SHARP_MIN)   return { qualifies: false, guidance: "too_blurry", edgeDensity, nameplateDetected: false };

  // ── Nameplate pattern gate ────────────────────────────────────────────────
  // Only passes when the frame contains multiple horizontal text-row bands
  // distributed across the height — the signature of an HVAC data plate.
  // Cabinet panels, blank metal, wiring, hands, and warning stickers fail here.
  const nameplateDetected = detectNameplateBands(gray, W, H);
  if (!nameplateDetected) {
    return { qualifies: false, guidance: "find_plate", edgeDensity, nameplateDetected: false };
  }

  return { qualifies: true, guidance: "good", edgeDensity, nameplateDetected: true };
}

// ─── Capture helpers (unchanged) ─────────────────────────────────────────────
function getCropCoords(video: HTMLVideoElement, guide: Guide) {
  const vW = video.videoWidth;
  const vH = video.videoHeight;
  const dW = video.clientWidth;
  const dH = video.clientHeight;
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
  const phaseRef       = useRef<Phase>("scanning");
  const stableCountRef = useRef(0);
  const frameCountRef  = useRef(0);
  const startTimeRef   = useRef(Date.now());
  const guideRef       = useRef<Guide | null>(null);
  const showHintRef    = useRef(false);

  // React state (drives UI redraws)
  const [phaseState,      setPhaseState]      = useState<Phase>("scanning");
  const [guidance,        setGuidance]        = useState<Guidance>("find_plate");
  const [instruction,     setInstruction]     = useState("Find the equipment data plate");
  const [stableProgress,  setStableProgress]  = useState(0);
  const [showHint,        setShowHint]        = useState(false);
  const [cameraError,     setCameraError]     = useState<string | null>(null);
  const [containerSize,   setContainerSize]   = useState({ w: 0, h: 0 });

  const setPhase = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  }, []);

  // Off-screen analysis canvas (created once)
  useEffect(() => { analysisCanvasRef.current = document.createElement("canvas"); }, []);

  // Track container size
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
  // All mutable state read through refs — never stale closures.
  // Loop keeps running indefinitely; only stops on capture or manual exit.
  // Capture requires: quality OK  AND  nameplate pattern detected  AND  1.5 s stable.
  useEffect(() => {
    startTimeRef.current = Date.now();

    function loop() {
      const phase = phaseRef.current;
      if (phase === "capturing" || phase === "manual") return;

      rafIdRef.current = requestAnimationFrame(loop);
      frameCountRef.current++;
      if (frameCountRef.current % ANALYSIS_SKIP !== 0) return;

      // Show hint after HINT_MS — do NOT stop the loop
      if (!showHintRef.current && Date.now() - startTimeRef.current > HINT_MS) {
        showHintRef.current = true;
        setShowHint(true);
      }

      const video   = videoRef.current;
      const aCanvas = analysisCanvasRef.current;
      const g       = guideRef.current;

      if (!video || video.readyState < 2 || !aCanvas || !g) {
        setGuidance("find_plate");
        setInstruction(INSTRUCTION.find_plate);
        return;
      }

      const { qualifies, guidance: gState } = analyzeFrame(video, aCanvas, g);

      if (qualifies) {
        // nameplateDetected === true at this point (enforced inside analyzeFrame)
        stableCountRef.current++;
        const progress = Math.min(100, Math.round((stableCountRef.current / STABLE_NEEDED) * 100));
        setStableProgress(progress);
        setGuidance("good");
        setInstruction(
          stableCountRef.current >= Math.round(STABLE_NEEDED * 0.6)
            ? "Data plate found — hold steady"
            : "Hold steady…",
        );

        if (stableCountRef.current >= STABLE_NEEDED) {
          if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
          setPhase("capturing");
          doCapture();
        }
      } else {
        // Any failed check resets the stability window
        stableCountRef.current = 0;
        setStableProgress(0);
        setGuidance(gState);
        setInstruction(INSTRUCTION[gState]);
      }
    }

    rafIdRef.current = requestAnimationFrame(loop);
    return () => { if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current); };
  }, []); // intentionally empty — all mutable state via refs

  // ─── Capture helpers ───────────────────────────────────────────────────────
  async function doCapture() {
    const video = videoRef.current;
    const g     = guideRef.current;
    if (!video || !g) { setPhase("manual"); return; }
    try {
      const result = await captureFrame(video, g);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      onCapture(result.blob, result.previewUrl);
    } catch {
      setPhase("manual");
    }
  }

  const handleManualCapture = useCallback(async () => {
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    setPhase("capturing");
    const video = videoRef.current;
    const g     = guideRef.current;
    if (!video || !g) { setPhase("manual"); return; }
    try {
      const result = await captureFrame(video, g);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      onCapture(result.blob, result.previewUrl);
    } catch {
      setPhase("manual");
    }
  }, [onCapture, setPhase]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    setPhase("capturing");
    try {
      const result = await resizeFile(file);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      onCapture(result.blob, result.previewUrl);
    } catch {
      setPhase("manual");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [onCapture, setPhase]);

  // ─── Derived render values ─────────────────────────────────────────────────
  const phase       = phaseState;
  const isCapturing = phase === "capturing";
  const isManual    = phase === "manual";
  const isScanning  = phase === "scanning";

  // Guide border: green when > 50 % stable, blue when holding, else guidance colour
  const guideColor =
    stableProgress > 50 ? "rgba(34,197,94,0.90)"  :
    stableProgress > 0  ? GUIDE_CLR.good           :
                          GUIDE_CLR[guidance];

  // Corner bracket colour mirrors guide
  const cornerClr =
    stableProgress > 50 ? "#4ade80" :
    stableProgress > 0  ? "#60a5fa" :
    (guidance === "find_plate" || guidance === "move_closer") ? "#fbbf24" : "#f87171";

  // Instruction text colour
  const textClr = stableProgress > 50 ? "#4ade80" : TEXT_CLR[guidance];

  const showBar = stableProgress > 0 && !isCapturing;

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

            {/* Stability progress bar — above guide frame */}
            {showBar && (
              <div style={{
                position: "absolute",
                top: guide.y - 9, left: guide.x,
                width: guide.w, height: 4,
                background: "rgba(255,255,255,0.18)", borderRadius: 2,
                overflow: "hidden", pointerEvents: "none",
              }}>
                <div style={{
                  height: "100%",
                  width: `${stableProgress}%`,
                  background: stableProgress > 50 ? "#4ade80" : "#3b82f6",
                  borderRadius: 2,
                  transition: "width 0.15s, background 0.25s",
                }} />
              </div>
            )}

            {/* Instructions — below guide frame */}
            <div style={{
              position: "absolute",
              top: guide.y + guide.h + 14,
              left: 0, right: 0,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
              pointerEvents: "none",
            }}>
              {/* Primary instruction */}
              <p
                className="text-sm font-bold text-center px-6 leading-snug"
                style={{ color: textClr, textShadow: "0 1px 6px rgba(0,0,0,0.95)", transition: "color 0.25s" }}
              >
                {instruction}
              </p>

              {/* Contextual sub-hint */}
              {stableProgress === 0 && (
                <p
                  className="text-xs text-center px-8 leading-relaxed"
                  style={{ color: "rgba(255,255,255,0.48)", textShadow: "0 1px 4px rgba(0,0,0,0.85)" }}
                >
                  {guidance === "find_plate"
                    ? "Aim at the metal label showing MODEL, SERIAL, VOLTS, and electrical data"
                    : guidance === "move_closer"
                    ? "Get the data plate to fill the guide frame"
                    : "Fill the frame · Avoid glare · Hold steady"}
                </p>
              )}

              {/* 30 s hint — scanner still running */}
              {showHint && stableProgress === 0 && (
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

        {/* Capturing overlay */}
        {isCapturing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40">
            <Loader2 className="w-10 h-10 text-white animate-spin" />
            <p className="text-white text-sm font-bold" style={{ textShadow: "0 1px 6px rgba(0,0,0,0.9)" }}>
              Capturing…
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

        {/* Scan-status row — visible during scanning */}
        {isScanning && !cameraError && (
          <div className="flex items-center justify-between px-5 pt-3 pb-1">
            <div className="flex items-center gap-2">
              {stableProgress > 0 ? (
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse flex-shrink-0" />
              ) : (
                <div className="w-2 h-2 rounded-full border-2 border-white/30 animate-pulse flex-shrink-0" />
              )}
              <span className="text-white/60 text-xs">
                {stableProgress > 0
                  ? `Data plate found — locking… ${stableProgress}%`
                  : "Scanning for data plate…"}
              </span>
            </div>
          </div>
        )}

        {/* Always-visible manual controls (except while capturing) */}
        {!isCapturing && (
          <div className="px-4 pt-2 pb-6">
            <div className="flex gap-2">

              {/* Take Photo — crops + compresses before OCR */}
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
