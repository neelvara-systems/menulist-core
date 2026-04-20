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
import { fireInstalledEventOnce, PROMPT_SHOWN_AT_KEY_PREFIX } from './installTracker';
import { detectPlatform } from './platformDetection';
import { detectInstallSurface } from './surfaceDetection';

const OPENED_FIRED_SESSION_KEY_PREFIX = 'menulist_customerApp_openedFired_';

// iOS never fires `appinstalled`. If an iOS device launches the app in
// standalone mode within this window of a prompt-shown event, we treat it as
// a confirmed install. 48h comfortably covers "saw prompt, decided later"
// without capturing unrelated re-opens weeks later.
const IOS_INSTALL_INFERENCE_WINDOW_MS = 48 * 60 * 60 * 1000;

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

  const { platform } = detectPlatform();
  // T2-N-03 / §6 rule 4: tag the launch surface. For installed PWAs this is
  // the pathname the manifest's start_url resolved to — lets the dashboard
  // verify the install_context == launch_context invariant (D-10).
  const launchSurface = detectInstallSurface();

  try {
    await trackEvent(TrackingEvent.CUSTOMER_APP_OPENED, {
      storeId: String(storeId),
      tenantId,
      sessionId: getSessionId(),
      pwaPlatform: platform,
      pwaInstallSurface: launchSurface,
    });

    // iOS install inference — closes the "iOS never fires appinstalled" gap.
    // Any first standalone launch on iOS is the best available install proxy:
    // Safari can only reach standalone mode after "Add to Home Screen".
    // If that launch happened shortly after our prompt, label it as
    // `ios-inferred`; otherwise keep it explicit as `ios-standalone` so the
    // dashboard can separate prompted installs from manual/share-link installs.
    if (platform === 'ios') {
      try {
        const promptShownRaw = window.localStorage.getItem(
          `${PROMPT_SHOWN_AT_KEY_PREFIX}${storeId}`,
        );
        const promptShownAt = promptShownRaw ? parseInt(promptShownRaw, 10) : 0;
        const source =
          Number.isFinite(promptShownAt) &&
            promptShownAt > 0 &&
            Date.now() - promptShownAt < IOS_INSTALL_INFERENCE_WINDOW_MS
            ? 'ios-inferred'
            : 'ios-standalone';

        void fireInstalledEventOnce(storeId, {
          tenantId,
          trackingEnabled: true,
          source,
        });
      } catch {
        /* non-fatal — analytics should never break the customer experience */
      }
    }

    return true;
  } catch (err) {
    console.warn('[pwa] detectAndTrackAppOpen failed:', err);
    return false;
  }
}
