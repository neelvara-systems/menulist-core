const ANSWERLATTICE_ANALYTICS_TEXT_MAX_LENGTH = 160;
const ANSWERLATTICE_ANALYTICS_URL_MAX_LENGTH = 240;

export const cleanAnswerlatticeAnalyticsString = (
    value?: string | null,
    maxLength = ANSWERLATTICE_ANALYTICS_TEXT_MAX_LENGTH,
): string | undefined => {
    const normalized = String(value || '')
        .replace(/[\u0000-\u001f\u007f]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxLength);

    return normalized || undefined;
};

export const getAnswerlatticeAnalyticsUrl = (value?: string | null): string | undefined => {
    if (!value || typeof window === 'undefined') return undefined;

    try {
        const url = new URL(value, window.location.origin);
        if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined;
        return cleanAnswerlatticeAnalyticsString(
            `${url.origin}${url.pathname || '/'}`,
            ANSWERLATTICE_ANALYTICS_URL_MAX_LENGTH,
        );
    } catch {
        return undefined;
    }
};

export const getAnswerlatticeAnalyticsPagePath = (): string => {
    if (typeof window === 'undefined') return '/';
    return cleanAnswerlatticeAnalyticsString(window.location.pathname || '/', ANSWERLATTICE_ANALYTICS_URL_MAX_LENGTH) || '/';
};

