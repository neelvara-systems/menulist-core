import { createOrReuseBlobInStorage } from "@database/storage/uploadBlobToStorage";
import { getMediaImageProfile, type MediaImageType, type MediaImageVariantId } from "@lib/media/imageProfiles";
import { buildMediaStoragePath, getDataUrlBlob, getMediaFileExtension, isDataUrl } from "@lib/media/mediaStorage";
import {
    assertMediaUploadBlobCandidate,
    normalizeMediaUploadMimeType,
    resolvePreparedMediaIdentity,
} from "@lib/media/mediaUploadBoundary";
import type { PreparedMediaImage, PreparedMediaVariant } from "@lib/media/prepareMediaImage";
import { STORAGE_CACHE_CONTROL } from "@lib/storage/cacheControl";

const PUBLIC_MEDIA_RETENTION_POLICY = 'public_asset_until_replaced_or_deleted';

export interface UploadPreparedMediaImageData {
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

export interface UploadedPreparedMediaImage {
    primaryUrl: string;
    variantUrls: string[];
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

export async function uploadPreparedMediaImageWithLedger({
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
}: UploadPreparedMediaImageData): Promise<UploadedPreparedMediaImage> {
    const profileConfig = getMediaImageProfile(profile);
    if (!profileConfig) throw new Error('prepared_media_profile_invalid');
    if (prepared && (prepared.profile !== profile || prepared.imageType !== profile)) {
        throw new Error('prepared_media_profile_mismatch');
    }

    const selectedVariantId = variant || prepared?.primaryVariant || profileConfig.primaryVariant;
    if (!profileConfig.variants.some((entry) => entry.id === selectedVariantId)) {
        throw new Error('prepared_media_variant_invalid');
    }
    const selectedVariant = prepared?.variants?.[selectedVariantId];
    if (prepared && variant && !selectedVariant && selectedVariantId !== prepared.primaryVariant) {
        throw new Error('prepared_media_variant_missing');
    }
    const useDataUrlBlob = !selectedVariant?.blob && !prepared?.blob && !blob && isDataUrl(dataUrl);
    const uploadBlob = selectedVariant?.blob || prepared?.blob || blob || (useDataUrlBlob ? getDataUrlBlob(dataUrl) : null);

    if (!uploadBlob) {
        throw new Error('Prepared media upload requires a Blob or data URL.');
    }

    const uploadContentType = normalizeMediaUploadMimeType(
        selectedVariant?.mimeType || prepared?.mimeType || contentType || uploadBlob.type,
    );
    assertMediaUploadBlobCandidate({
        blob: uploadBlob,
        mimeType: uploadContentType,
        preparedOutput: prepared?.exifNormalized === true,
        profile,
        variant: selectedVariantId,
    });
    const blobFingerprint = await getBlobFingerprint(uploadBlob);
    const identity = resolvePreparedMediaIdentity({
        blobFingerprint,
        mediaChecksum,
        mediaId,
        preparedChecksum: prepared?.checksum,
        preparedMediaId: prepared?.mediaId,
        profile,
    });
    const checksum = identity.checksum;
    const uploadMediaId = identity.mediaId;
    const preparedVersion = prepared?.version ?? 1;
    if (!Number.isSafeInteger(preparedVersion) || preparedVersion < 1 || preparedVersion > 99) {
        throw new Error('prepared_media_version_invalid');
    }
    const version = String(preparedVersion);
    const exifNormalized = prepared?.exifNormalized === true;
    const sourceMetadataPolicy = exifNormalized ? 'source_metadata_stripped' : 'source_metadata_not_normalized';
    const uploadVariant = async (variantId: MediaImageVariantId, variantBlob: Blob, variantContentType: string) => {
        const normalizedContentType = normalizeMediaUploadMimeType(variantContentType || variantBlob.type);
        assertMediaUploadBlobCandidate({
            blob: variantBlob,
            mimeType: normalizedContentType,
            preparedOutput: prepared?.exifNormalized === true,
            profile,
            variant: variantId,
        });
        const extension = getMediaFileExtension(normalizedContentType);
        const path = buildMediaStoragePath({
            entityId,
            extension,
            mediaId: uploadMediaId,
            profile,
            storeId: typeof storeId === 'string' || typeof storeId === 'number' ? String(storeId) : '',
            tenantId: typeof tenantId === 'string' || typeof tenantId === 'number' ? String(tenantId) : '',
            variant: variantId,
        });

        const result = await createOrReuseBlobInStorage({
            blob: variantBlob,
            cacheControl: STORAGE_CACHE_CONTROL.immutablePublic,
            contentType: normalizedContentType,
            customMetadata: {
                checksum,
                exifNormalized: String(exifNormalized),
                mediaId: uploadMediaId,
                profile,
                retentionPolicy: PUBLIC_MEDIA_RETENTION_POLICY,
                sourceMetadataPolicy,
                variant: variantId,
                version,
            },
            path,
        });
        if (!result.url) throw new Error('Prepared media upload returned no URL');
        return result.url;
    };

    const preparedVariants: PreparedMediaVariant[] = [];
    if (prepared?.variants) {
        const seenVariantIds = new Set<MediaImageVariantId>();
        for (const [variantKey, entry] of Object.entries(prepared.variants)) {
            if (!entry) continue;
            if (
                entry.id !== variantKey
                || !profileConfig.variants.some((allowed) => allowed.id === entry.id)
                || seenVariantIds.has(entry.id)
                || !(entry.blob instanceof Blob)
            ) {
                throw new Error('prepared_media_variants_invalid');
            }
            seenVariantIds.add(entry.id);
            preparedVariants.push(entry);
        }
    }

    if (preparedVariants.length > 0) {
        const selectedPreparedVariant = preparedVariants.find(
            (preparedVariant) => preparedVariant.id === selectedVariantId,
        );
        if (!selectedPreparedVariant) {
            throw new Error('prepared_media_variant_missing');
        }
        const primaryUrl = await uploadVariant(
            selectedPreparedVariant.id,
            selectedPreparedVariant.blob,
            selectedPreparedVariant.mimeType || selectedPreparedVariant.blob.type || uploadContentType,
        );
        if (!primaryUrl) throw new Error('Prepared media upload returned no URL');
        return {
            primaryUrl,
            variantUrls: [primaryUrl],
        };
    }

    const primaryUrl = await uploadVariant(selectedVariantId, uploadBlob, uploadContentType);
    if (!primaryUrl) throw new Error('Prepared media upload returned no URL');
    return { primaryUrl, variantUrls: [primaryUrl] };
}

export async function uploadPreparedMediaImage(
    data: UploadPreparedMediaImageData,
): Promise<string> {
    return (await uploadPreparedMediaImageWithLedger(data)).primaryUrl;
}
