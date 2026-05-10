import { getMediaImageProfile, type MediaImageType } from '@lib/media/imageProfiles';

/**
 * Performance Budget Enforcement
 * 
 * Enforces image size limits per Digital Menu Output Constitution.
 * Goal: Menus must be usable within 3 seconds on 4G.
 * 
 * These are budget targets for callers that explicitly need a rejection result.
 * Prepared media uploads use best-effort compression instead of blocking owners.
 */

export const PERFORMANCE_BUDGET = {
    // Per-image limits (in KB)
    MAX_IMAGE_SIZE_KB: 500,           // Individual item images
    MAX_BACKGROUND_SIZE_KB: 800,      // Background images can be slightly larger
    MAX_SOURCE_UPLOAD_SIZE_KB: 50 * 1024, // Owners can upload normal phone photos; we compress before publish
    MAX_BACKGROUND_SOURCE_SIZE_KB: 50 * 1024, // Kept for legacy callers; use source upload cap semantics

    // Total page budget (in KB)
    MAX_TOTAL_IMAGE_WEIGHT_KB: 2000,  // 2MB total for all images on page

    // Count limits
    MAX_IMAGES_PER_CATEGORY: 8,       // Prevent Pinterest-style image galleries
    MAX_BACKGROUND_IMAGES: 1,

    // Enforced dimensions (prevents unnecessarily large images)
    MAX_IMAGE_WIDTH: 1200,
    MAX_IMAGE_HEIGHT: 1200,
} as const;

export interface ImageValidationResult {
    allowed: boolean;
    reason?: string;
}

type ImageBudgetType = 'item' | 'background' | MediaImageType;

function resolveMaxImageSizeKB(type: ImageBudgetType, stage: 'source' | 'final'): number {
    if (type === 'background') {
        return stage === 'source'
            ? PERFORMANCE_BUDGET.MAX_BACKGROUND_SOURCE_SIZE_KB
            : PERFORMANCE_BUDGET.MAX_BACKGROUND_SIZE_KB;
    }

    if (type === 'item') {
        return stage === 'source'
            ? PERFORMANCE_BUDGET.MAX_SOURCE_UPLOAD_SIZE_KB
            : PERFORMANCE_BUDGET.MAX_IMAGE_SIZE_KB;
    }

    const profile = getMediaImageProfile(type);
    return stage === 'source'
        ? profile.maxSourceBytes / 1024
        : profile.maxOutputSizeKB;
}

/**
 * Validate image upload against performance budget
 * 
 * Legacy explicit validation - images exceeding budget are rejected only when a caller
 * chooses to call this helper. The media preparation pipeline does not use this as an
 * owner-facing blocker.
 * 
 * @param file - File to validate
 * @param existingImagesKB - Total size of existing images in KB
 * @param type - Type of image being uploaded
 * @returns Validation result with rejection reason if applicable
 */
export function validateImageUpload(
    file: File,
    existingImagesKB: number,
    type: ImageBudgetType,
    stage: 'source' | 'final' = 'final'
): ImageValidationResult {
    const fileSizeKB = file.size / 1024;

    const maxSize = resolveMaxImageSizeKB(type, stage);

    // Check 1: Individual file size limit
    if (fileSizeKB > maxSize) {
        const maxSizeLabel = maxSize >= 1024
            ? `${Math.round(maxSize / 1024)}MB`
            : `${maxSize}KB`;
        return {
            allowed: false,
            reason: `Image too large (${Math.round(fileSizeKB)}KB). Maximum allowed: ${maxSizeLabel}. Please choose a smaller image.`,
        };
    }

    // Check 2: Total page budget limit. Source uploads are prepared before public output,
    // so page weight only applies to final media.
    const newTotalKB = existingImagesKB + fileSizeKB;
    if (stage === 'final' && newTotalKB > PERFORMANCE_BUDGET.MAX_TOTAL_IMAGE_WEIGHT_KB) {
        return {
            allowed: false,
            reason: `Total image budget exceeded (${Math.round(newTotalKB)}KB / ${PERFORMANCE_BUDGET.MAX_TOTAL_IMAGE_WEIGHT_KB}KB). Remove some images first.`,
        };
    }

    // ✅ All checks passed
    return { allowed: true };
}

/**
 * Calculate total image weight on a page
 * Used to track budget usage
 */
export function calculateTotalImageWeight(images: Array<{ size: number }>): number {
    return images.reduce((total, img) => total + (img.size / 1024), 0);
}

/**
 * Check if additional images can be added to a category
 */
export function canAddMoreImages(currentImageCount: number): boolean {
    return currentImageCount < PERFORMANCE_BUDGET.MAX_IMAGES_PER_CATEGORY;
}

/**
 * Get remaining budget in KB
 */
export function getRemainingBudget(existingImagesKB: number): number {
    return Math.max(0, PERFORMANCE_BUDGET.MAX_TOTAL_IMAGE_WEIGHT_KB - existingImagesKB);
}

/**
 * Format file size for user display
 */
export function formatFileSize(bytes: number): string {
    const kb = bytes / 1024;
    if (kb < 1024) {
        return `${Math.round(kb)}KB`;
    }
    const mb = kb / 1024;
    return `${mb.toFixed(1)}MB`;
}
