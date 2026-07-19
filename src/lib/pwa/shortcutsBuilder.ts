/**
 * PWA Manifest Shortcuts Builder
 *
 * Produces the `shortcuts` array for a store's dynamic web app manifest.
 * Each shortcut's `url` carries an ?entry_source=shortcut-{kind} query param so the
 * shortcutSourceDetector can attribute the launch in analytics.
 *
 * Day-one shortcuts:
 *   - View Menu   (only when the public `/menu` entry resolves)
 *   - Call        (only if store has a phone)
 *   - Directions  (only if store has a mapsUrl or address with coords)
 *   - WhatsApp    (only if store has a WhatsApp number)
 *
 * No per-store icons on shortcuts (text-only) — keeps manifest lean and
 * avoids icon generation overhead.
 */

import { createPublicCustomerTranslator } from '@lib/localization/publicCustomerMessages';
import { appendPublicLanguageParam } from '@lib/localization/publicRenderLanguage';

export interface ShortcutStoreInfo {
  /** Resolvable public menu path. Null/empty omits the View Menu shortcut. */
  menuPath?: string | null;
  /** E.164 or national phone; if set, adds the Call shortcut. */
  phone?: string | null;
  /** Pre-built Google Maps URL; if set, adds the Directions shortcut. */
  mapsUrl?: string | null;
  /** WhatsApp number (with or without +, any format); if set, adds the WhatsApp shortcut. */
  whatsappNumber?: string | null;
  /** Reservation/booking URL (Dineout, OpenTable, own site); if set, adds Reservation shortcut. */
  reservationUrl?: string | null;
  /** Online ordering URL (Swiggy, Zomato, own site); if set, adds Order Online shortcut. */
  orderUrl?: string | null;
}

export interface ManifestShortcut {
  name: string;
  short_name?: string;
  description?: string;
  url: string;
}

function withEntrySource(
  url: string,
  entrySource: string,
  activeLanguage?: string | null,
): string {
  // Preserve existing query string if any.
  const localizedUrl = appendPublicLanguageParam(url, activeLanguage);
  const sep = localizedUrl.includes('?') ? '&' : '?';
  return `${localizedUrl}${sep}entry_source=shortcut-${entrySource}`;
}

/**
 * Build the shortcuts list for a store's manifest.
 */
export function buildShortcuts(
  info: ShortcutStoreInfo,
  activeLanguage?: string | null,
): ManifestShortcut[] {
  const t = createPublicCustomerTranslator(activeLanguage);
  const shortcuts: ManifestShortcut[] = [];

  const menuPath = info.menuPath?.trim();
  if (menuPath) {
    shortcuts.push({
      name: t('menu.menuOffering'),
      short_name: t('menu.menuOffering'),
      description: t('menu.menuOffering'),
      url: withEntrySource(menuPath, 'menu', activeLanguage),
    });
  }

  if (info.phone) {
    shortcuts.push({
      name: t('menu.call'),
      short_name: t('menu.call'),
      description: t('menu.call'),
      // tel: links don't support query params reliably; we keep a same-origin
      // redirect URL instead so the analytics event can fire before the tel: handoff.
      url: withEntrySource('/pwa/call', 'call', activeLanguage),
    });
  }

  if (info.mapsUrl) {
    shortcuts.push({
      name: t('menu.directions'),
      short_name: t('menu.directions'),
      description: t('menu.directions'),
      url: withEntrySource('/pwa/directions', 'directions', activeLanguage),
    });
  }

  if (info.whatsappNumber) {
    shortcuts.push({
      name: t('menu.whatsApp'),
      short_name: t('menu.whatsApp'),
      description: t('menu.whatsApp'),
      url: withEntrySource('/pwa/whatsapp', 'whatsapp', activeLanguage),
    });
  }

  if (info.reservationUrl) {
    shortcuts.push({
      name: t('menu.reserve'),
      short_name: t('menu.reserve'),
      description: t('menu.reserve'),
      // Same same-origin handoff pattern as call/whatsapp — event first, then redirect.
      url: withEntrySource('/pwa/reservation', 'reservation', activeLanguage),
    });
  }

  if (info.orderUrl) {
    shortcuts.push({
      name: t('menu.order'),
      short_name: t('menu.order'),
      description: t('menu.order'),
      url: withEntrySource('/pwa/order', 'order', activeLanguage),
    });
  }

  // Android Chrome caps shortcuts at 4. We pass more and let the browser
  // pick the first 4 — owners who care can ask us to reorder in future.
  return shortcuts;
}
