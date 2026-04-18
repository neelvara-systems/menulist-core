/**
 * PWA Visit Counter & Dismissal Suppression
 *
 * Tracks per-store visit count in localStorage to gate the install prompt.
 * Also records 30-day dismissal windows so dismissed prompts stay dismissed.
 *
 * Per spec:
 * - Show prompt on 3rd visit
 * - Suppress for 30 days after dismissal
 * - Never show if already installed (checked via installDetection.ts)
 *
 * Privacy: localStorage only — no server calls, no cross-site tracking.
 */

import { FEATURE_FLAGS } from '@config/features';

const VISIT_COUNT_KEY_PREFIX = 'menulist_customerApp_visits_';
const DISMISSED_AT_KEY_PREFIX = 'menulist_customerApp_dismissedAt_';
const DEFAULT_PROMPT_THRESHOLD = 3;
const DISMISS_SUPPRESSION_DAYS = 30;
const DISMISS_SUPPRESSION_MS = DISMISS_SUPPRESSION_DAYS * 24 * 60 * 60 * 1000;

function getPromptThreshold(): number {
  const v = FEATURE_FLAGS.CUSTOMER_APP_PROMPT_VISIT_THRESHOLD;
  if (typeof v === 'number' && Number.isFinite(v) && v > 0) return v;
  return DEFAULT_PROMPT_THRESHOLD;
}

function isStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const key = '__menulist_test__';
    window.localStorage.setItem(key, '1');
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/**
 * Increment the per-store visit counter and return the new total.
 * Safe no-op on server render or when localStorage is unavailable.
 */
export function incrementVisitCount(storeId: string | number): number {
  if (!isStorageAvailable()) return 0;
  const key = `${VISIT_COUNT_KEY_PREFIX}${storeId}`;
  try {
    const raw = window.localStorage.getItem(key);
    const current = raw ? parseInt(raw, 10) : 0;
    const next = Number.isFinite(current) ? current + 1 : 1;
    window.localStorage.setItem(key, String(next));
    return next;
  } catch {
    return 0;
  }
}

/**
 * Read the current visit count without incrementing.
 */
export function getVisitCount(storeId: string | number): number {
  if (!isStorageAvailable()) return 0;
  try {
    const raw = window.localStorage.getItem(`${VISIT_COUNT_KEY_PREFIX}${storeId}`);
    const n = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

/**
 * Record a dismissal timestamp for the 30-day suppression window.
 */
export function markPromptDismissed(storeId: string | number): void {
  if (!isStorageAvailable()) return;
  try {
    window.localStorage.setItem(`${DISMISSED_AT_KEY_PREFIX}${storeId}`, String(Date.now()));
  } catch {
    /* noop */
  }
}

/**
 * True if the prompt was dismissed within the last 30 days.
 */
export function isPromptSuppressedByDismissal(storeId: string | number): boolean {
  if (!isStorageAvailable()) return false;
  try {
    const raw = window.localStorage.getItem(`${DISMISSED_AT_KEY_PREFIX}${storeId}`);
    if (!raw) return false;
    const dismissedAt = parseInt(raw, 10);
    if (!Number.isFinite(dismissedAt)) return false;
    return Date.now() - dismissedAt < DISMISS_SUPPRESSION_MS;
  } catch {
    return false;
  }
}

/**
 * Direct-install intent from a URL query param.
 *
 * When an owner shares "install my app" via WhatsApp, QR, or a CTA button,
 * the landing URL includes `?pwa=install`. That signal is proof of explicit
 * intent — we bypass the visit-count gate and show the prompt immediately.
 *
 * The dismissal-window is still honored (if they dismissed recently, we don't
 * spam them — the owner can resend later).
 */
export function hasDirectInstallIntent(search?: string): boolean {
  const src = typeof search === 'string' ? search : (typeof window !== 'undefined' ? window.location.search : '');
  if (!src) return false;
  try {
    const params = new URLSearchParams(src.startsWith('?') ? src : `?${src}`);
    const v = params.get('pwa');
    return v === 'install' || v === '1' || v === 'true';
  } catch {
    return false;
  }
}

/**
 * Central gate for whether the install prompt can show right now.
 * Caller must ALSO check detectInstalled() — that is intentionally kept
 * separate so this module stays pure-storage and has no DOM dependency.
 *
 * When `directIntent` is true (e.g., `?pwa=install` was on the URL), skip
 * the visit-count threshold. We still respect the dismissal window to avoid
 * spamming customers who explicitly said "no" recently.
 */
export function canShowPrompt(storeId: string | number, directIntent: boolean = false): boolean {
  if (isPromptSuppressedByDismissal(storeId)) return false;
  if (directIntent) return true;
  const visits = getVisitCount(storeId);
  if (visits < getPromptThreshold()) return false;
  return true;
}

export { getPromptThreshold as getPwaVisitThreshold };
export const PWA_DISMISS_SUPPRESSION_DAYS = DISMISS_SUPPRESSION_DAYS;
