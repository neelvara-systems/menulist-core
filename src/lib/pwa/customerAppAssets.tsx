import { APP_THEME_COLOR } from '@constant/common';
import { menulistPublicEnv } from '@lib/env/menulistPublicEnv';

export const CUSTOMER_APP_ICON_CACHE_CONTROL = 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800';
export const CUSTOMER_APP_TRANSIENT_FALLBACK_CACHE_CONTROL = 'private, no-store, max-age=0';

const MAX_CUSTOMER_APP_DISPLAY_NAME_LENGTH = 120;
const MAX_CUSTOMER_APP_IMAGE_URL_LENGTH = 2048;
const CUSTOMER_APP_RENDERABLE_IMAGE_HOSTS = new Set([
    'firebasestorage.googleapis.com',
    'storage.googleapis.com',
]);

function getCustomerAppStorageBucketFromUrl(url: URL): string | undefined {
    const pathSegments = url.pathname.split('/').filter(Boolean);
    if (url.hostname === 'firebasestorage.googleapis.com') {
        const bucketIndex = pathSegments.findIndex((segment, index) => (
            segment === 'b' && pathSegments[index - 1] === 'v0'
        ));
        return bucketIndex >= 0 ? pathSegments[bucketIndex + 1] : undefined;
    }
    if (pathSegments[0] === 'download' && pathSegments[1] === 'storage' && pathSegments[2] === 'v1' && pathSegments[3] === 'b') {
        return pathSegments[4];
    }
    return pathSegments[0];
}

const SUPPORTED_ICON_SIZES = new Set([120, 152, 167, 180, 192, 384, 512]);

export const CUSTOMER_APPLE_STARTUP_IMAGES = [
    {
        size: '1290x2796',
        media: '(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)',
    },
    {
        size: '1179x2556',
        media: '(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)',
    },
    {
        size: '1170x2532',
        media: '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)',
    },
    {
        size: '1125x2436',
        media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)',
    },
    {
        size: '1242x2688',
        media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)',
    },
    {
        size: '828x1792',
        media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)',
    },
    {
        size: '1242x2208',
        media: '(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3)',
    },
    {
        size: '750x1334',
        media: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)',
    },
    {
        size: '640x1136',
        media: '(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)',
    },
];

export function appendCustomerAppAssetVersion(url: string, version?: string): string {
    if (!version) return url;
    const joiner = url.includes('?') ? '&' : '?';
    return `${url}${joiner}v=${encodeURIComponent(version)}`;
}

function hashCustomerAppAssetVersion(value: string): string {
    let hash = 5381;
    for (let i = 0; i < value.length; i += 1) {
        hash = ((hash << 5) + hash) ^ value.charCodeAt(i);
    }
    return (hash >>> 0).toString(36);
}

export function getCustomerAppIconVersion(store: any): string {
    const explicitUpdatedAt = store?.publicPresence?.pwaIconUpdatedAt;
    if (explicitUpdatedAt) return String(explicitUpdatedAt);

    const mode = store?.publicPresence?.pwaIconMode || 'auto';
    const override = store?.publicPresence?.pwaIconOverrideUrl || '';
    const logo = store?.logo || '';
    return hashCustomerAppAssetVersion(`${mode}:${override}:${logo}`);
}

export function getCustomerAppIconUrl(storeId: string | number, size: number, version?: string): string {
    return appendCustomerAppAssetVersion(`/api/app-icons/${storeId}/${size}`, version);
}

export function getCustomerAppleStartupImages(storeId: string | number, version?: string) {
    return CUSTOMER_APPLE_STARTUP_IMAGES.map((image) => ({
        url: appendCustomerAppAssetVersion(`/api/app-splash/${storeId}/${image.size}`, version),
        media: image.media,
    }));
}

export function getStaticCustomerAppleStartupImages() {
    return CUSTOMER_APPLE_STARTUP_IMAGES.map((image) => ({
        url: `/splash/apple-splash-${image.size}.png`,
        media: image.media,
    }));
}

export function clampCustomerAppIconSize(raw: string): number {
    if (!/^[1-9]\d{1,3}$/.test(raw)) return 512;
    const n = Number(raw);
    if (SUPPORTED_ICON_SIZES.has(n)) return n;
    return 512;
}

export function normalizeCustomerAppDisplayName(value: unknown, fallback = 'Menu'): string {
    if (typeof value !== 'string') return fallback;
    const normalized = value.trim().replace(/\s+/g, ' ');
    return normalized ? normalized.slice(0, MAX_CUSTOMER_APP_DISPLAY_NAME_LENGTH) : fallback;
}

export function normalizeCustomerAppRenderableImageUrl(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const normalized = value.trim();
    if (!normalized || normalized.length > MAX_CUSTOMER_APP_IMAGE_URL_LENGTH) return undefined;

    try {
        const url = new URL(normalized);
        if (
            url.protocol !== 'https:'
            || url.username
            || url.password
            || url.port
            || !CUSTOMER_APP_RENDERABLE_IMAGE_HOSTS.has(url.hostname.toLowerCase())
        ) return undefined;

        const configuredBucket = (menulistPublicEnv.firebaseStorageBucket || '').trim();
        if (!configuredBucket || getCustomerAppStorageBucketFromUrl(url) !== configuredBucket) return undefined;

        const decodedPath = decodeURIComponent(url.pathname);
        if (!/\.(png|jpe?g|webp)$/i.test(decodedPath)) return undefined;
        return url.toString();
    } catch {
        return undefined;
    }
}

export function parseCustomerAppSplashSize(raw: string): { width: number; height: number } | null {
    const match = raw.match(/^(\d{3,4})x(\d{3,4})$/);
    if (!match) return null;
    const width = Number(match[1]);
    const height = Number(match[2]);
    const allowed = CUSTOMER_APPLE_STARTUP_IMAGES.some((image) => image.size === `${width}x${height}`);
    if (!allowed) return null;
    return { width, height };
}

export function deriveCustomerAppShortName(displayName: string, override?: string): string {
    if (override && override.trim().length > 0) return override.trim().slice(0, 12);
    const firstWord = displayName.split(/\s+/)[0] || displayName;
    return firstWord.slice(0, 12);
}

export type CustomerAppIconSource = 'override' | 'logo' | 'generated';

export function resolveCustomerAppIconSource(store: any): { imageUrl?: string; source: CustomerAppIconSource } {
    const rawOverrideUrl =
        typeof store?.publicPresence?.pwaIconOverrideUrl === 'string'
            ? store.publicPresence.pwaIconOverrideUrl.trim()
            : '';
    const mode = typeof store?.publicPresence?.pwaIconMode === 'string'
        ? store.publicPresence.pwaIconMode
        : '';
    const rawLogoUrl = typeof store?.logo === 'string' ? store.logo.trim() : '';
    const overrideUrl = normalizeCustomerAppRenderableImageUrl(rawOverrideUrl);
    const logoUrl = normalizeCustomerAppRenderableImageUrl(rawLogoUrl);

    if (mode === 'override' && overrideUrl) {
        return { imageUrl: overrideUrl, source: 'override' };
    }
    if (mode === 'generated') {
        return { source: 'generated' };
    }
    if (overrideUrl) {
        return { imageUrl: overrideUrl, source: 'override' };
    }
    if (logoUrl) {
        return { imageUrl: logoUrl, source: 'logo' };
    }
    return { source: 'generated' };
}

export function resolveCustomerAppIconImageUrl(store: any): string | undefined {
    return resolveCustomerAppIconSource(store).imageUrl;
}

export function firstCustomerAppLetter(name: string): string {
    const trimmed = (name || '').trim();
    if (!trimmed) return 'M';
    return trimmed.charAt(0).toUpperCase();
}

export function pickCustomerAppBackgroundColor(seed: string): string {
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) {
        hash = (hash << 5) - hash + seed.charCodeAt(i);
        hash |= 0;
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 65%, 45%)`;
}

function renderIconContent({
    bg,
    displayName,
    imageUrl,
    size,
    visualRatio,
}: {
    bg: string;
    displayName: string;
    imageUrl?: string;
    size: number;
    visualRatio: number;
}) {
    if (imageUrl) {
        const visualSize = Math.round(size * visualRatio);
        return (
            <img
                alt=""
                src={imageUrl}
                style={{
                    height: visualSize,
                    maxHeight: visualSize,
                    maxWidth: visualSize,
                    objectFit: 'contain',
                    width: visualSize,
                }}
            />
        );
    }

    return (
        <div
            style={{
                alignItems: 'center',
                background: bg,
                borderRadius: Math.round(size * 0.22),
                color: '#ffffff',
                display: 'flex',
                fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
                fontSize: Math.round(size * 0.46),
                fontWeight: 750,
                height: Math.round(size * visualRatio),
                justifyContent: 'center',
                width: Math.round(size * visualRatio),
            }}
        >
            {firstCustomerAppLetter(displayName)}
        </div>
    );
}

export function renderCustomerAppIcon({
    displayName,
    imageUrl,
    seed,
    size,
    visualRatio = 0.74,
}: {
    displayName: string;
    imageUrl?: string;
    seed: string;
    size: number;
    visualRatio?: number;
}) {
    const bg = pickCustomerAppBackgroundColor(`${seed}:${displayName}`);

    return (
        <div
            style={{
                alignItems: 'center',
                background: '#ffffff',
                display: 'flex',
                height: '100%',
                justifyContent: 'center',
                position: 'relative',
                width: '100%',
            }}
        >
            <div
                style={{
                    alignItems: 'center',
                    display: 'flex',
                    height: '100%',
                    justifyContent: 'center',
                    opacity: 0.06,
                    position: 'absolute',
                    width: '100%',
                }}
            >
                {renderIconContent({
                    bg,
                    displayName,
                    imageUrl,
                    size,
                    visualRatio: 1.22,
                })}
            </div>
            <div
                style={{
                    alignItems: 'center',
                    display: 'flex',
                    height: '100%',
                    justifyContent: 'center',
                    position: 'relative',
                    width: '100%',
                }}
            >
                {renderIconContent({
                    bg,
                    displayName,
                    imageUrl,
                    size,
                    visualRatio,
                })}
            </div>
        </div>
    );
}

export function renderCustomerAppSplash({
    displayName,
    height,
    imageUrl,
    iconVisualRatio = 0.72,
    seed,
    themeColor = APP_THEME_COLOR,
    width,
}: {
    displayName: string;
    height: number;
    imageUrl?: string;
    iconVisualRatio?: number;
    seed: string;
    themeColor?: string;
    width: number;
}) {
    const iconSize = Math.round(Math.min(width * 0.34, 384));
    const watermarkSize = Math.round(width * 1.34);

    return (
        <div
            style={{
                alignItems: 'center',
                background: '#ffffff',
                display: 'flex',
                height: '100%',
                justifyContent: 'center',
                overflow: 'hidden',
                position: 'relative',
                width: '100%',
            }}
        >
            <div
                style={{
                    background: themeColor,
                    borderRadius: Math.round(Math.max(width, height) * 0.36),
                    height: Math.round(Math.max(width, height) * 0.72),
                    opacity: 0.045,
                    position: 'absolute',
                    width: Math.round(Math.max(width, height) * 0.72),
                }}
            />
            <div
                style={{
                    alignItems: 'center',
                    display: 'flex',
                    height: watermarkSize,
                    justifyContent: 'center',
                    opacity: 0.045,
                    position: 'absolute',
                    transform: 'translateY(4%)',
                    width: watermarkSize,
                }}
            >
                {renderCustomerAppIcon({
                    displayName,
                    imageUrl,
                    seed,
                    size: watermarkSize,
                    visualRatio: 0.88,
                })}
            </div>
            <div
                style={{
                    alignItems: 'center',
                    borderRadius: Math.round(iconSize * 0.24),
                    display: 'flex',
                    height: iconSize,
                    justifyContent: 'center',
                    overflow: 'hidden',
                    position: 'relative',
                    width: iconSize,
                }}
            >
                {renderCustomerAppIcon({
                    displayName,
                    imageUrl,
                    seed,
                    size: iconSize,
                    visualRatio: iconVisualRatio,
                })}
            </div>
        </div>
    );
}
