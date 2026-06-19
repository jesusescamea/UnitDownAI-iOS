import { Router } from "express";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

const router = Router();

// ── Meta data (mirrors prerender.mjs) ─────────────────────────────────────

const guidePages: Record<string, { metaTitle: string; metaDescription: string }> = {
  "rtu-not-cooling-but-compressor-running": {
    metaTitle: "RTU Not Cooling But Compressor Running | UnitDown",
    metaDescription: "Common causes when rooftop unit compressor runs but building is not cooling. Fast checks and technician troubleshooting steps.",
  },
  "rtu-blower-motor-hums-wont-start": {
    metaTitle: "RTU Blower Motor Hums But Won't Start | UnitDown",
    metaDescription: "Why rooftop blower motors hum but fail to start. Capacitors, seized bearings, voltage drop and overload causes explained.",
  },
  "high-static-pressure-rooftop-unit-causes": {
    metaTitle: "High Static Pressure Rooftop Unit Causes | UnitDown",
    metaDescription: "Find common reasons rooftop units develop high static pressure and airflow problems in commercial HVAC systems.",
  },
  "economizer-stuck-open-symptoms": {
    metaTitle: "Economizer Stuck Open Symptoms | UnitDown",
    metaDescription: "Symptoms of a rooftop economizer stuck open and how technicians diagnose damper issues on commercial RTUs.",
  },
  "rooftop-unit-ignition-lockout": {
    metaTitle: "Rooftop Unit Ignition Lockout Causes | UnitDown",
    metaDescription: "Common reasons commercial rooftop units enter ignition lockout mode and how to diagnose heating failures.",
  },
  "24v-present-no-contactor-pull-in": {
    metaTitle: "24V Present But No Contactor Pull In | UnitDown",
    metaDescription: "24 volts present but contactor won't pull in? Common HVAC causes and fast checks for this frustrating fault.",
  },
  "thermostat-calling-but-no-cooling": {
    metaTitle: "Thermostat Calling But No Cooling | UnitDown",
    metaDescription: "Thermostat calls for cooling but system does not start. Step-by-step troubleshooting guide for HVAC technicians.",
  },
  "float-switch-keeps-tripping-causes": {
    metaTitle: "Float Switch Keeps Tripping Causes | UnitDown",
    metaDescription: "Why HVAC float switches trip repeatedly and how to solve condensate drainage problems permanently.",
  },
  "contactor-buzzing-not-pulling-in": {
    metaTitle: "Contactor Buzzing But Not Pulling In | UnitDown",
    metaDescription: "Contactor buzzing but not engaging? Diagnose weak voltage, coil failure, and mechanical sticking issues.",
  },
  "high-superheat-troubleshooting-chart": {
    metaTitle: "High Superheat Troubleshooting Chart | UnitDown",
    metaDescription: "Common causes of high superheat in HVAC systems and how technicians verify charge and TXV feed issues.",
  },
};

const brandPages: Record<string, { metaTitle: string; metaDescription: string }> = {
  "lennox-prodigy-m3-lockout-causes": {
    metaTitle: "Lennox Prodigy M3 Lockout Causes | UnitDown",
    metaDescription: "Why Lennox Prodigy M3 commercial RTUs enter lockout mode. Fault codes, sensor faults, and board diagnostics explained.",
  },
  "carrier-rtu-high-pressure-lockout-reset": {
    metaTitle: "Carrier RTU High Pressure Lockout Reset | UnitDown",
    metaDescription: "Why Carrier commercial rooftop units lock out on high pressure and how technicians diagnose and safely reset the fault.",
  },
  "trane-voyager-trips-on-heat": {
    metaTitle: "Trane Voyager Unit Trips on Heat | UnitDown",
    metaDescription: "Why Trane Voyager commercial RTUs trip during heating calls. Ignition faults, rollout switches, heat exchanger issues explained.",
  },
  "york-simplicity-board-random-shutdown": {
    metaTitle: "York Simplicity Board Random Shutdown | UnitDown",
    metaDescription: "York Simplicity control board causes random shutdowns. Fault codes, sensor issues, and control board diagnosis.",
  },
  "aaon-freeze-protection-alarm-causes": {
    metaTitle: "Aaon Freeze Protection Alarm Causes | UnitDown",
    metaDescription: "AAON RTU freeze protection alarm causes. Coil sensor faults, low refrigerant, and airflow issues on AAON commercial units.",
  },
  "daikin-rtu-safety-lockout-reset": {
    metaTitle: "Daikin RTU Safety Lockout Reset | UnitDown",
    metaDescription: "Daikin Applied commercial RTU safety lockout causes and reset procedures. Fault codes, sensor diagnostics, and field steps.",
  },
  "goodman-commercial-pressure-switch-trips": {
    metaTitle: "Goodman Commercial Pressure Switch Trips | UnitDown",
    metaDescription: "Why Goodman commercial HVAC pressure switches trip repeatedly and how technicians diagnose inducer and refrigerant circuit faults.",
  },
  "rheem-ignition-retry-lockout": {
    metaTitle: "Rheem Ignition Retry Lockout | UnitDown",
    metaDescription: "Rheem commercial HVAC ignition retry lockout causes. Flame sensor faults, gas valve issues, and board diagnostics.",
  },
  "carrier-economizer-fault-causes": {
    metaTitle: "Carrier Economizer Fault Causes | UnitDown",
    metaDescription: "Carrier commercial RTU EconoMi$er fault codes and causes. Actuator failures, sensor faults, and controller diagnostics.",
  },
  "trane-supply-fan-proof-failure": {
    metaTitle: "Trane Supply Fan Proof Failure | UnitDown",
    metaDescription: "Trane RTU supply fan proof failure causes. Airflow switches, VFD faults, and belt drive issues on Trane commercial units.",
  },
};

// ── Template ───────────────────────────────────────────────────────────────

// Path relative to the process working directory (workspace root in production)
const TEMPLATE_PATH = join(process.cwd(), "artifacts/unitdown-ai/dist/public/index.html");

// Cache with a 60-second TTL so a rebuild is picked up without a server restart
let templateCache: { html: string; readAt: number } | null = null;

function getTemplate(): string {
  const now = Date.now();
  if (templateCache && now - templateCache.readAt < 60_000) {
    return templateCache.html;
  }
  if (existsSync(TEMPLATE_PATH)) {
    const html = readFileSync(TEMPLATE_PATH, "utf8");
    templateCache = { html, readAt: now };
    return html;
  }
  // Fallback: minimal shell with no asset references (dev mode / first run)
  return [
    "<!DOCTYPE html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="UTF-8"/>',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5"/>',
    "__META_BLOCK__",
    "</head>",
    "<body><div id=\"root\"></div></body>",
    "</html>",
  ].join("\n");
}

// ── HTML builder ───────────────────────────────────────────────────────────

function escAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

interface PageMeta {
  title: string;
  description: string;
  canonical: string;
  ogType: "article" | "website";
  jsonLd: object;
}

function buildHtml(meta: PageMeta): string {
  const tpl = getTemplate();
  const { title, description, canonical, ogType, jsonLd } = meta;

  // Full built template — swap the known meta tag patterns
  if (tpl.includes("__META_BLOCK__")) {
    // Minimal fallback template
    const metaBlock = [
      `<title>${escAttr(title)}</title>`,
      `<meta name="description" content="${escAttr(description)}"/>`,
      `<link rel="canonical" href="${escAttr(canonical)}"/>`,
      `<meta property="og:type" content="${escAttr(ogType)}"/>`,
      `<meta property="og:url" content="${escAttr(canonical)}"/>`,
      `<meta property="og:title" content="${escAttr(title)}"/>`,
      `<meta property="og:description" content="${escAttr(description)}"/>`,
      `<meta name="twitter:card" content="summary_large_image"/>`,
      `<meta name="twitter:title" content="${escAttr(title)}"/>`,
      `<meta name="twitter:description" content="${escAttr(description)}"/>`,
      `<script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n</script>`,
    ].join("\n");
    return tpl.replace("__META_BLOCK__", metaBlock);
  }

  let html = tpl;
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${escAttr(title)}</title>`);
  html = html.replace(/(<meta\s+name="description"\s+content=")[^"]*(")/,   `$1${escAttr(description)}$2`);
  html = html.replace(/(<link\s+rel="canonical"\s+href=")[^"]*(")/,          `$1${escAttr(canonical)}$2`);
  html = html.replace(/(<meta\s+property="og:type"\s+content=")[^"]*(")/,    `$1${escAttr(ogType)}$2`);
  html = html.replace(/(<meta\s+property="og:url"\s+content=")[^"]*(")/,     `$1${escAttr(canonical)}$2`);
  html = html.replace(/(<meta\s+property="og:title"\s+content=")[^"]*(")/,   `$1${escAttr(title)}$2`);
  html = html.replace(/(<meta\s+property="og:description"\s+content=")[^"]*(")/,`$1${escAttr(description)}$2`);
  html = html.replace(/(<meta\s+name="twitter:title"\s+content=")[^"]*(")/,  `$1${escAttr(title)}$2`);
  html = html.replace(/(<meta\s+name="twitter:description"\s+content=")[^"]*(")/,`$1${escAttr(description)}$2`);
  html = html.replace(
    /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
    `<script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n    </script>`,
  );
  return html;
}

function techArticleJsonLd(title: string, description: string, canonical: string) {
  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: title,
    description,
    url: canonical,
    author: { "@type": "Organization", name: "UnitDown AI", url: "https://unitdown.org" },
    publisher: {
      "@type": "Organization",
      name: "UnitDown AI",
      url: "https://unitdown.org",
      logo: { "@type": "ImageObject", url: "https://unitdown.org/icon-192.png" },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
  };
}

// ── Routes ─────────────────────────────────────────────────────────────────

// /guides  — hub
router.get("/", (req, res) => {
  const title = "Commercial HVAC Troubleshooting Guides | UnitDown";
  const description =
    "Free commercial HVAC troubleshooting guides for RTU faults, blower motor issues, high static pressure, economizer problems, ignition lockouts, and contactor faults.";
  const canonical = "https://unitdown.org/guides";
  const html = buildHtml({
    title, description, canonical, ogType: "website",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: title, description, url: canonical,
      publisher: { "@type": "Organization", name: "UnitDown AI", url: "https://unitdown.org" },
    },
  });
  req.log.info({ url: req.url }, "seo: serving guides hub");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

// /guides/:slug  — individual guide page
router.get("/:slug", (req, res) => {
  const { slug } = req.params;
  const page = guidePages[slug];
  if (!page) {
    // Unknown slug — let the SPA handle it (send generic shell)
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(getTemplate().replace("__META_BLOCK__", ""));
    return;
  }
  const canonical = `https://unitdown.org/guides/${slug}`;
  const html = buildHtml({
    title: page.metaTitle,
    description: page.metaDescription,
    canonical,
    ogType: "article",
    jsonLd: techArticleJsonLd(page.metaTitle, page.metaDescription, canonical),
  });
  req.log.info({ url: req.url, slug }, "seo: serving guide page");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

export { router as guideRouter };

// ── Brand router ───────────────────────────────────────────────────────────

const brandRouter = Router();

// /brand-guides  — hub
brandRouter.get("/", (req, res) => {
  const title = "Brand-Specific HVAC Fault Guides | UnitDown";
  const description =
    "Brand and model-specific fault guides for Carrier, Lennox, Trane, York, Goodman, Daikin, and Rheem commercial rooftop units.";
  const canonical = "https://unitdown.org/brand-guides";
  const html = buildHtml({
    title, description, canonical, ogType: "website",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: title, description, url: canonical,
      publisher: { "@type": "Organization", name: "UnitDown AI", url: "https://unitdown.org" },
    },
  });
  req.log.info({ url: req.url }, "seo: serving brand-guides hub");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

// /brand-guides/:slug  — individual brand guide page
brandRouter.get("/:slug", (req, res) => {
  const { slug } = req.params;
  const page = brandPages[slug];
  if (!page) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(getTemplate().replace("__META_BLOCK__", ""));
    return;
  }
  const canonical = `https://unitdown.org/brand-guides/${slug}`;
  const html = buildHtml({
    title: page.metaTitle,
    description: page.metaDescription,
    canonical,
    ogType: "article",
    jsonLd: techArticleJsonLd(page.metaTitle, page.metaDescription, canonical),
  });
  req.log.info({ url: req.url, slug }, "seo: serving brand guide page");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

export { brandRouter };
