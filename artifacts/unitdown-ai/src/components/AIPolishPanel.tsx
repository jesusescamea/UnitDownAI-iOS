/**
 * AIPolishPanel — reusable AI writing improvement component
 *
 * Renders a mode picker, calls POST /api/ai/polish, and shows a side-by-side
 * comparison of the original and AI-polished text.
 *
 * The technician always stays in control:
 *   • Keep Original — dismiss, nothing changes
 *   • Edit AI Version — pre-fills an editor with the polished text
 *   • Save AI Version — saves the polished text directly
 *
 * Non-Pro users see an upgrade CTA instead of the mode picker.
 */

import { useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2, Pencil, Sparkles, Lock } from "lucide-react";
import { useAiPolish, type AiPolishMode } from "@workspace/api-client-react";

// ─── Mode config ──────────────────────────────────────────────────────────────

const MODES: Array<{ value: AiPolishMode; label: string; sub: string }> = [
  { value: "professional",     label: "Professional Report",    sub: "Client-facing"       },
  { value: "technician",       label: "Technician Notes",       sub: "Technical shorthand" },
  { value: "warranty",         label: "Warranty Documentation", sub: "Manufacturer records"},
  { value: "equipment-memory", label: "Equipment Memory",       sub: "1–2 sentence summary"},
  { value: "pm-summary",       label: "PM Summary",             sub: "Maintenance records" },
  { value: "email-customer",   label: "Email Customer",         sub: "Non-technical tone"  },
  { value: "work-order",       label: "Work Order",             sub: "Office-ready"        },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface AIPolishPanelProps {
  originalText: string;
  isPro: boolean;
  onKeepOriginal: () => void;
  onEditPolished: (text: string) => void;
  onSavePolished: (text: string) => void;
}

type Step = "pick" | "loading" | "compare" | "error";

// ─── Component ────────────────────────────────────────────────────────────────

export function AIPolishPanel({
  originalText,
  isPro,
  onKeepOriginal,
  onEditPolished,
  onSavePolished,
}: AIPolishPanelProps) {
  const [step,          setStep]          = useState<Step>("pick");
  const [selectedMode,  setSelectedMode]  = useState<AiPolishMode>("professional");
  const [polishedText,  setPolishedText]  = useState("");
  const [errorMessage,  setErrorMessage]  = useState("");

  const { mutate, isPending } = useAiPolish({
    mutation: {
      onSuccess: (data) => {
        setPolishedText(data.polished);
        setStep("compare");
      },
      onError: () => {
        setErrorMessage("Something went wrong. Please try again.");
        setStep("error");
      },
    },
  });

  const handlePolish = () => {
    if (!originalText.trim() || isPending) return;
    setStep("loading");
    mutate({ data: { text: originalText, mode: selectedMode } });
  };

  // ── Upgrade wall (non-Pro users) ────────────────────────────────────────────
  if (!isPro) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-violet-500" />
          <p className="text-sm font-bold text-slate-700">AI Polish</p>
          <span className="text-[10px] font-extrabold bg-violet-100 text-violet-600 rounded-full px-2 py-0.5 tracking-wide uppercase">Pro</span>
        </div>
        <div className="bg-violet-50 border border-violet-200 rounded-2xl px-4 py-5 text-center space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-violet-100 flex items-center justify-center mx-auto">
            <Lock className="w-5 h-5 text-violet-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-700">AI Polish is a Pro feature</p>
            <p className="text-xs text-slate-500 mt-1 leading-snug">
              Upgrade to Pro to have AI rewrite your field notes into professional reports, warranty documentation, customer emails, and more.
            </p>
          </div>
          <div className="flex flex-col gap-2 pt-1">
            <button className="w-full py-2.5 rounded-xl bg-violet-600 text-white text-sm font-bold active:bg-violet-700 transition-colors">
              Upgrade to Pro
            </button>
            <button onClick={onKeepOriginal} className="text-xs text-slate-400 font-medium py-1">
              Save original
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Mode picker ─────────────────────────────────────────────────────────────
  if (step === "pick") {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-500 flex-shrink-0" />
          <p className="text-sm font-bold text-slate-700">AI Polish</p>
          <span className="text-[10px] font-extrabold bg-violet-100 text-violet-600 rounded-full px-2 py-0.5 tracking-wide uppercase ml-1">Pro</span>
        </div>

        <p className="text-xs text-slate-500">Choose a writing style:</p>

        {/* Mode pills — horizontal scroll */}
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {MODES.map((m) => {
            const active = selectedMode === m.value;
            return (
              <button
                key={m.value}
                onClick={() => setSelectedMode(m.value)}
                className={`flex-shrink-0 flex flex-col items-start px-3 py-2 rounded-xl border text-left transition-all duration-150 ${
                  active
                    ? "bg-violet-600 border-violet-600 text-white shadow-sm"
                    : "bg-white border-slate-200 text-slate-700 hover:border-violet-300"
                }`}
              >
                <span className={`text-xs font-bold leading-tight ${active ? "text-white" : "text-slate-700"}`}>
                  {m.label}
                </span>
                <span className={`text-[10px] leading-tight mt-0.5 ${active ? "text-violet-200" : "text-slate-400"}`}>
                  {m.sub}
                </span>
              </button>
            );
          })}
        </div>

        {/* Original preview */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide mb-1">Original</p>
          <p className="text-xs text-slate-600 leading-relaxed line-clamp-4">{originalText}</p>
        </div>

        {/* Actions */}
        <button
          onClick={handlePolish}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 text-white text-sm font-bold active:bg-violet-700 transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          Polish with AI
        </button>
        <button onClick={onKeepOriginal} className="w-full text-xs text-slate-400 font-medium py-1">
          Cancel — keep original
        </button>
      </div>
    );
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (step === "loading") {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
        <div className="text-center">
          <p className="text-sm font-bold text-slate-700">Improving documentation…</p>
          <p className="text-xs text-slate-400 mt-1">Preserving all technical facts</p>
        </div>
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────────
  if (step === "error") {
    return (
      <div className="space-y-3">
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-4 text-center space-y-2">
          <p className="text-sm font-bold text-red-700">Polish failed</p>
          <p className="text-xs text-red-500">{errorMessage}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onKeepOriginal}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-500 active:bg-slate-50 transition-colors"
          >
            Keep Original
          </button>
          <button
            onClick={() => setStep("pick")}
            className="flex-1 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-bold active:bg-violet-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ── Comparison ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
        <p className="text-[11px] font-extrabold text-violet-600 tracking-wide uppercase">AI Polish Complete</p>
      </div>

      {/* Original */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
        <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide mb-1.5">Original</p>
        <p className="text-xs text-slate-500 leading-relaxed">{originalText}</p>
      </div>

      {/* Polished */}
      <div className="bg-white border-2 border-violet-200 rounded-xl px-3 py-2.5">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Sparkles className="w-3 h-3 text-violet-500" />
          <p className="text-[10px] font-extrabold text-violet-500 uppercase tracking-wide">AI Polish</p>
          <span className="text-[10px] text-slate-400 ml-auto">{MODES.find((m) => m.value === selectedMode)?.label}</span>
        </div>
        <p className="text-xs text-slate-700 leading-relaxed">{polishedText}</p>
      </div>

      {/* Actions */}
      <button
        onClick={onKeepOriginal}
        className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-500 active:bg-slate-50 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Keep Original
      </button>
      <div className="flex gap-2">
        <button
          onClick={() => onEditPolished(polishedText)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-violet-200 text-sm font-semibold text-violet-600 active:bg-violet-50 transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
          Edit
        </button>
        <button
          onClick={() => onSavePolished(polishedText)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-bold active:bg-violet-700 transition-colors"
        >
          <CheckCircle2 className="w-4 h-4" />
          Save
        </button>
      </div>

      {/* Re-polish link */}
      <button
        onClick={() => setStep("pick")}
        className="w-full text-xs text-slate-400 font-medium py-1 text-center"
      >
        Try a different style
      </button>
    </div>
  );
}
