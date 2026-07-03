import { isReservedOutletSlug, isReservedProjectSlug } from '@constant/reservedSlugs';

const PUBLIC_PATH_SEGMENT_MAX_LENGTH = 120;
const PUBLIC_PATH_SEGMENT_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizePublicPathSegment(value: unknown): string | null {
    const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
    if (!raw || raw.length > PUBLIC_PATH_SEGMENT_MAX_LENGTH) return null;
    if (!PUBLIC_PATH_SEGMENT_PATTERN.test(raw)) return null;
    return raw;
}

export function normalizePublicOutletSlug(value: unknown): string | null {
    const segment = normalizePublicPathSegment(value);
    if (!segment || isReservedOutletSlug(segment)) return null;
    return segment;
}

export function normalizePublicProjectSlug(value: unknown): string | null {
    const segment = normalizePublicPathSegment(value);
    if (!segment || isReservedProjectSlug(segment)) return null;
    return segment;
}
