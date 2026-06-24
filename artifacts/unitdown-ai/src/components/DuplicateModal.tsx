import { X, ExternalLink, PencilLine, Plus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DuplicateUnit {
  id: string;
  manufacturer: string | null;
  modelNumber: string | null;
  serialNumber: string | null;
  siteCustomerName: string | null;
  nickname: string | null;
  updatedAt: string;
}

export interface DuplicateEntry {
  priority: 1 | 2 | 3;
  unit: DuplicateUnit;
}

interface Props {
  duplicates: DuplicateEntry[];
  isEdit?: boolean;
  onOpenExisting: (unitId: string) => void;
  onUpdateExisting: (unitId: string) => void;
  onCreateNew: () => void;
  onClose: () => void;
}

// ─── Priority display helpers ─────────────────────────────────────────────────

const PRIORITY_LABEL: Record<1 | 2 | 3, string> = {
  1: "Definite Duplicate",
  2: "High Confidence Match",
  3: "Possible Duplicate",
};

const PRIORITY_BADGE: Record<1 | 2 | 3, string> = {
  1: "bg-red-100 text-red-700 border-red-200",
  2: "bg-amber-100 text-amber-700 border-amber-200",
  3: "bg-yellow-100 text-yellow-700 border-yellow-200",
};

const PRIORITY_BORDER: Record<1 | 2 | 3, string> = {
  1: "border-red-200 bg-red-50/40",
  2: "border-amber-200 bg-amber-50/40",
  3: "border-yellow-200 bg-yellow-50/30",
};

function fmt(d: string) {
  try {
    return new Date(d).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DuplicateModal({
  duplicates,
  isEdit = false,
  onOpenExisting,
  onUpdateExisting,
  onCreateNew,
  onClose,
}: Props) {
  const top = duplicates[0];
  const isDefinite = top?.priority === 1;
  const title = isDefinite ? "Duplicate Unit Found" : "Possible Duplicate Found";
  const subtitle = isDefinite
    ? "This serial number already exists in your records."
    : "A similar unit was found. Please review before saving.";

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-3 sm:p-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="font-extrabold text-slate-900 text-base leading-snug">{title}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 -mr-1 -mt-1 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Duplicate cards */}
        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {duplicates.map(({ priority, unit }) => (
            <div
              key={unit.id}
              className={`border rounded-xl p-4 ${PRIORITY_BORDER[priority]}`}
            >
              <div className="flex items-center justify-between mb-3">
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${PRIORITY_BADGE[priority]}`}
                >
                  {PRIORITY_LABEL[priority]}
                </span>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                {unit.manufacturer && (
                  <>
                    <dt className="text-xs text-slate-500">Manufacturer</dt>
                    <dd className="text-xs font-semibold text-slate-800">{unit.manufacturer}</dd>
                  </>
                )}
                {unit.modelNumber && (
                  <>
                    <dt className="text-xs text-slate-500">Model</dt>
                    <dd className="text-xs font-semibold text-slate-800 truncate">{unit.modelNumber}</dd>
                  </>
                )}
                {unit.serialNumber && (
                  <>
                    <dt className="text-xs text-slate-500">Serial</dt>
                    <dd className="text-xs font-semibold text-slate-800 font-mono">{unit.serialNumber}</dd>
                  </>
                )}
                {unit.siteCustomerName && (
                  <>
                    <dt className="text-xs text-slate-500">Customer / Site</dt>
                    <dd className="text-xs font-semibold text-slate-800 truncate">{unit.siteCustomerName}</dd>
                  </>
                )}
                {unit.nickname && (
                  <>
                    <dt className="text-xs text-slate-500">Nickname</dt>
                    <dd className="text-xs font-semibold text-slate-800 truncate">{unit.nickname}</dd>
                  </>
                )}
                <dt className="text-xs text-slate-500">Last updated</dt>
                <dd className="text-xs font-semibold text-slate-800">{fmt(unit.updatedAt)}</dd>
              </dl>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="p-4 border-t border-slate-100 space-y-2 flex-shrink-0">
          {top && (
            <>
              {/* Primary: Update existing (default for definite dupe) */}
              <Button
                onClick={() => onUpdateExisting(top.unit.id)}
                className={`w-full font-bold rounded-xl h-11 text-sm ${
                  isDefinite
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-800"
                }`}
              >
                <PencilLine className="w-4 h-4 mr-2 flex-shrink-0" />
                Update Existing Unit
              </Button>

              {/* Open existing */}
              <Button
                onClick={() => onOpenExisting(top.unit.id)}
                variant="outline"
                className="w-full font-semibold rounded-xl h-11 text-sm border-slate-200 text-slate-700"
              >
                <ExternalLink className="w-4 h-4 mr-2 flex-shrink-0" />
                Open Existing Unit
              </Button>
            </>
          )}

          {/* Create new / Continue saving */}
          <Button
            onClick={onCreateNew}
            variant="ghost"
            className="w-full font-semibold rounded-xl h-11 text-sm text-slate-500 hover:text-slate-700"
          >
            {isEdit ? (
              <>
                <ArrowRight className="w-4 h-4 mr-2 flex-shrink-0" />
                Continue Saving Current Unit
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2 flex-shrink-0" />
                Create New Unit Anyway
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
