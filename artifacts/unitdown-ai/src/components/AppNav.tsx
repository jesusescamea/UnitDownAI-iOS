/**
 * AppNav — UnitDown Field OS navigation.
 *
 * Desktop (≥640px): Sticky top bar with logo + full horizontal tab nav + user avatar.
 * Mobile (<640px):  Slim sticky top bar (logo + avatar only) + fixed bottom tab bar.
 *
 * One import per authenticated page delivers both bars automatically.
 * Tabs: Today · Jobs · PT Chart · Customers · Equipment · Account
 */
import { useLocation } from "wouter";
import {
  ThermometerSnowflake,
  LayoutGrid,
  Briefcase,
  Wrench,
  Gauge,
  User,
  Users,
} from "lucide-react";
import { useUser } from "@clerk/clerk-react";

export type AppNavSection =
  | "dashboard"
  | "job"
  | "pt-chart"
  | "customers"
  | "records"
  | "account";

interface AppNavProps {
  active?: AppNavSection;
}

const TABS = [
  { id: "dashboard" as AppNavSection, label: "Today",     Icon: LayoutGrid, path: "/dashboard"  },
  { id: "job"       as AppNavSection, label: "Jobs",      Icon: Briefcase,  path: "/job"        },
  { id: "pt-chart"  as AppNavSection, label: "PT Chart",  Icon: Gauge,      path: "/pt-chart"   },
  { id: "customers" as AppNavSection, label: "Customers", Icon: Users,      path: "/customers"  },
  { id: "records"   as AppNavSection, label: "Equipment", Icon: Wrench,     path: "/records"    },
  { id: "account"   as AppNavSection, label: "Account",   Icon: User,       path: "/account"    },
] as const;

function buildInitials(user: ReturnType<typeof useUser>["user"]): string {
  if (!user) return "?";
  const first = user.firstName?.[0]?.toUpperCase() ?? "";
  const last  = user.lastName?.[0]?.toUpperCase()  ?? "";
  if (first || last) return first + last || first || last;
  const email = user.emailAddresses[0]?.emailAddress ?? "";
  const local = email.split("@")[0];
  const parts = local.split(/[._\-+]/).filter(Boolean);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : (parts[0]?.[0]?.toUpperCase() ?? "?");
}

export function AppNav({ active }: AppNavProps) {
  const [, navigate] = useLocation();
  const { user } = useUser();
  const initials = buildInitials(user);

  return (
    <>
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-gray-950 border-b border-gray-800">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">

          {/* Logo */}
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 flex-shrink-0"
            aria-label="UnitDown Field OS home"
          >
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
              <ThermometerSnowflake className="w-4 h-4 text-white" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-extrabold text-white tracking-tight">
                UnitDown
              </span>
              <span className="text-[10px] font-bold text-blue-400 bg-blue-950/60 border border-blue-800/40 rounded px-1.5 py-0.5 leading-none tracking-wider">
                FIELD OS
              </span>
            </div>
          </button>

          {/* Desktop nav tabs — hidden on mobile */}
          <nav className="hidden sm:flex items-center gap-0.5 ml-4 mr-auto" aria-label="Main navigation">
            {TABS.map(({ id, label, Icon, path }) => (
              <button
                key={id}
                onClick={() => navigate(path)}
                aria-current={active === id ? "page" : undefined}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  active === id
                    ? "bg-blue-600/20 text-blue-400 border border-blue-700/40"
                    : "text-gray-400 hover:text-white hover:bg-gray-800 border border-transparent"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </nav>

          {/* Spacer on mobile (avatar right-aligns naturally) */}
          <div className="flex-1 sm:hidden" />

          {/* User avatar */}
          <button
            onClick={() => navigate("/account")}
            className="w-8 h-8 rounded-xl bg-blue-700 hover:bg-blue-600 flex items-center justify-center text-white text-[11px] font-extrabold tracking-wide transition-colors flex-shrink-0"
            aria-label="Account"
          >
            {initials}
          </button>
        </div>
      </header>

      {/* ── Mobile fixed bottom tab bar ──────────────────────────────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 sm:hidden bg-gray-950/95 border-t border-gray-800 backdrop-blur-md"
        aria-label="Mobile navigation"
      >
        <div className="flex h-14">
          {TABS.map(({ id, label, Icon, path }) => {
            const isActive = active === id;
            return (
              <button
                key={id}
                onClick={() => navigate(path)}
                aria-current={isActive ? "page" : undefined}
                className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors active:scale-95 ${
                  isActive ? "text-blue-400" : "text-gray-600"
                }`}
              >
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-500 rounded-full" />
                )}
                <Icon className="w-[16px] h-[16px]" />
                <span className="text-[8px] font-bold tracking-wide leading-none">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>

    </>
  );
}
