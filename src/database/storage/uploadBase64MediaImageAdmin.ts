import { randomUUID } from "crypto";
import { storageAdmin } from "@lib/firebase/firebaseAdmin";
import { getMediaImageProfile, type MediaImageType } from "@lib/media/imageProfiles";
import { buildMediaStoragePath, getMediaDataFingerprint, getMediaFileExtension } from "@lib/media/mediaStorage";
import { STORAGE_CACHE_CONTROL } from "@lib/storage/cacheControl";

interface UploadBase64MediaImageAdminInput {
    dataUrl: string;
    entityId: string;
    mediaId?: string;
    profile: MediaImageType;
    storeId: number | string;
    tenantId: number | string;
}

function parseImageDataUrl(dataUrl: string): { buffer: Buffer; mimeType: string } {
    const match = dataUrl.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,([\s\S]+)$/i);
    if (!match) {
        throw new Error("Admin media upload requires a supported image data URL.");
    }

    return {
        buffer: Buffer.from(match[2], 'base64'),
        mimeType: match[1].toLowerCase().replace('image/jpg', 'image/jpeg'),
    };
}

export async function uploadBase64MediaImageAdmin({
    dataUrl,
    entityId,
    mediaId,
    profile,
    storeId,
    tenantId,
}: UploadBase64MediaImageAdminInput): Promise<string> {
    const { buffer, mimeType } = parseImageDataUrl(dataUrl);
    const profileConfig = getMediaImageProfile(profile);
    if (!(profileConfig.allowedMimeTypes as readonly string[]).includes(mimeType)) {
        throw new Error(`${profileConfig.label} requires a supported image type.`);
    }
    if (buffer.length > profileConfig.maxSourceBytes) {
        throw new Error(`${profileConfig.label} exceeds the maximum allowed source size.`);
    }

    const fingerprint = getMediaDataFingerprint(dataUrl);
    const uploadMediaId = mediaId || `${profile}_${fingerprint}`;
    const variant = profileConfig.primaryVariant;
    const extension = getMediaFileExtension(mimeType);
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

    await file.save(buffer, {
        metadata: {
            cacheControl: STORAGE_CACHE_CONTROL.immutablePublic,
            contentType: mimeType,
            metadata: {
                checksum: fingerprint,
                firebaseStorageDownloadTokens: token,
                mediaId: uploadMediaId,
                profile,
                retentionPolicy: 'public_asset_until_replaced_or_deleted',
                source: 'batch-image-generation-worker',
                variant,
                version: '1',
            },
        },
        resumable: false,
    });

    return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}
