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
import { getBoundedPwaStringContext, logPwaTrackingFailure } from './pwaDiagnostics';

const VISIT_COUNT_KEY_PREFIX = 'menulist_customerApp_visits_';
const DISMISSED_AT_KEY_PREFIX = 'menulist_customerApp_dismissedAt_';
const VISIT_COUNTER_STORAGE_TEST_KEY = '__menulist_customer_app_prompt_test__';
const DEFAULT_PROMPT_THRESHOLD = 3;
const DISMISS_SUPPRESSION_DAYS = 30;
const DISMISS_SUPPRESSION_MS = DISMISS_SUPPRESSION_DAYS * 24 * 60 * 60 * 1000;

type PromptStorageOperation =
  | 'visit_increment'
  | 'visit_read'
  | 'dismissal_write'
  | 'dismissal_read';

const reportedPromptStorageFailures = new Set<string>();
let reportedDirectInstallIntentParseFailure = false;

function getPromptThreshold(): number {
  const v = FEATURE_FLAGS.CUSTOMER_APP_PROMPT_VISIT_THRESHOLD;
  if (typeof v === 'number' && Number.isFinite(v) && v > 0) return v;
  return DEFAULT_PROMPT_THRESHOLD;
}

function logPromptStorageFailure(
  failureCode: string,
  operation: PromptStorageOperation,
  error: unknown,
  storeId: string | number,
  storageKey: string,
): void {
  const reportKey = `${failureCode}:${operation}`;
  if (reportedPromptStorageFailures.has(reportKey)) return;
  reportedPromptStorageFailures.add(reportKey);

  logPwaTrackingFailure(failureCode, error, {
    operation,
    ...getBoundedPwaStringContext('storeId', storeId),
    ...getBoundedPwaStringContext('storageKey', storageKey),
  });
}

function isStorageAvailable(operation: PromptStorageOperation, storeId: string | number): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(VISIT_COUNTER_STORAGE_TEST_KEY, '1');
    window.localStorage.removeItem(VISIT_COUNTER_STORAGE_TEST_KEY);
    return true;
  } catch (error) {
    logPromptStorageFailure(
      'customer_app_prompt_storage_unavailable',
      operation,
      error,
      storeId,
      VISIT_COUNTER_STORAGE_TEST_KEY,
    );
    return false;
  }
}

function logDirectInstallIntentParseFailure(error: unknown, search: string): void {
  if (reportedDirectInstallIntentParseFailure) return;
  reportedDirectInstallIntentParseFailure = true;

  logPwaTrackingFailure('customer_app_direct_install_intent_parse_failed', error, {
    ...getBoundedPwaStringContext('search', search),
  });
}

/**
 * Increment the per-store visit counter and return the new total.
 * Safe no-op on server render or when localStorage is unavailable.
 */
export function incrementVisitCount(storeId: string | number): number {
  if (!isStorageAvailable('visit_increment', storeId)) return 0;
  const key = `${VISIT_COUNT_KEY_PREFIX}${storeId}`;
  try {
    const raw = window.localStorage.getItem(key);
    const current = raw ? parseInt(raw, 10) : 0;
    const next = Number.isFinite(current) ? current + 1 : 1;
    window.localStorage.setItem(key, String(next));
    return next;
  } catch (error) {
    logPromptStorageFailure(
      'customer_app_prompt_visit_increment_failed',
      'visit_increment',
      error,
      storeId,
      key,
    );
    return 0;
  }
}

/**
 * Read the current visit count without incrementing.
 */
export function getVisitCount(storeId: string | number): number {
  if (!isStorageAvailable('visit_read', storeId)) return 0;
  const key = `${VISIT_COUNT_KEY_PREFIX}${storeId}`;
  try {
    const raw = window.localStorage.getItem(key);
    const n = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(n) ? n : 0;
  } catch (error) {
    logPromptStorageFailure(
      'customer_app_prompt_visit_read_failed',
      'visit_read',
      error,
      storeId,
      key,
    );
    return 0;
  }
}

/**
 * Record a dismissal timestamp for the 30-day suppression window.
 */
export function markPromptDismissed(storeId: string | number): void {
  if (!isStorageAvailable('dismissal_write', storeId)) return;
  const key = `${DISMISSED_AT_KEY_PREFIX}${storeId}`;
  try {
    window.localStorage.setItem(key, String(Date.now()));
  } catch (error) {
    logPromptStorageFailure(
      'customer_app_prompt_dismissal_write_failed',
      'dismissal_write',
      error,
      storeId,
      key,
    );
  }
}

/**
 * True if the prompt was dismissed within the last 30 days.
 */
export function isPromptSuppressedByDismissal(storeId: string | number): boolean {
  if (!isStorageAvailable('dismissal_read', storeId)) return false;
  const key = `${DISMISSED_AT_KEY_PREFIX}${storeId}`;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return false;
    const dismissedAt = parseInt(raw, 10);
    if (!Number.isFinite(dismissedAt)) return false;
    return Date.now() - dismissedAt < DISMISS_SUPPRESSION_MS;
  } catch (error) {
    logPromptStorageFailure(
      'customer_app_prompt_dismissal_read_failed',
      'dismissal_read',
      error,
      storeId,
      key,
    );
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
  } catch (error) {
    logDirectInstallIntentParseFailure(error, src);
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
