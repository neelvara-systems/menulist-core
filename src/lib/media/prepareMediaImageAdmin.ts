import { createCanvas, loadImage } from '@napi-rs/canvas';
import {
    getMediaImageProfile,
    getSafeMediaAspectRatio,
    parseMediaAspectRatio,
    type MediaAspectRatioValue,
    type MediaImageType,
    type MediaImageVariantId,
} from './imageProfiles';
import { getMediaDataFingerprint } from './mediaStorage';

const BYTES_PER_KB = 1024;
const MIN_OUTPUT_DIMENSION = 96;
const PREPARED_MEDIA_ADMIN_VERSION = 1;

export interface PreparedMediaImageAdmin {
    buffer: Buffer;
    checksum: string;
    compressionRatio: number;
    dataUrl: string;
    height: number;
    mediaId: string;
    mimeType: string;
    originalHeight: number;
    originalMimeType: string;
    originalSize: number;
    originalWidth: number;
    primaryVariant: MediaImageVariantId;
    sizeBytes: number;
    version: number;
    width: number;
}

function parseImageDataUrl(dataUrl: string): { buffer: Buffer; mimeType: string } {
    const match = dataUrl.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,([\s\S]+)$/i);
    if (!match) {
        throw new Error('Admin media preparation requires a supported image data URL.');
    }

    return {
        buffer: Buffer.from(match[2], 'base64'),
        mimeType: match[1].toLowerCase().replace('image/jpg', 'image/jpeg'),
    };
}

function getOutputMimeType(outputFormat: 'image/jpeg' | 'image/png' | 'image/webp'): 'image/jpeg' | 'image/png' | 'image/webp' {
    if (outputFormat === 'image/png' || outputFormat === 'image/webp') {
        return outputFormat;
    }
    return 'image/jpeg';
}

function getOutputDimensions(
    aspectRatio: MediaAspectRatioValue,
    maxDimension: number,
): { width: number; height: number } {
    const ratio = parseMediaAspectRatio(aspectRatio);
    if (ratio >= 1) {
        const width = maxDimension;
        return {
            height: Math.round(width / ratio),
            width,
        };
    }

    const height = maxDimension;
    return {
        height,
        width: Math.round(height * ratio),
    };
}

function drawCover(
    ctx: ReturnType<ReturnType<typeof createCanvas>['getContext']>,
    image: Awaited<ReturnType<typeof loadImage>>,
    targetWidth: number,
    targetHeight: number,
) {
    const imageWidth = Number(image.naturalWidth || image.width || 0);
    const imageHeight = Number(image.naturalHeight || image.height || 0);
    const targetRatio = targetWidth / targetHeight;
    const imageRatio = imageWidth / imageHeight;
    let sx = 0;
    let sy = 0;
    let sw = imageWidth;
    let sh = imageHeight;

    if (imageRatio > targetRatio) {
        sw = Math.round(imageHeight * targetRatio);
        sx = Math.round((imageWidth - sw) / 2);
    } else if (imageRatio < targetRatio) {
        sh = Math.round(imageWidth / targetRatio);
        sy = Math.round((imageHeight - sh) / 2);
    }

    ctx.drawImage(image, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);
}

function renderPreparedBuffer(params: {
    aspectRatio: MediaAspectRatioValue;
    backgroundColor: string;
    dimension: number;
    image: Awaited<ReturnType<typeof loadImage>>;
    mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
    preserveTransparency: boolean;
    quality: number;
}): { buffer: Buffer; height: number; width: number } {
    const { height, width } = getOutputDimensions(params.aspectRatio, params.dimension);
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (!params.preserveTransparency || params.mimeType === 'image/jpeg') {
        ctx.fillStyle = params.backgroundColor === 'transparent' ? '#ffffff' : params.backgroundColor;
        ctx.fillRect(0, 0, width, height);
    }

    drawCover(ctx, params.image, width, height);

    const buffer = params.mimeType === 'image/png'
        ? canvas.toBuffer('image/png')
        : canvas.toBuffer(params.mimeType, Math.round(params.quality * 100));

    return {
        buffer,
        height,
        width,
    };
}

export async function prepareMediaImageAdmin(
    dataUrl: string,
    imageType: MediaImageType,
    options: { aspectRatio?: string | null } = {},
): Promise<PreparedMediaImageAdmin> {
    const profile = getMediaImageProfile(imageType);
    const source = parseImageDataUrl(dataUrl);
    if (!(profile.allowedMimeTypes as readonly string[]).includes(source.mimeType)) {
        throw new Error(`${profile.label} requires a supported image type.`);
    }
    if (source.buffer.length > profile.maxSourceBytes) {
        throw new Error(`${profile.label} exceeds the maximum allowed source size.`);
    }

    const aspectRatio = getSafeMediaAspectRatio(imageType, options.aspectRatio);
    const outputMimeType = getOutputMimeType(profile.outputFormat);
    const image = await loadImage(source.buffer);
    const originalWidth = Number(image.naturalWidth || image.width || 0);
    const originalHeight = Number(image.naturalHeight || image.height || 0);
    const maxBytes = profile.maxOutputSizeKB * BYTES_PER_KB;
    let dimension = profile.maxDimension;
    let bestResult: { buffer: Buffer; height: number; width: number } | null = null;

    while (dimension >= MIN_OUTPUT_DIMENSION) {
        let quality = profile.quality;
        while (quality >= profile.minQuality) {
            const result = renderPreparedBuffer({
                aspectRatio,
                backgroundColor: profile.backgroundColor,
                dimension,
                image,
                mimeType: outputMimeType,
                preserveTransparency: profile.preserveTransparency,
                quality: Number(quality.toFixed(2)),
            });

            if (!bestResult || result.buffer.length < bestResult.buffer.length) {
                bestResult = result;
            }

            if (result.buffer.length <= maxBytes) {
                const preparedDataUrl = `data:${outputMimeType};base64,${result.buffer.toString('base64')}`;
                const checksum = getMediaDataFingerprint(preparedDataUrl);
                return {
                    buffer: result.buffer,
                    checksum,
                    compressionRatio: source.buffer.length > 0 ? result.buffer.length / source.buffer.length : 1,
                    dataUrl: preparedDataUrl,
                    height: result.height,
                    mediaId: `${imageType}_${checksum}`,
                    mimeType: outputMimeType,
                    originalHeight,
                    originalMimeType: source.mimeType,
                    originalSize: source.buffer.length,
                    originalWidth,
                    primaryVariant: profile.primaryVariant,
                    sizeBytes: result.buffer.length,
                    version: PREPARED_MEDIA_ADMIN_VERSION,
                    width: result.width,
                };
            }

            quality -= 0.08;
        }
        dimension = Math.floor(dimension * 0.86);
    }

    if (!bestResult) {
        throw new Error(`Could not prepare ${profile.label.toLowerCase()}.`);
    }

    const preparedDataUrl = `data:${outputMimeType};base64,${bestResult.buffer.toString('base64')}`;
    const checksum = getMediaDataFingerprint(preparedDataUrl);
    return {
        buffer: bestResult.buffer,
        checksum,
        compressionRatio: source.buffer.length > 0 ? bestResult.buffer.length / source.buffer.length : 1,
        dataUrl: preparedDataUrl,
        height: bestResult.height,
        mediaId: `${imageType}_${checksum}`,
        mimeType: outputMimeType,
        originalHeight,
        originalMimeType: source.mimeType,
        originalSize: source.buffer.length,
        originalWidth,
        primaryVariant: profile.primaryVariant,
        sizeBytes: bestResult.buffer.length,
        version: PREPARED_MEDIA_ADMIN_VERSION,
        width: bestResult.width,
    };
}
