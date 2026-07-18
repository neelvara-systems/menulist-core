export type PWAIconCommitScope = {
    storeId: number;
    tenantId: number;
};

export type CommittedPWAIconOverride = {
    pwaIconOverrideUrl: string;
    pwaIconUpdatedAt: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
    value !== null && typeof value === "object" && !Array.isArray(value)
);

export function readCommittedPWAIconOverride(
    storeData: unknown,
    scope: PWAIconCommitScope,
    expectedUrl: string,
): CommittedPWAIconOverride | null {
    if (!isRecord(storeData)) return null;
    if (
        String(storeData.storeId) !== String(scope.storeId)
        || String(storeData.tenantId) !== String(scope.tenantId)
    ) {
        return null;
    }

    const publicPresence = isRecord(storeData.publicPresence) ? storeData.publicPresence : null;
    if (
        !publicPresence
        || publicPresence.pwaIconMode !== "override"
        || publicPresence.pwaIconOverrideUrl !== expectedUrl
        || typeof publicPresence.pwaIconUpdatedAt !== "string"
        || !publicPresence.pwaIconUpdatedAt.trim()
    ) {
        return null;
    }

    return {
        pwaIconOverrideUrl: expectedUrl,
        pwaIconUpdatedAt: publicPresence.pwaIconUpdatedAt,
    };
}
