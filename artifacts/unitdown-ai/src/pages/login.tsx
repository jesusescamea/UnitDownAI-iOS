import { useState, useCallback } from "react";
import { useSignIn } from "@clerk/clerk-react";
import { useLocation } from "wouter";
import { ThermometerSnowflake, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { shouldShowAppleSignIn } from "@/lib/platform";

type Step = "email" | "password" | "forgot" | "reset-code" | "reset-password";

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

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSendCode, setShowSendCode] = useState(false);
  // shouldShowAppleSignIn() returns true unconditionally (Apple guideline 4.8 —
  // Sign in with Apple must appear wherever any third-party social login exists).
  // Do NOT use useState + useEffect here: that pattern hides the button on the
  // first render and was the cause of "Apple button missing on iPhone Safari".
  const showApple = shouldShowAppleSignIn();

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
    if (!signIn || !isLoaded) return;
    setError(null);
    setLoading(true);
    try {
      await withTimeout(
        signIn.authenticateWithRedirect({
          strategy: "oauth_apple",
          redirectUrl: `${window.location.origin}/sso-callback`,
          redirectUrlComplete: "/",
        }),
        20_000
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes("timeout")) {
        setError(msg);
      } else {
        setError("Sign in with Apple is unavailable right now. Please try email.");
      }
      setLoading(false);
    }
  }, [signIn, isLoaded]);

  // ── Google OAuth ──────────────────────────────────────────────────────────────
  const handleGoogle = useCallback(async () => {
    if (!signIn || !isLoaded) return;
    setError(null);
    setLoading(true);
    try {
      await withTimeout(
        signIn.authenticateWithRedirect({
          strategy: "oauth_google",
          redirectUrl: `${window.location.origin}/sso-callback`,
          redirectUrlComplete: "/",
        }),
        20_000
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes("timeout")) {
        setError("Google sign-in timed out. Please check your connection and try again.");
      } else {
        setError("Google sign-in is unavailable right now. Please try email.");
      }
      setLoading(false);
    }
  }, [signIn, isLoaded]);

  // ── Email → password step ─────────────────────────────────────────────────────
  const handleEmailContinue = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError(null);
    setShowSendCode(false);
    setStep("password");
  }, [email]);

  // ── Sign in with password ─────────────────────────────────────────────────────
  const handleSignIn = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signIn || !isLoaded) return;
    setError(null);
    setShowSendCode(false);
    setLoading(true);
    try {
      const result = await withTimeout(
        signIn.create({ identifier: email.trim(), password })
      );
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        navigate("/");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.toLowerCase().includes("timeout")) {
        setError(msg);
      } else {
        const code = (err as { errors?: Array<{ code?: string }> })?.errors?.[0]?.code ?? "";
        if (
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
  }, [signIn, setActive, isLoaded, email, password, navigate, clerkError]);

  // ── Send verification / reset code ───────────────────────────────────────────
  const sendCode = useCallback(async () => {
    if (!signIn || !isLoaded) return;
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
  }, [signIn, isLoaded, email]);

  // ── Verify the emailed code ───────────────────────────────────────────────────
  const handleVerifyCode = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signIn || !isLoaded) return;
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
        navigate("/");
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
  }, [signIn, setActive, isLoaded, resetCode, navigate]);

  // ── Set new password after code verified ─────────────────────────────────────
  const handleSetPassword = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signIn || !isLoaded) return;
    setError(null);
    setLoading(true);
    try {
      const result = await withTimeout(
        signIn.resetPassword({ password: newPassword, signOutOfOtherSessions: false })
      );
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        navigate("/");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setError(msg.toLowerCase().includes("timeout") ? msg : clerkError(err));
    } finally {
      setLoading(false);
    }
  }, [signIn, setActive, isLoaded, newPassword, navigate, clerkError]);

  const goBack = () => {
    setError(null);
    setShowSendCode(false);
    if (step === "password" || step === "forgot") setStep("email");
    else if (step === "reset-code") setStep("forgot");
    else if (step === "reset-password") setStep("reset-code");
    else navigate("/");
  };

  const stepTitle: Record<Step, string> = {
    email: "Welcome back",
    password: "Enter your password",
    forgot: "Reset your password",
    "reset-code": "Check your email",
    "reset-password": "Set a new password",
  };

  const stepSubtitle: Record<Step, string> = {
    email: "Sign in to access your diagnostic history and subscription.",
    password: email,
    forgot: "We'll send a 6-digit code to your email address.",
    "reset-code": `If an account exists for ${email || "that address"}, a verification code or reset link has been sent.`,
    "reset-password": "Create a new secure password for your account.",
  };

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

          {/* ── STEP: email ── */}
          {step === "email" && (
            <div className="space-y-3">

              {/* Sign in with Apple — shown on iOS only (Apple guideline 4.8) */}
              {showApple && (
                <button
                  onClick={handleApple}
                  disabled={!isLoaded || loading}
                  className="w-full flex items-center justify-center gap-3 h-11 rounded-xl border border-slate-900 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition-colors disabled:opacity-50"
                  data-testid="btn-apple"
                  aria-label="Sign in with Apple"
                >
                  <AppleIcon />
                  Sign in with Apple
                </button>
              )}

              <button
                onClick={handleGoogle}
                disabled={!isLoaded || loading}
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
                  disabled={!email.trim() || !isLoaded}
                  className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl"
                  data-testid="btn-email-continue"
                >
                  Continue
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

          {/* ── STEP: forgot ── */}
          {step === "forgot" && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="reset-email" className="text-sm font-semibold text-slate-700">
                  Email address
                </Label>
                <Input
                  id="reset-email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-11 rounded-xl border-slate-200 text-sm focus-visible:ring-blue-500"
                  data-testid="input-reset-email"
                />
              </div>
              <Button
                onClick={sendCode}
                disabled={!email.trim() || loading}
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl"
                data-testid="btn-send-reset"
              >
                {loading ? "Sending…" : "Send verification code"}
              </Button>
              <button
                type="button"
                onClick={() => { setError(null); setStep("password"); }}
                className="w-full text-xs text-slate-500 hover:text-slate-700 font-semibold text-center py-1"
              >
                Back to sign in
              </button>
            </div>
          )}

          {/* ── STEP: reset-code ── */}
          {step === "reset-code" && (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="code" className="text-sm font-semibold text-slate-700">
                  Verification code
                </Label>
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="6-digit code"
                  maxLength={6}
                  className="h-11 rounded-xl border-slate-200 text-sm tracking-[0.3em] text-center font-mono focus-visible:ring-blue-500"
                  data-testid="input-code"
                />
              </div>
              <Button
                type="submit"
                disabled={resetCode.length < 6 || loading}
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl"
                data-testid="btn-verify-code"
              >
                {loading ? "Verifying…" : "Verify code"}
              </Button>
              <button
                type="button"
                onClick={sendCode}
                disabled={loading}
                className="w-full text-xs text-blue-600 hover:underline font-semibold text-center py-1"
              >
                Resend code
              </button>
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
                    placeholder="At least 8 characters"
                    className="h-11 rounded-xl border-slate-200 text-sm pr-10 focus-visible:ring-blue-500"
                    minLength={8}
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
                disabled={newPassword.length < 8 || loading}
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl"
                data-testid="btn-set-password"
              >
                {loading ? "Setting password…" : "Set password & sign in"}
              </Button>
            </form>
          )}

          <p className="text-xs text-slate-400 text-center leading-relaxed">
            Your account keeps your diagnostic history, subscription, and saved results secure across devices.
          </p>
        </div>
      </main>
    </div>
  );
}
