
"use client";

import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import {
  normalizeWebsiteThemePreference,
  WEBSITE_THEME_STORAGE_KEY,
  type WebsiteThemePreference,
} from '@lib/website/themePreference';

type Theme = WebsiteThemePreference;

interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined);
const reportedWebsiteThemeStorageFailures = new Set<'read' | 'remove' | 'write'>();

function logWebsiteThemeStorageFailure(operation: 'read' | 'remove' | 'write', error: unknown) {
  if (reportedWebsiteThemeStorageFailures.has(operation)) return;
  reportedWebsiteThemeStorageFailures.add(operation);
  logRuntimeFailure(`website_theme_storage_${operation}_failed`, error, {
    fallbackPolicy: operation === 'write' ? 'memory_only' : 'system_theme',
  });
}

function readStoredTheme(): Theme {
  try {
    const rawTheme = window.localStorage.getItem(WEBSITE_THEME_STORAGE_KEY);
    if (rawTheme === null) return 'system';

    const storedTheme = normalizeWebsiteThemePreference(rawTheme);
    if (storedTheme) return storedTheme;

    try {
      window.localStorage.removeItem(WEBSITE_THEME_STORAGE_KEY);
    } catch (error) {
      logWebsiteThemeStorageFailure('remove', error);
    }
  } catch (error) {
    logWebsiteThemeStorageFailure('read', error);
  }
  return 'system';
}

export function ThemeProvider({ children, forcedTheme }: { children: ReactNode; forcedTheme?: "light" | "dark" }) {
  const [mounted, setMounted] = useState(false);
  // Initialize theme state, trying to read from localStorage only on client
  const [theme, setThemeState] = useState<Theme>(() => {
    if (forcedTheme) return forcedTheme;
    if (typeof window === 'undefined') {
      return "system"; // Default for SSR
    }
    return readStoredTheme();
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const root = window.document.documentElement;
    let currentThemeToApply: "light" | "dark";

    if (forcedTheme) {
      currentThemeToApply = forcedTheme;
    } else if (theme === "system") {
      currentThemeToApply = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    } else {
      currentThemeToApply = theme;
    }

    root.classList.remove("light", "dark");
    root.classList.add(currentThemeToApply);
    if (!forcedTheme) {
      try {
        window.localStorage.setItem(WEBSITE_THEME_STORAGE_KEY, theme);
      } catch (error) {
        logWebsiteThemeStorageFailure('write', error);
      }
    }
  }, [theme, mounted, forcedTheme]);

  useEffect(() => {
    if (!mounted || theme !== "system" || forcedTheme) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      // This effect only re-applies the class if the *system* theme changed AND our current theme is "system"
      const root = window.document.documentElement;
      root.classList.remove("light", "dark");
      root.classList.add(mediaQuery.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme, mounted]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  // To prevent flash of unstyled content or incorrect theme on initial load,
  // we might return null until mounted, but this can affect SEO or cause layout shifts.
  // For this setup, we'll render children immediately.
  // Add suppressHydrationWarning to <html> tag in layout.tsx.
  // if (!mounted) { 
  //   return <div style={{ visibility: 'hidden' }}>{children}</div>; // Or some other placeholder
  // }


  return (
    <ThemeProviderContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
