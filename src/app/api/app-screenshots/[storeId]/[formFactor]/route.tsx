/**
 * Dynamic PWA Screenshot Endpoint
 *
 * Route: /api/app-screenshots/{storeId}/{narrow|wide}
 *
 * Why this exists:
 *   Android Chrome upgrades the install dialog to a Play-Store-style preview
 *   card when the manifest includes `screenshots[]` entries (at least one
 *   `form_factor: 'narrow'`). Historically 2–3× install-rate uplift.
 *
 * Strategy (no native deps, no image library):
 *   - Generate a branded welcome card via Next.js ImageResponse
 *   - narrow = 1080×1920 (portrait phone)
 *   - wide   = 1920×1080 (landscape desktop)
 *   - Shows the store name, first-letter badge, accent color, and a CTA line
 *
 * Caching:
 *   - max-age=3600: browser re-checks after 1h
 *   - s-maxage=86400: Vercel edge caches 1 day
 *   - stale-while-revalidate=604800: serve stale for 1 week
 *
 * Future (deferred): if an owner uploads a real menu screenshot, we can
 * 302-redirect to it instead. For now, the generated preview is the floor.
 */

import { getStoreContextName } from '@lib/businessIdentity/names';
import { getPublicStoreById } from '@lib/firestore/clientStoreLookup';
import { getLocalizedText, getPrimaryLocalizedLanguage } from '@lib/localization/text';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { getClientIp, hashPublicRateLimitValue } from 'src/middleware/publicApi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SCREENSHOT_CACHE_CONTROL = 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800';
const STORE_ID_PATTERN = /^\d{1,20}$/;

type FormFactor = 'narrow' | 'wide';

function parseFormFactor(raw: string): FormFactor | null {
    if (raw === 'narrow' || raw === 'wide') return raw;
    return null;
}

function firstLetter(name: string): string {
    const trimmed = (name || '').trim();
    if (!trimmed) return 'M';
    return trimmed.charAt(0).toUpperCase();
}

function pickAccentColor(seed: string, override?: string): string {
    if (override && /^#[0-9a-f]{6}$/i.test(override)) return override;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = (hash << 5) - hash + seed.charCodeAt(i);
        hash |= 0;
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 65%, 45%)`;
}

function renderScreenshot(
    form: FormFactor,
    displayName: string,
    tagline: string,
    letter: string,
    accent: string,
) {
    const isNarrow = form === 'narrow';
    const width = isNarrow ? 1080 : 1920;
    const height = isNarrow ? 1920 : 1080;

    // Sizing scales off the shorter edge so wide and narrow layouts both feel balanced.
    const base = Math.min(width, height);
    const badgeSize = Math.round(base * 0.28);
    const letterFont = Math.round(badgeSize * 0.55);
    const nameFont = isNarrow ? Math.round(base * 0.065) : Math.round(base * 0.075);
    const taglineFont = isNarrow ? Math.round(base * 0.035) : Math.round(base * 0.04);

    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: isNarrow ? '80px 60px' : '80px 120px',
                background: `linear-gradient(180deg, ${accent} 0%, ${accent}dd 60%, #ffffff 100%)`,
                fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
                textAlign: 'center',
            }}
        >
            <div
                style={{
                    width: badgeSize,
                    height: badgeSize,
                    borderRadius: Math.round(badgeSize * 0.28),
                    background: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: accent,
                    fontSize: letterFont,
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                    marginBottom: Math.round(base * 0.06),
                }}
            >
                {letter}
            </div>

            <div
                style={{
                    fontSize: nameFont,
                    fontWeight: 700,
                    color: '#ffffff',
                    maxWidth: '90%',
                    lineHeight: 1.1,
                    marginBottom: Math.round(base * 0.03),
                    letterSpacing: '-0.02em',
                    display: 'flex',
                    textAlign: 'center',
                }}
            >
                {displayName}
            </div>

            <div
                style={{
                    fontSize: taglineFont,
                    color: '#ffffff',
                    opacity: 0.9,
                    maxWidth: '80%',
                    lineHeight: 1.35,
                    display: 'flex',
                    textAlign: 'center',
                }}
            >
                {tagline}
            </div>
        </div>
    );
}

async function shouldUseFallbackAsset(request: NextRequest, storeId: string): Promise<boolean> {
    if (!STORE_ID_PATTERN.test(storeId)) return true;

    const config = getRateLimitForFeature('PUBLIC_DYNAMIC_ASSET');
    const ipHash = hashPublicRateLimitValue(getClientIp(request));
    const limit = await checkRateLimit({
        key: `public-dynamic-asset:screenshot:${ipHash}`,
        ...config,
    });
    return !limit.allowed;
}

export async function GET(
    request: NextRequest,
    { params }: { params: { storeId: string; formFactor: string } },
) {
    const form = parseFormFactor(params.formFactor);
    if (!form) {
        return new Response('Unsupported screenshot form factor', { status: 404 });
    }

    const storeId = params.storeId;
    const width = form === 'narrow' ? 1080 : 1920;
    const height = form === 'narrow' ? 1920 : 1080;

    try {
        if (await shouldUseFallbackAsset(request, storeId)) {
            return new ImageResponse(renderScreenshot(form, 'Menu', 'Tap to explore', 'M', '#0f172a'), {
                width,
                height,
                headers: { 'Cache-Control': SCREENSHOT_CACHE_CONTROL },
            });
        }

        const store = await getPublicStoreById(storeId);
        if (!store) {
            return new ImageResponse(renderScreenshot(form, 'Menu', 'Tap to explore', 'M', '#0f172a'), {
                width,
                height,
                headers: { 'Cache-Control': SCREENSHOT_CACHE_CONTROL },
            });
        }

        const contentLanguage = store?.defaultLanguage || store?.activeLanguages?.[0] || store?.language || 'en';
        const displayName: string = getStoreContextName(store, 'Menu');
        const resolvedTagline = getLocalizedText(
            store?.tagline,
            contentLanguage,
            getPrimaryLocalizedLanguage(store?.tagline, contentLanguage),
            '',
        );
        const tagline: string = resolvedTagline.trim().length > 0
            ? resolvedTagline.trim().slice(0, 120)
            : 'Tap anywhere to explore the menu';
        const accent = pickAccentColor(
            `${storeId}:${displayName}`,
            typeof store?.publicPresence?.accentColor === 'string'
                ? store.publicPresence.accentColor
                : undefined,
        );
        const letter = firstLetter(displayName);

        return new ImageResponse(renderScreenshot(form, displayName, tagline, letter, accent), {
            width,
            height,
            headers: { 'Cache-Control': SCREENSHOT_CACHE_CONTROL },
        });
    } catch (err) {
        logRuntimeFailure('customer_app_screenshot_generation_failed', err, {
            formFactor: form,
            height,
            width,
            ...getBoundedRuntimeStringContext('storeId', storeId),
        });
        // Always return a render — never 500 for install flows.
        return new ImageResponse(renderScreenshot(form, 'Menu', 'Tap to explore', 'M', '#0f172a'), {
            width,
            height,
            headers: { 'Cache-Control': SCREENSHOT_CACHE_CONTROL },
        });
    }
}
