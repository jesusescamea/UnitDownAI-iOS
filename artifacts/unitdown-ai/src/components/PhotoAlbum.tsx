import { useState, useEffect, useRef, useCallback } from "react";
import {
  Camera, Upload, X, ChevronLeft, ChevronRight, Trash2,
  Loader2, ImagePlus, ScanText, Edit3, Check, AlertCircle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

const PHOTO_CATEGORIES = [
  { id: "nameplate",       label: "Nameplate" },
  { id: "wiring_diagram",  label: "Wiring Diagram" },
  { id: "schematic",       label: "Schematic" },
  { id: "technician_notes",label: "Tech Notes" },
  { id: "controls_board",  label: "Controls / Board" },
  { id: "dip_switches",    label: "DIP Switches" },
  { id: "electrical",      label: "Electrical" },
  { id: "gas_heat",        label: "Gas Heat" },
  { id: "compressor",      label: "Compressor" },
  { id: "economizer",      label: "Economizer" },
  { id: "before_repair",   label: "Before Repair" },
  { id: "after_repair",    label: "After Repair" },
  { id: "other",           label: "Other" },
] as const;

type CategoryId = (typeof PHOTO_CATEGORIES)[number]["id"];

interface UnitPhoto {
  id: string;
  unitId: string;
  userId: string;
  objectPath: string;
  imageUrl: string;
  category: string;
  note: string | null;
  ocrText: string | null;
  createdAt: string;
  updatedAt: string;
}

function categoryLabel(id: string): string {
  return PHOTO_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

// ─── Client-side image compression ───────────────────────────────────────────
// Resizes to max 1400px on longest edge, encodes as JPEG at 0.82 quality.
// Returns a File object with the same name but .jpg extension.

async function compressImage(original: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(original);

    img.onload = () => {
      const MAX = 1400;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
        else                 { width = Math.round((width * MAX) / height); height = MAX; }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { URL.revokeObjectURL(url); resolve(original); return; }
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          if (!blob) { resolve(original); return; }
          const name = original.name.replace(/\.[^.]+$/, "") + ".jpg";
          resolve(new File([blob], name, { type: "image/jpeg" }));
        },
        "image/jpeg",
        0.82,
      );
    };

    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image load failed")); };
    img.src = url;
  });
}

// ─── Upload helpers ───────────────────────────────────────────────────────────

async function requestPresignedUrl(file: File): Promise<{ uploadURL: string; objectPath: string }> {
  const res = await fetch("/api/storage/uploads/request-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
  });
  if (!res.ok) throw new Error("Failed to get upload URL");
  return res.json();
}

async function uploadToGcs(file: File, uploadURL: string): Promise<void> {
  const res = await fetch(uploadURL, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });
  if (!res.ok) throw new Error("Upload to storage failed");
}

// ─── AddPhotoSheet ────────────────────────────────────────────────────────────

interface AddPhotoSheetProps {
  unitId: string;
  clientId: string;
  onAdded: (photo: UnitPhoto) => void;
  onClose: () => void;
  defaultCategory?: CategoryId;
}

function AddPhotoSheet({ unitId, clientId, onAdded, onClose, defaultCategory }: AddPhotoSheetProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [category, setCategory] = useState<CategoryId>(defaultCategory ?? "other");
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelected = useCallback(async (file: File) => {
    setError(null);
    const compressed = await compressImage(file).catch(() => file);
    setSelectedFile(compressed);
    const url = URL.createObjectURL(compressed);
    setPreview(url);
  }, []);

  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview); };
  }, [preview]);

  const handleSave = useCallback(async () => {
    if (!selectedFile) return;
    setUploading(true);
    setError(null);
    try {
      const { uploadURL, objectPath } = await requestPresignedUrl(selectedFile);
      await uploadToGcs(selectedFile, uploadURL);

      const res = await fetch(`/api/units/${unitId}/photos?clientId=${encodeURIComponent(clientId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objectPath, category, note: note.trim() || undefined }),
      });
      if (!res.ok) throw new Error("Failed to save photo metadata");
      const { photo } = await res.json();
      onAdded(photo);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }, [selectedFile, unitId, clientId, category, note, onAdded, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div
        className="w-full bg-white rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        <div className="px-5 pb-8 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between pt-1">
            <h2 className="text-base font-extrabold text-slate-900">Add Photo</h2>
            <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* Image picker / preview */}
          {!preview ? (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl py-8 text-slate-500 hover:border-blue-300 hover:text-blue-600 active:bg-slate-100 transition-colors"
              >
                <Camera className="w-7 h-7" />
                <span className="text-sm font-bold">Take Photo</span>
              </button>
              <button
                onClick={() => galleryInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl py-8 text-slate-500 hover:border-blue-300 hover:text-blue-600 active:bg-slate-100 transition-colors"
              >
                <Upload className="w-7 h-7" />
                <span className="text-sm font-bold">Choose File</span>
              </button>
            </div>
          ) : (
            <div className="relative rounded-2xl overflow-hidden">
              <img src={preview} alt="Preview" className="w-full max-h-64 object-cover" />
              <button
                onClick={() => { setSelectedFile(null); setPreview(null); }}
                className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Hidden inputs */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelected(f); e.target.value = ""; }}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelected(f); e.target.value = ""; }}
          />

          {/* Category chips */}
          <div>
            <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wide mb-2">Category</p>
            <div className="flex flex-wrap gap-1.5">
              {PHOTO_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                    category === cat.id
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Caption */}
          <div>
            <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wide mb-2">Caption (optional)</p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. T1 going to compressor common, measured 12Ω"
              maxLength={1000}
              rows={2}
              className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={!selectedFile || uploading}
            className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white font-extrabold rounded-2xl py-3.5 text-sm flex items-center justify-center gap-2 transition-colors"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <ImagePlus className="w-4 h-4" />
                Save Photo
              </>
            )}
          </button>

          {selectedFile && !uploading && (
            <p className="text-center text-xs text-slate-400">
              OCR will extract any readable text automatically
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────

interface LightboxProps {
  photos: UnitPhoto[];
  startIndex: number;
  clientId: string;
  onClose: () => void;
  onDelete: (id: string) => void;
  onUpdated: (photo: UnitPhoto) => void;
}

function Lightbox({ photos, startIndex, clientId, onClose, onDelete, onUpdated }: LightboxProps) {
  const [idx, setIdx] = useState(startIndex);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [noteText, setNoteText] = useState(photos[idx]?.note ?? "");
  const [savingNote, setSavingNote] = useState(false);

  const photo = photos[idx];
  if (!photo) return null;

  const prev = () => { setIdx((i) => Math.max(0, i - 1)); setConfirmDelete(false); setEditingNote(false); };
  const next = () => { setIdx((i) => Math.min(photos.length - 1, i + 1)); setConfirmDelete(false); setEditingNote(false); };

  // Sync note text when switching photos
  useEffect(() => {
    setNoteText(photos[idx]?.note ?? "");
    setEditingNote(false);
  }, [idx, photos]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/units/${photo.unitId}/photos/${photo.id}?clientId=${encodeURIComponent(clientId)}`,
        { method: "DELETE" },
      );
      if (res.ok) {
        onDelete(photo.id);
        if (photos.length <= 1) { onClose(); return; }
        setIdx((i) => Math.max(0, i - 1));
        setConfirmDelete(false);
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveNote = async () => {
    setSavingNote(true);
    try {
      const res = await fetch(
        `/api/units/${photo.unitId}/photos/${photo.id}?clientId=${encodeURIComponent(clientId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note: noteText }),
        },
      );
      if (res.ok) {
        const { photo: updated } = await res.json();
        onUpdated(updated);
        setEditingNote(false);
      }
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col" onClick={onClose}>
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-black/80"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="text-white p-1.5">
          <X className="w-5 h-5" />
        </button>
        <div className="text-center">
          <p className="text-white text-sm font-bold">{categoryLabel(photo.category)}</p>
          <p className="text-white/50 text-xs">{idx + 1} / {photos.length}</p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); setConfirmDelete((v) => !v); }}
          className="text-white/60 hover:text-red-400 p-1.5 transition-colors"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Image */}
      <div className="flex-1 flex items-center justify-center relative" onClick={(e) => e.stopPropagation()}>
        <img
          src={photo.imageUrl}
          alt={photo.note ?? categoryLabel(photo.category)}
          className="max-w-full max-h-full object-contain"
        />

        {/* Prev / Next */}
        {idx > 0 && (
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-2"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        {idx < photos.length - 1 && (
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-2"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Bottom info panel */}
      <div className="bg-black/80 px-4 py-4 space-y-3 max-h-64 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Date */}
        <p className="text-white/40 text-xs">
          {new Date(photo.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
        </p>

        {/* Caption */}
        {editingNote ? (
          <div className="space-y-2">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add a note…"
              rows={2}
              autoFocus
              className="w-full bg-white/10 text-white text-sm rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400 placeholder-white/30"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveNote}
                disabled={savingNote}
                className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-bold rounded-xl px-3 py-1.5 disabled:opacity-50"
              >
                {savingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Save
              </button>
              <button
                onClick={() => { setEditingNote(false); setNoteText(photo.note ?? ""); }}
                className="text-white/50 text-xs px-3 py-1.5"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setEditingNote(true)}
            className="flex items-start gap-2 w-full text-left"
          >
            {photo.note ? (
              <p className="text-white/90 text-sm leading-relaxed flex-1">{photo.note}</p>
            ) : (
              <p className="text-white/30 text-sm italic flex-1">Add a caption…</p>
            )}
            <Edit3 className="w-3.5 h-3.5 text-white/30 flex-shrink-0 mt-0.5" />
          </button>
        )}

        {/* OCR text */}
        {photo.ocrText && (
          <div className="bg-white/5 rounded-xl px-3 py-2.5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <ScanText className="w-3.5 h-3.5 text-white/40" />
              <p className="text-xs font-bold text-white/40 uppercase tracking-wide">Extracted Text</p>
            </div>
            <p className="text-white/70 text-xs leading-relaxed font-mono whitespace-pre-wrap">{photo.ocrText}</p>
          </div>
        )}

        {/* Delete confirmation */}
        {confirmDelete && (
          <div className="bg-red-900/80 rounded-xl px-3 py-3 flex items-center justify-between gap-3">
            <p className="text-white text-sm font-bold">Delete this photo?</p>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="bg-red-500 text-white text-xs font-bold rounded-xl px-3 py-1.5 flex items-center gap-1"
              >
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Delete"}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-white/60 text-xs px-2 py-1.5"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Thumbnail grid ───────────────────────────────────────────────────────────

const QUICK_CATEGORIES: { id: CategoryId | "all"; label: string }[] = [
  { id: "all",           label: "All" },
  { id: "wiring_diagram",label: "Wiring" },
  { id: "technician_notes",label: "Notes" },
  { id: "controls_board",label: "Board" },
  { id: "nameplate",     label: "Nameplate" },
];

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  unitId: string;
  clientId: string;
}

export default function PhotoAlbum({ unitId, clientId }: Props) {
  const [photos, setPhotos] = useState<UnitPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addDefaultCategory, setAddDefaultCategory] = useState<CategoryId | undefined>(undefined);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [filter, setFilter] = useState<CategoryId | "all">("all");

  // Load photos
  useEffect(() => {
    fetch(`/api/units/${unitId}/photos?clientId=${encodeURIComponent(clientId)}`)
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => setPhotos(data.photos ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [unitId, clientId]);

  const handleAdded = useCallback((photo: UnitPhoto) => {
    setPhotos((prev) => [photo, ...prev]);
  }, []);

  const handleDelete = useCallback((id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const handleUpdated = useCallback((updated: UnitPhoto) => {
    setPhotos((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }, []);

  const openAdd = (cat?: CategoryId) => {
    setAddDefaultCategory(cat);
    setShowAdd(true);
  };

  const filtered = filter === "all" ? photos : photos.filter((p) => p.category === filter);

  // Map filtered index → actual photos index for lightbox
  const openLightbox = (filteredIdx: number) => {
    const photo = filtered[filteredIdx];
    const realIdx = photos.findIndex((p) => p.id === photo?.id);
    setLightboxIdx(realIdx >= 0 ? realIdx : filteredIdx);
  };

  return (
    <>
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
            Photos & Notes
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {photos.length} photo{photos.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => openAdd()}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-3 py-1.5 text-xs transition-colors"
        >
          <ImagePlus className="w-3.5 h-3.5" />
          Add Photo
        </button>
      </div>

      {/* Quick category shortcuts */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
        {QUICK_CATEGORIES.map(({ id, label }) => {
          const count = id === "all" ? photos.length : photos.filter((p) => p.category === id).length;
          const active = filter === id;
          return (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={`flex-shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                active
                  ? "bg-blue-600 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:border-blue-300"
              }`}
            >
              {label}
              <span className={`text-xs ${active ? "opacity-70" : "text-slate-400"}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loading && photos.length === 0 && (
        <div className="text-center py-8 px-4">
          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Camera className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-sm font-bold text-slate-700 mb-1">No photos yet</p>
          <p className="text-xs text-slate-400 leading-relaxed mb-4 max-w-xs mx-auto">
            Save wiring diagrams, panel notes, DIP switches, and field photos for this unit.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {(["wiring_diagram", "technician_notes", "controls_board", "nameplate"] as CategoryId[]).map((cat) => (
              <button
                key={cat}
                onClick={() => openAdd(cat)}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 border border-slate-200 hover:border-blue-200 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
              >
                <Camera className="w-3 h-3" />
                {categoryLabel(cat)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty filter state */}
      {!loading && photos.length > 0 && filtered.length === 0 && (
        <div className="text-center py-6 text-slate-400 text-sm">
          No {QUICK_CATEGORIES.find((c) => c.id === filter)?.label ?? filter} photos yet.
          <button onClick={() => openAdd(filter === "all" ? undefined : filter as CategoryId)} className="block mx-auto mt-2 text-blue-600 font-semibold text-xs">
            Add one
          </button>
        </div>
      )}

      {/* Thumbnail grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-3 gap-1.5">
          {filtered.map((photo, i) => (
            <button
              key={photo.id}
              onClick={() => openLightbox(i)}
              className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 group"
            >
              <img
                src={photo.imageUrl}
                alt={photo.note ?? categoryLabel(photo.category)}
                className="w-full h-full object-cover transition-opacity group-active:opacity-80"
              />
              {/* Category badge */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 py-1.5">
                <p className="text-white text-[10px] font-bold leading-tight truncate">
                  {categoryLabel(photo.category)}
                </p>
              </div>
              {/* OCR indicator */}
              {photo.ocrText && (
                <div className="absolute top-1.5 right-1.5 bg-blue-600 rounded-full p-0.5">
                  <ScanText className="w-2.5 h-2.5 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Add photo sheet */}
      {showAdd && (
        <AddPhotoSheet
          unitId={unitId}
          clientId={clientId}
          onAdded={handleAdded}
          onClose={() => setShowAdd(false)}
          defaultCategory={addDefaultCategory}
        />
      )}

      {/* Lightbox */}
      {lightboxIdx !== null && (
        <Lightbox
          photos={photos}
          startIndex={lightboxIdx}
          clientId={clientId}
          onClose={() => setLightboxIdx(null)}
          onDelete={handleDelete}
          onUpdated={handleUpdated}
        />
      )}
    </>
  );
}
