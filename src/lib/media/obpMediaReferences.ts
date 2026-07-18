function normalizeStorageReference(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    if (!normalized || normalized.startsWith('data:')) return null;
    return normalized;
}

export function collectObpMediaReferences(publicPresence: unknown): string[] {
    if (!publicPresence || typeof publicPresence !== 'object' || Array.isArray(publicPresence)) {
        return [];
    }

    const presence = publicPresence as Record<string, unknown>;
    const candidates = [
        presence.businessCover,
        ...(Array.isArray(presence.photos) ? presence.photos : []),
    ];

    return Array.from(new Set(
        candidates
            .map(normalizeStorageReference)
            .filter((value): value is string => value !== null),
    ));
}

export function filterUnreferencedObpMediaUrls(
    deleteCandidates: unknown,
    retainedReferences: unknown,
): string[] {
    if (!Array.isArray(deleteCandidates)) return [];
    const retained = new Set(
        Array.isArray(retainedReferences)
            ? retainedReferences
                .map(normalizeStorageReference)
                .filter((value): value is string => value !== null)
            : [],
    );

    return Array.from(new Set(
        deleteCandidates
            .map(normalizeStorageReference)
            .filter((value): value is string => value !== null && !retained.has(value)),
    ));
}
