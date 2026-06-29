import { useState, useEffect, useRef, useCallback } from "react";
import { Switch, Route, Router as WouterRouter, useLocation, Link } from "wouter";
import { useUser, useClerk, UserButton, SignedIn, SignedOut } from "@clerk/clerk-react";
import { shouldUseAppleIAP } from "@/lib/platform";
import { trackDiagnosisComplete, trackThumbsUp, maybeRequestReview, trackAppOpen } from "@/lib/appReview";
import { awardReward } from "@/lib/rewards";
import { useToast } from "@/hooks/use-toast";
import { Browser } from "@capacitor/browser";
import { isDemoProEmail } from "@/lib/demoAccess";
import { isDemoSessionActive } from "@/lib/demoSession";
import { purchasePro, restorePurchases, fetchProducts, checkIAPSubscriptionActive, IAP_PRODUCT_ID } from "@/lib/appleIAP";
import TermsPage from "./pages/terms";
import PrivacyPage from "./pages/privacy";
import LegalPage from "./pages/LegalPage";
import LoginPage from "./pages/login";
import SignupPage from "./pages/signup";
import SsoCallbackPage from "./pages/sso-callback";
import SeoPage from "./pages/seo/SeoPage";
import TroubleshootingHub from "./pages/seo/TroubleshootingHub";
import BrandPage from "./pages/seo/BrandPage";
import BrandHub from "./pages/seo/BrandHub";
import SponsorPage from "./pages/SponsorPage";
import AccountPage from "./pages/AccountPage";
import RecordsPage from "./pages/RecordsPage";
import UnitFormPage from "./pages/UnitFormPage";
import UnitDetailPage from "./pages/UnitDetailPage";
import DiagnosticLogDetailPage from "./pages/DiagnosticLogDetailPage";
import NotFound from "./pages/not-found";
import FieldHubDashboard from "./pages/FieldHubDashboard";
import PricingPage from "./pages/PricingPage";
import DevEquipmentPreview from "./pages/DevEquipmentPreview";
import JobModePrototype from "./pages/JobModePrototype";
import DevJobPreview from "./pages/DevJobPreview";
import DevJobRecordPreview from "./pages/DevJobRecordPreview";
import { JobModePage } from "./pages/JobModePage";
import { ServiceRecordPage } from "./pages/ServiceRecordPage";
import { JobModeProvider } from "./context/JobModeContext";
import InstallPromptBanner from "./components/InstallPromptBanner";
import { ActiveJobBanner } from "./components/job/ActiveJobBanner";
import EmailWallModal from "./components/EmailWallModal";
import { getFingerprint } from "./lib/fingerprint";
import { applyTheme } from "./lib/theme";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { motion, AnimatePresence, useInView } from "framer-motion";

import { useDiagnoseHvac } from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ThermometerSnowflake,
  CheckCircle2,
  AlertTriangle,
  Activity,
  AlertCircle,
  ListChecks,
  Wrench,
  History,
  Trash2,
  ShieldCheck,
  Zap,
  Wrench as WrenchIcon,
  Cpu,
  Building2,
  Search,
  ArrowRight,
  RotateCcw,
  Phone,
  Star,
  X,
  Download,
  Users,
  Clock,
  MapPin,
  Mail,
  ChevronRight,
  CheckCircle,
  ExternalLink,
  Gauge,
  ChevronDown,
  Info,
  TriangleAlert,
  Lock,
  Sparkles,
  FlaskConical,
  BookOpen,
  KeyRound,
  Briefcase,
  LogOut,
  UserCircle,
  ThumbsUp,
  ThumbsDown,
  Globe,
  Moon,
  Sun,
  Smartphone,
  Bell,
  ScanLine,
  Camera,
  LayoutGrid,
  Archive,
  CalendarPlus,
} from "lucide-react";

const queryClient = new QueryClient();

// ─── Interfaces ────────────────────────────────────────────────────────────────

interface DiagnosisEntry {
  id: string;
  title: string;
  category: string;
  whyThisFits: string;
  likelyCauses: string[];
  firstChecks: string[];
  meterChecks: string[];
  priorityLevel: "low" | "medium" | "high" | "critical";
  confidencePercent: number;
  recommendedAction: string;
  riskNote: string;
}

interface DiagnosisResult {
  primary: DiagnosisEntry;
  alternatives: DiagnosisEntry[];
  isPro: boolean;
}

interface HistoryEntry {
  id: string;
  symptoms: string;
  result: DiagnosisResult;
  timestamp: number;
}

interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  businessName: string;
  city: string;
  equipmentType: string;
  urgencyLevel: string;
  issueDescription: string;
  timestamp: number;
  diagnosisCategory?: string;
  priorityLevel?: string;
}

// ─── Storage helpers ────────────────────────────────────────────────────────────

const HISTORY_KEY = "unitdown_history";
const LEADS_KEY = "unitdown_leads";
const DIAG_COUNT_KEY = "unitdown_free_diagnostics_used";
const CLIENT_ID_KEY = "unitdown_client_id";
const PRO_KEY = "unitdown_is_pro";
const FREE_DIAGNOSES = 4;
const MAX_HISTORY = 20;

function getOrCreateClientId(): string {
  try {
    let id = localStorage.getItem(CLIENT_ID_KEY);
    if (!id) {
      id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(CLIENT_ID_KEY, id);
    }
    return id;
  } catch {
    return `anon-${Math.random().toString(36).slice(2, 10)}`;
  }
}

function loadIsProCached(): boolean {
  try { return localStorage.getItem(PRO_KEY) === "1"; } catch { return false; }
}

function saveIsProCached(val: boolean): void {
  try { localStorage.setItem(PRO_KEY, val ? "1" : "0"); } catch {}
}

function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function saveHistory(entries: HistoryEntry[]): void {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(entries)); } catch {}
}

function loadLeads(): Lead[] {
  try {
    const raw = localStorage.getItem(LEADS_KEY);
    return raw ? (JSON.parse(raw) as Lead[]) : [];
  } catch {
    return [];
  }
}

function saveLeads(leads: Lead[]): void {
  try { localStorage.setItem(LEADS_KEY, JSON.stringify(leads)); } catch {}
}

function loadDiagCount(): number {
  try { return parseInt(localStorage.getItem(DIAG_COUNT_KEY) ?? "0", 10) || 0; } catch { return 0; }
}

function incrementDiagCount(): number {
  const next = loadDiagCount() + 1;
  try { localStorage.setItem(DIAG_COUNT_KEY, String(next)); } catch {}
  return next;
}

// ─── Upsell dismissal helpers ───────────────────────────────────────────────────

const UPSELL_DISMISSED_KEY = "unitdown_upsell_dismissed_at";
const UPSELL_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function loadUpsellDismissedAt(): number {
  try { return parseInt(localStorage.getItem(UPSELL_DISMISSED_KEY) ?? "0", 10) || 0; } catch { return 0; }
}
function saveUpsellDismissedAt(): void {
  try { localStorage.setItem(UPSELL_DISMISSED_KEY, String(Date.now())); } catch {}
}
function isUpsellOnCooldown(): boolean {
  const ts = loadUpsellDismissedAt();
  if (!ts) return false;
  return Date.now() - ts < UPSELL_COOLDOWN_MS;
}

// ─── Static data ────────────────────────────────────────────────────────────────

const exampleSymptoms = [
  "Single-stage RTU compressor and condenser fan drop out immediately when R is jumped to Y1.",
  "24V present at thermostat Y call, but no voltage reaches the contactor coil.",
  "Carrier RTU cools for 15 minutes, then opens low-pressure safety.",
  "High superheat and low subcooling with clean condenser coil and normal airflow.",
  "Blower receives G call, but fan relay does not energize.",
  "Compressor pulls locked-rotor amps and trips breaker within 2 seconds.",
];

const exampleSymptomsB = [
  "Supply fan proves, ignition sequence starts, flame establishes, then drops out after 3 seconds.",
  "Control voltage drops from 24VAC to 12VAC when contactor coil pulls in.",
  "Lennox Prodigy economizer alarm with outdoor air damper stuck open.",
  "Low suction pressure with normal head pressure and evaporator beginning to freeze.",
  "Condenser fan running backwards after motor replacement.",
  "Y1 and Y2 energized, but compressor never starts.",
];

const trustBadges = [
  { icon: Cpu,        label: "AI Diagnostics" },
  { icon: LayoutGrid, label: "Field Hub" },
  { icon: Archive,    label: "Equipment Records" },
  { icon: ScanLine,   label: "Nameplate Scanner" },
  { icon: History,    label: "Diagnostic History" },
  { icon: Bell,       label: "Service Reminders" },
  { icon: Camera,     label: "Photo Notes" },
  { icon: RotateCcw,  label: "Cross-Device Sync" },
];

const equipmentTypes = [
  "Rooftop Unit (RTU)",
  "Split System",
  "Chiller",
  "Heat Pump",
  "Boiler",
  "Fan Coil Unit",
  "PTAC / PTHP",
  "Mini-Split",
  "Other",
];

const urgencyLevels = [
  "Emergency — Call ASAP",
  "Today",
  "Within 48 Hours",
  "This Week",
  "Flexible",
];

// ─── Animation variants ─────────────────────────────────────────────────────────

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
};

// ─── Utility functions ──────────────────────────────────────────────────────────

function priorityConfig(level: DiagnosisEntry["priorityLevel"]) {
  switch (level) {
    case "low":
      return { label: "Low Priority", className: "bg-emerald-100 text-emerald-800 border-emerald-200", barColor: "bg-emerald-500", Icon: CheckCircle2 };
    case "medium":
      return { label: "Medium Priority", className: "bg-amber-100 text-amber-800 border-amber-200", barColor: "bg-amber-500", Icon: Activity };
    case "high":
      return { label: "High Priority", className: "bg-orange-100 text-orange-800 border-orange-200", barColor: "bg-orange-500", Icon: AlertTriangle };
    case "critical":
      return { label: "Critical", className: "bg-red-100 text-red-900 border-red-300", barColor: "bg-red-600", Icon: AlertCircle };
    default:
      return { label: "Unknown", className: "bg-slate-100 text-slate-700 border-slate-200", barColor: "bg-slate-400", Icon: Activity };
  }
}

function confidenceColor(pct: number): string {
  if (pct >= 85) return "bg-emerald-500";
  if (pct >= 70) return "bg-blue-500";
  if (pct >= 55) return "bg-amber-500";
  return "bg-red-500";
}

function exportLeadsCSV(leads: Lead[]) {
  const headers = ["ID", "Timestamp", "Name", "Phone", "Email", "Business Name", "City", "Equipment Type", "Urgency Level", "Issue Description", "Diagnosis Category", "Priority Level"];
  const rows = leads.map((l) => [
    l.id,
    new Date(l.timestamp).toLocaleString(),
    l.name,
    l.phone,
    l.email,
    l.businessName,
    l.city,
    l.equipmentType,
    l.urgencyLevel,
    l.issueDescription.replace(/"/g, '""'),
    l.diagnosisCategory ?? "",
    l.priorityLevel ?? "",
  ].map((v) => `"${v}"`).join(","));

  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `unitdown-leads-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── AnimatedConfidenceBar ──────────────────────────────────────────────────────

function AnimatedConfidenceBar({ pct, color }: { pct: number; color: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  return (
    <div ref={ref} className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
      <motion.div
        className={`h-full rounded-full ${color}`}
        initial={{ width: 0 }}
        animate={{ width: inView ? `${pct}%` : 0 }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] as [number, number, number, number], delay: 0.2 }}
      />
    </div>
  );
}

// ─── DiagnosticSkeleton ─────────────────────────────────────────────────────────

function DiagnosticSkeleton() {
  return (
    <div className="space-y-6" data-testid="loading-skeleton">
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="bg-slate-900 px-6 py-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-3 w-28 bg-slate-700" />
              <Skeleton className="h-7 w-52 bg-slate-700" />
            </div>
            <Skeleton className="h-8 w-32 rounded-full bg-slate-700" />
          </div>
        </div>
        <div className="px-6 py-5 space-y-3">
          <div className="flex justify-between">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-10" />
          </div>
          <Skeleton className="h-3 w-full rounded-full" />
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
      </div>
      <Skeleton className="h-32 w-full rounded-2xl" />
    </div>
  );
}

// ─── AppleIAPUpgradeModal ─────────────────────────────────────────────────────
// Shown on iOS ONLY. Uses StoreKit via the @capacitor-community/in-app-purchases
// plugin. Never exposes Stripe or any external payment link.

interface AppleIAPUpgradeModalProps {
  open: boolean;
  onClose: () => void;
  onPurchaseComplete: () => void;
}

function AppleIAPUpgradeModal({ open, onClose, onPurchaseComplete }: AppleIAPUpgradeModalProps) {
  const [productPrice, setProductPrice] = useState("$7.99");
  const [productsLoading, setProductsLoading] = useState(false);
  // null = loading/unknown, true = StoreKit confirmed product, false = StoreKit returned 0
  const [productAvailable, setProductAvailable] = useState<boolean | null>(null);
  const [buying, setBuying] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!open) return;
    // Reset all transient state on every open so a prior error or success
    // state from a previous session is never carried into the new one.
    setError(null);
    setSuccess(false);
    setBuying(false);
    setRestoring(false);
    setProductAvailable(null);
    setProductsLoading(true);
    fetchProducts()
      .then((products) => {
        const match = products.find((p) => p.productId === IAP_PRODUCT_ID);
        if (match) {
          setProductPrice(match.price);
          setProductAvailable(true);
        } else {
          // StoreKit returned 0 products — subscription not yet available in
          // this environment (App Store Connect version not yet linked, or
          // subscription still under review). Disable the buy button and show
          // a review-safe message so Apple reviewers never see internal errors.
          setProductAvailable(false);
        }
      })
      .catch(() => {
        setProductAvailable(false);
      })
      .finally(() => setProductsLoading(false));
  }, [open]);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  async function handleBuy() {
    setBuying(true);
    setError(null);
    try {
      const result = await purchasePro();
      if (result.success) {
        setSuccess(true);
        onPurchaseComplete();
      }
      // Cancelled and all other failures: silent re-enable.
      // StoreKit / sandbox errors are surfaced by the OS natively — never
      // shown in our UI, so Apple reviewers never see an app-generated error.
    } catch {
      // IAP errors are surfaced natively by the OS — do not surface in app UI
    } finally {
      setBuying(false);
    }
  }

  async function handleRestore() {
    setRestoring(true);
    setError(null);
    try {
      const result = await restorePurchases();
      if (result.restoredProductIds.includes(IAP_PRODUCT_ID)) {
        setSuccess(true);
        onPurchaseComplete();
      } else if (result.restoredProductIds.length === 0) {
        setError("No previous purchases found for this Apple ID.");
      } else {
        setError("No active UnitDown AI Pro subscription found.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Restore failed. Please try again.");
    } finally {
      setRestoring(false);
    }
  }

  if (!open) return null;

  const proFeatures = [
    { icon: Gauge, label: "Meter & Instrument Checks" },
    { icon: ListChecks, label: "Full Ranked Likely Causes" },
    { icon: Activity, label: "Alternative Fault Diagnoses" },
    { icon: History, label: "Diagnosis History" },
    { icon: Building2, label: "RTU, Chiller, Electric & Oil Heat" },
    { icon: Wrench, label: "Refrigerant SH/SC Analysis" },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="iap-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
          data-testid="apple-iap-modal"
        >
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            key="iap-panel"
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.97 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
            className="relative z-10 w-full sm:max-w-md max-h-[92dvh] bg-white sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden rounded-t-3xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 flex-shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
                    <ThermometerSnowflake className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">UnitDown AI</span>
                </div>
                <h2 className="text-xl font-extrabold text-slate-900">UnitDown AI Pro</h2>
                <p className="text-sm text-slate-500 font-medium">Unlimited diagnostics — cancel anytime.</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {success ? (
                <div className="flex flex-col items-center text-center py-8 gap-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-slate-900">You're Pro!</h3>
                    <p className="text-sm text-slate-500 mt-1">All Pro features are now unlocked.</p>
                  </div>
                  <Button
                    onClick={onClose}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 rounded-xl h-11"
                  >
                    Start Diagnosing
                  </Button>
                </div>
              ) : (
                <>
                  {/* Pricing */}
                  <div className="rounded-2xl bg-slate-900 px-5 py-4 text-center">
                    <p className="text-[11px] font-bold text-blue-400 uppercase tracking-widest mb-1.5">
                      UnitDown AI Pro · 1-Month Subscription
                    </p>
                    <div className="flex items-end justify-center gap-1">
                      <span className="text-4xl font-black text-white">{productPrice}</span>
                      <span className="text-slate-400 font-semibold pb-1">/month</span>
                    </div>
                    <p className="text-xs text-slate-400 font-medium mt-1">
                      Auto-renewing · Billed monthly · Cancel anytime in Apple ID Settings
                    </p>
                  </div>

                  {/* Features */}
                  <ul className="space-y-2.5">
                    {proFeatures.map(({ icon: Icon, label }) => (
                      <li key={label} className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-3 h-3 text-blue-600" />
                        </div>
                        <span className="text-sm font-medium text-slate-700">{label}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Purchase button */}
                  <Button
                    onClick={handleBuy}
                    disabled={buying || restoring || productsLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-extrabold h-12 rounded-xl text-sm transition-all"
                    data-testid="btn-apple-iap-buy"
                  >
                    {productsLoading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Loading…
                      </span>
                    ) : buying ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Processing…
                      </span>
                    ) : `Subscribe — ${productPrice}/month`}
                  </Button>

                  {/* Restore purchases */}
                  <button
                    onClick={handleRestore}
                    disabled={buying || restoring || productsLoading}
                    className="w-full text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors py-1 disabled:opacity-50"
                    data-testid="btn-apple-iap-restore"
                  >
                    {restoring ? "Restoring…" : "Restore Purchases"}
                  </button>

                  {/* Apple-required subscription disclosure */}
                  <p className="text-[11px] text-slate-400 leading-relaxed border-t border-slate-100 pt-3">
                    UnitDown AI Pro is an auto-renewing subscription. Payment will be charged to your Apple ID account at confirmation of purchase. The subscription automatically renews unless it is canceled at least 24 hours before the end of the current period. You can manage and cancel your subscription in your Apple ID Account Settings.
                  </p>

                  {/* Apple-required legal links — Guideline 3.1.2(c)
                      Using onClick + window.open instead of <a target="_blank">
                      so links open correctly inside Capacitor WKWebView on iOS. */}
                  <div className="flex items-center justify-center gap-4 flex-wrap py-1">
                    <button
                      onClick={() => Browser.open({ url: "https://www.apple.com/legal/macapps/stdeula/" })}
                      className="text-[12px] font-semibold text-blue-500 underline underline-offset-2 px-2 py-1 rounded active:opacity-60"
                    >
                      Terms of Use (EULA)
                    </button>
                    <span className="text-[12px] text-slate-300">·</span>
                    <button
                      onClick={() => Browser.open({ url: "https://unitdown.org/privacy" })}
                      className="text-[12px] font-semibold text-blue-500 underline underline-offset-2 px-2 py-1 rounded active:opacity-60"
                    >
                      Privacy Policy
                    </button>
                  </div>

                  {/* Trust */}
                  <div className="flex items-center justify-center gap-4">
                    {[
                      { icon: ShieldCheck, label: "Secure" },
                      { icon: FlaskConical, label: "Cancel anytime" },
                    ].map(({ icon: Icon, label }) => (
                      <div key={label} className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                        <Icon className="w-3.5 h-3.5 text-blue-400" />
                        {label}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── LeadFormModal (kept for admin lead capture legacy) ──────────────────────────────────────────────────────────────

interface LeadFormModalProps {
  open: boolean;
  onClose: () => void;
  prefillIssue?: string;
  diagnosisCategory?: string;
  priorityLevel?: string;
}

function LeadFormModal({ open, onClose, prefillIssue = "", diagnosisCategory, priorityLevel }: LeadFormModalProps) {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    businessName: "",
    city: "",
    equipmentType: "",
    urgencyLevel: "",
    issueDescription: prefillIssue,
  });
  const [errors, setErrors] = useState<Partial<typeof form>>({});

  useEffect(() => {
    if (open) {
      setSubmitted(false);
      setForm((f) => ({ ...f, issueDescription: prefillIssue }));
      setErrors({});
    }
  }, [open, prefillIssue]);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const set = (field: keyof typeof form) => (value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  function validate() {
    const e: Partial<typeof form> = {};
    if (!form.name.trim()) e.name = "Name is required.";
    if (!form.phone.trim()) e.phone = "Phone is required.";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email.";
    if (!form.businessName.trim()) e.businessName = "Business name is required.";
    if (!form.equipmentType) e.equipmentType = "Select equipment type.";
    if (!form.urgencyLevel) e.urgencyLevel = "Select urgency level.";
    if (!form.issueDescription.trim()) e.issueDescription = "Please describe the issue.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const lead: Lead = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ...form,
      timestamp: Date.now(),
      diagnosisCategory,
      priorityLevel,
    };

    const existing = loadLeads();
    saveLeads([lead, ...existing]);
    setSubmitted(true);
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
          data-testid="lead-form-modal"
        >
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            key="modal-panel"
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.97 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
            className="relative z-10 w-full sm:max-w-2xl max-h-[92dvh] sm:max-h-[90vh] bg-white sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden rounded-t-3xl"
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 flex-shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
                    <ThermometerSnowflake className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">UnitDown AI</span>
                </div>
                <h2 className="text-xl font-extrabold text-slate-900">Join UnitDown Pro</h2>
                <p className="text-sm text-slate-500 font-medium">Leave your details and we'll reach out with Pro access options.</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                data-testid="modal-close"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">
                {submitted ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.35 }}
                    className="flex flex-col items-center justify-center text-center px-8 py-16 gap-6"
                    data-testid="success-confirmation"
                  >
                    <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
                      <CheckCircle className="w-10 h-10 text-emerald-600" />
                    </div>
                    <div className="space-y-2 max-w-sm">
                      <h3 className="text-2xl font-extrabold text-slate-900">You're on the List</h3>
                      <p className="text-slate-600 font-medium leading-relaxed">
                        Thanks, <span className="font-bold text-slate-800">{form.name.split(" ")[0]}</span>. We'll follow up at <span className="font-bold text-slate-800">{form.phone}</span> with Pro access details shortly.
                      </p>
                    </div>
                    {diagnosisCategory && (
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 w-full max-w-sm">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Diagnosis on File</p>
                        <p className="font-bold text-slate-800">{diagnosisCategory}</p>
                      </div>
                    )}
                    <Button
                      onClick={onClose}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 rounded-xl h-12 mt-2"
                      data-testid="btn-close-after-success"
                    >
                      Done
                    </Button>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onSubmit={handleSubmit}
                    className="p-6 space-y-5"
                    data-testid="lead-form"
                  >
                    {diagnosisCategory && (
                      <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5">
                        <Wrench className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        <p className="text-sm font-semibold text-blue-800">
                          Issue on file: <span className="font-bold">{diagnosisCategory}</span>
                          {priorityLevel && <span className="ml-2 font-normal text-blue-600">· {priorityLevel} priority</span>}
                        </p>
                      </div>
                    )}

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="name" className="text-sm font-bold text-slate-700">
                          Full Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="name"
                          value={form.name}
                          onChange={(e) => set("name")(e.target.value)}
                          placeholder="Jane Smith"
                          className={`h-11 rounded-xl border-slate-200 font-medium ${errors.name ? "border-red-400 focus-visible:ring-red-400" : ""}`}
                          data-testid="input-name"
                        />
                        {errors.name && <p className="text-xs text-red-500 font-medium">{errors.name}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="phone" className="text-sm font-bold text-slate-700">
                          Phone <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={form.phone}
                          onChange={(e) => set("phone")(e.target.value)}
                          placeholder="(555) 000-0000"
                          className={`h-11 rounded-xl border-slate-200 font-medium ${errors.phone ? "border-red-400 focus-visible:ring-red-400" : ""}`}
                          data-testid="input-phone"
                        />
                        {errors.phone && <p className="text-xs text-red-500 font-medium">{errors.phone}</p>}
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="email" className="text-sm font-bold text-slate-700">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={form.email}
                          onChange={(e) => set("email")(e.target.value)}
                          placeholder="jane@company.com"
                          className={`h-11 rounded-xl border-slate-200 font-medium ${errors.email ? "border-red-400 focus-visible:ring-red-400" : ""}`}
                          data-testid="input-email"
                        />
                        {errors.email && <p className="text-xs text-red-500 font-medium">{errors.email}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="businessName" className="text-sm font-bold text-slate-700">
                          Business Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="businessName"
                          value={form.businessName}
                          onChange={(e) => set("businessName")(e.target.value)}
                          placeholder="Acme Corp"
                          className={`h-11 rounded-xl border-slate-200 font-medium ${errors.businessName ? "border-red-400 focus-visible:ring-red-400" : ""}`}
                          data-testid="input-business-name"
                        />
                        {errors.businessName && <p className="text-xs text-red-500 font-medium">{errors.businessName}</p>}
                      </div>
                    </div>

                    {/* Row 3: City + Equipment Type */}
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="city" className="text-sm font-bold text-slate-700">City</Label>
                        <Input
                          id="city"
                          value={form.city}
                          onChange={(e) => set("city")(e.target.value)}
                          placeholder="Dallas, TX"
                          className="h-11 rounded-xl border-slate-200 font-medium"
                          data-testid="input-city"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm font-bold text-slate-700">
                          Equipment Type <span className="text-red-500">*</span>
                        </Label>
                        <Select onValueChange={set("equipmentType")} value={form.equipmentType}>
                          <SelectTrigger
                            className={`h-11 rounded-xl border-slate-200 font-medium ${errors.equipmentType ? "border-red-400" : ""}`}
                            data-testid="select-equipment-type"
                          >
                            <SelectValue placeholder="Select type…" />
                          </SelectTrigger>
                          <SelectContent>
                            {equipmentTypes.map((t) => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.equipmentType && <p className="text-xs text-red-500 font-medium">{errors.equipmentType}</p>}
                      </div>
                    </div>

                    {/* Urgency */}
                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-slate-700">
                        Urgency Level <span className="text-red-500">*</span>
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {urgencyLevels.map((u) => (
                          <button
                            key={u}
                            type="button"
                            onClick={() => set("urgencyLevel")(u)}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                              form.urgencyLevel === u
                                ? u.includes("Emergency")
                                  ? "bg-red-600 border-red-600 text-white"
                                  : "bg-blue-600 border-blue-600 text-white"
                                : "bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-700"
                            }`}
                            data-testid={`urgency-${u.split(" ")[0].toLowerCase()}`}
                          >
                            {u}
                          </button>
                        ))}
                      </div>
                      {errors.urgencyLevel && <p className="text-xs text-red-500 font-medium">{errors.urgencyLevel}</p>}
                    </div>

                    {/* Describe Issue */}
                    <div className="space-y-1.5">
                      <Label htmlFor="issueDescription" className="text-sm font-bold text-slate-700">
                        Describe the Issue <span className="text-red-500">*</span>
                      </Label>
                      <Textarea
                        id="issueDescription"
                        value={form.issueDescription}
                        onChange={(e) => set("issueDescription")(e.target.value)}
                        placeholder="Describe the symptom, readings, sequence of operation, and what you already checked..."
                        className={`min-h-[100px] rounded-xl border-slate-200 font-medium resize-none ${errors.issueDescription ? "border-red-400 focus-visible:ring-red-400" : ""}`}
                        data-testid="input-issue-description"
                      />
                      {errors.issueDescription && <p className="text-xs text-red-500 font-medium">{errors.issueDescription}</p>}
                    </div>

                    {/* Submit */}
                    <div className="pt-2">
                      <Button
                        type="submit"
                        size="lg"
                        className="w-full h-13 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-base rounded-xl shadow-lg shadow-blue-600/25 transition-all"
                        data-testid="btn-submit-lead"
                      >
                        <Sparkles className="w-5 h-5 mr-2" />
                        Request Pro Access
                      </Button>
                      <p className="text-center text-xs text-slate-400 font-medium mt-3">
                        No payment required now. We'll reach out with options.
                      </p>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── AdminView ──────────────────────────────────────────────────────────────────

const ADMIN_EMAILS = new Set(["unitdownsupport@gmail.com"]);

function AdminView() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [, navigate] = useLocation();
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded) return;
    const email = user?.primaryEmailAddress?.emailAddress?.trim().toLowerCase() ?? "";
    if (!ADMIN_EMAILS.has(email)) {
      navigate("/dashboard");
    }
  }, [isLoaded, user, navigate]);

  useEffect(() => {
    setLeads(loadLeads());
  }, []);

  const urgencyColor = (u: string) => {
    if (u.includes("Emergency")) return "bg-red-100 text-red-800 border-red-200";
    if (u === "Today") return "bg-orange-100 text-orange-800 border-orange-200";
    if (u.includes("48")) return "bg-amber-100 text-amber-800 border-amber-200";
    return "bg-slate-100 text-slate-600 border-slate-200";
  };

  return (
    <div className="min-h-[100dvh] bg-[#f8fafc] text-slate-900">
      {/* Top bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors font-semibold text-sm"
              data-testid="admin-back-home"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
              Back
            </button>
            <div className="h-5 w-px bg-slate-200" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-blue-600 rounded flex items-center justify-center">
                <ThermometerSnowflake className="w-4 h-4 text-white" />
              </div>
              <span className="font-extrabold text-slate-900">UnitDown AI</span>
              <span className="text-slate-400 font-medium">/ Admin</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-500">
              {leads.length} {leads.length === 1 ? "lead" : "leads"}
            </span>
            <Button
              onClick={() => exportLeadsCSV(leads)}
              disabled={leads.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl"
              data-testid="btn-export-csv"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-slate-900 mb-1">Service Requests</h1>
          <p className="text-slate-500 font-medium text-sm">All leads collected via the Request Service form, stored locally.</p>
        </div>

        {leads.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-2xl border border-slate-200">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-lg font-bold text-slate-400">No leads yet</p>
            <p className="text-sm text-slate-400 mt-1">Submissions will appear here after someone fills out the form.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {leads.map((lead, idx) => (
              <motion.div
                key={lead.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                data-testid={`lead-card-${lead.id}`}
              >
                {/* Lead header */}
                <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-extrabold text-slate-900 text-lg">{lead.name}</span>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full border ${urgencyColor(lead.urgencyLevel)}`}>
                      {lead.urgencyLevel}
                    </span>
                    {lead.diagnosisCategory && (
                      <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">
                        {lead.diagnosisCategory}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 font-medium flex-shrink-0">
                    <Clock className="w-3.5 h-3.5 inline mr-1 -mt-px" />
                    {new Date(lead.timestamp).toLocaleString()}
                  </span>
                </div>

                {/* Lead details */}
                <div className="px-6 py-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Business</p>
                    <p className="font-semibold text-slate-800">{lead.businessName}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Contact</p>
                    <p className="font-semibold text-slate-800">
                      <Phone className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                      {lead.phone}
                    </p>
                    {lead.email && (
                      <p className="text-sm text-slate-600 font-medium">
                        <Mail className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                        {lead.email}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Location & Equipment</p>
                    {lead.city && (
                      <p className="font-semibold text-slate-800">
                        <MapPin className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                        {lead.city}
                      </p>
                    )}
                    <p className="text-sm text-slate-600 font-medium">{lead.equipmentType}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Issue</p>
                    <p className="text-sm text-slate-700 font-medium leading-snug line-clamp-3">{lead.issueDescription}</p>
                  </div>
                </div>
              </motion.div>
            ))}

            <div className="pt-4 flex justify-between items-center">
              <p className="text-sm text-slate-400 font-medium">{leads.length} total submissions</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { saveLeads([]); setLeads([]); }}
                className="text-slate-400 hover:text-red-600 font-semibold"
                data-testid="btn-clear-leads"
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                Clear All
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── LockedSection ──────────────────────────────────────────────────────────────

function LockedSection({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="relative rounded-2xl overflow-hidden">
      <div className="blur-sm pointer-events-none select-none" aria-hidden="true">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[2px] rounded-2xl">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-full px-4 py-2 shadow-sm">
          <Lock className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-xs font-bold text-slate-700">{label} — Pro Only</span>
        </div>
      </div>
    </div>
  );
}

// ─── UpgradeOverlay ─────────────────────────────────────────────────────────────

function UpgradeOverlay({ diagCount, onUpgrade, onDismiss }: { diagCount: number; onUpgrade: () => void; onDismiss: (permanent: boolean) => void }) {
  const remaining = Math.max(0, FREE_DIAGNOSES - (diagCount - 1));
  const appleIAP = shouldUseAppleIAP();
  const [showDismissOptions, setShowDismissOptions] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
      data-testid="upgrade-overlay"
      className="rounded-2xl overflow-hidden border border-blue-200 shadow-2xl shadow-blue-900/10"
    >
      {/* Top bar */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-600 px-6 py-3 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-blue-200" />
        <span className="text-xs font-extrabold text-blue-100 uppercase tracking-widest">Pro Diagnostic Suite</span>
        {!appleIAP && (
          <span className="ml-auto text-xs font-bold bg-blue-800/60 text-blue-100 rounded-full px-3 py-0.5">From $7.99/month</span>
        )}
        <button
          onClick={() => setShowDismissOptions(true)}
          className="ml-2 flex-shrink-0 text-blue-300 hover:text-white transition-colors"
          aria-label="Dismiss upgrade prompt"
          data-testid="upgrade-overlay-dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="bg-white px-6 py-8">
        <div className="flex flex-col md:flex-row md:items-center gap-8">

          {/* Left: headline + feature list */}
          <div className="flex-1 space-y-5">
            <div>
              <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">Your free trial is complete</p>
              <h3 className="text-2xl font-extrabold text-slate-900 leading-tight">
                Unlock Full Technician-Level Diagnostics
              </h3>
              <p className="text-slate-500 font-medium text-sm mt-2 leading-relaxed">
                You've used {diagCount - 1} of your {FREE_DIAGNOSES} free diagnoses.
                {remaining === 0
                  ? " Upgrade to keep diagnosing without limits."
                  : ` ${remaining} remaining — upgrade to never hit a wall.`}
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-2.5">
              {[
                { icon: Gauge, label: "Meter & Instrument Checks" },
                { icon: ListChecks, label: "Full Likely Causes (all ranked)" },
                { icon: Wrench, label: "Recommended Action" },
                { icon: TriangleAlert, label: "Risk if Ignored" },
                { icon: Search, label: "Parts Likely Needed" },
                { icon: Activity, label: "Alternative Fault Diagnoses" },
                { icon: History, label: "Diagnosis History" },
                { icon: MapPin, label: "Trusted by Technicians Worldwide" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <span className="text-sm font-semibold text-slate-700">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: plan cards */}
          <div className="md:w-64 flex-shrink-0 space-y-3">

            {/* On iOS: single IAP product only (Apple guideline — no team tier) */}
            {appleIAP ? (
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-900 px-4 py-3">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-0.5">Pro Tech</p>
                  <div className="flex items-end gap-0.5">
                    <span className="text-2xl font-black text-white">$7.99</span>
                    <span className="text-slate-400 text-xs font-semibold pb-0.5">/mo</span>
                  </div>
                  <p className="text-xs text-slate-300 font-semibold mt-1">For solo technicians · Cancel anytime</p>
                </div>
                <div className="bg-white px-4 py-3">
                  <Button
                    onClick={onUpgrade}
                    data-testid="btn-upgrade-to-pro"
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold h-9 rounded-lg text-sm transition-all"
                  >
                    Subscribe
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* Pro Tech */}
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="bg-slate-900 px-4 py-3">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-0.5">Pro Tech</p>
                    <div className="flex items-end gap-0.5">
                      <span className="text-2xl font-black text-white">$7.99</span>
                      <span className="text-slate-400 text-xs font-semibold pb-0.5">/mo</span>
                    </div>
                    <p className="text-xs text-slate-300 font-semibold mt-1">For solo technicians</p>
                  </div>
                  <div className="bg-white px-4 py-3">
                    <Button
                      onClick={onUpgrade}
                      data-testid="btn-upgrade-to-pro"
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold h-9 rounded-lg text-sm transition-all"
                    >
                      Subscribe — $7.99/mo
                    </Button>
                  </div>
                </div>

                {/* Contractor Pro — Most Popular */}
                <div className="rounded-xl border-2 border-blue-500 overflow-hidden relative">
                  <div className="absolute top-2 right-2">
                    <span className="text-xs font-extrabold bg-blue-500 text-white rounded-full px-2.5 py-0.5">Most Popular</span>
                  </div>
                  <div className="bg-gradient-to-br from-blue-600 to-blue-700 px-4 py-3">
                    <p className="text-xs font-bold text-blue-200 uppercase tracking-widest leading-none mb-0.5">Contractor Pro</p>
                    <div className="flex items-end gap-0.5">
                      <span className="text-2xl font-black text-white">$18.99</span>
                      <span className="text-blue-300 text-xs font-semibold pb-0.5">/mo</span>
                    </div>
                    <p className="text-xs text-blue-200 font-semibold mt-1 leading-snug">For growing HVAC shops</p>
                  </div>
                  <div className="bg-white px-4 py-3 space-y-2">
                    <ul className="space-y-1.5">
                      {[
                        { icon: Users, label: "Up to 4 technicians" },
                        { icon: History, label: "Shared diagnostic history" },
                        { icon: BookOpen, label: "Shared diagnostic library" },
                        { icon: Phone, label: "Priority support" },
                      ].map(({ icon: Icon, label }) => (
                        <li key={label} className="flex items-center gap-1.5">
                          <Icon className="w-3 h-3 text-blue-500 flex-shrink-0" />
                          <span className="text-xs font-medium text-slate-600">{label}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      onClick={onUpgrade}
                      data-testid="btn-upgrade-team"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold h-9 rounded-lg shadow-sm text-sm transition-all"
                    >
                      <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                      Get Contractor Pro
                    </Button>
                  </div>
                </div>
              </>
            )}

            {/* Social proof */}
            <div className="text-center pt-1">
              <div className="flex items-center justify-center gap-0.5 mb-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3 h-3 text-amber-400 fill-amber-400" />
                ))}
              </div>
              <p className="text-xs text-slate-500 font-medium">"Saves hours every week"</p>
              <p className="text-xs text-slate-400">— HVAC Technician, TX</p>
            </div>
          </div>

        </div>
      </div>

      {/* Bottom trust bar */}
      <div className="bg-slate-50 border-t border-slate-100 px-6 py-3 flex flex-wrap items-center gap-4">
        {[
          { icon: ShieldCheck, label: "Secure" },
          { icon: FlaskConical, label: "Cancel anytime in Settings" },
          { icon: Users, label: "Trusted by HVAC professionals" },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <Icon className="w-3.5 h-3.5 text-blue-500" />
            {label}
          </div>
        ))}
      </div>

      {/* Dismiss options */}
      <AnimatePresence>
        {showDismissOptions && (
          <motion.div
            key="dismiss-panel"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden border-t border-slate-100 bg-white"
          >
            <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-xs font-semibold text-slate-500">Not ready to upgrade?</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onDismiss(false)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-100"
                  data-testid="upgrade-overlay-maybe-later"
                >
                  Maybe later
                </button>
                <button
                  onClick={() => onDismiss(true)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-100"
                  data-testid="upgrade-overlay-dont-show"
                >
                  Don't show for 7 days
                </button>
                <button
                  onClick={() => { setShowDismissOptions(false); onUpgrade(); }}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100"
                  data-testid="upgrade-overlay-view-premium"
                >
                  View Premium →
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── FeedbackButtons ────────────────────────────────────────────────────────────

interface FeedbackButtonsProps {
  recommendationId: string;
  issueInput: string;
  confidence: number;
}

function FeedbackButtons({ recommendationId, issueInput, confidence }: FeedbackButtonsProps) {
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleVote = (v: "up" | "down") => {
    if (submitted) return;
    setVote(v);
    setSubmitted(true);
    if (v === "up") {
      trackThumbsUp();
      setTimeout(() => { maybeRequestReview("thumbs_up").catch(() => {}); }, 1500);
    }
    fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recommendationId,
        issueInput,
        vote: v,
        confidence,
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  };

  return (
    <div className="flex items-center gap-2.5">
      <span className="text-xs font-medium text-slate-400">Was this helpful?</span>
      <button
        onClick={() => handleVote("up")}
        disabled={submitted}
        aria-label="Thumbs up"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
          vote === "up"
            ? "bg-emerald-50 border-emerald-300 text-emerald-700"
            : submitted
            ? "border-slate-100 text-slate-300 cursor-not-allowed bg-white"
            : "border-slate-200 text-slate-500 hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50 bg-white"
        }`}
      >
        <ThumbsUp className="w-3.5 h-3.5" />
        Yes
      </button>
      <button
        onClick={() => handleVote("down")}
        disabled={submitted}
        aria-label="Thumbs down"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
          vote === "down"
            ? "bg-red-50 border-red-300 text-red-700"
            : submitted
            ? "border-slate-100 text-slate-300 cursor-not-allowed bg-white"
            : "border-slate-200 text-slate-500 hover:border-red-300 hover:text-red-600 hover:bg-red-50 bg-white"
        }`}
      >
        <ThumbsDown className="w-3.5 h-3.5" />
        No
      </button>
      {submitted && (
        <span className="text-xs text-slate-400 font-medium animate-in fade-in duration-300">Thanks!</span>
      )}
    </div>
  );
}

// ─── ResolutionPanel ────────────────────────────────────────────────────────────

interface ResolutionOption {
  id: string;
  title: string;
}

interface ResolutionPanelProps {
  issueInput: string;
  recommendations: ResolutionOption[];
}

function ResolutionPanel({ issueInput, recommendations }: ResolutionPanelProps) {
  const [phase, setPhase] = useState<"prompt" | "yes" | "no" | "done">("prompt");
  const [selectedId, setSelectedId] = useState("");
  const [actualFix, setActualFix] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [doneMessage, setDoneMessage] = useState("");

  const submitResolved = async () => {
    if (!selectedId || submitting) return;
    setSubmitting(true);
    const selected = recommendations.find((r) => r.id === selectedId);
    await fetch("/api/resolution", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        issueInput,
        resolved: true,
        selectedRecommendationId: selectedId,
        selectedRecommendationTitle: selected?.title ?? "",
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    setDoneMessage("Thanks — feedback saved.");
    setPhase("done");
    setSubmitting(false);
  };

  const submitNotResolved = async () => {
    if (!actualFix.trim() || submitting) return;
    setSubmitting(true);
    await fetch("/api/resolution", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        issueInput,
        resolved: false,
        actualFix: actualFix.trim(),
        notes: notes.trim(),
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    setDoneMessage("Thanks — this helps improve UnitDown.");
    setPhase("done");
    setSubmitting(false);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
        <p className="text-sm font-bold text-slate-700">Did this diagnostic help resolve the issue?</p>
      </div>

      {phase === "prompt" && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setPhase("yes")}
            className="px-4 py-2 rounded-lg text-xs font-semibold border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-all"
          >
            Yes, one recommendation fixed it
          </button>
          <button
            onClick={() => setPhase("no")}
            className="px-4 py-2 rounded-lg text-xs font-semibold border border-slate-200 text-slate-600 bg-white hover:border-slate-300 hover:bg-slate-50 transition-all"
          >
            No, different fix
          </button>
        </div>
      )}

      {phase === "yes" && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Which recommendation fixed it?</p>
          <div className="space-y-2">
            {recommendations.map((rec) => (
              <button
                key={rec.id}
                onClick={() => setSelectedId(rec.id)}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium border transition-all ${
                  selectedId === rec.id
                    ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {rec.title}
              </button>
            ))}
          </div>
          <button
            onClick={submitResolved}
            disabled={!selectedId || submitting}
            className="mt-1 px-5 py-2 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {submitting ? "Saving…" : "Submit"}
          </button>
        </div>
      )}

      {phase === "no" && (
        <div className="space-y-3">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">What was the actual fix?</p>
            <Textarea
              value={actualFix}
              onChange={(e) => setActualFix(e.target.value)}
              placeholder="Example: Found open limit switch on electric heat circuit"
              className="text-sm min-h-[72px] resize-none border-slate-200 focus-visible:ring-1 focus-visible:ring-blue-400"
            />
          </div>
          <div>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any extra readings or details? Optional"
              className="text-sm min-h-[60px] resize-none border-slate-200 focus-visible:ring-1 focus-visible:ring-blue-400"
            />
          </div>
          <button
            onClick={submitNotResolved}
            disabled={!actualFix.trim() || submitting}
            className="px-5 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {submitting ? "Saving…" : "Submit"}
          </button>
        </div>
      )}

      {phase === "done" && (
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <p className="text-sm font-semibold text-slate-600">{doneMessage}</p>
        </div>
      )}
    </div>
  );
}

// ─── AlternativesAccordion ──────────────────────────────────────────────────────

function AlternativesAccordion({ alternatives, issueInput }: { alternatives: DiagnosisEntry[]; issueInput: string }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <div data-testid="alternatives-accordion">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-4 h-4 text-slate-400" />
        <h4 className="text-sm font-bold text-slate-700 uppercase tracking-widest">
          Also Consider — {alternatives.length} Alternative{alternatives.length > 1 ? "s" : ""}
        </h4>
      </div>
      <div className="space-y-3">
        {alternatives.map((alt, idx) => {
          const isOpen = openIdx === idx;
          const altPc = priorityConfig(alt.priorityLevel);
          return (
            <div key={alt.id} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <button
                className="w-full px-5 py-4 flex items-center justify-between gap-3 text-left hover:bg-slate-50 transition-colors"
                onClick={() => setOpenIdx(isOpen ? null : idx)}
                data-testid={`alt-toggle-${idx}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{alt.category}</span>
                    <Badge className={`text-xs px-2 py-0.5 border rounded-full font-bold ${altPc.className}`}>
                      <altPc.Icon className="w-3 h-3 mr-1 inline-block" />
                      {altPc.label}
                    </Badge>
                  </div>
                  <p className="text-sm font-bold text-slate-800 mt-0.5 leading-snug">{alt.title}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs font-bold text-slate-500">{alt.confidencePercent}%</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                  />
                </div>
              </button>
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    key="alt-body"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 space-y-4 border-t border-slate-100 pt-4">
                      {/* Why this fits */}
                      <div className="bg-slate-50 rounded-lg px-4 py-3 flex gap-2">
                        <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-slate-600 font-medium leading-snug">{alt.whyThisFits}</p>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        {/* Likely Causes */}
                        <div>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Likely Causes</p>
                          <ul className="space-y-2">
                            {alt.likelyCauses.map((c, i) => (
                              <li key={i} className="flex gap-2 text-sm text-slate-700 font-medium">
                                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-extrabold flex items-center justify-center">
                                  {i + 1}
                                </span>
                                <span className="leading-snug">{c}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        {/* First Checks */}
                        <div>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">First Checks</p>
                          <ul className="space-y-2">
                            {alt.firstChecks.map((c, i) => (
                              <li key={i} className="flex gap-2 text-sm text-slate-700 font-medium">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                                <span className="leading-snug">{c}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      {/* Recommended Action */}
                      <div className="bg-slate-900 text-white rounded-lg px-4 py-3 flex gap-3">
                        <Wrench className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                        <p className="text-sm font-semibold leading-snug">{alt.recommendedAction}</p>
                      </div>
                      <FeedbackButtons
                        recommendationId={alt.id}
                        issueInput={issueInput}
                        confidence={alt.confidencePercent}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Home ───────────────────────────────────────────────────────────────────────

export function Home() {
  const [symptoms, setSymptoms] = useState("");
  const [exampleSetB, setExampleSetB] = useState(false);
  const [currentResult, setCurrentResult] = useState<DiagnosisResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [emailWallOpen, setEmailWallOpen] = useState(false);
  const [diagCount, setDiagCount] = useState(0);
  const [freeRemaining, setFreeRemaining] = useState(4);
  const [trialState, setTrialState] = useState<{
    active: boolean;
    daysLeft: number;
    creditsLeft: number;
    rewardsEarned: string[];
  } | null>(null);
  // Start as Pro immediately for demo/review sessions (sessionStorage flag set
  // by login.tsx) so the paywall never flashes before refreshUsageStatus fires.
  // All other users start Free — isPro is elevated only after the server or
  // Apple IAP confirms an active paid subscription.
  const [isPro, setIsPro] = useState(() => isDemoSessionActive());
  // proCheckDone gates the upgrade CTA. Keep it false until the server
  // responds so we never show a "Join Pro" button to an already-Pro user.
  const [proCheckDone, setProCheckDone] = useState(false);
  const [clientId, setClientId] = useState(getOrCreateClientId);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedUnitLabel, setSelectedUnitLabel] = useState<string | null>(null);
  const { signOut: clerkSignOut } = useClerk();

  // Dark mode — read from html class set by initTheme() at startup
  const [darkMode, setDarkMode] = useState(() =>
    document.documentElement.classList.contains("dark")
  );
  const toggleDarkMode = useCallback(() => {
    const next = !darkMode;
    setDarkMode(next);
    applyTheme(next);
    try {
      const raw = localStorage.getItem("unitdown_prefs");
      const prefs = raw ? JSON.parse(raw) : {};
      localStorage.setItem("unitdown_prefs", JSON.stringify({ ...prefs, darkMode: next }));
    } catch {}
  }, [darkMode]);

  // Google Play closed testing whitelist — remove or replace after testing.
  const testerEmail = clerkUser?.primaryEmailAddress?.emailAddress;
  const pendingSymptomsRef = useRef<string>("");
  // Set to true when Clerk login completes so the post-login effect knows to
  // auto-resume any diagnosis that was gated before the user logged in.
  const loginJustHappenedRef = useRef(false);

  // If Clerk hasn't finished initialising after 1.5 s, show the Login button
  // anyway so users are never stuck looking at a blank header on slow networks
  // or when the Clerk SDK is blocked.
  const [clerkTimedOut, setClerkTimedOut] = useState(false);
  useEffect(() => {
    if (clerkLoaded) return;
    const t = setTimeout(() => setClerkTimedOut(true), 1500);
    return () => clearTimeout(t);
  }, [clerkLoaded]);

  useEffect(() => {
    if (!clerkLoaded) return;
    if (clerkUser) {
      const oldClientId = localStorage.getItem(CLIENT_ID_KEY);
      const newClientId = clerkUser.id;

      // Detect a fresh login: the stored ID was an anonymous guest UUID that is
      // different from the Clerk user ID being set for the first time.
      if (!oldClientId || oldClientId !== newClientId) {
        loginJustHappenedRef.current = true;
      }

      // Always update localStorage + state to the stable Clerk user ID.
      localStorage.setItem(CLIENT_ID_KEY, newClientId);
      setClientId(newClientId);

      // Demo / App Store review accounts: grant Pro immediately so reviewers
      // can access all Pro features without a live IAP purchase or Stripe sub.
      // isDemoProEmail covers both unitdownsupport@gmail.com and review@unitdown.org.
      if (isDemoProEmail(clerkUser.primaryEmailAddress?.emailAddress)) {
        setIsPro(true);
        saveIsProCached(true);
        setFreeRemaining(99);
      }

    }
  }, [clerkLoaded, clerkUser?.id]);

  // ── Post-login auto-resume ────────────────────────────────────────────────────
  // When clientId transitions to a Clerk user ID (login just happened) and there
  // is a pending question that was gated before the user logged in, re-gate with
  // the new per-account session and run the diagnosis if allowed.
  useEffect(() => {
    if (!loginJustHappenedRef.current) return;
    loginJustHappenedRef.current = false;

    // Migrate any local anonymous history to the server under the new Clerk user ID.
    const localHistory = loadHistory();
    if (localHistory.length > 0) {
      fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, entries: localHistory }),
      }).catch(() => {});
    }

    // Award account_created bonus for brand new signups (idempotent — no-op if already earned)
    awardReward(clientId, "account_created").then((result) => {
      if (result?.bonusCredits) {
        toast({ description: `+${result.bonusCredits} diagnostic credits added! Welcome to your Pro Trial.` });
        refreshUsageStatus(clientId, testerEmail);
      }
    }).catch(() => {});

    const pending = pendingSymptomsRef.current;
    if (!pending) return;

    // Dismiss any gate modals that were opened for the anonymous session.
    setModalOpen(false);
    setEmailWallOpen(false);

    const fp = getFingerprint();
    fetch("/api/usage/gate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ fingerprint: fp, clientId, testerEmail }),
    })
      .then((r) => r.json())
      .then((gd: { allowed: boolean; status: string }) => {
        if (gd.allowed) {
          pendingSymptomsRef.current = "";
          runDiagnosis(pending);
        } else {
          // Even with a fresh account session they're over limit — restore the
          // question in the input and show the upgrade modal.
          setSymptoms(pending);
          pendingSymptomsRef.current = "";
          openModal();
        }
      })
      .catch(() => {
        // Network error — just run the diagnosis (graceful degradation).
        pendingSymptomsRef.current = "";
        runDiagnosis(pending);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]); // fires whenever clientId changes (i.e. on login)

  // ── Server history sync ───────────────────────────────────────────────────────
  // When user is signed in, load their server-side history and merge with local.
  useEffect(() => {
    if (!clerkLoaded || !clerkUser) return;
    fetch(`/api/history?clientId=${encodeURIComponent(clientId)}`)
      .then((r) => r.json())
      .then((d: { entries: HistoryEntry[] }) => {
        if (!Array.isArray(d.entries) || d.entries.length === 0) return;
        setHistory((prev) => {
          const serverIds = new Set(d.entries.map((e) => e.id));
          const localOnly = prev.filter((e) => !serverIds.has(e.id));
          const merged = [...d.entries, ...localOnly]
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, MAX_HISTORY);
          saveHistory(merged);
          return merged;
        });
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clerkLoaded, clerkUser?.id, clientId]);

  const resultsRef = useRef<HTMLDivElement>(null);

  // Refresh usage status from server — this is the single source of truth for
  // isPro. Both branches must update isPro so a lapsed subscription or a new
  // account on the same device is correctly shown as Free.
  const refreshUsageStatus = useCallback((cid: string, email?: string) => {
    // APPLE REVIEW — local demo session bypass. Checked first so it works even
    // when there is no Clerk session. getDemoSessionEmail() is used as a
    // fallback testerEmail so the server also whitelists the session.
    if (isDemoSessionActive()) {
      setIsPro(true);
      saveIsProCached(true);
      setFreeRemaining(99);
      setProCheckDone(true);
      return;
    }

    // Demo / review emails are whitelisted unconditionally — skip the server
    // round-trip entirely so no network timeout can block Pro access.
    if (isDemoProEmail(email)) {
      setIsPro(true);
      saveIsProCached(true);
      setFreeRemaining(99);
      setProCheckDone(true);
      return;
    }

    const fp = getFingerprint();
    const emailParam = email ? `&testerEmail=${encodeURIComponent(email)}` : "";
    // 8-second hard cap — if the server doesn't answer in time, unblock the
    // UI so the app never stays frozen on a slow network or cold iOS start.
    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), 8_000);

    fetch(`/api/usage/status?fingerprint=${encodeURIComponent(fp)}&clientId=${encodeURIComponent(cid)}${emailParam}`, {
      credentials: "include",
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((d) => {
        clearTimeout(timerId);
        if (d.isPro) {
          setIsPro(true);
          saveIsProCached(true);
          setFreeRemaining(99);
        } else {
          // Explicitly demote to Free — do NOT leave stale Pro state from
          // localStorage or a previous account's session.
          setIsPro(false);
          saveIsProCached(false);
          setDiagCount(d.useCount ?? 0);
          setFreeRemaining(d.freeRemaining ?? Math.max(0, FREE_DIAGNOSES - (d.useCount ?? 0)));
          // Parse trial data (only populated for authenticated Clerk users)
          if (d.trialActive !== undefined) {
            setTrialState({
              active: !!d.trialActive,
              daysLeft: d.trialDaysLeft ?? 0,
              creditsLeft: d.trialCreditsLeft ?? 0,
              rewardsEarned: Array.isArray(d.rewardsEarned) ? d.rewardsEarned : [],
            });
          }
        }
        // In both cases the server has answered — unlock the upgrade CTA.
        setProCheckDone(true);
      })
      .catch(() => {
        clearTimeout(timerId);
        // Network error or 8-second timeout: default to Free defensively but
        // still unlock the CTA so the user is never stuck on a blank screen.
        setIsPro(false);
        saveIsProCached(false);
        setProCheckDone(true);
      });
  }, []);

  useEffect(() => {
    setHistory(loadHistory());
    setDiagCount(loadDiagCount());
    trackAppOpen();  // record today as a used day for App Store review eligibility

    // Read pre-selected unit navigated from UnitDetailPage
    try {
      const preUnitId = sessionStorage.getItem("unitdown_selected_unit_id");
      const preUnitLabel = sessionStorage.getItem("unitdown_selected_unit_label");
      if (preUnitId) {
        sessionStorage.removeItem("unitdown_selected_unit_id");
        sessionStorage.removeItem("unitdown_selected_unit_label");
        setSelectedUnitId(preUnitId);
        setSelectedUnitLabel(preUnitLabel);
      }
    } catch {}

    // Replay a saved diagnosis navigated back from AccountPage
    try {
      const replayRaw = sessionStorage.getItem("unitdown_replay");
      if (replayRaw) {
        sessionStorage.removeItem("unitdown_replay");
        const entry = JSON.parse(replayRaw) as HistoryEntry;
        if (entry?.result && entry?.symptoms) {
          setCurrentResult(entry.result);
          setSymptoms(entry.symptoms);
          setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
        }
      }
    } catch {}

    // Pro status is determined by the server response in refreshUsageStatus.
    // Do NOT call setProCheckDone(true) here — let the fetch response do it
    // so the UI never shows a stale Pro/Free state before the server answers.
    refreshUsageStatus(clientId, testerEmail);
  }, [clientId, refreshUsageStatus]);

  const diagnose = useDiagnoseHvac();

  // Track whether the upsell overlay has been dismissed this session or is on
  // cooldown from a previous "Don't show for 7 days" selection.
  const [upsellDismissed, setUpsellDismissed] = useState(() => isUpsellOnCooldown());

  const handleUpsellDismiss = useCallback((permanent: boolean) => {
    if (permanent) saveUpsellDismissedAt();
    setUpsellDismissed(true);
  }, []);

  const openModal = useCallback(() => setModalOpen(true), []);

  // Listen for upgrade event dispatched from AccountPage
  useEffect(() => {
    const handler = () => openModal();
    window.addEventListener("unitdown:upgrade", handler);
    return () => window.removeEventListener("unitdown:upgrade", handler);
  }, [openModal]);

  const handleLogout = useCallback(async () => {
    localStorage.removeItem(PRO_KEY);
    setIsPro(false);
    const newGuestId = crypto.randomUUID();
    localStorage.setItem(CLIENT_ID_KEY, newGuestId);
    setClientId(newGuestId);
    await clerkSignOut({ redirectUrl: "/" });
  }, [clerkSignOut]);

  const runDiagnosis = useCallback((trimmed: string) => {
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);

    diagnose.mutate(
      { data: { symptoms: trimmed, clientId, testerEmail } },
      {
        onSuccess: (result) => {
          const entry: HistoryEntry = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            symptoms: trimmed,
            result,
            timestamp: Date.now(),
          };
          const newCount = incrementDiagCount();
          setDiagCount(newCount);
          setCurrentResult(result);
          trackDiagnosisComplete();
          setTimeout(() => { maybeRequestReview("diagnosis").catch(() => {}); }, 2000);
          // Award first_diagnosis bonus (idempotent — fires only on very first diagnosis)
          awardReward(clientId, "first_diagnosis").then((result) => {
            if (result?.bonusCredits) {
              toast({ description: `+${result.bonusCredits} diagnostic credits added!` });
              setTrialState(prev => prev ? { ...prev, creditsLeft: prev.creditsLeft + result.bonusCredits } : prev);
            }
          }).catch(() => {});
          setHistory((prev) => {
            const updated = [entry, ...prev].slice(0, MAX_HISTORY);
            saveHistory(updated);
            return updated;
          });
          // Persist to server for authenticated users (Clerk IDs begin with "user_")
          if (clientId.startsWith("user_")) {
            fetch("/api/history", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ clientId, entries: [entry] }),
            }).catch(() => {});

            // Auto-save diagnostic log (linked to selected unit if any)
            const unitIdForLog = selectedUnitId;
            const primary = result?.primary;
            fetch("/api/diagnostic-logs", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                clientId,
                log: {
                  unitId: unitIdForLog ?? null,
                  symptoms: trimmed,
                  diagnosisId: primary?.id ?? null,
                  diagnosisTitle: primary?.title ?? null,
                  confidencePercent: primary?.confidencePercent ?? null,
                  result,
                  status: "unresolved",
                  timestamp: entry.timestamp,
                },
              }),
            }).catch(() => {});
          }
          // Refresh server-side count
          refreshUsageStatus(clientId, testerEmail);
        },
        onError: (err) => {
          console.error("[UnitDown] Diagnosis failed — error stack:", err);
          // If a pro user gets a 429 it means their subscription couldn't be
          // found under the current clientId. Force a fresh server-side check
          // so future attempts use the correct pro status.
          const msg = err instanceof Error ? err.message : String(err);
          if (
            (msg.includes("429") || msg.toLowerCase().includes("usage limit")) &&
            isPro
          ) {
          }
        },
      }
    );
  }, [clientId, testerEmail, diagnose, refreshUsageStatus, selectedUnitId]);

  const handleDiagnose = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = symptoms.trim();
    if (!trimmed) return;

    // Skip gate for pro users
    if (isPro) {
      runDiagnosis(trimmed);
      return;
    }

    // Pre-check with server gate
    try {
      const fp = getFingerprint();
      const gateRes = await fetch("/api/usage/gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ fingerprint: fp, clientId, testerEmail }),
      });
      const gateData = await gateRes.json() as { allowed: boolean; status: string };

      if (gateData.allowed) {
        runDiagnosis(trimmed);
      } else if (!clerkUser && !isDemoSessionActive()) {
        // Anonymous user hit free limit → show signup/login prompt
        // APPLE REVIEW: demo session is treated as Pro (isPro=true above) so
        // this branch is never reached for the reviewer — but guard explicitly.
        pendingSymptomsRef.current = trimmed;
        setEmailWallOpen(true);
      } else {
        // Logged-in non-pro user hit limit → show payment modal
        pendingSymptomsRef.current = trimmed;
        openModal();
      }
    } catch (gateErr) {
      console.warn("[UnitDown] Gate request failed:", gateErr);
      // Network error: use local usage count as a backstop.
      // If we can confirm the user is already over the limit, block them.
      // Only allow if we have no reliable data (diagCount is 0 or under limit).
      if (!isPro && diagCount >= FREE_DIAGNOSES) {
        openModal();
        return;
      }
      runDiagnosis(trimmed);
    }
  };

  const handleEmailSuccess = useCallback(() => {
    const pending = pendingSymptomsRef.current;
    if (pending) {
      pendingSymptomsRef.current = "";
      // Re-gate after email unlock
      const fp = getFingerprint();
      fetch("/api/usage/gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ fingerprint: fp, clientId, testerEmail }),
      })
        .then((r) => r.json())
        .then((d: { allowed: boolean }) => {
          if (d.allowed) {
            runDiagnosis(pending);
          } else {
            openModal();
          }
        })
        .catch(() => runDiagnosis(pending));
    }
    refreshUsageStatus(clientId, testerEmail);
  }, [clientId, testerEmail, openModal, runDiagnosis, refreshUsageStatus]);

  return (
    <div className="min-h-[100dvh] w-full max-w-full overflow-x-hidden bg-background text-slate-900 font-sans selection:bg-blue-100 flex flex-col">

      {/* Email Wall Modal */}
      <EmailWallModal
        open={emailWallOpen}
        onClose={() => setEmailWallOpen(false)}
        onEmailSuccess={handleEmailSuccess}
        onUpgrade={() => { setEmailWallOpen(false); openModal(); }}
      />

      {/* Pro Upgrade Modal — Apple IAP */}
      <AppleIAPUpgradeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onPurchaseComplete={() => {
          setIsPro(true);
          saveIsProCached(true);
          setModalOpen(false);
        }}
      />

      {/* Navigation */}
      <header className="bg-white/90 backdrop-blur-md border-b border-blue-100 sticky top-0 z-50">
        <div className="container max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-md shadow-blue-600/20">
              <ThermometerSnowflake className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <span className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900">UnitDown AI</span>
          </div>

          {/* Center nav */}
          <nav className="flex items-center">
            <Link
              href="/guides"
              className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors px-2 sm:px-3 py-1.5 rounded-lg hover:bg-blue-50"
              data-testid="nav-guides"
            >
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Guides</span>
            </Link>
            {clerkLoaded && clerkUser && (
              <button
                onClick={() => navigate("/records")}
                className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors px-2 sm:px-3 py-1.5 rounded-lg hover:bg-blue-50"
                data-testid="nav-records"
              >
                <Wrench className="w-4 h-4" />
                <span className="hidden sm:inline">Field Hub</span>
              </button>
            )}
            {clerkLoaded && clerkUser && (
              <button
                onClick={() => navigate("/job")}
                className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors px-2 sm:px-3 py-1.5 rounded-lg hover:bg-blue-50"
                data-testid="nav-job-mode"
              >
                <Briefcase className="w-4 h-4" />
                <span className="hidden sm:inline">Job Mode</span>
              </button>
            )}
          </nav>

          <div className="flex items-center gap-2">
            {/* Signed-out nav — show when clerk confirms no user, OR after timeout */}
            {(clerkLoaded ? !clerkUser : clerkTimedOut) && (
              <>
                {/* Navigate to our custom /login page which shows both Apple and
                    Google in code — no Clerk dashboard config required for them
                    to appear. */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900"
                  data-testid="nav-login"
                  onClick={() => navigate("/login")}
                >
                  <KeyRound className="w-3.5 h-3.5 mr-1.5" />
                  Login
                </Button>
                {!isPro && (
                  <Button
                    onClick={openModal}
                    size="sm"
                    className="hidden sm:inline-flex bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 sm:px-6 shadow-sm rounded-full text-xs sm:text-sm"
                    data-testid="nav-join-premium"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    Join Premium
                  </Button>
                )}
              </>
            )}

            {/* Signed-in nav */}
            {clerkLoaded && clerkUser && (
              <>
                {isPro ? (
                  <>
                    <button
                      onClick={() => navigate("/account")}
                      className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-1 hover:bg-emerald-100 transition-colors"
                      data-testid="nav-pro-badge"
                    >
                      <img src="/brand/unitdown-pro-logo.png" alt="UnitDown Pro" className="w-5 h-5 rounded-sm object-cover flex-shrink-0" />
                      <span className="hidden sm:inline">Pro Member</span>
                      <span className="sm:hidden">Pro</span>
                    </button>
                  </>
                ) : proCheckDone ? (
                  <>
                    <button
                      onClick={() => navigate("/account")}
                      className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-700 transition-colors"
                      data-testid="nav-logged-in"
                    >
                      <UserCircle className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{clerkUser.firstName || clerkUser.primaryEmailAddress?.emailAddress?.split("@")[0] || "Account"}</span>
                      <span className="sm:hidden">Account</span>
                    </button>
                    <Button
                      onClick={openModal}
                      size="sm"
                      className="hidden sm:inline-flex bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 sm:px-6 shadow-sm rounded-full text-xs sm:text-sm"
                      data-testid="nav-join-premium"
                    >
                      <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                      Join Premium
                    </Button>
                  </>
                ) : null}
              </>
            )}

            {/* Dark mode toggle — always visible */}
            <button
              onClick={toggleDarkMode}
              aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 px-2 sm:px-3 py-1.5 rounded-lg transition-colors"
              data-testid="nav-dark-mode-toggle"
            >
              {darkMode ? (
                <>
                  <Sun className="w-4 h-4" />
                  <span className="hidden sm:inline">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4" />
                  <span className="hidden sm:inline">Dark</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {/* Hero Section */}
        <section className="relative pt-12 sm:pt-20 pb-16 sm:pb-24 overflow-hidden w-full" aria-label="HVAC Diagnostic Tool">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 to-transparent -z-10" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] sm:w-[1000px] h-[500px] opacity-[0.03] bg-[radial-gradient(circle,theme(colors.blue.600)_0%,transparent_70%)] pointer-events-none" />

          <div className="container max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6 relative z-10">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.1]"
            >
              Commercial HVAC <br className="hidden md:block" />
              Intelligence <span className="text-blue-600">Built for the Field</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto font-medium"
            >
              Diagnose faster. Save equipment history. Track repairs. Manage follow-ups. One platform built for commercial HVAC professionals.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-8 sm:mt-10 max-w-3xl mx-auto bg-white rounded-2xl sm:rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/60 p-2 overflow-hidden"
            >
              <form onSubmit={handleDiagnose} className="relative flex flex-col">
                <Textarea
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder="Describe symptoms, sequence of operation, meter readings, pressures, alarms, or control voltage observations..."
                  className="min-h-[120px] sm:min-h-[140px] text-base sm:text-lg p-4 sm:p-6 border-0 focus-visible:ring-0 resize-none bg-transparent placeholder:text-slate-400 font-medium"
                  data-testid="hero-input-symptoms"
                  aria-label="Describe HVAC symptoms"
                />
                {/* Unit selector — shown only when logged in */}
                {clerkLoaded && clerkUser && (
                  <div className="mx-3 mb-2 flex items-center gap-2">
                    {selectedUnitId ? (
                      <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-blue-700 flex-1 min-w-0">
                        <Wrench className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{selectedUnitLabel ?? "Unit selected"}</span>
                        <button
                          type="button"
                          onClick={() => { setSelectedUnitId(null); setSelectedUnitLabel(null); }}
                          className="ml-auto text-blue-400 hover:text-blue-700 flex-shrink-0"
                          aria-label="Remove unit selection"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => navigate("/records")}
                        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-600 transition-colors"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        Select unit (optional)
                      </button>
                    )}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 px-3 sm:px-4 pb-3 sm:pb-4 pt-1 sm:pt-2">
                  <div className="hidden sm:flex items-center gap-2 text-sm font-medium">
                    {isPro ? (
                      <span className="flex items-center gap-1.5 text-emerald-600">
                        <CheckCircle2 className="w-4 h-4" /> Unlimited diagnostics
                      </span>
                    ) : trialState?.active ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-100 text-xs font-semibold text-blue-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse flex-shrink-0" />
                        Pro Trial · {trialState.daysLeft}d left · {trialState.creditsLeft} {trialState.creditsLeft === 1 ? "diagnosis" : "diagnoses"}
                      </span>
                    ) : trialState && !trialState.active ? (
                      <span className="text-amber-600 font-semibold text-xs">Trial ended · Upgrade to continue</span>
                    ) : freeRemaining > 0 ? (
                      <span className="text-slate-400">
                        Free uses remaining: <strong className="text-slate-600">{freeRemaining}</strong>
                      </span>
                    ) : (
                      <span className="text-amber-600 font-semibold flex items-center gap-1">
                        <Mail className="w-4 h-4" /> Sign up free to continue
                      </span>
                    )}
                  </div>
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-8 font-bold h-12 shadow-lg shadow-blue-600/20"
                    disabled={diagnose.isPending || !symptoms.trim()}
                    data-testid="hero-button-run"
                  >
                    {diagnose.isPending ? "Analyzing…" : "Run Diagnosis"}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </form>
            </motion.div>

            {/* Web CTA */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="flex justify-center pt-2"
            >
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="flex items-center gap-2 h-[44px] px-5 bg-slate-900 text-white rounded-[10px] text-sm font-semibold hover:bg-slate-800 transition-colors"
                aria-label="Use UnitDown AI on the web"
              >
                <Globe className="w-4 h-4" />
                Use on the Web
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="pt-6 max-w-3xl mx-auto"
            >
              <div className="flex items-center justify-center gap-3 mb-3">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Try an example</p>
                <button
                  onClick={() => setExampleSetB((v) => !v)}
                  className="text-xs font-semibold text-blue-500 hover:text-blue-700 transition-colors"
                >
                  {exampleSetB ? "← Set A" : "More →"}
                </button>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {(exampleSetB ? exampleSymptomsB : exampleSymptoms).map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => setSymptoms(ex)}
                    className="text-sm px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-600 font-medium hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 transition-all shadow-sm"
                    data-testid={`pill-example-${i}`}
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Quick-entry cards — logged-in users only */}
            {clerkLoaded && clerkUser && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="pt-2 max-w-3xl mx-auto"
              >
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
                  {[
                    {
                      icon: Activity,
                      label: "Run Diagnosis",
                      sub: "Diagnose a unit",
                      action: () => document.querySelector<HTMLTextAreaElement>('[data-testid="hero-input-symptoms"]')?.focus(),
                    },
                    {
                      icon: LayoutGrid,
                      label: "Field Hub",
                      sub: "Equipment & records",
                      action: () => navigate("/records"),
                    },
                    {
                      icon: ScanLine,
                      label: "Scan Nameplate",
                      sub: "OCR nameplate data",
                      action: () => navigate("/records"),
                    },
                    {
                      icon: Bell,
                      label: "Add Reminder",
                      sub: "Schedule follow-up",
                      action: () => navigate("/records"),
                    },
                  ].map(({ icon: Icon, label, sub, action }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={action}
                      className="flex flex-col items-start gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-3.5 hover:border-blue-300 hover:shadow-md hover:shadow-blue-500/5 transition-all group text-left"
                    >
                      <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors flex-shrink-0">
                        <Icon className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 leading-tight">{label}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </section>

        {/* Trust Badges Strip */}
        <section id="features" className="border-y border-slate-200 bg-white" aria-label="Features">
          <div className="container max-w-6xl mx-auto px-4 sm:px-6 py-5">
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 items-center">
              {trustBadges.map((badge, i) => (
                <div key={i} className="flex items-center gap-2 text-slate-600">
                  <badge.icon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 opacity-80 flex-shrink-0" />
                  <span className="text-xs sm:text-sm font-semibold whitespace-nowrap">{badge.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Dynamic Content: Results or How It Works */}
        <div className="flex-1" ref={resultsRef}>
          <div className="container max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-12 sm:space-y-16">

            <AnimatePresence mode="wait">
              {(diagnose.isPending || currentResult || diagnose.isError) ? (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
                  className="scroll-mt-32 space-y-8"
                >
                  {/* Results header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">Diagnostic Report</h2>
                      {currentResult && !diagnose.isPending && (
                        <p className="text-sm text-slate-500 font-medium mt-0.5">
                          Based on: <span className="text-slate-700 italic">"{symptoms.length > 80 ? symptoms.slice(0, 80) + "…" : symptoms}"</span>
                        </p>
                      )}
                    </div>
                    {(currentResult || diagnose.isError) && !diagnose.isPending && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCurrentResult(null);
                          setSymptoms("");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="flex-shrink-0 border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-700 font-semibold"
                        data-testid="btn-new-diagnosis"
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        New Diagnosis
                      </Button>
                    )}
                  </div>

                  {/* Safety Notice — shown whenever results are visible */}
                  {(currentResult || diagnose.isError) && !diagnose.isPending && (
                    <div className="flex gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
                      <TriangleAlert className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs font-medium text-amber-900 leading-snug">
                        <strong>Safety Notice:</strong> HVAC service involves high voltage electricity, rotating equipment, pressurized refrigerants, combustion risks, carbon monoxide hazards, hot surfaces, sharp metal, and other serious risks. UnitDown AI is for informational support only. Always follow lockout/tagout procedures, wear proper PPE, verify conditions with approved instruments, and follow manufacturer service literature. Do not rely on UnitDown AI for emergency, life-safety, or final repair decisions.
                      </p>
                    </div>
                  )}

                  {diagnose.isError && (
                    <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-900">
                      <AlertCircle className="h-5 w-5" />
                      <AlertTitle className="font-bold">Analysis Failed</AlertTitle>
                      <AlertDescription className="font-medium">
                        {diagnose.error instanceof Error
                          ? diagnose.error.message
                          : "We encountered an error analyzing the symptoms. Please check your connection and try again."}
                        <button
                          type="button"
                          onClick={() => handleDiagnose()}
                          className="mt-2 block underline text-red-800 hover:text-red-600"
                        >
                          Tap to retry
                        </button>
                      </AlertDescription>
                    </Alert>
                  )}

                  {diagnose.isPending && <DiagnosticSkeleton />}

                  {!diagnose.isPending && currentResult && (() => {
                    const primary = currentResult.primary;
                    const alternatives = currentResult.alternatives ?? [];
                    const pc = priorityConfig(primary.priorityLevel);
                    const isCritical = primary.priorityLevel === "critical";
                    const isHigh = primary.priorityLevel === "high";
                    const urgentColor = isCritical
                      ? { bg: "bg-red-50", border: "border-red-400", text: "text-red-700", iconBg: "bg-red-100 text-red-600" }
                      : isHigh
                      ? { bg: "bg-orange-50", border: "border-orange-400", text: "text-orange-700", iconBg: "bg-orange-100 text-orange-600" }
                      : { bg: "bg-blue-50", border: "border-blue-500", text: "text-blue-700", iconBg: "bg-blue-100 text-blue-600" };
                    const isLocked = diagCount > FREE_DIAGNOSES && !isPro;
                    const freeLeft = Math.max(0, FREE_DIAGNOSES - diagCount);
                    const resultIsPro = currentResult.isPro ?? false;

                    return (
                      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-5">

                        {/* Free trial counter banner — only for free-tier results */}
                        {!isLocked && !resultIsPro && diagCount > 0 && (
                          <motion.div variants={fadeUp}>
                            <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3" data-testid="trial-banner">
                              <FlaskConical className="w-4 h-4 text-blue-500 flex-shrink-0" />
                              <p className="text-sm font-semibold text-blue-800">
                                  {freeLeft > 0
                                  ? <><span className="font-extrabold">{freeLeft} free {freeLeft === 1 ? "use" : "uses"} remaining.</span> <span className="text-blue-600">Sign up free to keep diagnosing.</span></>
                                  : <span className="text-amber-700 font-bold">Free uses complete — create a free account to continue.</span>}
                              </p>
                              <span className="ml-auto text-xs font-bold text-blue-500 whitespace-nowrap">Upgrade from $7.99/mo →</span>
                            </div>
                          </motion.div>
                        )}

                        {/* Summary Card — always visible */}
                        <motion.div variants={fadeUp}>
                          <Card className="rounded-2xl border-slate-200 shadow-md overflow-hidden">
                            <div className="bg-slate-900 px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="space-y-0.5">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{primary.category}</p>
                                <h3 className="text-xl font-extrabold text-white leading-snug">{primary.title}</h3>
                              </div>
                              <Badge className={`self-start sm:self-auto px-4 py-2 text-sm font-bold border rounded-full ${pc.className}`} data-testid="priority-badge">
                                <pc.Icon className="w-4 h-4 mr-1.5 inline-block" />
                                {pc.label}
                              </Badge>
                            </div>
                            <div className="px-6 py-5 bg-white space-y-4">
                              <div>
                                <div className="flex justify-between items-center mb-2.5">
                                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Diagnostic Confidence</span>
                                  <span className="text-lg font-extrabold text-slate-900" data-testid="confidence-pct">{primary.confidencePercent}%</span>
                                </div>
                                <AnimatedConfidenceBar pct={primary.confidencePercent} color={confidenceColor(primary.confidencePercent)} />
                                <p className="text-xs text-slate-400 font-medium mt-2">
                                  {primary.confidencePercent >= 85
                                    ? "High confidence match — symptoms align closely with this fault category."
                                    : primary.confidencePercent >= 70
                                    ? "Good match — review the first checks to confirm."
                                    : "Partial match — additional inspection recommended."}
                                </p>
                              </div>
                              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex gap-3">
                                <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-blue-800 font-medium leading-snug">{primary.whyThisFits}</p>
                              </div>
                            </div>
                          </Card>
                        </motion.div>

                        {/* ── PRO PATH: full ranked diagnostics ── */}
                        {!isLocked && resultIsPro && (
                          <>
                            {/* Causes + Checks Grid */}
                            <div className="grid md:grid-cols-2 gap-5">
                              <motion.div variants={fadeUp}>
                                <Card className="rounded-2xl border-slate-200 shadow-sm h-full" data-testid="card-likely-causes">
                                  <CardHeader className="bg-slate-50 border-b border-slate-100 py-4 px-6 rounded-t-2xl">
                                    <CardTitle className="text-sm font-bold flex items-center text-slate-700 uppercase tracking-wider">
                                      <Search className="w-4 h-4 mr-2 text-blue-600" />
                                      Likely Causes
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent className="p-6">
                                    <ol className="space-y-4">
                                      {primary.likelyCauses.map((cause, idx) => (
                                        <motion.li key={idx} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + idx * 0.07 }} className="flex text-slate-700 font-medium">
                                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-extrabold mr-3 mt-0.5">{idx + 1}</span>
                                          <span className="leading-snug">{cause}</span>
                                        </motion.li>
                                      ))}
                                    </ol>
                                  </CardContent>
                                </Card>
                              </motion.div>
                              <motion.div variants={fadeUp}>
                                <Card className="rounded-2xl border-slate-200 shadow-sm h-full" data-testid="card-first-checks">
                                  <CardHeader className="bg-slate-50 border-b border-slate-100 py-4 px-6 rounded-t-2xl">
                                    <CardTitle className="text-sm font-bold flex items-center text-slate-700 uppercase tracking-wider">
                                      <ListChecks className="w-4 h-4 mr-2 text-emerald-600" />
                                      First Checks
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent className="p-6">
                                    <ul className="space-y-4">
                                      {primary.firstChecks.map((check, idx) => (
                                        <motion.li key={idx} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + idx * 0.07 }} className="flex text-slate-700 font-medium">
                                          <CheckCircle2 className="w-5 h-5 mr-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                                          <span className="leading-snug">{check}</span>
                                        </motion.li>
                                      ))}
                                    </ul>
                                  </CardContent>
                                </Card>
                              </motion.div>
                            </div>

                            {/* Meter Checks */}
                            {primary.meterChecks.length > 0 && (
                              <motion.div variants={fadeUp}>
                                <Card className="rounded-2xl border-slate-200 shadow-sm" data-testid="card-meter-checks">
                                  <CardHeader className="bg-slate-50 border-b border-slate-100 py-4 px-6 rounded-t-2xl">
                                    <CardTitle className="text-sm font-bold flex items-center text-slate-700 uppercase tracking-wider">
                                      <Gauge className="w-4 h-4 mr-2 text-violet-600" />
                                      Meter & Instrument Checks
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent className="p-6">
                                    <ul className="space-y-4">
                                      {primary.meterChecks.map((check, idx) => (
                                        <motion.li key={idx} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + idx * 0.07 }} className="flex text-slate-700 font-medium">
                                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-extrabold mr-3 mt-0.5">{idx + 1}</span>
                                          <span className="leading-snug">{check}</span>
                                        </motion.li>
                                      ))}
                                    </ul>
                                  </CardContent>
                                </Card>
                              </motion.div>
                            )}

                            {/* Recommended Action */}
                            <motion.div variants={fadeUp}>
                              <div className={`rounded-2xl p-6 border-l-4 border ${urgentColor.bg} ${urgentColor.border} border-opacity-30`} data-testid="recommended-action">
                                <div className="flex gap-4">
                                  <div className={`p-2.5 rounded-xl h-fit flex-shrink-0 ${urgentColor.iconBg}`}>
                                    <Wrench className="w-5 h-5" />
                                  </div>
                                  <div>
                                    <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${urgentColor.text}`}>Recommended Action</p>
                                    <p className="text-lg font-semibold text-slate-900 leading-relaxed">{primary.recommendedAction}</p>
                                  </div>
                                </div>
                              </div>
                            </motion.div>

                            {/* Risk Note */}
                            {primary.riskNote && (
                              <motion.div variants={fadeUp}>
                                <div className="rounded-2xl p-5 bg-amber-50 border border-amber-200 flex gap-3" data-testid="risk-note">
                                  <TriangleAlert className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                  <div>
                                    <p className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-1">Risk if Ignored</p>
                                    <p className="text-sm font-medium text-amber-900 leading-snug">{primary.riskNote}</p>
                                  </div>
                                </div>
                              </motion.div>
                            )}

                            {/* Feedback */}
                            <motion.div variants={fadeUp}>
                              <FeedbackButtons
                                recommendationId={primary.id}
                                issueInput={symptoms}
                                confidence={primary.confidencePercent}
                              />
                            </motion.div>

                            {/* Alternatives */}
                            {alternatives.length > 0 && (
                              <motion.div variants={fadeUp}>
                                <AlternativesAccordion alternatives={alternatives} issueInput={symptoms} />
                              </motion.div>
                            )}

                            {/* History — Pro members see full history */}
                            {history.length > 1 && (
                              <motion.div variants={fadeUp} className="pt-8 border-t border-slate-200">
                                <div className="flex items-center justify-between mb-5">
                                  <div className="flex items-center gap-2">
                                    <History className="w-5 h-5 text-slate-400" />
                                    <h3 className="text-base font-bold text-slate-900">Recent Diagnoses</h3>
                                  </div>
                                  <Button variant="ghost" size="sm" onClick={() => { setHistory([]); saveHistory([]); }} className="text-slate-500 hover:text-red-600 font-semibold" data-testid="btn-clear-history">
                                    <Trash2 className="w-4 h-4 mr-1.5" />
                                    Clear
                                  </Button>
                                </div>
                                <div className="grid sm:grid-cols-2 gap-3">
                                  {history.slice(1, 5).map((entry) => (
                                    <button key={entry.id} onClick={() => { setSymptoms(entry.symptoms); setCurrentResult(entry.result); resultsRef.current?.scrollIntoView({ behavior: "smooth" }); }} className="text-left bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-md transition-all group" data-testid={`history-item-${entry.id}`}>
                                      <div className="flex justify-between items-start mb-1.5">
                                        <span className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors text-sm">{entry.result.primary.title}</span>
                                        <span className="text-xs font-medium text-slate-400 ml-2 flex-shrink-0">{new Date(entry.timestamp).toLocaleDateString()}</span>
                                      </div>
                                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{entry.symptoms}</p>
                                    </button>
                                  ))}
                                </div>
                              </motion.div>
                            )}

                            {/* Resolution Feedback */}
                            <motion.div variants={fadeUp}>
                              <ResolutionPanel
                                issueInput={symptoms}
                                recommendations={[
                                  { id: primary.id, title: primary.title },
                                  ...alternatives.map((a) => ({ id: a.id, title: a.title })),
                                ]}
                              />
                            </motion.div>
                          </>
                        )}

                        {/* ── FREE LITE PATH: simplified diagnostics with Pro teasers ── */}
                        {!isLocked && !resultIsPro && (
                          <>
                            {/* Causes + Checks Grid (lite) */}
                            <div className="grid md:grid-cols-2 gap-5">
                              <motion.div variants={fadeUp}>
                                <Card className="rounded-2xl border-slate-200 shadow-sm h-full" data-testid="card-likely-causes">
                                  <CardHeader className="bg-slate-50 border-b border-slate-100 py-4 px-6 rounded-t-2xl">
                                    <CardTitle className="text-sm font-bold flex items-center text-slate-700 uppercase tracking-wider">
                                      <Search className="w-4 h-4 mr-2 text-blue-600" />
                                      Likely Cause
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent className="p-6 flex flex-col h-full">
                                    <ol className="space-y-4 flex-1">
                                      {primary.likelyCauses.map((cause, idx) => (
                                        <motion.li key={idx} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + idx * 0.07 }} className="flex text-slate-700 font-medium">
                                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-extrabold mr-3 mt-0.5">{idx + 1}</span>
                                          <span className="leading-snug">{cause}</span>
                                        </motion.li>
                                      ))}
                                    </ol>
                                    <button onClick={openModal} className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-2 w-full text-left group">
                                      <Lock className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                                      <span className="text-xs font-semibold text-slate-500 group-hover:text-blue-600 transition-colors">Pro: Full ranked cause list + 2 alternative diagnoses</span>
                                      <ArrowRight className="w-3 h-3 text-blue-400 ml-auto group-hover:translate-x-0.5 transition-transform" />
                                    </button>
                                  </CardContent>
                                </Card>
                              </motion.div>
                              <motion.div variants={fadeUp}>
                                <Card className="rounded-2xl border-slate-200 shadow-sm h-full" data-testid="card-first-checks">
                                  <CardHeader className="bg-slate-50 border-b border-slate-100 py-4 px-6 rounded-t-2xl">
                                    <CardTitle className="text-sm font-bold flex items-center text-slate-700 uppercase tracking-wider">
                                      <ListChecks className="w-4 h-4 mr-2 text-emerald-600" />
                                      First Checks
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent className="p-6 flex flex-col h-full">
                                    <ul className="space-y-4 flex-1">
                                      {primary.firstChecks.map((check, idx) => (
                                        <motion.li key={idx} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + idx * 0.07 }} className="flex text-slate-700 font-medium">
                                          <CheckCircle2 className="w-5 h-5 mr-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                                          <span className="leading-snug">{check}</span>
                                        </motion.li>
                                      ))}
                                    </ul>
                                    <button onClick={openModal} className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-2 w-full text-left group">
                                      <Lock className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                                      <span className="text-xs font-semibold text-slate-500 group-hover:text-blue-600 transition-colors">Pro: Full step-by-step field diagnostic sequence</span>
                                      <ArrowRight className="w-3 h-3 text-blue-400 ml-auto group-hover:translate-x-0.5 transition-transform" />
                                    </button>
                                  </CardContent>
                                </Card>
                              </motion.div>
                            </div>

                            {/* Meter Checks — Pro-only teaser */}
                            <motion.div variants={fadeUp}>
                              <button onClick={openModal} className="w-full text-left" data-testid="card-meter-checks-teaser">
                                <Card className="rounded-2xl border-slate-200 border-dashed shadow-sm hover:border-violet-300 hover:shadow-md transition-all group">
                                  <CardContent className="p-5 flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0 group-hover:bg-violet-100 transition-colors">
                                      <Gauge className="w-5 h-5 text-violet-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-0.5">
                                        <Lock className="w-3 h-3 text-violet-400" />
                                        <p className="text-sm font-bold text-slate-700">Meter &amp; Instrument Checks</p>
                                        <span className="text-xs font-bold text-violet-600 bg-violet-50 border border-violet-200 rounded-full px-2 py-0.5">Pro</span>
                                      </div>
                                      <p className="text-xs text-slate-400 font-medium">Capacitor µF, contactor voltage, compressor amps, refrigerant SH/SC, electrical control-path readings</p>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-slate-300 flex-shrink-0 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                                  </CardContent>
                                </Card>
                              </button>
                            </motion.div>

                            {/* Recommended Action */}
                            <motion.div variants={fadeUp}>
                              <div className={`rounded-2xl p-6 border-l-4 border ${urgentColor.bg} ${urgentColor.border} border-opacity-30`} data-testid="recommended-action">
                                <div className="flex gap-4">
                                  <div className={`p-2.5 rounded-xl h-fit flex-shrink-0 ${urgentColor.iconBg}`}>
                                    <Wrench className="w-5 h-5" />
                                  </div>
                                  <div>
                                    <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${urgentColor.text}`}>Recommended Action</p>
                                    <p className="text-lg font-semibold text-slate-900 leading-relaxed">{primary.recommendedAction}</p>
                                  </div>
                                </div>
                              </div>
                            </motion.div>

                            {/* Risk Note */}
                            {primary.riskNote && (
                              <motion.div variants={fadeUp}>
                                <div className="rounded-2xl p-5 bg-amber-50 border border-amber-200 flex gap-3" data-testid="risk-note">
                                  <TriangleAlert className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                  <div>
                                    <p className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-1">Risk if Ignored</p>
                                    <p className="text-sm font-medium text-amber-900 leading-snug">{primary.riskNote}</p>
                                  </div>
                                </div>
                              </motion.div>
                            )}

                            {/* Feedback */}
                            <motion.div variants={fadeUp}>
                              <FeedbackButtons
                                recommendationId={primary.id}
                                issueInput={symptoms}
                                confidence={primary.confidencePercent}
                              />
                            </motion.div>

                            {/* Alternatives — Pro-only teaser */}
                            <motion.div variants={fadeUp}>
                              <button onClick={openModal} className="w-full text-left" data-testid="card-alternatives-teaser">
                                <Card className="rounded-2xl border-slate-200 border-dashed shadow-sm hover:border-blue-300 hover:shadow-md transition-all group">
                                  <CardContent className="p-5 flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                                      <Activity className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-0.5">
                                        <Lock className="w-3 h-3 text-blue-400" />
                                        <p className="text-sm font-bold text-slate-700">Alternative Diagnoses</p>
                                        <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">Pro</span>
                                      </div>
                                      <p className="text-xs text-slate-400 font-medium">Up to 2 ranked alternative root causes with confidence scoring, checks, and meter readings for each</p>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-slate-300 flex-shrink-0 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                                  </CardContent>
                                </Card>
                              </button>
                            </motion.div>

                            {/* Pro Membership CTA */}
                            <motion.div variants={fadeUp}>
                              <div className="rounded-2xl overflow-hidden border border-blue-100 bg-gradient-to-br from-blue-600 to-blue-700 shadow-lg shadow-blue-600/20" data-testid="pro-membership-cta">
                                <div className="px-6 py-7 md:px-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                  <div className="space-y-1.5">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Sparkles className="w-4 h-4 text-blue-200" />
                                      <span className="text-xs font-bold text-blue-200 uppercase tracking-widest">Unlock Full Diagnostics</span>
                                    </div>
                                    <h3 className="text-xl font-extrabold text-white leading-tight">
                                      You're seeing a simplified preview.
                                    </h3>
                                    <p className="text-blue-200 font-medium text-sm leading-relaxed max-w-md">
                                      Pro unlocks full ranked causes, complete step-by-step checks, refrigerant SH/SC analysis, electrical control-path meter readings, and saved diagnostic history.
                                    </p>
                                  </div>
                                  <div className="flex flex-col gap-3 flex-shrink-0">
                                    <Button size="lg" onClick={openModal} className="bg-white text-blue-700 hover:bg-blue-50 font-extrabold px-8 h-12 rounded-xl shadow-md transition-all" data-testid="btn-join-pro-results">
                                      <Sparkles className="w-5 h-5 mr-2" />
                                      Upgrade to Pro
                                    </Button>
                                    <p className="text-center text-xs text-blue-300 font-medium">
                                      Cancel anytime in Apple Settings
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </motion.div>

                            {/* History (trial) */}
                            {history.length > 1 && (
                              <motion.div variants={fadeUp} className="pt-8 border-t border-slate-200">
                                <div className="flex items-center justify-between mb-5">
                                  <div className="flex items-center gap-2">
                                    <History className="w-5 h-5 text-slate-400" />
                                    <h3 className="text-base font-bold text-slate-900">Recent Diagnoses</h3>
                                  </div>
                                  <Button variant="ghost" size="sm" onClick={() => { setHistory([]); saveHistory([]); }} className="text-slate-500 hover:text-red-600 font-semibold" data-testid="btn-clear-history">
                                    <Trash2 className="w-4 h-4 mr-1.5" />
                                    Clear
                                  </Button>
                                </div>
                                <div className="grid sm:grid-cols-2 gap-3">
                                  {history.slice(1, 5).map((entry) => (
                                    <button key={entry.id} onClick={() => { setSymptoms(entry.symptoms); setCurrentResult(entry.result); resultsRef.current?.scrollIntoView({ behavior: "smooth" }); }} className="text-left bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-md transition-all group" data-testid={`history-item-${entry.id}`}>
                                      <div className="flex justify-between items-start mb-1.5">
                                        <span className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors text-sm">{entry.result.primary.title}</span>
                                        <span className="text-xs font-medium text-slate-400 ml-2 flex-shrink-0">{new Date(entry.timestamp).toLocaleDateString()}</span>
                                      </div>
                                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{entry.symptoms}</p>
                                    </button>
                                  ))}
                                </div>
                              </motion.div>
                            )}

                            {/* Resolution Feedback */}
                            <motion.div variants={fadeUp}>
                              <ResolutionPanel
                                issueInput={symptoms}
                                recommendations={[{ id: primary.id, title: primary.title }]}
                              />
                            </motion.div>
                          </>
                        )}

                        {/* ── LOCKED PATH: blurred previews + upgrade overlay ── */}
                        {isLocked && (
                          <>
                            {/* Blurred causes — show only 1 visible cause, rest locked */}
                            <motion.div variants={fadeUp}>
                              <LockedSection label="Full Likely Causes">
                                <Card className="rounded-2xl border-slate-200 shadow-sm" data-testid="card-likely-causes">
                                  <CardHeader className="bg-slate-50 border-b border-slate-100 py-4 px-6 rounded-t-2xl">
                                    <CardTitle className="text-sm font-bold flex items-center text-slate-700 uppercase tracking-wider">
                                      <Search className="w-4 h-4 mr-2 text-blue-600" />
                                      Likely Causes
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent className="p-6">
                                    <ol className="space-y-4">
                                      {primary.likelyCauses.map((cause, idx) => (
                                        <li key={idx} className="flex text-slate-700 font-medium">
                                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-extrabold mr-3 mt-0.5">{idx + 1}</span>
                                          <span className="leading-snug">{cause}</span>
                                        </li>
                                      ))}
                                    </ol>
                                  </CardContent>
                                </Card>
                              </LockedSection>
                            </motion.div>

                            {/* Blurred first checks */}
                            <motion.div variants={fadeUp}>
                              <LockedSection label="First Checks">
                                <Card className="rounded-2xl border-slate-200 shadow-sm">
                                  <CardHeader className="bg-slate-50 border-b border-slate-100 py-4 px-6 rounded-t-2xl">
                                    <CardTitle className="text-sm font-bold flex items-center text-slate-700 uppercase tracking-wider">
                                      <ListChecks className="w-4 h-4 mr-2 text-emerald-600" />
                                      First Checks
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent className="p-6">
                                    <ul className="space-y-4">
                                      {primary.firstChecks.map((check, idx) => (
                                        <li key={idx} className="flex text-slate-700 font-medium">
                                          <CheckCircle2 className="w-5 h-5 mr-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                                          <span className="leading-snug">{check}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </CardContent>
                                </Card>
                              </LockedSection>
                            </motion.div>

                            {/* Blurred meter checks */}
                            {primary.meterChecks.length > 0 && (
                              <motion.div variants={fadeUp}>
                                <LockedSection label="Meter & Instrument Checks">
                                  <Card className="rounded-2xl border-slate-200 shadow-sm" data-testid="card-meter-checks">
                                    <CardHeader className="bg-slate-50 border-b border-slate-100 py-4 px-6 rounded-t-2xl">
                                      <CardTitle className="text-sm font-bold flex items-center text-slate-700 uppercase tracking-wider">
                                        <Gauge className="w-4 h-4 mr-2 text-violet-600" />
                                        Meter & Instrument Checks
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-6">
                                      <ul className="space-y-4">
                                        {primary.meterChecks.map((check, idx) => (
                                          <li key={idx} className="flex text-slate-700 font-medium">
                                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-extrabold mr-3 mt-0.5">{idx + 1}</span>
                                            <span className="leading-snug">{check}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </CardContent>
                                  </Card>
                                </LockedSection>
                              </motion.div>
                            )}

                            {/* Blurred recommended action */}
                            <motion.div variants={fadeUp}>
                              <LockedSection label="Recommended Action">
                                <div className={`rounded-2xl p-6 border-l-4 border ${urgentColor.bg} ${urgentColor.border} border-opacity-30`} data-testid="recommended-action">
                                  <div className="flex gap-4">
                                    <div className={`p-2.5 rounded-xl h-fit flex-shrink-0 ${urgentColor.iconBg}`}>
                                      <Wrench className="w-5 h-5" />
                                    </div>
                                    <div>
                                      <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${urgentColor.text}`}>Recommended Action</p>
                                      <p className="text-lg font-semibold text-slate-900 leading-relaxed">{primary.recommendedAction}</p>
                                    </div>
                                  </div>
                                </div>
                              </LockedSection>
                            </motion.div>

                            {/* Blurred risk note */}
                            {primary.riskNote && (
                              <motion.div variants={fadeUp}>
                                <LockedSection label="Risk if Ignored">
                                  <div className="rounded-2xl p-5 bg-amber-50 border border-amber-200 flex gap-3" data-testid="risk-note">
                                    <TriangleAlert className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                      <p className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-1">Risk if Ignored</p>
                                      <p className="text-sm font-medium text-amber-900 leading-snug">{primary.riskNote}</p>
                                    </div>
                                  </div>
                                </LockedSection>
                              </motion.div>
                            )}

                            {/* Blurred alternatives */}
                            {alternatives.length > 0 && (
                              <motion.div variants={fadeUp}>
                                <LockedSection label="Alternative Diagnoses">
                                  <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
                                    <div className="flex items-center gap-2 mb-3">
                                      <Activity className="w-4 h-4 text-slate-400" />
                                      <h4 className="text-sm font-bold text-slate-700 uppercase tracking-widest">Also Consider — {alternatives.length} Alternative{alternatives.length > 1 ? "s" : ""}</h4>
                                    </div>
                                    <div className="space-y-2">
                                      {alternatives.map((alt) => (
                                        <div key={alt.id} className="flex items-center justify-between px-4 py-3 rounded-lg bg-slate-50 border border-slate-100">
                                          <span className="text-sm font-bold text-slate-800">{alt.title}</span>
                                          <span className="text-xs font-bold text-slate-500">{alt.confidencePercent}%</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </LockedSection>
                              </motion.div>
                            )}

                            {/* Blurred history */}
                            <motion.div variants={fadeUp}>
                              <LockedSection label="Diagnosis History">
                                <div className="pt-4 border-t border-slate-200">
                                  <div className="flex items-center gap-2 mb-4">
                                    <History className="w-5 h-5 text-slate-400" />
                                    <h3 className="text-base font-bold text-slate-900">Recent Diagnoses</h3>
                                  </div>
                                  <div className="grid sm:grid-cols-2 gap-3">
                                    {[1, 2, 3, 4].map((i) => (
                                      <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                        <div className="h-4 bg-slate-200 rounded mb-2 w-3/4" />
                                        <div className="h-3 bg-slate-100 rounded w-full" />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </LockedSection>
                            </motion.div>

                            {/* Upgrade Overlay */}
                            <motion.div variants={fadeUp}>
                              {!upsellDismissed && (
                                <UpgradeOverlay diagCount={diagCount} onUpgrade={openModal} onDismiss={handleUpsellDismiss} />
                              )}
                            </motion.div>
                          </>
                        )}

                      </motion.div>
                    );
                  })()}

                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="bg-slate-950 border-t border-slate-800/60 text-slate-400">

        {/* Main grid */}
        <div className="container max-w-7xl mx-auto px-5 sm:px-8 pt-14 pb-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">

            {/* ── Col 1: Brand ── */}
            <div className="sm:col-span-2 lg:col-span-1 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-900/40">
                  <ThermometerSnowflake className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="text-base font-extrabold text-white tracking-tight block leading-none">UnitDown AI</span>
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mt-0.5 block">Commercial HVAC Intelligence</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
                AI diagnostics, equipment records, service history, reminders, and field management built for commercial HVAC professionals.
              </p>
              {isPro && (
                <span className="inline-flex items-center gap-2 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 rounded-full pl-1.5 pr-3 py-1" data-testid="footer-pro-badge">
                  <img src="/brand/unitdown-pro-logo.png" alt="UnitDown Pro" className="w-5 h-5 rounded-sm object-cover flex-shrink-0" />
                  Active Pro Member
                </span>
              )}
              <div className="pt-1">
                <a
                  href="https://apps.apple.com/app/id6767750626"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-blue-400 transition-colors"
                  aria-label="Download on the App Store"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  Also available on iPhone
                </a>
              </div>
            </div>

            {/* ── Col 2: Platform ── */}
            <div className="space-y-4">
              <h3 className="text-[11px] font-extrabold text-slate-300 uppercase tracking-widest">Platform</h3>
              <nav className="space-y-2.5" aria-label="Platform links">
                {[
                  { label: "AI Diagnostics",        action: () => navigate("/diagnose") },
                  { label: "Field Hub",              action: () => navigate("/records") },
                  { label: "Equipment Records",      action: () => navigate("/records") },
                  { label: "Diagnostic History",     action: () => navigate("/account") },
                  { label: "Service Reminders",      action: () => navigate("/records") },
                  { label: "Equipment Timeline",     action: () => navigate("/records") },
                  { label: "Nameplate Scanner",      action: () => navigate("/records") },
                  { label: "Resolution Library",     action: () => navigate("/") },
                ].map(({ label, action }) => (
                  <button
                    key={label}
                    onClick={action}
                    className="block text-sm text-slate-500 hover:text-blue-400 transition-colors text-left w-full leading-snug"
                  >
                    {label}
                  </button>
                ))}
              </nav>
            </div>

            {/* ── Col 3: Resources ── */}
            <div className="space-y-4">
              <h3 className="text-[11px] font-extrabold text-slate-300 uppercase tracking-widest">Resources</h3>
              <nav className="space-y-2.5" aria-label="Resources links">
                <button onClick={() => navigate("/")} className="block text-sm text-slate-500 hover:text-blue-400 transition-colors text-left w-full">Guides</button>
                <button onClick={() => navigate("/privacy")} className="block text-sm text-slate-500 hover:text-blue-400 transition-colors text-left w-full">Privacy Policy</button>
                <button onClick={() => navigate("/terms")} className="block text-sm text-slate-500 hover:text-blue-400 transition-colors text-left w-full">Terms of Service</button>
                <a href="mailto:unitdownsupport@gmail.com" className="block text-sm text-slate-500 hover:text-blue-400 transition-colors">Contact</a>
                <a href="mailto:unitdownsupport@gmail.com?subject=Support%20Request" className="block text-sm text-slate-500 hover:text-blue-400 transition-colors">Support</a>
                <a href="mailto:unitdownsupport@gmail.com?subject=Bad%20Diagnosis%20Report" className="block text-sm text-slate-500 hover:text-blue-400 transition-colors">Report a Bug</a>
                <button onClick={() => navigate("/")} className="block text-sm text-slate-500 hover:text-blue-400 transition-colors text-left w-full">Release Notes</button>
              </nav>
            </div>

            {/* ── Col 4: Account + Version ── */}
            <div className="space-y-4">
              <h3 className="text-[11px] font-extrabold text-slate-300 uppercase tracking-widest">Account</h3>
              <nav className="space-y-2.5" aria-label="Account links">
                <button onClick={() => navigate("/account")} className="block text-sm text-slate-500 hover:text-blue-400 transition-colors text-left w-full">Profile</button>
                <button onClick={() => navigate("/account")} className="block text-sm text-slate-500 hover:text-blue-400 transition-colors text-left w-full">Subscription</button>
                <button onClick={() => navigate("/account")} className="block text-sm text-slate-500 hover:text-blue-400 transition-colors text-left w-full">Device Manager</button>
                <button onClick={() => navigate("/account")} className="block text-sm text-slate-500 hover:text-blue-400 transition-colors text-left w-full">Notifications</button>
                {clerkLoaded && clerkUser ? (
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-red-400 transition-colors"
                    data-testid="footer-logout"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                ) : (
                  <button onClick={() => navigate("/login")} className="block text-sm text-slate-500 hover:text-blue-400 transition-colors text-left w-full">Sign In</button>
                )}
              </nav>

              {/* Version block */}
              <div className="pt-4 mt-2 border-t border-slate-800/60 space-y-1">
                <p className="text-[11px] font-bold text-slate-400">Version 2.0</p>
                <p className="text-[11px] text-slate-600">
                  Last updated{" "}
                  {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* ── Separator ── */}
        <div className="container max-w-7xl mx-auto px-5 sm:px-8">
          <div className="border-t border-slate-800/50" />
        </div>

        {/* ── Badge strip ── */}
        <div className="container max-w-7xl mx-auto px-5 sm:px-8 py-6">
          <div className="flex flex-wrap gap-2">
            {[
              "AI Diagnostics",
              "Field Hub",
              "Equipment Records",
              "Nameplate Scanner",
              "Service Reminders",
              "Diagnostic History",
              "Photo Notes",
              "Cross-Device Sync",
            ].map((badge) => (
              <span
                key={badge}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 bg-slate-900 border border-slate-800 rounded-full px-3 py-1"
              >
                <CheckCircle2 className="w-3 h-3 text-blue-500 flex-shrink-0" />
                {badge}
              </span>
            ))}
          </div>
        </div>

        {/* ── Separator ── */}
        <div className="container max-w-7xl mx-auto px-5 sm:px-8">
          <div className="border-t border-slate-800/50" />
        </div>

        {/* ── Bottom bar ── */}
        <div className="container max-w-7xl mx-auto px-5 sm:px-8 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-[11px] text-slate-600 leading-relaxed max-w-lg">
            For informational use only. Always verify diagnostics with a licensed HVAC technician before performing repairs.
            Not liable for any damages resulting from use of this tool.
          </p>
          <div className="flex items-center gap-4 flex-shrink-0">
            <span className="text-[11px] font-semibold text-slate-500">
              Trusted by Commercial HVAC Technicians
            </span>
            <span className="text-[11px] text-slate-700">
              © {new Date().getFullYear()} UnitDown AI
            </span>
          </div>
        </div>

      </footer>
    </div>
  );
}

// ─── RootRoute ──────────────────────────────────────────────────────────────────
// Auth-aware entry: signed-in users land on /dashboard; guests see the public
// diagnostic landing page (Home). This lets the old Home continue serving its
// purpose as a marketing/diagnostic page for unauthenticated visitors.

function RootRoute() {
  const { isSignedIn, isLoaded } = useUser();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      navigate("/dashboard", { replace: true } as Parameters<typeof navigate>[1]);
    }
  }, [isLoaded, isSignedIn, navigate]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center animate-pulse">
          <ThermometerSnowflake className="w-5 h-5 text-white" />
        </div>
      </div>
    );
  }

  if (isSignedIn) {
    return null;
  }

  return <Home />;
}

// ─── App ────────────────────────────────────────────────────────────────────────

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <JobModeProvider>
            <Switch>
              <Route path="/" component={RootRoute} />
              <Route path="/dashboard" component={FieldHubDashboard} />
              <Route path="/diagnose" component={Home} />
              <Route path="/pricing" component={PricingPage} />
              <Route path="/admin" component={AdminView} />
              <Route path="/terms" component={TermsPage} />
              <Route path="/privacy" component={PrivacyPage} />
              <Route path="/legal" component={LegalPage} />
              <Route path="/login" component={LoginPage} />
              <Route path="/signup" component={SignupPage} />
              <Route path="/sso-callback" component={SsoCallbackPage} />
              <Route path="/guides" component={TroubleshootingHub} />
              <Route path="/guides/:slug" component={SeoPage} />
              <Route path="/brand-guides" component={BrandHub} />
              <Route path="/brand-guides/:slug" component={BrandPage} />
              <Route path="/sponsor" component={SponsorPage} />
              <Route path="/account" component={AccountPage} />
              <Route path="/records" component={RecordsPage} />
              <Route path="/records/new" component={UnitFormPage} />
              <Route path="/records/:id/edit" component={UnitFormPage} />
              <Route path="/records/:id" component={UnitDetailPage} />
              <Route path="/logs/:id" component={DiagnosticLogDetailPage} />
              {/* Dev-only routes — excluded from production builds */}
              {import.meta.env.DEV && <Route path="/dev/equipment-preview" component={DevEquipmentPreview} />}
              {import.meta.env.DEV && <Route path="/jobmode-prototype" component={JobModePrototype} />}
              {import.meta.env.DEV && <Route path="/job-preview/record" component={DevJobRecordPreview} />}
              {import.meta.env.DEV && <Route path="/job-preview" component={DevJobPreview} />}
              {/* ── Job Mode ── */}
              <Route path="/job">
                <JobModePage />
              </Route>
              <Route path="/job/:id/record">
                {(params) => <ServiceRecordPage jobId={params.id} />}
              </Route>
              <Route path="/job/:id">
                {(params) => <JobModePage jobId={params.id} />}
              </Route>
              <Route path="*">
                <NotFound />
              </Route>
            </Switch>
            <ActiveJobBanner />
          </JobModeProvider>
        </WouterRouter>
        <Toaster />
        <InstallPromptBanner />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
