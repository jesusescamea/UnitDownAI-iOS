import { AuthenticateWithRedirectCallback } from "@clerk/clerk-react";
import { ThermometerSnowflake } from "lucide-react";

export default function SsoCallbackPage() {
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
