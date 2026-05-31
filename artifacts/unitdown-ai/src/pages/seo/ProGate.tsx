import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Lock, CheckCircle2, Loader2, ArrowRight, RotateCcw } from "lucide-react";
import { useUser } from "@clerk/clerk-react";
import { purchasePro, restorePurchases, checkIAPSubscriptionActive } from "@/lib/appleIAP";
import { isDemoProEmail } from "@/lib/demoAccess";
import { isDemoSessionActive } from "@/lib/demoSession";

// Must match the key used by App.tsx's saveIsProCached("1" / "0")
const PRO_KEY = "unitdown_is_pro";
const CLIENT_ID_KEY = "unitdown_client_id";

interface ProGateProps {
  children: React.ReactNode;
  previewTitle?: string;
}

export default function ProGate({ children, previewTitle }: ProGateProps) {
  const { user, isLoaded } = useUser();

  // Initialise from localStorage immediately so returning Pro users never see
  // the paywall even for a frame. App.tsx saves "1" via saveIsProCached — the
  // previous check for "true" was the primary bug: they never matched.
  const [isPro, setIsPro] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    if (checkIAPSubscriptionActive()) return true;
    return localStorage.getItem(PRO_KEY) === "1";
  });

  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // Apple IAP active-subscription check (runs once on mount).
  useEffect(() => {
    if (checkIAPSubscriptionActive()) {
      localStorage.setItem(PRO_KEY, "1");
      setIsPro(true);
    }
  }, []);

  // Server-side Pro verification — mirrors App.tsx's refreshUsageStatus.
  // Runs on mount and again when Clerk finishes loading so both the
  // cached-localStorage path and the Clerk-loaded path are covered.
  //
  // Why this is needed:
  //   • localStorage fix handles returning users who already have "1" cached.
  //   • This useEffect handles first-visit or when Clerk errors caused the
  //     cache to be absent. It passes testerEmail so the server's tester
  //     whitelist fires for unitdownsupport@gmail.com regardless of Stripe/IAP.
  useEffect(() => {
    if (isPro) return; // already unlocked — no need to query

    const email = user?.primaryEmailAddress?.emailAddress ?? undefined;
    // Prefer the Clerk user ID; fall back to whatever is stored in localStorage
    // (App.tsx writes the Clerk ID there on sign-in, so it survives page loads).
    const clientId: string =
      user?.id ?? localStorage.getItem(CLIENT_ID_KEY) ?? "";

    if (!clientId) return;

    const params = new URLSearchParams({ clientId });
    if (email) params.set("testerEmail", email);

    fetch(`/api/usage/status?${params.toString()}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d: { isPro: boolean }) => {
        if (d.isPro) {
          setIsPro(true);
          localStorage.setItem(PRO_KEY, "1");
        }
      })
      .catch(() => {/* network error — leave current state */});
  // Re-run when Clerk transitions from loading → loaded so the email is
  // available on the first successful load after sign-in.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);

  // While Clerk is still initialising, show a neutral spinner.
  // Never show the paywall during the loading phase — it would appear for
  // Pro/demo users whose Clerk session hasn't resolved yet.
  if (!isLoaded && !isPro) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-7 h-7 text-blue-400 animate-spin" />
      </div>
    );
  }

  // APPLE REVIEW — local demo session bypass (no Clerk required).
  // isDemoSessionActive() reads from sessionStorage — set by login.tsx when the
  // reviewer enters unitdownsupport@gmail.com and clicks Continue.
  if (isDemoSessionActive()) {
    return <>{children}</>;
  }

  // Clerk-based demo check (works when Clerk loads the signed-in user).
  const email = user?.primaryEmailAddress?.emailAddress;
  if (isDemoProEmail(email) || isPro) {
    return <>{children}</>;
  }

  async function handleSubscribe() {
    setLoading(true);
    setError(null);
    setMsg(null);
    const result = await purchasePro();
    if (result.success) {
      localStorage.setItem(PRO_KEY, "1");
      setIsPro(true);
    } else if (!result.cancelled) {
      setError(result.error ?? "Purchase failed. Please try again.");
    }
    setLoading(false);
  }

  async function handleRestore() {
    setRestoring(true);
    setError(null);
    setMsg(null);
    const result = await restorePurchases();
    if (result.restoredProductIds.length > 0) {
      localStorage.setItem(PRO_KEY, "1");
      setIsPro(true);
      setMsg("Subscription restored successfully.");
    } else if (result.success) {
      setMsg("No active subscription found. Subscribe to unlock access.");
    } else {
      setError(result.error ?? "Restore failed. Please try again.");
    }
    setRestoring(false);
  }

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg">
        {previewTitle && (
          <p className="text-center text-sm text-gray-400 mb-3 font-medium">
            {previewTitle}
          </p>
        )}

        <div className="bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-br from-slate-900 to-blue-950 p-8 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-500/20 border border-blue-400/30 mb-4">
              <Lock className="w-6 h-6 text-blue-300" />
            </div>
            <h2 className="text-2xl font-extrabold text-white mb-2">
              Unlock Full HVAC Knowledge Library
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              Pro members get instant access to every guide, brand-specific fault page, and field workflow.
            </p>
          </div>

          <div className="p-6">
            <ul className="space-y-2.5 mb-6">
              {[
                "Troubleshooting guides",
                "Brand-specific fault pages",
                "Meter checks & reference values",
                "Lockout causes & reset steps",
                "Field workflows",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm text-gray-700">
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>

            {error && (
              <p className="text-red-600 text-sm mb-4 text-center">{error}</p>
            )}
            {msg && (
              <p className="text-slate-600 text-sm mb-4 text-center">{msg}</p>
            )}

            <div className="space-y-3">
              <button
                onClick={handleSubscribe}
                disabled={loading || restoring}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
                Subscribe with Apple
              </button>

              <button
                onClick={handleRestore}
                disabled={loading || restoring}
                className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 text-slate-700 font-semibold py-2.5 rounded-xl transition-colors text-sm"
              >
                {restoring ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RotateCcw className="w-4 h-4" />
                )}
                Restore Purchases
              </button>
            </div>

            <p className="text-center text-xs text-gray-400 mt-4">
              Already subscribed?{" "}
              <Link href="/" className="text-blue-600 hover:underline">
                Return to UnitDown AI
              </Link>{" "}
              and tap Restore Purchases.
            </p>
            <p className="text-center text-xs text-gray-400 mt-2">
              Cancel anytime in Apple Settings
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
