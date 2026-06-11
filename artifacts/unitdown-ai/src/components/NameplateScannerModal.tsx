import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { X, Camera, Loader2, Upload, Pencil } from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────
const ANALYSIS_W = 160;           // analysis canvas width (px) — small for speed
const ANALYSIS_SKIP = 6;          // analyze every 6th RAF frame (~10 fps)
const QUALITY_THRESHOLD = 62;     // 0–100 score to start stability count
const STABLE_FRAMES_NEEDED = 18;  // ~1.8 s at 10 fps analysis rate
const TIMEOUT_MS = 12_000;        // fall back to manual mode after 12 s

// ─── Types ────────────────────────────────────────────────────────────────────
type Phase = "scanning" | "capturing" | "timeout" | "manual";
interface Guide { x: number; y: number; w: number; h: number }
interface Props {
  onCapture: (blob: Blob, previewUrl: string) => void;
  onClose: () => void;
}

// ─── Frame quality analysis ───────────────────────────────────────────────────
// Draws the guide-frame region of the video to a small canvas and returns:
//   score 0–100, and a human-readable issue string when score < threshold.
function analyzeQuality(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  guide: Guide,
): { score: number; issue: string | null } {
  const vW = video.videoWidth;
  const vH = video.videoHeight;
  const dW = video.clientWidth;
  const dH = video.clientHeight;
  if (!vW || !vH) return { score: 0, issue: null };

  // Map display-coordinate guide frame → intrinsic video coords (object-fit: cover)
  const scale = Math.max(dW / vW, dH / vH);
  const ox = (dW - vW * scale) / 2;
  const oy = (dH - vH * scale) / 2;
  const sx = Math.max(0, (guide.x - ox) / scale);
  const sy = Math.max(0, (guide.y - oy) / scale);
  const sw = Math.min(guide.w / scale, vW - sx);
  const sh = Math.min(guide.h / scale, vH - sy);

  const aH = Math.max(1, Math.round(ANALYSIS_W * (sh / sw)));
  canvas.width = ANALYSIS_W;
  canvas.height = aH;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { score: 50, issue: null };
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, ANALYSIS_W, aH);

  const { data } = ctx.getImageData(0, 0, ANALYSIS_W, aH);
  const total = ANALYSIS_W * aH;

  let brightSum = 0;
  let glareCount = 0;
  const gray = new Uint8ClampedArray(total);

  for (let i = 0; i < total; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    // Fast integer luminance approximation (BT.601)
    const lum = (r * 77 + g * 150 + b * 29) >> 8;
    gray[i] = lum;
    brightSum += lum;
    if (r > 248 && g > 248 && b > 248) glareCount++;
  }

  const brightness = brightSum / total;      // 0–255 mean
  const glareRatio = glareCount / total;     // fraction of near-white pixels

  // Laplacian variance as a sharpness proxy
  const W = ANALYSIS_W;
  const H = aH;
  let lapSum = 0;
  let lapSumSq = 0;
  let n = 0;
  for (let row = 1; row < H - 1; row++) {
    for (let col = 1; col < W - 1; col++) {
      const idx = row * W + col;
      const v =
        -4 * gray[idx]
        + gray[(row - 1) * W + col]
        + gray[(row + 1) * W + col]
        + gray[row * W + (col - 1)]
        + gray[row * W + (col + 1)];
      lapSum += v;
      lapSumSq += v * v;
      n++;
    }
  }
  const lapMean = lapSum / n;
  const sharpness = n > 0 ? lapSumSq / n - lapMean * lapMean : 0;

  // Assemble score: start at 100, deduct for detected problems
  let score = 100;
  let issue: string | null = null;

  if (brightness < 45) {
    score -= 45;
    issue = "Move to better lighting";
  } else if (brightness > 220) {
    score -= 30;
    issue = "Reduce overexposure — shade the nameplate or step back";
  }

  if (glareRatio > 0.12) {
    score -= 35;
    if (!issue) issue = "Tilt slightly to reduce glare";
  } else if (glareRatio > 0.06) {
    score -= 15;
    if (!issue) issue = "Adjust angle to reduce glare";
  }

  if (sharpness < 30) {
    score -= 45;
    if (!issue) issue = "Move closer and hold still";
  } else if (sharpness < 80) {
    score -= 22;
    if (!issue) issue = "Hold still to sharpen";
  }

  return { score: Math.max(0, score), issue };
}

// ─── Capture: crop guide region from live video frame, resize, compress ───────
function getCropCoords(video: HTMLVideoElement, guide: Guide) {
  const vW = video.videoWidth;
  const vH = video.videoHeight;
  const dW = video.clientWidth;
  const dH = video.clientHeight;
  if (!vW || !vH) return { x: 0, y: 0, w: vW, h: vH };
  const scale = Math.max(dW / vW, dH / vH);
  const ox = (dW - vW * scale) / 2;
  const oy = (dH - vH * scale) / 2;
  const x = Math.max(0, (guide.x - ox) / scale);
  const y = Math.max(0, (guide.y - oy) / scale);
  return {
    x, y,
    w: Math.min(guide.w / scale, vW - x),
    h: Math.min(guide.h / scale, vH - y),
  };
}

async function captureFrame(
  video: HTMLVideoElement,
  guide: Guide,
  maxPx = 1200,
  quality = 0.75,
): Promise<{ blob: Blob; previewUrl: string }> {
  const { x, y, w, h } = getCropCoords(video, guide);
  const s = Math.min(1, maxPx / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * s));
  canvas.height = Math.max(1, Math.round(h * s));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(video, x, y, w, h, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) { reject(new Error("Capture failed")); return; }
        resolve({ blob, previewUrl: URL.createObjectURL(blob) });
      },
      "image/jpeg",
      quality,
    );
  });
}

// ─── Resize an uploaded File into a compressed Blob ───────────────────────────
async function resizeFile(
  file: File,
  maxPx = 1200,
  quality = 0.75,
): Promise<{ blob: Blob; previewUrl: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const s = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * s));
      const h = Math.max(1, Math.round(img.height * s));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas unavailable")); return; }
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error("Resize failed")); return; }
          resolve({ blob, previewUrl: URL.createObjectURL(blob) });
        },
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const analysisCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rafIdRef = useRef<number | null>(null);

  // Refs used inside the RAF loop to avoid stale closures
  const phaseRef = useRef<Phase>("scanning");
  const stableCountRef = useRef(0);
  const frameCountRef = useRef(0);
  const startTimeRef = useRef(Date.now());
  const guideRef = useRef<Guide | null>(null);

  // React state (drives the UI)
  const [phaseState, setPhaseState] = useState<Phase>("scanning");
  const [instruction, setInstruction] = useState("Center the nameplate inside the frame");
  const [stableProgress, setStableProgress] = useState(0); // 0–100 %
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  // setPhase keeps ref + state in sync
  const setPhase = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  }, []);

  // Create the persistent off-screen analysis canvas once
  useEffect(() => {
    analysisCanvasRef.current = document.createElement("canvas");
  }, []);

  // Track container dimensions via ResizeObserver
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

  // Keep guide ref in sync with memo
  useEffect(() => { guideRef.current = guide; }, [guide]);

  // Start rear camera
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
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
          err?.name === "NotAllowedError"
            ? "Camera access denied. Allow camera access in your browser settings and try again."
            : err?.name === "NotFoundError"
            ? "No camera found on this device."
            : "Camera unavailable on this device.";
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

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // ─── Auto-capture RAF loop ─────────────────────────────────────────────────
  // Runs once on mount; reads all mutable state through refs, not closures.
  useEffect(() => {
    startTimeRef.current = Date.now();

    function loop() {
      const phase = phaseRef.current;

      // Stop loop once we have captured or user switched to manual
      if (phase === "capturing" || phase === "manual") return;

      rafIdRef.current = requestAnimationFrame(loop);

      frameCountRef.current++;
      // Throttle analysis to every ANALYSIS_SKIP frames (~10 fps)
      if (frameCountRef.current % ANALYSIS_SKIP !== 0) return;

      // Auto-timeout → fall back to manual options
      if (Date.now() - startTimeRef.current > TIMEOUT_MS) {
        // Cancel the already-queued RAF (same pattern as auto-capture path)
        // so the loop does not keep firing indefinitely after timeout.
        if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
        setPhase("timeout");
        setInstruction("Couldn't auto-capture. Take a photo manually or enter fields below.");
        return;
      }

      const video = videoRef.current;
      const aCanvas = analysisCanvasRef.current;
      const g = guideRef.current;

      // Camera may still be initialising
      if (!video || video.readyState < 2 || !aCanvas || !g) {
        setInstruction("Center the nameplate inside the frame");
        return;
      }

      const { score, issue } = analyzeQuality(video, aCanvas, g);

      if (score >= QUALITY_THRESHOLD) {
        stableCountRef.current++;
        const progress = Math.min(100, Math.round((stableCountRef.current / STABLE_FRAMES_NEEDED) * 100));
        setStableProgress(progress);
        setInstruction("Hold steady…");

        if (stableCountRef.current >= STABLE_FRAMES_NEEDED) {
          // Cancel the RAF before the async capture so it doesn't re-schedule
          if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
          setPhase("capturing");
          doCapture();
        }
      } else {
        stableCountRef.current = 0;
        setStableProgress(0);
        setInstruction(issue ?? "Center the nameplate inside the frame");
      }
    }

    rafIdRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, []); // intentionally empty — all mutable state accessed via refs

  // ─── Capture helpers ──────────────────────────────────────────────────────
  async function doCapture() {
    const video = videoRef.current;
    const g = guideRef.current;
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
    const g = guideRef.current;
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

  // ─── Derived render state ─────────────────────────────────────────────────
  const phase = phaseState;
  const isCapturing = phase === "capturing";
  const isManualOrTimeout = phase === "manual" || phase === "timeout";

  // Guide border turns solid blue as stability builds up
  const guideBorder = stableProgress > 0
    ? `2px solid rgba(59,130,246,${0.6 + stableProgress / 250})`
    : "1.5px dashed rgba(255,255,255,0.50)";

  return (
    <div
      className="fixed inset-0 z-[200] bg-black flex flex-col"
      style={{ touchAction: "none" }}
    >
      {/* ── Camera viewport ─────────────────────────────────────────────── */}
      <div ref={containerRef} className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Camera permission / availability error */}
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

        {/* Guide frame + overlay (hidden while capturing) */}
        {guide && !isCapturing && !cameraError && (
          <>
            {/* Dark vignette punched through by the guide frame */}
            <div
              style={{
                position: "absolute",
                top: guide.y, left: guide.x,
                width: guide.w, height: guide.h,
                borderRadius: 10,
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.60)",
                border: guideBorder,
                pointerEvents: "none",
                transition: "border 0.25s",
              }}
            />

            {/* Blue corner markers */}
            <div style={{ position: "absolute", top: guide.y - 2, left: guide.x - 2, width: CORNER, height: CORNER, borderTop: "3px solid #3b82f6", borderLeft: "3px solid #3b82f6", pointerEvents: "none" }} />
            <div style={{ position: "absolute", top: guide.y - 2, left: guide.x + guide.w - CORNER + 2, width: CORNER, height: CORNER, borderTop: "3px solid #3b82f6", borderRight: "3px solid #3b82f6", pointerEvents: "none" }} />
            <div style={{ position: "absolute", top: guide.y + guide.h - CORNER + 2, left: guide.x - 2, width: CORNER, height: CORNER, borderBottom: "3px solid #3b82f6", borderLeft: "3px solid #3b82f6", pointerEvents: "none" }} />
            <div style={{ position: "absolute", top: guide.y + guide.h - CORNER + 2, left: guide.x + guide.w - CORNER + 2, width: CORNER, height: CORNER, borderBottom: "3px solid #3b82f6", borderRight: "3px solid #3b82f6", pointerEvents: "none" }} />

            {/* Stability progress bar (slides in above guide frame) */}
            {stableProgress > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: guide.y - 9,
                  left: guide.x,
                  width: guide.w,
                  height: 4,
                  background: "rgba(255,255,255,0.18)",
                  borderRadius: 2,
                  overflow: "hidden",
                  pointerEvents: "none",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${stableProgress}%`,
                    background: "#3b82f6",
                    borderRadius: 2,
                    transition: "width 0.15s",
                  }}
                />
              </div>
            )}

            {/* Instruction text — below guide frame */}
            <div
              style={{
                position: "absolute",
                top: guide.y + guide.h + 14,
                left: 0, right: 0,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                pointerEvents: "none",
              }}
            >
              <p
                className="text-sm font-semibold text-center px-6 leading-snug"
                style={{
                  color: stableProgress > 0 ? "#93c5fd" : "white",
                  textShadow: "0 1px 6px rgba(0,0,0,0.9)",
                  transition: "color 0.3s",
                }}
              >
                {instruction}
              </p>
              {stableProgress === 0 && (
                <p
                  className="text-xs text-center px-6"
                  style={{ color: "rgba(255,255,255,0.55)", textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}
                >
                  Move closer · Fill the frame · Avoid glare · Hold steady
                </p>
              )}
            </div>
          </>
        )}

        {/* Capturing spinner overlay */}
        {isCapturing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40">
            <Loader2 className="w-10 h-10 text-white animate-spin" />
            <p className="text-white text-sm font-semibold" style={{ textShadow: "0 1px 6px rgba(0,0,0,0.9)" }}>
              Scanning…
            </p>
          </div>
        )}

        {/* Close (X) button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center text-white transition-colors"
          style={{ background: "rgba(0,0,0,0.55)" }}
          aria-label="Close scanner"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ── Bottom bar ──────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0" style={{ background: "#000" }}>

        {/* Manual / timeout options */}
        {isManualOrTimeout && (
          <div className="px-5 pt-4 pb-7">
            {phase === "timeout" && (
              <p className="text-white/60 text-xs text-center mb-3 leading-relaxed">
                Couldn't auto-capture. Take a photo manually or enter fields below.
              </p>
            )}
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <button
                onClick={handleManualCapture}
                disabled={isCapturing || !!cameraError}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold rounded-xl px-5 py-2.5 text-sm transition-colors"
              >
                <Camera className="w-4 h-4" />
                Take Photo
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl px-4 py-2.5 text-sm transition-colors"
              >
                <Upload className="w-4 h-4" />
                Upload Image
              </button>
              <button
                onClick={onClose}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl px-4 py-2.5 text-sm transition-colors"
              >
                <Pencil className="w-4 h-4" />
                Enter Manually
              </button>
            </div>
          </div>
        )}

        {/* Auto-scan status bar (scanning / stable phases) */}
        {!isManualOrTimeout && !isCapturing && (
          <div className="flex items-center justify-between px-5 pt-3.5 pb-6">
            {/* Left: scan status pill */}
            <div className="flex items-center gap-2">
              {stableProgress > 0 ? (
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse flex-shrink-0" />
              ) : (
                <div className="w-2.5 h-2.5 rounded-full border-2 border-white/35 animate-pulse flex-shrink-0" />
              )}
              <span className="text-white/65 text-xs">
                {stableProgress > 0 ? `Scanning… ${stableProgress}%` : "Looking for nameplate…"}
              </span>
            </div>

            {/* Right: quick escape buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
                  setPhase("manual");
                }}
                className="text-white/55 hover:text-white text-xs px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                Take Photo
              </button>
              <span className="text-white/25 text-xs">·</span>
              <button
                onClick={onClose}
                className="text-white/55 hover:text-white text-xs px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                Manual Entry
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Hidden file input — upload fallback */}
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
