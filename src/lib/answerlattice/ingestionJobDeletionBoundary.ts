const DELETABLE_INGESTION_JOB_STATUSES = new Set([
    'needs_review',
    'failed',
    'cancelled',
]);

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

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
