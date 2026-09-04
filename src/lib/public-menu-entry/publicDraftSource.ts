import {
    MENU_EXTRACTION_JOB_LIMITS,
    MENU_LINK_IMPORT_MIME_TYPES,
    PUBLIC_CREATE_MENU_IMAGE_MIME_TYPES,
    PUBLIC_CREATE_MENU_UPLOAD_LIMITS,
} from '@data/shared/menuExtractionJob';
import {
    normalizePublicMenuDraftSourceFiles,
    PUBLIC_MENU_DRAFT_SOURCE_FILES_VERSION,
    type PublicMenuDraftSourceFile,
} from '@data/shared/publicMenuDraftSource';

export type ValidatedPublicDraftSource = {
    fileName: string;
    fileSize: number;
    fileType: string;
    imageUrl: string;
    storagePath: string;
};

export type ValidatedPublicDraftLinkSourceMetadata = {
    acquisitionProvider: 'direct-http';
    contentHash: string;
    finalUrl: string;
    sourceKind: string;
    sourceTextLength: number;
    sourceTextPresent: boolean;
    sourceUrl: string;
    storagePath: string;
};

const PUBLIC_DRAFT_LINK_SOURCE_KINDS = new Set([
    'html_text',
    'rendered_html_text',
    'plain_text',
    'json_text',
    'pdf',
    'image',
]);
const SHA_256_HEX_PATTERN = /^[a-f0-9]{64}$/;

const normalizePublicHttpUrl = (value: unknown): string | null => {
    if (typeof value !== 'string' || value.length > 4_000) return null;
    try {
        const url = new URL(value.trim());
        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
        return url.href;
    } catch {
        return null;
    }
};

export function normalizePublicDraftLinkSourceMetadataForProject(
    draft: Record<string, unknown>,
    source: ValidatedPublicDraftSource,
): ValidatedPublicDraftLinkSourceMetadata | null {
    if (draft.sourceType !== 'menu_link_import') return null;
    const metadata = draft.sourceMetadata;
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
    const record = metadata as Record<string, unknown>;
    const sourceUrl = normalizePublicHttpUrl(record.sourceUrl);
    const finalUrl = normalizePublicHttpUrl(record.finalUrl);
    const sourceKind = typeof record.sourceKind === 'string' ? record.sourceKind.trim() : '';
    const contentHash = typeof record.contentHash === 'string' ? record.contentHash.trim().toLowerCase() : '';
    const sourceTextLength = Number(record.sourceTextLength);
    const sourceTextPresent = record.sourceTextPresent === true;

    if (
        record.acquisitionProvider !== 'direct-http'
        || record.permissionConfirmed !== true
        || record.storagePath !== source.storagePath
        || !sourceUrl
        || !finalUrl
        || !PUBLIC_DRAFT_LINK_SOURCE_KINDS.has(sourceKind)
        || !SHA_256_HEX_PATTERN.test(contentHash)
        || !Number.isSafeInteger(sourceTextLength)
        || sourceTextLength < 0
        || sourceTextLength > 8 * 1024 * 1024
        || sourceTextPresent !== (sourceTextLength > 0)
    ) {
        return null;
    }

    return {
        acquisitionProvider: 'direct-http',
        contentHash,
        finalUrl,
        sourceKind,
        sourceTextLength,
        sourceTextPresent,
        sourceUrl,
        storagePath: source.storagePath,
    };
}

const isVersionedSourceEnvelope = (draft: Record<string, unknown>): boolean => (
    draft.sourceFilesVersion === PUBLIC_MENU_DRAFT_SOURCE_FILES_VERSION
    && Array.isArray(draft.sourceFiles)
);

function getLegacySourceCandidate(draft: Record<string, unknown>): PublicMenuDraftSourceFile[] {
    return [{
        downloadUrl: draft.imageUrl as string,
        fileName: draft.originalFileName as string,
        fileSize: draft.fileSize as number,
        fileType: draft.fileType as string,
        storagePath: draft.imagePath as string,
    }];
}

/**
 * Validate every temporary source before it is promoted into durable project
 * files. New drafts use the versioned envelope; legacy one-source drafts are
 * projected into the same validator for backwards compatibility.
 */
export function normalizePublicDraftSourcesForProject(
    draft: Record<string, unknown>,
    draftId: string,
    options: { allowLocalEmulator: boolean; allowedBucket: string },
): ValidatedPublicDraftSource[] | null {
    if (draft.token !== draftId) return null;
    const sourceType = draft.sourceType === 'menu_link_import'
        ? 'menu_link_import'
        : draft.sourceType === 'image_upload'
            ? 'image_upload'
            : null;
    if (!sourceType) return null;

    const hasVersionedEnvelope = isVersionedSourceEnvelope(draft);
    if ((draft.sourceFiles !== undefined || draft.sourceFilesVersion !== undefined) && !hasVersionedEnvelope) {
        return null;
    }
    const candidates = hasVersionedEnvelope ? draft.sourceFiles : getLegacySourceCandidate(draft);
    const allowedMimeTypes = sourceType === 'menu_link_import'
        ? MENU_LINK_IMPORT_MIME_TYPES
        : PUBLIC_CREATE_MENU_IMAGE_MIME_TYPES;
    const maxFileSizeBytes = sourceType === 'menu_link_import'
        ? MENU_EXTRACTION_JOB_LIMITS.MAX_FILE_SIZE_BYTES
        : PUBLIC_CREATE_MENU_UPLOAD_LIMITS.MAX_FILE_SIZE_BYTES;
    const maxTotalSizeBytes = sourceType === 'menu_link_import'
        ? MENU_EXTRACTION_JOB_LIMITS.MAX_FILE_SIZE_BYTES
        : PUBLIC_CREATE_MENU_UPLOAD_LIMITS.MAX_TOTAL_SIZE_BYTES;
    const normalized = normalizePublicMenuDraftSourceFiles(candidates, {
        ...options,
        allowedMimeTypes,
        draftId,
        maxFiles: sourceType === 'menu_link_import' ? 1 : PUBLIC_CREATE_MENU_UPLOAD_LIMITS.MAX_FILES,
        maxFileSizeBytes,
        maxTotalSizeBytes,
    });
    if (!normalized) return null;

    const primary = normalized[0];
    if (
        draft.imagePath !== primary.storagePath
        || draft.imageUrl !== primary.downloadUrl
        || String(draft.fileType || '').trim().toLowerCase() !== primary.fileType
        || Number(draft.fileSize) !== primary.fileSize
        || String(draft.originalFileName || '') !== primary.fileName
    ) {
        return null;
    }

    return normalized.map((source) => ({
        fileName: source.fileName,
        fileSize: source.fileSize,
        fileType: source.fileType,
        imageUrl: source.downloadUrl,
        storagePath: source.storagePath,
    }));
}

/**
 * Compatibility projection for preview and older callers that need only the
 * primary source image.
 */
export function normalizePublicDraftSourceForProject(
    draft: Record<string, unknown>,
    draftId: string,
    options: { allowLocalEmulator: boolean; allowedBucket: string },
): ValidatedPublicDraftSource | null {
    return normalizePublicDraftSourcesForProject(draft, draftId, options)?.[0] || null;
}
