import { useState, useEffect } from "react";
import { X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "unitdown_pwa_dismissed";

export default function InstallPromptBanner() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Skip if already dismissed, already installed (running standalone), or SSR
    if (typeof window === "undefined") return;
    if (localStorage.getItem(DISMISSED_KEY)) return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if ((window.navigator as { standalone?: boolean }).standalone === true) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
      // Show after a few seconds so it doesn't interrupt page load
      setTimeout(() => setVisible(true), 4000);
    };

    const installedHandler = () => {
      setVisible(false);
      localStorage.setItem(DISMISSED_KEY, "installed");
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") {
      localStorage.setItem(DISMISSED_KEY, "installed");
    }
    setPrompt(null);
    setVisible(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  };

  if (!visible || !prompt) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-[100] pointer-events-none"
      aria-live="polite"
    >
      <div className="max-w-md mx-auto bg-[#1e3a5f] border border-blue-500/40 rounded-2xl shadow-2xl shadow-black/40 p-4 flex items-center gap-3 pointer-events-auto">
        {/* Icon */}
        <div className="flex-shrink-0 w-11 h-11 bg-blue-600 rounded-xl flex items-center justify-center">
          <Download className="w-5 h-5 text-white" />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm leading-tight">
            Install UnitDown App
          </p>
          <p className="text-blue-300 text-xs mt-0.5 leading-tight">
            Fast access from your home screen
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Button
            size="sm"
            onClick={handleInstall}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 h-8 rounded-lg"
          >
            Install
          </Button>
          <button
            onClick={handleDismiss}
            className="text-blue-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
            aria-label="Dismiss install prompt"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
