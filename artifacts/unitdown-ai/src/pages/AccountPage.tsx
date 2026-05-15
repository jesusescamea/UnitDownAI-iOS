import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useUser, useClerk, useSignIn } from "@clerk/clerk-react";
import { shouldUseAppleIAP, isIOS } from "@/lib/platform";
import { checkIAPSubscriptionActive, restorePurchases, IAP_PRODUCT_ID } from "@/lib/appleIAP";
import {
  ChevronLeft,
  ChevronRight,
  User,
  Calendar,
  CheckCircle2,
  Sparkles,
  History,
  Search,
  Settings,
  Lock,
  HelpCircle,
  AlertTriangle,
  LogOut,
  ExternalLink,
  Wrench,
  Crown,
  Eye,
  EyeOff,
  MessageSquare,
  Flag,
  ThumbsUp,
  FileText,
  MailCheck,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DiagnosisEntry {
  id: string;
  title: string;
  category: string;
  confidencePercent: number;
  priorityLevel: string;
}

interface HistoryEntry {
  id: string;
  symptoms: string;
  result: { primary: DiagnosisEntry; isPro: boolean };
  timestamp: number;
}

interface Prefs {
  terminologyMode: "beginner" | "technician" | "advanced";
  darkMode: boolean;
}

// ── Storage helpers ────────────────────────────────────────────────────────────

const HISTORY_KEY = "unitdown_history";
const CLIENT_ID_KEY = "unitdown_client_id";
const PRO_KEY = "unitdown_is_pro";
const PREFS_KEY = "unitdown_prefs";

function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? (JSON.parse(raw) as Prefs) : { terminologyMode: "technician", darkMode: false };
  } catch {
    return { terminologyMode: "technician", darkMode: false };
  }
}

function savePrefs(p: Prefs) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch {}
}

// ── Section card component ─────────────────────────────────────────────────────

function Section({
  title,
  icon: Icon,
  danger = false,
  children,
}: {
  title: string;
  icon: React.ElementType;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl border overflow-hidden bg-white ${danger ? "border-red-200" : "border-slate-200"}`}>
      <div className={`border-b px-5 py-4 flex items-center gap-2 ${danger ? "bg-red-50 border-red-100" : "bg-slate-50 border-slate-100"}`}>
        <Icon className={`w-4 h-4 ${danger ? "text-red-500" : "text-blue-600"}`} />
        <h2 className={`text-sm font-bold uppercase tracking-wider ${danger ? "text-red-700" : "text-slate-700"}`}>{title}</h2>
      </div>
      <div className="px-5 py-5">{children}</div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function AccountPage() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const { signIn, isLoaded: signInLoaded } = useSignIn();
  const [, navigate] = useLocation();

  const isGuest = !user;
  const email = user?.primaryEmailAddress?.emailAddress || "";
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long" })
    : null;

  // Subscription
  const [isPro, setIsPro] = useState(false);
  const [iapRestoring, setIapRestoring] = useState(false);
  const [iapMsg, setIapMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Profile settings
  const [displayName, setDisplayName] = useState("");
  const [nameLoading, setNameLoading] = useState(false);
  const [nameMsg, setNameMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Password change
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // History
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historySearch, setHistorySearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Preferences
  const [prefs, setPrefs] = useState<Prefs>({ terminologyMode: "technician", darkMode: false });

  // Password reset email
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Delete account
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    document.title = "Account — UnitDown AI";
    setHistory(loadHistory());
    setPrefs(loadPrefs());

    const clientId = localStorage.getItem(CLIENT_ID_KEY) || "";
    try { if (localStorage.getItem(PRO_KEY) === "1") setIsPro(true); } catch {}

    if (shouldUseAppleIAP()) {
      // iOS: read the in-memory IAP subscription cache (populated by
      // purchasePro() or the explicit Restore Purchases flow — never
      // triggers a silent Apple authentication prompt).
      const active = checkIAPSubscriptionActive();
      if (active) {
        setIsPro(true);
        try { localStorage.setItem(PRO_KEY, "1"); } catch {}
      }
    }

    return () => { document.title = "UnitDown AI — HVAC Diagnostics"; };
  }, []);

  useEffect(() => {
    if (user) {
      setDisplayName(user.firstName || user.fullName?.split(" ")[0] || "");
    }
  }, [user]);

  const clientId = (() => {
    try { return localStorage.getItem(CLIENT_ID_KEY) || ""; } catch { return ""; }
  })();

  // ── Profile name save ──────────────────────────────────────────────────────

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setNameLoading(true);
    setNameMsg(null);
    try {
      await user.update({ firstName: displayName.trim() });
      setNameMsg({ ok: true, text: "Name updated successfully." });
    } catch (err) {
      setNameMsg({ ok: false, text: err instanceof Error ? err.message : "Failed to update name." });
    } finally {
      setNameLoading(false);
    }
  }

  // ── Password change ────────────────────────────────────────────────────────

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (newPw !== confirmPw) { setPwMsg({ ok: false, text: "New passwords do not match." }); return; }
    if (newPw.length < 8) { setPwMsg({ ok: false, text: "Password must be at least 8 characters." }); return; }
    setPwLoading(true);
    setPwMsg(null);
    try {
      await user.updatePassword({ currentPassword: currentPw, newPassword: newPw, signOutOfOtherSessions: false });
      setPwMsg({ ok: true, text: "Password updated successfully." });
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch (err) {
      setPwMsg({ ok: false, text: err instanceof Error ? err.message : "Failed to update password. If you signed in with Google, use 'Forgot Password' below to send a reset email." });
    } finally {
      setPwLoading(false);
    }
  }

  // ── Send password reset email ──────────────────────────────────────────────

  async function handleSendResetEmail() {
    if (!email || !signInLoaded || !signIn) return;
    setResetLoading(true);
    setResetMsg(null);
    try {
      await signIn.create({ strategy: "reset_password_email_code", identifier: email });
      setResetMsg({ ok: true, text: `Reset email sent to ${email} — check your inbox.` });
    } catch (err) {
      setResetMsg({ ok: false, text: err instanceof Error ? err.message : "Failed to send reset email. Try again or contact support." });
    } finally {
      setResetLoading(false);
    }
  }

  // ── Delete account ─────────────────────────────────────────────────────────

  async function handleDeleteAccount() {
    if (!user) return;
    setDeleteLoading(true);
    try {
      await user.delete();
      [HISTORY_KEY, CLIENT_ID_KEY, PRO_KEY, PREFS_KEY, "unitdown_free_diagnostics_used", "unitdown_leads"].forEach((k) => {
        try { localStorage.removeItem(k); } catch {}
      });
      navigate("/");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete account. Please contact unitdownsupport@gmail.com.");
    } finally {
      setDeleteLoading(false);
    }
  }

  // ── Sign out ───────────────────────────────────────────────────────────────

  async function handleLogout() {
    try { localStorage.removeItem(PRO_KEY); } catch {}
    await signOut({ redirectUrl: "/" });
  }

  // ── History replay ─────────────────────────────────────────────────────────

  function handleReplay(entry: HistoryEntry) {
    try { sessionStorage.setItem("unitdown_replay", JSON.stringify(entry)); } catch {}
    navigate("/");
  }

  // ── Preferences ───────────────────────────────────────────────────────────

  function updatePrefs(update: Partial<Prefs>) {
    setPrefs((prev) => {
      const next = { ...prev, ...update };
      savePrefs(next);
      return next;
    });
  }

  // ── Filtered history ──────────────────────────────────────────────────────

  const filteredHistory = historySearch.trim()
    ? history.filter(
        (h) =>
          h.symptoms.toLowerCase().includes(historySearch.toLowerCase()) ||
          h.result.primary.title.toLowerCase().includes(historySearch.toLowerCase())
      )
    : history;

  // ── Loading state ──────────────────────────────────────────────────────────

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans">

      {/* Sticky header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
            data-testid="account-back"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
          <span className="text-slate-200">|</span>
          <span className="text-sm font-bold text-slate-700">My Account</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-5">

        {/* ── Profile header card ── */}
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="bg-slate-900 px-5 py-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-600/30">
              <span className="text-xl font-extrabold text-white select-none">
                {isGuest
                  ? "G"
                  : (user?.firstName?.[0] || user?.primaryEmailAddress?.emailAddress?.[0] || "U").toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-extrabold text-white leading-tight">
                  {isGuest
                    ? "Guest User"
                    : (user?.fullName || user?.primaryEmailAddress?.emailAddress?.split("@")[0] || "User")}
                </h1>
                {isPro ? (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 bg-emerald-500/20 border border-emerald-400/30 rounded-full text-xs font-bold text-emerald-300">
                    <CheckCircle2 className="w-3 h-3" /> Pro
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 bg-white/10 border border-white/20 rounded-full text-xs font-semibold text-slate-400">
                    Free
                  </span>
                )}
              </div>
              {!isGuest && email && (
                <p className="text-sm text-slate-400 truncate mt-0.5">{email}</p>
              )}
              {isGuest && (
                <p className="text-sm text-slate-400 mt-0.5">Not signed in</p>
              )}
              {memberSince && (
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Member since {memberSince}
                </p>
              )}
            </div>
          </div>

          {/* Guest prompt banner */}
          {isGuest && (
            <div className="px-5 py-4 bg-blue-50 border-t border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-sm font-medium text-blue-800">
                Create a free account to save your diagnoses and access your history from any device.
              </p>
              <button
                onClick={() => navigate("/signup")}
                className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-colors"
                data-testid="account-create-btn"
              >
                Create Account →
              </button>
            </div>
          )}
        </div>

        {/* ── Subscription ── */}
        <Section title="Subscription" icon={Crown}>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-slate-800">{isPro ? "Pro Member" : "Free Plan"}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isPro
                    ? "Unlimited diagnostics, full ranked reports, and all Pro features."
                    : "Up to 4 free diagnostics. Upgrade for unlimited access."}
                </p>
              </div>
              <span
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${
                  isPro
                    ? "bg-emerald-100 border-emerald-200 text-emerald-700"
                    : "bg-slate-100 border-slate-200 text-slate-500"
                }`}
              >
                {isPro ? <><CheckCircle2 className="w-3.5 h-3.5" /> Active</> : "Free"}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-1 flex-wrap">
              {!isPro && (
                <button
                  onClick={() => {
                    navigate("/");
                    setTimeout(() => window.dispatchEvent(new CustomEvent("unitdown:upgrade")), 150);
                  }}
                  className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-colors"
                  data-testid="account-upgrade-btn"
                >
                  <Sparkles className="w-4 h-4" />
                  Upgrade to Pro
                </button>
              )}

              {/* On iOS: manage subscription via Apple Settings (App Store guidelines) */}
              {isPro && shouldUseAppleIAP() && (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Your subscription is managed by Apple. To cancel or change your plan, go to{" "}
                    <strong>Settings → Apple ID → Subscriptions</strong>.
                  </p>
                  <button
                    onClick={async () => {
                      setIapRestoring(true);
                      setIapMsg(null);
                      try {
                        const r = await restorePurchases();
                        if (r.restoredProductIds.includes(IAP_PRODUCT_ID)) {
                          setIapMsg({ ok: true, text: "Subscription verified and active." });
                        } else {
                          setIapMsg({ ok: false, text: "No active subscription found for this Apple ID." });
                        }
                      } catch {
                        setIapMsg({ ok: false, text: "Restore failed. Please try again." });
                      } finally {
                        setIapRestoring(false);
                      }
                    }}
                    disabled={iapRestoring}
                    className="flex items-center justify-center gap-2 border border-slate-200 hover:border-slate-300 bg-white text-slate-700 font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50"
                    data-testid="account-restore-btn"
                  >
                    <MailCheck className="w-4 h-4" />
                    {iapRestoring ? "Restoring…" : "Restore Purchases"}
                  </button>
                  {iapMsg && (
                    <p className={`text-xs font-semibold ${iapMsg.ok ? "text-emerald-600" : "text-red-600"}`}>
                      {iapMsg.text}
                    </p>
                  )}
                </div>
              )}

            </div>
          </div>
        </Section>

        {/* ── Saved Diagnostics ── */}
        <Section title="Saved Diagnostics" icon={History}>
          {isGuest ? (
            <div className="text-center py-8 space-y-3">
              <History className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-600">Sign in to view your diagnostic history.</p>
              <button
                onClick={() => navigate("/login")}
                className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors"
              >
                Sign in →
              </button>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <Wrench className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-500">No saved diagnostics yet.</p>
              <p className="text-xs text-slate-400">Run your first diagnosis on the home page.</p>
              <button
                onClick={() => navigate("/")}
                className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors"
              >
                Run a Diagnosis →
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder={`Search ${history.length} diagnosis${history.length !== 1 ? "es" : ""}…`}
                  className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  data-testid="history-search"
                />
              </div>

              {/* List */}
              <div className="space-y-2 max-h-96 overflow-y-auto pr-0.5">
                {filteredHistory.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-6">No results match your search.</p>
                ) : (
                  filteredHistory.map((entry) => (
                    <div key={entry.id} className="border border-slate-200 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-start gap-3"
                        data-testid={`history-entry-${entry.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate">{entry.result.primary.title}</p>
                          <p className="text-xs text-slate-500 truncate mt-0.5">{entry.symptoms}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            {new Date(entry.timestamp).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <ChevronRight
                          className={`w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5 transition-transform ${
                            expandedId === entry.id ? "rotate-90" : ""
                          }`}
                        />
                      </button>

                      {expandedId === entry.id && (
                        <div className="border-t border-slate-100 px-4 py-3 bg-slate-50 space-y-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                              {entry.result.primary.category}
                            </span>
                            <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                              {entry.result.primary.confidencePercent}% confidence
                            </span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                              entry.result.isPro
                                ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                                : "bg-slate-100 border-slate-200 text-slate-500"
                            }`}>
                              {entry.result.isPro ? "Pro report" : "Free report"}
                            </span>
                          </div>
                          <button
                            onClick={() => handleReplay(entry)}
                            className="flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors"
                            data-testid={`history-replay-${entry.id}`}
                          >
                            <ChevronRight className="w-4 h-4" />
                            Reopen Full Report
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </Section>

        {/* ── Profile Settings ── */}
        {!isGuest && (
          <Section title="Profile Settings" icon={User}>
            <form onSubmit={handleSaveName} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Display Name
                </label>
                <input
                  value={displayName}
                  onChange={(e) => { setDisplayName(e.target.value); setNameMsg(null); }}
                  placeholder="Your name"
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  data-testid="account-name-input"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Email Address
                </label>
                <input
                  value={email}
                  disabled
                  className="w-full border border-slate-100 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 text-slate-400 cursor-not-allowed"
                />
                <p className="text-xs text-slate-400 mt-1.5">
                  To change your email, use your identity provider settings or contact support.
                </p>
              </div>
              {nameMsg && (
                <p className={`text-sm font-semibold ${nameMsg.ok ? "text-emerald-600" : "text-red-600"}`}>
                  {nameMsg.text}
                </p>
              )}
              <button
                type="submit"
                disabled={nameLoading || !displayName.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-colors"
                data-testid="account-save-name"
              >
                {nameLoading ? "Saving…" : "Save Name"}
              </button>
            </form>
          </Section>
        )}

        {/* ── Password & Security ── */}
        {!isGuest && (
          <Section title="Password & Security" icon={Lock}>
            <div className="space-y-4">

              {/* Change password form */}
              <form onSubmit={handleChangePassword} className="space-y-3">
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={currentPw}
                    onChange={(e) => { setCurrentPw(e.target.value); setPwMsg(null); }}
                    placeholder="Current password"
                    autoComplete="current-password"
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                    aria-label={showPw ? "Hide password" : "Show password"}
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <input
                    type={showPw ? "text" : "password"}
                    value={newPw}
                    onChange={(e) => { setNewPw(e.target.value); setPwMsg(null); }}
                    placeholder="New password (min. 8 chars)"
                    autoComplete="new-password"
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  />
                  <input
                    type={showPw ? "text" : "password"}
                    value={confirmPw}
                    onChange={(e) => { setConfirmPw(e.target.value); setPwMsg(null); }}
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  />
                </div>

                {pwMsg && (
                  <p className={`text-sm font-semibold ${pwMsg.ok ? "text-emerald-600" : "text-red-600"}`}>
                    {pwMsg.text}
                  </p>
                )}

                <div className="flex items-center justify-between gap-4 pt-0.5">
                  <button
                    type="submit"
                    disabled={pwLoading || !currentPw || !newPw || !confirmPw}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-colors"
                    data-testid="account-change-pw"
                  >
                    {pwLoading ? "Updating…" : "Change Password"}
                  </button>
                  <button
                    type="button"
                    onClick={handleSendResetEmail}
                    disabled={resetLoading || !email}
                    className="text-xs text-slate-400 hover:text-slate-600 disabled:opacity-40 transition-colors"
                    data-testid="account-send-reset"
                  >
                    {resetLoading ? "Sending…" : "Forgot password?"}
                  </button>
                </div>

                {/* Reset email feedback — only shown after action */}
                {resetMsg && (
                  <p className={`text-xs font-medium ${resetMsg.ok ? "text-emerald-600" : "text-red-500"}`}>
                    {resetMsg.text}
                  </p>
                )}
              </form>

            </div>
          </Section>
        )}

        {/* ── Preferences ── */}
        <Section title="Preferences" icon={Settings}>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Terminology Mode</label>
              <p className="text-xs text-slate-500 mb-3">Sets the language level used in diagnostic reports.</p>
              <div className="grid grid-cols-3 gap-2">
                {(["beginner", "technician", "advanced"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => updatePrefs({ terminologyMode: mode })}
                    className={`px-3 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
                      prefs.terminologyMode === mode
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-700 bg-white"
                    }`}
                    data-testid={`prefs-mode-${mode}`}
                  >
                    {mode === "advanced" ? "Journeyman" : mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between py-3 border-t border-slate-100">
              <div>
                <p className="text-sm font-semibold text-slate-700">Dark Mode</p>
                <p className="text-xs text-slate-400 mt-0.5">Coming soon</p>
              </div>
              <div className="w-11 h-6 bg-slate-200 rounded-full opacity-50 cursor-not-allowed flex items-center px-0.5">
                <div className="w-5 h-5 bg-white rounded-full shadow-sm" />
              </div>
            </div>
          </div>
        </Section>

        {/* ── Support & Feedback ── */}
        <Section title="Support & Feedback" icon={HelpCircle}>
          <nav className="space-y-1">
            {[
              {
                icon: MessageSquare,
                label: "Contact Support",
                sub: "unitdownsupport@gmail.com",
                href: "mailto:unitdownsupport@gmail.com?subject=Support%20Request",
              },
              {
                icon: Flag,
                label: "Report a Bad Diagnosis",
                sub: "Help us improve accuracy",
                href: "mailto:unitdownsupport@gmail.com?subject=Bad%20Diagnosis%20Report",
              },
              {
                icon: ThumbsUp,
                label: "Request a Feature",
                sub: "Suggest improvements",
                href: "mailto:unitdownsupport@gmail.com?subject=Feature%20Request",
              },
              {
                icon: FileText,
                label: "Privacy Policy",
                sub: null,
                onClick: () => navigate("/privacy"),
              },
              {
                icon: FileText,
                label: "Terms of Service",
                sub: null,
                onClick: () => navigate("/terms"),
              },
            ].map(({ icon: Icon, label, sub, href, onClick }) =>
              href ? (
                <a
                  key={label}
                  href={href}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-slate-50 transition-colors group"
                >
                  <Icon className="w-4 h-4 text-slate-400 group-hover:text-blue-500 flex-shrink-0 transition-colors" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-700">{label}</p>
                    {sub && <p className="text-xs text-slate-400 truncate">{sub}</p>}
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-400 flex-shrink-0 transition-colors" />
                </a>
              ) : (
                <button
                  key={label}
                  onClick={onClick}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-slate-50 transition-colors group"
                >
                  <Icon className="w-4 h-4 text-slate-400 group-hover:text-blue-500 flex-shrink-0 transition-colors" />
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-semibold text-slate-700">{label}</p>
                    {sub && <p className="text-xs text-slate-400">{sub}</p>}
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-400 flex-shrink-0 transition-colors" />
                </button>
              )
            )}
          </nav>
        </Section>

        {/* ── Sign Out ── */}
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 border border-slate-200 hover:border-red-200 hover:bg-red-50 hover:text-red-600 text-slate-600 font-bold text-sm py-3 rounded-xl transition-colors"
            data-testid="account-signout"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>

        {/* ── Danger Zone ── */}
        {!isGuest && (
          <Section title="Danger Zone" icon={AlertTriangle} danger>
            {!deleteConfirm ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-slate-800">Delete Account</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Permanently delete your account and all data. This cannot be undone.
                  </p>
                </div>
                <button
                  onClick={() => setDeleteConfirm(true)}
                  className="flex-shrink-0 border border-red-300 hover:bg-red-600 hover:text-white hover:border-red-600 text-red-600 font-bold text-sm px-5 py-2.5 rounded-xl transition-colors"
                  data-testid="account-delete-btn"
                >
                  Delete Account
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm font-semibold text-red-800 leading-snug">
                    This will permanently delete your Clerk account, cancel your subscription, and erase all your local data.
                    Type <strong>DELETE</strong> below to confirm.
                  </p>
                </div>
                <input
                  value={deleteText}
                  onChange={(e) => setDeleteText(e.target.value)}
                  placeholder="Type DELETE to confirm"
                  className="w-full border border-red-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent"
                  data-testid="account-delete-confirm-input"
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteText !== "DELETE" || deleteLoading}
                    className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-sm py-2.5 rounded-xl transition-colors"
                    data-testid="account-delete-confirm"
                  >
                    {deleteLoading ? "Deleting…" : "Permanently Delete"}
                  </button>
                  <button
                    onClick={() => { setDeleteConfirm(false); setDeleteText(""); }}
                    className="flex-1 border border-slate-200 text-slate-600 font-bold text-sm py-2.5 rounded-xl transition-colors hover:bg-slate-50"
                    data-testid="account-delete-cancel"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </Section>
        )}

        <div className="pb-10 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} UnitDown AI · Commercial HVAC Diagnostics
        </div>

      </main>
    </div>
  );
}
