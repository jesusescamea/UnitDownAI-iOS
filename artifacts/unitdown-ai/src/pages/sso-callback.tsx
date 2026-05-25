import { useEffect, useState } from "react";
import { AuthenticateWithRedirectCallback } from "@clerk/clerk-react";
import { ThermometerSnowflake, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";

const TIMEOUT_MS = 12_000;

export default function SsoCallbackPage() {
  const [timedOut, setTimedOut] = useState(false);
  const [, navigate] = useLocation();

  // If Clerk hasn't processed the OAuth token within 12 seconds, show an
  // error so the user is never stuck on an infinite "Completing sign-in…"
  // screen (which Apple reviewers flagged as a freeze).
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), TIMEOUT_MS);
    return () => clearTimeout(t);
  }, []);

  if (timedOut) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 px-4">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-md">
          <ThermometerSnowflake className="w-6 h-6 text-white" />
        </div>
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-semibold">Sign-in could not be completed.</p>
        </div>
        <p className="text-xs text-slate-500 text-center max-w-xs">
          This can happen on a slow connection or if the session expired. Please try again.
        </p>
        <button
          onClick={() => navigate("/login")}
          className="mt-2 text-sm font-bold text-blue-600 hover:underline"
        >
          Return to sign-in
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-md">
        <ThermometerSnowflake className="w-6 h-6 text-white" />
      </div>
      <p className="text-sm font-semibold text-slate-500">Completing sign-in…</p>
      <AuthenticateWithRedirectCallback />
    </div>
  );
}
