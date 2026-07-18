export type StorageReplacementCommitState = 'ambiguous' | 'committed' | 'not_persisted';

const normalizeUrl = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return normalized || null;
};

export function getStorageReplacementCleanupTargets({
    commitState,
    previousUrl,
    uploadedUrl,
}: {
    commitState: StorageReplacementCommitState;
    previousUrl?: unknown;
    uploadedUrl?: unknown;
}): string[] {
    const previous = normalizeUrl(previousUrl);
    const uploaded = normalizeUrl(uploadedUrl);
    if (!uploaded) return [];

    if (commitState === 'ambiguous') return [];
    if (commitState === 'not_persisted') return [uploaded];
    return previous && previous !== uploaded ? [previous] : [];
}
