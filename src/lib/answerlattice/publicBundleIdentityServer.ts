import { createHash } from 'crypto';

export const ANSWERLATTICE_PUBLIC_BUNDLE_ID_PATTERN = /^pb_[A-Za-z0-9_-]{8,80}$/;
const MIN_PUBLIC_BUNDLE_SALT_LENGTH = 32;

export const getExpectedAnswerlatticePublicBundleId = (
    tId: unknown,
    sId: unknown,
    saltValue: unknown = process.env.ANSWERLATTICE_PUBLIC_BUNDLE_SALT,
): string | null => {
    if (!Number.isSafeInteger(tId) || Number(tId) <= 0) return null;
    if (!Number.isSafeInteger(sId) || Number(sId) <= 0) return null;
    const salt = typeof saltValue === 'string' ? saltValue.trim() : '';
    if (salt.length < MIN_PUBLIC_BUNDLE_SALT_LENGTH) return null;
    return `pb_${createHash('sha256')
        .update(`${Number(tId)}:${Number(sId)}:${salt}`)
        .digest('base64url')
        .slice(0, 24)}`;
};

export const isExpectedAnswerlatticePublicBundleId = (
    value: unknown,
    tId: unknown,
    sId: unknown,
    saltValue?: unknown,
): boolean => {
    const expected = getExpectedAnswerlatticePublicBundleId(tId, sId, saltValue);
    return expected !== null
        && typeof value === 'string'
        && ANSWERLATTICE_PUBLIC_BUNDLE_ID_PATTERN.test(value)
        && value === expected;
};
