/**
 * StartJobSheet — bottom sheet modal for starting a new job session.
 *
 * All fields are optional. A technician can tap "Start Job" immediately
 * without entering any information — customer, site, and unit can be
 * added or updated at any time during the job.
 */

import { useState } from "react";
import { X, Briefcase, Building2, MapPin, Tag, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface StartJobSheetProps {
  onStart: (opts: {
    customer?: string;
    site?: string;
    unitLabel?: string;
    title?: string;
  }) => Promise<void>;
  onClose: () => void;
  loading?: boolean;
}

export function StartJobSheet({ onStart, onClose, loading }: StartJobSheetProps) {
  const [customer, setCustomer]   = useState("");
  const [site, setSite]           = useState("");
  const [unitLabel, setUnitLabel] = useState("");
  const [title, setTitle]         = useState("");

  const handleStart = async () => {
    await onStart({
      customer:  customer.trim()  || undefined,
      site:      site.trim()      || undefined,
      unitLabel: unitLabel.trim() || undefined,
      title:     title.trim()     || undefined,
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-white dark:bg-zinc-900 shadow-2xl safe-area-pb">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />
        </div>

        <div className="px-5 pb-6">
          {/* Header */}
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 text-lg leading-tight">
                  Start New Job
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  All fields optional — add details anytime
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Fields */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-zinc-400" />
                Customer
              </Label>
              <Input
                placeholder="e.g. Riverside Office Park"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                className="h-11"
                autoComplete="off"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                Site / Location
              </Label>
              <Input
                placeholder="e.g. 3rd Floor Mechanical Room"
                value={site}
                onChange={(e) => setSite(e.target.value)}
                className="h-11"
                autoComplete="off"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-zinc-400" />
                Unit Label
              </Label>
              <Input
                placeholder="e.g. RTU-1, AHU-3, Chiller B"
                value={unitLabel}
                onChange={(e) => setUnitLabel(e.target.value)}
                className="h-11"
                autoComplete="off"
              />
            </div>
          </div>

          {/* Start button */}
          <Button
            className="w-full h-13 mt-6 text-base font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleStart}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Starting Job…
              </>
            ) : (
              "Start Job"
            )}
          </Button>

          <p className="text-center text-xs text-zinc-400 dark:text-zinc-500 mt-3">
            Job auto-saves continuously — never lose your work
          </p>
        </div>
      </div>
    </>
  );
}
