/**
 * PWA Shortcut Source Detector
 *
 * Reads the ?source=shortcut-{menu|call|directions} URL parameter that the
 * manifest shortcuts embed, and fires the matching Customer App event.
 *
 * Only fires in standalone mode to avoid counting regular web visits.
 */

import { getSessionId } from '@lib/analytics/session';
import { trackEvent, TrackingEvent } from '@lib/analytics/unified';
import { detectInstalled } from './installDetection';

export type ShortcutSource = 'menu' | 'call' | 'directions' | 'whatsapp';

// WhatsApp launches are attributed to the CALL event bucket on purpose — both
// represent the same owner intent (customer-initiated contact) and expanding
// the analytics enum for a fourth variant adds writes without owner value.
const SHORTCUT_EVENT_MAP: Record<ShortcutSource, TrackingEvent> = {
  menu: TrackingEvent.CUSTOMER_APP_SHORTCUT_MENU,
  call: TrackingEvent.CUSTOMER_APP_SHORTCUT_CALL,
  whatsapp: TrackingEvent.CUSTOMER_APP_SHORTCUT_CALL,
  directions: TrackingEvent.CUSTOMER_APP_SHORTCUT_DIRECTIONS,
};

/**
 * Parse ?source=shortcut-xxx from the current URL and return the source,
 * or null if not present or not a recognized value.
 */
export function parseShortcutSource(search: string): ShortcutSource | null {
  if (!search) return null;
  try {
    const params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`);
    const raw = params.get('source');
    if (!raw) return null;
    const match = raw.match(/^shortcut-(menu|call|directions|whatsapp)$/);
    if (!match) return null;
    return match[1] as ShortcutSource;
  } catch {
    return null;
  }
}

export interface ShortcutDetectorOptions {
  tenantId?: string | number;
  /** Owner opt-out flag; explicit `false` suppresses all events. */
  trackingEnabled?: boolean;
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

  const { tenantId } = options;

  const source = parseShortcutSource(window.location.search);
  if (!source) return null;

  try {
    await trackEvent(SHORTCUT_EVENT_MAP[source], {
      storeId: String(storeId),
      tenantId,
      sessionId: getSessionId(),
    });
    return source;
  } catch (err) {
    console.warn('[pwa] detectAndTrackShortcutLaunch failed:', err);
    return null;
  }
}
