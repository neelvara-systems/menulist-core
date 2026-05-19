const isPositiveId = (value: number | string): boolean => {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0;
};

export async function markCanonicaTenantHasEntities(
    tId: number | string,
    sId: number | string,
    source: 'entity_created' | 'candidate_promoted' = 'entity_created',
): Promise<void> {
    if (typeof window === 'undefined') return;
    if (!isPositiveId(tId) || !isPositiveId(sId)) return;

    const response = await fetch('/api/canonica/tenant-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            tId: Number(tId),
            sId: Number(sId),
            hasEntities: true,
            source,
        }),
    });

    if (!response.ok) {
        throw new Error(`Canonica tenant summary sync failed: ${response.status}`);
    }
}
