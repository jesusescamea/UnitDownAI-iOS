import { useEffect } from "react";

const HOMEPAGE: {
  title: string;
  description: string;
  canonical: string;
  ogType: string;
  ogTitle: string;
  ogDescription: string;
  twitterTitle: string;
  twitterDescription: string;
} = {
  title: "UnitDown AI — Commercial HVAC Diagnostic Tool | Free Trial",
  description:
    "Instantly diagnose commercial HVAC failures. Get technician-level root causes, first checks, meter readings, and recommended actions — free for your first 6 diagnoses.",
  canonical: "https://unitdown.org/",
  ogType: "website",
  ogTitle: "UnitDown AI — Commercial HVAC Diagnostic Tool",
  ogDescription:
    "Instantly diagnose commercial HVAC failures. Get technician-level root causes, meter readings, and recommended actions in seconds.",
  twitterTitle: "UnitDown AI — Commercial HVAC Diagnostic Tool",
  twitterDescription:
    "Instantly diagnose commercial HVAC failures. Technician-level results in seconds — free trial, no login.",
};

function setMeta(selector: string, content: string) {
  const el = document.querySelector<HTMLMetaElement>(selector);
  if (el) el.content = content;
}

function setLink(rel: string, href: string) {
  const el = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (el) el.href = href;
}

export interface SeoHeadOptions {
  title: string;
  description: string;
  canonical: string;
  ogType?: "website" | "article";
}

/**
 * Updates all crawlable head tags for a non-home public page:
 * title, description, canonical, og:url, og:type, og:title, og:description,
 * twitter:title, twitter:description.
 *
 * On unmount it restores homepage defaults so SPA navigation
 * from a guide page back to the home page keeps correct tags.
 */
export function useSeoHead({
  title,
  description,
  canonical,
  ogType = "article",
}: SeoHeadOptions) {
  useEffect(() => {
    document.title = title;
    setMeta('meta[name="description"]', description);
    setLink("canonical", canonical);
    setMeta('meta[property="og:url"]', canonical);
    setMeta('meta[property="og:type"]', ogType);
    setMeta('meta[property="og:title"]', title);
    setMeta('meta[property="og:description"]', description);
    setMeta('meta[name="twitter:title"]', title);
    setMeta('meta[name="twitter:description"]', description);

    return () => {
      document.title = HOMEPAGE.title;
      setMeta('meta[name="description"]', HOMEPAGE.description);
      setLink("canonical", HOMEPAGE.canonical);
      setMeta('meta[property="og:url"]', HOMEPAGE.canonical);
      setMeta('meta[property="og:type"]', HOMEPAGE.ogType);
      setMeta('meta[property="og:title"]', HOMEPAGE.ogTitle);
      setMeta('meta[property="og:description"]', HOMEPAGE.ogDescription);
      setMeta('meta[name="twitter:title"]', HOMEPAGE.twitterTitle);
      setMeta('meta[name="twitter:description"]', HOMEPAGE.twitterDescription);
    };
  }, [title, description, canonical, ogType]);
}
