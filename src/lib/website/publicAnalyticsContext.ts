const PUBLIC_ANALYTICS_TEXT_MAX_LENGTH = 160;
const PUBLIC_ANALYTICS_URL_MAX_LENGTH = 320;
const PUBLIC_ANALYTICS_ATTRIBUTION_TOKEN_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/;

export type PublicAnalyticsReferrerGroup = {
    group: string;
    hosts: readonly string[];
};

export function cleanPublicAnalyticsString(
    value: unknown,
    maxLength = PUBLIC_ANALYTICS_TEXT_MAX_LENGTH,
): string | undefined {
    if (typeof value !== 'string') return undefined;
    const boundedMaxLength = Number.isSafeInteger(maxLength)
        ? Math.min(Math.max(maxLength, 1), PUBLIC_ANALYTICS_URL_MAX_LENGTH)
        : PUBLIC_ANALYTICS_TEXT_MAX_LENGTH;
    const normalized = value
        .replace(/[\u0000-\u001f\u007f]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, boundedMaxLength);

    return normalized || undefined;
}

export function getPublicAnalyticsUrl(value: unknown): string | undefined {
    if (typeof value !== 'string' || !value || typeof window === 'undefined') return undefined;

    try {
        const url = new URL(value, window.location.origin);
        if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined;
        if (url.username || url.password) return undefined;
        const sameOrigin = url.origin === window.location.origin;
        return cleanPublicAnalyticsString(
            sameOrigin ? `${url.origin}${url.pathname || '/'}` : url.origin,
            PUBLIC_ANALYTICS_URL_MAX_LENGTH,
        );
    } catch {
        return undefined;
    }
}

export function getPublicAnalyticsPagePath(): string {
    if (typeof window === 'undefined') return '/';
    return getPublicAnalyticsPath(window.location.pathname) || '/';
}

export function getPublicAnalyticsPath(value: unknown): string | undefined {
    if (typeof value !== 'string' || !value || typeof window === 'undefined') return undefined;

    try {
        const url = new URL(value, window.location.origin);
        if (url.origin !== window.location.origin) return undefined;
        return cleanPublicAnalyticsString(
            url.pathname || '/',
            PUBLIC_ANALYTICS_URL_MAX_LENGTH,
        );
    } catch {
        return undefined;
    }
}

export function getPublicAnalyticsAttributionToken(value: unknown): string | undefined {
    const normalized = cleanPublicAnalyticsString(value, 64);
    return normalized && PUBLIC_ANALYTICS_ATTRIBUTION_TOKEN_PATTERN.test(normalized)
        ? normalized
        : undefined;
}

export function getPublicAnalyticsReferrerGroup(
    referrer: unknown,
    groups: readonly PublicAnalyticsReferrerGroup[],
): string | undefined {
    if (typeof referrer !== 'string' || !referrer) return undefined;

    try {
        const hostname = new URL(referrer).hostname.toLowerCase().replace(/^www\./, '');
        return groups.find(({ hosts }) => hosts.some((host) => (
            hostname === host || hostname.endsWith(`.${host}`)
        )))?.group;
    } catch {
        return undefined;
    }
}

export function getPublicAnalyticsSessionEntryPage(storageKey: string): string {
    const nextValue = getPublicAnalyticsPagePath();
    if (typeof window === 'undefined') return nextValue;

    try {
        const existing = window.sessionStorage.getItem(storageKey);
        const normalizedExisting = getPublicAnalyticsPath(existing);
        if (normalizedExisting) {
            if (normalizedExisting !== existing) {
                window.sessionStorage.setItem(storageKey, normalizedExisting);
            }
            return normalizedExisting;
        }
        window.sessionStorage.setItem(storageKey, nextValue);
    } catch {
        return nextValue;
    }

    return nextValue;
}
