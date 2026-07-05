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
import { getBoundedPwaStringContext, logPwaTrackingFailure } from './pwaDiagnostics';

const OPENED_FIRED_SESSION_KEY_PREFIX = 'menulist_customerApp_openedFired_';
const STANDALONE_SESSION_STORAGE_TEST_KEY = '__menulist_customer_app_open_test__';
type CustomerAppOpenStorageOperation = 'session_availability' | 'session_guard' | 'ios_install_inference';
const reportedCustomerAppOpenStorageFailures = new Set<CustomerAppOpenStorageOperation>();

// iOS never fires `appinstalled`. If an iOS device launches the app in
// standalone mode within this window of a prompt-shown event, we treat it as
// a confirmed install. 48h comfortably covers "saw prompt, decided later"
// without capturing unrelated re-opens weeks later.
const IOS_INSTALL_INFERENCE_WINDOW_MS = 48 * 60 * 60 * 1000;

function logCustomerAppOpenStorageFailure(
  operation: CustomerAppOpenStorageOperation,
  failureCode: string,
  error: unknown,
  context: Record<string, boolean | number | string | null | undefined> = {},
): void {
  if (reportedCustomerAppOpenStorageFailures.has(operation)) return;
  reportedCustomerAppOpenStorageFailures.add(operation);

  logPwaTrackingFailure(failureCode, error, {
    operation,
    ...context,
  });
}

function getCustomerAppOpenStorageContext(
  storeId: string | number,
  tenantId: string | number | undefined,
  storageKey: string,
) {
  return {
    ...getBoundedPwaStringContext('storeId', storeId),
    ...getBoundedPwaStringContext('tenantId', tenantId),
    ...getBoundedPwaStringContext('storageKey', storageKey),
  };
}

function isSessionStorageAvailable(storeId: string | number, tenantId?: string | number): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.sessionStorage.setItem(STANDALONE_SESSION_STORAGE_TEST_KEY, '1');
    window.sessionStorage.removeItem(STANDALONE_SESSION_STORAGE_TEST_KEY);
    return true;
  } catch (error) {
    logCustomerAppOpenStorageFailure(
      'session_availability',
      'customer_app_open_session_storage_unavailable',
      error,
      getCustomerAppOpenStorageContext(storeId, tenantId, STANDALONE_SESSION_STORAGE_TEST_KEY),
    );
    return false;
  }
}

export interface StandaloneDetectorOptions {
  tenantId?: string | number;
  storeTimeZone?: string;
  businessDayEndTime?: string;
  /** Owner opt-out flag; explicit `false` suppresses all events. */
  trackingEnabled?: boolean;
  includeLocation?: boolean;
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

  const { tenantId, storeTimeZone, businessDayEndTime, includeLocation = false } = options;

  // One fire per session per store — prevents SPA route changes from inflating opens
  if (isSessionStorageAvailable(storeId, tenantId)) {
    const key = `${OPENED_FIRED_SESSION_KEY_PREFIX}${storeId}`;
    try {
      if (window.sessionStorage.getItem(key)) return false;
      window.sessionStorage.setItem(key, String(Date.now()));
    } catch (error) {
      logCustomerAppOpenStorageFailure(
        'session_guard',
        'customer_app_open_session_guard_failed',
        error,
        getCustomerAppOpenStorageContext(storeId, tenantId, key),
      );
    }
  }

  const { platform } = detectPlatform();
  // Entry/source context only. Store-level Customer App identity stays the
  // same whether the app opens at root, `/menu`, or a project path.
  const launchSurface = detectInstallSurface();

  try {
    await trackEvent(TrackingEvent.CUSTOMER_APP_OPENED, {
      storeId: String(storeId),
      tenantId,
      sessionId: getSessionId(),
      storeTimeZone,
      businessDayEndTime,
      includeLocation,
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
      const promptStorageKey = `${PROMPT_SHOWN_AT_KEY_PREFIX}${storeId}`;
      try {
        const promptShownRaw = window.localStorage.getItem(
          promptStorageKey,
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
          storeTimeZone,
          businessDayEndTime,
          trackingEnabled: true,
          includeLocation,
          source,
        });
      } catch (error) {
        logCustomerAppOpenStorageFailure(
          'ios_install_inference',
          'customer_app_ios_install_inference_storage_failed',
          error,
          getCustomerAppOpenStorageContext(storeId, tenantId, promptStorageKey),
        );
      }
    }

    return true;
  } catch (err) {
    logPwaTrackingFailure('customer_app_open_tracking_failed', err, {
      ...getBoundedPwaStringContext('storeId', storeId),
      ...getBoundedPwaStringContext('tenantId', tenantId),
      ...getBoundedPwaStringContext('pwaPlatform', platform),
      ...getBoundedPwaStringContext('pwaInstallSurface', launchSurface),
      hasStoreTimeZone: Boolean(storeTimeZone),
      hasBusinessDayEndTime: Boolean(businessDayEndTime),
      includeLocation,
    });
    return false;
  }
}
