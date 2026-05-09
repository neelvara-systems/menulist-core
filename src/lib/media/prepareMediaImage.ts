import { validateImageFile } from '@lib/security/magicBytesValidator';
import {
    getDataUrlMimeType,
    getMediaImageProfile,
    getSafeMediaAspectRatio,
    isMediaImageSystemEnabled,
    MediaAspectRatioValue,
    MediaImageProfile,
    MediaImageType,
    parseMediaAspectRatio,
} from './imageProfiles';

export interface PreparedMediaImage {
    aspectRatio: MediaAspectRatioValue;
    compressionRatio: number;
    crop: Required<MediaImageCropIntent>;
    dataUrl: string;
    height: number;
    imageType: MediaImageType;
    mimeType: string;
    originalHeight: number;
    originalSize: number;
    originalWidth: number;
    sizeBytes: number;
    sourceName?: string;
    sourceDataUrl?: string;
    width: number;
}

export interface MediaImageCropIntent {
    centerX?: number;
    centerY?: number;
    rotation?: number;
    zoom?: number;
}

export interface PrepareMediaImageOptions {
    aspectRatio?: string | null;
    crop?: MediaImageCropIntent;
    fileName?: string;
}

const BYTES_PER_KB = 1024;
const BYTES_PER_MB = 1024 * 1024;

function estimateDataUrlSize(dataUrl: string): number {
    const base64 = dataUrl.split(',')[1] || dataUrl;
    return Math.round((base64.length * 3) / 4);
}

function bytesToMB(bytes: number): string {
    return (bytes / BYTES_PER_MB).toFixed(bytes % BYTES_PER_MB === 0 ? 0 : 1);
}

function normalizeMimeType(type?: string): string {
    if (!type) return '';
    return type.toLowerCase() === 'image/jpg' ? 'image/jpeg' : type.toLowerCase();
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function normalizeCropIntent(crop?: MediaImageCropIntent): Required<MediaImageCropIntent> {
    return {
        centerX: clamp(Number.isFinite(crop?.centerX) ? Number(crop?.centerX) : 0.5, 0, 1),
        centerY: clamp(Number.isFinite(crop?.centerY) ? Number(crop?.centerY) : 0.5, 0, 1),
        rotation: Number.isFinite(crop?.rotation) ? ((Number(crop?.rotation) % 360) + 360) % 360 : 0,
        zoom: clamp(Number.isFinite(crop?.zoom) ? Number(crop?.zoom) : 1, 1, 3),
    };
}

function isFile(value: File | Blob | string): value is File {
    return typeof File !== 'undefined' && value instanceof File;
}

function isBlob(value: File | Blob | string): value is Blob {
    return typeof Blob !== 'undefined' && value instanceof Blob;
}

function readFileAsDataUrl(file: File | Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Could not read image'));
        reader.readAsDataURL(file);
    });
}

function loadImage(source: File | Blob | string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        let objectUrl: string | null = null;

        img.onload = () => {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
            resolve(img);
        };
        img.onerror = () => {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
            reject(new Error('Could not load image'));
        };

        if (typeof source === 'string') {
            img.src = source;
        } else {
            objectUrl = URL.createObjectURL(source);
            img.src = objectUrl;
        }
    });
}

function getOutputDimensions(
    targetRatio: number,
    maxDimension: number,
): { width: number; height: number } {
    if (targetRatio >= 1) {
        const width = maxDimension;
        return {
            width,
            height: Math.round(width / targetRatio),
        };
    }

    const height = maxDimension;
    return {
        width: Math.round(height * targetRatio),
        height,
    };
}

function drawCover(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    targetWidth: number,
    targetHeight: number,
): void {
    const targetRatio = targetWidth / targetHeight;
    const imageRatio = img.naturalWidth / img.naturalHeight;
    let sx = 0;
    let sy = 0;
    let sw = img.naturalWidth;
    let sh = img.naturalHeight;

    if (imageRatio > targetRatio) {
        sw = Math.round(img.naturalHeight * targetRatio);
        sx = Math.round((img.naturalWidth - sw) / 2);
    } else if (imageRatio < targetRatio) {
        sh = Math.round(img.naturalWidth / targetRatio);
        sy = Math.round((img.naturalHeight - sh) / 2);
    }

    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);
}

function drawContain(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    targetWidth: number,
    targetHeight: number,
    paddingRatio = 0.9,
): void {
    const safeWidth = Math.round(targetWidth * paddingRatio);
    const safeHeight = Math.round(targetHeight * paddingRatio);
    const scale = Math.min(safeWidth / img.naturalWidth, safeHeight / img.naturalHeight);
    const drawWidth = Math.round(img.naturalWidth * scale);
    const drawHeight = Math.round(img.naturalHeight * scale);
    const dx = Math.round((targetWidth - drawWidth) / 2);
    const dy = Math.round((targetHeight - drawHeight) / 2);

    ctx.drawImage(img, dx, dy, drawWidth, drawHeight);
}

function getManualCropScale(
    img: HTMLImageElement,
    profile: MediaImageProfile,
    targetWidth: number,
    targetHeight: number,
    crop: Required<MediaImageCropIntent>,
): number {
    const rotation = ((crop.rotation % 360) + 360) % 360;
    const radians = (rotation * Math.PI) / 180;
    const rotatedNaturalWidth = Math.abs(img.naturalWidth * Math.cos(radians)) + Math.abs(img.naturalHeight * Math.sin(radians));
    const rotatedNaturalHeight = Math.abs(img.naturalWidth * Math.sin(radians)) + Math.abs(img.naturalHeight * Math.cos(radians));
    const safeWidth = profile.fit === 'contain'
        ? Math.round(targetWidth * (profile.paddingRatio ?? 0.9))
        : targetWidth;
    const safeHeight = profile.fit === 'contain'
        ? Math.round(targetHeight * (profile.paddingRatio ?? 0.9))
        : targetHeight;
    const baseScale = profile.fit === 'contain'
        ? Math.min(safeWidth / rotatedNaturalWidth, safeHeight / rotatedNaturalHeight)
        : Math.max(targetWidth / rotatedNaturalWidth, targetHeight / rotatedNaturalHeight);

    return baseScale * crop.zoom;
}

export function getMediaImagePreviewDragDelta(
    img: HTMLImageElement,
    profile: MediaImageProfile,
    targetWidth: number,
    targetHeight: number,
    crop: Required<MediaImageCropIntent>,
    deltaX: number,
    deltaY: number,
): Pick<MediaImageCropIntent, 'centerX' | 'centerY'> {
    const scale = getManualCropScale(img, profile, targetWidth, targetHeight, crop);
    if (!Number.isFinite(scale) || scale <= 0) {
        return {
            centerX: crop.centerX,
            centerY: crop.centerY,
        };
    }
    const radians = (crop.rotation * Math.PI) / 180;
    const localDeltaX = deltaX * Math.cos(radians) + deltaY * Math.sin(radians);
    const localDeltaY = -deltaX * Math.sin(radians) + deltaY * Math.cos(radians);

    return {
        centerX: clamp(crop.centerX - localDeltaX / scale / img.naturalWidth, 0, 1),
        centerY: clamp(crop.centerY - localDeltaY / scale / img.naturalHeight, 0, 1),
    };
}

function drawManualCrop(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    profile: MediaImageProfile,
    targetWidth: number,
    targetHeight: number,
    crop: Required<MediaImageCropIntent>,
): void {
    const scale = getManualCropScale(img, profile, targetWidth, targetHeight, crop);
    const drawWidth = img.naturalWidth * scale;
    const drawHeight = img.naturalHeight * scale;
    const sourceCenterX = img.naturalWidth * crop.centerX;
    const sourceCenterY = img.naturalHeight * crop.centerY;

    ctx.save();
    ctx.translate(targetWidth / 2, targetHeight / 2);
    ctx.rotate((crop.rotation * Math.PI) / 180);
    ctx.drawImage(
        img,
        -sourceCenterX * scale,
        -sourceCenterY * scale,
        drawWidth,
        drawHeight,
    );
    ctx.restore();
}

function renderProfileImage(
    img: HTMLImageElement,
    profile: MediaImageProfile,
    aspectRatio: MediaAspectRatioValue,
    dimension: number,
    quality: number,
    crop?: Required<MediaImageCropIntent>,
): { dataUrl: string; height: number; sizeBytes: number; width: number } {
    const targetRatio = parseMediaAspectRatio(aspectRatio);
    const { width, height } = getOutputDimensions(targetRatio, dimension);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d', { willReadFrequently: false });
    if (!ctx) {
        throw new Error('Could not prepare image');
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, width, height);

    if (profile.outputFormat === 'image/jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
    }

    if (crop) {
        drawManualCrop(ctx, img, profile, width, height, crop);
    } else if (profile.fit === 'contain') {
        drawContain(ctx, img, width, height, profile.paddingRatio);
    } else {
        drawCover(ctx, img, width, height);
    }

    const dataUrl = canvas.toDataURL(profile.outputFormat, quality);
    const sizeBytes = estimateDataUrlSize(dataUrl);
    canvas.width = 0;
    canvas.height = 0;

    return { dataUrl, height, sizeBytes, width };
}

export function drawMediaImagePreview(
    canvas: HTMLCanvasElement,
    img: HTMLImageElement,
    profile: MediaImageProfile,
    aspectRatio: MediaAspectRatioValue,
    crop: MediaImageCropIntent,
): Required<MediaImageCropIntent> {
    const normalizedCrop = normalizeCropIntent(crop);
    const ratio = parseMediaAspectRatio(aspectRatio);
    const cssWidth = Math.max(1, Math.round(canvas.getBoundingClientRect().width || canvas.clientWidth || 320));
    const cssHeight = Math.max(1, Math.round(cssWidth / ratio));
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

    canvas.style.height = `${cssHeight}px`;
    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);

    const ctx = canvas.getContext('2d', { willReadFrequently: false });
    if (!ctx) return normalizedCrop;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);
    if (profile.outputFormat === 'image/jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, cssWidth, cssHeight);
    }
    drawManualCrop(ctx, img, profile, cssWidth, cssHeight, normalizedCrop);

    return normalizedCrop;
}

async function validateSourceFile(file: File, profile: MediaImageProfile): Promise<string> {
    const mimeType = normalizeMimeType(file.type);

    if (!profile.allowedMimeTypes.includes(mimeType)) {
        throw new Error('Use a JPG, PNG, or WebP image.');
    }

    if (file.size <= 0) {
        throw new Error('Use a valid image file.');
    }

    if (file.size > profile.maxSourceBytes) {
        throw new Error(`${profile.label} must be ${bytesToMB(profile.maxSourceBytes)}MB or smaller.`);
    }

    const dataUrl = await readFileAsDataUrl(file);
    const validation = await validateImageFile({
        base64: dataUrl,
        maxSizeMB: profile.maxSourceBytes / BYTES_PER_MB,
        mimeType,
        size: file.size,
    });

    if (!validation.valid) {
        throw new Error(validation.error || 'Use a valid image file.');
    }

    return dataUrl;
}

async function validateSourceBlob(blob: Blob, profile: MediaImageProfile): Promise<string> {
    const mimeType = normalizeMimeType(blob.type);

    if (mimeType && !profile.allowedMimeTypes.includes(mimeType)) {
        throw new Error('Use a JPG, PNG, or WebP image.');
    }

    if (blob.size <= 0) {
        throw new Error('Use a valid image file.');
    }

    if (blob.size > profile.maxSourceBytes) {
        throw new Error(`${profile.label} must be ${bytesToMB(profile.maxSourceBytes)}MB or smaller.`);
    }

    return readFileAsDataUrl(blob);
}

async function prepareRawMediaImage(
    source: File | Blob | string,
    imageType: MediaImageType,
    profile: MediaImageProfile,
    aspectRatio: MediaAspectRatioValue,
    crop: Required<MediaImageCropIntent>,
    sourceName?: string,
): Promise<PreparedMediaImage> {
    const dataUrl = isFile(source)
        ? await validateSourceFile(source, profile)
        : isBlob(source)
            ? await validateSourceBlob(source, profile)
            : source;
    const img = await loadImage(dataUrl);
    const originalSize = typeof source === 'string'
        ? estimateDataUrlSize(source)
        : source.size;
    const mimeType = isBlob(source)
        ? normalizeMimeType(source.type) || getDataUrlMimeType(dataUrl, profile.outputFormat)
        : getDataUrlMimeType(dataUrl, profile.outputFormat);

    return {
        aspectRatio,
        compressionRatio: 1,
        crop,
        dataUrl,
        height: img.naturalHeight,
        imageType,
        mimeType,
        originalHeight: img.naturalHeight,
        originalSize,
        originalWidth: img.naturalWidth,
        sizeBytes: typeof source === 'string' ? estimateDataUrlSize(dataUrl) : source.size,
        sourceName,
        sourceDataUrl: dataUrl,
        width: img.naturalWidth,
    };
}

export async function prepareMediaImage(
    source: File | Blob | string,
    imageType: MediaImageType,
    options: PrepareMediaImageOptions = {},
): Promise<PreparedMediaImage> {
    const profile = getMediaImageProfile(imageType);
    const aspectRatio = getSafeMediaAspectRatio(imageType, options.aspectRatio);
    const crop = normalizeCropIntent(options.crop);
    const sourceName = options.fileName || (isFile(source) ? source.name : undefined);

    if (!isMediaImageSystemEnabled()) {
        return prepareRawMediaImage(source, imageType, profile, aspectRatio, crop, sourceName);
    }

    const validatedSource = isFile(source)
        ? await validateSourceFile(source, profile)
        : source;
    const sourceDataUrl = typeof validatedSource === 'string' ? validatedSource : undefined;
    const img = await loadImage(validatedSource);
    const originalSize = typeof source === 'string'
        ? estimateDataUrlSize(source)
        : source.size;

    if (img.naturalWidth < profile.minWidth || img.naturalHeight < profile.minHeight) {
        throw new Error(
            `${profile.label} is too small. Use at least ${profile.minWidth} x ${profile.minHeight}px.`,
        );
    }

    const maxBytes = profile.maxOutputSizeKB * BYTES_PER_KB;
    let dimension = profile.maxDimension;
    let quality = profile.quality;
    let bestResult: ReturnType<typeof renderProfileImage> | null = null;

    while (dimension >= profile.minDimension) {
        quality = profile.quality;
        while (quality >= profile.minQuality) {
            const result = renderProfileImage(
                img,
                profile,
                aspectRatio,
                dimension,
                Number(quality.toFixed(2)),
                options.crop ? crop : undefined,
            );
            if (!bestResult || result.sizeBytes < bestResult.sizeBytes) {
                bestResult = result;
            }
            if (result.sizeBytes <= maxBytes) {
                return {
                    aspectRatio,
                    compressionRatio: originalSize > 0 ? result.sizeBytes / originalSize : 1,
                    crop,
                    dataUrl: result.dataUrl,
                    height: result.height,
                    imageType,
                    mimeType: getDataUrlMimeType(result.dataUrl, profile.outputFormat),
                    originalHeight: img.naturalHeight,
                    originalSize,
                    originalWidth: img.naturalWidth,
                    sizeBytes: result.sizeBytes,
                    sourceName,
                    sourceDataUrl,
                    width: result.width,
                };
            }
            quality -= 0.08;
        }
        dimension = Math.floor(dimension * 0.86);
    }

    throw new Error(
        bestResult
            ? `${profile.label} could not be prepared under ${profile.maxOutputSizeKB}KB. Use a simpler or smaller image.`
            : 'Could not prepare image.',
    );
}

export function toPreparedUploadName(
    fileName: string | undefined,
    mimeType: string,
    fallbackName: string,
): string {
    const extension = mimeType.includes('webp')
        ? 'webp'
        : mimeType.includes('png')
            ? 'png'
            : 'jpg';
    const source = fileName || fallbackName;
    const base = source.replace(/\.[^.]+$/, '') || fallbackName;
    return `${base}.${extension}`;
}
