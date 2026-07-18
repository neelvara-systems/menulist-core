import crypto, { randomUUID } from "crypto";
import { DB_COLLECTIONS } from "@constant/database";
import {
    buildImagePromptCacheSourcePath,
    getReusableImagePromptCacheSource,
    IMAGE_PROMPT_CACHE_KEY_VERSION,
    IMAGE_PROMPT_CACHE_STORAGE_PREFIX,
    isImagePromptCacheSourcePathForKey,
} from "@lib/ai/imagePromptCacheBoundary";
import { firestoreAdmin, storageAdmin, admin } from "@lib/firebase/firebaseAdmin";
import { getMediaImageProfile } from "@lib/media/imageProfiles";
import { buildMediaStoragePath, getMediaFileExtension } from "@lib/media/mediaStorage";
import { prepareMediaImageAdmin } from "@lib/media/prepareMediaImageAdmin";
import { createUppercaseRandomIdSegment } from "@lib/runtime/randomId";
import { getBoundedRuntimeStringContext, logRuntimeDiagnostic, logRuntimeFailure } from "@lib/runtime/runtimeDiagnostics";
import { createOrReuseAdminImmutableObject } from "@lib/storage/adminImmutableObject";
import { STORAGE_CACHE_CONTROL } from "@lib/storage/cacheControl";
import { GenerateImageViaApiPayloadGenerationConfiType } from "@template/main-app/projects/types";

const IMAGE_PROMPT_CACHE_TTL_DAYS = 90;
const IMAGE_PROMPT_CACHE_SOURCE = "ai-image-prompt-cache";
const DAY_MS = 24 * 60 * 60 * 1000;

type ImagePromptCacheConfig = Pick<
    GenerateImageViaApiPayloadGenerationConfiType,
    "aspectRatio" | "backgroundColor" | "numberOfImages" | "selectedImageTypes" | "transparentBg"
>;

type CachedPromptImageDoc = {
    aiModel?: string;
    aspectRatio?: string;
    createdAt?: FirebaseFirestore.Timestamp;
    expiresAt?: FirebaseFirestore.Timestamp;
    height?: number;
    keyVersion?: number;
    mimeType?: string;
    outputSizeBytes?: number;
    promptLength?: number;
    sourcePath?: string;
    updatedAt?: FirebaseFirestore.Timestamp;
    width?: number;
};

type PromptCacheImagePayload = {
    base64: string;
    cacheHit?: boolean;
    mimeType: string;
    promptCacheKey?: string;
    sizeBytes?: number;
    storagePath?: string;
    uploadedUrl?: string;
};

function normalizePromptCacheConfig(generationConfig: GenerateImageViaApiPayloadGenerationConfiType): ImagePromptCacheConfig {
    return {
        aspectRatio: generationConfig?.aspectRatio || "1:1",
        backgroundColor: generationConfig?.backgroundColor || "",
        numberOfImages: Number(generationConfig?.numberOfImages || 1),
        selectedImageTypes: Array.isArray(generationConfig?.selectedImageTypes)
            ? generationConfig.selectedImageTypes.slice().sort()
            : [],
        transparentBg: generationConfig?.transparentBg === true,
    };
}

function getPromptCacheLogContext(params: {
    cacheKey?: unknown;
    entityId?: unknown;
    promptLength?: number;
    sId?: unknown;
    tId?: unknown;
}) {
    return {
        ...getBoundedRuntimeStringContext("cacheKey", params.cacheKey),
        ...getBoundedRuntimeStringContext("entityId", params.entityId),
        ...getBoundedRuntimeStringContext("tenantId", params.tId),
        ...getBoundedRuntimeStringContext("storeId", params.sId),
        promptLength: params.promptLength,
    };
}

function getImagePromptCacheKey(params: {
    aiModel: string;
    destinationMediaId?: string;
    generationConfig: GenerateImageViaApiPayloadGenerationConfiType;
    prompt: string;
}): string {
    return crypto.createHash("sha256")
        .update(JSON.stringify({
            aiModel: params.aiModel,
            config: normalizePromptCacheConfig(params.generationConfig),
            version: IMAGE_PROMPT_CACHE_KEY_VERSION,
            prompt: params.prompt
        }))
        .digest("hex");
}

function getImagePromptCacheRef(cacheKey: string) {
    return firestoreAdmin.collection(DB_COLLECTIONS.AI_IMAGE_PROMPT_CACHE).doc(cacheKey);
}

function normalizeImageDataUrl(image: PromptCacheImagePayload): string {
    if (image.base64.startsWith("data:")) return image.base64;
    return `data:${image.mimeType};base64,${image.base64}`;
}

function isCacheDocFresh(cacheDoc: CachedPromptImageDoc): boolean {
    const expiresAt = cacheDoc.expiresAt?.toMillis?.() || 0;
    return expiresAt > Date.now();
}

export function isImagePromptCacheEligible(params: {
    generationConfig: GenerateImageViaApiPayloadGenerationConfiType;
    prompts: string[];
}): boolean {
    if (params.generationConfig?.referanceImage?.url) return false;
    if (params.prompts.length !== 1) return false;
    if (Number(params.generationConfig?.numberOfImages || 1) !== 1) return false;
    return params.prompts[0].trim().length > 0;
}

export async function copyCachedImagePromptToStore(params: {
    aiModel: string;
    destinationMediaId?: string;
    entityId: string;
    generationConfig: GenerateImageViaApiPayloadGenerationConfiType;
    prompt: string;
    sId: string;
    tId: string;
}): Promise<PromptCacheImagePayload | null> {
    const cacheKey = getImagePromptCacheKey(params);
    const logContext = getPromptCacheLogContext({
        cacheKey,
        entityId: params.entityId,
        promptLength: params.prompt.length,
        sId: params.sId,
        tId: params.tId,
    });

    try {
        const snap = await getImagePromptCacheRef(cacheKey).get();
        if (!snap.exists) return null;

        const cacheDoc = snap.data() as CachedPromptImageDoc;
        if (!isCacheDocFresh(cacheDoc)) {
            return null;
        }

        const bucket = storageAdmin.bucket();
        const sourcePath = typeof cacheDoc.sourcePath === 'string' ? cacheDoc.sourcePath : '';
        if (!sourcePath.startsWith(`${IMAGE_PROMPT_CACHE_STORAGE_PREFIX}/`)) return null;
        const [buffer] = await bucket.file(sourcePath).download();
        const reusableSource = getReusableImagePromptCacheSource(
            cacheDoc as Record<string, unknown>,
            cacheKey,
            buffer,
        );
        if (!reusableSource) {
            logRuntimeDiagnostic("ai_image_prompt_cache_source_rejected", {
                ...logContext,
                sourceBytes: buffer.length,
            });
            return null;
        }

        const { extension, mimeType } = reusableSource;
        const profile = getMediaImageProfile("menuItem");
        const mediaId = params.destinationMediaId || `cache_${cacheKey.slice(0, 16)}_${createUppercaseRandomIdSegment(6)}`;
        const destinationPath = buildMediaStoragePath({
            entityId: params.entityId,
            extension,
            mediaId,
            profile: "menuItem",
            storeId: params.sId,
            tenantId: params.tId,
            variant: profile.primaryVariant,
        });
        const token = randomUUID();
        const checksum = crypto.createHash("sha256").update(buffer).digest("hex");
        const destinationUpload = await createOrReuseAdminImmutableObject({
            bucketName: bucket.name,
            buffer,
            cacheControl: STORAGE_CACHE_CONTROL.immutablePublic,
            contentType: mimeType,
            customMetadata: {
                cacheKey,
                cacheVersion: String(IMAGE_PROMPT_CACHE_KEY_VERSION),
                checksum,
                promptCacheHit: "true",
                profile: "menuItem",
                retentionPolicy: "public_asset_until_replaced_or_deleted",
                source: "ai-image-prompt-cache-hit",
                variant: profile.primaryVariant,
                version: "1",
            },
            file: bucket.file(destinationPath),
            path: destinationPath,
            token,
        });

        logRuntimeDiagnostic("ai_image_prompt_cache_hit", logContext);

        return {
            base64: `data:${mimeType};base64,${buffer.toString("base64")}`,
            cacheHit: true,
            mimeType,
            promptCacheKey: cacheKey,
            sizeBytes: buffer.length,
            storagePath: destinationPath,
            uploadedUrl: destinationUpload.url,
        };
    } catch (error) {
        logRuntimeFailure("ai_image_prompt_cache_hit_failed", error, logContext);
        return null;
    }
}

export async function writeImagePromptCacheSource(params: {
    aiModel: string;
    generationConfig: GenerateImageViaApiPayloadGenerationConfiType;
    image: PromptCacheImagePayload;
    prompt: string;
}): Promise<string | null> {
    const cacheKey = getImagePromptCacheKey(params);
    const logContext = getPromptCacheLogContext({
        cacheKey,
        promptLength: params.prompt.length
    });

    try {
        const dataUrl = normalizeImageDataUrl(params.image);
        const prepared = await prepareMediaImageAdmin(dataUrl, "menuItem", {
            aspectRatio: params.generationConfig?.aspectRatio,
        });
        const extension = getMediaFileExtension(prepared.mimeType);
        const sourcePath = buildImagePromptCacheSourcePath(cacheKey, randomUUID(), extension);
        if (!sourcePath) throw new Error('Image prompt cache source identity is invalid.');
        const now = admin.firestore.Timestamp.now();

        await storageAdmin.bucket().file(sourcePath).save(prepared.buffer, {
            metadata: {
                cacheControl: STORAGE_CACHE_CONTROL.immutablePrivate,
                contentType: prepared.mimeType,
                metadata: {
                    cacheKey,
                    cacheVersion: String(IMAGE_PROMPT_CACHE_KEY_VERSION),
                    checksum: prepared.checksum,
                    height: String(prepared.height),
                    originalMimeType: prepared.originalMimeType,
                    originalSizeBytes: String(prepared.originalSize),
                    preparedSizeBytes: String(prepared.sizeBytes),
                    preparedVersion: String(prepared.version),
                    source: IMAGE_PROMPT_CACHE_SOURCE,
                    width: String(prepared.width),
                },
            },
            resumable: false,
        });

        const cacheRef = getImagePromptCacheRef(cacheKey);
        let previousSourcePath = '';
        await firestoreAdmin.runTransaction(async (transaction) => {
            const current = await transaction.get(cacheRef);
            previousSourcePath = typeof current.data()?.sourcePath === 'string' ? current.data()!.sourcePath : '';
            transaction.set(cacheRef, {
                aiModel: params.aiModel,
                aspectRatio: params.generationConfig?.aspectRatio || "1:1",
                createdAt: now,
                expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + IMAGE_PROMPT_CACHE_TTL_DAYS * DAY_MS),
                height: prepared.height,
                keyVersion: IMAGE_PROMPT_CACHE_KEY_VERSION,
                mimeType: prepared.mimeType,
                outputSizeBytes: prepared.sizeBytes,
                promptLength: params.prompt.length,
                sourcePath,
                updatedAt: now,
                width: prepared.width,
            });
        });
        if (previousSourcePath !== sourcePath && isImagePromptCacheSourcePathForKey(previousSourcePath, cacheKey)) {
            await storageAdmin.bucket().file(previousSourcePath).delete({ ignoreNotFound: true }).catch((error) => {
                logRuntimeFailure('ai_image_prompt_cache_superseded_source_cleanup_failed', error, logContext);
            });
        }

        logRuntimeDiagnostic("ai_image_prompt_cache_written", logContext);
        return cacheKey;
    } catch (error) {
        logRuntimeFailure("ai_image_prompt_cache_write_failed", error, logContext);
        return null;
    }
}
