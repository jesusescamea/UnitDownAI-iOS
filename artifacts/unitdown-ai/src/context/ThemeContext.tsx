import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";
import { applyTheme, applyFieldMode } from "@/lib/theme";

export type ThemeMode = "standard" | "dark" | "field";

const PREFS_KEY = "unitdown_prefs";

function readThemeFromStorage(): ThemeMode {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    const prefs = raw ? (JSON.parse(raw) as { darkMode?: boolean; fieldMode?: boolean }) : {};
    if (prefs.fieldMode) return "field";
    if (prefs.darkMode) return "dark";
    return "standard";
  } catch {
    return "standard";
  }
}

function writeThemeToStorage(mode: ThemeMode): void {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    const prefs = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    localStorage.setItem(
      PREFS_KEY,
      JSON.stringify({ ...prefs, darkMode: mode === "dark", fieldMode: mode === "field" })
    );
  } catch {}
}

interface ThemeContextValue {
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "standard",
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(readThemeFromStorage);

  const setTheme = useCallback((next: ThemeMode) => {
    setThemeState(next);
    writeThemeToStorage(next);
    if (next === "field") {
      applyFieldMode(true);
    } else if (next === "dark") {
      applyTheme(true);
      applyFieldMode(false);
    } else {
      applyTheme(false);
      applyFieldMode(false);
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
