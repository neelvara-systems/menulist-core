/**
 * PWA Install Tracker — Per-Device Deduplication
 *
 * Fires CUSTOMER_APP_INSTALLED exactly once per (device, store) via a localStorage
 * guard. Reinstalls on the same device with browser data intact are suppressed.
 *
 * Dedup scenarios — full matrix documented in customer-app_impl.md:
 *   - First install: fires
 *   - Uninstall + reinstall (data intact): suppressed
 *   - Uninstall + data cleared / private browsing: fires again (accepted imprecision)
 *   - Browser update / OS upgrade (data retained): suppressed
 *   - Different browser same device: fires (new surface)
 *   - Different device: fires (expected)
 */

import { getSessionId } from '@lib/analytics/session';
import { trackEvent, TrackingEvent } from '@lib/analytics/unified';
import { detectPlatform } from './platformDetection';
import { detectInstallSurface } from './surfaceDetection';

const INSTALL_FIRED_KEY_PREFIX = 'menulist_customerApp_installFired_';
// Timestamp of the last prompt shown — used by the iOS inference heuristic in
// standaloneDetector.ts. Keyed per-store so different tenants don't collide.
export const PROMPT_SHOWN_AT_KEY_PREFIX = 'menulist_customerApp_promptShownAt_';

function isStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const k = '__menulist_test__';
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

export interface InstallTrackerOptions {
  /** Tenant id forwarded to the analytics event. */
  tenantId?: string | number;
  /** Owner opt-out flag. When explicitly `false` (trackMenuViews === false), the
   *  event is suppressed entirely, matching the OBP/menu-view privacy precedent. */
  trackingEnabled?: boolean;
  /** Whether approximate location may be collected for this event. */
  includeLocation?: boolean;
  /** Source of the install — native prompt, iOS prompted/manual heuristic, or unknown. */
  source?: 'native' | 'ios-inferred' | 'ios-standalone' | 'unknown';
}

/**
 * Fire CUSTOMER_APP_INSTALLED once per device per store.
 *
 * @param storeId  Numeric or string store id (used as localStorage key suffix)
 * @param options  Optional tenantId + owner-level trackingEnabled flag + source
 */
export async function fireInstalledEventOnce(
  storeId: string | number,
  options: InstallTrackerOptions = {},
): Promise<void> {
  // Owner-level privacy opt-out: if store.analytics.trackMenuViews === false,
  // Customer App analytics are suppressed too.
  if (options.trackingEnabled === false) return;

  const { tenantId, source = 'native', includeLocation = true } = options;
  const { platform } = detectPlatform();
  // T2-N-03 / §6 rule 4 PUBLIC-ROUTING-DOCTRINE: classify the surface the
  // customer was on when the install fired. Paired with G-03's per-surface
  // manifest, this lets the dashboard compute install conversion by surface.
  const installSurface = detectInstallSurface();

  // Storage unavailable → still fire (privacy / SSR fallback), no dedup possible.
  if (!isStorageAvailable()) {
    await trackEvent(TrackingEvent.CUSTOMER_APP_INSTALLED, {
      storeId: String(storeId),
      tenantId,
      sessionId: getSessionId(),
      includeLocation,
      pwaPlatform: platform,
      pwaInstallSource: source,
      pwaInstallSurface: installSurface,
    });
    return;
  }

  const key = `${INSTALL_FIRED_KEY_PREFIX}${storeId}`;
  try {
    if (window.localStorage.getItem(key)) {
      // Already fired on this device for this store — suppress per dedup rule.
      return;
    }

    await trackEvent(TrackingEvent.CUSTOMER_APP_INSTALLED, {
      storeId: String(storeId),
      tenantId,
      sessionId: getSessionId(),
      includeLocation,
      pwaPlatform: platform,
      pwaInstallSource: source,
      pwaInstallSurface: installSurface,
    });

    window.localStorage.setItem(key, String(Date.now()));
  } catch (err) {
    // Non-fatal — analytics should never break the customer experience.
    console.warn('[pwa] fireInstalledEventOnce failed:', err);
  }
}

/**
 * Record the timestamp at which a prompt was shown on this device. Called by
 * InstallPrompt / visitCounter so the iOS inference heuristic can tell whether
 * a subsequent standalone launch was likely triggered by that prompt.
 */
export function recordPromptShown(storeId: string | number): void {
  if (!isStorageAvailable()) return;
  try {
    window.localStorage.setItem(
      `${PROMPT_SHOWN_AT_KEY_PREFIX}${storeId}`,
      String(Date.now()),
    );
  } catch {
    /* noop */
  }
}

/**
 * Test/admin helper — clears the dedup key so the event can fire again.
 * Not used in production flows.
 */
export function resetInstallFiredFlag(storeId: string | number): void {
  if (!isStorageAvailable()) return;
  try {
    window.localStorage.removeItem(`${INSTALL_FIRED_KEY_PREFIX}${storeId}`);
  } catch {
    /* noop */
  }
}
