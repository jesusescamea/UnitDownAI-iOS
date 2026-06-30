import { useState, useEffect } from "react";
import { Link } from "wouter";
import { seoPages } from "./data";
import { ArrowRight, BookOpen, ChevronRight, Zap, Lock, Tag, CheckCircle2 } from "lucide-react";
import { useClerkTimeout } from "@/hooks/useClerkTimeout";
import { checkIAPSubscriptionActive } from "@/lib/appleIAP";
import { isDemoProEmail } from "@/lib/demoAccess";
import { useSeoHead } from "@/lib/useSeoHead";

const CLIENT_ID_KEY = "unitdown_client_id";
const PRO_KEY = "unitdown_is_pro";

const categories = [
  {
    label: "Cooling & Refrigeration",
    slugs: [
      "rtu-not-cooling-but-compressor-running",
      "high-superheat-troubleshooting-chart",
      "economizer-stuck-open-symptoms",
    ],
  },
  {
    label: "Electrical & Controls",
    slugs: [
      "24v-present-no-contactor-pull-in",
      "contactor-buzzing-not-pulling-in",
      "thermostat-calling-but-no-cooling",
    ],
  },
  {
    label: "Airflow & Mechanical",
    slugs: [
      "rtu-blower-motor-hums-wont-start",
      "high-static-pressure-rooftop-unit-causes",
      "float-switch-keeps-tripping-causes",
    ],
  },
  {
    label: "Gas Heat & Ignition",
    slugs: ["rooftop-unit-ignition-lockout"],
  },
];

const brandLinks = [
  { slug: "carrier-rtu-high-pressure-lockout-reset", label: "Carrier Lockout Codes" },
  { slug: "lennox-prodigy-m3-lockout-causes", label: "Lennox Board Trips" },
  { slug: "trane-voyager-trips-on-heat", label: "Trane RTRM Faults" },
  { slug: "york-simplicity-board-random-shutdown", label: "York Safeties" },
  { slug: "goodman-commercial-pressure-switch-trips", label: "Goodman Pressure Switch Trips" },
  { slug: "daikin-rtu-safety-lockout-reset", label: "Daikin Communication Faults" },
  { slug: "rheem-ignition-retry-lockout", label: "Rheem Ignition Lockouts" },
];

function useProStatus() {
  // Use the timeout-aware hook so Pro status resolves within 3 s even when
  // Clerk's CDN is unreachable (offline, blocked, pk_test_ key on proxy, etc.).
  const { user, timedOut } = useClerkTimeout(3_000);
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

  // When Clerk has timed out, treat as a non-Pro guest (user is null).
  const email = timedOut ? null : user?.primaryEmailAddress?.emailAddress;
  return isDemoProEmail(email) || isPro;
}

export default function TroubleshootingHub() {
  const isPro = useProStatus();

  useSeoHead({
    title: "Commercial HVAC Troubleshooting Guides | UnitDown",
    description:
      "Free commercial HVAC troubleshooting guides for RTU faults, blower motor issues, high static pressure, economizer problems, ignition lockouts, contactor faults, and more.",
    canonical: "https://unitdown.org/guides",
    ogType: "website",
  });

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
        "@id": "https://unitdown.org/guides",
        name: "Commercial HVAC Troubleshooting Guides",
        description:
          "Field guides for diagnosing commercial rooftop unit faults — covering causes, meter readings, and step-by-step checks.",
        url: "https://unitdown.org/guides",
        publisher: { "@type": "Organization", name: "UnitDown AI", url: "https://unitdown.org" },
        hasPart: seoPages.map((p) => ({
          "@type": "TechArticle",
          headline: p.h1,
          url: `https://unitdown.org/guides/${p.slug}`,
          description: p.metaDescription,
        })),
      },
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "HVAC Troubleshooting Guides",
        url: "https://unitdown.org/guides",
        itemListElement: seoPages.map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: p.h1,
          url: `https://unitdown.org/guides/${p.slug}`,
        })),
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "UnitDown AI", item: "https://unitdown.org/" },
          { "@type": "ListItem", position: 2, name: "Troubleshooting Guides", item: "https://unitdown.org/guides" },
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
          <Link href="/" className="hover:text-gray-900 transition-colors">
            UnitDown AI
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-gray-700 font-medium">Guides</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16">

        {/* Page header */}
        <div className="mb-12">
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full">
              <BookOpen className="w-3.5 h-3.5" />
              Reference Library
            </div>
            {isPro ? (
              <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Pro Member — Full Access
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                <Lock className="w-3.5 h-3.5" />
                Pro &amp; Team Members
              </div>
            )}
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 leading-tight mb-4">
            HVAC Guides
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl leading-relaxed">
            Field guides for diagnosing commercial rooftop unit faults — covering causes, meter readings, and step-by-step checks.{" "}
            {isPro
              ? "Full content unlocked for your Pro membership."
              : "Full content available to Pro and Team members."}
          </p>
        </div>

        {/* ── A) Troubleshooting Guides ── */}
        <div className="mb-14">
          <div className="flex items-center gap-3 mb-6">
            <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-extrabold flex items-center justify-center shrink-0">A</span>
            <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Troubleshooting Guides</h2>
          </div>

          <div className="space-y-10">
            {categories.map((cat) => {
              const pages = cat.slugs
                .map((s) => seoPages.find((p) => p.slug === s))
                .filter(Boolean);
              return (
                <div key={cat.label}>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">
                    {cat.label}
                  </h3>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pages.map((page) =>
                      page ? (
                        <Link key={page.slug} href={`/guides/${page.slug}`}>
                          <div className="group border border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer h-full flex flex-col">
                            <div className="flex items-center justify-between mb-2">
                              {isPro ? (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
                                  <CheckCircle2 className="w-3 h-3" /> Unlocked
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                                  <Lock className="w-3 h-3" /> Pro
                                </span>
                              )}
                            </div>
                            <h4 className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors mb-2 leading-snug flex-1">
                              {page.h1}
                            </h4>
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
        </div>

        {/* ── B) Brand / Model Guides ── */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <span className="w-7 h-7 rounded-full bg-slate-800 text-white text-xs font-extrabold flex items-center justify-center shrink-0">B</span>
            <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Brand / Model Guides</h2>
          </div>

          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <div className="bg-slate-900 px-6 py-5 flex items-start gap-4">
              <Tag className="w-6 h-6 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Brand and model-specific fault guides covering Carrier, Lennox, Trane, York, Goodman, Daikin, and Rheem.{" "}
                  {isPro ? (
                    <span className="text-emerald-400 font-semibold">Unlocked for your membership.</span>
                  ) : (
                    <span>Pro &amp; Team members only.</span>
                  )}
                </p>
              </div>
            </div>
            <div className="p-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {brandLinks.map(({ slug, label }) => (
                <Link key={slug} href={`/brand-guides/${slug}`}>
                  <div className="flex items-center gap-2 border border-gray-100 rounded-lg p-3 hover:border-blue-200 hover:bg-blue-50/30 transition-colors group cursor-pointer">
                    {isPro ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    )}
                    <span className="text-sm text-gray-700 group-hover:text-blue-700 leading-snug">{label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="border border-gray-100 rounded-2xl overflow-hidden">
          <div className="grid sm:grid-cols-2">
            <div className="p-6 sm:p-8">
              <h2 className="text-lg font-bold text-gray-900 mb-2">All 10 Field Guides</h2>
              <p className="text-sm text-gray-500 mb-5">
                Quick-access list of every troubleshooting guide in this library.
              </p>
              <ul className="space-y-2">
                {seoPages.map((page) => (
                  <li key={page.slug}>
                    <Link
                      href={`/guides/${page.slug}`}
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
                UnitDown AI delivers ranked likely causes, meter checks, and next-step diagnostics in seconds — specific to your equipment and symptoms.
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

      </main>

      <footer className="border-t border-gray-100 py-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} UnitDown AI · Commercial HVAC Diagnostics
        </div>
      </footer>
    </div>
  );
}
