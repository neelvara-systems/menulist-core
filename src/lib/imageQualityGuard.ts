/**
 * Image Quality Guard (G04)
 * 
 * Constitutional requirement: Bad images damage trust more than no images.
 * 
 * ENFORCEMENT RULES:
 * - Minimum resolution: 400×300px
 * - Acceptable aspect ratios: 0.8 to 1.8 (square-ish to landscape)
 * - Low-res or extreme aspect ratios are rejected at upload
 * 
 * This prevents embarrassing output and broken trust.
 */

export const IMAGE_QUALITY_RULES = {
    MIN_WIDTH: 400,
    MIN_HEIGHT: 300,
    REFERENCE_MIN_WIDTH: 120,
    REFERENCE_MIN_HEIGHT: 120,
    ACCEPTABLE_ASPECT_RATIOS: [
        { min: 0.8, max: 1.25, name: 'Square-ish' }, // 4:5 to 5:4
        { min: 1.25, max: 1.8, name: 'Landscape' },  // 5:4 to 16:9
    ],
} as const;

export type ImageQualityMode = 'standard' | 'reference';

export interface ImageQualityResult {
    allowed: boolean;
    reason?: string;
    dimensions?: {
        width: number;
        height: number;
        aspectRatio: number;
    };
}

/**
 * Validates image quality against constitutional standards.
 * Returns rejection if quality is too low.
 * 
 * @param file - Image file to validate
 * @returns Promise with validation result
 */
export async function validateImageQuality(
    file: File,
    mode: ImageQualityMode = 'standard'
): Promise<ImageQualityResult> {
    return new Promise((resolve) => {
        const img = new Image();

        img.onload = () => {
            const { width, height } = img;
            const ratio = width / height;
            const minWidth = mode === 'reference'
                ? IMAGE_QUALITY_RULES.REFERENCE_MIN_WIDTH
                : IMAGE_QUALITY_RULES.MIN_WIDTH;
            const minHeight = mode === 'reference'
                ? IMAGE_QUALITY_RULES.REFERENCE_MIN_HEIGHT
                : IMAGE_QUALITY_RULES.MIN_HEIGHT;

            // Clean up object URL
            URL.revokeObjectURL(img.src);

            // Resolution check
            if (
                width < minWidth ||
                height < minHeight
            ) {
                resolve({
                    allowed: false,
                    reason: `Image too small (${width}×${height}). Minimum: ${minWidth}×${minHeight}px`,
                    dimensions: { width, height, aspectRatio: ratio },
                });
                return;
            }

            if (mode === 'reference') {
                resolve({
                    allowed: true,
                    dimensions: { width, height, aspectRatio: ratio },
                });
                return;
            }

            // Aspect ratio check
            const validRatio = IMAGE_QUALITY_RULES.ACCEPTABLE_ASPECT_RATIOS.some(
                (r) => ratio >= r.min && ratio <= r.max
            );

            if (!validRatio) {
                resolve({
                    allowed: false,
                    reason: `Unusual aspect ratio (${ratio.toFixed(2)}). Use landscape or square images.`,
                    dimensions: { width, height, aspectRatio: ratio },
                });
                return;
            }

            // All checks passed
            resolve({
                allowed: true,
                dimensions: { width, height, aspectRatio: ratio },
            });
        };

        img.onerror = () => {
            URL.revokeObjectURL(img.src);
            resolve({
                allowed: false,
                reason: 'Failed to load image. File may be corrupted.',
            });
        };

        img.src = URL.createObjectURL(file);
    });
}

/**
 * Get human-readable quality requirement message
 */
export function getQualityRequirements(): string {
    return `Images must be at least ${IMAGE_QUALITY_RULES.MIN_WIDTH}×${IMAGE_QUALITY_RULES.MIN_HEIGHT}px with square or landscape orientation.`;
}
