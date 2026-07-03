import { hashPublicRateLimitValue } from 'src/middleware/publicApi';

const ANSWERLATTICE_RATE_LIMIT_UNKNOWN_SEGMENT = 'unknown';

export const hashAnswerlatticeRateLimitSegment = (value: unknown): string => {
    const normalized = value === undefined || value === null || value === ''
        ? ANSWERLATTICE_RATE_LIMIT_UNKNOWN_SEGMENT
        : value;
    return hashPublicRateLimitValue(normalized);
};

export const buildAnswerlatticeRateLimitKey = (
    prefix: string,
    ...segments: unknown[]
): string => [
    prefix,
    ...segments.map(hashAnswerlatticeRateLimitSegment),
].join(':');
