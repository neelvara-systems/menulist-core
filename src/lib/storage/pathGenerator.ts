/**
 * Storage Path Generator Utility
 *
 * Generates standardized Storage paths with tenant/store isolation.
 * Pattern: {collection}/{fileType}/{tenantId}/{storeId}/{fileId}
 *
 * Scope is intentionally fail-closed. A tenant-owned upload must never fall
 * back to the platform namespace when its session is absent or malformed.
 */

export type StoragePathScope = Readonly<{
    tId?: unknown;
    sId?: unknown;
}>;

export interface StoragePathOptions {
    collection: string;
    fileType: string;
    session: StoragePathScope | null | undefined;
    /** A single object name or an intentional nested suffix such as noteId/fileId. */
    fileId: string;
}

const STORAGE_SCOPE_ID_PATTERN = /^(0|[1-9]\d*)$/;
const STORAGE_STATIC_SEGMENT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const STORAGE_CONTROL_CHARACTER_PATTERN = /[\u0000-\u001F\u007F]/;
const MAX_STORAGE_STATIC_SEGMENT_LENGTH = 120;
const MAX_STORAGE_FILE_ID_LENGTH = 512;

const normalizeStorageScopeId = (
    value: unknown,
    field: 'tenant' | 'store',
): string => {
    const raw = typeof value === 'number' || typeof value === 'string'
        ? String(value)
        : '';
    if (
        !STORAGE_SCOPE_ID_PATTERN.test(raw)
        || raw.trim() !== raw
    ) {
        throw new TypeError(`invalid_storage_${field}_scope`);
    }

    const parsed = Number(raw);
    if (!Number.isSafeInteger(parsed) || parsed < 0 || String(parsed) !== raw) {
        throw new TypeError(`invalid_storage_${field}_scope`);
    }
    return raw;
};

const normalizeStaticStorageSegment = (
    value: unknown,
    field: 'collection' | 'file_type',
): string => {
    if (
        typeof value !== 'string'
        || value.length === 0
        || value.length > MAX_STORAGE_STATIC_SEGMENT_LENGTH
        || value.trim() !== value
        || !STORAGE_STATIC_SEGMENT_PATTERN.test(value)
    ) {
        throw new TypeError(`invalid_storage_${field}_segment`);
    }
    return value;
};

const normalizeStorageFileId = (value: unknown): string => {
    if (
        typeof value !== 'string'
        || value.length === 0
        || value.length > MAX_STORAGE_FILE_ID_LENGTH
        || value.trim() !== value
        || STORAGE_CONTROL_CHARACTER_PATTERN.test(value)
    ) {
        throw new TypeError('invalid_storage_file_id_segment');
    }

    const segments = value.split('/');
    if (segments.some((segment) => (
        segment.length === 0
        || segment === '.'
        || segment === '..'
        || segment.trim() !== segment
    ))) {
        throw new TypeError('invalid_storage_file_id_segment');
    }
    return segments.join('/');
};

/**
 * Generate a tenant/store-scoped Storage path.
 *
 * @throws TypeError when scope or any path segment is absent/non-canonical.
 */
export function generateStoragePath(options: StoragePathOptions): string {
    const collection = normalizeStaticStorageSegment(options.collection, 'collection');
    const fileType = normalizeStaticStorageSegment(options.fileType, 'file_type');
    const tenantId = normalizeStorageScopeId(options.session?.tId, 'tenant');
    const storeId = normalizeStorageScopeId(options.session?.sId, 'store');
    const fileId = normalizeStorageFileId(options.fileId);

    return `${collection}/${fileType}/${tenantId}/${storeId}/${fileId}`;
}

/** Parse a generated Storage path into its tenant/store metadata. */
export function parseStoragePath(path: string): {
    collection: string;
    fileType: string;
    tId: string;
    sId: string;
    fileId: string;
} | null {
    if (typeof path !== 'string') return null;
    const parts = path.split('/');
    if (parts.length < 5) return null;

    try {
        const collection = normalizeStaticStorageSegment(parts[0], 'collection');
        const fileType = normalizeStaticStorageSegment(parts[1], 'file_type');
        const tId = normalizeStorageScopeId(parts[2], 'tenant');
        const sId = normalizeStorageScopeId(parts[3], 'store');
        const fileId = normalizeStorageFileId(parts.slice(4).join('/'));
        return { collection, fileType, tId, sId, fileId };
    } catch {
        return null;
    }
}

/** Get the canonical tenant directory prefix for bounded bulk operations. */
export function getTenantPath(
    collection: string,
    fileType: string,
    tenantId: number | string,
): string {
    return [
        normalizeStaticStorageSegment(collection, 'collection'),
        normalizeStaticStorageSegment(fileType, 'file_type'),
        normalizeStorageScopeId(tenantId, 'tenant'),
    ].join('/');
}

/** Get the canonical store directory prefix for bounded bulk operations. */
export function getStorePath(
    collection: string,
    fileType: string,
    tenantId: number | string,
    storeId: number | string,
): string {
    return [
        getTenantPath(collection, fileType, tenantId),
        normalizeStorageScopeId(storeId, 'store'),
    ].join('/');
}
