export type NormalizedGeoCoordinates = {
    latitude: number;
    longitude: number;
};

export type NormalizedGeoCoordinateDraft =
    | { ok: true; geo: NormalizedGeoCoordinates | null }
    | { ok: false; geo: null };

function normalizeCoordinateInput(value: unknown): string {
    if (value === null || value === undefined) return '';
    return String(value).trim();
}

/**
 * Normalizes the owner-entered latitude/longitude pair used by store identity.
 * Both values are required together; an empty pair explicitly clears geo.
 */
export function normalizeGeoCoordinateDraft(
    latitudeInput: unknown,
    longitudeInput: unknown,
): NormalizedGeoCoordinateDraft {
    const latitudeValue = normalizeCoordinateInput(latitudeInput);
    const longitudeValue = normalizeCoordinateInput(longitudeInput);

    if (!latitudeValue && !longitudeValue) {
        return { ok: true, geo: null };
    }

    if (!latitudeValue || !longitudeValue) {
        return { ok: false, geo: null };
    }

    const latitude = Number(latitudeValue);
    const longitude = Number(longitudeValue);
    if (
        !Number.isFinite(latitude)
        || !Number.isFinite(longitude)
        || latitude < -90
        || latitude > 90
        || longitude < -180
        || longitude > 180
    ) {
        return { ok: false, geo: null };
    }

    return {
        ok: true,
        geo: { latitude, longitude },
    };
}
