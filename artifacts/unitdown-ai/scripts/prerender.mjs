/**
 * Post-build pre-renderer for public routes.
 *
 * Runs after `vite build` AND the SSR bundle build (dist/server/entry-server.js).
 * For each known public route it:
 *  1. Reads dist/public/index.html (the built SPA shell)
 *  2. Swaps in page-specific title, description, canonical, OG/Twitter tags, JSON-LD
 *  3. Injects server-rendered body HTML so crawlers and social bots see real content
 *  4. Writes dist/public/<route>/index.html
 *
 * Because Replit's static server checks for an exact file match before applying
 * the SPA rewrite rule (/* → /index.html), these per-route files are served
 * directly to crawlers and social-media scrapers — no JavaScript required.
 *
 * React hydrates over the server-rendered markup in the browser, so interactive
 * features (Pro gate, IAP, Clerk auth) all work normally after hydration.
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, "../dist/public");
const templatePath = join(distDir, "index.html");
const serverBundlePath = join(__dirname, "../dist/server/entry-server.js");

// Load the SSR render function produced by `vite build --config vite.config.ssr.ts`.
// If the bundle is missing (e.g. CI skipped the SSR step) we fall back gracefully.
let ssrRender = (_url) => "";
try {
  const mod = await import(serverBundlePath);
  ssrRender = mod.render ?? ssrRender;
} catch (err) {
  console.warn("⚠  SSR bundle not found — body content will not be pre-rendered:", err.message);
}

// ── Helpers ────────────────────────────────────────────────────────────────

function escAttr(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Replace a single attribute value in a self-closing meta/link tag.
 * Matches: <meta ... attr="OLD" ... />
 */
function replaceAttr(html, selector, attr, newValue) {
  // Match the full tag that contains the selector string, then replace the target attr
  const tagRe = new RegExp(
    `(<(?:meta|link)\\b[^>]*${escapeRe(selector)}[^>]*${escapeRe(attr)}=")[^"]*(")`
  );
  const replaced = html.replace(tagRe, `$1${escAttr(newValue)}$2`);
  if (replaced === html) {
    // Try attribute-first order
    const tagRe2 = new RegExp(
      `(<(?:meta|link)\\b[^>]*${escapeRe(attr)}=")[^"]*("[^>]*${escapeRe(selector)}[^>]*>)`
    );
    return html.replace(tagRe2, `$1${escAttr(newValue)}$2`);
  }
  return replaced;
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildHtml(template, { title, description, canonical, type, jsonLd, bodyHtml = "" }) {
  let html = template;

  // <title>
  html = html.replace(
    /<title>[^<]*<\/title>/,
    `<title>${escAttr(title)}</title>`
  );

  // <meta name="description" content="...">
  html = html.replace(
    /(<meta\s+name="description"\s+content=")[^"]*(")/,
    `$1${escAttr(description)}$2`
  );

  // <link rel="canonical" href="...">
  html = html.replace(
    /(<link\s+rel="canonical"\s+href=")[^"]*(")/,
    `$1${escAttr(canonical)}$2`
  );

  // og:type  (website → article for guide pages)
  html = html.replace(
    /(<meta\s+property="og:type"\s+content=")[^"]*(")/,
    `$1${escAttr(type)}$2`
  );

  // og:url
  html = html.replace(
    /(<meta\s+property="og:url"\s+content=")[^"]*(")/,
    `$1${escAttr(canonical)}$2`
  );

  // og:title
  html = html.replace(
    /(<meta\s+property="og:title"\s+content=")[^"]*(")/,
    `$1${escAttr(title)}$2`
  );

  // og:description
  html = html.replace(
    /(<meta\s+property="og:description"\s+content=")[^"]*(")/,
    `$1${escAttr(description)}$2`
  );

  // twitter:title
  html = html.replace(
    /(<meta\s+name="twitter:title"\s+content=")[^"]*(")/,
    `$1${escAttr(title)}$2`
  );

  // twitter:description
  html = html.replace(
    /(<meta\s+name="twitter:description"\s+content=")[^"]*(")/,
    `$1${escAttr(description)}$2`
  );

  // JSON-LD — replace the existing block with a page-specific one.
  // The id attribute may appear before type in the tag, so match any order.
  html = html.replace(
    /<script\b[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/,
    `<script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n    </script>`
  );

  // Inject SSR-rendered body content inside <div id="root">.
  // Crawlers and social bots receive real page content on the first request.
  // React hydrates over this markup in the browser.
  if (bodyHtml) {
    html = html.replace(
      /<div id="root"><\/div>/,
      `<div id="root">${bodyHtml}</div>`
    );
  }

  return html;
}

function writePage(distDir, segments, html) {
  const dir = join(distDir, ...segments);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), html, "utf8");
}

// ── Route data ─────────────────────────────────────────────────────────────

const guidePages = [
  {
    slug: "rtu-not-cooling-but-compressor-running",
    metaTitle: "RTU Not Cooling But Compressor Running | UnitDown",
    metaDescription:
      "Common causes when rooftop unit compressor runs but building is not cooling. Fast checks and technician troubleshooting steps.",
  },
  {
    slug: "rtu-blower-motor-hums-wont-start",
    metaTitle: "RTU Blower Motor Hums But Won't Start | UnitDown",
    metaDescription:
      "Why rooftop blower motors hum but fail to start. Capacitors, seized bearings, voltage drop and overload causes explained.",
  },
  {
    slug: "high-static-pressure-rooftop-unit-causes",
    metaTitle: "High Static Pressure Rooftop Unit Causes | UnitDown",
    metaDescription:
      "Find common reasons rooftop units develop high static pressure and airflow problems in commercial HVAC systems.",
  },
  {
    slug: "economizer-stuck-open-symptoms",
    metaTitle: "Economizer Stuck Open Symptoms | UnitDown",
    metaDescription:
      "Symptoms of a rooftop economizer stuck open and how technicians diagnose damper issues on commercial RTUs.",
  },
  {
    slug: "rooftop-unit-ignition-lockout",
    metaTitle: "Rooftop Unit Ignition Lockout Causes | UnitDown",
    metaDescription:
      "Common reasons commercial rooftop units enter ignition lockout mode and how to diagnose heating failures.",
  },
  {
    slug: "24v-present-no-contactor-pull-in",
    metaTitle: "24V Present But No Contactor Pull In | UnitDown",
    metaDescription:
      "24 volts present but contactor won't pull in? Common HVAC causes and fast checks for this frustrating fault.",
  },
  {
    slug: "thermostat-calling-but-no-cooling",
    metaTitle: "Thermostat Calling But No Cooling | UnitDown",
    metaDescription:
      "Thermostat calls for cooling but system does not start. Step-by-step troubleshooting guide for HVAC technicians.",
  },
  {
    slug: "float-switch-keeps-tripping-causes",
    metaTitle: "Float Switch Keeps Tripping Causes | UnitDown",
    metaDescription:
      "Why HVAC float switches trip repeatedly and how to solve condensate drainage problems permanently.",
  },
  {
    slug: "contactor-buzzing-not-pulling-in",
    metaTitle: "Contactor Buzzing But Not Pulling In | UnitDown",
    metaDescription:
      "Contactor buzzing but not engaging? Diagnose weak voltage, coil failure, and mechanical sticking issues.",
  },
  {
    slug: "high-superheat-troubleshooting-chart",
    metaTitle: "High Superheat Troubleshooting Chart | UnitDown",
    metaDescription:
      "Common causes of high superheat in HVAC systems and how technicians verify charge and TXV feed issues.",
  },
];

const brandPages = [
  {
    slug: "lennox-prodigy-m3-lockout-causes",
    metaTitle: "Lennox Prodigy M3 Lockout Causes | UnitDown",
    metaDescription:
      "Why Lennox Prodigy M3 commercial RTUs enter lockout mode. Fault codes, sensor faults, and board diagnostics explained.",
  },
  {
    slug: "carrier-rtu-high-pressure-lockout-reset",
    metaTitle: "Carrier RTU High Pressure Lockout Reset | UnitDown",
    metaDescription:
      "Why Carrier commercial rooftop units lock out on high pressure and how technicians diagnose and safely reset the fault.",
  },
  {
    slug: "trane-voyager-trips-on-heat",
    metaTitle: "Trane Voyager Unit Trips on Heat | UnitDown",
    metaDescription:
      "Why Trane Voyager commercial RTUs trip during heating calls. Ignition faults, rollout switches, heat exchanger issues explained.",
  },
  {
    slug: "york-simplicity-board-random-shutdown",
    metaTitle: "York Simplicity Board Random Shutdown | UnitDown",
    metaDescription:
      "York Simplicity control board causes random shutdowns. Fault codes, sensor issues, and control board diagnosis.",
  },
  {
    slug: "aaon-freeze-protection-alarm-causes",
    metaTitle: "Aaon Freeze Protection Alarm Causes | UnitDown",
    metaDescription:
      "AAON RTU freeze protection alarm causes. Coil sensor faults, low refrigerant, and airflow issues on AAON commercial units.",
  },
  {
    slug: "daikin-rtu-safety-lockout-reset",
    metaTitle: "Daikin RTU Safety Lockout Reset | UnitDown",
    metaDescription:
      "Daikin Applied commercial RTU safety lockout causes and reset procedures. Fault codes, sensor diagnostics, and field steps.",
  },
  {
    slug: "goodman-commercial-pressure-switch-trips",
    metaTitle: "Goodman Commercial Pressure Switch Trips | UnitDown",
    metaDescription:
      "Why Goodman commercial HVAC pressure switches trip repeatedly and how technicians diagnose inducer and refrigerant circuit faults.",
  },
  {
    slug: "rheem-ignition-retry-lockout",
    metaTitle: "Rheem Ignition Retry Lockout | UnitDown",
    metaDescription:
      "Rheem commercial HVAC ignition retry lockout causes. Flame sensor faults, gas valve issues, and board diagnostics.",
  },
  {
    slug: "carrier-economizer-fault-causes",
    metaTitle: "Carrier Economizer Fault Causes | UnitDown",
    metaDescription:
      "Carrier commercial RTU EconoMi$er fault codes and causes. Actuator failures, sensor faults, and controller diagnostics.",
  },
  {
    slug: "trane-supply-fan-proof-failure",
    metaTitle: "Trane Supply Fan Proof Failure | UnitDown",
    metaDescription:
      "Trane RTU supply fan proof failure causes. Airflow switches, VFD faults, and belt drive issues on Trane commercial units.",
  },
];

const hubPages = [
  {
    segments: ["guides"],
    title: "Commercial HVAC Troubleshooting Guides | UnitDown",
    description:
      "Free commercial HVAC troubleshooting guides for RTU faults, blower motor issues, high static pressure, economizer problems, ignition lockouts, and contactor faults.",
    canonical: "https://unitdown.org/guides",
  },
  {
    segments: ["brand-guides"],
    title: "Brand-Specific HVAC Fault Guides | UnitDown",
    description:
      "Brand and model-specific fault guides for Carrier, Lennox, Trane, York, Goodman, Daikin, and Rheem commercial rooftop units.",
    canonical: "https://unitdown.org/brand-guides",
  },
];

const staticPages = [
  {
    segments: ["sponsor"],
    title: "Partner With UnitDown AI | Sponsorship",
    description:
      "Partner with UnitDown AI to reach commercial HVAC technicians worldwide. Advertising, tool partnerships, distributor placements, and more.",
    canonical: "https://unitdown.org/sponsor",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Partner With UnitDown AI",
      description:
        "Partner with UnitDown AI to reach commercial HVAC technicians worldwide. Advertising, tool partnerships, distributor placements, and more.",
      url: "https://unitdown.org/sponsor",
      publisher: { "@type": "Organization", name: "UnitDown AI", url: "https://unitdown.org" },
    },
  },
  {
    segments: ["terms"],
    title: "Terms of Service | UnitDown AI",
    description:
      "UnitDown AI terms of service — the rules and conditions for using our commercial HVAC diagnostic tool.",
    canonical: "https://unitdown.org/terms",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Terms of Service",
      description: "UnitDown AI terms of service.",
      url: "https://unitdown.org/terms",
      publisher: { "@type": "Organization", name: "UnitDown AI", url: "https://unitdown.org" },
    },
  },
  {
    segments: ["privacy"],
    title: "Privacy Policy | UnitDown AI",
    description:
      "UnitDown AI privacy policy — how we collect, use, and protect your data when using our commercial HVAC diagnostic tool.",
    canonical: "https://unitdown.org/privacy",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Privacy Policy",
      description: "UnitDown AI privacy policy.",
      url: "https://unitdown.org/privacy",
      publisher: { "@type": "Organization", name: "UnitDown AI", url: "https://unitdown.org" },
    },
  },
  {
    segments: ["legal"],
    title: "Legal | UnitDown AI",
    description:
      "Terms of service, privacy policy, and safety disclaimer for UnitDown AI — commercial HVAC diagnostic tool.",
    canonical: "https://unitdown.org/legal",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Legal",
      description: "Terms of service, privacy policy, and safety disclaimer for UnitDown AI.",
      url: "https://unitdown.org/legal",
      publisher: { "@type": "Organization", name: "UnitDown AI", url: "https://unitdown.org" },
    },
  },
];

// ── Main ───────────────────────────────────────────────────────────────────

const template = readFileSync(templatePath, "utf8");
let count = 0;

// Guide pages
for (const page of guidePages) {
  const canonical = `https://unitdown.org/guides/${page.slug}`;
  const url = `/guides/${page.slug}`;
  const html = buildHtml(template, {
    title: page.metaTitle,
    description: page.metaDescription,
    canonical,
    type: "article",
    bodyHtml: ssrRender(url),
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "TechArticle",
      headline: page.metaTitle,
      description: page.metaDescription,
      url: canonical,
      author: { "@type": "Organization", name: "UnitDown AI", url: "https://unitdown.org" },
      publisher: {
        "@type": "Organization",
        name: "UnitDown AI",
        url: "https://unitdown.org",
        logo: { "@type": "ImageObject", url: "https://unitdown.org/icon-192.png" },
      },
      mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
    },
  });
  writePage(distDir, ["guides", page.slug], html);
  count++;
}

// Brand pages
for (const page of brandPages) {
  const canonical = `https://unitdown.org/brand-guides/${page.slug}`;
  const url = `/brand-guides/${page.slug}`;
  const html = buildHtml(template, {
    title: page.metaTitle,
    description: page.metaDescription,
    canonical,
    type: "article",
    bodyHtml: ssrRender(url),
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "TechArticle",
      headline: page.metaTitle,
      description: page.metaDescription,
      url: canonical,
      author: { "@type": "Organization", name: "UnitDown AI", url: "https://unitdown.org" },
      publisher: {
        "@type": "Organization",
        name: "UnitDown AI",
        url: "https://unitdown.org",
        logo: { "@type": "ImageObject", url: "https://unitdown.org/icon-192.png" },
      },
      mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
    },
  });
  writePage(distDir, ["brand-guides", page.slug], html);
  count++;
}

// Hub pages
for (const hub of hubPages) {
  const html = buildHtml(template, {
    title: hub.title,
    description: hub.description,
    canonical: hub.canonical,
    type: "website",
    bodyHtml: ssrRender(hub.segments.length === 1 ? `/${hub.segments[0]}` : `/${hub.segments.join("/")}`),
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: hub.title,
      description: hub.description,
      url: hub.canonical,
      publisher: {
        "@type": "Organization",
        name: "UnitDown AI",
        url: "https://unitdown.org",
      },
    },
  });
  writePage(distDir, hub.segments, html);
  count++;
}

// Static pages (sponsor, legal, terms, privacy)
for (const page of staticPages) {
  const url = `/${page.segments.join("/")}`;
  const html = buildHtml(template, {
    title: page.title,
    description: page.description,
    canonical: page.canonical,
    type: "website",
    bodyHtml: ssrRender(url),
    jsonLd: page.jsonLd,
  });
  writePage(distDir, page.segments, html);
  count++;
}

console.log(`✓ Pre-rendered ${count} routes into dist/public/`);
