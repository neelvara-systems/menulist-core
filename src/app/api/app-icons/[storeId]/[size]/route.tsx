/**
 * Dynamic PWA Icon Endpoint
 *
 * Route: /api/app-icons/{storeId}/{size}
 *
 * Strategy:
 *   1. If the store has a `branding.pwaIconOverrideUrl` or a PNG/JPG `logoUrl`,
 *      302-redirect so Firebase Storage + CDN handle delivery (no CPU cost).
 *   2. Otherwise, generate a deterministic letter-based PNG via Next.js
 *      ImageResponse — no Sharp, no native deps.
 *
 * Supported sizes: 180 (apple-touch), 192, 512. Unsupported sizes clamp to 512.
 */

import { DB_COLLECTIONS } from '@constant/database';
import { firebaseClient } from '@lib/firebase/firebaseClient';
import { getLocalizedText, getPrimaryLocalizedLanguage } from '@lib/localization/text';
import { doc, getDoc } from 'firebase/firestore';
import { ImageResponse } from 'next/og';

export const runtime = 'nodejs'; // Firestore client needs node runtime
export const dynamic = 'force-dynamic';

const SUPPORTED_SIZES = new Set([180, 192, 512]);
// Caching rationale (KEPT — do not remove):
//   - Icons rarely change (logo update / owner override). When they do, busting
//     happens naturally via a new tenant-origin URL per deploy (Vercel cache).
//   - Without a CDN cache every install flow would re-invoke this route per icon
//     size per device — measurable cost hit at scale.
//   - max-age=3600: browser re-checks after 1h.
//   - s-maxage=86400: Vercel edge caches 1 day.
//   - stale-while-revalidate=604800: serve stale for 1wk while refetching.
const ICON_CACHE_CONTROL = 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800';

function clampSize(raw: string): number {
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n)) return 512;
    if (SUPPORTED_SIZES.has(n)) return n;
    return 512;
}

function firstLetter(name: string): string {
    const trimmed = (name || '').trim();
    if (!trimmed) return 'M';
    return trimmed.charAt(0).toUpperCase();
}

function pickBackgroundColor(seed: string): string {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = (hash << 5) - hash + seed.charCodeAt(i);
        hash |= 0;
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 65%, 45%)`;
}

function renderLetterIcon(letter: string, bg: string, size: number) {
    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: bg,
                color: '#ffffff',
                fontSize: Math.round(size * 0.55),
                fontWeight: 700,
                fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
                letterSpacing: '-0.02em',
            }}
        >
            {letter}
        </div>
    );
}

export async function GET(
    _request: Request,
    { params }: { params: { storeId: string; size: string } },
) {
    const size = clampSize(params.size);
    const storeId = params.storeId;

    try {
        const ref = doc(firebaseClient, DB_COLLECTIONS.STORES, storeId);
        const snap = await getDoc(ref);
        const store = snap.exists() ? snap.data() : null;

        // Owner-uploaded override lives under publicPresence (the existing
        // public-facing branding namespace — no new top-level field).
        const overrideUrl: string | undefined =
            typeof store?.publicPresence?.pwaIconOverrideUrl === 'string'
                ? store.publicPresence.pwaIconOverrideUrl
                : undefined;
        // Store logo field is named `logo` (not logoUrl) per StoreDataType.
        const logoUrl: string | undefined =
            !overrideUrl && typeof store?.logo === 'string' ? store.logo : undefined;

        if (overrideUrl) return Response.redirect(overrideUrl, 302);
        if (logoUrl && /\.(png|jpe?g|webp)(\?|$)/i.test(logoUrl)) {
            return Response.redirect(logoUrl, 302);
        }

        const contentLanguage = store?.defaultLanguage || store?.activeLanguages?.[0] || store?.language || 'en';
        const displayName: string = getLocalizedText(
            store?.publicPresence?.displayName,
            contentLanguage,
            getPrimaryLocalizedLanguage(store?.publicPresence?.displayName, contentLanguage),
            store?.name || store?.storeName || 'Menu',
        );
        const letter = firstLetter(displayName);
        const bg = pickBackgroundColor(`${storeId}:${displayName}`);

        return new ImageResponse(renderLetterIcon(letter, bg, size), {
            width: size,
            height: size,
            headers: { 'Cache-Control': ICON_CACHE_CONTROL },
        });
    } catch (err) {
        console.error('[app-icons] generation failed:', err);
        // Always return an icon — never 500 for install flows.
        return new ImageResponse(renderLetterIcon('M', '#0f172a', size), {
            width: size,
            height: size,
            headers: { 'Cache-Control': ICON_CACHE_CONTROL },
        });
    }
}
