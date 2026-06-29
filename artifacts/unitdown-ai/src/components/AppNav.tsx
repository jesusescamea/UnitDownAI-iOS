/**
 * AppNav — UnitDown 2.0 shared navigation bar.
 * Used by every authenticated page for consistent top-level chrome.
 */
import { useLocation } from "wouter";
import { ThermometerSnowflake, LayoutGrid, Briefcase, Wrench, User } from "lucide-react";
import { useUser } from "@clerk/clerk-react";

export type AppNavSection = "dashboard" | "job" | "records" | "account";

interface AppNavProps {
  active?: AppNavSection;
}

export function AppNav({ active }: AppNavProps) {
  const [, navigate] = useLocation();
  const { user } = useUser();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2"
        >
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
            <ThermometerSnowflake className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-extrabold text-slate-900 tracking-tight">
            UnitDown
          </span>
          <span className="hidden sm:inline text-xs font-semibold text-blue-600 bg-blue-50 rounded px-1.5 py-0.5 ml-0.5">
            2.0
          </span>
        </button>

        {/* Nav tabs */}
        <nav className="flex items-center gap-0.5">
          <NavBtn
            icon={<LayoutGrid className="w-3.5 h-3.5" />}
            label="Hub"
            active={active === "dashboard"}
            onClick={() => navigate("/dashboard")}
          />
          <NavBtn
            icon={<Briefcase className="w-3.5 h-3.5" />}
            label="Jobs"
            active={active === "job"}
            onClick={() => navigate("/job")}
          />
          <NavBtn
            icon={<Wrench className="w-3.5 h-3.5" />}
            label="Equipment"
            active={active === "records"}
            onClick={() => navigate("/records")}
          />
          <NavBtn
            icon={<User className="w-3.5 h-3.5" />}
            label={user?.firstName ?? "Account"}
            active={active === "account"}
            onClick={() => navigate("/account")}
          />
        </nav>
      </div>
    </header>
  );
}

function NavBtn({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
        active
          ? "text-blue-600 bg-blue-50"
          : "text-slate-600 hover:text-blue-600 hover:bg-blue-50"
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
