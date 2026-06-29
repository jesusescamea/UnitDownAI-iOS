import { useState, useCallback, useEffect } from "react";
import { useSignIn } from "@clerk/clerk-react";
import { useLocation } from "wouter";
import { ThermometerSnowflake, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { shouldShowAppleSignIn, isMedian } from "@/lib/platform";
import { isDemoProEmail } from "@/lib/demoAccess";
import { activateDemoSession } from "@/lib/demoSession";

type Step = "email" | "password" | "forgot" | "reset-code" | "reset-password" | "demo-account" | "otp";

const AUTH_TIMEOUT_MS = 15_000;

/** Rejects after a timeout so auth can never spin forever. */
function withTimeout<T>(promise: Promise<T>, ms = AUTH_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error("Sign-in timed out. Please check your connection and try again.")),
        ms
      )
    ),
  ]);
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 18 18" className="w-4 h-4 flex-shrink-0" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2a10 10 0 0 0-.16-1.7H9v3.21h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92a8.78 8.78 0 0 0 2.68-6.49z" />
      <path fill="#34A853" d="M9 18a8.6 8.6 0 0 0 5.96-2.18l-2.91-2.26a5.4 5.4 0 0 1-8.09-2.85H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.96 10.71A5.4 5.4 0 0 1 3.68 9a5.4 5.4 0 0 1 .28-1.71V4.96H.96A9 9 0 0 0 0 9a9 9 0 0 0 .96 4.04l3-2.33z" />
      <path fill="#EA4335" d="M9 3.58a4.86 4.86 0 0 1 3.44 1.35l2.58-2.58A8.65 8.65 0 0 0 9 0 9 9 0 0 0 .96 4.96l3 2.33A5.36 5.36 0 0 1 9 3.58z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 18 18" className="w-4 h-4 flex-shrink-0" aria-hidden="true" fill="currentColor">
      <path d="M13.1 1c-.3 1.2-1 2.2-1.8 2.9-.8.7-1.8 1.2-2.8 1.1-.2-1.1.4-2.2 1.1-3C10.5 1.2 11.9.5 13.1 1zM16 12.8c-.5 1-1.1 2-2 2.7-.8.7-1.7 1-2.5 1-.8 0-1.6-.4-2.4-.4-.8 0-1.7.4-2.5.4-.8 0-1.7-.3-2.5-1-.9-.8-1.7-2.1-2.2-3.5C1.3 10.5 1 8.9 1 7.4c0-1.8.5-3.3 1.4-4.4C3.3 2 4.5 1.3 5.8 1.3c.9 0 1.9.4 2.7.4.7 0 1.8-.5 2.9-.4.5 0 1.9.2 2.9 1.3-.1.1-1.7 1-1.7 3.1 0 2.4 2.1 3.2 2.1 3.2-.1.2-.5 1.4-1.7 2.9z" />
    </svg>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800 font-medium leading-snug">
      {message}
    </div>
  );
}

export default function LoginPage() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const [, navigate] = useLocation();

  // Evaluated once on mount — stable for the lifetime of this page render.
  const isMedianWebView = isMedian();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSendCode, setShowSendCode] = useState(false);
  // shouldShowAppleSignIn() returns true unconditionally (Apple guideline 4.8 —
  // Sign in with Apple must appear wherever any third-party social login exists).
  // Do NOT use useState + useEffect here: that pattern hides the button on the
  // first render and was the cause of "Apple button missing on iPhone Safari".
  const showApple = shouldShowAppleSignIn();

  // Safety valve: if Clerk hasn't finished initialising after 6 s, re-enable
  // all buttons so the user is never permanently locked out due to a failed
  // Clerk SDK init (e.g. pk_test_ key on a production proxy, network timeout,
  // or a Clerk outage). When timed out, handlers fall through to the !signIn
  // guard and surface a clear "temporarily unavailable" message.
  const [clerkTimedOut, setClerkTimedOut] = useState(false);
  useEffect(() => {
    if (isLoaded) return;
    const t = setTimeout(() => setClerkTimedOut(true), 6_000);
    return () => clearTimeout(t);
  }, [isLoaded]);

  const clerkError = useCallback((err: unknown): string => {
    const e = err as { errors?: Array<{ code?: string; longMessage?: string; message?: string }> };
    return (
      e?.errors?.[0]?.longMessage ||
      e?.errors?.[0]?.message ||
      "Something went wrong. Please try again."
    );
  }, []);

  // ── Sign in with Apple (iOS native) ──────────────────────────────────────────
  const handleApple = useCallback(async () => {
    // Clerk loaded but signIn is null → Clerk initialised in an error state.
    // Surface a clear message instead of silently doing nothing (which looked
    // like a freeze to App Store reviewers).
    if (!signIn) {
      setError("Sign in with Apple is temporarily unavailable. Please try again or use email.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await withTimeout(
        signIn.authenticateWithRedirect({
          strategy: "oauth_apple",
          redirectUrl: `${window.location.origin}/sso-callback`,
          redirectUrlComplete: "/dashboard",
        }),
        20_000
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes("timeout")) {
        setError("Sign in with Apple timed out. Please check your connection and try again.");
      } else {
        setError("Sign in with Apple is unavailable right now. Please try again.");
      }
      setLoading(false);
    }
  }, [signIn]);

  // ── Google OAuth ──────────────────────────────────────────────────────────────
  const handleGoogle = useCallback(async () => {
    if (!signIn) {
      setError("Google sign-in is temporarily unavailable. Please try again or use email.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await withTimeout(
        signIn.authenticateWithRedirect({
          strategy: "oauth_google",
          redirectUrl: `${window.location.origin}/sso-callback`,
          redirectUrlComplete: "/dashboard",
        }),
        20_000
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes("timeout")) {
        setError("Google sign-in timed out. Please check your connection and try again.");
      } else {
        setError("Google sign-in is unavailable right now. Please try again.");
      }
      setLoading(false);
    }
  }, [signIn]);

  // ── Email OTP — Median WebView path ──────────────────────────────────────────
  //
  // Median's free-tier WebView blocks all external-domain navigation, which
  // kills Google and Apple OAuth (both require a redirect to an external IdP).
  // The email_code strategy keeps every network call inside unitdown.org via the
  // /api/__clerk proxy, so it works regardless of Median navigation policies.
  //
  // This handler is only invoked when isMedian() is true and the user is NOT a
  // demo account email. It replaces the "go to password step" branch with a
  // "send OTP and go to otp step" branch.
  const handleSendOtp = useCallback(async () => {
    if (!signIn) return;
    setError(null);
    setLoading(true);
    try {
      await withTimeout(
        signIn.create({ strategy: "email_code", identifier: email.trim() }),
        AUTH_TIMEOUT_MS
      );
      setOtpCode("");
      setStep("otp");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.toLowerCase().includes("timeout")) {
        setError(msg);
      } else {
        const code = (err as { errors?: Array<{ code?: string }> })?.errors?.[0]?.code ?? "";
        if (code === "form_identifier_not_found") {
          setError("No account found for that email address. Please check and try again.");
        } else {
          setError("We couldn't send a code right now. Please check your connection and try again.");
        }
      }
    } finally {
      setLoading(false);
    }
  }, [signIn, email]);

  // ── Verify the OTP code (Median path) ────────────────────────────────────────
  const handleVerifyOtp = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signIn) return;
    setError(null);
    setLoading(true);
    try {
      const result = await withTimeout(
        signIn.attemptFirstFactor({ strategy: "email_code", code: otpCode.trim() })
      );
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        navigate("/dashboard");
      } else {
        setError("Sign-in could not be completed. Please request a new code and try again.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setError(
        msg.toLowerCase().includes("timeout")
          ? msg
          : (err as { errors?: Array<{ message?: string }> })?.errors?.[0]?.message ||
            "Invalid or expired code. Please check and try again."
      );
    } finally {
      setLoading(false);
    }
  }, [signIn, setActive, otpCode, navigate]);

  // ── Email → password (or demo bypass, or OTP for Median) step ────────────────
  //
  // APPLE REVIEW DEMO ACCOUNT BYPASS
  // When unitdownsupport@gmail.com (or any DEMO_PRO_EMAILS entry) is entered:
  //   1. Try a silent Clerk token-based sign-in (works if sign_in_tokens enabled).
  //   2. If that fails for any reason, fall back to a LOCAL demo session that
  //      requires NO external provider, NO OTP, NO redirect — just sessionStorage.
  //      activateDemoSession() stores a flag; the app then treats the session as
  //      authenticated Pro without any Clerk session at all.
  // Normal email addresses are completely unaffected.
  const handleEmailContinue = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !signIn) return;
    setError(null);
    setShowSendCode(false);

    if (isDemoProEmail(email.trim())) {
      // APPLE REVIEW — step 1: attempt silent Clerk token sign-in
      setLoading(true);
      try {
        const res = await fetch("/api/auth/demo-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim().toLowerCase() }),
        });
        if (res.ok) {
          const { token } = (await res.json()) as { token: string };
          const result = await withTimeout(
            signIn.create({ strategy: "ticket", ticket: token })
          );
          if (result.status === "complete") {
            await setActive({ session: result.createdSessionId });
            navigate("/dashboard");
            return;
          }
        }
      } catch {
        // Clerk ticket strategy unavailable on this instance — use local bypass
      } finally {
        setLoading(false);
      }

      // APPLE REVIEW — step 2 (guaranteed fallback):
      // Activate a local demo session. No Clerk required. Reviewer enters the
      // app directly as a Pro user. sessionStorage is cleared on tab close.
      activateDemoSession(email.trim().toLowerCase());
      navigate("/dashboard");
      return;
    }

    // Median WebView: OAuth is blocked by the free-tier navigation policy.
    // Use the email_code (OTP) strategy instead of advancing to the password
    // step. This works for all account types — password, Google, or Apple —
    // because Clerk looks up the account by email and sends the code regardless
    // of how the account was originally created.
    if (isMedianWebView) {
      await handleSendOtp();
      return;
    }

    // Normal users on web / Capacitor → password step
    setStep("password");
  }, [email, signIn, setActive, navigate, isMedianWebView, handleSendOtp]);

  // ── Sign in with password ─────────────────────────────────────────────────────
  const handleSignIn = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signIn) return;
    setError(null);
    setShowSendCode(false);
    setLoading(true);
    try {
      const result = await withTimeout(
        signIn.create({ identifier: email.trim(), strategy: "password", password })
      );
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        navigate("/dashboard");
      } else if (result.status === "needs_first_factor") {
        // Account exists but Clerk needs an additional first-factor verification
        // (e.g. email code). Surface the send-code option so the user can proceed.
        setError(
          "Your account requires a verification step. Please use the button below to receive a code by email."
        );
        setShowSendCode(true);
      } else {
        // Any other incomplete status — surface a clear error rather than silently doing nothing
        setError("Sign-in could not be completed. Please try again or use Google sign-in.");
        setShowSendCode(true);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.toLowerCase().includes("timeout")) {
        setError(msg);
      } else {
        const code = (err as { errors?: Array<{ code?: string }> })?.errors?.[0]?.code ?? "";
        if (code === "form_strategy_for_user_invalid" || code.includes("strategy")) {
          // Account was created via Google or Apple — it has no password
          setError(
            "This account uses Google or Apple sign-in. Please use the Google or Apple button above."
          );
        } else if (
          code === "form_password_incorrect" ||
          code === "form_identifier_not_found" ||
          code.includes("password") ||
          code.includes("credentials")
        ) {
          setError(
            "We couldn't verify that login. You can try again or request a verification code by email."
          );
          setShowSendCode(true);
        } else {
          setError(clerkError(err));
        }
      }
    } finally {
      setLoading(false);
    }
  }, [signIn, setActive, email, password, navigate, clerkError]);

  // ── Send verification / reset code ───────────────────────────────────────────
  const sendCode = useCallback(async () => {
    if (!signIn) return;
    setError(null);
    setLoading(true);
    try {
      await withTimeout(
        signIn.create({
          strategy: "reset_password_email_code",
          identifier: email.trim() || email,
        })
      );
    } catch {
      // Always advance — never reveal whether the email exists.
    } finally {
      setLoading(false);
      setStep("reset-code");
    }
  }, [signIn, email]);

  // ── Verify the emailed code ───────────────────────────────────────────────────
  const handleVerifyCode = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signIn) return;
    setError(null);
    setLoading(true);
    try {
      const result = await withTimeout(
        signIn.attemptFirstFactor({
          strategy: "reset_password_email_code",
          code: resetCode.trim(),
        })
      );
      if (result.status === "needs_new_password") {
        setStep("reset-password");
      } else if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        navigate("/dashboard");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setError(
        msg.toLowerCase().includes("timeout")
          ? msg
          : (err as { errors?: Array<{ message?: string }> })?.errors?.[0]?.message ||
            "Invalid or expired code. Please check and try again."
      );
    } finally {
      setLoading(false);
    }
  }, [signIn, setActive, resetCode, navigate]);

  // ── Set new password after code verified ─────────────────────────────────────
  const handleSetPassword = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signIn) return;
    setError(null);
    setLoading(true);
    try {
      const result = await withTimeout(
        signIn.resetPassword({ password: newPassword, signOutOfOtherSessions: false })
      );
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        navigate("/dashboard");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setError(msg.toLowerCase().includes("timeout") ? msg : clerkError(err));
    } finally {
      setLoading(false);
    }
  }, [signIn, setActive, newPassword, navigate, clerkError]);

  const goBack = () => {
    setError(null);
    setShowSendCode(false);
    if (
      step === "password" ||
      step === "forgot" ||
      step === "demo-account" ||
      step === "otp"
    ) {
      setStep("email");
    } else if (step === "reset-code") setStep("forgot");
    else if (step === "reset-password") setStep("reset-code");
    else navigate("/dashboard");
  };

  const stepTitle: Record<Step, string> = {
    email: "Welcome back",
    password: "Enter your password",
    forgot: "Reset your password",
    "reset-code": "Check your email",
    "reset-password": "Set a new password",
    "demo-account": "Sign in to continue",
    otp: "Check your email",
  };

  const stepSubtitle: Record<Step, string> = {
    email: "Sign in to access your diagnostic history and subscription.",
    password: email,
    forgot: "We'll send a 6-digit code to your email address.",
    "reset-code": `If an account exists for ${email || "that address"}, a verification code or reset link has been sent.`,
    "reset-password": "Create a new secure password for your account.",
    "demo-account": email,
    otp: `We sent a 6-digit code to ${email || "your email address"}.`,
  };

  // True while Clerk is still initialising AND the safety timeout hasn't fired.
  // Used to disable buttons — once either condition clears, buttons become active.
  const clerkBlocking = !isLoaded && !clerkTimedOut;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200">
        <div className="container max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <button
            onClick={goBack}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-semibold">Back</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded flex items-center justify-center">
              <ThermometerSnowflake className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-extrabold tracking-tight text-slate-900">UnitDown AI</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm space-y-6">

          {/* Title */}
          <div className="text-center">
            <h1 className="text-2xl font-extrabold text-slate-900">{stepTitle[step]}</h1>
            <p className="text-sm text-slate-500 mt-1 break-all">{stepSubtitle[step]}</p>
          </div>

          {/* Error banner */}
          {error && <ErrorBanner message={error} />}

          {/* Clerk timeout warning — shown when Clerk SDK hasn't initialised
              after 6 s. Buttons are re-enabled so the user is never stuck;
              tapping them will surface a "temporarily unavailable" error if
              Clerk truly failed, or succeed if it finished loading just after
              the timeout fired. */}
          {clerkTimedOut && !isLoaded && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 font-medium leading-snug flex items-start gap-2">
              <span className="flex-shrink-0 mt-px">⚠</span>
              <div>
                <p>Sign-in is taking longer than expected.</p>
                {import.meta.env.DEV && !import.meta.env.VITE_CLERK_PUBLISHABLE_KEY?.startsWith("pk_live_") ? (
                  <p className="mt-1 text-xs font-normal">
                    Dev mode with a <code className="font-mono">pk_test_</code> key — Clerk cannot initialize in a
                    cross-origin iframe. Set <code className="font-mono">VITE_CLERK_PUBLISHABLE_KEY</code> to a{" "}
                    <code className="font-mono">pk_live_</code> key in Replit Secrets.
                  </p>
                ) : (
                  <p className="mt-1 text-xs font-normal">Check your connection and try reloading.</p>
                )}
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="underline font-semibold mt-1.5 hover:text-amber-900"
                >
                  Tap to reload
                </button>
              </div>
            </div>
          )}

          {/* ── STEP: email ── */}
          {step === "email" && (
            <div className="space-y-3">

              {/* OAuth buttons — hidden in Median WebView because the free-tier
                  navigation policy blocks all external-domain redirects. Users
                  on Median sign in via email OTP (code path below). */}
              {!isMedianWebView && (
                <>
                  {/* Sign in with Apple — always shown on non-Median platforms
                      (Apple guideline 4.8: must appear wherever any third-party
                      social login exists) */}
                  {showApple && (
                    <button
                      onClick={handleApple}
                      disabled={clerkBlocking || loading}
                      className="w-full flex items-center justify-center gap-3 h-11 rounded-xl border border-slate-900 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition-colors disabled:opacity-50"
                      data-testid="btn-apple"
                      aria-label="Sign in with Apple"
                    >
                      <AppleIcon />
                      Sign in with Apple
                    </button>
                  )}

                  {/* Continue with Google */}
                  <button
                    onClick={handleGoogle}
                    disabled={clerkBlocking || loading}
                    className="w-full flex items-center justify-center gap-3 h-11 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-semibold text-slate-700 text-sm transition-colors disabled:opacity-50"
                    data-testid="btn-google"
                  >
                    <GoogleIcon />
                    Continue with Google
                  </button>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-slate-200" />
                    <span className="text-xs text-slate-400 font-medium">or</span>
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>
                </>
              )}

              <form onSubmit={handleEmailContinue} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-semibold text-slate-700">
                    Email address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="h-11 rounded-xl border-slate-200 text-sm focus-visible:ring-blue-500"
                    required
                    data-testid="input-email"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={!email.trim() || clerkBlocking || loading}
                  className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl"
                  data-testid="btn-email-continue"
                >
                  {loading ? "Sending code…" : "Continue"}
                </Button>
              </form>

              <p className="text-xs text-slate-400 text-center">
                New to UnitDown AI?{" "}
                <button
                  type="button"
                  onClick={() => navigate("/signup")}
                  className="text-blue-600 hover:underline font-semibold"
                >
                  Create an account
                </button>
              </p>
            </div>
          )}

          {/* ── STEP: otp (Median WebView only) ── */}
          {step === "otp" && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="otp-code" className="text-sm font-semibold text-slate-700">
                  Verification code
                </Label>
                <Input
                  id="otp-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="6-digit code"
                  className="h-11 rounded-xl border-slate-200 text-sm tracking-widest text-center focus-visible:ring-blue-500"
                  required
                  data-testid="input-otp"
                />
              </div>

              <Button
                type="submit"
                disabled={otpCode.length !== 6 || loading}
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl"
                data-testid="btn-verify-otp"
              >
                {loading ? "Verifying…" : "Verify code"}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleSendOtp}
                disabled={loading}
                className="w-full h-11 border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold rounded-xl"
                data-testid="btn-resend-otp"
              >
                {loading ? "Sending…" : "Resend code"}
              </Button>
            </form>
          )}

          {/* ── STEP: password ── */}
          {step === "password" && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-semibold text-slate-700">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    autoFocus
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="h-11 rounded-xl border-slate-200 text-sm pr-10 focus-visible:ring-blue-500"
                    required
                    data-testid="input-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex justify-end pt-0.5">
                  <button
                    type="button"
                    onClick={() => { setError(null); setShowSendCode(false); setStep("forgot"); }}
                    className="text-xs font-semibold text-blue-600 hover:underline"
                    data-testid="btn-forgot-password"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={!password || loading}
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl"
                data-testid="btn-sign-in"
              >
                {loading ? "Signing in…" : "Sign in"}
              </Button>

              {showSendCode && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={sendCode}
                  disabled={loading}
                  className="w-full h-11 border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold rounded-xl"
                  data-testid="btn-send-code"
                >
                  {loading ? "Sending…" : "Send verification code"}
                </Button>
              )}
            </form>
          )}

          {/* ── STEP: demo-account ── */}
          {/* Shown when the user enters a demo/review email (e.g. unitdownsupport@gmail.com).
              These accounts were created with Google OAuth and have no password set.
              We skip the password form entirely and guide them to the correct method. */}
          {step === "demo-account" && (
            <div className="space-y-4">
              <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800 leading-snug">
                <p className="font-semibold mb-1">Demo / review account</p>
                <p>
                  This account uses <strong>Google Sign-In</strong> — no password is set.
                  Tap <em>Continue with Google</em> below to sign in instantly.
                </p>
              </div>

              <button
                onClick={handleGoogle}
                disabled={clerkBlocking || loading}
                className="w-full flex items-center justify-center gap-3 h-11 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-semibold text-slate-700 text-sm transition-colors disabled:opacity-50"
              >
                <GoogleIcon />
                Continue with Google
              </button>
            </div>
          )}

          {/* ── STEP: forgot ── */}
          {step === "forgot" && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Enter your email address and we'll send you a code to reset your password.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="forgot-email" className="text-sm font-semibold text-slate-700">
                  Email address
                </Label>
                <Input
                  id="forgot-email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-11 rounded-xl border-slate-200 text-sm focus-visible:ring-blue-500"
                  required
                  data-testid="input-forgot-email"
                />
              </div>
              <Button
                onClick={sendCode}
                disabled={!email.trim() || loading}
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl"
                data-testid="btn-send-reset-code"
              >
                {loading ? "Sending…" : "Send reset code"}
              </Button>
            </div>
          )}

          {/* ── STEP: reset-code ── */}
          {step === "reset-code" && (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="reset-code" className="text-sm font-semibold text-slate-700">
                  Verification code
                </Label>
                <Input
                  id="reset-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  placeholder="6-digit code"
                  className="h-11 rounded-xl border-slate-200 text-sm focus-visible:ring-blue-505"
                  required
                  data-testid="input-reset-code"
                />
              </div>
              <Button
                type="submit"
                disabled={!resetCode.trim() || loading}
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl"
                data-testid="btn-verify-code"
              >
                {loading ? "Verifying…" : "Verify code"}
              </Button>
            </form>
          )}

          {/* ── STEP: reset-password ── */}
          {step === "reset-password" && (
            <form onSubmit={handleSetPassword} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="new-password" className="text-sm font-semibold text-slate-700">
                  New password
                </Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    autoComplete="new-password"
                    autoFocus
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Create a new password"
                    className="h-11 rounded-xl border-slate-200 text-sm pr-10 focus-visible:ring-blue-500"
                    required
                    data-testid="input-new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                    aria-label={showNewPassword ? "Hide password" : "Show password"}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                disabled={!newPassword || loading}
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl"
                data-testid="btn-set-password"
              >
                {loading ? "Saving…" : "Set new password"}
              </Button>
            </form>
          )}

        </div>
      </main>
    </div>
  );
}
