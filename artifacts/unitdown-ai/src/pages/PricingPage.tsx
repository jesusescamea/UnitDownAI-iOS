/**
 * PricingPage — UnitDown 2.0 subscription plans
 * Route: /pricing
 *
 * On iOS: uses Apple IAP (InAppPurchase) flow.
 * On web: navigates to /account where Stripe management lives.
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { useUser } from "@clerk/clerk-react";
import {
  ThermometerSnowflake,
  Check,
  Sparkles,
  ArrowLeft,
  Wrench,
  Building2,
  Briefcase,
  Star,
  Shield,
  FileText,
} from "lucide-react";
import { shouldUseAppleIAP } from "@/lib/platform";
import { purchasePro } from "@/lib/appleIAP";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const FREE_FEATURES = [
  "4 free diagnostics",
  "HVAC troubleshooting engine",
  "Basic symptom analysis",
];

const PRO_FEATURES = [
  "Unlimited diagnostics",
  "Field Hub dashboard",
  "Equipment records & history",
  "Job Mode with offline support",
  "Voice notes + measurements",
  "Service record generation",
  "Nameplate OCR scanner",
  "Scheduled job tracking",
  "Multi-site equipment management",
  "Priority diagnostic engine",
];

export default function PricingPage() {
  const [, navigate] = useLocation();
  const { user: clerkUser, isLoaded } = useUser();
  const { toast } = useToast();
  const [purchasing, setPurchasing] = useState(false);
  const useIAP = shouldUseAppleIAP();

  async function handleGetPro() {
    if (useIAP) {
      setPurchasing(true);
      try {
        const result = await purchasePro();
        if (result.success) {
          toast({ title: "Welcome to Pro!", description: "Your subscription is now active." });
          navigate("/dashboard");
        } else if (result.cancelled) {
          // user cancelled — no error
        } else {
          toast({ title: "Purchase failed", description: result.error ?? "Please try again.", variant: "destructive" });
        }
      } catch {
        toast({ title: "Purchase failed", description: "Please try again.", variant: "destructive" });
      } finally {
        setPurchasing(false);
      }
    } else {
      // Web: send to account page where Stripe billing portal is
      navigate("/account");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate(isLoaded && clerkUser ? "/dashboard" : "/")}
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

      <main className="max-w-3xl mx-auto px-4 py-10 space-y-8">

        {/* ── Hero ────────────────────────────────────────────────────────────── */}
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-full mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            UnitDown Pro
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            The full HVAC field platform
          </h1>
          <p className="text-slate-500 mt-2 max-w-md mx-auto text-sm leading-relaxed">
            From first diagnosis to completed service record. Everything a commercial HVAC technician needs in the field.
          </p>
        </div>

        {/* ── Plan cards ──────────────────────────────────────────────────────── */}
        <div className="grid sm:grid-cols-2 gap-4">

          {/* Free */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col">
            <div className="mb-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Free</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-slate-900">$0</span>
                <span className="text-sm text-slate-500 font-medium">/month</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Get started with basic diagnostics</p>
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

          {/* Pro */}
          <div className="bg-blue-600 rounded-2xl border border-blue-600 p-6 flex flex-col shadow-lg shadow-blue-600/20">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs font-bold text-blue-200 uppercase tracking-widest">Pro</p>
                <span className="text-[10px] font-bold bg-white/20 text-white rounded px-1.5 py-0.5">
                  Most Popular
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-white">$29</span>
                <span className="text-sm text-blue-200 font-medium">/month</span>
              </div>
              <p className="text-xs text-blue-200 mt-1">Everything for field technicians</p>
            </div>
            <ul className="space-y-2.5 flex-1 mb-6">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-white">
                  <Check className="w-4 h-4 text-blue-300 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Button
              className="w-full bg-white text-blue-700 hover:bg-blue-50 font-bold shadow-sm"
              onClick={handleGetPro}
              disabled={purchasing}
            >
              {purchasing ? "Processing…" : (
                <>
                  <Sparkles className="w-4 h-4 mr-1.5" />
                  Get Pro
                </>
              )}
            </Button>
          </div>

        </div>

        {/* ── Feature highlights ───────────────────────────────────────────────── */}
        <div>
          <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest mb-5">
            What Pro includes
          </p>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              {
                icon: Wrench,
                title: "Full Field Hub",
                desc: "Dashboard, records, job mode, and schedule — all in one place.",
                color: "text-blue-600 bg-blue-50",
              },
              {
                icon: Building2,
                title: "Equipment Memory",
                desc: "Every unit's complete history, photos, and measurements — always accessible.",
                color: "text-emerald-600 bg-emerald-50",
              },
              {
                icon: Briefcase,
                title: "Job Mode",
                desc: "Offline-first job tracking with voice notes, measurements, and service records.",
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
                title: "Priority Engine",
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

        {/* ── Trust notes ─────────────────────────────────────────────────────── */}
        <div className="text-center space-y-1.5">
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
