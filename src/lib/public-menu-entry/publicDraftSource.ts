import {
    MENU_EXTRACTION_JOB_LIMITS,
    MENU_LINK_IMPORT_MIME_TYPES,
    PUBLIC_CREATE_MENU_IMAGE_MIME_TYPES,
} from '../../data/shared/menuExtractionJob';

const PUBLIC_MENU_IMAGE_MIME_TYPES = new Set<string>(PUBLIC_CREATE_MENU_IMAGE_MIME_TYPES);
const PUBLIC_MENU_LINK_MIME_TYPES = new Set<string>(MENU_LINK_IMPORT_MIME_TYPES);

export type ValidatedPublicDraftSource = {
    fileName: string;
    fileSize: number;
    fileType: string;
    imageUrl: string;
};

/**
 * Validate the temporary source envelope before it is promoted into a durable,
 * publicly rendered project file. The caller supplies the configured bucket so
 * this helper remains pure and can be regression-tested without Firebase.
 */
export function normalizePublicDraftSourceForProject(
    draft: Record<string, unknown>,
    draftId: string,
    options: { allowLocalEmulator: boolean; allowedBucket: string },
): ValidatedPublicDraftSource | null {
    if (draft.token !== draftId || !options.allowedBucket) return null;
    const sourceType = draft.sourceType === 'menu_link_import'
        ? 'menu_link_import'
        : draft.sourceType === 'image_upload'
            ? 'image_upload'
            : null;
    const fileType = typeof draft.fileType === 'string' ? draft.fileType.trim().toLowerCase() : '';
    const allowedTypes = sourceType === 'menu_link_import' ? PUBLIC_MENU_LINK_MIME_TYPES : PUBLIC_MENU_IMAGE_MIME_TYPES;
    const fileSize = Number(draft.fileSize);
    const imagePath = typeof draft.imagePath === 'string' ? draft.imagePath : '';
    const imageUrl = typeof draft.imageUrl === 'string' ? draft.imageUrl : '';
    const fileName = typeof draft.originalFileName === 'string'
        ? draft.originalFileName.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 240)
        : '';
    if (
        !sourceType
        || !allowedTypes.has(fileType)
        || !Number.isFinite(fileSize)
        || fileSize <= 0
        || fileSize > MENU_EXTRACTION_JOB_LIMITS.MAX_FILE_SIZE_BYTES
        || !imagePath.startsWith(`publicMenuDrafts/${draftId}/`)
        || imagePath.length > 1_024
        || imagePath.includes('..')
        || !imageUrl
        || !fileName
    ) {
        return null;
    }

    try {
        const parsed = new URL(imageUrl);
        const isLocalEmulator = options.allowLocalEmulator
            && ['localhost', '127.0.0.1'].includes(parsed.hostname);
        if ((!isLocalEmulator && parsed.protocol !== 'https:') || (isLocalEmulator && !['http:', 'https:'].includes(parsed.protocol))) {
            return null;
        }
        if (!isLocalEmulator && parsed.hostname !== 'firebasestorage.googleapis.com') return null;
        const match = parsed.pathname.match(/^\/v0\/b\/([^/]+)\/o\/([^?]+)$/);
        const bucketName = decodeURIComponent(match?.[1] || '');
        const storagePath = decodeURIComponent(match?.[2] || '');
        if (
            bucketName !== options.allowedBucket
            || storagePath !== imagePath
            || !parsed.searchParams.get('token')
        ) {
            return null;
        }
    } catch {
        return null;
    }

    return { fileName, fileSize, fileType, imageUrl };
}
