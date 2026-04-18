/**
 * PWA Platform Detection
 *
 * Identifies the browser/OS combination so the install prompt can render
 * platform-specific instructions (iOS vs Android vs desktop).
 *
 * Privacy-safe — reads only navigator.userAgent; no fingerprinting.
 */

export type Platform = 'ios' | 'android' | 'desktop' | 'other';
export type Browser = 'safari' | 'chrome' | 'samsung' | 'firefox' | 'edge' | 'other';

export interface PlatformInfo {
  platform: Platform;
  browser: Browser;
  isMobile: boolean;
  supportsInstallPrompt: boolean;
}

/**
 * Detect the user's platform and browser.
 * Returns safe defaults on server render.
 */
export function detectPlatform(): PlatformInfo {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { platform: 'other', browser: 'other', isMobile: false, supportsInstallPrompt: false };
  }

  const ua = navigator.userAgent || '';

  // Platform
  let platform: Platform = 'other';
  if (/iPhone|iPad|iPod/i.test(ua)) platform = 'ios';
  else if (/Android/i.test(ua)) platform = 'android';
  else if (/Windows|Macintosh|Linux/i.test(ua)) platform = 'desktop';

  // Browser (order matters — Samsung/Edge inherit Chrome UA fragments)
  let browser: Browser = 'other';
  if (/SamsungBrowser/i.test(ua)) browser = 'samsung';
  else if (/EdgA?\//i.test(ua)) browser = 'edge';
  else if (/Firefox|FxiOS/i.test(ua)) browser = 'firefox';
  else if (/CriOS|Chrome/i.test(ua)) browser = 'chrome';
  else if (/Safari/i.test(ua)) browser = 'safari';

  const isMobile = platform === 'ios' || platform === 'android';

  // beforeinstallprompt is Chromium-only; iOS Safari and Firefox do not fire it
  const supportsInstallPrompt = 'onbeforeinstallprompt' in window;

  return { platform, browser, isMobile, supportsInstallPrompt };
}
