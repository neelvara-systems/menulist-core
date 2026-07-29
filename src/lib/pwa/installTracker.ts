/**
 * PWA Install Tracker — Per-Device Deduplication
 *
 * Fires CUSTOMER_APP_INSTALLED exactly once per (device, tenant, store) via a localStorage
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
import { getTenantStoreStorageKey } from '@lib/browserStorage/tenantStoreKey';
import { trackEvent, TrackingEvent } from '@lib/analytics/unified';
import { detectPlatform } from './platformDetection';
import { getBoundedPwaStringContext, logPwaTrackingFailure } from './pwaDiagnostics';
import { detectInstallSurface } from './surfaceDetection';
import { parseCanonicalPwaTimestamp } from './storageValue';

const INSTALL_FIRED_KEY_PREFIX = 'menulist_customerApp_installFired_';
// Timestamp of the last prompt shown — used by the iOS inference heuristic in
// standaloneDetector.ts. Keyed by tenant/store so platform-host contexts cannot collide.
export const PROMPT_SHOWN_AT_KEY_PREFIX = 'menulist_customerApp_promptShownAt_';
const INSTALL_TRACKER_STORAGE_TEST_KEY = '__menulist_customer_app_install_test__';

type InstallStorageOperation =
  | 'install_dedupe_availability'
  | 'install_dedupe_read'
  | 'install_dedupe_write'
  | 'prompt_shown_write';
const reportedInstallStorageFailures = new Set<string>();

function logCustomerAppInstallStorageFailure(
  failureCode: string,
  operation: InstallStorageOperation,
  error: unknown,
  storeId: string | number,
  storageKey: string,
): void {
  const reportKey = `${failureCode}:${operation}`;
  if (reportedInstallStorageFailures.has(reportKey)) return;
  reportedInstallStorageFailures.add(reportKey);

  logPwaTrackingFailure(failureCode, error, {
    operation,
    ...getBoundedPwaStringContext('storeId', storeId),
    ...getBoundedPwaStringContext('storageKey', storageKey),
  });
}

function isStorageAvailable(context?: {
  operation: InstallStorageOperation;
  storeId: string | number;
  storageKey: string;
}): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(INSTALL_TRACKER_STORAGE_TEST_KEY, '1');
    window.localStorage.removeItem(INSTALL_TRACKER_STORAGE_TEST_KEY);
    return true;
  } catch (error) {
    if (context) {
      logCustomerAppInstallStorageFailure(
        context.operation === 'prompt_shown_write'
          ? 'customer_app_prompt_shown_storage_unavailable'
          : 'customer_app_install_dedupe_storage_unavailable',
        context.operation,
        error,
        context.storeId,
        context.storageKey,
      );
    }
    return false;
  }
}

export interface InstallTrackerOptions {
  /** Tenant id forwarded to the analytics event. */
  tenantId?: string | number;
  /** Store timezone used for local analytics day/hour bucketing. */
  storeTimeZone?: string;
  businessDayEndTime?: string;
  /** Owner opt-out flag. When explicitly `false` (trackMenuViews === false), the
   *  event is suppressed entirely, matching the OBP/menu-view privacy precedent. */
  trackingEnabled?: boolean;
  /** Whether approximate location may be collected for this event. */
  includeLocation?: boolean;
  /** Source of the install — native prompt, iOS prompted/manual heuristic, or unknown. */
  source?: 'native' | 'ios-inferred' | 'ios-standalone' | 'unknown';
}

/**
 * Fire CUSTOMER_APP_INSTALLED once per device per tenant/store.
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

  const { tenantId, storeTimeZone, businessDayEndTime, source = 'native', includeLocation = false } = options;
  const { platform } = detectPlatform();
  // Entry/source context only. Customer App identity is store-level, so this
  // does not create or imply separate installed apps per public route.
  const installSurface = detectInstallSurface();
  const key = getTenantStoreStorageKey(INSTALL_FIRED_KEY_PREFIX, tenantId, storeId);
  if (!key) {
    logPwaTrackingFailure('customer_app_install_scope_invalid', new Error('Invalid install scope'), {
      ...getBoundedPwaStringContext('storeId', storeId),
      ...getBoundedPwaStringContext('tenantId', tenantId),
    });
    return;
  }

  // Storage unavailable → still fire (privacy / SSR fallback), no dedup possible.
  if (!isStorageAvailable({ operation: 'install_dedupe_availability', storeId, storageKey: key })) {
    try {
      await trackEvent(TrackingEvent.CUSTOMER_APP_INSTALLED, {
        storeId: String(storeId),
        tenantId,
        sessionId: getSessionId(),
        storeTimeZone,
        businessDayEndTime,
        includeLocation,
        pwaPlatform: platform,
        pwaInstallSource: source,
        pwaInstallSurface: installSurface,
      });
    } catch (err) {
      logCustomerAppInstallTrackingFailure(err, {
        storeId,
        tenantId,
        storeTimeZone,
        businessDayEndTime,
        source,
        includeLocation,
        platform,
        installSurface,
        storageAvailable: false,
      });
    }
    return;
  }

  let installAlreadyRecorded = false;
  try {
    const raw = window.localStorage.getItem(key);
    installAlreadyRecorded = raw !== null && parseCanonicalPwaTimestamp(raw) !== null;
    if (raw !== null && !installAlreadyRecorded) {
      window.localStorage.removeItem(key);
    }
  } catch (error) {
    logCustomerAppInstallStorageFailure(
      'customer_app_install_dedupe_read_failed',
      'install_dedupe_read',
      error,
      storeId,
      key,
    );
  }

  if (installAlreadyRecorded) {
    // Already fired on this device for this store — suppress per dedup rule.
    return;
  }

  try {
    await trackEvent(TrackingEvent.CUSTOMER_APP_INSTALLED, {
      storeId: String(storeId),
      tenantId,
      sessionId: getSessionId(),
      storeTimeZone,
      businessDayEndTime,
      includeLocation,
      pwaPlatform: platform,
      pwaInstallSource: source,
      pwaInstallSurface: installSurface,
    });
  } catch (err) {
    // Non-fatal — analytics should never break the customer experience.
    logCustomerAppInstallTrackingFailure(err, {
      storeId,
      tenantId,
      storeTimeZone,
      businessDayEndTime,
      source,
      includeLocation,
      platform,
      installSurface,
      storageAvailable: true,
    });
    return;
  }

  try {
    window.localStorage.setItem(key, String(Date.now()));
  } catch (error) {
    logCustomerAppInstallStorageFailure(
      'customer_app_install_dedupe_write_failed',
      'install_dedupe_write',
      error,
      storeId,
      key,
    );
  }
}

function logCustomerAppInstallTrackingFailure(
  error: unknown,
  context: {
    storeId: string | number;
    tenantId?: string | number;
    storeTimeZone?: string;
    businessDayEndTime?: string;
    source: InstallTrackerOptions['source'];
    includeLocation: boolean;
    platform: string;
    installSurface: string;
    storageAvailable: boolean;
  },
): void {
  logPwaTrackingFailure('customer_app_install_tracking_failed', error, {
    ...getBoundedPwaStringContext('storeId', context.storeId),
    ...getBoundedPwaStringContext('tenantId', context.tenantId),
    ...getBoundedPwaStringContext('pwaPlatform', context.platform),
    ...getBoundedPwaStringContext('pwaInstallSource', context.source),
    ...getBoundedPwaStringContext('pwaInstallSurface', context.installSurface),
    hasStoreTimeZone: Boolean(context.storeTimeZone),
    hasBusinessDayEndTime: Boolean(context.businessDayEndTime),
    includeLocation: context.includeLocation,
    storageAvailable: context.storageAvailable,
  });
}

/**
 * Record the timestamp at which a prompt was shown on this device. Called by
 * InstallPrompt / visitCounter so the iOS inference heuristic can tell whether
 * a subsequent standalone launch was likely triggered by that prompt.
 */
export function recordPromptShown(
  tenantId: string | number,
  storeId: string | number,
): void {
  const storageKey = getTenantStoreStorageKey(PROMPT_SHOWN_AT_KEY_PREFIX, tenantId, storeId);
  if (!storageKey) return;
  const operation: InstallStorageOperation = 'prompt_shown_write';
  if (!isStorageAvailable({ operation, storeId, storageKey })) return;
  try {
    window.localStorage.setItem(
      storageKey,
      String(Date.now()),
    );
  } catch (error) {
    logCustomerAppInstallStorageFailure(
      'customer_app_prompt_shown_storage_write_failed',
      operation,
      error,
      storeId,
      storageKey,
    );
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
  } catch (error) {
    logCustomerAppInstallStorageFailure(
      'customer_app_install_dedupe_reset_failed',
      'install_dedupe_write',
      error,
      storeId,
      `${INSTALL_FIRED_KEY_PREFIX}${storeId}`,
    );
  }
}
