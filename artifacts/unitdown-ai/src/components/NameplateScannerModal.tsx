import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { X, Camera, Loader2 } from "lucide-react";

interface Props {
  onCapture: (blob: Blob, previewUrl: string) => void;
  onClose: () => void;
}

// Maps guide-frame display coordinates → intrinsic video pixel coordinates,
// accounting for object-fit: cover scaling.
function getVideoCropCoords(
  video: HTMLVideoElement,
  guide: { x: number; y: number; w: number; h: number },
) {
  const vW = video.videoWidth;
  const vH = video.videoHeight;
  const dW = video.clientWidth;
  const dH = video.clientHeight;

  if (!vW || !vH || !dW || !dH) return guide;

  const scale = Math.max(dW / vW, dH / vH);
  const offsetX = (dW - vW * scale) / 2;
  const offsetY = (dH - vH * scale) / 2;

  const cropX = Math.max(0, (guide.x - offsetX) / scale);
  const cropY = Math.max(0, (guide.y - offsetY) / scale);
  const cropW = Math.min(guide.w / scale, vW - cropX);
  const cropH = Math.min(guide.h / scale, vH - cropY);

  return { x: cropX, y: cropY, w: cropW, h: cropH };
}

// Crop the video frame to the guide region, resize to maxPx, compress to JPEG.
// Returns a Blob (not base64) — caller sends it as multipart/form-data.
async function cropAndCompress(
  video: HTMLVideoElement,
  guide: { x: number; y: number; w: number; h: number },
  maxPx = 1200,
  quality = 0.75,
): Promise<{ blob: Blob; previewUrl: string }> {
  const { x, y, w, h } = getVideoCropCoords(video, guide);

  const scale = Math.min(1, maxPx / Math.max(w, h));
  const outW = Math.max(1, Math.round(w * scale));
  const outH = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  ctx.drawImage(video, x, y, w, h, 0, 0, outW, outH);

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

const CORNER = 22;

export default function NameplateScannerModal({ onCapture, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [size, setSize] = useState({ w: 0, h: 0 });

  // Track container dimensions via ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const sync = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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
        setCameraError(
          err?.name === "NotAllowedError"
            ? "Camera access denied. Allow camera access in your browser settings and try again."
            : err?.name === "NotFoundError"
            ? "No camera found on this device."
            : "Camera unavailable on this device.",
        );
      }
    })();
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Guide frame: landscape nameplate ratio (~16:9), 88% wide, centered slightly above middle
  const guide = useMemo(() => {
    const { w, h } = size;
    if (!w || !h) return null;
    const gW = Math.round(w * 0.88);
    const gH = Math.min(Math.round(gW * 0.54), Math.round(h * 0.5));
    const gX = Math.round((w - gW) / 2);
    const gY = Math.round((h - gH) / 2) - Math.round(h * 0.05);
    return { x: gX, y: gY, w: gW, h: gH };
  }, [size]);

  const handleCapture = useCallback(async () => {
    if (!videoRef.current || !guide || capturing) return;
    setCapturing(true);
    try {
      const result = await cropAndCompress(videoRef.current, guide);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      onCapture(result.blob, result.previewUrl);
    } catch (err: any) {
      setCameraError(err.message ?? "Capture failed. Please try again.");
      setCapturing(false);
    }
  }, [guide, capturing, onCapture]);

  const disabled = capturing || !!cameraError || !guide;

  return (
    <div
      className="fixed inset-0 z-[200] bg-black flex flex-col"
      style={{ touchAction: "none" }}
    >
      {/* Camera viewport */}
      <div ref={containerRef} className="relative flex-1 overflow-hidden">
        {/* Live video */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Camera error state */}
        {cameraError && (
          <div className="absolute inset-0 flex items-center justify-center p-8 bg-black/80">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center max-w-xs">
              <p className="text-white text-sm font-semibold leading-relaxed">
                {cameraError}
              </p>
            </div>
          </div>
        )}

        {/* Guide frame + vignette overlay */}
        {guide && (
          <>
            {/* Dark vignette punched through by guide frame */}
            <div
              style={{
                position: "absolute",
                top: guide.y,
                left: guide.x,
                width: guide.w,
                height: guide.h,
                borderRadius: 10,
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.60)",
                border: "1.5px dashed rgba(255,255,255,0.5)",
                pointerEvents: "none",
              }}
            />

            {/* Blue corner markers */}
            <div style={{ position: "absolute", top: guide.y - 2, left: guide.x - 2, width: CORNER, height: CORNER, borderTop: "3px solid #3b82f6", borderLeft: "3px solid #3b82f6", pointerEvents: "none" }} />
            <div style={{ position: "absolute", top: guide.y - 2, left: guide.x + guide.w - CORNER + 2, width: CORNER, height: CORNER, borderTop: "3px solid #3b82f6", borderRight: "3px solid #3b82f6", pointerEvents: "none" }} />
            <div style={{ position: "absolute", top: guide.y + guide.h - CORNER + 2, left: guide.x - 2, width: CORNER, height: CORNER, borderBottom: "3px solid #3b82f6", borderLeft: "3px solid #3b82f6", pointerEvents: "none" }} />
            <div style={{ position: "absolute", top: guide.y + guide.h - CORNER + 2, left: guide.x + guide.w - CORNER + 2, width: CORNER, height: CORNER, borderBottom: "3px solid #3b82f6", borderRight: "3px solid #3b82f6", pointerEvents: "none" }} />

            {/* Instruction text below guide frame */}
            <div
              style={{
                position: "absolute",
                top: guide.y + guide.h + 16,
                left: 0,
                right: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                pointerEvents: "none",
              }}
            >
              <p
                className="text-white text-sm font-semibold text-center px-6 leading-snug"
                style={{ textShadow: "0 1px 6px rgba(0,0,0,0.9)" }}
              >
                Center the equipment data plate inside the frame
              </p>
              <p
                className="text-xs text-center px-6"
                style={{ color: "rgba(255,255,255,0.65)", textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}
              >
                Move closer · Fill the frame · Avoid glare · Retake if blurry
              </p>
            </div>
          </>
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

      {/* Capture bar */}
      <div
        className="flex-shrink-0 flex flex-col items-center justify-center gap-2"
        style={{ background: "#000", paddingTop: 28, paddingBottom: 36 }}
      >
        <button
          onClick={handleCapture}
          disabled={disabled}
          aria-label="Capture nameplate"
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            border: "4px solid rgba(255,255,255,0.35)",
            boxShadow: "0 0 0 3px rgba(255,255,255,0.15)",
            background: "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: disabled ? 0.35 : 1,
            cursor: disabled ? "not-allowed" : "pointer",
            transition: "transform 0.1s, opacity 0.2s",
          }}
        >
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: "50%",
              background: capturing ? "transparent" : "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {capturing ? (
              <Loader2 className="w-7 h-7 text-white animate-spin" />
            ) : (
              <Camera className="w-6 h-6 text-slate-800" />
            )}
          </div>
        </button>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>
          {capturing ? "Processing…" : "Tap to scan"}
        </p>
      </div>
    </div>
  );
}
