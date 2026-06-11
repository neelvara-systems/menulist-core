import { UserUploadedFileType } from "@type/common";

const MAX_AI_REFERENCE_IMAGE_BYTES = 10 * 1024 * 1024;
const SUPPORTED_AI_IMAGE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

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

function assertFirebaseStorageUrl(url: string) {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.hostname !== 'firebasestorage.googleapis.com') {
        throw new Error("Unsupported image URL.");
    }
}

export const getImageAsBase64 = async (referanceImage: UserUploadedFileType) => {
    if (!referanceImage?.url || typeof referanceImage.url !== 'string') {
        throw new Error("Image URL is required.");
    }

    let base64ImageData: string;
    let mimeType: string = referanceImage.type || "image/jpeg"; // Default or use provided type
    if (referanceImage.url && referanceImage.url.includes("https://firebasestorage.googleapis.com")) {
        assertFirebaseStorageUrl(referanceImage.url);
        const imageUrl = referanceImage.url;
        const response = await fetch(imageUrl);
        if (!response.ok) {
            throw new Error("Unable to read source image.");
        }

        const responseType = response.headers.get('content-type') || mimeType;
        mimeType = responseType.split(';')[0].toLowerCase().replace('image/jpg', 'image/jpeg');
        assertSupportedMimeType(mimeType);

        const contentLength = Number(response.headers.get('content-length') || 0);
        if (contentLength > MAX_AI_REFERENCE_IMAGE_BYTES) {
            throw new Error("Image is too large.");
        }

        const imageArrayBuffer = await response.arrayBuffer();
        if (imageArrayBuffer.byteLength > MAX_AI_REFERENCE_IMAGE_BYTES) {
            throw new Error("Image is too large.");
        }

        base64ImageData = Buffer.from(imageArrayBuffer).toString('base64');
    } else if (referanceImage.url && typeof referanceImage.url === 'string' && referanceImage.url.startsWith('data:')) {
        ({ base64ImageData, mimeType } = parseImageDataUrl(referanceImage.url));
    } else {
        throw new Error("Unsupported image data format.");
    }
    return { base64ImageData, mimeType }
}
