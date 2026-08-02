"use client";

import { CAMPAIGNCUE_API_ROUTES } from "@constant/campaigncue/routes";
import { parseCampaignCueAssetRecord } from "@lib/campaigncue/assetBoundary";
import { campaigncueAuth, campaigncueStorage, isCampaignCueFirebaseConfigured } from "@lib/firebase/campaigncueFirebaseClient";
import { createTimestampedRuntimeId } from "@lib/runtime/randomId";
import { readJsonResponseWithLimit } from "@lib/security/boundedResponseBody";
import { deleteObject, ref, uploadBytesResumable, type FirebaseStorage } from "firebase/storage";
import { signInWithCustomToken } from "firebase/auth";
import type { CampaignCueAsset } from "@type/campaigncue";

const RESPONSE_LIMIT = 1024 * 1024;
const MAX_PREVIEW_BYTES = 1024 * 1024;
const MIME_TYPES = new Map<string, CampaignCueAsset["assetType"]>([
    ["image/jpeg", "image"], ["image/png", "image"], ["image/webp", "image"], ["image/gif", "image"],
    ["video/mp4", "video"], ["video/quicktime", "video"], ["video/webm", "video"],
    ["audio/mpeg", "audio"], ["audio/mp4", "audio"], ["audio/wav", "audio"], ["audio/ogg", "audio"], ["audio/webm", "audio"],
]);

type Preview = { blob: Blob; durationSeconds?: number; height: number; width: number };

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
        const bitmap = await createImageBitmap(file);
        try {
            drawContained(context, bitmap, bitmap.width, bitmap.height);
            return { blob: await canvasBlob(canvas), width: bitmap.width, height: bitmap.height };
        } finally {
            bitmap.close();
        }
    }
    if (assetType === "video") {
        const url = URL.createObjectURL(file);
        try {
            const video = document.createElement("video");
            video.preload = "metadata";
            video.muted = true;
            video.playsInline = true;
            await new Promise<void>((resolve, reject) => {
                video.onloadeddata = () => {
                    const target = Math.min(1, Math.max(0, Number(video.duration || 0) / 3));
                    if (target > 0) video.currentTime = target;
                    else resolve();
                };
                video.onseeked = () => resolve();
                video.onerror = () => reject(new Error("The selected video could not be decoded."));
                video.src = url;
            });
            drawContained(context, video, video.videoWidth || 480, video.videoHeight || 270);
            return {
                blob: await canvasBlob(canvas),
                durationSeconds: Number.isFinite(video.duration) ? Number(video.duration.toFixed(2)) : undefined,
                width: video.videoWidth || 480,
                height: video.videoHeight || 270,
            };
        } finally {
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

const upload = (storage: FirebaseStorage, path: string, body: Blob, contentType: string, onProgress?: (progress: number) => void) => (
    new Promise<void>((resolve, reject) => {
        const task = uploadBytesResumable(ref(storage, path), body, {
            cacheControl: "private,max-age=0,no-store",
            contentType,
        });
        task.on("state_changed", (snapshot) => {
            onProgress?.(snapshot.totalBytes ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100) : 0);
        }, reject, () => resolve());
    })
);

const readData = async (response: Response) => {
    const payload = await readJsonResponseWithLimit<unknown>(response, RESPONSE_LIMIT);
    if (!response.ok || !payload || typeof payload !== "object" || !("data" in payload)) {
        const message = payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
            ? payload.error
            : "CampaignCue media upload failed.";
        throw new Error(message);
    }
    return (payload as { data: unknown }).data;
};

export async function uploadCampaignCueMediaAsset(params: {
    file: File;
    onProgress?: (progress: number) => void;
    rightsNote?: string;
    workspaceId: string;
}): Promise<CampaignCueAsset> {
    if (!isCampaignCueFirebaseConfigured || !campaigncueAuth || !campaigncueStorage) {
        throw new Error("CampaignCue private media storage is not configured for this environment.");
    }
    const auth = campaigncueAuth;
    const storage = campaigncueStorage;
    const assetType = MIME_TYPES.get(params.file.type.toLowerCase());
    if (!assetType || !["image", "video", "audio"].includes(assetType)) {
        throw new Error("Choose a supported image, MP4, WebM, QuickTime, MP3, MP4 audio, WAV, OGG, or WebM audio file.");
    }
    if (!params.file.size || params.file.size > 250 * 1024 * 1024) {
        throw new Error("Choose a non-empty media file up to 250 MB.");
    }
    const preview = await createPreview(params.file, assetType);
    if (preview.blob.size > MAX_PREVIEW_BYTES) throw new Error("The generated media preview is too large.");
    const tokenResponse = await fetch(CAMPAIGNCUE_API_ROUTES.FIREBASE_TOKEN, { credentials: "include" });
    const tokenData = await readData(tokenResponse);
    if (!tokenData || typeof tokenData !== "object" || !("token" in tokenData) || typeof tokenData.token !== "string") {
        throw new Error("CampaignCue private upload authorization is unavailable.");
    }
    if (!("workspaceId" in tokenData) || tokenData.workspaceId !== params.workspaceId) {
        throw new Error("CampaignCue private upload scope changed. Refresh the workspace before uploading.");
    }
    await signInWithCustomToken(auth, tokenData.token);
    const uploadId = createTimestampedRuntimeId("upload", 8);
    const folder = `campaigncue/assets/${params.workspaceId}/${uploadId}`;
    const sourcePath = `${folder}/source.${extensionFor(params.file)}`;
    const previewPath = `${folder}/preview.webp`;
    try {
        await upload(storage, sourcePath, params.file, params.file.type, (progress) => params.onProgress?.(Math.round(progress * 0.9)));
        await upload(storage, previewPath, preview.blob, "image/webp", (progress) => params.onProgress?.(90 + Math.round(progress * 0.1)));
        const registerResponse = await fetch(CAMPAIGNCUE_API_ROUTES.ASSETS, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                idempotencyKey: createTimestampedRuntimeId("cc_asset_upload", 8),
                name: params.file.name.slice(0, 120),
                assetType,
                source: "upload",
                rightsStatus: "confirmed",
                rightsNote: params.rightsNote || "Owner confirmed the uploaded media can be used in this CampaignCue workspace.",
                consentType: "owner_confirmed",
                tags: ["video-studio", "private-upload"],
                storagePath: sourcePath,
                mimeType: params.file.type,
                sizeBytes: params.file.size,
                previewStoragePath: previewPath,
                previewMimeType: "image/webp",
                previewSizeBytes: preview.blob.size,
                width: preview.width,
                height: preview.height,
                durationSeconds: preview.durationSeconds,
            }),
        });
        const rawAsset = await readData(registerResponse);
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
        await Promise.allSettled([
            deleteObject(ref(storage, sourcePath)),
            deleteObject(ref(storage, previewPath)),
        ]);
        throw error;
    }
}
