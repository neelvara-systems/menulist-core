import { validateServerNetworkTargetUrl } from "@lib/security/serverNetworkTarget";
import {
    isResponseBodyTooLargeError,
    readResponseUint8ArrayWithLimit,
} from "@lib/security/boundedResponseBody";
import { UserUploadedFileType } from "@type/common";

const MAX_AI_REFERENCE_IMAGE_BYTES = 10 * 1024 * 1024;
const SUPPORTED_AI_IMAGE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const DEFAULT_STORAGE_BUCKET = "menulist-qa.appspot.com";

export interface ImageFetchStorageScope {
    sId?: string | number | null;
    tId?: string | number | null;
}

export interface GetImageAsBase64Options {
    storageScope?: ImageFetchStorageScope;
}

function assertSupportedMimeType(mimeType: string) {
    if (!SUPPORTED_AI_IMAGE_TYPES.has(mimeType.toLowerCase())) {
        throw new Error("Unsupported image type.");
    }
}

function getApproximateBase64Bytes(base64: string) {
    return Math.floor((base64.replace(/=+$/, '').length * 3) / 4);
}

function parseImageDataUrl(dataUrl: string): { base64ImageData: string; mimeType: string } {
    const match = dataUrl.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,([\s\S]+)$/i);
    if (!match) {
        throw new Error("Invalid image data URL format.");
    }

    const mimeType = match[1].toLowerCase().replace('image/jpg', 'image/jpeg');
    const base64ImageData = match[2];
    assertSupportedMimeType(mimeType);

    if (!base64ImageData || getApproximateBase64Bytes(base64ImageData) > MAX_AI_REFERENCE_IMAGE_BYTES) {
        throw new Error("Image is too large.");
    }

    return { base64ImageData, mimeType };
}

function getAllowedStorageBucket(): string {
    return process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET || DEFAULT_STORAGE_BUCKET;
}

function getStoragePathFromFirebaseStorageUrl(value: string): string | null {
    try {
        const parsed = new URL(value);
        if (parsed.protocol !== 'https:' || parsed.hostname !== 'firebasestorage.googleapis.com') {
            return null;
        }

        const match = parsed.pathname.match(/^\/v0\/b\/([^/]+)\/o\/([^?]+)$/);
        const bucket = decodeURIComponent(match?.[1] || "");
        if (bucket !== getAllowedStorageBucket()) return null;

        return match?.[2] ? decodeURIComponent(match[2]) : null;
    } catch {
        return null;
    }
}

function isAllowedAiReferenceStoragePath(storagePath: string, storageScope?: ImageFetchStorageScope): boolean {
    const tenantId = storageScope?.tId === undefined || storageScope?.tId === null ? "" : String(storageScope.tId);
    const storeId = storageScope?.sId === undefined || storageScope?.sId === null ? "" : String(storageScope.sId);
    if (!tenantId || !storeId) return false;

    return [
        `media/menuItem/${tenantId}/${storeId}/`,
        `projects/itemImages/${tenantId}/${storeId}/`,
    ].some((prefix) => storagePath.startsWith(prefix));
}

async function resolveValidatedFirebaseStorageImageUrl(
    value: string,
    storageScope?: ImageFetchStorageScope,
): Promise<string> {
    const storagePath = getStoragePathFromFirebaseStorageUrl(value);
    if (!storagePath || !isAllowedAiReferenceStoragePath(storagePath, storageScope)) {
        throw new Error("Unsupported image URL.");
    }

    const targetValidation = await validateServerNetworkTargetUrl(value);
    if (!targetValidation.valid || !targetValidation.normalizedUrl) {
        throw new Error("Unsupported image URL.");
    }

    return targetValidation.normalizedUrl;
}

export const getImageAsBase64 = async (
    referanceImage: UserUploadedFileType,
    options: GetImageAsBase64Options = {},
) => {
    if (!referanceImage?.url || typeof referanceImage.url !== 'string') {
        throw new Error("Image URL is required.");
    }

    let base64ImageData: string;
    let mimeType: string = referanceImage.type || "image/jpeg"; // Default or use provided type
    if (referanceImage.url && referanceImage.url.startsWith("https://firebasestorage.googleapis.com/")) {
        const imageUrl = await resolveValidatedFirebaseStorageImageUrl(referanceImage.url, options.storageScope);
        const response = await fetch(imageUrl, { redirect: 'manual' });
        if (!response.ok) {
            throw new Error("Unable to read source image.");
        }

        const responseType = response.headers.get('content-type') || mimeType;
        mimeType = responseType.split(';')[0].toLowerCase().replace('image/jpg', 'image/jpeg');
        assertSupportedMimeType(mimeType);

        let imageBytes: Uint8Array;
        try {
            imageBytes = await readResponseUint8ArrayWithLimit(response, MAX_AI_REFERENCE_IMAGE_BYTES);
        } catch (error) {
            if (isResponseBodyTooLargeError(error)) {
                throw new Error("Image is too large.");
            }
            throw new Error("Unable to read source image.");
        }

        base64ImageData = Buffer.from(imageBytes).toString('base64');
    } else if (referanceImage.url && typeof referanceImage.url === 'string' && referanceImage.url.startsWith('data:')) {
        ({ base64ImageData, mimeType } = parseImageDataUrl(referanceImage.url));
    } else {
        throw new Error("Unsupported image data format.");
    }
    return { base64ImageData, mimeType }
}
