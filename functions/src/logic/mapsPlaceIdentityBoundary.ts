export const MAX_MAPS_PLACE_ID_LENGTH = 2048;
export const MAX_MAPS_SOURCE_URI_LENGTH = 2048;

export function normalizeMapsGroundingPlaceId(value: unknown): string | undefined {
    if (typeof value !== "string") return undefined;
    const normalized = value.trim().replace(/^places\//i, "");
    if (
        !normalized
        || normalized.length > MAX_MAPS_PLACE_ID_LENGTH
        || !/^[^\s/\\]+$/.test(normalized)
    ) {
        return undefined;
    }
    return normalized;
}

export function normalizeMapsGroundingSourceUri(value: unknown): string | undefined {
    if (typeof value !== "string") return undefined;
    const normalized = value.trim();
    if (!normalized || normalized.length > MAX_MAPS_SOURCE_URI_LENGTH || /\s/.test(normalized)) {
        return undefined;
    }

    try {
        const parsed = new URL(normalized);
        if (parsed.protocol !== "https:" || parsed.username || parsed.password) return undefined;

        const host = parsed.hostname.toLowerCase();
        const isGoogleHost = host === "google.com" || host.endsWith(".google.com");
        const isMapsPath = parsed.pathname.startsWith("/maps");
        const isMapsShortlink = host === "maps.app.goo.gl" || host === "goo.gl";
        const isMapsHost = host === "maps.google.com";

        return (isGoogleHost && isMapsPath) || isMapsHost || isMapsShortlink
            ? parsed.toString()
            : undefined;
    } catch {
        return undefined;
    }
}
