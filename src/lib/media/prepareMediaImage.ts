import { validateImageFile } from '@lib/security/magicBytesValidator';
import {
    getDataUrlMimeType,
    getMediaImageProfile,
    getSafeMediaAspectRatio,
    isMediaImageSystemEnabled,
    MediaAspectRatioValue,
    MediaImageProfile,
    MediaImageType,
    MediaImageVariantId,
    parseMediaAspectRatio,
} from './imageProfiles';
import { getDataUrlBlob, getMediaFileExtension } from './mediaStorage';

export type PreparedMediaStatus = 'draft' | 'processing' | 'ready' | 'failed';

export interface PreparedMediaFocalPoint {
    x: number;
    y: number;
}

export interface PreparedMediaVariant {
    blob: Blob;
    dataUrl: string;
    fileName: string;
    height: number;
    id: MediaImageVariantId;
    mimeType: string;
    sizeBytes: number;
    width: number;
}

export interface PreparedMediaImage {
    animationPolicy: 'static-only';
    aspectRatio: MediaAspectRatioValue;
    blob: Blob;
    blurHash?: string;
    checksum: string;
    compressionRatio: number;
    crop: Required<MediaImageCropIntent>;
    dataUrl: string;
    dominantColor?: string;
    exifNormalized: boolean;
    focalPoint: PreparedMediaFocalPoint;
    height: number;
    imageType: MediaImageType;
    mediaId: string;
    mimeType: string;
    originalHeight: number;
    originalSize: number;
    originalWidth: number;
    primaryVariant: MediaImageVariantId;
    profile: MediaImageType;
    publicUrl?: string;
    sizeBytes: number;
    sourceName?: string;
    sourceDataUrl?: string;
    status: PreparedMediaStatus;
    transparency: 'preserved' | 'removed';
    variants: Partial<Record<MediaImageVariantId, PreparedMediaVariant>>;
    version: number;
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
const MIN_PREPARED_OUTPUT_DIMENSION = 96;
const PREPARED_MEDIA_VERSION = 1;

function estimateDataUrlSize(dataUrl: string): number {
    const base64 = dataUrl.split(',')[1] || dataUrl;
    return Math.round((base64.length * 3) / 4);
}

function fallbackHash(input: string): string {
    let hash = 0x811c9dc5;
    for (let index = 0; index < input.length; index += 1) {
        hash ^= input.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
}

async function sha256Hex(input: string): Promise<string> {
    if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
        return Array.from(new Uint8Array(digest))
            .map((byte) => byte.toString(16).padStart(2, '0'))
            .join('');
    }

    return fallbackHash(input);
}

function buildMediaId(imageType: MediaImageType, checksum: string): string {
    return `${imageType}_${checksum.slice(0, 16)}`;
}

function buildFocalPoint(crop: Required<MediaImageCropIntent>): PreparedMediaFocalPoint {
    return {
        x: clamp(crop.centerX, 0, 1),
        y: clamp(crop.centerY, 0, 1),
    };
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

function toHexColor(red: number, green: number, blue: number): string {
    return `#${[red, green, blue]
        .map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, '0'))
        .join('')}`;
}

function sampleDominantColor(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    fallback: string,
): string {
    try {
        const step = Math.max(1, Math.floor(Math.sqrt((width * height) / 1600)));
        const data = ctx.getImageData(0, 0, width, height).data;
        let red = 0;
        let green = 0;
        let blue = 0;
        let count = 0;

        for (let y = 0; y < height; y += step) {
            for (let x = 0; x < width; x += step) {
                const offset = (y * width + x) * 4;
                const alpha = data[offset + 3];
                if (alpha < 32) continue;
                red += data[offset];
                green += data[offset + 1];
                blue += data[offset + 2];
                count += 1;
            }
        }

        if (!count) return fallback;

        return toHexColor(red / count, green / count, blue / count);
    } catch {
        return fallback;
    }
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
): { blob: Blob; dataUrl: string; dimension: number; dominantColor: string; height: number; mimeType: string; quality: number; sizeBytes: number; width: number } {
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

    if (!profile.preserveTransparency || profile.outputFormat === 'image/jpeg') {
        ctx.fillStyle = profile.backgroundColor === 'transparent' ? '#ffffff' : profile.backgroundColor;
        ctx.fillRect(0, 0, width, height);
    }

    if (crop) {
        drawManualCrop(ctx, img, profile, width, height, crop);
    } else if (profile.fit === 'contain') {
        drawContain(ctx, img, width, height, profile.paddingRatio);
    } else {
        drawCover(ctx, img, width, height);
    }

    const dominantColor = sampleDominantColor(ctx, width, height, profile.backgroundColor === 'transparent' ? '#ffffff' : profile.backgroundColor);
    const dataUrl = canvas.toDataURL(profile.outputFormat, quality);
    const blob = getDataUrlBlob(dataUrl);
    const mimeType = getDataUrlMimeType(dataUrl, profile.outputFormat);
    const sizeBytes = estimateDataUrlSize(dataUrl);
    canvas.width = 0;
    canvas.height = 0;

    return {
        blob,
        dataUrl,
        dimension,
        dominantColor,
        height,
        mimeType,
        quality,
        sizeBytes,
        width,
    };
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
    if (!profile.preserveTransparency || profile.outputFormat === 'image/jpeg') {
        ctx.fillStyle = profile.backgroundColor === 'transparent' ? '#ffffff' : profile.backgroundColor;
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

function buildPreparedVariant(
    rendered: ReturnType<typeof renderProfileImage>,
    id: MediaImageVariantId,
    mediaId: string,
): PreparedMediaVariant {
    return {
        blob: rendered.blob,
        dataUrl: rendered.dataUrl,
        fileName: `${mediaId}_${id}.${getMediaFileExtension(rendered.mimeType)}`,
        height: rendered.height,
        id,
        mimeType: rendered.mimeType,
        sizeBytes: rendered.sizeBytes,
        width: rendered.width,
    };
}

function renderProfileVariants(
    img: HTMLImageElement,
    profile: MediaImageProfile,
    aspectRatio: MediaAspectRatioValue,
    maxDimension: number,
    quality: number,
    crop?: Required<MediaImageCropIntent>,
): Array<ReturnType<typeof renderProfileImage> & { id: MediaImageVariantId }> {
    return profile.variants.map((variant) => ({
        ...renderProfileImage(
            img,
            profile,
            aspectRatio,
            Math.min(variant.maxDimension, maxDimension),
            quality,
            crop,
        ),
        id: variant.id,
    }));
}

async function buildPreparedMediaImage(params: {
    aspectRatio: MediaAspectRatioValue;
    crop: Required<MediaImageCropIntent>;
    imageType: MediaImageType;
    originalHeight: number;
    originalSize: number;
    originalWidth: number;
    profile: MediaImageProfile;
    renderedVariants: Array<ReturnType<typeof renderProfileImage> & { id: MediaImageVariantId }>;
    sourceDataUrl?: string;
    sourceName?: string;
}): Promise<PreparedMediaImage> {
    const {
        aspectRatio,
        crop,
        imageType,
        originalHeight,
        originalSize,
        originalWidth,
        profile,
        renderedVariants,
        sourceDataUrl,
        sourceName,
    } = params;
    const primaryRendered = renderedVariants.find((variant) => variant.id === profile.primaryVariant)
        || renderedVariants[renderedVariants.length - 1];

    if (!primaryRendered) {
        throw new Error('Could not prepare image.');
    }

    const checksum = await sha256Hex(primaryRendered.dataUrl);
    const mediaId = buildMediaId(imageType, checksum);
    const variants = renderedVariants.reduce<Partial<Record<MediaImageVariantId, PreparedMediaVariant>>>(
        (acc, rendered) => {
            acc[rendered.id] = buildPreparedVariant(rendered, rendered.id, mediaId);
            return acc;
        },
        {},
    );
    const primaryVariant = variants[profile.primaryVariant] || buildPreparedVariant(primaryRendered, primaryRendered.id, mediaId);

    return {
        animationPolicy: profile.animationPolicy,
        aspectRatio,
        blob: primaryVariant.blob,
        checksum,
        compressionRatio: originalSize > 0 ? primaryVariant.sizeBytes / originalSize : 1,
        crop,
        dataUrl: primaryVariant.dataUrl,
        dominantColor: primaryRendered.dominantColor,
        exifNormalized: true,
        focalPoint: buildFocalPoint(crop),
        height: primaryVariant.height,
        imageType,
        mediaId,
        mimeType: primaryVariant.mimeType,
        originalHeight,
        originalSize,
        originalWidth,
        primaryVariant: primaryVariant.id,
        profile: imageType,
        sizeBytes: primaryVariant.sizeBytes,
        sourceDataUrl,
        sourceName,
        status: 'ready',
        transparency: profile.preserveTransparency ? 'preserved' : 'removed',
        variants,
        version: PREPARED_MEDIA_VERSION,
        width: primaryVariant.width,
    };
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
    const blob = getDataUrlBlob(dataUrl);
    const checksum = await sha256Hex(dataUrl);
    const mediaId = buildMediaId(imageType, checksum);
    const variant: PreparedMediaVariant = {
        blob,
        dataUrl,
        fileName: `${mediaId}_${profile.primaryVariant}.${getMediaFileExtension(mimeType)}`,
        height: img.naturalHeight,
        id: profile.primaryVariant,
        mimeType,
        sizeBytes: typeof source === 'string' ? estimateDataUrlSize(dataUrl) : source.size,
        width: img.naturalWidth,
    };

    return {
        animationPolicy: profile.animationPolicy,
        aspectRatio,
        blob,
        checksum,
        compressionRatio: 1,
        crop,
        dataUrl,
        exifNormalized: false,
        focalPoint: buildFocalPoint(crop),
        height: img.naturalHeight,
        imageType,
        mediaId,
        mimeType,
        originalHeight: img.naturalHeight,
        originalSize,
        originalWidth: img.naturalWidth,
        primaryVariant: profile.primaryVariant,
        profile: imageType,
        sizeBytes: typeof source === 'string' ? estimateDataUrlSize(dataUrl) : source.size,
        sourceName,
        sourceDataUrl: dataUrl,
        status: 'ready',
        transparency: profile.preserveTransparency ? 'preserved' : 'removed',
        variants: {
            [profile.primaryVariant]: variant,
        },
        version: PREPARED_MEDIA_VERSION,
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

    const maxBytes = profile.maxOutputSizeKB * BYTES_PER_KB;
    let dimension = profile.maxDimension;
    let quality = profile.quality;
    let bestResult: ReturnType<typeof renderProfileImage> | null = null;

    while (dimension >= MIN_PREPARED_OUTPUT_DIMENSION) {
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
                const renderedVariants = renderProfileVariants(
                    img,
                    profile,
                    aspectRatio,
                    result.dimension,
                    result.quality,
                    options.crop ? crop : undefined,
                );
                return buildPreparedMediaImage({
                    aspectRatio,
                    crop,
                    imageType,
                    originalHeight: img.naturalHeight,
                    originalSize,
                    originalWidth: img.naturalWidth,
                    profile,
                    renderedVariants,
                    sourceDataUrl,
                    sourceName,
                });
            }
            quality -= 0.08;
        }
        dimension = Math.floor(dimension * 0.86);
    }

    if (!bestResult) {
        throw new Error('Could not prepare image.');
    }

    const renderedVariants = renderProfileVariants(
        img,
        profile,
        aspectRatio,
        bestResult.dimension,
        bestResult.quality,
        options.crop ? crop : undefined,
    );

    return buildPreparedMediaImage({
        aspectRatio,
        crop,
        imageType,
        originalHeight: img.naturalHeight,
        originalSize,
        originalWidth: img.naturalWidth,
        profile,
        renderedVariants,
        sourceDataUrl,
        sourceName,
    });
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
