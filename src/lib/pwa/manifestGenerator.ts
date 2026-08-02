/**
 * PWA Manifest Generator
 *
 * Builds a Web App Manifest object for a single tenant store.
 * Called by the /manifest.webmanifest route handler.
 *
 * Spec:
 *   - Common iOS/Android app icon sizes through the dynamic icon endpoint
 *   - Standalone display mode
 *   - Per-store name / short_name / theme_color
 *   - Store-level app identity; install source paths remain analytics context
 *   - Shortcuts built via shortcutsBuilder.ts (Menu shortcut on day one)
 */

import { APP_THEME_COLOR } from '@constant/common';
import {
    createPublicCustomerTranslator,
    getPublicCustomerLanguageDirection,
} from '@lib/localization/publicCustomerMessages';
import { normalizePublicLanguageCode } from '@lib/localization/publicRenderLanguage';
import { normalizePublicAccentColor } from '@lib/obp/accentColor';
import { deriveCustomerAppShortName, getCustomerAppIconUrl } from './customerAppAssets';
import { buildStoreManifestId } from './manifestIdentity';
import { buildShortcuts, type ShortcutStoreInfo } from './shortcutsBuilder';

export interface ManifestStoreInput {
    id: string | number;
    /** Full display name shown under the icon and in the app switcher. */
    displayName: string;
    /** Optional short name (max 12 chars recommended). Falls back to first word of displayName. */
    shortName?: string;
    /** Theme color for browser chrome — hex, e.g., "#0054D0". */
    themeColor?: string;
    /** Background color for splash screen — hex. */
    backgroundColor?: string;
    /** Origin of this tenant, e.g., "https://joespizza.menulist.online". Currently unused
     *  by buildManifest() — kept for forward-compat with absolute-URL shortcuts. */
    origin?: string;
    /** Store-level launch URL path, defaults to '/'. */
    startUrl?: string;
    /** Owner-controlled public language used by install and shortcut chrome. */
    language?: string;
    /** Shortcut info (phone / mapsUrl) — omit to render only the Menu shortcut. */
    shortcutInfo?: ShortcutStoreInfo;
    /** Short description rendered by Android Chrome's install dialog and PWA listings. */
    description?: string;
    /** Cache-busting marker for app icon URLs. */
    iconVersion?: string;
    /**
     * Optional categories — defaults to `['food', 'business', 'lifestyle']` which
     * covers restaurants, food trucks, bakeries, and similar SMB verticals. Callers
     * can pass a specific list based on business type if needed.
     */
    categories?: string[];
}

export interface WebAppManifest {
    name: string;
    short_name: string;
    id: string;
    start_url: string;
    scope: string;
    display: 'standalone';
    launch_handler?: {
        client_mode: 'auto' | 'navigate-existing' | 'navigate-new' | 'focus-existing' | Array<'auto' | 'navigate-existing' | 'navigate-new' | 'focus-existing'>;
    };
    orientation: 'portrait-primary';
    theme_color: string;
    background_color: string;
    lang: string;
    dir: 'ltr' | 'rtl';
    /**
     * Categories — helps PWA listings (Android "Installed Apps" / curated PWA
     * directories) classify the app. Restaurant-specific defaults.
     */
    categories?: string[];
    /**
     * Description used in the browser install dialog (Android Chrome) and in
     * some PWA listings. Kept short; most browsers truncate past ~80 chars.
     */
    description?: string;
    icons: Array<{
        src: string;
        sizes: string;
        type: string;
        purpose?: string;
    }>;
    /**
     * Screenshots shown by Android Chrome's "richer install UI" (as of Chrome
     * 106+). When at least one `form_factor: 'narrow'` screenshot is provided,
     * the install dialog upgrades from a minimal prompt to a Play-Store-style
     * preview card — historically lifts install rate 2–3×.
     */
    screenshots?: Array<{
        src: string;
        sizes: string;
        type: string;
        form_factor: 'narrow' | 'wide';
        label?: string;
    }>;
    shortcuts?: Array<{
        name: string;
        short_name?: string;
        description?: string;
        url: string;
    }>;
}

export function buildManifest(input: ManifestStoreInput): WebAppManifest {
    const startUrl = input.startUrl && input.startUrl.length > 0 ? input.startUrl : '/';
    const activeLanguage = normalizePublicLanguageCode(input.language) || 'en';
    const t = createPublicCustomerTranslator(activeLanguage);
    const shortName = deriveCustomerAppShortName(input.displayName, input.shortName);
    const themeColor = normalizePublicAccentColor(input.themeColor) || APP_THEME_COLOR;
    const backgroundColor = normalizePublicAccentColor(input.backgroundColor) || '#ffffff';

    // Customer App identity is store-level: installing from OBP, `/menu`, or
    // a project URL must resolve to the same restaurant app. Source path stays
    // analytics context only; it never enters manifest identity.
    const manifestId = buildStoreManifestId(input.id);

    // Icon endpoint — same-origin, so subdomain/custom-domain routing works.
    const iconUrl = (size: number) => getCustomerAppIconUrl(input.id, size, input.iconVersion);

    const icons: WebAppManifest['icons'] = [
        { src: iconUrl(180), sizes: '180x180', type: 'image/png', purpose: 'any' },
        { src: iconUrl(192), sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: iconUrl(384), sizes: '384x384', type: 'image/png', purpose: 'any' },
        { src: iconUrl(512), sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: iconUrl(192), sizes: '192x192', type: 'image/png', purpose: 'maskable' },
        { src: iconUrl(512), sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ];

    const shortcuts = input.shortcutInfo
        ? buildShortcuts(input.shortcutInfo, activeLanguage)
        : buildShortcuts({ menuPath: startUrl }, activeLanguage);

    // Screenshots — one narrow (phone) and one wide (desktop) sourced from our
    // dynamic screenshot endpoint. Android Chrome uses `narrow` for the richer
    // install UI; desktop Chrome uses `wide` in its install dialog.
    const screenshotBase = `/api/app-screenshots/${input.id}`;
    const screenshots: WebAppManifest['screenshots'] = [
        {
            src: `${screenshotBase}/narrow`,
            sizes: '1080x1920',
            type: 'image/png',
            form_factor: 'narrow',
            label: `${input.displayName} — ${t('menu.menuOffering')}`,
        },
        {
            src: `${screenshotBase}/wide`,
            sizes: '1920x1080',
            type: 'image/png',
            form_factor: 'wide',
            label: `${input.displayName} — ${t('menu.menuOffering')}`,
        },
    ];

    const categories =
        input.categories && input.categories.length > 0
            ? input.categories
            : ['food', 'business', 'lifestyle'];

    return {
        name: input.displayName,
        short_name: shortName,
        id: manifestId,
        start_url: startUrl,
        scope: '/',
        display: 'standalone',
        // Chromium launch handling: keep in-scope launches inside the installed
        // app window when possible instead of handing them back to the browser.
        launch_handler: {
            client_mode: 'navigate-existing',
        },
        orientation: 'portrait-primary',
        theme_color: themeColor,
        background_color: backgroundColor,
        lang: activeLanguage,
        dir: getPublicCustomerLanguageDirection(activeLanguage),
        categories,
        ...(input.description ? { description: input.description } : {}),
        icons,
        screenshots,
        shortcuts,
    };
}
