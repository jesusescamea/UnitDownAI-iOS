import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, BookOpen, Clock } from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { BRAND_GUIDES, GUIDE_SECTIONS } from "@/data/brandGuides";
import type { BrandGuide } from "@/data/brandGuides";
import EquipmentResources from "@/components/EquipmentResources";
import { brandPages, type BrandPage } from "@/pages/seo/brand-data";

// ─── Brand card ───────────────────────────────────────────────────────────────

function BrandCard({ guide, refPages }: { guide: BrandGuide; refPages: BrandPage[] }) {
  const [open, setOpen] = useState(false);

  const hasAnyContent = GUIDE_SECTIONS.some((s) => guide[s.key] !== null) || refPages.length > 0;

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

          {/* ── Static guide sections (when BRAND_GUIDES has data) ──────── */}
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

          {/* ── Field reference content from brand-data.ts ───────────── */}
          {refPages.length > 0 && (
            <div className="border-t border-gray-800 divide-y divide-gray-800">
              {refPages.map((page) => (
                <div key={page.slug} className="px-4 py-3 space-y-3">
                  <p className={`text-[10px] font-black uppercase tracking-widest ${guide.accentText}`}>
                    {page.h1}
                  </p>

                  {page.symptoms.length > 0 && (
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mb-1">Symptoms</p>
                      <ul className="space-y-1">
                        {page.symptoms.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-gray-300">
                            <span className={`mt-1.5 w-1 h-1 rounded-full flex-shrink-0 ${guide.accentText.replace("text-", "bg-")}`} />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {page.likelyCauses.length > 0 && (
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mb-1">Likely Causes</p>
                      <div className="space-y-2">
                        {page.likelyCauses.map((c, i) => (
                          <div key={i} className="rounded-xl bg-gray-800/60 border border-gray-700/60 px-3 py-2">
                            <p className="text-xs font-bold text-white mb-0.5">{c.title}</p>
                            <p className="text-[11px] text-gray-400 leading-relaxed">{c.body}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {page.meterChecks.length > 0 && (
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mb-1">Meter Checks</p>
                      <div className="space-y-1.5">
                        {page.meterChecks.map((m, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs">
                            <span className={`mt-1.5 w-1 h-1 rounded-full flex-shrink-0 ${guide.accentText.replace("text-", "bg-")}`} />
                            <span>
                              <span className="font-semibold text-gray-200">{m.measurement}</span>
                              <span className="text-gray-500"> — {m.expected}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BrandGuidesPage() {
  const refPagesByBrand = useMemo(() => {
    const map = new Map<string, BrandPage[]>();
    for (const guide of BRAND_GUIDES) {
      const name = guide.name.toLowerCase();
      const matches = brandPages.filter((p) => {
        const bn = p.brand.toLowerCase();
        return bn === name || bn.startsWith(name) || name.startsWith(bn);
      });
      if (matches.length > 0) map.set(guide.id, matches);
    }
    return map;
  }, []);

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
            <BrandCard key={guide.id} guide={guide} refPages={refPagesByBrand.get(guide.id) ?? []} />
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
