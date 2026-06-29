/**
 * LandingPage — UnitDown 2.0 public marketing page.
 *
 * Route: / (guests)  — signed-in users are redirected to /dashboard by RootRoute.
 *
 * Sections:
 *   1. Top nav
 *   2. Hero
 *   3. Platform preview (6-tab workflow overview)
 *   4. Feature cards
 *   5. Quick Diagnostic Check (links to /diagnose)
 *   6. Footer
 */

import { useState, useCallback, useEffect, type ReactNode } from "react";
import { useLocation } from "wouter";
import { useUser } from "@clerk/clerk-react";
import {
  ThermometerSnowflake, Sun, Moon, ChevronRight, Cpu,
  Briefcase, FileText, Wrench, Scan, Package,
  LayoutGrid, MapPin, CheckCircle, Zap, Database,
  ArrowRight, Menu, X, Star,
} from "lucide-react";
import { applyTheme } from "@/lib/theme";

// ─── Dark-mode hook (reads from existing app-wide preference) ──────────────────

function useDarkMode() {
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains("dark"),
  );

  const toggle = useCallback(() => {
    const next = !dark;
    applyTheme(next);
    setDark(next);
    try {
      const raw = localStorage.getItem("unitdown_prefs");
      const prefs = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
      localStorage.setItem("unitdown_prefs", JSON.stringify({ ...prefs, darkMode: next }));
    } catch { /* ignore */ }
  }, [dark]);

  return { dark, toggle };
}

// ─── Platform preview tabs ─────────────────────────────────────────────────────

interface PreviewTab {
  id: string;
  label: string;
  icon: ReactNode;
  headline: string;
  body: string;
  chips: readonly string[];
  accent: string;
  badge: string | null;
}

const PREVIEW_TABS: PreviewTab[] = [
  {
    id: "hub",
    label: "Field Hub",
    icon: <LayoutGrid size={14} />,
    headline: "Your morning dashboard.",
    body: "Every open job, equipment alert, and team activity — visible the moment you open the app.",
    chips: ["Open jobs", "Sync status", "Team feed", "Quick start"],
    accent: "blue",
    badge: null,
  },
  {
    id: "job",
    label: "Job Mode",
    icon: <Briefcase size={14} />,
    headline: "A field OS, not a form.",
    body: "Voice notes, measurements, photos, and parts — logged as you work. Dispatch to completion in a single dark-mode flow.",
    chips: ["Dispatch brief", "Live timer", "Voice → text", "Instant USR"],
    accent: "indigo",
    badge: null,
  },
  {
    id: "equipment",
    label: "Equipment Memory",
    icon: <Database size={14} />,
    headline: "History stays with the unit.",
    body: "Every repair, reading, and recommendation stored permanently. Scan a QR code on-site and the entire service history loads instantly.",
    chips: ["Nameplate scan", "Full history", "QR codes", "AI notes"],
    accent: "emerald",
    badge: null,
  },
  {
    id: "ai",
    label: "AI Assistant",
    icon: <Cpu size={14} />,
    headline: "Ranked causes, not search results.",
    body: "Enter symptoms, get a prioritized differential diagnosis with step-by-step checks and meter readings — built from HVAC knowledge, not generic LLM output.",
    chips: ["Multi-cause ranking", "Meter targets", "Fault code lookup", "Contradiction detection"],
    accent: "violet",
    badge: null,
  },
  {
    id: "records",
    label: "Service Records",
    icon: <FileText size={14} />,
    headline: "A permanent, portable record.",
    body: "Every completed job produces a UnitDown Service Record (USR) with a unique ID. Equipment owners keep the history — not the service company.",
    chips: ["Unique USR ID", "Customer-readable", "Contractor-portable", "AI report"],
    accent: "amber",
    badge: null,
  },
  {
    id: "van",
    label: "Van Readiness",
    icon: <Package size={14} />,
    headline: "Know what's in the van before you leave.",
    body: "Parts Intelligence matches job requirements to van stock. See what you have, what's low, and what to grab from the supply house — before dispatch.",
    chips: ["Van inventory", "Job match", "Restock alerts", "Beta"],
    accent: "rose",
    badge: "Beta",
  },
];

const ACCENT: Record<string, { border: string; bg: string; text: string; chip: string }> = {
  blue:   { border: "border-blue-500",   bg: "bg-blue-950/40",   text: "text-blue-400",   chip: "bg-blue-900/50 text-blue-300" },
  indigo: { border: "border-indigo-500", bg: "bg-indigo-950/40", text: "text-indigo-400", chip: "bg-indigo-900/50 text-indigo-300" },
  emerald:{ border: "border-emerald-500",bg: "bg-emerald-950/40",text: "text-emerald-400",chip: "bg-emerald-900/50 text-emerald-300" },
  violet: { border: "border-violet-500", bg: "bg-violet-950/40", text: "text-violet-400", chip: "bg-violet-900/50 text-violet-300" },
  amber:  { border: "border-amber-500",  bg: "bg-amber-950/40",  text: "text-amber-400",  chip: "bg-amber-900/50 text-amber-300" },
  rose:   { border: "border-rose-500",   bg: "bg-rose-950/40",   text: "text-rose-400",   chip: "bg-rose-900/50 text-rose-300" },
};

// ─── Feature cards ─────────────────────────────────────────────────────────────

const FEATURE_CARDS = [
  {
    icon: <Cpu size={20} />,
    title: "AI Diagnostics",
    body: "Ranked differential diagnoses with step-by-step checks, meter targets, and fault code lookups — built for commercial HVAC.",
    href: "/diagnose",
    badge: null,
    color: "blue",
  },
  {
    icon: <Database size={20} />,
    title: "Equipment Memory",
    body: "Every unit's complete service history — repairs, readings, photos, and recommendations — stored permanently and searchable.",
    href: "/records",
    badge: null,
    color: "emerald",
  },
  {
    icon: <Briefcase size={20} />,
    title: "Job Mode",
    body: "A full field operating system. Dispatch brief → active timeline → completion ceremony → UnitDown Service Record in one flow.",
    href: "/job",
    badge: null,
    color: "indigo",
  },
  {
    icon: <FileText size={20} />,
    title: "Service Records",
    body: "Permanent, portable USRs with unique IDs. Equipment owners control their history — not locked to any single service company.",
    href: "/records",
    badge: null,
    color: "amber",
  },
  {
    icon: <Scan size={20} />,
    title: "Nameplate Scanner",
    body: "Capture make, model, serial, capacity, refrigerant, and voltage from any equipment nameplate — manual or AI-assisted.",
    href: "/job",
    badge: null,
    color: "violet",
  },
  {
    icon: <Package size={20} />,
    title: "Parts & Van Readiness",
    body: "Parts Intelligence matches job requirements to your van stock — so you arrive with what you need, not what you guessed.",
    href: "/job",
    badge: "Beta",
    color: "rose",
  },
] as const;

const CARD_COLOR: Record<string, { iconBg: string; iconText: string; border: string }> = {
  blue:   { iconBg: "bg-blue-950",   iconText: "text-blue-400",   border: "hover:border-blue-700/50" },
  emerald:{ iconBg: "bg-emerald-950",iconText: "text-emerald-400",border: "hover:border-emerald-700/50" },
  indigo: { iconBg: "bg-indigo-950", iconText: "text-indigo-400", border: "hover:border-indigo-700/50" },
  amber:  { iconBg: "bg-amber-950",  iconText: "text-amber-400",  border: "hover:border-amber-700/50" },
  violet: { iconBg: "bg-violet-950", iconText: "text-violet-400", border: "hover:border-violet-700/50" },
  rose:   { iconBg: "bg-rose-950",   iconText: "text-rose-400",   border: "hover:border-rose-700/50" },
};

// ─── Main component ────────────────────────────────────────────────────────────

export function LandingPage() {
  const [, navigate] = useLocation();
  const { user, isSignedIn, isLoaded } = useUser();
  const { dark, toggle: toggleDark } = useDarkMode();
  const [activeTab, setActiveTab] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Auto-advance preview tabs
  useEffect(() => {
    const id = setInterval(() => setActiveTab((t) => (t + 1) % PREVIEW_TABS.length), 4500);
    return () => clearInterval(id);
  }, []);

  const tab = PREVIEW_TABS[activeTab];
  const accent = ACCENT[tab.accent];

  // ── Nav ────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white transition-colors">

      {/* ── Top Nav ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-gray-950/90 backdrop-blur border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

          {/* Logo */}
          <button onClick={() => navigate("/")} className="flex items-center gap-2 flex-shrink-0">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <ThermometerSnowflake className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-sm text-gray-900 dark:text-white tracking-tight">UnitDown</span>
            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 rounded px-1.5 py-0.5 hidden sm:inline">2.0</span>
          </button>

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-1">
            <NavLink onClick={() => navigate("/guides")}>Guides</NavLink>
            {isSignedIn && <NavLink onClick={() => navigate("/dashboard")}>Field Hub</NavLink>}
            <NavLink onClick={() => navigate("/pricing")}>Pricing</NavLink>
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Dark toggle */}
            <button
              onClick={toggleDark}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {dark ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {!isLoaded ? null : isSignedIn ? (
              <button
                onClick={() => navigate("/dashboard")}
                className="hidden sm:flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors"
              >
                <LayoutGrid size={13} />
                Field Hub
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate("/login")}
                  className="hidden sm:block text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors px-2 py-1"
                >
                  Log in
                </button>
                <button
                  onClick={() => navigate("/signup")}
                  className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition-colors"
                >
                  Get Started
                </button>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-4 py-3 space-y-1">
            <MobileNavItem label="Guides"    onClick={() => { navigate("/guides");   setMobileMenuOpen(false); }} />
            {isSignedIn && <MobileNavItem label="Field Hub" onClick={() => { navigate("/dashboard"); setMobileMenuOpen(false); }} />}
            <MobileNavItem label="Pricing"   onClick={() => { navigate("/pricing");  setMobileMenuOpen(false); }} />
            <MobileNavItem label="Quick Diagnosis" onClick={() => { navigate("/diagnose"); setMobileMenuOpen(false); }} />
            <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
              {isSignedIn ? (
                <button onClick={() => { navigate("/account"); setMobileMenuOpen(false); }}
                  className="w-full text-left text-sm font-semibold text-blue-600 dark:text-blue-400 py-2">
                  {user?.firstName ?? "Account"} →
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => { navigate("/login"); setMobileMenuOpen(false); }}
                    className="flex-1 text-center text-sm font-semibold text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 py-2 rounded-lg">
                    Log in
                  </button>
                  <button onClick={() => { navigate("/signup"); setMobileMenuOpen(false); }}
                    className="flex-1 text-center text-sm font-bold text-white bg-blue-600 py-2 rounded-lg">
                    Get Started
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gray-950 text-white pt-20 pb-24 px-4">
        {/* Radial glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-blue-600/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-3xl mx-auto text-center">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 bg-blue-950/60 border border-blue-800/50 rounded-full px-3 py-1 text-xs font-semibold text-blue-300 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            UnitDown 2.0 · Now Available
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] mb-5">
            Commercial HVAC Field{" "}
            <span className="text-blue-400">Intelligence</span>{" "}
            Built for the Job
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed mb-10">
            Diagnose issues, save equipment history, manage jobs, track service records,
            and keep technicians moving — from one field hub.
          </p>

          {/* CTA buttons */}
          {!isLoaded ? null : isSignedIn ? (
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <button
                onClick={() => navigate("/dashboard")}
                className="flex items-center gap-2 bg-white text-gray-950 font-bold text-base px-8 py-4 rounded-2xl hover:bg-gray-100 transition-colors shadow-lg shadow-white/10"
              >
                <LayoutGrid size={18} />
                Open Field Hub
              </button>
              <button
                onClick={() => navigate("/diagnose")}
                className="flex items-center gap-2 text-gray-300 font-semibold text-base px-6 py-4 rounded-2xl border border-gray-700 hover:border-gray-500 transition-colors"
              >
                Run Quick Diagnosis
                <ChevronRight size={16} />
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <button
                onClick={() => navigate("/signup")}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-base px-8 py-4 rounded-2xl transition-colors shadow-lg shadow-blue-600/25"
              >
                Get Started Free
                <ChevronRight size={18} />
              </button>
              <button
                onClick={() => navigate("/login")}
                className="flex items-center gap-2 text-gray-300 font-semibold text-base px-6 py-4 rounded-2xl border border-gray-700 hover:border-gray-500 transition-colors"
              >
                Log in
              </button>
            </div>
          )}

          {/* Social proof */}
          <div className="mt-8 flex items-center justify-center gap-4 text-xs text-gray-600">
            <span className="flex items-center gap-1">
              <CheckCircle size={12} className="text-green-500" /> No credit card required
            </span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:flex items-center gap-1">
              <CheckCircle size={12} className="text-green-500" /> Free diagnostic tier
            </span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:flex items-center gap-1">
              <CheckCircle size={12} className="text-green-500" /> Offline-first
            </span>
          </div>
        </div>
      </section>

      {/* ── Platform Preview ─────────────────────────────────────────────────── */}
      <section className="bg-gray-950 px-4 pb-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="text-xs font-semibold uppercase tracking-widest text-gray-600 mb-2">Platform</div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Everything on one platform</h2>
          </div>

          {/* Tab pills */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {PREVIEW_TABS.map((t, i) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(i)}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-full border transition-all ${
                  i === activeTab
                    ? "bg-white text-gray-950 border-white"
                    : "text-gray-400 border-gray-700 hover:border-gray-500"
                }`}
              >
                {t.icon}
                {t.label}
                {t.badge && (
                  <span className="text-[9px] bg-rose-900 text-rose-300 rounded px-1 font-bold">{t.badge}</span>
                )}
              </button>
            ))}
          </div>

          {/* Preview card */}
          <div className={`rounded-3xl border ${accent.border} ${accent.bg} p-6 sm:p-8 transition-all duration-300`}>
            <div className="flex flex-col sm:flex-row items-start gap-6">
              <div className="flex-1">
                <div className={`text-xs font-bold uppercase tracking-widest ${accent.text} mb-2`}>
                  {tab.label}
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-3">{tab.headline}</h3>
                <p className="text-gray-400 leading-relaxed text-sm sm:text-base mb-6">{tab.body}</p>
                <div className="flex flex-wrap gap-2">
                  {tab.chips.map((chip) => (
                    <span key={chip} className={`text-xs font-semibold px-2.5 py-1 rounded-full ${accent.chip}`}>
                      {chip}
                    </span>
                  ))}
                </div>
              </div>

              {/* Preview mock UI */}
              <div className={`w-full sm:w-44 flex-shrink-0 rounded-2xl border ${accent.border} bg-gray-900/60 p-4 space-y-2`}>
                <div className={`text-[9px] font-bold uppercase tracking-widest ${accent.text} mb-3`}>Preview</div>
                {[...Array(4)].map((_, i) => (
                  <div key={i} className={`h-2 rounded-full ${accent.bg} ${i === 0 ? "w-full" : i === 1 ? "w-3/4" : i === 2 ? "w-1/2" : "w-2/3"} border ${accent.border} opacity-60`} />
                ))}
                <div className={`mt-3 h-8 rounded-xl ${accent.bg} border ${accent.border} opacity-40`} />
              </div>
            </div>

            {/* Progress dots */}
            <div className="flex justify-center gap-1.5 mt-6">
              {PREVIEW_TABS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveTab(i)}
                  className={`rounded-full transition-all ${i === activeTab ? `w-4 h-1.5 ${accent.text.replace("text-", "bg-")}` : "w-1.5 h-1.5 bg-gray-700"}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature Cards ────────────────────────────────────────────────────── */}
      <section className="bg-white dark:bg-gray-900 px-4 py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-2">
              Capabilities
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Built for commercial HVAC — not adapted for it
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-3 max-w-xl mx-auto">
              Every feature was designed around how technicians and service managers actually work in the field.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURE_CARDS.map((card) => {
              const cc = CARD_COLOR[card.color];
              return (
                <button
                  key={card.title}
                  onClick={() => navigate(card.href)}
                  className={`group text-left rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-5 transition-all ${cc.border}`}
                >
                  <div className={`w-9 h-9 rounded-xl ${cc.iconBg} flex items-center justify-center mb-4 ${cc.iconText}`}>
                    {card.icon}
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-900 dark:text-white text-sm">{card.title}</h3>
                    {card.badge && (
                      <span className="text-[9px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 rounded px-1.5 py-0.5">
                        {card.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{card.body}</p>
                  <div className={`mt-3 flex items-center gap-1 text-xs font-semibold ${cc.iconText} opacity-0 group-hover:opacity-100 transition-opacity`}>
                    Explore <ArrowRight size={11} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Service Record / USS section ─────────────────────────────────────── */}
      <section className="bg-gray-950 px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-3xl border border-blue-800/40 bg-blue-950/20 p-8 sm:p-12 text-center">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <FileText size={22} className="text-white" />
            </div>
            <div className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-3">
              UnitDown Service Standard
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
              The equipment owns its history.
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Every completed job produces a UnitDown Service Record — a permanent, portable record
              with a unique USR ID. When a facility changes service providers, the new contractor
              imports the history instantly. No more lost records.
            </p>
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Unique USR ID", icon: <Star size={14} /> },
                { label: "Portable History", icon: <MapPin size={14} /> },
                { label: "AI Report", icon: <Cpu size={14} /> },
                { label: "Vendor Neutral", icon: <CheckCircle size={14} /> },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-blue-800/40 bg-blue-950/30 px-3 py-3 flex flex-col items-center gap-2">
                  <div className="text-blue-400">{item.icon}</div>
                  <div className="text-xs font-semibold text-blue-200 text-center">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Quick Diagnostic Check ───────────────────────────────────────────── */}
      <section className="bg-white dark:bg-gray-900 px-4 py-20">
        <div className="max-w-xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800/40 rounded-full px-3 py-1 text-xs font-semibold text-violet-600 dark:text-violet-400 mb-5">
            <Zap size={11} />
            Quick Diagnostic Check
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3">
            Not sure what's wrong?
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
            Describe the symptoms — unit not cooling, high head pressure, intermittent fault codes —
            and get a ranked list of probable causes with meter targets and step-by-step checks.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate("/diagnose")}
              className="flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-bold px-7 py-4 rounded-2xl transition-colors text-sm"
            >
              <Cpu size={16} />
              Run AI Diagnosis
            </button>
            <button
              onClick={() => navigate("/guides")}
              className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400 font-semibold px-7 py-4 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-colors text-sm"
            >
              Browse Guides
            </button>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-600 mt-4">
            Free tier includes {String(4)} diagnoses · No account needed to try
          </p>
        </div>
      </section>

      {/* ── Pricing CTA ─────────────────────────────────────────────────────── */}
      <section className="bg-gray-950 px-4 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            Ready to run a better field operation?
          </h2>
          <p className="text-gray-400 mb-8">
            Free plan available. Pro unlocks Job Mode, Service Records, Equipment Memory, and unlimited diagnoses.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {isSignedIn ? (
              <button
                onClick={() => navigate("/dashboard")}
                className="flex items-center justify-center gap-2 bg-white text-gray-950 font-bold px-8 py-4 rounded-2xl hover:bg-gray-100 transition-colors text-sm"
              >
                <LayoutGrid size={16} />
                Open Field Hub
              </button>
            ) : (
              <>
                <button
                  onClick={() => navigate("/signup")}
                  className="flex items-center justify-center gap-2 bg-white text-gray-950 font-bold px-8 py-4 rounded-2xl hover:bg-gray-100 transition-colors text-sm"
                >
                  Get Started Free
                  <ChevronRight size={16} />
                </button>
                <button
                  onClick={() => navigate("/pricing")}
                  className="flex items-center justify-center gap-2 text-gray-400 font-semibold px-6 py-4 rounded-2xl border border-gray-700 hover:border-gray-500 transition-colors text-sm"
                >
                  View Pricing
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="bg-gray-900 border-t border-gray-800 px-4 py-10">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-8 mb-8">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center">
                  <ThermometerSnowflake className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="font-extrabold text-sm text-white">UnitDown</span>
                <span className="text-[10px] text-blue-400 font-bold">2.0</span>
              </div>
              <p className="text-xs text-gray-500 max-w-xs leading-relaxed">
                Commercial HVAC field intelligence. Built for the job.
              </p>
            </div>

            {/* Link groups */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-4">
              <FooterGroup title="Product" links={[
                { label: "Field Hub",      href: "/dashboard" },
                { label: "AI Diagnostics", href: "/diagnose" },
                { label: "Equipment",      href: "/records" },
                { label: "Job Mode",       href: "/job" },
                { label: "Pricing",        href: "/pricing" },
              ]} navigate={navigate} />
              <FooterGroup title="Resources" links={[
                { label: "Troubleshooting Guides", href: "/guides" },
                { label: "Brand Guides",           href: "/brand-guides" },
                { label: "Sponsor",                href: "/sponsor" },
              ]} navigate={navigate} />
              <FooterGroup title="Account" links={[
                { label: "Log in",   href: "/login" },
                { label: "Sign up",  href: "/signup" },
                { label: "Account",  href: "/account" },
                { label: "Privacy",  href: "/privacy" },
                { label: "Terms",    href: "/terms" },
              ]} navigate={navigate} />
            </div>
          </div>

          <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-gray-600">
              © {new Date().getFullYear()} UnitDown AI. All rights reserved.
            </p>
            <p className="text-xs text-gray-700">
              The UnitDown Service Standard — equipment history that stays with the unit, not the company.
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}

// ─── Small helpers ─────────────────────────────────────────────────────────────

function NavLink({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
    >
      {children}
    </button>
  );
}

function MobileNavItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
    >
      {label}
    </button>
  );
}

function FooterGroup({
  title,
  links,
  navigate,
}: {
  title: string;
  links: { label: string; href: string }[];
  navigate: (href: string) => void;
}) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">{title}</div>
      <ul className="space-y-1.5">
        {links.map((l) => (
          <li key={l.label}>
            <button
              onClick={() => navigate(l.href)}
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              {l.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
