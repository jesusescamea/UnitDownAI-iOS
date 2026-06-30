const PREFS_KEY = "unitdown_prefs";

/**
 * Adds or removes the `.dark` class on `<html>`.
 * The CSS in index.css uses `@custom-variant dark (&:is(.dark *))` so this
 * single class flip activates all dark-mode overrides app-wide.
 */
export function applyTheme(dark: boolean): void {
  if (dark) {
    document.documentElement.classList.add("dark");
    document.documentElement.classList.remove("field");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

/**
 * Adds or removes the `.field` class on `<html>` for Field Mode (High
 * Contrast). Field Mode is a light-mode variant; it removes .dark if present.
 */
export function applyFieldMode(field: boolean): void {
  if (field) {
    document.documentElement.classList.add("field");
    document.documentElement.classList.remove("dark");
  } else {
    document.documentElement.classList.remove("field");
  }
}

/**
 * Called once at startup (before React renders) to restore the user's saved
 * theme preference without a flash of the wrong theme.
 */
export function initTheme(): void {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    const prefs = raw
      ? (JSON.parse(raw) as { darkMode?: boolean; fieldMode?: boolean })
      : null;
    if (prefs?.fieldMode) {
      applyFieldMode(true);
    } else {
      applyTheme(prefs?.darkMode === true);
    }
  } catch {
    applyTheme(false);
  }
}
