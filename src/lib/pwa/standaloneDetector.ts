/**
 * PWA Standalone Detector
 *
 * Fires CUSTOMER_APP_OPENED exactly once per session when the Customer App
 * is launched in display-mode: standalone (i.e. from the home screen, not
 * via a browser tab).
 *
 * Rate-limiting is inherited from trackEvent() — but we add a sessionStorage
 * guard so page navigations within the same session don't re-fire.
 */

import { getSessionId } from '@lib/analytics/session';
import { trackEvent, TrackingEvent } from '@lib/analytics/unified';
import { detectInstalled } from './installDetection';

const OPENED_FIRED_SESSION_KEY_PREFIX = 'menulist_customerApp_openedFired_';

function isSessionStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const k = '__menulist_test__';
    window.sessionStorage.setItem(k, '1');
    window.sessionStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

export interface StandaloneDetectorOptions {
  tenantId?: string | number;
  /** Owner opt-out flag; explicit `false` suppresses all events. */
  trackingEnabled?: boolean;
}

/**
 * If running in standalone mode, fire CUSTOMER_APP_OPENED once per session.
 * No-op when running in a regular browser tab.
 *
 * @returns true if the event was fired, false otherwise.
 */
export async function detectAndTrackAppOpen(
  storeId: string | number,
  options: StandaloneDetectorOptions = {},
): Promise<boolean> {
  if (options.trackingEnabled === false) return false;
  if (!detectInstalled()) return false;

  const { tenantId } = options;

  // One fire per session per store — prevents SPA route changes from inflating opens
  if (isSessionStorageAvailable()) {
    const key = `${OPENED_FIRED_SESSION_KEY_PREFIX}${storeId}`;
    try {
      if (window.sessionStorage.getItem(key)) return false;
      window.sessionStorage.setItem(key, String(Date.now()));
    } catch {
      /* fall through and still fire */
    }
  }

  try {
    await trackEvent(TrackingEvent.CUSTOMER_APP_OPENED, {
      storeId: String(storeId),
      tenantId,
      sessionId: getSessionId(),
    });
    return true;
  } catch (err) {
    console.warn('[pwa] detectAndTrackAppOpen failed:', err);
    return false;
  }
}
