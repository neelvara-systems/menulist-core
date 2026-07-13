import { normalizeImageBatchScopeDocumentId } from './imageBatchIdBoundary';

export type ImageBatchStorageAssetScope = {
    expectedBucket?: string;
    expectedStoragePath?: string;
    storeId: string | number;
    tenantId: string | number;
};

export type ParsedImageBatchStorageUrl = {
    bucket: string;
    storagePath: string;
};

export function parseImageBatchStorageUrl(value: unknown): ParsedImageBatchStorageUrl | null {
    if (typeof value !== 'string' || value.length < 1 || value.length > 5_000) return null;
    try {
        const url = new URL(value);
        if (
            url.protocol !== 'https:'
            || url.hostname !== 'firebasestorage.googleapis.com'
            || url.hash
            || url.searchParams.get('alt') !== 'media'
        ) return null;
        const match = url.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/);
        if (!match) return null;
        const bucket = decodeURIComponent(match[1]);
        const storagePath = decodeURIComponent(match[2]);
        if (!bucket || !storagePath || storagePath.includes('\\') || storagePath.split('/').includes('..')) return null;
        return { bucket, storagePath };
    } catch {
        return null;
    }
}

export function isImageBatchGeneratedStorageAsset(
    url: unknown,
    scope: ImageBatchStorageAssetScope,
): url is string {
    const parsed = parseImageBatchStorageUrl(url);
    const tenantScope = normalizeImageBatchScopeDocumentId(String(scope.tenantId));
    const storeScope = normalizeImageBatchScopeDocumentId(String(scope.storeId));
    if (!parsed || !tenantScope || !storeScope) return false;
    if (scope.expectedBucket !== undefined && parsed.bucket !== scope.expectedBucket) return false;
    if (scope.expectedStoragePath !== undefined && parsed.storagePath !== scope.expectedStoragePath) return false;
    return parsed.storagePath.startsWith(`media/menuItem/${tenantScope.documentId}/${storeScope.documentId}/`);
}
