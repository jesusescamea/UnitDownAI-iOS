import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldCheck, LogIn, UserPlus } from "lucide-react";

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

interface EmailWallModalProps {
  open: boolean;
  onClose: () => void;
  onEmailSuccess: () => void;
  onUpgrade: () => void;
}

export default function EmailWallModal({ open, onClose }: EmailWallModalProps) {
  const goSignup = () => { window.location.href = "/signup"; };
  const goLogin  = () => { window.location.href = "/login"; };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm p-0 overflow-hidden rounded-2xl border-0 shadow-2xl">

        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 pt-7 pb-6 text-center">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 mx-auto mb-4">
            <ShieldCheck className="w-6 h-6 text-blue-400" />
          </div>
          <h2 className="text-xl font-extrabold text-white leading-tight mb-2">
            Create a free account to continue
          </h2>
          <p className="text-slate-300 text-sm leading-relaxed">
            You've used your 2 free diagnostics. Sign up free to keep diagnosing — your history and results are saved across devices.
          </p>
        </div>

        {/* Actions */}
        <div className="px-6 py-6 space-y-3 bg-white">
          <Button
            onClick={goSignup}
            className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl"
            data-testid="signup-wall-signup"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Sign up — it's free
          </Button>

          <Button
            onClick={goLogin}
            variant="outline"
            className="w-full h-11 border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold rounded-xl"
            data-testid="signup-wall-login"
          >
            <LogIn className="w-4 h-4 mr-2" />
            Log in
          </Button>

          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-white text-slate-400 font-medium">or</span>
            </div>
          </div>

          <Button
            onClick={goSignup}
            variant="outline"
            className="w-full h-11 border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold rounded-xl flex items-center justify-center gap-2"
            data-testid="signup-wall-google"
          >
            <GoogleIcon />
            Continue with Google
          </Button>

          <p className="text-center text-xs text-slate-400 pt-1">
            Free accounts include diagnostic history, saved results, and more.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
