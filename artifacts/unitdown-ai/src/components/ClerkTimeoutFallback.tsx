import { AlertTriangle } from "lucide-react";
import { useLocation } from "wouter";

interface ClerkTimeoutFallbackProps {
  dark?: boolean;
}

/**
 * ClerkTimeoutFallback — shown on protected pages when Clerk fails to load.
 *
 * Renders on Dashboard, Records, and Account when the Clerk SDK does not
 * initialise within the allowed timeout (e.g. CDN blocked, offline,
 * pk_test_ key through the production proxy).
 *
 * Provides:
 *   • Clear explanation (not a blank screen or infinite spinner)
 *   • Retry button — reloads the page to retry Clerk init
 *   • Back to Home — lets the user access public content
 *   • Link to /login — Apple/Google reviewer demo-credential path
 *
 * Apple Review note: reviewers should navigate to /login and enter the
 * demo email (unitdownsupport@gmail.com) to activate the demo session
 * without requiring Google, Apple Sign-In, OTP, or any external auth.
 */
export function ClerkTimeoutFallback({ dark = true }: ClerkTimeoutFallbackProps) {
  const [, navigate] = useLocation();

  const bg = dark ? "bg-gray-950" : "bg-slate-50";
  const titleColor = dark ? "text-white" : "text-slate-900";
  const bodyColor = dark ? "text-gray-400" : "text-slate-500";
  const hintColor = dark ? "text-gray-600" : "text-slate-400";
  const iconBg = dark ? "bg-amber-400/10" : "bg-amber-50";
  const secondaryBtn = dark
    ? "bg-gray-800 hover:bg-gray-700 text-gray-200"
    : "bg-slate-100 hover:bg-slate-200 text-slate-700";

  return (
    <div className={`min-h-screen ${bg} flex items-center justify-center p-6`}>
      <div className="text-center space-y-4 max-w-sm w-full">
        <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto ${iconBg}`}>
          <AlertTriangle className={`w-7 h-7 ${dark ? "text-amber-400" : "text-amber-500"}`} />
        </div>

        <h2 className={`text-xl font-bold ${titleColor}`}>
          Unable to Load Account Session
        </h2>

        <p className={`text-sm leading-relaxed ${bodyColor}`}>
          The authentication service took too long to respond. This is usually
          a temporary network issue — try reloading.
        </p>

        <div className="flex gap-3 justify-center pt-1">
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold transition-colors shadow"
          >
            Retry
          </button>
          <button
            onClick={() => navigate("/")}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${secondaryBtn}`}
          >
            Back to Home
          </button>
        </div>

        <p className={`text-xs pt-2 ${hintColor}`}>
          App Store reviewer?{" "}
          <button
            onClick={() => navigate("/login")}
            className={`underline underline-offset-2 ${dark ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"}`}
          >
            Sign in with demo credentials
          </button>
        </p>
      </div>
    </div>
  );
}
