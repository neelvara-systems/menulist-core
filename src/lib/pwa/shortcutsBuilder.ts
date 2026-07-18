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

function withEntrySource(url: string, entrySource: string): string {
  // Preserve existing query string if any.
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}entry_source=shortcut-${entrySource}`;
}

/**
 * Build the shortcuts list for a store's manifest.
 */
export function buildShortcuts(info: ShortcutStoreInfo): ManifestShortcut[] {
  const shortcuts: ManifestShortcut[] = [];

  const menuPath = info.menuPath?.trim();
  if (menuPath) {
    shortcuts.push({
      name: 'View Menu',
      short_name: 'Menu',
      description: 'Open the menu',
      url: withEntrySource(menuPath, 'menu'),
    });
  }

  if (info.phone) {
    shortcuts.push({
      name: 'Call',
      short_name: 'Call',
      description: 'Call the restaurant',
      // tel: links don't support query params reliably; we keep a same-origin
      // redirect URL instead so the analytics event can fire before the tel: handoff.
      url: withEntrySource('/pwa/call', 'call'),
    });
  }

  if (info.mapsUrl) {
    shortcuts.push({
      name: 'Directions',
      short_name: 'Directions',
      description: 'Get directions',
      url: withEntrySource('/pwa/directions', 'directions'),
    });
  }

  if (info.whatsappNumber) {
    shortcuts.push({
      name: 'WhatsApp',
      short_name: 'WhatsApp',
      description: 'Message on WhatsApp',
      url: withEntrySource('/pwa/whatsapp', 'whatsapp'),
    });
  }

  if (info.reservationUrl) {
    shortcuts.push({
      name: 'Book a Table',
      short_name: 'Reserve',
      description: 'Make a reservation',
      // Same same-origin handoff pattern as call/whatsapp — event first, then redirect.
      url: withEntrySource('/pwa/reservation', 'reservation'),
    });
  }

  if (info.orderUrl) {
    shortcuts.push({
      name: 'Order Online',
      short_name: 'Order',
      description: 'Order for delivery or pickup',
      url: withEntrySource('/pwa/order', 'order'),
    });
  }

  // Android Chrome caps shortcuts at 4. We pass more and let the browser
  // pick the first 4 — owners who care can ask us to reorder in future.
  return shortcuts;
}
