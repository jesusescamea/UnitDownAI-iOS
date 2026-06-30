import { useLocation } from "wouter";
import {
  ThermometerSnowflake,
  ArrowLeft,
  FileText,
  Shield,
  TriangleAlert,
  Bot,
  Bell,
  Mail,
  ChevronRight,
} from "lucide-react";
import { useSeoHead } from "@/lib/useSeoHead";

interface LegalCardProps {
  icon: React.ElementType;
  label: string;
  description: string;
  href: string;
  accent?: "blue" | "amber" | "emerald" | "violet" | "orange" | "slate";
}

const ACCENT_CLASSES: Record<string, { ring: string; bg: string; text: string; icon: string }> = {
  blue:   { ring: "ring-blue-200",   bg: "bg-blue-50",   text: "text-blue-700",   icon: "text-blue-600" },
  amber:  { ring: "ring-amber-200",  bg: "bg-amber-50",  text: "text-amber-700",  icon: "text-amber-600" },
  emerald:{ ring: "ring-emerald-200",bg: "bg-emerald-50",text: "text-emerald-700",icon: "text-emerald-600" },
  violet: { ring: "ring-violet-200", bg: "bg-violet-50", text: "text-violet-700", icon: "text-violet-600" },
  orange: { ring: "ring-orange-200", bg: "bg-orange-50", text: "text-orange-700", icon: "text-orange-600" },
  slate:  { ring: "ring-slate-200",  bg: "bg-slate-50",  text: "text-slate-700",  icon: "text-slate-600" },
};

function LegalCard({ icon: Icon, label, description, href, accent = "blue" }: LegalCardProps) {
  const [, navigate] = useLocation();
  const a = ACCENT_CLASSES[accent];
  return (
    <button
      onClick={() => navigate(href)}
      className="w-full text-left rounded-2xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all p-5 flex items-start gap-4 group"
    >
      <div className={`flex-shrink-0 w-10 h-10 rounded-xl ring-1 ${a.ring} ${a.bg} flex items-center justify-center`}>
        <Icon className={`w-5 h-5 ${a.icon}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{description}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 flex-shrink-0 mt-1 transition-colors" />
    </button>
  );
}

const LEGAL_PAGES: LegalCardProps[] = [
  {
    icon: FileText,
    label: "Terms of Service",
    description: "Rules and conditions governing your use of UnitDown AI.",
    href: "/terms",
    accent: "blue",
  },
  {
    icon: Shield,
    label: "Privacy Policy",
    description: "What data we collect, how we use it, and your rights.",
    href: "/privacy",
    accent: "emerald",
  },
  {
    icon: TriangleAlert,
    label: "Safety Disclaimer",
    description: "Critical safety information for HVAC service work and known hazards.",
    href: "/safety",
    accent: "amber",
  },
  {
    icon: Bot,
    label: "AI Limitations & Transparency",
    description: "How our AI works, what it can't do, and how to interpret outputs.",
    href: "/ai",
    accent: "violet",
  },
  {
    icon: Bell,
    label: "Notification Policy",
    description: "When and why we send notifications, and how to manage your preferences.",
    href: "/notifications",
    accent: "orange",
  },
  {
    icon: Mail,
    label: "Contact & Data Requests",
    description: "Submit a data request, report an issue, or reach our support team.",
    href: "/contact",
    accent: "slate",
  },
];

export default function LegalPage() {
  const [, navigate] = useLocation();

  useSeoHead({
    title: "Legal & Compliance | UnitDown AI",
    description:
      "Legal & Compliance Center for UnitDown AI — terms of service, privacy policy, safety disclaimer, AI transparency, notification policy, and contact.",
    canonical: "https://unitdown.org/legal",
    ogType: "website",
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="container max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
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

      <main className="container max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Legal & Compliance</h1>
          <p className="text-sm text-slate-500 leading-relaxed max-w-xl">
            Everything you need to understand your rights, our obligations, and how UnitDown AI handles your data, 
            your safety, and our AI outputs.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {LEGAL_PAGES.map((page) => (
            <LegalCard key={page.href} {...page} />
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-slate-200 text-center">
          <p className="text-xs text-slate-400">
            All documents last updated June 30, 2026. Questions? Email{" "}
            <a href="mailto:unitdownsupport@gmail.com" className="text-blue-600 hover:underline font-semibold">
              unitdownsupport@gmail.com
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
