export interface AdminImmutableObjectMetadata {
    cacheControl?: string | null;
    contentType?: string | null;
    metadata?: Record<string, string | number | boolean | undefined> | null;
    size?: number | string | null;
}

export interface AdminImmutableStorageFile {
    getMetadata(): Promise<[AdminImmutableObjectMetadata, ...unknown[]]>;
    save(
        data: Buffer,
        options: {
            metadata: {
                cacheControl: string;
                contentType: string;
                metadata: Record<string, string>;
            };
            preconditionOpts: { ifGenerationMatch: number };
            resumable: false;
        },
    ): Promise<unknown>;
}

export interface CreateOrReuseAdminImmutableObjectInput {
    bucketName: string;
    buffer: Buffer;
    cacheControl: string;
    contentType: string;
    customMetadata: Record<string, string>;
    file: AdminImmutableStorageFile;
    path: string;
    token: string;
}

export interface CreateOrReuseAdminImmutableObjectResult {
    created: boolean;
    token: string;
    url: string;
}

const FIREBASE_DOWNLOAD_TOKEN_METADATA_KEY = 'firebaseStorageDownloadTokens';
const MAX_DOWNLOAD_TOKEN_LENGTH = 512;

export function isAdminImmutableObjectCreateConflict(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const candidate = error as { code?: unknown; statusCode?: unknown };
    return candidate.code === 412
        || candidate.code === '412'
        || candidate.statusCode === 412
        || candidate.statusCode === '412';
}

export function adminImmutableObjectMatchesUpload(
    existing: AdminImmutableObjectMetadata,
    expected: Pick<CreateOrReuseAdminImmutableObjectInput, 'buffer' | 'cacheControl' | 'contentType' | 'customMetadata'>,
): boolean {
    if (Number(existing.size) !== expected.buffer.length) return false;
    if (existing.cacheControl !== expected.cacheControl) return false;
    if (existing.contentType !== expected.contentType) return false;

    return Object.entries(expected.customMetadata).every(([key, value]) => (
        existing.metadata?.[key] === value
    ));
}

export function getAdminImmutableObjectDownloadToken(
    metadata: AdminImmutableObjectMetadata,
): string | null {
    const rawTokens = metadata.metadata?.[FIREBASE_DOWNLOAD_TOKEN_METADATA_KEY];
    if (typeof rawTokens !== 'string') return null;
    const token = rawTokens.split(',')[0]?.trim() || '';
    if (!token || token.length > MAX_DOWNLOAD_TOKEN_LENGTH || /[\u0000-\u001F\u007F]/.test(token)) {
        return null;
    }
    return token;
}

export function buildAdminImmutableObjectDownloadUrl(
    bucketName: string,
    path: string,
    token: string,
): string {
    return `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucketName)}/o/${encodeURIComponent(path)}?alt=media&token=${encodeURIComponent(token)}`;
}

/**
 * Create an immutable Admin SDK object once. A deterministic retry reuses the
 * existing object and its existing Firebase download token instead of
 * overwriting bytes or invalidating an already-persisted public URL.
 */
export async function createOrReuseAdminImmutableObject({
    bucketName,
    buffer,
    cacheControl,
    contentType,
    customMetadata,
    file,
    path,
    token,
}: CreateOrReuseAdminImmutableObjectInput): Promise<CreateOrReuseAdminImmutableObjectResult> {
    try {
        await file.save(buffer, {
            metadata: {
                cacheControl,
                contentType,
                metadata: {
                    ...customMetadata,
                    [FIREBASE_DOWNLOAD_TOKEN_METADATA_KEY]: token,
                },
            },
            preconditionOpts: { ifGenerationMatch: 0 },
            resumable: false,
        });
        return {
            created: true,
            token,
            url: buildAdminImmutableObjectDownloadUrl(bucketName, path, token),
        };
    } catch (error) {
        if (!isAdminImmutableObjectCreateConflict(error)) throw error;
    }

    const [existingMetadata] = await file.getMetadata();
    if (!adminImmutableObjectMatchesUpload(existingMetadata, {
        buffer,
        cacheControl,
        contentType,
        customMetadata,
    })) {
        throw new Error('storage_immutable_object_identity_mismatch');
    }
    const existingToken = getAdminImmutableObjectDownloadToken(existingMetadata);
    if (!existingToken) throw new Error('storage_immutable_object_download_token_missing');

    return {
        created: false,
        token: existingToken,
        url: buildAdminImmutableObjectDownloadUrl(bucketName, path, existingToken),
    };
}
