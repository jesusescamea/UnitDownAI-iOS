import { useState, useEffect } from "react";
import { Link } from "wouter";
import { brandPages } from "./brand-data";
import { ArrowRight, ChevronRight, Tag, Zap, Lock, CheckCircle2 } from "lucide-react";
import { useUser } from "@clerk/clerk-react";
import { checkIAPSubscriptionActive } from "@/lib/appleIAP";
import { isDemoProEmail } from "@/lib/demoAccess";

const CLIENT_ID_KEY = "unitdown_client_id";
const PRO_KEY = "unitdown_is_pro";

const brandCategories = [
  { label: "Lennox", brands: ["lennox-prodigy-m3-lockout-causes"] },
  { label: "Carrier", brands: ["carrier-rtu-high-pressure-lockout-reset", "carrier-economizer-fault-causes"] },
  { label: "Trane", brands: ["trane-voyager-trips-on-heat", "trane-supply-fan-proof-failure"] },
  { label: "York", brands: ["york-simplicity-board-random-shutdown"] },
  { label: "AAON", brands: ["aaon-freeze-protection-alarm-causes"] },
  { label: "Daikin Applied", brands: ["daikin-rtu-safety-lockout-reset"] },
  { label: "Goodman", brands: ["goodman-commercial-pressure-switch-trips"] },
  { label: "Rheem / Ruud", brands: ["rheem-ignition-retry-lockout"] },
];

function useProStatus() {
  const { user } = useUser();
  const [isPro, setIsPro] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    if (checkIAPSubscriptionActive()) return true;
    return localStorage.getItem(PRO_KEY) === "1";
  });

  useEffect(() => {
    if (checkIAPSubscriptionActive()) {
      localStorage.setItem(PRO_KEY, "1");
      setIsPro(true);
    }
  }, []);

  const email = user?.primaryEmailAddress?.emailAddress;
  return isDemoProEmail(email) || isPro;
}

export default function BrandHub() {
  const isPro = useProStatus();

  useEffect(() => {
    document.title = "Brand-Specific HVAC Fault Guides | UnitDown";
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content =
      "Brand and model-specific HVAC fault guides for Lennox, Carrier, Trane, York, AAON, Daikin, Goodman, Rheem, and more.";
    return () => {
      document.title = "UnitDown AI — HVAC Diagnostics";
    };
  }, []);

  useEffect(() => {
    const homeSchema = document.getElementById("home-jsonld") as HTMLScriptElement | null;
    if (homeSchema) homeSchema.type = "application/json";

    const id = "seo-jsonld";
    let el = document.getElementById(id) as HTMLScriptElement | null;
    if (!el) {
      el = document.createElement("script");
      el.id = id;
      el.type = "application/ld+json";
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify([
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "@id": "https://unitdown.org/brand-guides",
        name: "Brand-Specific HVAC Fault Guides",
        description:
          "Fault codes, lockout causes, reset procedures, and meter checks for specific commercial HVAC brands and models.",
        url: "https://unitdown.org/brand-guides",
        publisher: { "@type": "Organization", name: "UnitDown AI", url: "https://unitdown.org" },
        hasPart: brandPages.map((p) => ({
          "@type": "TechArticle",
          headline: p.h1,
          url: `https://unitdown.org/brand-guides/${p.slug}`,
          description: p.metaDescription,
          about: { "@type": "Brand", name: p.brand },
        })),
      },
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "Brand-Specific HVAC Fault Guides",
        url: "https://unitdown.org/brand-guides",
        itemListElement: brandPages.map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: p.h1,
          url: `https://unitdown.org/brand-guides/${p.slug}`,
        })),
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "UnitDown AI", item: "https://unitdown.org/" },
          { "@type": "ListItem", position: 2, name: "Guides", item: "https://unitdown.org/guides" },
          { "@type": "ListItem", position: 3, name: "Brand Guides", item: "https://unitdown.org/brand-guides" },
        ],
      },
    ]);
    return () => {
      el?.remove();
      if (homeSchema) homeSchema.type = "application/ld+json";
    };
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="border-b border-gray-100 bg-white sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-2 text-sm text-gray-500">
          <Link href="/" className="hover:text-gray-900 transition-colors">UnitDown AI</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href="/guides" className="hover:text-gray-900 transition-colors">Guides</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-gray-700 font-medium">Brand Guides</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <div className="mb-12">
          <div className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
            <Tag className="w-3.5 h-3.5" />
            Brand &amp; Model Specific
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 leading-tight mb-4">
            Brand-Specific HVAC Fault Guides
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl leading-relaxed">
            Fault codes, lockout causes, reset procedures, and meter checks for specific commercial HVAC brands and models. Written for field technicians.
          </p>
          {isPro ? (
            <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 mt-4 inline-flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Full content unlocked for your Pro membership.
            </p>
          ) : (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mt-4 inline-block">
              Pro &amp; Team members only — full content unlocked after sign-in.
            </p>
          )}
        </div>

        <div className="space-y-10 mb-16">
          {brandCategories.map((cat) => {
            const pages = cat.brands
              .map((s) => brandPages.find((p) => p.slug === s))
              .filter(Boolean);
            return (
              <div key={cat.label}>
                <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">{cat.label}</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pages.map((page) =>
                    page ? (
                      <Link key={page.slug} href={`/brand-guides/${page.slug}`}>
                        <div className="group border border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer h-full flex flex-col">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                              {page.brand}
                            </span>
                            {isPro ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            ) : (
                              <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            )}
                          </div>
                          <h3 className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors mb-2 leading-snug flex-1">
                            {page.h1}
                          </h3>
                          <p className="text-xs text-gray-500 leading-relaxed mb-3 line-clamp-2">
                            {page.metaDescription}
                          </p>
                          <span className="inline-flex items-center gap-1 text-blue-600 text-xs font-semibold group-hover:gap-2 transition-all">
                            Read guide <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </Link>
                    ) : null
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="border border-gray-100 rounded-2xl overflow-hidden mb-16">
          <div className="grid sm:grid-cols-2">
            <div className="p-6 sm:p-8">
              <h2 className="text-lg font-bold text-gray-900 mb-2">All Brand Guides</h2>
              <p className="text-sm text-gray-500 mb-5">Quick-access list of every brand-specific guide.</p>
              <ul className="space-y-2">
                {brandPages.map((page) => (
                  <li key={page.slug}>
                    <Link
                      href={`/brand-guides/${page.slug}`}
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1.5"
                    >
                      <ChevronRight className="w-3 h-3 shrink-0" />
                      {page.h1}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 sm:p-8 flex flex-col justify-center">
              <Zap className="w-8 h-8 text-blue-200 mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Need Faster Answers?</h2>
              <p className="text-blue-100 text-sm mb-5 leading-relaxed">
                UnitDown AI delivers ranked likely causes and meter checks in seconds — specific to your equipment and symptoms.
              </p>
              <Link href="/">
                <button className="inline-flex items-center gap-2 bg-white text-blue-700 font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-blue-50 transition-colors w-fit">
                  Try UnitDown Now
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            </div>
          </div>
        </div>

        <div className="text-center">
          <Link href="/guides" className="text-sm text-blue-600 hover:underline">
            ← Back to general troubleshooting guides
          </Link>
        </div>
      </main>

      <footer className="border-t border-gray-100 py-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} UnitDown AI · Commercial HVAC Diagnostics
        </div>
      </footer>
    </div>
  );
}
