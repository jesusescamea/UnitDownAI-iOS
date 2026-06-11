import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useParams } from "wouter";
import { useUser } from "@clerk/clerk-react";
import {
  ChevronRight, Camera, Loader2, AlertTriangle, CheckCircle2,
  ThermometerSnowflake, Save, Trash2, RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

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
}

const emptyForm = (): UnitFormData => ({
  siteCustomerName: "", nickname: "", location: "",
  manufacturer: "", modelNumber: "", serialNumber: "",
  equipmentType: "", systemType: "", refrigerantType: "",
  voltage: "", phase: "", mca: "", mocp: "",
  rla: "", lra: "", capacityTons: "", manufactureDate: "",
  notes: "", nameplateImageUrl: "",
});

function getClientId(): string {
  try { return localStorage.getItem("unitdown_client_id") ?? ""; } catch { return ""; }
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
  const isEdit = !!params.id && params.id !== "new";

  const [form, setForm] = useState<UnitFormData>(emptyForm());
  const [uncertainFields, setUncertainFields] = useState<Set<string>>(new Set());
  const [rawOcrText, setRawOcrText] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingUnit, setLoadingUnit] = useState(isEdit);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const clientId = getClientId();
  const isLoggedIn = isLoaded && !!clerkUser && clientId.startsWith("user_");

  useEffect(() => {
    if (!isEdit || !isLoggedIn) return;
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
          });
        }
      })
      .catch(() => setError("Failed to load unit"))
      .finally(() => setLoadingUnit(false));
  }, [isEdit, isLoggedIn, clientId, params.id]);

  const handleChange = useCallback((name: keyof UnitFormData, val: string) => {
    setForm((prev) => ({ ...prev, [name]: val }));
    if (uncertainFields.has(name)) {
      setUncertainFields((prev) => { const n = new Set(prev); n.delete(name); return n; });
    }
  }, [uncertainFields]);

  const handleScanNameplate = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrLoading(true);
    setOcrError(null);
    setRawOcrText(null);

    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          const b64 = result.split(",")[1];
          if (b64) resolve(b64); else reject(new Error("Failed to read file"));
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });

      const imageBlobUrl = `data:${file.type};base64,${base64}`;

      const res = await fetch("/api/nameplate/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType: file.type }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as any).error ?? "OCR failed");
      }

      const data = await res.json();
      const ext = data.extracted ?? {};

      setRawOcrText(ext.rawText ?? data.rawResponse ?? null);
      const uncertain: Set<string> = new Set(ext.uncertainFields ?? []);
      setUncertainFields(uncertain);

      const fieldMap: Record<string, keyof UnitFormData> = {
        manufacturer: "manufacturer", modelNumber: "modelNumber", serialNumber: "serialNumber",
        equipmentType: "equipmentType", systemType: "systemType", refrigerantType: "refrigerantType",
        voltage: "voltage", phase: "phase", mca: "mca", mocp: "mocp", rla: "rla", lra: "lra",
        capacityTons: "capacityTons", manufactureDate: "manufactureDate",
      };

      setForm((prev) => {
        const updated = { ...prev, nameplateImageUrl: imageBlobUrl };
        for (const [extKey, formKey] of Object.entries(fieldMap)) {
          if (ext[extKey] != null && String(ext[extKey]).trim()) {
            updated[formKey] = String(ext[extKey]).trim();
          }
        }
        return updated;
      });
    } catch (err: any) {
      setOcrError(err.message ?? "OCR failed — please enter fields manually");
    } finally {
      setOcrLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!isLoggedIn) return;
    setSaving(true);
    setError(null);

    const payload = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, v.trim() || null])
    );

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
      const savedId = data.unit?.id ?? params.id;
      navigate(`/records/${savedId}`);
    } catch (err: any) {
      setError(err.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }, [isLoggedIn, isEdit, form, clientId, params.id, navigate]);

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

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(isEdit ? `/records/${params.id}` : "/records")} className="text-slate-400 hover:text-slate-700 p-1">
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
                <ThermometerSnowflake className="w-4 h-4 text-white" />
              </div>
              <span className="font-extrabold text-slate-900 text-sm">{isEdit ? "Edit Unit" : "New Unit"}</span>
            </div>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl h-9 px-4 text-sm"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-3.5 h-3.5 mr-1.5" />Save</>}
          </Button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Scan Nameplate Button */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-4 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm mb-0.5">Scan Nameplate</h3>
              <p className="text-blue-100 text-xs">Take or upload a photo of the equipment nameplate to auto-fill fields.</p>
            </div>
            <Button
              onClick={handleScanNameplate}
              disabled={ocrLoading}
              className="bg-white text-blue-700 hover:bg-blue-50 font-bold rounded-xl h-9 px-3 text-xs flex-shrink-0"
            >
              {ocrLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Camera className="w-3.5 h-3.5 mr-1" />Scan</>}
            </Button>
          </div>
          {ocrLoading && (
            <div className="mt-3 bg-blue-500/40 rounded-xl p-3 text-xs text-blue-100 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Analyzing nameplate — this may take a few seconds…
            </div>
          )}
          {ocrError && (
            <div className="mt-3 bg-red-500/20 border border-red-400/30 rounded-xl p-3 text-xs text-red-100 flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              {ocrError}
            </div>
          )}
          {rawOcrText && !ocrLoading && (
            <details className="mt-3">
              <summary className="text-xs text-blue-200 cursor-pointer hover:text-white select-none">
                View raw OCR text
              </summary>
              <pre className="mt-2 text-xs text-blue-100 bg-blue-500/30 rounded-xl p-3 whitespace-pre-wrap font-mono leading-relaxed max-h-40 overflow-y-auto">
                {rawOcrText}
              </pre>
            </details>
          )}
          {uncertainFields.size > 0 && !ocrLoading && (
            <div className="mt-3 bg-amber-400/20 border border-amber-400/30 rounded-xl p-3 text-xs text-amber-100 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              {uncertainFields.size} field{uncertainFields.size > 1 ? "s" : ""} need confirmation (highlighted below)
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Nameplate image preview */}
        {form.nameplateImageUrl && (
          <div className="relative">
            <img
              src={form.nameplateImageUrl}
              alt="Nameplate"
              className="w-full rounded-2xl border border-slate-200 object-cover max-h-48"
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
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          {isEdit ? "Save Changes" : "Save Unit"}
        </Button>

      </div>
    </div>
  );
}
