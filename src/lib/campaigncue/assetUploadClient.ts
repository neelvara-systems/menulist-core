"use client";

import { CAMPAIGNCUE_API_ROUTES } from "@constant/campaigncue/routes";
import { CAMPAIGNCUE_ASSET_SIZE_LIMITS_BYTES } from "@constant/campaigncue/database";
import { parseCampaignCueAssetRecord } from "@lib/campaigncue/assetBoundary";
import {
    isDefinitiveCampaignCueMediaRegistrationRejection,
    shouldCleanupCampaignCueMediaUploadAfterFailure,
} from "@lib/campaigncue/assetUploadRecovery";
import {
    buildCampaignCueMediaMissionTags,
    campaignCueRightsStatusForConsent,
    type CampaignCueMediaConsentType,
} from "@lib/campaigncue/mediaMissions";
import { withCampaignCueFirebaseSession } from "@lib/campaigncue/firebaseSessionClient";
import { isCampaignCueFirebaseConfigured } from "@lib/firebase/campaigncueFirebaseClient";
import { createTimestampedRuntimeId } from "@lib/runtime/randomId";
import { readJsonResponseWithLimit } from "@lib/security/boundedResponseBody";
import { deleteObject, ref, uploadBytesResumable, type FirebaseStorage } from "firebase/storage";
import type { CampaignCueAsset } from "@type/campaigncue";

const RESPONSE_LIMIT = 1024 * 1024;
const MAX_PREVIEW_BYTES = 1024 * 1024;
const MAX_MEDIA_DIMENSION = 16_384;
const PREVIEW_DECODE_TIMEOUT_MS = 15_000;
const MIME_TYPES = new Map<string, CampaignCueAsset["assetType"]>([
    ["image/jpeg", "image"], ["image/png", "image"], ["image/webp", "image"], ["image/gif", "image"],
    ["video/mp4", "video"], ["video/quicktime", "video"], ["video/webm", "video"],
    ["audio/mpeg", "audio"], ["audio/mp4", "audio"], ["audio/wav", "audio"], ["audio/ogg", "audio"], ["audio/webm", "audio"],
]);

type Preview = { blob: Blob; durationSeconds?: number; height: number; width: number };
type UploadAssetType = "audio" | "image" | "video";

const formatFileSize = (bytes: number) => `${Math.round(bytes / (1024 * 1024))} MB`;

const assertSafeDimensions = (width: number, height: number) => {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
        throw new Error("The selected media has invalid dimensions.");
    }
    if (width > MAX_MEDIA_DIMENSION || height > MAX_MEDIA_DIMENSION) {
        throw new Error(`Choose media no larger than ${MAX_MEDIA_DIMENSION} pixels on either side.`);
    }
};

const withTimeout = <T,>(promise: Promise<T>, message: string): Promise<T> => new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error(message)), PREVIEW_DECODE_TIMEOUT_MS);
    promise.then(
        (value) => {
            window.clearTimeout(timeout);
            resolve(value);
        },
        (error) => {
            window.clearTimeout(timeout);
            reject(error);
        },
    );
});

const extensionFor = (file: File) => {
    const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
    return extension?.slice(0, 8) || (file.type.includes("webm") ? "webm" : "bin");
};

const canvasBlob = (canvas: HTMLCanvasElement) => new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Media preview could not be created.")), "image/webp", 0.82);
});

const drawContained = (
    context: CanvasRenderingContext2D,
    source: CanvasImageSource,
    sourceWidth: number,
    sourceHeight: number,
) => {
    const scale = Math.min(480 / sourceWidth, 270 / sourceHeight);
    const width = sourceWidth * scale;
    const height = sourceHeight * scale;
    context.fillStyle = "#141225";
    context.fillRect(0, 0, 480, 270);
    context.drawImage(source, (480 - width) / 2, (270 - height) / 2, width, height);
};

const createPreview = async (file: File, assetType: CampaignCueAsset["assetType"]): Promise<Preview> => {
    const canvas = document.createElement("canvas");
    canvas.width = 480;
    canvas.height = 270;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Media preview is unavailable in this browser.");

    if (assetType === "image") {
        const bitmapPromise = createImageBitmap(file);
        let bitmap: ImageBitmap;
        try {
            bitmap = await withTimeout(bitmapPromise, "The selected image took too long to decode.");
        } catch (error) {
            void bitmapPromise.then((lateBitmap) => lateBitmap.close()).catch(() => undefined);
            throw error;
        }
        try {
            assertSafeDimensions(bitmap.width, bitmap.height);
            drawContained(context, bitmap, bitmap.width, bitmap.height);
            return { blob: await canvasBlob(canvas), width: bitmap.width, height: bitmap.height };
        } finally {
            bitmap.close();
        }
    }
    if (assetType === "video") {
        const url = URL.createObjectURL(file);
        const video = document.createElement("video");
        try {
            video.preload = "metadata";
            video.muted = true;
            video.playsInline = true;
            const videoReady = new Promise<void>((resolve, reject) => {
                video.onloadeddata = () => {
                    try {
                        assertSafeDimensions(video.videoWidth, video.videoHeight);
                    } catch (error) {
                        reject(error);
                        return;
                    }
                    const target = Math.min(1, Math.max(0, Number(video.duration || 0) / 3));
                    if (target > 0) video.currentTime = target;
                    else resolve();
                };
                video.onseeked = () => resolve();
                video.onerror = () => reject(new Error("The selected video could not be decoded."));
                video.src = url;
            });
            await withTimeout(videoReady, "The selected video took too long to decode.");
            drawContained(context, video, video.videoWidth || 480, video.videoHeight || 270);
            return {
                blob: await canvasBlob(canvas),
                durationSeconds: Number.isFinite(video.duration) ? Number(video.duration.toFixed(2)) : undefined,
                width: video.videoWidth || 480,
                height: video.videoHeight || 270,
            };
        } finally {
            video.onloadeddata = null;
            video.onseeked = null;
            video.onerror = null;
            video.removeAttribute("src");
            video.load();
            URL.revokeObjectURL(url);
        }
    }
    const gradient = context.createLinearGradient(0, 0, 480, 270);
    gradient.addColorStop(0, "#6d5dfc");
    gradient.addColorStop(1, "#241f4f");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 480, 270);
    context.fillStyle = "#ffffff";
    context.font = "600 34px Inter, sans-serif";
    context.textAlign = "center";
    context.fillText("Audio", 240, 145);
    return { blob: await canvasBlob(canvas), width: 480, height: 270 };
};

const upload = (
    storage: FirebaseStorage,
    path: string,
    body: Blob,
    contentType: string,
    uploadedBy: string,
    onProgress?: (progress: number) => void,
) => (
    new Promise<void>((resolve, reject) => {
        const task = uploadBytesResumable(ref(storage, path), body, {
            cacheControl: "private,max-age=0,no-store",
            contentType,
            customMetadata: { uploadedBy },
        });
        task.on("state_changed", (snapshot) => {
            onProgress?.(snapshot.totalBytes ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100) : 0);
        }, reject, () => resolve());
    })
);

class CampaignCueMediaRegistrationError extends Error {
    constructor(message: string, readonly status: number) {
        super(message);
        this.name = "CampaignCueMediaRegistrationError";
    }
}

const readData = async (response: Response) => {
    let payload: unknown;
    try {
        payload = await readJsonResponseWithLimit<unknown>(response, RESPONSE_LIMIT);
    } catch (error) {
        if (!response.ok) {
            throw new CampaignCueMediaRegistrationError("CampaignCue media upload failed.", response.status);
        }
        throw error;
    }
    if (!response.ok) {
        const message = payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
            ? payload.error
            : "CampaignCue media upload failed.";
        throw new CampaignCueMediaRegistrationError(message, response.status);
    }
    if (!payload || typeof payload !== "object" || !("data" in payload)) {
        throw new Error("CampaignCue returned an invalid media asset response.");
    }
    return (payload as { data: unknown }).data;
};

const SAFE_MEDIA_UPLOAD_MESSAGES = new Set([
    "CampaignCue private media storage is not configured for this environment.",
    "Choose a supported image, MP4, WebM, QuickTime, MP3, MP4 audio, WAV, OGG, or WebM audio file.",
    "The selected media has invalid dimensions.",
    "The selected image took too long to decode.",
    "The selected video took too long to decode.",
    "The selected video could not be decoded.",
    "The generated media preview is too large.",
    "CampaignCue private upload authorization is unavailable.",
    "CampaignCue private upload scope changed. Refresh the workspace before uploading.",
]);

export const getCampaignCueMediaUploadFailureNotice = (error: unknown): string => {
    const message = error instanceof Error ? error.message : "";
    if (SAFE_MEDIA_UPLOAD_MESSAGES.has(message)) return message;
    if (/^Choose a non-empty (?:audio|image|video) file up to (?:12|50|250) MB\.$/.test(message)) return message;
    if (/^Choose media no larger than 16384 pixels on either side\.$/.test(message)) return message;
    return "Private media upload could not be completed. Check the file and try again.";
};

export async function uploadCampaignCueMediaAsset(params: {
    allowedAssetTypes?: readonly UploadAssetType[];
    consentType?: CampaignCueMediaConsentType;
    file: File;
    missionTask?: string;
    onProgress?: (progress: number) => void;
    recipeId?: string;
    rightsNote?: string;
    tags?: readonly string[];
    workspaceId: string;
}): Promise<CampaignCueAsset> {
    if (!isCampaignCueFirebaseConfigured) {
        throw new Error("CampaignCue private media storage is not configured for this environment.");
    }
    const assetType = MIME_TYPES.get(params.file.type.toLowerCase()) as UploadAssetType | undefined;
    const allowedAssetTypes: readonly UploadAssetType[] = params.allowedAssetTypes || ["image", "video", "audio"];
    if (!assetType || !allowedAssetTypes.includes(assetType)) {
        throw new Error("Choose a supported image, MP4, WebM, QuickTime, MP3, MP4 audio, WAV, OGG, or WebM audio file.");
    }
    const maxBytes = CAMPAIGNCUE_ASSET_SIZE_LIMITS_BYTES[assetType];
    if (!params.file.size || params.file.size > maxBytes) {
        throw new Error(`Choose a non-empty ${assetType} file up to ${formatFileSize(maxBytes)}.`);
    }
    const consentType = params.consentType || "owner_confirmed";
    const rightsStatus = campaignCueRightsStatusForConsent(consentType);
    const preview = await createPreview(params.file, assetType);
    if (preview.blob.size > MAX_PREVIEW_BYTES) throw new Error("The generated media preview is too large.");
    const uploadId = createTimestampedRuntimeId("upload", 8);
    const folder = `campaigncue/assets/${params.workspaceId}/${uploadId}`;
    const sourcePath = `${folder}/source.${extensionFor(params.file)}`;
    const previewPath = `${folder}/preview.webp`;
    const registrationPayload = JSON.stringify({
        idempotencyKey: createTimestampedRuntimeId("cc_asset_upload", 8),
        name: params.file.name.slice(0, 120),
        assetType,
        source: "upload",
        rightsStatus,
        rightsNote: params.rightsNote || (rightsStatus === "confirmed"
            ? "Owner confirmed this uploaded media can be used in the CampaignCue workspace."
            : "Owner uploaded this media privately but still needs to confirm permission before public use."),
        consentType,
        tags: buildCampaignCueMediaMissionTags({
            extraTags: params.tags,
            recipeId: params.recipeId,
            task: params.missionTask,
        }),
        storagePath: sourcePath,
        mimeType: params.file.type,
        sizeBytes: params.file.size,
        previewStoragePath: previewPath,
        previewMimeType: "image/webp",
        previewSizeBytes: preview.blob.size,
        width: preview.width,
        height: preview.height,
        durationSeconds: preview.durationSeconds,
    });
    return withCampaignCueFirebaseSession(
        params.workspaceId,
        { purpose: "media_upload", sourceFileName: sourcePath.split("/").at(-1) || "", uploadId },
        async ({ storage, userId: uploadedBy }) => {
            let registrationDispatched = false;
            let registrationWasUncertain = false;
            try {
                await upload(storage, sourcePath, params.file, params.file.type, uploadedBy, (progress) => params.onProgress?.(Math.round(progress * 0.9)));
                await upload(storage, previewPath, preview.blob, "image/webp", uploadedBy, (progress) => params.onProgress?.(90 + Math.round(progress * 0.1)));
                const register = async () => {
                    registrationDispatched = true;
                    const response = await fetch(CAMPAIGNCUE_API_ROUTES.ASSETS, {
                        method: "POST",
                        credentials: "include",
                        headers: { "Content-Type": "application/json" },
                        body: registrationPayload,
                    });
                    return readData(response);
                };
                let rawAsset: unknown;
                try {
                    rawAsset = await register();
                } catch (error) {
                    if (
                        error instanceof CampaignCueMediaRegistrationError
                        && isDefinitiveCampaignCueMediaRegistrationRejection(error.status)
                    ) {
                        throw error;
                    }
                    registrationWasUncertain = true;
                    rawAsset = await register();
                }
                if (!rawAsset || typeof rawAsset !== "object" || !("id" in rawAsset) || typeof rawAsset.id !== "string") {
                    throw new Error("CampaignCue returned an invalid media asset.");
                }
                const asset = parseCampaignCueAssetRecord({
                    assetId: rawAsset.id,
                    value: rawAsset,
                    workspaceId: params.workspaceId,
                });
                params.onProgress?.(100);
                return asset;
            } catch (error) {
                const responseStatus = error instanceof CampaignCueMediaRegistrationError ? error.status : undefined;
                if (shouldCleanupCampaignCueMediaUploadAfterFailure({
                    registrationDispatched,
                    registrationWasUncertain,
                    responseStatus,
                })) {
                    await Promise.allSettled([
                        deleteObject(ref(storage, sourcePath)),
                        deleteObject(ref(storage, previewPath)),
                    ]);
                }
                throw error;
            }
        },
    );
}
