import uploadBlobToStorage from "@database/storage/uploadBlobToStorage";
import { getMediaImageProfile, type MediaImageType, type MediaImageVariantId } from "@lib/media/imageProfiles";
import { buildMediaStoragePath, getDataUrlBlob, getMediaDataFingerprint, getMediaFileExtension, isDataUrl } from "@lib/media/mediaStorage";
import type { PreparedMediaImage } from "@lib/media/prepareMediaImage";

interface UploadPreparedMediaImageData {
    blob?: Blob;
    contentType?: string | null;
    dataUrl?: string;
    entityId: string;
    mediaChecksum?: string;
    mediaId?: string;
    prepared?: PreparedMediaImage;
    profile: MediaImageType;
    storeId: string | number;
    tenantId: string | number;
    variant?: MediaImageVariantId;
}

function normalizeId(value: string | number | null | undefined, fallback: string): string {
    const normalized = String(value ?? '').trim();
    return normalized || fallback;
}

async function getBlobFingerprint(blob: Blob): Promise<string> {
    const buffer = await blob.arrayBuffer();

    if (typeof crypto !== 'undefined' && crypto.subtle) {
        const digest = await crypto.subtle.digest('SHA-256', buffer);
        return Array.from(new Uint8Array(digest))
            .map((byte) => byte.toString(16).padStart(2, '0'))
            .join('')
            .slice(0, 16);
    }

    const bytes = new Uint8Array(buffer);
    let hash = 0x811c9dc5;
    const step = Math.max(1, Math.floor(bytes.length / 8000));

    for (let index = 0; index < bytes.length; index += step) {
        hash ^= bytes[index];
        hash = Math.imul(hash, 0x01000193);
    }

    hash ^= bytes.length;
    hash = Math.imul(hash, 0x01000193);

    return (hash >>> 0).toString(16).padStart(8, '0');
}

export async function uploadPreparedMediaImage({
    blob,
    contentType,
    dataUrl,
    entityId,
    mediaChecksum,
    mediaId,
    prepared,
    profile,
    storeId,
    tenantId,
    variant,
}: UploadPreparedMediaImageData): Promise<string> {
    const selectedVariantId = variant || prepared?.primaryVariant || getMediaImageProfile(profile).primaryVariant;
    const selectedVariant = prepared?.variants?.[selectedVariantId];
    const uploadBlob = selectedVariant?.blob || prepared?.blob || blob || (isDataUrl(dataUrl) ? getDataUrlBlob(dataUrl) : null);

    if (!uploadBlob) {
        throw new Error('Prepared media upload requires a Blob or data URL.');
    }

    const uploadContentType = selectedVariant?.mimeType || prepared?.mimeType || contentType || uploadBlob.type || 'image/jpeg';
    const blobFingerprint = dataUrl ? getMediaDataFingerprint(dataUrl) : await getBlobFingerprint(uploadBlob);
    const uploadMediaId = prepared?.mediaId
        || mediaId
        || `${profile}_${blobFingerprint}`;
    const checksum = prepared?.checksum || mediaChecksum || blobFingerprint;
    const extension = getMediaFileExtension(uploadContentType);
    const path = buildMediaStoragePath({
        entityId: normalizeId(entityId, 'asset'),
        extension,
        mediaId: uploadMediaId,
        profile,
        storeId: normalizeId(storeId, 'store'),
        tenantId: normalizeId(tenantId, 'tenant'),
        variant: selectedVariantId,
    });

    return uploadBlobToStorage({
        blob: uploadBlob,
        contentType: uploadContentType,
        customMetadata: {
            checksum,
            mediaId: uploadMediaId,
            profile,
            variant: selectedVariantId,
            version: String(prepared?.version ?? 1),
        },
        path,
    });
}
