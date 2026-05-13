import { APP_THEME_COLOR } from '@constant/common';

export const CUSTOMER_APP_ICON_CACHE_CONTROL = 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800';

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

export function getCustomerAppleStartupImages(storeId: string | number) {
    return CUSTOMER_APPLE_STARTUP_IMAGES.map((image) => ({
        url: `/api/app-splash/${storeId}/${image.size}`,
        media: image.media,
    }));
}

export function clampCustomerAppIconSize(raw: string): number {
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n)) return 512;
    if (SUPPORTED_ICON_SIZES.has(n)) return n;
    return 512;
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

export function resolveCustomerAppIconImageUrl(store: any): string | undefined {
    const overrideUrl =
        typeof store?.publicPresence?.pwaIconOverrideUrl === 'string'
            ? store.publicPresence.pwaIconOverrideUrl.trim()
            : '';
    const logoUrl = !overrideUrl && typeof store?.logo === 'string' ? store.logo.trim() : '';
    const candidate = overrideUrl || logoUrl;
    if (!candidate || !/\.(png|jpe?g|webp)(\?|$)/i.test(candidate)) return undefined;
    return candidate;
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
    seed,
    themeColor = APP_THEME_COLOR,
    width,
}: {
    displayName: string;
    height: number;
    imageUrl?: string;
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
                    visualRatio: 0.72,
                })}
            </div>
        </div>
    );
}
