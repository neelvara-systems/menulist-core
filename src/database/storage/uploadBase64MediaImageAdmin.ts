import { randomUUID } from "crypto";
import { storageAdmin } from "@lib/firebase/firebaseAdmin";
import { getMediaImageProfile, type MediaImageType } from "@lib/media/imageProfiles";
import { prepareMediaImageAdmin } from "@lib/media/prepareMediaImageAdmin";
import { buildMediaStoragePath, getMediaFileExtension } from "@lib/media/mediaStorage";
import { createOrReuseAdminImmutableObject } from "@lib/storage/adminImmutableObject";
import { STORAGE_CACHE_CONTROL } from "@lib/storage/cacheControl";

interface UploadBase64MediaImageAdminInput {
    aspectRatio?: string | null;
    dataUrl: string;
    entityId: string;
    mediaId?: string;
    profile: MediaImageType;
    storeId: number | string;
    tenantId: number | string;
}

export type UploadedMediaImageAdminResult = {
    created: boolean;
    mimeType: string;
    path: string;
    sizeBytes: number;
    url: string;
};

export async function uploadBase64MediaImageAdminWithMetadata({
    aspectRatio,
    dataUrl,
    entityId,
    mediaId,
    profile,
    storeId,
    tenantId,
}: UploadBase64MediaImageAdminInput): Promise<UploadedMediaImageAdminResult> {
    const profileConfig = getMediaImageProfile(profile);
    const prepared = await prepareMediaImageAdmin(dataUrl, profile, { aspectRatio });
    const uploadMediaId = mediaId || prepared.mediaId;
    const variant = prepared.primaryVariant || profileConfig.primaryVariant;
    const extension = getMediaFileExtension(prepared.mimeType);
    const path = buildMediaStoragePath({
        entityId: String(entityId),
        extension,
        mediaId: uploadMediaId,
        profile,
        storeId: String(storeId),
        tenantId: String(tenantId),
        variant,
    });
    const token = randomUUID();
    const bucket = storageAdmin.bucket();
    const file = bucket.file(path);
    const customMetadata = {
        checksum: prepared.checksum,
        compressionRatio: prepared.compressionRatio.toFixed(4),
        height: String(prepared.height),
        mediaId: uploadMediaId,
        originalHeight: String(prepared.originalHeight),
        originalMimeType: prepared.originalMimeType,
        originalSizeBytes: String(prepared.originalSize),
        originalWidth: String(prepared.originalWidth),
        preparedSizeBytes: String(prepared.sizeBytes),
        preparedVersion: String(prepared.version),
        profile,
        retentionPolicy: 'public_asset_until_replaced_or_deleted',
        source: 'batch-image-generation-worker',
        variant,
        version: '1',
        width: String(prepared.width),
    };
    const upload = await createOrReuseAdminImmutableObject({
        bucketName: bucket.name,
        buffer: prepared.buffer,
        cacheControl: STORAGE_CACHE_CONTROL.immutablePublic,
        contentType: prepared.mimeType,
        customMetadata,
        file,
        path,
        token,
    });

    return {
        created: upload.created,
        mimeType: prepared.mimeType,
        path,
        sizeBytes: prepared.sizeBytes,
        url: upload.url,
    };
}

export async function uploadBase64MediaImageAdmin(
    input: UploadBase64MediaImageAdminInput,
): Promise<string> {
    return (await uploadBase64MediaImageAdminWithMetadata(input)).url;
}
