import { useEffect } from "react";
import { useRoute, Link } from "wouter";
import { getBrandPageBySlug } from "./brand-data";
import ProGate from "./ProGate";
import {
  AlertTriangle,
  CheckCircle2,
  Wrench,
  Phone,
  Zap,
  ChevronRight,
  RefreshCw,
  RepeatIcon,
  ArrowRight,
  BookOpen,
} from "lucide-react";

function useSeoMeta(title: string, description: string) {
  useEffect(() => {
    document.title = title;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = description;
    return () => {
      document.title = "UnitDown AI — HVAC Diagnostics";
    };
  }, [title, description]);
}

function useSeoJsonLd(title: string, description: string, slug: string, brand: string) {
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
        "@type": "TechArticle",
        headline: title,
        description,
        about: { "@type": "Brand", name: brand },
        url: `https://unitdown.org/brand-guides/${slug}`,
        author: { "@type": "Organization", name: "UnitDown AI", url: "https://unitdown.org" },
        publisher: {
          "@type": "Organization",
          name: "UnitDown AI",
          url: "https://unitdown.org",
          logo: { "@type": "ImageObject", url: "https://unitdown.org/icon-192.png" },
        },
        mainEntityOfPage: { "@type": "WebPage", "@id": `https://unitdown.org/brand-guides/${slug}` },
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "UnitDown AI", item: "https://unitdown.org/" },
          { "@type": "ListItem", position: 2, name: "Guides", item: "https://unitdown.org/guides" },
          { "@type": "ListItem", position: 3, name: "Brand Guides", item: "https://unitdown.org/brand-guides" },
          { "@type": "ListItem", position: 4, name: title, item: `https://unitdown.org/brand-guides/${slug}` },
        ],
      },
    ]);
    return () => {
      el?.remove();
      if (homeSchema) homeSchema.type = "application/ld+json";
    };
  }, [title, description, slug, brand]);
}

export default function BrandPage() {
  const [, params] = useRoute("/brand-guides/:slug");
  const slug = params?.slug ?? "";
  const page = getBrandPageBySlug(slug);

  useSeoMeta(
    page?.metaTitle ?? "UnitDown — HVAC Diagnostics",
    page?.metaDescription ?? ""
  );
  useSeoJsonLd(
    page?.metaTitle ?? "UnitDown — HVAC Diagnostics",
    page?.metaDescription ?? "",
    slug,
    page?.brand ?? ""
  );

  if (!page) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <h1 className="text-2xl font-bold">Page not found</h1>
        <Link href="/brand-guides" className="text-blue-600 hover:underline">
          View all brand guides
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="border-b border-gray-100 bg-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-2 text-sm text-gray-500">
          <Link href="/" className="hover:text-gray-900 transition-colors">UnitDown AI</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href="/brand-guides" className="hover:text-gray-900 transition-colors">Brand Guides</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-gray-700 font-medium truncate max-w-[200px] sm:max-w-none">{page.h1}</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <div className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
          {page.brand}
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 leading-tight mb-4">
          {page.h1}
        </h1>

        <p className="text-lg text-gray-600 leading-relaxed mb-6 max-w-3xl">{page.intro}</p>

        {/* ── Free preview — indexed by search engines ── */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-1 h-6 bg-blue-600 rounded-full inline-block" />
            Symptoms
          </h2>
          <div className="space-y-2.5">
            {page.symptoms.map((s, i) => (
              <div key={i} className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <p className="text-gray-700 text-sm leading-relaxed">{s}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
            <span className="w-1 h-6 bg-orange-500 rounded-full inline-block" />
            Likely Causes
          </h2>
          <div className="space-y-4">
            {page.likelyCauses.map((cause, i) => (
              <div key={i} className="border border-gray-200 rounded-xl p-5 hover:border-blue-200 hover:bg-blue-50/30 transition-colors">
                <h3 className="font-semibold text-gray-900 mb-1.5 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                  {cause.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed pl-6">{cause.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
            <span className="w-1 h-6 bg-purple-500 rounded-full inline-block" />
            Sequence of Operation Notes
          </h2>
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-2">
            {page.sequenceNotes.map((note, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-xs flex items-center justify-center shrink-0 mt-0.5 font-bold">
                  {i + 1}
                </span>
                <p className="text-slate-700 text-sm leading-relaxed">{note}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Gradient fade into paywall ── */}
        <div className="relative -mb-2 h-8 bg-gradient-to-b from-transparent to-white pointer-events-none" />

        {/* ── Pro-gated content ── */}
        <ProGate previewTitle={page.h1}>
          <section className="mb-10">
            <h2 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
              <span className="w-1 h-6 bg-violet-600 rounded-full inline-block" />
              Meter Checks
            </h2>
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Measurement</th>
                    <th className="text-left px-4 py-3 font-semibold text-green-700">Expected</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {page.meterChecks.map((row, i) => (
                    <tr key={i} className={`border-b border-gray-100 last:border-0 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                      <td className="px-4 py-3 font-medium text-gray-800">{row.measurement}</td>
                      <td className="px-4 py-3 text-green-700">{row.expected}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
              <span className="w-1 h-6 bg-green-500 rounded-full inline-block" />
              Reset Steps
            </h2>
            <div className="space-y-3">
              {page.resetSteps.map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs flex items-center justify-center shrink-0 mt-0.5 font-bold">
                    {i + 1}
                  </span>
                  <p className="text-gray-700 text-sm leading-relaxed">{step}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
              <span className="w-1 h-6 bg-yellow-500 rounded-full inline-block" />
              Common Repeat Failures
            </h2>
            <div className="space-y-3">
              {page.repeatFailures.map((item, i) => (
                <div key={i} className="flex items-start gap-3 bg-yellow-50 border border-yellow-100 rounded-xl p-4">
                  <RepeatIcon className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
                  <p className="text-gray-700 text-sm leading-relaxed">{item}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
              <span className="w-1 h-6 bg-gray-500 rounded-full inline-block" />
              When Replacement Is Likely
            </h2>
            <div className="space-y-2.5">
              {page.whenReplacement.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Wrench className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                  <p className="text-gray-700 text-sm leading-relaxed">{item}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
              <span className="w-1 h-6 bg-red-500 rounded-full inline-block" />
              When to Escalate
            </h2>
            <div className="bg-red-50 border border-red-100 rounded-xl p-5 space-y-3">
              {page.whenEscalate.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                  <p className="text-red-800 text-sm leading-relaxed">{item}</p>
                </div>
              ))}
            </div>
          </section>

          {page.relatedSlug && page.relatedTitle && (
            <div className="mb-10 border border-blue-100 bg-blue-50 rounded-xl p-5 flex items-start gap-4">
              <BookOpen className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide mb-1">Related Guide</p>
                <Link href={`/guides/${page.relatedSlug}`} className="font-semibold text-blue-800 hover:underline">
                  {page.relatedTitle} →
                </Link>
              </div>
            </div>
          )}

          <section className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 p-8 sm:p-10 text-white text-center">
            <div className="flex justify-center mb-4">
              <Zap className="w-8 h-8 text-blue-200" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">Need Faster Answers?</h2>
            <p className="text-blue-100 mb-6 max-w-xl mx-auto leading-relaxed">
              Use UnitDown AI to get ranked likely causes, meter checks, and next-step diagnostics in seconds — tailored to your exact equipment and symptoms.
            </p>
            <Link href="/">
              <button className="inline-flex items-center gap-2 bg-white text-blue-700 font-semibold px-6 py-3 rounded-xl hover:bg-blue-50 transition-colors">
                Try UnitDown Now
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </section>

          <div className="mt-10 pt-8 border-t border-gray-100 flex items-center justify-between flex-wrap gap-4">
            <Link href="/brand-guides" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
              ← All brand guides
            </Link>
            <span className="text-xs text-gray-400">Commercial HVAC Diagnostics · UnitDown AI</span>
          </div>
        </ProGate>
      </main>
    </div>
  );
}
