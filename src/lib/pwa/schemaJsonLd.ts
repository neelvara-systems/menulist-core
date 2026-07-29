/**
 * Schema.org JSON-LD for the Customer App (PWA)
 *
 * Tells search engines that this menu page is ALSO an installable
 * MobileApplication — helps Google / Bing / curated PWA directories surface
 * the install option in rich results.
 *
 * Spec references:
 *   - https://schema.org/MobileApplication
 *   - https://developers.google.com/search/docs/appearance/structured-data/software-app
 *
 * We use `WebApplication` specifically because the app is a PWA (not a native
 * binary distributed via an app store). This avoids the "appStore" /
 * "downloadUrl" requirements tied to MobileApplication.
 */

import { normalizePublicAccentColor } from '@lib/obp/accentColor';

export interface MobileAppSchemaInput {
    /** Store display name used as app name. */
    name: string;
    /** Short tagline or description; keep under ~160 chars. */
    description: string;
    /** Same-origin base URL, e.g. `https://joespizza.menulist.ai`. */
    baseUrl: string;
    /** Optional primary category — defaults to `FoodEstablishment`. */
    applicationCategory?: string;
    /** Optional theme/accent color (hex) used for branding metadata. */
    themeColor?: string;
}

export function buildMobileAppSchema(input: MobileAppSchemaInput): Record<string, unknown> {
    const {
        name,
        description,
        baseUrl,
        applicationCategory = 'FoodAndDrinkApplication',
        themeColor: rawThemeColor,
    } = input;
    const themeColor = normalizePublicAccentColor(rawThemeColor);

    // Canonical manifest and screenshot URLs — same-origin, server-agnostic.
    const manifestUrl = `${baseUrl.replace(/\/$/, '')}/manifest.webmanifest`;
    const screenshotNarrow = `${baseUrl.replace(/\/$/, '')}/api/app-screenshots/_latest/narrow`;

    return {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name,
        description,
        url: baseUrl,
        applicationCategory,
        operatingSystem: 'Any',
        browserRequirements: 'Requires a modern browser (Chrome, Safari, Edge, Firefox)',
        // Free to install/use — most search engines require offers for rich results.
        offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
        },
        // Indicates installability (custom property — ignored by unsupported consumers).
        installUrl: manifestUrl,
        ...(themeColor ? { color: themeColor } : {}),
        screenshot: screenshotNarrow,
    };
}
