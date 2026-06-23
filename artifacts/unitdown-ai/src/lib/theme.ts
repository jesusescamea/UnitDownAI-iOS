const PREFS_KEY = "unitdown_prefs";

/**
 * Adds or removes the `.dark` class on `<html>`.
 * The CSS in index.css uses `@custom-variant dark (&:is(.dark *))` so this
 * single class flip activates all dark-mode overrides app-wide.
 */
export function applyTheme(dark: boolean): void {
  if (dark) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

/**
 * Called once at startup (before React renders) to restore the user's saved
 * theme preference without a flash of the wrong theme.
 */
export function initTheme(): void {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    const prefs = raw ? (JSON.parse(raw) as { darkMode?: boolean }) : null;
    applyTheme(prefs?.darkMode === true);
  } catch {
    applyTheme(false);
  }
}
