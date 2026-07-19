const DELETABLE_INGESTION_JOB_STATUSES = new Set([
    'needs_review',
    'failed',
    'cancelled',
]);

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

export type IngestionJobSourceCleanupCandidate = Readonly<{
    downloadURL: string;
    storagePath: string;
}>;

export type IngestionJobSourceCleanupPlan = Readonly<{
    cleanupCandidates: IngestionJobSourceCleanupCandidate[];
    preservedStoragePaths: string[];
}>;

const normalizeStoragePath = (value: unknown, expectedPrefix: string): string | null => {
    if (typeof value !== 'string' || value !== value.trim()) return null;
    if (
        !value.startsWith(expectedPrefix)
        || value.includes('..')
        || value.includes('\\')
        || value.split('/').length !== 4
    ) {
        return null;
    }
    return value;
};

export const planIngestionJobSourceCleanup = (
    currentSourceFiles: unknown,
    otherJobSourceFiles: readonly unknown[],
    expectedPrefix: string,
): IngestionJobSourceCleanupPlan => {
    if (
        !Array.isArray(currentSourceFiles)
        || currentSourceFiles.length === 0
        || currentSourceFiles.length > 8
        || !expectedPrefix
    ) {
        throw new Error('This knowledge generation job has invalid source-file cleanup data.');
    }

    const currentFiles = new Map<string, IngestionJobSourceCleanupCandidate>();
    for (const value of currentSourceFiles) {
        if (!isRecord(value)) {
            throw new Error('This knowledge generation job has invalid source-file cleanup data.');
        }
        const storagePath = normalizeStoragePath(value.storagePath, expectedPrefix);
        const downloadURL = typeof value.downloadURL === 'string' && value.downloadURL === value.downloadURL.trim()
            ? value.downloadURL
            : '';
        if (!storagePath || !downloadURL) {
            throw new Error('This knowledge generation job has invalid source-file cleanup data.');
        }
        currentFiles.set(storagePath, { storagePath, downloadURL });
    }

    const referencedStoragePaths = new Set<string>();
    for (const sourceFiles of otherJobSourceFiles) {
        if (sourceFiles === undefined || sourceFiles === null) continue;
        if (!Array.isArray(sourceFiles) || sourceFiles.length > 8) {
            throw new Error('Another knowledge generation job has invalid source-file reference data.');
        }
        for (const value of sourceFiles) {
            if (!isRecord(value)) {
                throw new Error('Another knowledge generation job has invalid source-file reference data.');
            }
            const storagePath = normalizeStoragePath(value.storagePath, expectedPrefix);
            if (!storagePath) {
                throw new Error('Another knowledge generation job has invalid source-file reference data.');
            }
            referencedStoragePaths.add(storagePath);
        }
    }

    const cleanupCandidates: IngestionJobSourceCleanupCandidate[] = [];
    const preservedStoragePaths: string[] = [];
    for (const sourceFile of Array.from(currentFiles.values())) {
        if (referencedStoragePaths.has(sourceFile.storagePath)) {
            preservedStoragePaths.push(sourceFile.storagePath);
        } else {
            cleanupCandidates.push(sourceFile);
        }
    }

    return { cleanupCandidates, preservedStoragePaths };
};

export const isExactAnswerlatticeProductId = (value: unknown): boolean => value === 'AL';

export const getIngestionJobTimestampMillis = (value: unknown): number | null => {
    if (!isRecord(value) || typeof value.toMillis !== 'function') return null;
    const result = Number(value.toMillis.call(value));
    return Number.isFinite(result) ? result : null;
};

export const normalizeIngestionJobQueryLimit = (
    value: unknown,
    fallback: number,
    maximum: number,
): number => (
    Number.isSafeInteger(value) && Number(value) > 0
        ? Math.min(Number(value), maximum)
        : fallback
);

export const isDeletableIngestionJobStatus = (status: unknown): boolean => (
    typeof status === 'string' && DELETABLE_INGESTION_JOB_STATUSES.has(status)
);
