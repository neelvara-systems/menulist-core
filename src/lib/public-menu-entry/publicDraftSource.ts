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
