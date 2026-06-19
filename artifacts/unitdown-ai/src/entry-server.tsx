import React from "react";
import { renderToString } from "react-dom/server";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";

import TroubleshootingHub from "./pages/seo/TroubleshootingHub";
import BrandHub from "./pages/seo/BrandHub";
import SeoPage from "./pages/seo/SeoPage";
import BrandPage from "./pages/seo/BrandPage";
import SponsorPage from "./pages/SponsorPage";
import PrivacyPage from "./pages/privacy";
import TermsPage from "./pages/terms";
import LegalPage from "./pages/LegalPage";

type PageComponent = React.ComponentType;

function resolveComponent(url: string): PageComponent | null {
  if (url === "/guides") return TroubleshootingHub;
  if (url.startsWith("/guides/")) return SeoPage;
  if (url === "/brand-guides") return BrandHub;
  if (url.startsWith("/brand-guides/")) return BrandPage;
  if (url === "/sponsor") return SponsorPage;
  if (url === "/privacy") return PrivacyPage;
  if (url === "/terms") return TermsPage;
  if (url === "/legal") return LegalPage;
  return null;
}

/**
 * Renders a public route to an HTML string.
 * Returns an empty string for unknown routes.
 */
export function render(url: string): string {
  const PageComponent = resolveComponent(url);
  if (!PageComponent) return "";

  const { hook } = memoryLocation({ path: url, static: true });

  return renderToString(
    <Router hook={hook}>
      <PageComponent />
    </Router>
  );
}
