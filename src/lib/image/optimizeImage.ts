/**
 * Image Optimization Utility for Menu Processing
 * 
 * Optimizes images before upload to:
 * - Reduce file size (faster uploads, lower storage costs)
 * - Maintain quality for OCR (AI needs readable text)
 * - Prevent timeouts on large images
 * 
 * Configuration:
 * - Max dimension: 1500px (width or height)
 * - Format: JPEG 70% quality (or WebP if supported)
 * - Max file size target: ~2MB per image
 */

export interface OptimizeImageOptions {
    /** Maximum width or height in pixels (default: 1500) */
    maxDimension?: number;
    /** JPEG quality 0-1 (default: 0.7) */
    quality?: number;
    /** Output format (default: 'image/jpeg') */
    format?: 'image/jpeg' | 'image/webp';
}

export interface OptimizeImageToBudgetOptions extends OptimizeImageOptions {
    /** Final target size in KB */
    maxSizeKB?: number;
    /** Lowest acceptable JPEG/WebP quality before resizing further */
    minQuality?: number;
    /** Amount to reduce quality on each pass */
    qualityStep?: number;
    /** Amount to reduce dimensions when quality alone is not enough */
    dimensionStep?: number;
    /** Smallest max dimension we will use before returning the best result */
    minDimension?: number;
}

export interface OptimizedImage {
    /** Optimized image as data URL */
    dataUrl: string;
    /** Original width */
    originalWidth: number;
    /** Original height */
    originalHeight: number;
    /** New width after optimization */
    width: number;
    /** New height after optimization */
    height: number;
    /** Original file size in bytes */
    originalSize: number;
    /** Optimized file size in bytes (approximate) */
    optimizedSize: number;
    /** Whether image was resized */
    wasResized: boolean;
    /** Compression ratio (e.g., 0.3 means 30% of original size) */
    compressionRatio: number;
}

const DEFAULT_OPTIONS: Required<OptimizeImageOptions> = {
    maxDimension: 1500,
    quality: 0.7,
    format: 'image/jpeg',
};

/**
 * Calculate new dimensions while maintaining aspect ratio
 */
function calculateDimensions(
    width: number,
    height: number,
    maxDimension: number
): { width: number; height: number; wasResized: boolean } {
    // If already within limits, return original dimensions
    if (width <= maxDimension && height <= maxDimension) {
        return { width, height, wasResized: false };
    }

    // Calculate scale factor
    const scale = maxDimension / Math.max(width, height);

    return {
        width: Math.round(width * scale),
        height: Math.round(height * scale),
        wasResized: true,
    };
}

/**
 * Estimate data URL size in bytes
 * Base64 encoding increases size by ~37%, and data:image/jpeg;base64, prefix adds ~23 chars
 */
function estimateDataUrlSize(dataUrl: string): number {
    // Remove the data URL prefix to get just the base64 content
    const base64 = dataUrl.split(',')[1] || dataUrl;
    // Base64 to bytes: each char represents 6 bits, so 4 chars = 3 bytes
    return Math.round((base64.length * 3) / 4);
}

/**
 * Load an image from a source (File, Blob, or data URL)
 */
function loadImage(source: File | Blob | string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load image'));

        if (typeof source === 'string') {
            img.src = source;
        } else {
            // source is File | Blob
            img.src = URL.createObjectURL(source);
        }
    });
}

/**
 * Optimize a single image
 * 
 * @param source - Image file, blob, or data URL
 * @param options - Optimization options
 * @returns Optimized image data
 * 
 * @example
 * ```typescript
 * const optimized = await optimizeImage(file, { maxDimension: 1500, quality: 0.7 });
 * console.log(`Reduced from ${optimized.originalSize} to ${optimized.optimizedSize} bytes`);
 * ```
 */
export async function optimizeImage(
    source: File | Blob | string,
    options: OptimizeImageOptions = {}
): Promise<OptimizedImage> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    // Load the image
    const img = await loadImage(source);

    // Calculate original size
    let originalSize = 0;
    if (typeof source === 'string') {
        originalSize = estimateDataUrlSize(source);
    } else {
        // source is File | Blob
        originalSize = source.size;
    }

    // Calculate new dimensions
    const { width, height, wasResized } = calculateDimensions(
        img.naturalWidth,
        img.naturalHeight,
        opts.maxDimension
    );

    // Create canvas and draw resized image
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d', { willReadFrequently: false });
    if (!ctx) {
        throw new Error('Failed to get canvas context');
    }

    // Use better image smoothing for downscaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Draw the image
    ctx.drawImage(img, 0, 0, width, height);

    // Convert to data URL
    const dataUrl = canvas.toDataURL(opts.format, opts.quality);
    const optimizedSize = estimateDataUrlSize(dataUrl);

    // Clean up
    canvas.width = 0;
    canvas.height = 0;
    if (typeof source !== 'string') {
        // source was File | Blob, so we created an object URL
        URL.revokeObjectURL(img.src);
    }

    return {
        dataUrl,
        originalWidth: img.naturalWidth,
        originalHeight: img.naturalHeight,
        width,
        height,
        originalSize,
        optimizedSize,
        wasResized,
        compressionRatio: originalSize > 0 ? optimizedSize / originalSize : 1,
    };
}

/**
 * Optimize multiple images in parallel
 * 
 * @param sources - Array of image files, blobs, or data URLs
 * @param options - Optimization options
 * @returns Array of optimized images
 */
export async function optimizeImages(
    sources: Array<File | Blob | string>,
    options: OptimizeImageOptions = {}
): Promise<OptimizedImage[]> {
    return Promise.all(sources.map(source => optimizeImage(source, options)));
}

/**
 * Optimize an image until it fits a final delivery budget.
 *
 * Used for customer-facing backgrounds where owners may upload normal phone
 * photos, but the public menu must still stay fast.
 */
export async function optimizeImageToBudget(
    source: File | Blob | string,
    options: OptimizeImageToBudgetOptions = {}
): Promise<OptimizedImage> {
    const maxSizeBytes = (options.maxSizeKB ?? 800) * 1024;
    const startingDimension = options.maxDimension ?? DEFAULT_OPTIONS.maxDimension;
    const minDimension = options.minDimension ?? 900;
    const minQuality = options.minQuality ?? 0.48;
    const qualityStep = options.qualityStep ?? 0.08;
    const dimensionStep = options.dimensionStep ?? 0.85;
    const format = options.format ?? DEFAULT_OPTIONS.format;
    const startingQuality = options.quality ?? DEFAULT_OPTIONS.quality;

    let dimension = startingDimension;
    let bestResult: OptimizedImage | null = null;

    while (dimension >= minDimension) {
        for (let quality = startingQuality; quality >= minQuality; quality -= qualityStep) {
            const optimized = await optimizeImage(source, {
                format,
                maxDimension: dimension,
                quality: Number(quality.toFixed(2)),
            });

            if (!bestResult || optimized.optimizedSize < bestResult.optimizedSize) {
                bestResult = optimized;
            }

            if (optimized.optimizedSize <= maxSizeBytes) {
                return optimized;
            }
        }

        dimension = Math.floor(dimension * dimensionStep);
    }

    if (!bestResult) {
        throw new Error('Failed to optimize image');
    }

    return bestResult;
}

/**
 * Check if an image needs optimization based on dimensions
 */
export function needsOptimization(
    width: number,
    height: number,
    maxDimension: number = DEFAULT_OPTIONS.maxDimension
): boolean {
    return width > maxDimension || height > maxDimension;
}

/**
 * Convert a data URL to a Blob
 */
export function dataUrlToBlob(dataUrl: string): Blob {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}

/**
 * Get image dimensions from a file without loading it fully
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve({ width: img.naturalWidth, height: img.naturalHeight });
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image'));
        };

        img.src = url;
    });
}

// Image optimization configuration for menu processing
export const MENU_IMAGE_CONFIG = {
    maxDimension: 1500,
    quality: 0.7,
    format: 'image/jpeg' as const,
    maxFileSizeBytes: 2 * 1024 * 1024, // 2MB
};

export const MENU_BACKGROUND_IMAGE_CONFIG = {
    maxDimension: 1400,
    quality: 0.72,
    format: 'image/jpeg' as const,
    maxSizeKB: 800,
    minQuality: 0.48,
    minDimension: 900,
};
