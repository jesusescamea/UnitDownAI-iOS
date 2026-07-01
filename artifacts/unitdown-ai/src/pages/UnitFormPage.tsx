import { useState, useEffect, useCallback } from "react";
import { useLocation, useParams } from "wouter";
import { trackUnitSaved, maybeRequestReview } from "@/lib/appReview";
import { awardReward } from "@/lib/rewards";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@clerk/clerk-react";
import {
  ChevronRight, Camera, Loader2, AlertTriangle, CheckCircle2,
  ThermometerSnowflake, Save, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import NameplateScannerModal from "@/components/NameplateScannerModal";
import { DuplicateModal, type DuplicateEntry } from "@/components/DuplicateModal";
import { AppNav } from "@/components/AppNav";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UnitFormData {
  siteCustomerName: string;
  nickname: string;
  location: string;
  manufacturer: string;
  modelNumber: string;
  serialNumber: string;
  equipmentType: string;
  systemType: string;
  refrigerantType: string;
  voltage: string;
  phase: string;
  mca: string;
  mocp: string;
  rla: string;
  lra: string;
  capacityTons: string;
  manufactureDate: string;
  notes: string;
  nameplateImageUrl: string;
  nameplatePreviewUrl: string;
}

const emptyForm = (): UnitFormData => ({
  siteCustomerName: "", nickname: "", location: "",
  manufacturer: "", modelNumber: "", serialNumber: "",
  // nameplatePreviewUrl/nameplateImageUrl populated after scan/upload
  equipmentType: "", systemType: "", refrigerantType: "",
  voltage: "", phase: "", mca: "", mocp: "",
  rla: "", lra: "", capacityTons: "", manufactureDate: "",
  notes: "", nameplateImageUrl: "", nameplatePreviewUrl: "",
});

function getClientId(): string {
  try { return localStorage.getItem("unitdown_client_id") ?? ""; } catch { return ""; }
}

// ─── Nameplate image storage ──────────────────────────────────────────────────
// Uploads the captured blob to object storage and returns a persistent URL
// that is valid across all devices and sessions.
// Throws on failure so the caller can fall back gracefully.

/**
 * Generates a compressed WebP (or JPEG fallback) preview of a nameplate blob.
 * Resizes to maxPx on the longest side.  Never throws — returns original on failure.
 */
async function generateNameplatePreview(blob: Blob, maxPx = 900, quality = 0.72): Promise<Blob> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const s = Math.min(1, maxPx / Math.max(img.width || 1, img.height || 1));
      const w = Math.max(1, Math.round(img.width * s));
      const h = Math.max(1, Math.round(img.height * s));
      const cvs = document.createElement("canvas");
      cvs.width = w;
      cvs.height = h;
      const ctx = cvs.getContext("2d");
      if (!ctx) { resolve(blob); return; }
      ctx.drawImage(img, 0, 0, w, h);
      cvs.toBlob(
        (b) => {
          if (b && b.size > 0) { resolve(b); return; }
          // WebP unsupported — fall back to JPEG
          cvs.toBlob((bj) => resolve(bj ?? blob), "image/jpeg", quality);
        },
        "image/webp",
        quality,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(blob); };
    img.src = url;
  });
}

async function uploadNameplateBlob(blob: Blob, filename = "nameplate.jpg"): Promise<string> {
  const contentType = blob.type || "image/jpeg";
  const file = new File([blob], filename, { type: contentType });

  // 1. Request a presigned GCS upload URL
  const urlRes = await fetch("/api/storage/uploads/request-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
  });
  if (!urlRes.ok) throw new Error("Failed to get upload URL");
  const { uploadURL, objectPath } = (await urlRes.json()) as { uploadURL: string; objectPath: string };

  // 2. PUT directly to GCS via presigned URL
  const putRes = await fetch(uploadURL, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });
  if (!putRes.ok) throw new Error("Storage upload failed");

  // 3. Return the persistent serving URL
  return `/api/storage${objectPath}`;
}

// ─── Form field component ─────────────────────────────────────────────────────

function Field({
  label, name, value, onChange, placeholder, uncertain, hint, type = "text",
}: {
  label: string; name: keyof UnitFormData; value: string; placeholder?: string;
  onChange: (name: keyof UnitFormData, val: string) => void;
  uncertain?: boolean; hint?: string; type?: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <Label className="text-xs font-semibold text-slate-700">{label}</Label>
        {uncertain && (
          <span className="flex items-center gap-0.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full font-medium">
            <AlertTriangle className="w-2.5 h-2.5" />
            Needs confirmation
          </span>
        )}
      </div>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        placeholder={placeholder}
        className={`h-10 text-sm rounded-xl ${uncertain ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"}`}
      />
      {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="pt-2">
      <h3 className="text-sm font-extrabold text-slate-800">{title}</h3>
      {desc && <p className="text-xs text-slate-400 mt-0.5">{desc}</p>}
      <div className="mt-2 border-t border-slate-100" />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function UnitFormPage() {
  const [, navigate] = useLocation();
  const params = useParams<{ id?: string }>();
  const { user: clerkUser, isLoaded } = useUser();
  const { toast } = useToast();
  const isEdit = !!params.id && params.id !== "new";

  // Pre-fill customer name from query param when creating from Customers page
  const initialForm = (): UnitFormData => {
    const f = emptyForm();
    if (!isEdit) {
      const params = new URLSearchParams(window.location.search);
      const customerName = params.get("customerName");
      if (customerName) f.siteCustomerName = customerName;
    }
    return f;
  };

  const [form, setForm] = useState<UnitFormData>(initialForm);
  const [uncertainFields, setUncertainFields] = useState<Set<string>>(new Set());
  const [rawOcrText, setRawOcrText] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrConfidence, setOcrConfidence] = useState<number | null>(null);
  const [ocrFieldCount, setOcrFieldCount] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingUnit, setLoadingUnit] = useState(isEdit);
  const [error, setError] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);

  // ── Duplicate detection state ─────────────────────────────────────────────
  const [duplicates, setDuplicates] = useState<DuplicateEntry[]>([]);
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);

  const clientId = clerkUser?.id ?? getClientId();
  const isLoggedIn = isLoaded && !!clerkUser;

  useEffect(() => {
    if (!isLoaded) return;
    if (!isEdit || !isLoggedIn) { setLoadingUnit(false); return; }
    fetch(`/api/units/${params.id}?clientId=${encodeURIComponent(clientId)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.unit) {
          const u = d.unit;
          setForm({
            siteCustomerName: u.siteCustomerName ?? "",
            nickname: u.nickname ?? "",
            location: u.location ?? "",
            manufacturer: u.manufacturer ?? "",
            modelNumber: u.modelNumber ?? "",
            serialNumber: u.serialNumber ?? "",
            equipmentType: u.equipmentType ?? "",
            systemType: u.systemType ?? "",
            refrigerantType: u.refrigerantType ?? "",
            voltage: u.voltage ?? "",
            phase: u.phase ?? "",
            mca: u.mca ?? "",
            mocp: u.mocp ?? "",
            rla: u.rla ?? "",
            lra: u.lra ?? "",
            capacityTons: u.capacityTons ?? "",
            manufactureDate: u.manufactureDate ?? "",
            notes: u.notes ?? "",
            nameplateImageUrl: u.nameplateImageUrl ?? "",
            nameplatePreviewUrl: u.nameplatePreviewUrl ?? "",
          });
        }
      })
      .catch(() => setError("Failed to load unit"))
      .finally(() => setLoadingUnit(false));
  }, [isLoaded, isEdit, isLoggedIn, clientId, params.id]);

  const handleChange = useCallback((name: keyof UnitFormData, val: string) => {
    setForm((prev) => ({ ...prev, [name]: val }));
    if (uncertainFields.has(name)) {
      setUncertainFields((prev) => { const n = new Set(prev); n.delete(name); return n; });
    }
  }, [uncertainFields]);

  const handleScanNameplate = useCallback(() => {
    setScannerOpen(true);
  }, []);

  // ── OCR capture handler ───────────────────────────────────────────────────
  const handleCapture = useCallback(async (blob: Blob, previewUrl: string) => {
    setScannerOpen(false);
    setOcrLoading(true);
    setOcrError(null);
    setRawOcrText(null);
    setOcrConfidence(null);
    setOcrFieldCount(null);

    // Show the blob URL immediately so the preview appears while work runs in the background.
    // This will be replaced with the persistent storage URL before the form is saved.
    setForm((prev) => ({ ...prev, nameplateImageUrl: previewUrl }));

    try {
      const fd = new FormData();
      fd.append("file", blob, "nameplate.jpg");

      // Run OCR and storage upload in parallel — neither depends on the other
      const [ocrResult, storageResult, previewStorageResult] = await Promise.allSettled([
        fetch("/api/nameplate/ocr", { method: "POST", body: fd }).then(async (res) => {
          if (!res.ok) {
            const d = await res.json().catch(() => ({}));
            throw new Error((d as any).error ?? "OCR failed");
          }
          return res.json();
        }),
        uploadNameplateBlob(blob, "nameplate.jpg"),
        generateNameplatePreview(blob).then((preview) =>
          uploadNameplateBlob(preview, "nameplate-preview.webp")
        ),
      ]);

      // Replace the temporary blob URL with the persistent storage URL.
      // If storage upload fails, fall back to the blob URL and log the failure.
      if (storageResult.status === "fulfilled") {
        setForm((prev) => ({ ...prev, nameplateImageUrl: storageResult.value }));
      } else {
        console.error("[Nameplate] Storage upload failed — blob URL used (not persistent):", storageResult.reason);
      }
      if (previewStorageResult.status === "fulfilled") {
        setForm((prev) => ({ ...prev, nameplatePreviewUrl: previewStorageResult.value }));
      }

      if (ocrResult.status === "rejected") {
        throw ocrResult.reason;
      }

      const data = ocrResult.value;
      const ext = data.extracted ?? {};

      if (typeof ext.error === "string") {
        throw new Error(ext.error);
      }

      const confidence = typeof ext.confidence === "number" ? ext.confidence : null;
      setOcrConfidence(confidence);
      setRawOcrText(ext.rawText ?? data.rawResponse ?? null);

      const uncertain: Set<string> = new Set([
        ...(ext.reviewFields ?? ext.uncertainFields ?? []),
        ...(ext.missing_fields ?? []),
      ] as string[]);
      setUncertainFields(uncertain);

      const fieldMap: Record<string, keyof UnitFormData> = {
        manufacturer:    "manufacturer",
        modelNumber:     "modelNumber",
        serialNumber:    "serialNumber",
        equipmentType:   "equipmentType",
        systemType:      "systemType",
        refrigerantType: "refrigerantType",
        voltage:         "voltage",
        phase:           "phase",
        mca:             "mca",
        mocp:            "mocp",
        rla:             "rla",
        lra:             "lra",
        capacityTons:    "capacityTons",
        manufactureDate: "manufactureDate",
      };

      let filled = 0;
      setForm((prev) => {
        const updated = { ...prev };
        for (const [extKey, formKey] of Object.entries(fieldMap)) {
          if (ext[extKey] != null && String(ext[extKey]).trim()) {
            updated[formKey] = String(ext[extKey]).trim();
            filled++;
          }
        }
        return updated;
      });
      setOcrFieldCount(filled);

      if (filled === 0) {
        setOcrError(
          "No readable nameplate data could be extracted. Please retake the photo closer to the data plate."
        );
      }
    } catch (err: any) {
      setOcrError(err.message ?? "OCR failed — please enter fields manually");
    } finally {
      setOcrLoading(false);
    }
  }, []);

  // ── Build the POST/PATCH payload from form state ──────────────────────────
  const buildPayload = useCallback(() =>
    Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim() || null])),
  [form]);

  // ── Core POST/PATCH save (no duplicate check) ─────────────────────────────
  const performSave = useCallback(async (payload: Record<string, unknown>) => {
    setSaving(true);
    setError(null);
    try {
      let res: Response;
      if (isEdit) {
        res = await fetch(`/api/units/${params.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId, unit: payload }),
        });
      } else {
        res = await fetch("/api/units", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId, unit: payload }),
        });
      }
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as any).error ?? "Save failed");
      }
      const data = await res.json();
      trackUnitSaved();
      void maybeRequestReview("unit_saved");
      // Award first_unit_saved bonus (idempotent — fires only on first unit)
      if (!isEdit) {
        awardReward(clientId, "first_unit_saved").then((result) => {
          if (result?.bonusCredits) {
            toast({ description: `+${result.bonusCredits} diagnostic credits added!` });
          }
        }).catch(() => {});
      }
      navigate(`/records/${data.unit?.id ?? params.id}`);
    } catch (err: any) {
      setError(err.message ?? "Save failed");
      setSaving(false);
    }
    // No setSaving(false) on success — navigation unmounts the component
  }, [isEdit, params.id, clientId, navigate]);

  // ── Main save handler — runs duplicate check first ────────────────────────
  const handleSave = useCallback(async () => {
    if (!isLoggedIn) return;
    setSaving(true);
    setError(null);

    const payload = buildPayload();

    // Run duplicate detection (fail-open: if the check itself errors, proceed with save)
    try {
      const checkRes = await fetch("/api/units/check-duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          unit: payload,
          ...(isEdit && params.id ? { excludeId: params.id } : {}),
        }),
      });
      if (checkRes.ok) {
        const { duplicates: found } = (await checkRes.json()) as { duplicates: DuplicateEntry[] };
        if (found?.length > 0) {
          setDuplicates(found);
          setDuplicateModalOpen(true);
          setSaving(false);
          return; // pause — let the user decide
        }
      }
    } catch {
      // Duplicate check failed — proceed with save anyway (fail-open)
    }

    setSaving(false);
    await performSave(payload);
  }, [isLoggedIn, isEdit, params.id, clientId, buildPayload, performSave]);

  // ── Duplicate modal: "Open Existing Unit" ─────────────────────────────────
  const handleOpenExisting = useCallback((id: string) => {
    setDuplicateModalOpen(false);
    navigate(`/records/${id}`);
  }, [navigate]);

  // ── Duplicate modal: "Update Existing Unit" ───────────────────────────────
  // PATCHes the EXISTING unit (not the current form's unit) with the current form data.
  const handleUpdateExisting = useCallback(async (existingId: string) => {
    setDuplicateModalOpen(false);
    setSaving(true);
    setError(null);
    const payload = buildPayload();
    try {
      const res = await fetch(`/api/units/${existingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, unit: payload }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as any).error ?? "Update failed");
      }
      navigate(`/records/${existingId}`);
    } catch (err: any) {
      setError(err.message ?? "Update failed");
      setSaving(false);
    }
  }, [clientId, navigate, buildPayload]);

  // ── Duplicate modal: "Create New Anyway" / "Continue Saving" ─────────────
  const handleCreateNew = useCallback(async () => {
    setDuplicateModalOpen(false);
    await performSave(buildPayload());
  }, [performSave, buildPayload]);

  // ── Guards ────────────────────────────────────────────────────────────────
  if (!isLoaded || loadingUnit) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <p className="font-bold text-slate-700 mb-4">Sign in to save unit records</p>
        <Button onClick={() => navigate("/login")} className="bg-blue-600 text-white font-bold rounded-xl">Sign In</Button>
      </div>
    );
  }

  const scanSucceeded = ocrFieldCount != null && ocrFieldCount > 0 && !ocrLoading && !ocrError;

  return (
    <div className="min-h-screen bg-slate-50 pb-24">

      {/* Duplicate detection modal */}
      {duplicateModalOpen && duplicates.length > 0 && (
        <DuplicateModal
          duplicates={duplicates}
          isEdit={isEdit}
          onOpenExisting={handleOpenExisting}
          onUpdateExisting={handleUpdateExisting}
          onCreateNew={handleCreateNew}
          onClose={() => setDuplicateModalOpen(false)}
        />
      )}

      {/* Nav */}
      <AppNav active="records" />
      {/* Page sub-header */}
      <div className="bg-white dark:bg-gray-900 border-b border-slate-200 dark:border-gray-800 sticky top-14 z-30">
        <div className="max-w-2xl mx-auto px-4 h-11 flex items-center justify-between">
          <button
            onClick={() => navigate(isEdit ? `/records/${params.id}` : "/records")}
            className="flex items-center gap-1 text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white text-sm font-medium transition-colors"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            <span>{isEdit ? "Edit Unit" : "New Unit"}</span>
          </button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl h-8 px-3 text-xs"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Save className="w-3 h-3 mr-1" />Save</>}
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Scan Nameplate Card */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-4 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm mb-0.5">Scan Nameplate</h3>
              <p className="text-blue-100 text-xs">
                Point camera at the equipment data plate. Fields auto-fill from the nameplate only.
              </p>
            </div>
            <Button
              onClick={handleScanNameplate}
              disabled={ocrLoading}
              className="bg-white text-blue-700 hover:bg-blue-50 font-bold rounded-xl h-9 px-3 text-xs flex-shrink-0"
            >
              {ocrLoading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <><Camera className="w-3.5 h-3.5 mr-1" />Scan</>}
            </Button>
          </div>

          {ocrLoading && (
            <div className="mt-3 bg-blue-500/40 rounded-xl p-3 text-xs text-blue-100 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
              Reading nameplate — extracting equipment data…
            </div>
          )}

          {ocrError && (
            <div className="mt-3 bg-red-500/20 border border-red-400/30 rounded-xl p-3 text-xs text-red-100 flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              {ocrError}
            </div>
          )}

          {scanSucceeded && (
            <div className="mt-3 bg-green-500/20 border border-green-400/30 rounded-xl p-3 text-xs text-green-100 flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>
                Extracted {ocrFieldCount} field{ocrFieldCount !== 1 ? "s" : ""}
                {ocrConfidence != null ? ` · ${ocrConfidence}% confidence` : ""}.
                {uncertainFields.size > 0 && ` ${uncertainFields.size} field${uncertainFields.size > 1 ? "s" : ""} need${uncertainFields.size === 1 ? "s" : ""} confirmation.`}
              </span>
            </div>
          )}

          {uncertainFields.size > 0 && !ocrLoading && (
            <div className="mt-2 bg-amber-400/20 border border-amber-400/30 rounded-xl p-3 text-xs text-amber-100 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              {uncertainFields.size} field{uncertainFields.size > 1 ? "s" : ""} highlighted below — verify before saving
            </div>
          )}

          {rawOcrText && !ocrLoading && (
            <details className="mt-3">
              <summary className="text-xs text-blue-200 cursor-pointer hover:text-white select-none">
                View raw nameplate text
              </summary>
              <pre className="mt-2 text-xs text-blue-100 bg-blue-500/30 rounded-xl p-3 whitespace-pre-wrap font-mono leading-relaxed max-h-40 overflow-y-auto">
                {rawOcrText}
              </pre>
            </details>
          )}
        </div>

        {scannerOpen && (
          <NameplateScannerModal
            onCapture={handleCapture}
            onClose={() => setScannerOpen(false)}
          />
        )}

        {/* Nameplate image preview */}
        {form.nameplateImageUrl && (
          <div className="relative">
            <img
              src={form.nameplateImageUrl}
              alt="Nameplate"
              className="w-full rounded-2xl border border-slate-200 object-cover max-h-48"
              onError={(e) => {
                const img = e.currentTarget;
                if (!img.dataset.errored) {
                  img.dataset.errored = "1";
                  console.warn("[Nameplate] Image failed to load:", form.nameplateImageUrl);
                  img.style.display = "none";
                }
              }}
            />
            <button
              onClick={() => handleChange("nameplateImageUrl", "")}
              className="absolute top-2 right-2 bg-slate-900/60 text-white rounded-full p-1 hover:bg-slate-900/80"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Section: Identification */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <SectionHeader title="Identification" desc="Site, customer, and unit name" />
          <Field label="Site / Customer Name" name="siteCustomerName" value={form.siteCustomerName} onChange={handleChange} placeholder="e.g. Westgate Office Park" />
          <Field label="Unit Nickname" name="nickname" value={form.nickname} onChange={handleChange} placeholder="e.g. RTU-3 (roof)" />
          <Field label="Location" name="location" value={form.location} onChange={handleChange} placeholder="e.g. Roof — South end" />
        </div>

        {/* Section: Equipment */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <SectionHeader title="Equipment Info" desc="Nameplate details" />
          <Field label="Manufacturer / Brand" name="manufacturer" value={form.manufacturer} onChange={handleChange} placeholder="e.g. Carrier, Trane, York" uncertain={uncertainFields.has("manufacturer")} />
          <Field label="Model Number" name="modelNumber" value={form.modelNumber} onChange={handleChange} placeholder="e.g. 50XC-036-5-15" uncertain={uncertainFields.has("modelNumber")} />
          <Field label="Serial Number" name="serialNumber" value={form.serialNumber} onChange={handleChange} placeholder="" uncertain={uncertainFields.has("serialNumber")} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Equipment Type" name="equipmentType" value={form.equipmentType} onChange={handleChange} placeholder="e.g. RTU, Split" uncertain={uncertainFields.has("equipmentType")} />
            <Field label="System Type" name="systemType" value={form.systemType} onChange={handleChange} placeholder="Heat pump / Gas heat" uncertain={uncertainFields.has("systemType")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Refrigerant Type" name="refrigerantType" value={form.refrigerantType} onChange={handleChange} placeholder="e.g. R-410A" uncertain={uncertainFields.has("refrigerantType")} />
            <Field label="Capacity (Tons)" name="capacityTons" value={form.capacityTons} onChange={handleChange} placeholder="e.g. 5" uncertain={uncertainFields.has("capacityTons")} />
          </div>
          <Field label="Manufacture Date" name="manufactureDate" value={form.manufactureDate} onChange={handleChange} placeholder="e.g. 2019-06 or June 2019" uncertain={uncertainFields.has("manufactureDate")} />
        </div>

        {/* Section: Electrical */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <SectionHeader title="Electrical Data" desc="From the nameplate" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Voltage" name="voltage" value={form.voltage} onChange={handleChange} placeholder="e.g. 208-230/1/60" uncertain={uncertainFields.has("voltage")} />
            <Field label="Phase" name="phase" value={form.phase} onChange={handleChange} placeholder="1 or 3" uncertain={uncertainFields.has("phase")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="MCA" name="mca" value={form.mca} onChange={handleChange} placeholder="Min. Circuit Amps" uncertain={uncertainFields.has("mca")} />
            <Field label="MOCP" name="mocp" value={form.mocp} onChange={handleChange} placeholder="Max Fuse / Breaker" uncertain={uncertainFields.has("mocp")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="RLA / FLA" name="rla" value={form.rla} onChange={handleChange} placeholder="Rated Load Amps" uncertain={uncertainFields.has("rla")} />
            <Field label="LRA" name="lra" value={form.lra} onChange={handleChange} placeholder="Locked Rotor Amps" uncertain={uncertainFields.has("lra")} />
          </div>
        </div>

        {/* Section: Notes */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <SectionHeader title="Notes" />
          <Textarea
            value={form.notes}
            onChange={(e) => handleChange("notes", e.target.value)}
            placeholder="Any additional notes about this unit…"
            className="text-sm rounded-xl border-slate-200 resize-none"
            rows={3}
          />
        </div>

        {/* Save button (bottom) */}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl h-12 text-sm"
        >
          {saving ? <Loader2 className="w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          {isEdit ? "Save Changes" : "Save Unit"}
        </Button>

      </div>
    </div>
  );
}
