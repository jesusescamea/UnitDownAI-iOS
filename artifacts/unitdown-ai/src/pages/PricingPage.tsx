/**
 * PricingPage — UnitDown Field OS subscription plans
 * Route: /pricing
 *
 * On iOS: uses Apple IAP (InAppPurchase) flow.
 * On web: navigates to /account where Stripe management lives.
 *
 * Tiers: Free · Pro Technician ($14.99/mo) · Annual Pro ($149/yr) · Enterprise (Contact Sales)
 * Promo: Founding Member ($9.99/mo for life, first 500 subscribers)
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { useClerkTimeout } from "@/hooks/useClerkTimeout";
import {
  ThermometerSnowflake,
  Check,
  Sparkles,
  ArrowLeft,
  Wrench,
  Building2,
  Star,
  Shield,
  FileText,
  Zap,
  Mail,
  Infinity,
  CalendarDays,
  X,
} from "lucide-react";
import { shouldUseAppleIAP } from "@/lib/platform";
import { purchasePro } from "@/lib/appleIAP";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AppNav } from "@/components/AppNav";

const FREE_FEATURES = [
  "5 AI diagnostics/month",
  "Unlimited HVAC guides",
  "Nameplate scanning",
  "Save up to 5 equipment records",
  "Basic service records",
  "Equipment history for saved units",
];

const PRO_FEATURES = [
  "Unlimited AI diagnostics",
  "Full Equipment Memory",
  "Unlimited service records",
  "Job Mode",
  "Offline Mode",
  "Nameplate OCR",
  "Equipment history",
  "AI Assistant",
  "Parts & Van Inventory",
  "Brand-specific guides",
  "Scheduled jobs & follow-ups",
  "Equipment Intelligence",
  "All future Pro features",
];

const ENTERPRISE_FEATURES = [
  "Unlimited technicians",
  "API integrations",
  "Fleet management",
  "Custom onboarding",
  "Priority support",
];

const COMPARISON_ROWS = [
  { label: "AI Diagnostics",       free: "5/month",    pro: "Unlimited" },
  { label: "HVAC Guides",          free: "Unlimited",  pro: "Unlimited" },
  { label: "Nameplate Scan",       free: true,         pro: true        },
  { label: "Equipment Records",    free: "5 units",    pro: "Unlimited" },
  { label: "Service Records",      free: "Basic",      pro: "Unlimited" },
  { label: "Job Mode",             free: false,        pro: true        },
  { label: "Offline Mode",         free: false,        pro: true        },
  { label: "Equipment Memory",     free: false,        pro: "Full"      },
  { label: "AI Assistant",         free: false,        pro: true        },
  { label: "Van Inventory",        free: false,        pro: true        },
  { label: "Equipment Intelligence",free: false,       pro: true        },
  { label: "Brand-specific Guides",free: false,        pro: true        },
];

function CellValue({ val }: { val: string | boolean }) {
  if (val === true) return <Check className="w-4 h-4 text-blue-500 mx-auto" />;
  if (val === false) return <X className="w-3.5 h-3.5 text-slate-300 mx-auto" />;
  return <span className="text-xs font-semibold text-slate-700">{val}</span>;
}

export default function PricingPage() {
  const [, navigate] = useLocation();
  const { user: clerkUser, isLoaded: clerkIsLoaded, timedOut: clerkTimedOut } = useClerkTimeout(3_000);
  // Treat a Clerk timeout as "loaded but signed out" so the guest pricing page
  // always renders within a few seconds even when Clerk's CDN is unreachable.
  const isLoaded = clerkIsLoaded || clerkTimedOut;
  const { toast } = useToast();
  const [purchasing, setPurchasing] = useState(false);
  const useIAP = shouldUseAppleIAP();

  async function handleUpgradePro() {
    if (useIAP) {
      setPurchasing(true);
      try {
        const result = await purchasePro();
        if (result.success) {
          toast({ title: "Welcome to Pro!", description: "Your subscription is now active." });
          navigate("/dashboard");
        } else if (result.cancelled) {
          // user cancelled — no toast
        } else {
          toast({ title: "Purchase failed", description: result.error ?? "Please try again.", variant: "destructive" });
        }
      } catch {
        toast({ title: "Purchase failed", description: "Please try again.", variant: "destructive" });
      } finally {
        setPurchasing(false);
      }
    } else {
      navigate("/account");
    }
  }

  function handleContactSales() {
    window.location.href = "mailto:unitdownsupport@gmail.com?subject=Enterprise%20Inquiry";
  }

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      {isLoaded && clerkUser ? (
        <AppNav />
      ) : (
        <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
          <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center">
                <ThermometerSnowflake className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-extrabold text-slate-900 tracking-tight">UnitDown</span>
            </div>
          </div>
        </header>
      )}

      <main className="max-w-4xl mx-auto px-4 py-10 space-y-10">

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-full mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            UnitDown Pro
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            The HVAC Field Platform
          </h1>
          <p className="text-slate-500 mt-2 max-w-lg mx-auto text-sm leading-relaxed">
            From first diagnosis to completed service record. Built for commercial HVAC technicians who need to move fast and document everything.
          </p>
        </div>

        {/* ── Plan Cards ───────────────────────────────────────────────────── */}
        <div className="grid sm:grid-cols-2 gap-4">

          {/* Free */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col">
            <div className="mb-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Free</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-slate-900">$0</span>
                <span className="text-sm text-slate-500 font-medium">/month</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Get started — no credit card required</p>
            </div>
            <ul className="space-y-2.5 flex-1 mb-6">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-slate-700">
                  <Check className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Button
              variant="outline"
              className="w-full font-semibold"
              onClick={() => navigate(isLoaded && clerkUser ? "/diagnose" : "/")}
            >
              Start Free
            </Button>
          </div>

          {/* Pro Technician column — Founding Member ribbon + Pro card */}
          <div className="flex flex-col gap-3">

            {/* ── Founding Member Promo ── */}
            <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-blue-950 to-slate-900 px-5 py-4 relative overflow-hidden">
              {/* Subtle gold shimmer strip */}
              <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-amber-400/0 via-amber-400 to-amber-400/0" />
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span className="text-xs font-extrabold text-amber-400 uppercase tracking-widest">Founding Member</span>
                  </div>
                  <p className="text-sm font-bold text-white leading-snug">
                    Lock in Pro for only{" "}
                    <span className="text-amber-300">$9.99/month for life.</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Limited to the first 500 subscribers. The standard Pro plan is $14.99/month.
                  </p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <div className="text-2xl font-black text-white">$9.99</div>
                  <div className="text-[10px] text-slate-400 font-semibold">/month forever</div>
                </div>
              </div>
              <Button
                className="w-full mt-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold h-9 rounded-lg text-sm shadow-sm"
                onClick={handleUpgradePro}
                disabled={purchasing}
              >
                {purchasing ? "Processing…" : (
                  <>
                    <Star className="w-3.5 h-3.5 mr-1.5 fill-slate-950" />
                    Claim Founding Member Price
                  </>
                )}
              </Button>
            </div>

            {/* ── Pro Technician Card ── */}
            <div className="bg-blue-600 rounded-2xl border border-blue-600 p-6 flex flex-col shadow-lg shadow-blue-600/20 flex-1">
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-xs font-bold text-blue-200 uppercase tracking-widest">Pro Technician</p>
                  <span className="text-[10px] font-bold bg-white/20 text-white rounded px-1.5 py-0.5">
                    Most Popular
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-white">$14.99</span>
                  <span className="text-sm text-blue-200 font-medium">/month</span>
                </div>
                <p className="text-xs text-blue-200 mt-1">Everything for field technicians</p>
              </div>
              <ul className="space-y-2 flex-1 mb-6">
                {PRO_FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-white">
                    <Check className="w-4 h-4 text-blue-300 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full bg-white text-blue-700 hover:bg-blue-50 font-bold shadow-sm"
                onClick={handleUpgradePro}
                disabled={purchasing}
              >
                {purchasing ? "Processing…" : (
                  <>
                    <Sparkles className="w-4 h-4 mr-1.5" />
                    Upgrade to Pro
                  </>
                )}
              </Button>
            </div>
          </div>

        </div>

        {/* ── Annual + Enterprise Row ───────────────────────────────────────── */}
        <div className="grid sm:grid-cols-2 gap-4">

          {/* Annual Pro */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Annual Pro</p>
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-emerald-100 text-emerald-700 rounded px-1.5 py-0.5">
                  <Zap className="w-2.5 h-2.5" />
                  Save over 2 months
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-slate-900">$149</span>
                <span className="text-sm text-slate-500 font-medium">/year</span>
              </div>
              <p className="text-xs text-slate-400 mt-1 line-through">$179.88/year at monthly rate</p>
            </div>
            <ul className="space-y-2.5 flex-1 mb-6">
              <li className="flex items-center gap-2 text-sm text-slate-700">
                <Infinity className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                Everything in Pro Technician
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-700">
                <CalendarDays className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                One annual payment — no monthly billing
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-700">
                <Shield className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                Price locked for the year
              </li>
            </ul>
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm"
              onClick={handleUpgradePro}
              disabled={purchasing}
            >
              {purchasing ? "Processing…" : (
                <>
                  <CalendarDays className="w-4 h-4 mr-1.5" />
                  Save with Annual
                </>
              )}
            </Button>
          </div>

          {/* Enterprise */}
          <div className="bg-slate-900 rounded-2xl border border-slate-700 p-6 flex flex-col">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Enterprise</p>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-extrabold text-white">Contact Sales</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">Custom pricing for your team</p>
            </div>
            <ul className="space-y-2.5 flex-1 mb-6">
              {ENTERPRISE_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                  <Check className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Button
              variant="outline"
              className="w-full border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white font-semibold"
              onClick={handleContactSales}
            >
              <Mail className="w-4 h-4 mr-1.5" />
              Contact Sales
            </Button>
          </div>

        </div>

        {/* ── Feature Comparison ───────────────────────────────────────────── */}
        <div>
          <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest mb-5">
            Free vs Pro
          </p>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Feature</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wide w-24">Free</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-blue-600 uppercase tracking-wide w-24 bg-blue-50/60">Pro</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map(({ label, free, pro }, i) => (
                  <tr key={label} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                    <td className="px-5 py-3 font-medium text-slate-700">{label}</td>
                    <td className="px-4 py-3 text-center"><CellValue val={free} /></td>
                    <td className="px-4 py-3 text-center bg-blue-50/30"><CellValue val={pro} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Feature Highlights ───────────────────────────────────────────── */}
        <div>
          <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest mb-5">
            What Pro includes
          </p>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              {
                icon: Wrench,
                title: "Job Mode",
                desc: "Offline-first job tracking with voice notes, measurements, and service records.",
                color: "text-blue-600 bg-blue-50",
              },
              {
                icon: Building2,
                title: "Equipment Memory",
                desc: "Every unit's complete history, photos, and measurements — always accessible.",
                color: "text-emerald-600 bg-emerald-50",
              },
              {
                icon: Zap,
                title: "Equipment Intelligence",
                desc: "AI-powered pattern detection across your equipment fleet.",
                color: "text-violet-600 bg-violet-50",
              },
              {
                icon: Star,
                title: "Nameplate OCR",
                desc: "Scan equipment nameplates instantly — model, serial, refrigerant auto-filled.",
                color: "text-orange-600 bg-orange-50",
              },
              {
                icon: FileText,
                title: "Service Records",
                desc: "Professional service records with timelines, parts, and recommendations.",
                color: "text-rose-600 bg-rose-50",
              },
              {
                icon: Shield,
                title: "AI Assistant",
                desc: "Full diagnostic engine with contradiction detection and ranked alternatives.",
                color: "text-slate-600 bg-slate-100",
              },
            ].map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <p className="text-sm font-bold text-slate-900 mb-1">{title}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Trust / Legal ────────────────────────────────────────────────── */}
        <div className="text-center space-y-1.5 pb-4">
          {useIAP ? (
            <>
              <p className="text-xs text-slate-400">
                Subscription managed through your Apple ID. Cancel any time in Settings → Subscriptions.
              </p>
              <p className="text-xs text-slate-400">
                Already subscribed?{" "}
                <button
                  onClick={() => navigate("/account")}
                  className="text-blue-600 hover:underline font-semibold"
                >
                  Restore purchases in Account
                </button>
              </p>
            </>
          ) : (
            <p className="text-xs text-slate-400">
              Subscription managed by Stripe. Cancel any time from your{" "}
              <button
                onClick={() => navigate("/account")}
                className="text-blue-600 hover:underline font-semibold"
              >
                account settings
              </button>
              .
            </p>
          )}
        </div>

      </main>
    </div>
  );
}
