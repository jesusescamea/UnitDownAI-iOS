import { useState } from "react";
import { ChevronDown, ChevronRight, BookOpen, Clock } from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { BRAND_GUIDES, GUIDE_SECTIONS } from "@/data/brandGuides";
import type { BrandGuide } from "@/data/brandGuides";
import EquipmentResources from "@/components/EquipmentResources";

// ─── Brand card ───────────────────────────────────────────────────────────────

function BrandCard({ guide }: { guide: BrandGuide }) {
  const [open, setOpen] = useState(false);

  const hasAnyContent = GUIDE_SECTIONS.some((s) => guide[s.key] !== null);

  return (
    <div className={`rounded-2xl border bg-gray-900 ${guide.accentBorder} overflow-hidden`}>
      {/* Header row */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3.5 active:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${guide.accentBg} border ${guide.accentBorder}`}>
            <BookOpen className={`w-4 h-4 ${guide.accentText}`} />
          </div>
          <div className="text-left">
            <p className="text-sm font-extrabold text-white">{guide.name}</p>
            <p className={`text-[10px] font-semibold ${hasAnyContent ? guide.accentText : "text-gray-600"}`}>
              {hasAnyContent ? "Guide available" : "Guide coming soon"}
            </p>
          </div>
        </div>
        {open
          ? <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
          : <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
        }
      </button>

      {/* Expanded sections */}
      {open && (
        <div className="border-t border-gray-800">
          {/* ── Equipment Resources (central API database) ─────────────── */}
          <div className="px-4 pt-4 pb-2">
            <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${guide.accentText}`}>
              Manuals · Wiring Diagrams · Resources
            </p>
            <EquipmentResources manufacturer={guide.name} modelNumber="" />
          </div>

          {/* ── Quick-reference fault code guide (static text) ────────── */}
          {GUIDE_SECTIONS.some((s) => guide[s.key] !== null) && (
            <div className="border-t border-gray-800 divide-y divide-gray-800">
              {GUIDE_SECTIONS.map(({ key, label }) => {
                const section = guide[key];
                return (
                  <div key={key} className="px-4 py-3">
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-1.5 ${guide.accentText}`}>
                      {label}
                    </p>
                    {section ? (
                      <ul className="space-y-1">
                        {section.items.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-gray-300">
                            <span className={`mt-1.5 w-1 h-1 rounded-full flex-shrink-0 ${guide.accentText.replace("text-", "bg-")}`} />
                            {item}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <Clock className="w-3 h-3 flex-shrink-0" />
                        Guide coming soon
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BrandGuidesPage() {
  return (
    <div className="min-h-[100dvh] bg-gray-950 text-white flex flex-col">
      <AppNav active="brand-guides" />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 pb-20 sm:pb-8 space-y-6">

        {/* Page header */}
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">Brand Guides</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Fault codes · Controls · Startup procedures · Common issues
          </p>
        </div>

        {/* Brand cards */}
        <div className="space-y-2">
          {BRAND_GUIDES.map((guide) => (
            <BrandCard key={guide.id} guide={guide} />
          ))}
        </div>

        {/* Footer note */}
        <p className="text-center text-[10px] text-gray-700 pb-2">
          Tap a brand to expand · More guides added regularly
        </p>
      </main>
    </div>
  );
}
