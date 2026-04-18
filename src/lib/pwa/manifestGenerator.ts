/**
 * PWA Manifest Generator
 *
 * Builds a Web App Manifest object for a single tenant store.
 * Called by the /manifest.webmanifest route handler.
 *
 * Spec:
 *   - 192, 512, 180 (apple touch) icon sizes
 *   - Standalone display mode
 *   - Per-store name / short_name / theme_color
 *   - Shortcuts built via shortcutsBuilder.ts (Menu shortcut on day one)
 */

import { buildShortcuts, type ShortcutStoreInfo } from './shortcutsBuilder';

export interface ManifestStoreInput {
    id: string | number;
    /** Full display name shown under the icon and in the app switcher. */
    displayName: string;
    /** Optional short name (max 12 chars recommended). Falls back to first word of displayName. */
    shortName?: string;
    /** Theme color for browser chrome — hex, e.g., "#0f172a". */
    themeColor?: string;
    /** Background color for splash screen — hex. */
    backgroundColor?: string;
    /** Origin of this tenant, e.g., "https://joespizza.menulist.ai". Currently unused
     *  by buildManifest() — kept for forward-compat with absolute-URL shortcuts. */
    origin?: string;
    /** Start URL path, defaults to '/'. */
    startUrl?: string;
    /** Shortcut info (phone / mapsUrl) — omit to render only the Menu shortcut. */
    shortcutInfo?: ShortcutStoreInfo;
}

export interface WebAppManifest {
    name: string;
    short_name: string;
    id: string;
    start_url: string;
    scope: string;
    display: 'standalone';
    orientation: 'portrait-primary';
    theme_color: string;
    background_color: string;
    lang: string;
    dir: 'ltr';
    icons: Array<{
        src: string;
        sizes: string;
        type: string;
        purpose?: string;
    }>;
    shortcuts?: Array<{
        name: string;
        short_name?: string;
        description?: string;
        url: string;
    }>;
}

/**
 * Derive a short name from the full display name if no explicit override.
 * Trims to 12 chars to meet most OS home-screen label budgets.
 */
function deriveShortName(displayName: string, override?: string): string {
    if (override && override.trim().length > 0) return override.trim().slice(0, 12);
    const firstWord = displayName.split(/\s+/)[0] || displayName;
    return firstWord.slice(0, 12);
}

export function buildManifest(input: ManifestStoreInput): WebAppManifest {
    const startUrl = input.startUrl && input.startUrl.length > 0 ? input.startUrl : '/';
    const shortName = deriveShortName(input.displayName, input.shortName);
    const themeColor = input.themeColor || '#0f172a';
    const backgroundColor = input.backgroundColor || '#ffffff';

    // Icon endpoint — same-origin, so subdomain/custom-domain routing works.
    const iconBase = `/api/app-icons/${input.id}`;

    const icons: WebAppManifest['icons'] = [
        { src: `${iconBase}/192`, sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: `${iconBase}/512`, sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: `${iconBase}/192`, sizes: '192x192', type: 'image/png', purpose: 'maskable' },
        { src: `${iconBase}/512`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ];

    const shortcuts = input.shortcutInfo
        ? buildShortcuts(input.shortcutInfo)
        : buildShortcuts({ menuPath: startUrl });

    return {
        name: input.displayName,
        short_name: shortName,
        id: `/?store=${input.id}`,
        start_url: startUrl,
        scope: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        theme_color: themeColor,
        background_color: backgroundColor,
        lang: 'en',
        dir: 'ltr',
        icons,
        shortcuts,
    };
}
