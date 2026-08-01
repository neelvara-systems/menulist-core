import { BACKGROUND_IMAGES_ORIENTATIONS } from "@constant/common";

export const IMAGE_PROVIDER_REQUEST_TIMEOUT_MS = 10000;

const IMAGE_PROVIDER_MAX_PAGE = 50;
const IMAGE_PROVIDER_MAX_QUERY_LENGTH = 120;

export const normalizeImageProviderPage = (page: unknown): number => {
    const normalized = typeof page === 'number'
        ? page
        : typeof page === 'string' && page.trim().length > 0
            ? Number(page)
            : Number.NaN;
    if (!Number.isFinite(normalized)) return 1;
    return Math.max(1, Math.min(IMAGE_PROVIDER_MAX_PAGE, Math.floor(normalized)));
};

export const normalizeImageProviderOrientation = (orientation: unknown): string => {
    const normalized = typeof orientation === 'string'
        ? orientation.trim().toLowerCase()
        : '';
    if (normalized === BACKGROUND_IMAGES_ORIENTATIONS.PORTRAIT) return BACKGROUND_IMAGES_ORIENTATIONS.PORTRAIT;
    if (normalized === BACKGROUND_IMAGES_ORIENTATIONS.SQUARE) return BACKGROUND_IMAGES_ORIENTATIONS.SQUARE;
    return BACKGROUND_IMAGES_ORIENTATIONS.LANDSCAPE;
};

export const normalizePixabayImageProviderOrientation = (orientation: unknown): string => {
    return normalizeImageProviderOrientation(orientation) === BACKGROUND_IMAGES_ORIENTATIONS.PORTRAIT
        ? 'vertical'
        : 'horizontal';
};

export const normalizeImageProviderQuery = (query: unknown): string => {
    return (typeof query === 'string' ? query : '')
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, IMAGE_PROVIDER_MAX_QUERY_LENGTH);
};

export const buildImageProviderUrl = (
    baseUrl: string,
    params: Record<string, boolean | number | string | null | undefined>,
): string => {
    const url = new URL(baseUrl);

    Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        url.searchParams.set(key, String(value));
    });

    return url.toString();
};

export const normalizeImageProviderResultUrl = (
    value: unknown,
    allowedHosts: readonly string[],
): string | null => {
    if (typeof value !== 'string' || value.length > 2_048) return null;
    try {
        const url = new URL(value);
        if (url.protocol !== 'https:' || url.username || url.password) return null;
        const hostname = url.hostname.toLowerCase();
        if (!allowedHosts.some((host) => hostname === host || hostname.endsWith(`.${host}`))) return null;
        return url.toString();
    } catch {
        return null;
    }
};
