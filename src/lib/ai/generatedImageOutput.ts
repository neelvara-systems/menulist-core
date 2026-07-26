import { normalizeMediaUploadMimeType } from '@lib/media/mediaUploadBoundary';
import { validateMagicBytes } from '@lib/security/magicBytesValidator';

export const GENERATED_IMAGE_MAX_BYTES = 15 * 1024 * 1024;
export const GENERATED_IMAGE_MAX_COUNT = 4;

export type NormalizedGeneratedImage = Readonly<{
    base64: string;
    mimeType: string;
    sizeBytes: number;
}>;

const ALLOWED_GENERATED_IMAGE_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
]);

const isRecord = (value: unknown): value is Record<string, unknown> => (
    typeof value === 'object'
    && value !== null
    && !Array.isArray(value)
);

const isBase64Character = (code: number): boolean => (
    (code >= 48 && code <= 57)
    || (code >= 65 && code <= 90)
    || (code >= 97 && code <= 122)
    || code === 43
    || code === 47
);

const isCanonicalBase64 = (value: string): boolean => {
    if (!value.length || value.length % 4 !== 0) return false;

    const paddingLength = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0;
    const payloadLength = value.length - paddingLength;
    for (let index = 0; index < payloadLength; index += 1) {
        if (!isBase64Character(value.charCodeAt(index))) return false;
    }
    for (let index = payloadLength; index < value.length; index += 1) {
        if (value.charCodeAt(index) !== 61) return false;
    }
    return true;
};

export const getBase64DecodedSize = (value: string): number => {
    if (!isCanonicalBase64(value)) return -1;
    const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0;
    return (value.length / 4) * 3 - padding;
};

const normalizeGeneratedImagePart = (value: unknown): NormalizedGeneratedImage | null => {
    if (!isRecord(value)) return null;

    const inlineData = value.inlineData;
    if (!isRecord(inlineData)) return null;

    const base64 = inlineData.data;
    if (typeof base64 !== 'string') return null;

    const mimeType = normalizeMediaUploadMimeType(inlineData.mimeType);
    if (!ALLOWED_GENERATED_IMAGE_MIME_TYPES.has(mimeType)) return null;

    const sizeBytes = getBase64DecodedSize(base64);
    if (sizeBytes < 1 || sizeBytes > GENERATED_IMAGE_MAX_BYTES) return null;

    const buffer = Buffer.from(base64, 'base64');
    if (buffer.length !== sizeBytes) return null;
    const exactArrayBuffer = buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength,
    );
    if (!validateMagicBytes(exactArrayBuffer, mimeType).valid) return null;

    return {
        base64,
        mimeType,
        sizeBytes,
    };
};

export const normalizeGeneratedImagesFromProvider = (
    value: unknown,
): NormalizedGeneratedImage[] => {
    if (!isRecord(value) || !Array.isArray(value.candidates)) return [];

    const firstCandidate = value.candidates[0];
    if (!isRecord(firstCandidate) || !isRecord(firstCandidate.content)) return [];

    const parts = firstCandidate.content.parts;
    if (!Array.isArray(parts)) return [];

    const images: NormalizedGeneratedImage[] = [];
    for (const part of parts) {
        const image = normalizeGeneratedImagePart(part);
        if (!image) continue;
        images.push(image);
        if (images.length >= GENERATED_IMAGE_MAX_COUNT) break;
    }
    return images;
};
