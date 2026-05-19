import { SignUp } from "@clerk/clerk-react";
import { useLocation } from "wouter";
import { ThermometerSnowflake, ArrowLeft } from "lucide-react";
import { isIOSApp } from "@/lib/platform";

export default function SignupPage() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200">
        <div className="container max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <button
            onClick={() => navigate("/login")}
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

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 gap-8">
        <div className="text-center max-w-sm">
          <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Create your account</h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            Sign up to save your diagnostic history and access premium features across all your devices.
          </p>
        </div>

        {/*
         * iOS App Store build hides third-party login and external payment
         * flows until Sign in with Apple and StoreKit IAP are fully
         * implemented. On iOS: social buttons are hidden so only email/password
         * signup is available. On web: all social providers are shown.
         */}
        <SignUp
          routing="hash"
          fallbackRedirectUrl="/"
          appearance={{
            elements: {
              rootBox: "w-full max-w-sm",
              card: "shadow-sm border border-slate-200 rounded-2xl",
              headerTitle: "hidden",
              headerSubtitle: "hidden",
              // iOS App Store build: hide Google and other third-party social
              // buttons. Only email/password signup is shown on iOS.
              socialButtons: isIOSApp() ? { display: "none" } : undefined,
              dividerRow: isIOSApp() ? { display: "none" } : undefined,
              socialButtonsBlockButton: isIOSApp()
                ? { display: "none" }
                : "border border-slate-200 hover:bg-slate-50 font-semibold text-slate-700",
              formButtonPrimary:
                "bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl",
              formFieldInput:
                "border-slate-200 rounded-xl text-sm focus:ring-blue-500 focus:border-blue-500",
              footerAction: "text-xs text-slate-500",
            },
          }}
        />

        <p className="text-xs text-slate-400 text-center max-w-sm leading-relaxed">
          Already have an account?{" "}
          <button
            onClick={() => navigate("/login")}
            className="text-blue-600 hover:underline font-semibold"
          >
            Sign in
          </button>
        </p>
      </main>
    </div>
  );
}
