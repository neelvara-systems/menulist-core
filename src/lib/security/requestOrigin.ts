export function normalizeRequestOrigin(origin: string | null | undefined): string | null {
    const trimmed = origin?.trim();
    if (!trimmed || trimmed === 'null') return null;

    try {
        const parsed = new URL(trimmed);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
        return parsed.origin;
    } catch {
        return null;
    }
}

export function isRequestOriginAllowed(
    requestOrigin: string | null | undefined,
    allowedOrigins: unknown,
): boolean {
    if (!Array.isArray(allowedOrigins) || allowedOrigins.length === 0) return true;

    const normalizedAllowed = allowedOrigins
        .filter((origin): origin is string => typeof origin === 'string')
        .map(normalizeRequestOrigin)
        .filter((origin): origin is string => Boolean(origin));

    if (normalizedAllowed.length === 0) return false;

    const normalizedRequestOrigin = normalizeRequestOrigin(requestOrigin);
    return Boolean(normalizedRequestOrigin && normalizedAllowed.includes(normalizedRequestOrigin));
}

