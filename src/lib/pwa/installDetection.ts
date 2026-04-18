/**
 * PWA Install Detection
 *
 * Detects whether the Customer App is currently running as an installed PWA
 * (standalone mode) vs. a regular browser tab.
 *
 * Used to:
 * - Suppress install prompt when already installed
 * - Fire CUSTOMER_APP_OPENED analytics event only on real app launches
 */

/**
 * BeforeInstallPromptEvent — not yet in TS lib DOM types
 */
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

/**
 * Check if the current page is running as an installed PWA.
 * Works on Android/Chrome (display-mode: standalone) and iOS Safari (navigator.standalone).
 */
export function detectInstalled(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    // Method 1 — Android / Chrome / Samsung Internet / desktop Edge
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

    // Method 2 — iOS Safari legacy flag
    const isIOSStandalone = (window.navigator as any).standalone === true;

    return Boolean(isStandalone || isIOSStandalone);
  } catch {
    return false;
  }
}

/**
 * Returns true if the browser supports the native beforeinstallprompt flow (Chromium).
 * iOS Safari does not support this — platform-specific instructions must be shown instead.
 */
export function supportsBeforeInstallPrompt(): boolean {
  if (typeof window === 'undefined') return false;
  return 'onbeforeinstallprompt' in window;
}
