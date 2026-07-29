/**
 * PWA Shortcut Source Detector
 *
 * Reads the ?entry_source=shortcut-{menu|call|directions} URL parameter that the
 * manifest shortcuts embed, and fires the matching Customer App event.
 *
 * Only fires in standalone mode to avoid counting regular web visits.
 */

import { getSessionId } from '@lib/analytics/session';
import { getTenantStoreStorageKey } from '@lib/browserStorage/tenantStoreKey';
import { trackEvent, TrackingEvent } from '@lib/analytics/unified';
import { detectInstalled } from './installDetection';
import { getBoundedPwaStringContext, logPwaTrackingFailure } from './pwaDiagnostics';
import { parseCanonicalPwaTimestamp } from './storageValue';

export type ShortcutSource =
  | 'menu'
  | 'call'
  | 'directions'
  | 'whatsapp'
  | 'reservation'
  | 'order';

// One distinct event per shortcut — the dashboard breakdown needs a per-key
// bucket. Previous versions aliased `whatsapp` into the CALL event; the
// whatsapp column on the dashboard was therefore always zero. Fixed below.
const SHORTCUT_EVENT_MAP: Record<ShortcutSource, TrackingEvent> = {
  menu: TrackingEvent.CUSTOMER_APP_SHORTCUT_MENU,
  call: TrackingEvent.CUSTOMER_APP_SHORTCUT_CALL,
  whatsapp: TrackingEvent.CUSTOMER_APP_SHORTCUT_WHATSAPP,
  directions: TrackingEvent.CUSTOMER_APP_SHORTCUT_DIRECTIONS,
  reservation: TrackingEvent.CUSTOMER_APP_SHORTCUT_RESERVATION,
  order: TrackingEvent.CUSTOMER_APP_SHORTCUT_ORDER,
};

let reportedShortcutSourceParseFailure = false;
const shortcutTrackingInFlight = new Set<string>();
const SHORTCUT_FIRED_SESSION_KEY_PREFIX = 'menulist_customerApp_shortcutFired';

function logShortcutSourceParseFailure(error: unknown, search: string): void {
  if (reportedShortcutSourceParseFailure) return;
  reportedShortcutSourceParseFailure = true;

  logPwaTrackingFailure('customer_app_shortcut_source_parse_failed', error, {
    ...getBoundedPwaStringContext('search', search),
  });
}

/**
 * Parse ?entry_source=shortcut-xxx from the current URL and return the source,
 * or null if not present or not a recognized value.
 */
export function parseShortcutSource(search: string): ShortcutSource | null {
  if (!search) return null;
  try {
    const params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`);
    const raw = params.get('entry_source');
    if (!raw) return null;
    const match = raw.match(/^shortcut-(menu|call|directions|whatsapp|reservation|order)$/);
    if (!match) return null;
    return match[1] as ShortcutSource;
  } catch (error) {
    logShortcutSourceParseFailure(error, search);
    return null;
  }
}

export interface ShortcutDetectorOptions {
  tenantId?: string | number;
  storeTimeZone?: string;
  businessDayEndTime?: string;
  /** Owner opt-out flag; explicit `false` suppresses all events. */
  trackingEnabled?: boolean;
  includeLocation?: boolean;
}

/**
 * Read the current URL, and if it was launched from a PWA shortcut in
 * standalone mode, fire the matching analytics event.
 *
 * @returns the shortcut source that was tracked, or null if no event was fired.
 */
export async function detectAndTrackShortcutLaunch(
  storeId: string | number,
  options: ShortcutDetectorOptions = {},
): Promise<ShortcutSource | null> {
  if (options.trackingEnabled === false) return null;
  if (typeof window === 'undefined') return null;
  if (!detectInstalled()) return null;

  const { tenantId, storeTimeZone, businessDayEndTime, includeLocation = false } = options;

  const source = parseShortcutSource(window.location.search);
  if (!source) return null;
  const shortcutScopeKey = getTenantStoreStorageKey(
    `${SHORTCUT_FIRED_SESSION_KEY_PREFIX}_${source}`,
    tenantId,
    storeId,
  );
  if (!shortcutScopeKey) {
    logPwaTrackingFailure('customer_app_shortcut_scope_invalid', new Error('Invalid shortcut scope'), {
      ...getBoundedPwaStringContext('storeId', storeId),
      ...getBoundedPwaStringContext('tenantId', tenantId),
      ...getBoundedPwaStringContext('shortcutSource', source),
    });
    return null;
  }
  try {
    const rawCompletion = window.sessionStorage.getItem(shortcutScopeKey);
    if (rawCompletion) {
      if (parseCanonicalPwaTimestamp(rawCompletion) !== null) return null;
      window.sessionStorage.removeItem(shortcutScopeKey);
    }
  } catch (error) {
    logPwaTrackingFailure('customer_app_shortcut_session_guard_failed', error, {
      ...getBoundedPwaStringContext('storeId', storeId),
      ...getBoundedPwaStringContext('tenantId', tenantId),
      ...getBoundedPwaStringContext('shortcutSource', source),
    });
  }
  if (shortcutTrackingInFlight.has(shortcutScopeKey)) return null;
  shortcutTrackingInFlight.add(shortcutScopeKey);

  try {
    await trackEvent(SHORTCUT_EVENT_MAP[source], {
      storeId: String(storeId),
      tenantId,
      sessionId: getSessionId(),
      storeTimeZone,
      businessDayEndTime,
      includeLocation,
    });
    try {
      window.sessionStorage.setItem(shortcutScopeKey, String(Date.now()));
    } catch (error) {
      logPwaTrackingFailure('customer_app_shortcut_session_guard_failed', error, {
        ...getBoundedPwaStringContext('storeId', storeId),
        ...getBoundedPwaStringContext('tenantId', tenantId),
        ...getBoundedPwaStringContext('shortcutSource', source),
      });
    }
    return source;
  } catch (err) {
    logPwaTrackingFailure('customer_app_shortcut_tracking_failed', err, {
      ...getBoundedPwaStringContext('storeId', storeId),
      ...getBoundedPwaStringContext('tenantId', tenantId),
      ...getBoundedPwaStringContext('shortcutSource', source),
      hasStoreTimeZone: Boolean(storeTimeZone),
      hasBusinessDayEndTime: Boolean(businessDayEndTime),
      includeLocation,
    });
    return null;
  } finally {
    shortcutTrackingInFlight.delete(shortcutScopeKey);
  }
}
